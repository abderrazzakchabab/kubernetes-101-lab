#!/usr/bin/env node
/**
 * test-suite.js — Headless verification of all 15 curriculum lessons.
 *
 * Simulates the terminal commands by directly manipulating clusterState
 * and calling the mock command executor, then runs verifyTask() for each.
 *
 * Usage: node test-suite.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

// Bootstrap browser globals
global.window = {};
global.document = { readyState: 'complete', getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} };
global.Terminal = function () { return { open: () => {}, write: () => {}, writeln: () => {}, onData: () => {}, loadAddon: () => {}, clear: () => {} }; };
global.FitAddon = { FitAddon: function () { return { fit: () => {} }; } };
global.ResizeObserver = function () { return { observe: () => {} }; };

// Load source files in order
const base = __dirname + '/src';
eval(fs.readFileSync(base + '/state.js', 'utf8'));
eval(fs.readFileSync(base + '/data/curriculum.json.js', 'utf8'));
eval(fs.readFileSync(base + '/terminal-parser.js', 'utf8'));
eval(fs.readFileSync(base + '/verifier.js', 'utf8'));

const S = () => window.clusterState;
const H = () => window.clusterState._helpers;
const exec = window.K8sTerminal.execute;
const verify = window.verifyTask;

let passed = 0;
let failed = 0;

function check(lessonId, label) {
  const r = verify(lessonId);
  if (r.passed) {
    console.log(`  ✅ ${lessonId} — ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${lessonId} — ${label}: ${r.message}`);
    failed++;
  }
}

function resetAll() {
  window.resetClusterState();
}

// ═══════════════════════════════════════════════════════
//  MODULE 1: PODS
// ═══════════════════════════════════════════════════════
console.log('\n📦 Module 1 — Pods');

// pods.1: Create nginx-pod
S().fileSystem['/root/pod.yaml'] =
  'apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\n  labels:\n    app: nginx\nspec:\n  containers:\n    - name: nginx\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n';
exec('kubectl apply -f pod.yaml');
check('pods.1', 'Your First Pod');

// pods.2: Create redis-pod (nginx-pod already exists)
S().fileSystem['/root/redis.yaml'] =
  'apiVersion: v1\nkind: Pod\nmetadata:\n  name: redis-pod\n  labels:\n    app: redis\nspec:\n  containers:\n    - name: redis\n      image: redis:7\n      ports:\n        - containerPort: 6379\n';
exec('kubectl apply -f redis.yaml');
check('pods.2', 'Inspecting Pods');

// pods.3: Create frontend-pod with labels
S().fileSystem['/root/frontend.yaml'] =
  'apiVersion: v1\nkind: Pod\nmetadata:\n  name: frontend-pod\n  labels:\n    app: frontend\n    tier: web\nspec:\n  containers:\n    - name: nginx\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n';
exec('kubectl apply -f frontend.yaml');
check('pods.3', 'Pod Labels & Selectors');

// pods.4: Multi-container pod
S().fileSystem['/root/multi.yaml'] =
  'apiVersion: v1\nkind: Pod\nmetadata:\n  name: multi-pod\n  labels:\n    app: multi\nspec:\n  containers:\n    - name: nginx\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n    - name: sidecar\n      image: busybox\n';
exec('kubectl apply -f multi.yaml');
check('pods.4', 'Multi-Container Pod');

// pods.5: Delete all pods
exec('kubectl delete pod nginx-pod');
exec('kubectl delete pod redis-pod');
exec('kubectl delete pod frontend-pod');
exec('kubectl delete pod multi-pod');
check('pods.5', 'Deleting Pods');

// ═══════════════════════════════════════════════════════
//  MODULE 2: DEPLOYMENTS
// ═══════════════════════════════════════════════════════
console.log('\n🚀 Module 2 — Deployments');

// deploy.1: Create nginx-deployment with 2 replicas
S().fileSystem['/root/deploy.yaml'] =
  'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  labels:\n    app: nginx\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n        - name: nginx\n          image: nginx:1.25\n          ports:\n            - containerPort: 80\n';
exec('kubectl apply -f deploy.yaml');
check('deploy.1', 'Creating a Deployment');

// deploy.2: Scale to 4
exec('kubectl scale deployment nginx-deployment --replicas=4');
check('deploy.2', 'Scaling Replicas');

// deploy.3: Rolling update to nginx:latest
S().fileSystem['/root/deploy.yaml'] =
  'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  labels:\n    app: nginx\nspec:\n  replicas: 4\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n        - name: nginx\n          image: nginx:latest\n          ports:\n            - containerPort: 80\n';
exec('kubectl apply -f deploy.yaml');
check('deploy.3', 'Rolling Updates');

// deploy.4: Imperative redis-deploy
exec('kubectl create deployment redis-deploy --image=redis:7');
check('deploy.4', 'Imperative Deployments');

// deploy.5: Cleanup
exec('kubectl delete deployment nginx-deployment');
exec('kubectl delete deployment redis-deploy');
check('deploy.5', 'Cleaning Up Deployments');

// ═══════════════════════════════════════════════════════
//  MODULE 3: SERVICES
// ═══════════════════════════════════════════════════════
console.log('\n🌐 Module 3 — Services');

// svc.1: ClusterIP
S().fileSystem['/root/web.yaml'] =
  'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web-app\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: nginx\n          image: nginx:1.25\n          ports:\n            - containerPort: 80\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: web-service\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 80\n      targetPort: 80\n';
exec('kubectl apply -f web.yaml');
check('svc.1', 'ClusterIP Service');

// svc.2: NodePort
S().fileSystem['/root/nodeport.yaml'] =
  'apiVersion: v1\nkind: Service\nmetadata:\n  name: web-nodeport\nspec:\n  type: NodePort\n  selector:\n    app: web\n  ports:\n    - port: 80\n      targetPort: 80\n      nodePort: 30080\n';
exec('kubectl apply -f nodeport.yaml');
check('svc.2', 'NodePort Service');

// svc.3: LoadBalancer
exec('kubectl expose deployment web-app --name=web-lb --port=80 --type=LoadBalancer');
check('svc.3', 'LoadBalancer Service');

// svc.4: Service Discovery
exec('kubectl create deployment api-backend --image=nginx:1.25');
exec('kubectl expose deployment api-backend --port=8080 --type=ClusterIP');
check('svc.4', 'Service Discovery');

// svc.5: Full cleanup
exec('kubectl delete deployment web-app');
exec('kubectl delete deployment api-backend');
exec('kubectl delete service web-service');
exec('kubectl delete service web-nodeport');
exec('kubectl delete service web-lb');
exec('kubectl delete service api-backend');
check('svc.5', 'Full Stack Cleanup');

// ═══════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
console.log('═'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
