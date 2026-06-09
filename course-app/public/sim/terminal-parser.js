/**
 * terminal-parser.js — Terminal Shell & Kubectl Command Router
 *
 * Provides a complete Xterm.js-based interactive shell that:
 *   1. Intercepts keystrokes (printable chars, backspace, arrows, Enter)
 *   2. Maintains command history with up/down navigation
 *   3. Routes parsed commands to mock POSIX + kubectl handlers
 *   4. Reads/writes `window.clusterState` for all operations
 */

(function () {
  'use strict';

  var S = function () { return window.clusterState; };
  var H = function () { return window.clusterState._helpers; };

  /* ──────────────────────────────────────────────────────
   *  Xterm.js instance and state
   * ────────────────────────────────────────────────────── */
  var term = null;
  var fitAddon = null;
  var currentLine = '';
  var cursorPos = 0;
  var history = [];
  var historyIndex = -1;
  var PROMPT = '\x1b[32mroot@minikube\x1b[0m:\x1b[34m~\x1b[0m$ ';

  function getPrompt() {
    var dir = S().currentDirectory;
    var display = dir === '/root' ? '~' : dir;
    return '\x1b[32mroot@minikube\x1b[0m:\x1b[34m' + display + '\x1b[0m$ ';
  }

  function writePrompt() { term.write('\r\n' + getPrompt()); }

  /* ──────────────────────────────────────────────────────
   *  Pad/align helper for table output
   * ────────────────────────────────────────────────────── */
  function padRight(str, len) {
    str = String(str);
    while (str.length < len) str += ' ';
    return str;
  }

  function formatTable(headers, rows) {
    var widths = headers.map(function (h, i) {
      var maxW = h.length;
      rows.forEach(function (r) { if (String(r[i]).length > maxW) maxW = String(r[i]).length; });
      return maxW + 3;
    });
    var out = headers.map(function (h, i) { return padRight(h, widths[i]); }).join('') + '\r\n';
    rows.forEach(function (r) {
      out += r.map(function (c, i) { return padRight(c, widths[i]); }).join('') + '\r\n';
    });
    return out;
  }

  /* ──────────────────────────────────────────────────────
   *  Lightweight YAML string parser (no dependencies)
   *  Handles: key: value, key:\n  nested, arrays with -
   *  Correctly tracks indent for array item content.
   * ────────────────────────────────────────────────────── */
  function parseSimpleYAML(text) {
    var result = {};
    var lines = text.split('\n');
    // Stack entries: { obj, indent }
    //   obj   = the object or array we're currently writing into
    //   indent = the column at which keys/items live inside obj
    var stack = [{ obj: result, indent: -1 }];

    function top() { return stack[stack.length - 1]; }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (raw.trim() === '' || raw.trim().charAt(0) === '#') continue;

      var indent = raw.search(/\S/);

      // Pop stack back to the right nesting level.
      // We stay if indent > top().indent; we pop otherwise.
      while (stack.length > 1 && indent <= top().indent) {
        stack.pop();
      }

      var line = raw.trim();
      var parent = top().obj;

      // ── Array item: "- ..." ────────────────────────
      if (line.charAt(0) === '-' && (line.length === 1 || line.charAt(1) === ' ')) {
        var arrContent = line.slice(1).trim();

        // If parent isn't already an array, something is off; skip.
        if (!Array.isArray(parent)) continue;

        if (arrContent === '') {
          // Bare "- " with nested content on following lines
          var item = {};
          parent.push(item);
          // Content inside this item will be at indent + 2
          stack.push({ obj: item, indent: indent + 1 });
        } else if (arrContent.indexOf(':') !== -1) {
          // Inline key:value  e.g. "- name: nginx"
          var item2 = {};
          var cIdx = arrContent.indexOf(':');
          var aKey = arrContent.slice(0, cIdx).trim();
          var aVal = arrContent.slice(cIdx + 1).trim();
          item2[aKey] = parseValue(aVal);
          parent.push(item2);
          // Subsequent keys at indent+2 belong to this item
          stack.push({ obj: item2, indent: indent + 1 });
        } else {
          // Scalar array item  e.g. "- 80"
          parent.push(parseValue(arrContent));
        }
        continue;
      }

      // ── Key: Value ─────────────────────────────────
      var colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      var key = line.slice(0, colonIdx).trim();
      var val = line.slice(colonIdx + 1).trim();

      if (val === '' || val === '|' || val === '>') {
        // Peek at next non-empty line to decide array vs object
        var nextIndent = -1;
        var nextTrimmed = '';
        for (var j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() !== '') {
            nextIndent = lines[j].search(/\S/);
            nextTrimmed = lines[j].trim();
            break;
          }
        }
        if (nextTrimmed.charAt(0) === '-') {
          parent[key] = [];
          stack.push({ obj: parent[key], indent: nextIndent - 1 });
        } else {
          parent[key] = {};
          stack.push({ obj: parent[key], indent: indent });
        }
      } else {
        parent[key] = parseValue(val);
      }
    }
    return result;
  }

  function parseValue(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return null;
    // Remove surrounding quotes
    if ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') ||
        (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'")) {
      return v.slice(1, -1);
    }
    var n = Number(v);
    if (!isNaN(n) && v !== '') return n;
    return v;
  }

  /* ──────────────────────────────────────────────────────
   *  Path resolution helpers
   * ────────────────────────────────────────────────────── */
  function resolvePath(input) {
    if (input.charAt(0) === '/') return normalizePath(input);
    return normalizePath(S().currentDirectory + '/' + input);
  }

  function normalizePath(p) {
    var parts = p.split('/').filter(Boolean);
    var resolved = [];
    parts.forEach(function (seg) {
      if (seg === '.') return;
      if (seg === '..') { resolved.pop(); return; }
      resolved.push(seg);
    });
    return '/' + resolved.join('/');
  }

  function isDirectory(path) {
    var fs = S().fileSystem;
    if (fs[path] === null) return true;  // explicit directory marker
    // Check if any file has this as a prefix
    var prefix = path.endsWith('/') ? path : path + '/';
    return Object.keys(fs).some(function (k) { return k.indexOf(prefix) === 0; });
  }

  function listDirectory(path) {
    var fs = S().fileSystem;
    var prefix = path.endsWith('/') ? path : path + '/';
    var entries = {};
    Object.keys(fs).forEach(function (k) {
      if (k === path) return;
      if (k.indexOf(prefix) !== 0) return;
      var rest = k.slice(prefix.length);
      var firstSeg = rest.split('/')[0];
      if (firstSeg) entries[firstSeg] = fs[k] === null || rest.indexOf('/') !== -1 ? 'dir' : 'file';
    });
    return entries;
  }

  /* ──────────────────────────────────────────────────────
   *  POSIX Shell Command Handlers
   * ────────────────────────────────────────────────────── */
  var shellCommands = {};

  shellCommands.ls = function (args) {
    var target = args[0] ? resolvePath(args[0]) : S().currentDirectory;
    if (!isDirectory(target)) return 'ls: cannot access \'' + args[0] + '\': No such file or directory\r\n';
    var entries = listDirectory(target);
    var names = Object.keys(entries).sort();
    if (names.length === 0) return '';
    return names.map(function (n) {
      return entries[n] === 'dir' ? '\x1b[34m' + n + '/\x1b[0m' : n;
    }).join('  ') + '\r\n';
  };

  shellCommands.cd = function (args) {
    var target = args[0] || '/root';
    if (target === '~') target = '/root';
    var resolved = resolvePath(target);
    if (!isDirectory(resolved)) return 'bash: cd: ' + target + ': No such file or directory\r\n';
    S().currentDirectory = resolved;
    return '';
  };

  shellCommands.cat = function (args) {
    if (!args[0]) return 'cat: missing operand\r\n';
    var path = resolvePath(args[0]);
    var content = S().fileSystem[path];
    if (content === undefined) return 'cat: ' + args[0] + ': No such file or directory\r\n';
    if (content === null) return 'cat: ' + args[0] + ': Is a directory\r\n';
    return content.replace(/\n/g, '\r\n');
  };

  shellCommands.clear = function () {
    term.clear();
    return '';
  };

  shellCommands.mkdir = function (args) {
    if (!args[0]) return 'mkdir: missing operand\r\n';
    var path = resolvePath(args[0]);
    S().fileSystem[path] = null;
    return '';
  };

  shellCommands.touch = function (args) {
    if (!args[0]) return 'touch: missing operand\r\n';
    var path = resolvePath(args[0]);
    if (S().fileSystem[path] === undefined) {
      S().fileSystem[path] = '';
    }
    return '';
  };

  shellCommands.echo = function (args) {
    var text = args.join(' ').replace(/^["']|["']$/g, '');
    // Handle redirection: echo "content" > file
    var redirIdx = args.indexOf('>');
    if (redirIdx === -1) redirIdx = args.indexOf('>>');
    if (redirIdx !== -1) {
      var content = args.slice(0, redirIdx).join(' ').replace(/^["']|["']$/g, '');
      var file = args[redirIdx + 1];
      if (file) {
        var path = resolvePath(file);
        var append = args[redirIdx] === '>>';
        if (append && S().fileSystem[path]) {
          S().fileSystem[path] += content + '\n';
        } else {
          S().fileSystem[path] = content + '\n';
        }
        return '';
      }
    }
    return text + '\r\n';
  };

  shellCommands.pwd = function () {
    return S().currentDirectory + '\r\n';
  };

  shellCommands.whoami = function () {
    return 'root\r\n';
  };

  shellCommands.hostname = function () {
    return 'minikube\r\n';
  };

  shellCommands.help = function () {
    return 'Available commands:\r\n' +
      '  ls, cd, cat, mkdir, touch, echo, pwd, clear, whoami, hostname\r\n' +
      '  kubectl get [pods|deployments|services|nodes] [-o wide]\r\n' +
      '  kubectl apply -f <file>\r\n' +
      '  kubectl delete [pod|deployment|service] <name>\r\n' +
      '  kubectl describe [pod|deployment|service] <name>\r\n' +
      '  kubectl scale deployment <name> --replicas=<n>\r\n' +
      '  kubectl create deployment <name> --image=<img>\r\n' +
      '  kubectl expose deployment <name> --port=<p> --type=<t>\r\n' +
      '  help\r\n';
  };

  /* ──────────────────────────────────────────────────────
   *  kubectl Command Router
   * ────────────────────────────────────────────────────── */
  function handleKubectl(args) {
    if (args.length === 0) return 'kubectl controls the Kubernetes cluster manager.\r\nUse "kubectl help" for usage.\r\n';
    var sub = args[0];
    var rest = args.slice(1);

    switch (sub) {
      case 'get':       return kubectlGet(rest);
      case 'apply':     return kubectlApply(rest);
      case 'delete':    return kubectlDelete(rest);
      case 'describe':  return kubectlDescribe(rest);
      case 'create':    return kubectlCreate(rest);
      case 'scale':     return kubectlScale(rest);
      case 'expose':    return kubectlExpose(rest);
      case 'logs':      return kubectlLogs(rest);
      case 'exec':      return 'error: exec requires an interactive terminal (not supported in this simulator)\r\n';
      case 'version':   return 'Client Version: v1.28.3\r\nServer Version: v1.28.3\r\n';
      case 'cluster-info': return 'Kubernetes control plane is running at https://192.168.49.2:8443\r\nCoreDNS is running at https://192.168.49.2:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\r\n';
      case 'help':      return shellCommands.help();
      default:          return 'error: unknown command "' + sub + '"\r\n';
    }
  }

  /* ── kubectl get ─────────────────────────────────────── */
  function kubectlGet(args) {
    if (args.length === 0) return 'error: Required resource not specified.\r\nUse "kubectl get --help" for usage.\r\n';
    var resource = args[0].toLowerCase();
    var wide = args.indexOf('-o') !== -1 && args[args.indexOf('-o') + 1] === 'wide';
    var age = H().ageString;

    switch (resource) {
      case 'pods':
      case 'pod':
      case 'po': {
        var pods = S().pods;
        if (pods.length === 0) return 'No resources found in ' + S().activeNamespace + ' namespace.\r\n';
        var headers = wide
          ? ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE', 'IP', 'NODE']
          : ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'];
        var rows = pods.map(function (p) {
          var base = [p.metadata.name, p.readyCount, p.status, String(p.restarts), age(p.metadata.creationTimestamp)];
          if (wide) { base.push(p.podIP || '<none>'); base.push(p.nodeName || '<none>'); }
          return base;
        });
        return formatTable(headers, rows);
      }

      case 'deployments':
      case 'deployment':
      case 'deploy': {
        var deps = S().deployments;
        if (deps.length === 0) return 'No resources found in ' + S().activeNamespace + ' namespace.\r\n';
        var hdr = ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'];
        var dRows = deps.map(function (d) {
          return [
            d.metadata.name,
            d.status.readyReplicas + '/' + d.spec.replicas,
            String(d.status.updatedReplicas),
            String(d.status.availableReplicas),
            age(d.metadata.creationTimestamp),
          ];
        });
        return formatTable(hdr, dRows);
      }

      case 'services':
      case 'service':
      case 'svc': {
        var svcs = S().services;
        var sHdr = ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'];
        var sRows = svcs.map(function (s) {
          var ports = s.spec.ports.map(function (p) {
            return p.nodePort ? p.port + ':' + p.nodePort + '/' + p.protocol : p.port + '/' + p.protocol;
          }).join(',');
          return [
            s.metadata.name,
            s.spec.type,
            s.clusterIP,
            s.externalIP || '<none>',
            ports,
            age(s.metadata.creationTimestamp),
          ];
        });
        return formatTable(sHdr, sRows);
      }

      case 'nodes':
      case 'node':
      case 'no': {
        var nodes = S().nodes;
        var nHdr = wide
          ? ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION', 'INTERNAL-IP']
          : ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'];
        var nRows = nodes.map(function (n) {
          var base = [n.metadata.name, n.status, n.roles, age(n.metadata.creationTimestamp), n.version];
          if (wide) base.push(n.internalIP);
          return base;
        });
        return formatTable(nHdr, nRows);
      }

      case 'namespaces':
      case 'namespace':
      case 'ns': {
        var nsHdr = ['NAME', 'STATUS', 'AGE'];
        var nsRows = S().namespaces.map(function (ns) { return [ns, 'Active', '30d']; });
        return formatTable(nsHdr, nsRows);
      }

      case 'all': {
        var out = '';
        var podOut = kubectlGet(['pods'].concat(args.slice(1)));
        var depOut = kubectlGet(['deployments'].concat(args.slice(1)));
        var svcOut = kubectlGet(['services'].concat(args.slice(1)));
        if (S().pods.length > 0) out += 'NAME' + '  (pods)\r\n' + podOut;
        if (S().deployments.length > 0) out += '\r\nNAME (deployments)\r\n' + depOut;
        out += '\r\nNAME (services)\r\n' + svcOut;
        return out || 'No resources found in ' + S().activeNamespace + ' namespace.\r\n';
      }

      default:
        return 'error: the server doesn\'t have a resource type "' + resource + '"\r\n';
    }
  }

  /* ── kubectl apply ───────────────────────────────────── */
  function kubectlApply(args) {
    var fIdx = args.indexOf('-f');
    if (fIdx === -1 || !args[fIdx + 1]) return 'error: must specify -f <filename>\r\n';
    var filename = args[fIdx + 1];
    var path = resolvePath(filename);
    var content = S().fileSystem[path];
    if (content === undefined || content === null) {
      return 'error: the path "' + filename + '" does not exist\r\n';
    }

    // Split multi-document YAML
    var docs = content.split(/^---$/m).filter(function (d) { return d.trim(); });
    var output = '';

    docs.forEach(function (docText) {
      var parsed = parseSimpleYAML(docText);
      var kind = (parsed.kind || '').toLowerCase();

      switch (kind) {
        case 'pod': {
          var existing = S().pods.find(function (p) { return p.metadata.name === (parsed.metadata && parsed.metadata.name); });
          if (existing) {
            // Update in place
            Object.assign(existing.spec, parsed.spec || {});
            if (parsed.metadata && parsed.metadata.labels) Object.assign(existing.metadata.labels, parsed.metadata.labels);
            output += 'pod/' + existing.metadata.name + ' configured\r\n';
          } else {
            var pod = H().createPodFromSpec(parsed);
            S().pods.push(pod);
            output += 'pod/' + pod.metadata.name + ' created\r\n';
          }
          break;
        }
        case 'deployment': {
          var existingDep = S().deployments.find(function (d) { return d.metadata.name === (parsed.metadata && parsed.metadata.name); });
          if (existingDep) {
            // Update replicas, template, labels
            var newSpec = parsed.spec || {};
            if (newSpec.replicas != null) {
              var newCount = parseInt(newSpec.replicas, 10);
              var diff = newCount - existingDep.spec.replicas;
              existingDep.spec.replicas = newCount;
              existingDep.status.readyReplicas = newCount;
              existingDep.status.availableReplicas = newCount;
              existingDep.status.updatedReplicas = newCount;
              // Add/remove pods
              if (diff > 0) {
                for (var a = 0; a < diff; a++) {
                  var tpl = existingDep.spec.template || {};
                  var pSpec = { apiVersion: 'v1', kind: 'Pod', metadata: { name: existingDep.metadata.name + '-' + (existingDep._replicaSetHash || '').slice(0,10) + '-' + H().randomHash(5), namespace: existingDep.metadata.namespace, labels: Object.assign({}, (tpl.metadata && tpl.metadata.labels) || {}) }, spec: (tpl.spec || {}) };
                  S().pods.push(H().createPodFromSpec(pSpec));
                }
              } else if (diff < 0) {
                var depName = existingDep.metadata.name;
                var removed = 0;
                S().pods = S().pods.filter(function (p) {
                  if (removed < Math.abs(diff) && p.metadata.name.indexOf(depName) === 0) { removed++; return false; }
                  return true;
                });
              }
            }
            if (newSpec.template) existingDep.spec.template = newSpec.template;
            output += 'deployment.apps/' + existingDep.metadata.name + ' configured\r\n';
          } else {
            var result = H().createDeploymentFromSpec(parsed);
            S().deployments.push(result.deployment);
            result.pods.forEach(function (p) { S().pods.push(p); });
            output += 'deployment.apps/' + result.deployment.metadata.name + ' created\r\n';
          }
          break;
        }
        case 'service': {
          var existingSvc = S().services.find(function (sv) { return sv.metadata.name === (parsed.metadata && parsed.metadata.name); });
          if (existingSvc) {
            if (parsed.spec) Object.assign(existingSvc.spec, parsed.spec);
            output += 'service/' + existingSvc.metadata.name + ' configured\r\n';
          } else {
            var svc = H().createServiceFromSpec(parsed);
            S().services.push(svc);
            output += 'service/' + svc.metadata.name + ' created\r\n';
          }
          break;
        }
        default:
          if (kind) output += 'error: unable to recognize "' + kind + '"\r\n';
          else output += 'error: unable to decode YAML: missing "kind" field\r\n';
      }
    });

    return output || 'error: no objects found in file\r\n';
  }

  /* ── kubectl delete ──────────────────────────────────── */
  function kubectlDelete(args) {
    if (args.length < 2) {
      // Check for -f flag
      var fIdx = args.indexOf('-f');
      if (fIdx !== -1 && args[fIdx + 1]) {
        return kubectlDeleteFile(args[fIdx + 1]);
      }
      return 'error: resource(s) were provided, but no name was specified\r\n';
    }
    var kind = args[0].toLowerCase();
    var name = args[1];

    switch (kind) {
      case 'pod':
      case 'pods': {
        var idx = S().pods.findIndex(function (p) { return p.metadata.name === name; });
        if (idx === -1) return 'Error from server (NotFound): pods "' + name + '" not found\r\n';
        S().pods.splice(idx, 1);
        return 'pod "' + name + '" deleted\r\n';
      }
      case 'deployment':
      case 'deployments':
      case 'deploy': {
        var dIdx = S().deployments.findIndex(function (d) { return d.metadata.name === name; });
        if (dIdx === -1) return 'Error from server (NotFound): deployments.apps "' + name + '" not found\r\n';
        var depName = name;
        S().deployments.splice(dIdx, 1);
        // Remove managed pods
        S().pods = S().pods.filter(function (p) { return p.metadata.name.indexOf(depName) !== 0; });
        return 'deployment.apps "' + name + '" deleted\r\n';
      }
      case 'service':
      case 'services':
      case 'svc': {
        if (name === 'kubernetes') return 'error: services "kubernetes" is protected and cannot be deleted\r\n';
        var sIdx = S().services.findIndex(function (s) { return s.metadata.name === name; });
        if (sIdx === -1) return 'Error from server (NotFound): services "' + name + '" not found\r\n';
        S().services.splice(sIdx, 1);
        return 'service "' + name + '" deleted\r\n';
      }
      default:
        return 'error: the server doesn\'t have a resource type "' + kind + '"\r\n';
    }
  }

  function kubectlDeleteFile(filename) {
    var path = resolvePath(filename);
    var content = S().fileSystem[path];
    if (!content) return 'error: the path "' + filename + '" does not exist\r\n';
    var docs = content.split(/^---$/m).filter(function (d) { return d.trim(); });
    var out = '';
    docs.forEach(function (docText) {
      var parsed = parseSimpleYAML(docText);
      if (parsed.metadata && parsed.metadata.name && parsed.kind) {
        out += kubectlDelete([parsed.kind.toLowerCase(), parsed.metadata.name]);
      }
    });
    return out || 'No resources found to delete.\r\n';
  }

  /* ── kubectl describe ────────────────────────────────── */
  function kubectlDescribe(args) {
    if (args.length < 2) return 'error: You must specify the type of resource to describe.\r\n';
    var kind = args[0].toLowerCase();
    var name = args[1];

    switch (kind) {
      case 'pod':
      case 'pods': {
        var pod = S().pods.find(function (p) { return p.metadata.name === name; });
        if (!pod) return 'Error from server (NotFound): pods "' + name + '" not found\r\n';
        return 'Name:         ' + pod.metadata.name + '\r\n' +
          'Namespace:    ' + pod.metadata.namespace + '\r\n' +
          'Node:         ' + (pod.nodeName || 'minikube') + '/192.168.49.2\r\n' +
          'Status:       ' + pod.status + '\r\n' +
          'IP:           ' + (pod.podIP || '<none>') + '\r\n' +
          'Labels:       ' + Object.entries(pod.metadata.labels || {}).map(function (e) { return e[0] + '=' + e[1]; }).join(', ') + '\r\n' +
          'Containers:\r\n' +
          (pod.spec.containers || []).map(function (c) {
            return '  ' + c.name + ':\r\n' +
              '    Image:    ' + c.image + '\r\n' +
              '    Port:     ' + (c.ports && c.ports[0] ? c.ports[0].containerPort + '/TCP' : '<none>') + '\r\n' +
              '    State:    Running\r\n';
          }).join('') +
          'Events:\r\n' +
          '  Normal  Scheduled  Successfully assigned default/' + pod.metadata.name + ' to minikube\r\n' +
          '  Normal  Pulled     Container image "' + (pod.spec.containers[0] ? pod.spec.containers[0].image : 'unknown') + '" already present\r\n' +
          '  Normal  Created    Created container\r\n' +
          '  Normal  Started    Started container\r\n';
      }
      case 'deployment':
      case 'deploy': {
        var dep = S().deployments.find(function (d) { return d.metadata.name === name; });
        if (!dep) return 'Error from server (NotFound): deployments.apps "' + name + '" not found\r\n';
        return 'Name:               ' + dep.metadata.name + '\r\n' +
          'Namespace:          ' + dep.metadata.namespace + '\r\n' +
          'Replicas:           ' + dep.spec.replicas + ' desired | ' + dep.status.readyReplicas + ' updated | ' + dep.status.availableReplicas + ' available\r\n' +
          'Selector:           ' + Object.entries(dep.spec.selector.matchLabels || {}).map(function (e) { return e[0] + '=' + e[1]; }).join(',') + '\r\n' +
          'Pod Template:\r\n' +
          '  Labels:  ' + Object.entries((dep.spec.template.metadata && dep.spec.template.metadata.labels) || {}).map(function (e) { return e[0] + '=' + e[1]; }).join(',') + '\r\n' +
          '  Containers:\r\n' +
          (dep.spec.template.spec.containers || []).map(function (c) {
            return '   ' + c.name + ':\r\n    Image: ' + c.image + '\r\n';
          }).join('');
      }
      case 'service':
      case 'svc': {
        var svc = S().services.find(function (sv) { return sv.metadata.name === name; });
        if (!svc) return 'Error from server (NotFound): services "' + name + '" not found\r\n';
        // Find matching pods by selector
        var selector = svc.spec.selector || {};
        var endpoints = S().pods.filter(function (p) {
          return Object.keys(selector).every(function (k) { return p.metadata.labels && p.metadata.labels[k] === selector[k]; });
        }).map(function (p) { return (p.podIP || '10.0.0.1') + ':' + (svc.spec.ports[0] ? svc.spec.ports[0].targetPort : 80); });

        return 'Name:              ' + svc.metadata.name + '\r\n' +
          'Namespace:         ' + svc.metadata.namespace + '\r\n' +
          'Type:              ' + svc.spec.type + '\r\n' +
          'Selector:          ' + Object.entries(selector).map(function (e) { return e[0] + '=' + e[1]; }).join(',') + '\r\n' +
          'IP:                ' + svc.clusterIP + '\r\n' +
          'Port:              ' + (svc.spec.ports[0] ? svc.spec.ports[0].port + '/' + svc.spec.ports[0].protocol : '<none>') + '\r\n' +
          'TargetPort:        ' + (svc.spec.ports[0] ? svc.spec.ports[0].targetPort : '<none>') + '\r\n' +
          'Endpoints:         ' + (endpoints.length > 0 ? endpoints.join(', ') : '<none>') + '\r\n';
      }
      default:
        return 'error: the server doesn\'t have a resource type "' + kind + '"\r\n';
    }
  }

  /* ── kubectl create deployment ──────────────────────── */
  function kubectlCreate(args) {
    if (args[0] !== 'deployment') return 'error: must specify resource type (only "deployment" supported inline)\r\n';
    var name = args[1];
    if (!name) return 'error: NAME is required for deployment\r\n';

    var image = 'nginx';
    for (var i = 2; i < args.length; i++) {
      if (args[i].indexOf('--image=') === 0) image = args[i].split('=')[1];
    }

    var parsed = {
      apiVersion: 'apps/v1', kind: 'Deployment',
      metadata: { name: name, labels: { app: name } },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: { containers: [{ name: name, image: image, ports: [{ containerPort: 80 }] }] },
        },
      },
    };
    var result = H().createDeploymentFromSpec(parsed);
    S().deployments.push(result.deployment);
    result.pods.forEach(function (p) { S().pods.push(p); });
    return 'deployment.apps/' + name + ' created\r\n';
  }

  /* ── kubectl scale ───────────────────────────────────── */
  function kubectlScale(args) {
    var kind = args[0];
    var name = args[1];
    var replicasArg = args.find(function (a) { return a.indexOf('--replicas=') === 0; });
    if (!kind || !name || !replicasArg) return 'error: required flag(s) "replicas" not set\r\n';
    var newCount = parseInt(replicasArg.split('=')[1], 10);
    if (isNaN(newCount)) return 'error: invalid replicas value\r\n';

    var dep = S().deployments.find(function (d) { return d.metadata.name === name; });
    if (!dep) return 'Error from server (NotFound): deployments.apps "' + name + '" not found\r\n';

    var diff = newCount - dep.spec.replicas;
    dep.spec.replicas = newCount;
    dep.status.readyReplicas = newCount;
    dep.status.availableReplicas = newCount;
    dep.status.updatedReplicas = newCount;

    if (diff > 0) {
      for (var i = 0; i < diff; i++) {
        var tpl = dep.spec.template || {};
        var pSpec = { apiVersion: 'v1', kind: 'Pod', metadata: { name: dep.metadata.name + '-' + (dep._replicaSetHash || '').slice(0,10) + '-' + H().randomHash(5), namespace: dep.metadata.namespace, labels: Object.assign({}, (tpl.metadata && tpl.metadata.labels) || {}) }, spec: (tpl.spec || {}) };
        S().pods.push(H().createPodFromSpec(pSpec));
      }
    } else if (diff < 0) {
      var removed = 0;
      S().pods = S().pods.filter(function (p) {
        if (removed < Math.abs(diff) && p.metadata.name.indexOf(name) === 0) { removed++; return false; }
        return true;
      });
    }
    return 'deployment.apps/' + name + ' scaled\r\n';
  }

  /* ── kubectl expose ──────────────────────────────────── */
  function kubectlExpose(args) {
    if (args[0] !== 'deployment') return 'error: only "deployment" can be exposed in this simulator\r\n';
    var name = args[1];
    if (!name) return 'error: NAME is required\r\n';

    var dep = S().deployments.find(function (d) { return d.metadata.name === name; });
    if (!dep) return 'Error from server (NotFound): deployments.apps "' + name + '" not found\r\n';

    var port = 80, targetPort = 80, svcType = 'ClusterIP', svcName = name;
    for (var i = 2; i < args.length; i++) {
      if (args[i].indexOf('--port=') === 0) port = parseInt(args[i].split('=')[1], 10);
      if (args[i].indexOf('--target-port=') === 0) targetPort = parseInt(args[i].split('=')[1], 10);
      if (args[i].indexOf('--type=') === 0) svcType = args[i].split('=')[1];
      if (args[i].indexOf('--name=') === 0) svcName = args[i].split('=')[1];
    }

    var parsed = {
      apiVersion: 'v1', kind: 'Service',
      metadata: { name: svcName },
      spec: {
        type: svcType,
        selector: dep.spec.selector.matchLabels || {},
        ports: [{ port: port, targetPort: targetPort || port, protocol: 'TCP' }],
      },
    };
    var svc = H().createServiceFromSpec(parsed);
    S().services.push(svc);
    return 'service/' + svcName + ' exposed\r\n';
  }

  /* ── kubectl logs ────────────────────────────────────── */
  function kubectlLogs(args) {
    var name = args[0];
    if (!name) return 'error: expected a pod name\r\n';
    var pod = S().pods.find(function (p) { return p.metadata.name === name; });
    if (!pod) return 'Error from server (NotFound): pods "' + name + '" not found\r\n';
    var img = pod.spec.containers[0] ? pod.spec.containers[0].image : 'unknown';
    return '[simulated] ' + img + ' container started successfully.\r\n' +
      '[simulated] Listening on port ' + (pod.spec.containers[0] && pod.spec.containers[0].ports[0] ? pod.spec.containers[0].ports[0].containerPort : '80') + '\r\n';
  }

  /* ──────────────────────────────────────────────────────
   *  Master command dispatcher
   * ────────────────────────────────────────────────────── */
  function executeCommand(input) {
    input = input.trim();
    if (!input) return '';

    // Handle cat << EOF / heredoc style file creation
    // e.g. "cat > file.yaml << EOF"  — simplified version
    // For simplicity we handle pipe/redirect with echo

    // Split into tokens respecting quotes
    var tokens = tokenize(input);
    if (tokens.length === 0) return '';
    var cmd = tokens[0];
    var args = tokens.slice(1);

    if (cmd === 'kubectl') return handleKubectl(args);
    if (shellCommands[cmd]) return shellCommands[cmd](args);
    return 'bash: ' + cmd + ': command not found\r\n';
  }

  /** Tokenize a command string respecting quotes */
  function tokenize(input) {
    var tokens = [];
    var current = '';
    var inQuote = null;
    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      if (inQuote) {
        if (ch === inQuote) { inQuote = null; continue; }
        current += ch;
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (current) { tokens.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);
    return tokens;
  }

  /* ──────────────────────────────────────────────────────
   *  Xterm.js keystroke interceptor loop
   * ────────────────────────────────────────────────────── */
  function initTerminal(containerEl) {
    term = new window.Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: '#0a0e17',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: '#334155',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f8fafc',
      },
      scrollback: 1000,
    });

    fitAddon = new window.FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerEl);
    fitAddon.fit();

    term.writeln('\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[36m║    Kubernetes 101 — Simulated Terminal   ║\x1b[0m');
    term.writeln('\x1b[36m║  Type "help" for available commands      ║\x1b[0m');
    term.writeln('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');
    term.write('\r\n' + getPrompt());

    /* Keystroke handler */
    term.onData(function (data) {
      var code = data.charCodeAt(0);

      /* Enter */
      if (data === '\r') {
        term.write('\r\n');
        var cmd = currentLine.trim();
        if (cmd) {
          history.push(cmd);
          historyIndex = history.length;
        }
        if (cmd) {
          var output = executeCommand(cmd);
          if (output) term.write(output);
        }
        currentLine = '';
        cursorPos = 0;
        term.write(getPrompt());
        return;
      }

      /* Backspace */
      if (data === '\x7f' || data === '\b') {
        if (cursorPos > 0) {
          currentLine = currentLine.slice(0, cursorPos - 1) + currentLine.slice(cursorPos);
          cursorPos--;
          // Rewrite line
          term.write('\x1b[2K\r' + getPrompt() + currentLine);
          // Move cursor to correct position
          var back = currentLine.length - cursorPos;
          if (back > 0) term.write('\x1b[' + back + 'D');
        }
        return;
      }

      /* Arrow Up — history */
      if (data === '\x1b[A') {
        if (historyIndex > 0) {
          historyIndex--;
          currentLine = history[historyIndex];
          cursorPos = currentLine.length;
          term.write('\x1b[2K\r' + getPrompt() + currentLine);
        }
        return;
      }

      /* Arrow Down — history */
      if (data === '\x1b[B') {
        if (historyIndex < history.length - 1) {
          historyIndex++;
          currentLine = history[historyIndex];
          cursorPos = currentLine.length;
          term.write('\x1b[2K\r' + getPrompt() + currentLine);
        } else {
          historyIndex = history.length;
          currentLine = '';
          cursorPos = 0;
          term.write('\x1b[2K\r' + getPrompt());
        }
        return;
      }

      /* Arrow Left */
      if (data === '\x1b[D') {
        if (cursorPos > 0) { cursorPos--; term.write(data); }
        return;
      }

      /* Arrow Right */
      if (data === '\x1b[C') {
        if (cursorPos < currentLine.length) { cursorPos++; term.write(data); }
        return;
      }

      /* Tab — basic completion */
      if (data === '\t') {
        var partial = currentLine.slice(0, cursorPos);
        var completed = autoComplete(partial);
        if (completed && completed !== partial) {
          currentLine = completed + currentLine.slice(cursorPos);
          cursorPos = completed.length;
          term.write('\x1b[2K\r' + getPrompt() + currentLine);
        }
        return;
      }

      /* Ctrl+C */
      if (data === '\x03') {
        term.write('^C');
        currentLine = '';
        cursorPos = 0;
        term.write('\r\n' + getPrompt());
        return;
      }

      /* Ctrl+L — clear */
      if (data === '\x0c') {
        term.clear();
        term.write(getPrompt() + currentLine);
        return;
      }

      /* Printable characters */
      if (code >= 32) {
        currentLine = currentLine.slice(0, cursorPos) + data + currentLine.slice(cursorPos);
        cursorPos += data.length;
        term.write('\x1b[2K\r' + getPrompt() + currentLine);
        var back = currentLine.length - cursorPos;
        if (back > 0) term.write('\x1b[' + back + 'D');
      }
    });

    /* Resize handling */
    window.addEventListener('resize', function () {
      if (fitAddon) fitAddon.fit();
    });

    return term;
  }

  /* ── Basic tab auto-complete ─────────────────────────── */
  function autoComplete(partial) {
    var tokens = partial.split(/\s+/);
    var last = tokens[tokens.length - 1] || '';

    // Command completion
    if (tokens.length <= 1) {
      var cmds = Object.keys(shellCommands).concat(['kubectl']);
      var matches = cmds.filter(function (c) { return c.indexOf(last) === 0; });
      if (matches.length === 1) return matches[0] + ' ';
      return partial;
    }

    // kubectl subcommand completion
    if (tokens[0] === 'kubectl' && tokens.length === 2) {
      var subs = ['get', 'apply', 'delete', 'describe', 'create', 'scale', 'expose', 'logs', 'version', 'cluster-info'];
      var subMatches = subs.filter(function (s) { return s.indexOf(last) === 0; });
      if (subMatches.length === 1) return tokens.slice(0, -1).join(' ') + ' ' + subMatches[0] + ' ';
    }

    // Resource type completion after kubectl get/delete/describe
    if (tokens[0] === 'kubectl' && ['get', 'delete', 'describe'].indexOf(tokens[1]) !== -1 && tokens.length === 3) {
      var resources = ['pods', 'deployments', 'services', 'nodes', 'namespaces', 'all'];
      var rMatches = resources.filter(function (r) { return r.indexOf(last) === 0; });
      if (rMatches.length === 1) return tokens.slice(0, -1).join(' ') + ' ' + rMatches[0] + ' ';
    }

    // File completion
    if (last.indexOf('.') !== -1 || last.indexOf('/') !== -1) {
      var dir = S().currentDirectory;
      var entries = Object.keys(S().fileSystem).filter(function (k) {
        return k.indexOf(dir) === 0 && k !== dir;
      }).map(function (k) {
        return k.slice(dir.length + 1).split('/')[0];
      }).filter(function (v, i, a) { return a.indexOf(v) === i; });

      var fileMatches = entries.filter(function (e) { return e.indexOf(last) === 0; });
      if (fileMatches.length === 1) return tokens.slice(0, -1).join(' ') + ' ' + fileMatches[0];
    }

    return partial;
  }

  /* ──────────────────────────────────────────────────────
   *  Public API
   * ────────────────────────────────────────────────────── */
  window.K8sTerminal = {
    init: initTerminal,
    execute: executeCommand,
    getTerm: function () { return term; },
    writeOutput: function (text) { if (term) term.write(text); },
    clearTerminal: function () { if (term) { term.clear(); term.write(getPrompt()); } },
    fit: function () { if (fitAddon) fitAddon.fit(); },
  };
})();
