# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Zero-dependency, client-side Kubernetes learning lab. A simulated `kubectl` terminal (Xterm.js) manipulates an in-memory cluster model — no real cluster, Docker, or backend. Pure static HTML/JS, served by any file server.

## Commands

```bash
# Serve locally
python3 -m http.server 8080      # then open http://localhost:8080

# Run the full headless test suite (all 15 lessons)
node test-suite.js               # exits 0 on pass, 1 on any failure
```

There is no build step, no package.json, no linter. Xterm.js loads from jsDelivr CDN at runtime.

To run a single lesson in isolation, edit `test-suite.js` — it iterates `curriculum` lessons; filter the array or comment out others.

## Architecture

Four globals wired together via `window`. Load order is fixed in `index.html`:

1. **`src/state.js`** → exposes `window.clusterState` (pods, deployments, services, nodes, `fileSystem`, `currentDirectory`) and factory functions (`createPodFromSpec`, `createDeploymentFromSpec`, `createServiceFromSpec`). All schemas are simplified-but-conformant to real Kubernetes object shapes.
2. **`src/terminal-parser.js`** → Xterm.js shell. Implements keystroke loop (history, tab-complete, Ctrl+C/L), POSIX subset (`ls`, `cd`, `cat`, `echo` with `>` redirect, etc.), `kubectl` router (`get`, `apply -f`, `delete`, `describe`, `scale`, `expose`, `create deployment`, `logs`), and a hand-rolled indent-aware YAML parser that handles nested objects, `- key: val` arrays, and `---` multi-doc splits.
3. **`src/verifier.js`** → `window.verifyTask(lessonId)` returns `{passed, message}` by inspecting `clusterState`. This is the source of truth for "did the student complete the lesson."
4. **`src/app.js`** → UI orchestrator (sidebar, lesson rendering, progress, Check/Hint/Reset buttons).

Curriculum lives in **`src/data/curriculum.json.js`** as `window.curriculum` — 3 modules × 5 lessons. Each lesson has `id`, instructional content, optional `hint`, and a verifier key matching `verifier.js`.

**`test-suite.js`** runs the same engine headlessly under Node by stubbing `window`, loading the src files via `require`/`eval`, then for each lesson writes YAML into the virtual fileSystem, runs the kubectl commands, and asserts via `verifyTask()`. When adding a lesson, both `curriculum.json.js` and `verifier.js` must be updated, and a corresponding case added to `test-suite.js`.

## Conventions

- Keep the app fully client-side and dependency-free (besides the Xterm.js CDN). No bundler, no npm install.
- Kubernetes object shapes in `state.js` should remain recognizable to anyone familiar with real `kubectl` output — don't invent fields that don't exist in the upstream API.
- The YAML parser is intentionally minimal; if a lesson needs a YAML feature it doesn't support, prefer extending the parser over adding a dependency.
