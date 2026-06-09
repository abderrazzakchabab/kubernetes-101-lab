/**
 * verifier.js — State Evaluator
 *
 * Exposes `window.verifyTask(lessonId)` which directly evaluates
 * `window.clusterState` properties to confirm challenge completion.
 *
 * Returns: { passed: boolean, message: string }
 */

(function () {
  'use strict';

  var S = function () { return window.clusterState; };

  /**
   * Verification rules keyed by lesson verifyId.
   * Each rule is a function returning { passed, message }.
   */
  var rules = {};

  /* ═══════════════════════════════════════════════════════
   *  MODULE 1: PODS
   * ═══════════════════════════════════════════════════════ */

  // pods.1 — Your First Pod: nginx-pod exists and is Running
  rules['pods.1'] = function () {
    var pod = S().pods.find(function (p) { return p.metadata.name === 'nginx-pod'; });
    if (!pod) return { passed: false, message: 'Pod "nginx-pod" not found. Create it with kubectl apply -f pod.yaml.' };
    if (pod.status !== 'Running') return { passed: false, message: 'Pod "nginx-pod" exists but status is ' + pod.status + '. Expected Running.' };
    var hasNginx = pod.spec.containers.some(function (c) { return c.image && c.image.indexOf('nginx') !== -1; });
    if (!hasNginx) return { passed: false, message: 'Pod "nginx-pod" exists but does not use an nginx image.' };
    return { passed: true, message: '✅ Pod "nginx-pod" is Running with nginx image. Well done!' };
  };

  // pods.2 — Inspecting Pods: redis-pod exists alongside nginx-pod
  rules['pods.2'] = function () {
    var nginx = S().pods.find(function (p) { return p.metadata.name === 'nginx-pod'; });
    var redis = S().pods.find(function (p) { return p.metadata.name === 'redis-pod'; });
    if (!nginx) return { passed: false, message: 'Pod "nginx-pod" not found. It should still be running from the previous lesson.' };
    if (!redis) return { passed: false, message: 'Pod "redis-pod" not found. Create it with redis:7 image.' };
    if (redis.status !== 'Running') return { passed: false, message: 'Pod "redis-pod" exists but is not Running.' };
    var hasRedis = redis.spec.containers.some(function (c) { return c.image && c.image.indexOf('redis') !== -1; });
    if (!hasRedis) return { passed: false, message: 'Pod "redis-pod" does not use a redis image.' };
    return { passed: true, message: '✅ Both nginx-pod and redis-pod are Running. You\'ve mastered Pod inspection!' };
  };

  // pods.3 — Labels: frontend-pod with app=frontend and tier=web
  rules['pods.3'] = function () {
    var pod = S().pods.find(function (p) { return p.metadata.name === 'frontend-pod'; });
    if (!pod) return { passed: false, message: 'Pod "frontend-pod" not found.' };
    if (pod.status !== 'Running') return { passed: false, message: 'Pod "frontend-pod" is not Running.' };
    var labels = pod.metadata.labels || {};
    if (labels.app !== 'frontend') return { passed: false, message: 'Pod "frontend-pod" missing label app=frontend. Found: ' + JSON.stringify(labels) };
    if (labels.tier !== 'web') return { passed: false, message: 'Pod "frontend-pod" missing label tier=web. Found: ' + JSON.stringify(labels) };
    return { passed: true, message: '✅ Pod "frontend-pod" has correct labels: app=frontend, tier=web. Labels are crucial for selectors!' };
  };

  // pods.4 — Multi-Container: multi-pod with 2 containers
  rules['pods.4'] = function () {
    var pod = S().pods.find(function (p) { return p.metadata.name === 'multi-pod'; });
    if (!pod) return { passed: false, message: 'Pod "multi-pod" not found.' };
    if (pod.status !== 'Running') return { passed: false, message: 'Pod "multi-pod" is not Running.' };
    var containers = pod.spec.containers || [];
    if (containers.length < 2) return { passed: false, message: 'Pod "multi-pod" has ' + containers.length + ' container(s). Expected 2.' };
    var hasNginx = containers.some(function (c) { return c.image && c.image.indexOf('nginx') !== -1; });
    var hasBusybox = containers.some(function (c) { return c.image && c.image.indexOf('busybox') !== -1; });
    if (!hasNginx) return { passed: false, message: 'Pod "multi-pod" is missing an nginx container.' };
    if (!hasBusybox) return { passed: false, message: 'Pod "multi-pod" is missing a busybox sidecar container.' };
    return { passed: true, message: '✅ Pod "multi-pod" has 2 containers (nginx + busybox sidecar). Sidecar pattern mastered!' };
  };

  // pods.5 — Delete All Pods: cluster should have 0 pods
  rules['pods.5'] = function () {
    if (S().pods.length > 0) {
      var names = S().pods.map(function (p) { return p.metadata.name; }).join(', ');
      return { passed: false, message: 'Still have ' + S().pods.length + ' pod(s): ' + names + '. Delete them all.' };
    }
    return { passed: true, message: '✅ All pods deleted. Clean slate for Module 2!' };
  };

  /* ═══════════════════════════════════════════════════════
   *  MODULE 2: DEPLOYMENTS
   * ═══════════════════════════════════════════════════════ */

  // deploy.1 — Create nginx-deployment with 2 replicas
  rules['deploy.1'] = function () {
    var dep = S().deployments.find(function (d) { return d.metadata.name === 'nginx-deployment'; });
    if (!dep) return { passed: false, message: 'Deployment "nginx-deployment" not found.' };
    if (dep.spec.replicas < 2) return { passed: false, message: 'Deployment "nginx-deployment" has ' + dep.spec.replicas + ' replicas. Need at least 2.' };
    var managedPods = S().pods.filter(function (p) { return p.metadata.name.indexOf('nginx-deployment') === 0; });
    if (managedPods.length < 2) return { passed: false, message: 'Expected 2+ running pods for nginx-deployment, found ' + managedPods.length + '.' };
    return { passed: true, message: '✅ Deployment "nginx-deployment" running with ' + dep.spec.replicas + ' replicas!' };
  };

  // deploy.2 — Scale to 4 replicas
  rules['deploy.2'] = function () {
    var dep = S().deployments.find(function (d) { return d.metadata.name === 'nginx-deployment'; });
    if (!dep) return { passed: false, message: 'Deployment "nginx-deployment" not found. Create it first.' };
    if (dep.spec.replicas < 4) return { passed: false, message: 'Deployment has ' + dep.spec.replicas + ' replicas. Scale to 4.' };
    var managedPods = S().pods.filter(function (p) { return p.metadata.name.indexOf('nginx-deployment') === 0; });
    if (managedPods.length < 4) return { passed: false, message: 'Expected 4 running pods, found ' + managedPods.length + '.' };
    return { passed: true, message: '✅ Scaled to ' + dep.spec.replicas + ' replicas with ' + managedPods.length + ' pods running!' };
  };

  // deploy.3 — Rolling update: image should be nginx:latest
  rules['deploy.3'] = function () {
    var dep = S().deployments.find(function (d) { return d.metadata.name === 'nginx-deployment'; });
    if (!dep) return { passed: false, message: 'Deployment "nginx-deployment" not found.' };
    var containers = (dep.spec.template && dep.spec.template.spec && dep.spec.template.spec.containers) || [];
    var hasLatest = containers.some(function (c) { return c.image === 'nginx:latest' || c.image === 'nginx'; });
    if (!hasLatest) {
      var currentImages = containers.map(function (c) { return c.image; }).join(', ');
      return { passed: false, message: 'Deployment still using image: ' + currentImages + '. Update to nginx:latest.' };
    }
    return { passed: true, message: '✅ Rolling update complete! Deployment now uses nginx:latest.' };
  };

  // deploy.4 — Imperative: redis-deploy exists
  rules['deploy.4'] = function () {
    var nginx = S().deployments.find(function (d) { return d.metadata.name === 'nginx-deployment'; });
    var redis = S().deployments.find(function (d) { return d.metadata.name === 'redis-deploy'; });
    if (!nginx) return { passed: false, message: 'Deployment "nginx-deployment" not found.' };
    if (!redis) return { passed: false, message: 'Deployment "redis-deploy" not found. Create it with kubectl create deployment.' };
    return { passed: true, message: '✅ Both nginx-deployment and redis-deploy are running!' };
  };

  // deploy.5 — Clean up: no deployments, no pods
  rules['deploy.5'] = function () {
    if (S().deployments.length > 0) {
      var names = S().deployments.map(function (d) { return d.metadata.name; }).join(', ');
      return { passed: false, message: 'Still have deployment(s): ' + names };
    }
    if (S().pods.length > 0) {
      return { passed: false, message: 'Still have ' + S().pods.length + ' pod(s) remaining.' };
    }
    return { passed: true, message: '✅ All deployments and pods cleaned up. Ready for Module 3!' };
  };

  /* ═══════════════════════════════════════════════════════
   *  MODULE 3: SERVICES
   * ═══════════════════════════════════════════════════════ */

  // svc.1 — ClusterIP: web-app deployment + web-service (ClusterIP)
  rules['svc.1'] = function () {
    var dep = S().deployments.find(function (d) { return d.metadata.name === 'web-app'; });
    if (!dep) return { passed: false, message: 'Deployment "web-app" not found.' };
    if (dep.spec.replicas < 2) return { passed: false, message: 'Deployment "web-app" needs at least 2 replicas. Has ' + dep.spec.replicas + '.' };
    var svc = S().services.find(function (s) { return s.metadata.name === 'web-service'; });
    if (!svc) return { passed: false, message: 'Service "web-service" not found.' };
    if (svc.spec.type !== 'ClusterIP') return { passed: false, message: 'Service "web-service" type is ' + svc.spec.type + '. Expected ClusterIP.' };
    var selector = svc.spec.selector || {};
    if (selector.app !== 'web') return { passed: false, message: 'Service selector should be app=web. Found: ' + JSON.stringify(selector) };
    return { passed: true, message: '✅ Deployment "web-app" with ClusterIP Service "web-service" — internal communication ready!' };
  };

  // svc.2 — NodePort: web-nodeport exists with type NodePort
  rules['svc.2'] = function () {
    var svc = S().services.find(function (s) { return s.metadata.name === 'web-nodeport'; });
    if (!svc) return { passed: false, message: 'Service "web-nodeport" not found.' };
    if (svc.spec.type !== 'NodePort') return { passed: false, message: 'Service type is ' + svc.spec.type + '. Expected NodePort.' };
    var hasPort = svc.spec.ports.some(function (p) { return p.nodePort === 30080; });
    if (!hasPort) return { passed: false, message: 'NodePort should be 30080. Check your port configuration.' };
    return { passed: true, message: '✅ NodePort Service "web-nodeport" created on port 30080. External access enabled!' };
  };

  // svc.3 — LoadBalancer: web-lb exists with type LoadBalancer
  rules['svc.3'] = function () {
    var svc = S().services.find(function (s) { return s.metadata.name === 'web-lb'; });
    if (!svc) return { passed: false, message: 'Service "web-lb" not found.' };
    if (svc.spec.type !== 'LoadBalancer') return { passed: false, message: 'Service type is ' + svc.spec.type + '. Expected LoadBalancer.' };
    return { passed: true, message: '✅ LoadBalancer Service "web-lb" created with external IP ' + (svc.externalIP || '<pending>') + '!' };
  };

  // svc.4 — Service Discovery: api-backend deployment + service exist
  rules['svc.4'] = function () {
    var dep = S().deployments.find(function (d) { return d.metadata.name === 'api-backend'; });
    if (!dep) return { passed: false, message: 'Deployment "api-backend" not found.' };
    var svc = S().services.find(function (s) { return s.metadata.name === 'api-backend'; });
    if (!svc) return { passed: false, message: 'Service "api-backend" not found. Expose the deployment.' };
    var hasPort = svc.spec.ports.some(function (p) { return p.port === 8080; });
    if (!hasPort) return { passed: false, message: 'Service "api-backend" should expose port 8080.' };
    return { passed: true, message: '✅ api-backend deployed and exposed on port 8080. Service discovery in action!' };
  };

  // svc.5 — Full cleanup: no deployments, only kubernetes service
  rules['svc.5'] = function () {
    if (S().deployments.length > 0) {
      var depNames = S().deployments.map(function (d) { return d.metadata.name; }).join(', ');
      return { passed: false, message: 'Still have deployment(s): ' + depNames };
    }
    if (S().pods.length > 0) {
      return { passed: false, message: 'Still have ' + S().pods.length + ' pod(s).' };
    }
    var userServices = S().services.filter(function (s) { return s.metadata.name !== 'kubernetes'; });
    if (userServices.length > 0) {
      var svcNames = userServices.map(function (s) { return s.metadata.name; }).join(', ');
      return { passed: false, message: 'Still have user service(s): ' + svcNames };
    }
    return { passed: true, message: '✅ Cluster fully cleaned! 🎉 You\'ve completed all 3 modules of Kubernetes 101!' };
  };

  /* ──────────────────────────────────────────────────────
   *  Public API
   * ────────────────────────────────────────────────────── */
  window.verifyTask = function (lessonId) {
    var rule = rules[lessonId];
    if (!rule) return { passed: false, message: 'No verification rule found for lesson "' + lessonId + '".' };
    try {
      return rule();
    } catch (err) {
      return { passed: false, message: 'Verification error: ' + err.message };
    }
  };

  /** List all verifiable lesson IDs (for debugging) */
  window.verifyTask.listRules = function () { return Object.keys(rules); };
})();
