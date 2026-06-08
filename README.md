# Kubernetes 101 — Interactive Terminal Lab

A zero-dependency, client-side Kubernetes learning application. Students practice `kubectl` commands in a simulated terminal (Xterm.js) that manipulates an in-memory cluster state model — no real cluster, Docker, or backend required.

## Quick Start

```bash
# Serve locally (any static file server works)
python3 -m http.server 8080

# Open in browser
# http://localhost:8080
```

Alternatively, open `index.html` directly — note that Xterm.js loads from CDN, so an internet connection is needed on first load.

## Architecture

```
index.html                 ← Entry point, loads CDN deps + app scripts
src/
  state.js                 ← Global Cluster State Engine (window.clusterState)
  terminal-parser.js       ← Xterm.js shell + kubectl command router + YAML parser
  verifier.js              ← Automated task verification (window.verifyTask)
  app.js                   ← UI orchestrator (sidebar, lessons, progress)
  styles.css               ← Dark-themed split-pane layout
  data/
    curriculum.json.js     ← 3 modules × 5 lessons = 15 interactive challenges
test-suite.js              ← Headless Node.js test runner (all 15 lessons)
```

### State Engine (`state.js`)

Maintains `window.clusterState` with Kubernetes-conformant object schemas:

- `pods[]` — simplified v1/Pod (name, labels, containers, status, IP)
- `deployments[]` — simplified apps/v1/Deployment (replicas, template, selector)
- `services[]` — simplified v1/Service (type, selector, ports, clusterIP)
- `nodes[]` — simplified v1/Node (minikube, single-node cluster)
- `fileSystem` — virtual path→content map for YAML files
- `currentDirectory` — mock shell navigation

Factory functions: `createPodFromSpec()`, `createDeploymentFromSpec()`, `createServiceFromSpec()`.

### Terminal Parser (`terminal-parser.js`)

Full Xterm.js integration with:

- **Keystroke loop**: character input, backspace, left/right arrows, tab completion, Ctrl+C/L
- **Command history**: up/down arrow navigation
- **POSIX commands**: `ls`, `cd`, `cat`, `mkdir`, `touch`, `echo` (with `>` redirect), `pwd`, `clear`
- **kubectl commands**: `get`, `apply -f`, `delete`, `describe`, `create deployment`, `scale`, `expose`, `logs`, `version`, `cluster-info`
- **YAML parser**: indent-aware, handles nested objects, arrays (`- key: val`), and multi-document `---` splits

### Curriculum (`curriculum.json.js`)

| Module | Topic | Lessons |
|--------|-------|---------|
| 1 | Pods | First Pod, Inspection, Labels, Multi-Container, Deletion |
| 2 | Deployments | Creation, Scaling, Rolling Updates, Imperative, Cleanup |
| 3 | Services | ClusterIP, NodePort, LoadBalancer, Discovery, Full Cleanup |

Content sourced from official Kubernetes documentation and a comprehensive K8s course via NotebookLM.

### Verifier (`verifier.js`)

`window.verifyTask(lessonId)` returns `{ passed: boolean, message: string }` by inspecting `clusterState` properties — e.g., checking `pods.some(p => p.metadata.labels.app === 'frontend')`.

## Testing

```bash
node test-suite.js
```

Runs all 15 lessons headlessly: writes YAML into the virtual filesystem, executes kubectl commands through the mock engine, and asserts cluster state via `verifyTask()`. Exits 0 on full pass, 1 on any failure.

## Deployment Options

### Static hosting (GitHub Pages, Netlify, Vercel, S3)

The app is fully static — upload the entire directory. No build step needed.

### Docker (optional)

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
```

```bash
docker build -t k8s-101 .
docker run -p 8080:80 k8s-101
```

### Local development

Any static file server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# PHP
php -S localhost:8080
```

## Browser Support

Requires a modern browser with ES6 support (Chrome, Firefox, Safari, Edge). Xterm.js 5.3 loads from jsDelivr CDN.

## License

MIT
