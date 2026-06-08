/**
 * state.js — Global Cluster State Engine
 *
 * Maintains the complete in-memory Kubernetes cluster model.
 * All mock kubectl commands read from and write to `window.clusterState`.
 *
 * Object schemas follow upstream Kubernetes API conventions:
 *   - pods[]      → simplified v1/Pod
 *   - deployments[] → simplified apps/v1/Deployment
 *   - services[]  → simplified v1/Service
 *   - nodes[]     → simplified v1/Node
 *   - fileSystem  → nested path→content map
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────
   *  Utility: generate a short pseudo-random hash (5 chars)
   * ────────────────────────────────────────────────────── */
  function randomHash(len) {
    len = len || 5;
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = '';
    for (var i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  /* ──────────────────────────────────────────────────────
   *  Utility: human-readable age string from a Date
   * ────────────────────────────────────────────────────── */
  function ageString(createdAt) {
    var diff = Math.floor((Date.now() - createdAt.getTime()) / 1000);
    if (diff < 60) return diff + 's';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }

  /* ──────────────────────────────────────────────────────
   *  Interface: KubernetesPod
   * ────────────────────────────────────────────────────── */
  /**
   * @typedef {Object} KubernetesPod
   * @property {string}  apiVersion        — always "v1"
   * @property {string}  kind              — always "Pod"
   * @property {{name:string, namespace:string, labels:Object, uid:string, creationTimestamp:Date}} metadata
   * @property {{containers: Array<{name:string, image:string, ports:Array<{containerPort:number}>}>}} spec
   * @property {string}  status            — Pending | ContainerCreating | Running | Succeeded | Failed | Terminating
   * @property {string}  readyCount        — "1/1" etc.
   * @property {number}  restarts
   */

  /* ──────────────────────────────────────────────────────
   *  Interface: KubernetesDeployment
   * ────────────────────────────────────────────────────── */
  /**
   * @typedef {Object} KubernetesDeployment
   * @property {string}  apiVersion        — always "apps/v1"
   * @property {string}  kind              — always "Deployment"
   * @property {{name:string, namespace:string, labels:Object, uid:string, creationTimestamp:Date}} metadata
   * @property {{replicas:number, selector:{matchLabels:Object}, template:{metadata:{labels:Object}, spec:{containers:Array}}}} spec
   * @property {{readyReplicas:number, availableReplicas:number, updatedReplicas:number}} status
   */

  /* ──────────────────────────────────────────────────────
   *  Interface: KubernetesService
   * ────────────────────────────────────────────────────── */
  /**
   * @typedef {Object} KubernetesService
   * @property {string}  apiVersion
   * @property {string}  kind
   * @property {{name:string, namespace:string, labels:Object, uid:string, creationTimestamp:Date}} metadata
   * @property {{type:string, selector:Object, ports:Array<{port:number,targetPort:number,nodePort?:number,protocol:string}>}} spec
   * @property {string}  clusterIP
   */

  /* ──────────────────────────────────────────────────────
   *  Interface: KubernetesNode
   * ────────────────────────────────────────────────────── */

  /* ──────────────────────────────────────────────────────
   *  Default cluster state — the "blank cluster"
   * ────────────────────────────────────────────────────── */
  function createDefaultState() {
    return {
      /* Shell navigation */
      currentDirectory: '/root',

      /* Virtual file system: path → file content string */
      fileSystem: {
        '/root': null,                    // directory marker
        '/root/README.md': '# Kubernetes 101 Lab\nWelcome to your simulated cluster!\nUse kubectl to manage resources.\n',
      },

      /* Cluster resources */
      pods: [],
      deployments: [],
      services: [
        /* Default kubernetes service always present */
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: 'kubernetes',
            namespace: 'default',
            labels: { component: 'apiserver', provider: 'kubernetes' },
            uid: 'svc-' + randomHash(8),
            creationTimestamp: new Date(Date.now() - 86400000 * 30),
          },
          spec: {
            type: 'ClusterIP',
            selector: {},
            ports: [{ port: 443, targetPort: 6443, protocol: 'TCP' }],
          },
          clusterIP: '10.96.0.1',
        },
      ],
      nodes: [
        {
          apiVersion: 'v1',
          kind: 'Node',
          metadata: {
            name: 'minikube',
            labels: { 'kubernetes.io/hostname': 'minikube', 'node-role.kubernetes.io/control-plane': '' },
            uid: 'node-' + randomHash(8),
            creationTimestamp: new Date(Date.now() - 86400000 * 30),
          },
          status: 'Ready',
          roles: 'control-plane',
          version: 'v1.28.3',
          internalIP: '192.168.49.2',
        },
      ],

      /* Namespace tracking (simplified) */
      namespaces: ['default', 'kube-system', 'kube-public', 'kube-node-lease'],
      activeNamespace: 'default',

      /* Completion tracking per lesson id */
      completedLessons: {},
    };
  }

  /* ──────────────────────────────────────────────────────
   *  Helper methods exposed on clusterState
   * ────────────────────────────────────────────────────── */

  /** Generate a realistic cluster-internal IP */
  function nextClusterIP() {
    return '10.96.' + Math.floor(Math.random() * 254) + '.' + (Math.floor(Math.random() * 253) + 1);
  }

  /** Generate a realistic pod IP */
  function nextPodIP() {
    return '172.17.0.' + (Math.floor(Math.random() * 200) + 2);
  }

  /** Create a Pod object from a parsed YAML-like spec */
  function createPodFromSpec(parsed) {
    var meta = parsed.metadata || {};
    var spec = parsed.spec || {};
    var containers = (spec.containers || []).map(function (c) {
      return {
        name: c.name || 'main',
        image: c.image || 'unknown',
        ports: (c.ports || []).map(function (p) {
          return { containerPort: p.containerPort || 80 };
        }),
      };
    });
    var totalContainers = containers.length || 1;

    return {
      apiVersion: parsed.apiVersion || 'v1',
      kind: 'Pod',
      metadata: {
        name: meta.name || 'pod-' + randomHash(5),
        namespace: meta.namespace || window.clusterState.activeNamespace,
        labels: meta.labels || {},
        uid: 'pod-' + randomHash(8),
        creationTimestamp: new Date(),
      },
      spec: { containers: containers },
      status: 'Running',
      readyCount: totalContainers + '/' + totalContainers,
      restarts: 0,
      podIP: nextPodIP(),
      nodeName: 'minikube',
    };
  }

  /** Create a Deployment (and its managed pods) from parsed spec */
  function createDeploymentFromSpec(parsed) {
    var meta = parsed.metadata || {};
    var spec = parsed.spec || {};
    var replicas = spec.replicas != null ? parseInt(spec.replicas, 10) : 1;
    var template = spec.template || {};
    var tmplMeta = template.metadata || {};
    var tmplSpec = template.spec || {};
    var matchLabels = (spec.selector && spec.selector.matchLabels) || tmplMeta.labels || {};

    var depName = meta.name || 'deployment-' + randomHash(5);
    var rsHash = randomHash(10);

    var deployment = {
      apiVersion: parsed.apiVersion || 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: depName,
        namespace: meta.namespace || window.clusterState.activeNamespace,
        labels: meta.labels || matchLabels,
        uid: 'dep-' + randomHash(8),
        creationTimestamp: new Date(),
      },
      spec: {
        replicas: replicas,
        selector: { matchLabels: matchLabels },
        template: {
          metadata: { labels: tmplMeta.labels || matchLabels },
          spec: { containers: tmplSpec.containers || [] },
        },
      },
      status: {
        readyReplicas: replicas,
        availableReplicas: replicas,
        updatedReplicas: replicas,
      },
      _replicaSetHash: rsHash,
    };

    // Create managed pods
    var pods = [];
    for (var i = 0; i < replicas; i++) {
      var podSpec = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: depName + '-' + rsHash.slice(0, 10) + '-' + randomHash(5),
          namespace: deployment.metadata.namespace,
          labels: Object.assign({}, tmplMeta.labels || matchLabels, { 'pod-template-hash': rsHash }),
        },
        spec: { containers: tmplSpec.containers || [] },
      };
      pods.push(createPodFromSpec(podSpec));
    }

    return { deployment: deployment, pods: pods };
  }

  /** Create a Service from parsed spec */
  function createServiceFromSpec(parsed) {
    var meta = parsed.metadata || {};
    var spec = parsed.spec || {};
    var ports = (spec.ports || []).map(function (p) {
      return {
        port: p.port || 80,
        targetPort: p.targetPort || p.port || 80,
        nodePort: p.nodePort || undefined,
        protocol: p.protocol || 'TCP',
      };
    });
    var svcType = spec.type || 'ClusterIP';

    return {
      apiVersion: parsed.apiVersion || 'v1',
      kind: 'Service',
      metadata: {
        name: meta.name || 'service-' + randomHash(5),
        namespace: meta.namespace || window.clusterState.activeNamespace,
        labels: meta.labels || {},
        uid: 'svc-' + randomHash(8),
        creationTimestamp: new Date(),
      },
      spec: {
        type: svcType,
        selector: spec.selector || {},
        ports: ports,
      },
      clusterIP: nextClusterIP(),
      externalIP: svcType === 'LoadBalancer' ? ('203.0.113.' + (Math.floor(Math.random() * 200) + 10)) : '<none>',
    };
  }

  /* ──────────────────────────────────────────────────────
   *  Initialize the global state
   * ────────────────────────────────────────────────────── */
  window.clusterState = createDefaultState();

  /* Expose factory helpers */
  window.clusterState._helpers = {
    randomHash: randomHash,
    ageString: ageString,
    nextClusterIP: nextClusterIP,
    nextPodIP: nextPodIP,
    createPodFromSpec: createPodFromSpec,
    createDeploymentFromSpec: createDeploymentFromSpec,
    createServiceFromSpec: createServiceFromSpec,
    createDefaultState: createDefaultState,
  };

  /** Full reset — called by "Reset Cluster" button */
  window.resetClusterState = function () {
    var fresh = createDefaultState();
    Object.keys(fresh).forEach(function (k) {
      window.clusterState[k] = fresh[k];
    });
    // re-attach helpers
    window.clusterState._helpers = {
      randomHash: randomHash,
      ageString: ageString,
      nextClusterIP: nextClusterIP,
      nextPodIP: nextPodIP,
      createPodFromSpec: createPodFromSpec,
      createDeploymentFromSpec: createDeploymentFromSpec,
      createServiceFromSpec: createServiceFromSpec,
      createDefaultState: createDefaultState,
    };
  };
})();
