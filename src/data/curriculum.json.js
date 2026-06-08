/**
 * curriculum.json.js — Interactive Syllabus Data
 *
 * 3 core modules × 5 lessons each = 15 interactive challenges.
 * Content sourced via NotebookLM from official Kubernetes docs
 * and a comprehensive K8s video course transcript.
 *
 * Each lesson has:
 *   - id          unique lesson key (module.lesson format)
 *   - title       lesson display name
 *   - badge       short module label
 *   - body        HTML explanatory text (2-3 paragraphs)
 *   - task        text description of the challenge
 *   - hint        optional help string
 *   - setupFiles  files pre-loaded into the virtual filesystem for this lesson
 *   - verifyId    key used by verifier.js
 */

window.CURRICULUM = [
  /* ═══════════════════════════════════════════════════════
   *  MODULE 1: PODS
   * ═══════════════════════════════════════════════════════ */
  {
    moduleId: 'pods',
    moduleTitle: 'Module 1 — Pods',
    lessons: [
      {
        id: 'pods.1',
        title: 'Your First Pod',
        badge: 'Pods',
        body:
          '<p>A <strong>Pod</strong> is the smallest deployable unit in Kubernetes — it\'s an abstraction layer over one or more containers. ' +
          'Kubernetes doesn\'t run containers directly; instead, it wraps them in Pods so you interact with the Kubernetes layer rather than Docker or another runtime.</p>' +
          '<p>Each Pod gets its own internal IP address within the cluster\'s virtual network. Pods are <em>ephemeral</em> — if a Pod crashes, Kubernetes creates a new one with a new IP. ' +
          'That\'s why we use Services (covered in Module 3) to provide stable endpoints.</p>' +
          '<p>In this lesson, you\'ll create a YAML file that defines a simple nginx Pod and apply it to the cluster using <code>kubectl apply</code>.</p>',
        task: 'Create a file called <code>pod.yaml</code> with an nginx Pod definition, then run <code>kubectl apply -f pod.yaml</code>. Verify the Pod is running with <code>kubectl get pods</code>.',
        hint: 'Use: echo \'apiVersion: v1\\nkind: Pod\\nmetadata:\\n  name: nginx-pod\\n  labels:\\n    app: nginx\\nspec:\\n  containers:\\n    - name: nginx\\n      image: nginx:1.25\\n      ports:\\n        - containerPort: 80\' > pod.yaml',
        setupFiles: {},
        verifyId: 'pods.1',
      },
      {
        id: 'pods.2',
        title: 'Inspecting Pods',
        badge: 'Pods',
        body:
          '<p>Once a Pod is running, you need tools to inspect its state. <code>kubectl get pods</code> gives a quick status overview showing NAME, READY, STATUS, RESTARTS, and AGE columns. ' +
          'Adding <code>-o wide</code> reveals additional columns like the Pod\'s internal IP and the Node it\'s scheduled on.</p>' +
          '<p><code>kubectl describe pod &lt;name&gt;</code> outputs detailed information including labels, container images, port mappings, and a chronological Events section — ' +
          'this is your primary debugging tool when a Pod won\'t start. The Events tell you exactly whether the image pull failed, the container crashed, or probes are failing.</p>' +
          '<p>In this lesson, you\'ll practice inspecting the Pod you created in the previous step.</p>',
        task: 'Run <code>kubectl describe pod nginx-pod</code> and then <code>kubectl get pods -o wide</code>. There is nothing to "create" — just explore. When done, create a second Pod named <code>redis-pod</code> with image <code>redis:7</code>.',
        hint: 'echo \'apiVersion: v1\\nkind: Pod\\nmetadata:\\n  name: redis-pod\\n  labels:\\n    app: redis\\nspec:\\n  containers:\\n    - name: redis\\n      image: redis:7\\n      ports:\\n        - containerPort: 6379\' > redis.yaml && kubectl apply -f redis.yaml',
        setupFiles: {
          '/root/pod.yaml': 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\n  labels:\n    app: nginx\nspec:\n  containers:\n    - name: nginx\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n',
        },
        verifyId: 'pods.2',
      },
      {
        id: 'pods.3',
        title: 'Pod Labels & Selectors',
        badge: 'Pods',
        body:
          '<p><strong>Labels</strong> are key-value pairs attached to Kubernetes objects. They are the primary mechanism for organizing and selecting subsets of resources. ' +
          'For example, <code>app: frontend</code> or <code>tier: backend</code>. Labels do not provide uniqueness — many objects can share the same label.</p>' +
          '<p><strong>Selectors</strong> are used by other resources (Services, Deployments) to find which Pods they should manage or route traffic to. ' +
          'A Service with selector <code>app: frontend</code> will automatically discover all Pods that carry that label.</p>' +
          '<p>In this lesson, you\'ll create a labeled Pod that a later Service can select.</p>',
        task: 'Create a Pod named <code>frontend-pod</code> with image <code>nginx:1.25</code> and labels <code>app: frontend</code> and <code>tier: web</code>. Apply it and confirm it\'s Running.',
        hint: 'echo \'apiVersion: v1\\nkind: Pod\\nmetadata:\\n  name: frontend-pod\\n  labels:\\n    app: frontend\\n    tier: web\\nspec:\\n  containers:\\n    - name: nginx\\n      image: nginx:1.25\\n      ports:\\n        - containerPort: 80\' > frontend.yaml && kubectl apply -f frontend.yaml',
        setupFiles: {},
        verifyId: 'pods.3',
      },
      {
        id: 'pods.4',
        title: 'Multi-Container Pod',
        badge: 'Pods',
        body:
          '<p>While a Pod usually runs a single main container, it can run multiple containers that share the same network namespace and storage. ' +
          'The most common pattern is a <strong>sidecar</strong> — a helper container that runs alongside your main application (e.g., a log collector or proxy).</p>' +
          '<p>All containers in a Pod share <code>localhost</code> and can communicate over it. They also share the same lifecycle — they\'re scheduled together, ' +
          'started together, and terminated together.</p>' +
          '<p>Create a Pod with two containers: an nginx main container and a busybox sidecar.</p>',
        task: 'Create a Pod named <code>multi-pod</code> with two containers: <code>nginx</code> (image <code>nginx:1.25</code>, port 80) and <code>sidecar</code> (image <code>busybox</code>). Apply it.',
        hint: 'echo \'apiVersion: v1\\nkind: Pod\\nmetadata:\\n  name: multi-pod\\n  labels:\\n    app: multi\\nspec:\\n  containers:\\n    - name: nginx\\n      image: nginx:1.25\\n      ports:\\n        - containerPort: 80\\n    - name: sidecar\\n      image: busybox\' > multi.yaml && kubectl apply -f multi.yaml',
        setupFiles: {},
        verifyId: 'pods.4',
      },
      {
        id: 'pods.5',
        title: 'Deleting Pods',
        badge: 'Pods',
        body:
          '<p>Pods can be deleted with <code>kubectl delete pod &lt;name&gt;</code> or by referencing the original file with <code>kubectl delete -f &lt;file&gt;</code>. ' +
          'Deletion is graceful by default — Kubernetes sends SIGTERM, waits for a grace period (30s), then sends SIGKILL.</p>' +
          '<p>When a standalone Pod is deleted, it\'s gone permanently. However, Pods managed by a Deployment are automatically recreated — that\'s the self-healing feature. ' +
          'This is why in practice you rarely create bare Pods; you use Deployments instead.</p>' +
          '<p>Clean up all the pods you created in this module. Use <code>kubectl get pods</code> to verify the cluster is empty.</p>',
        task: 'Delete ALL pods in the cluster. After deletion, <code>kubectl get pods</code> should return "No resources found".',
        hint: 'List pods with kubectl get pods, then delete each: kubectl delete pod nginx-pod && kubectl delete pod redis-pod && kubectl delete pod frontend-pod && kubectl delete pod multi-pod',
        setupFiles: {},
        verifyId: 'pods.5',
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════
   *  MODULE 2: DEPLOYMENTS
   * ═══════════════════════════════════════════════════════ */
  {
    moduleId: 'deployments',
    moduleTitle: 'Module 2 — Deployments',
    lessons: [
      {
        id: 'deploy.1',
        title: 'Creating a Deployment',
        badge: 'Deploy',
        body:
          '<p>A <strong>Deployment</strong> is a higher-level abstraction over Pods. Instead of creating Pods directly, you create Deployments that manage ReplicaSets, ' +
          'which in turn manage Pod replicas. This gives you declarative updates, rollbacks, and self-healing.</p>' +
          '<p>The Deployment spec contains a Pod template (the blueprint) and a replica count. When you apply a Deployment, Kubernetes automatically creates a ReplicaSet ' +
          'and the specified number of Pod replicas. All CRUD operations happen at the Deployment level — everything underneath is managed automatically.</p>' +
          '<p>You can create a Deployment imperatively with <code>kubectl create deployment</code> or declaratively with a YAML file.</p>',
        task: 'Create a Deployment named <code>nginx-deployment</code> with image <code>nginx:1.25</code> and 2 replicas using a YAML file. Apply it and verify with <code>kubectl get deployments</code>.',
        hint: 'echo \'apiVersion: apps/v1\\nkind: Deployment\\nmetadata:\\n  name: nginx-deployment\\n  labels:\\n    app: nginx\\nspec:\\n  replicas: 2\\n  selector:\\n    matchLabels:\\n      app: nginx\\n  template:\\n    metadata:\\n      labels:\\n        app: nginx\\n    spec:\\n      containers:\\n        - name: nginx\\n          image: nginx:1.25\\n          ports:\\n            - containerPort: 80\' > deploy.yaml && kubectl apply -f deploy.yaml',
        setupFiles: {},
        verifyId: 'deploy.1',
      },
      {
        id: 'deploy.2',
        title: 'Scaling Replicas',
        badge: 'Deploy',
        body:
          '<p><strong>Scaling</strong> is one of the core advantages of Kubernetes. You can scale the number of Pod replicas up or down with a single command. ' +
          'Kubernetes will automatically create or remove Pods to match the desired replica count.</p>' +
          '<p>Use <code>kubectl scale deployment &lt;name&gt; --replicas=&lt;n&gt;</code> to scale imperatively. You can also edit the Deployment YAML and re-apply. ' +
          'Kubernetes compares the desired state with the current state and reconciles the difference.</p>' +
          '<p>Scaling up ensures high availability and load distribution. Scaling down conserves resources when demand is low.</p>',
        task: 'Scale <code>nginx-deployment</code> to 4 replicas. Verify with <code>kubectl get pods</code> — you should see 4 running Pods.',
        hint: 'kubectl scale deployment nginx-deployment --replicas=4',
        setupFiles: {},
        verifyId: 'deploy.2',
      },
      {
        id: 'deploy.3',
        title: 'Rolling Updates',
        badge: 'Deploy',
        body:
          '<p>When you update a Deployment (e.g., change the container image), Kubernetes performs a <strong>rolling update</strong>. ' +
          'It gradually replaces old Pods with new ones, ensuring zero downtime. At no point are all Pods simultaneously unavailable.</p>' +
          '<p>To update the image, you can edit the YAML file and re-apply it, or use the imperative approach. When you apply a changed Deployment, ' +
          'Kubernetes creates a new ReplicaSet, starts scaling it up, and scales down the old ReplicaSet in parallel.</p>' +
          '<p>Update the nginx image in your deployment from <code>nginx:1.25</code> to <code>nginx:latest</code> by editing the YAML file and re-applying.</p>',
        task: 'Update <code>nginx-deployment</code> to use image <code>nginx:latest</code> by editing the file and re-applying. Verify Pods have the new image.',
        hint: 'echo \'apiVersion: apps/v1\\nkind: Deployment\\nmetadata:\\n  name: nginx-deployment\\n  labels:\\n    app: nginx\\nspec:\\n  replicas: 4\\n  selector:\\n    matchLabels:\\n      app: nginx\\n  template:\\n    metadata:\\n      labels:\\n        app: nginx\\n    spec:\\n      containers:\\n        - name: nginx\\n          image: nginx:latest\\n          ports:\\n            - containerPort: 80\' > deploy.yaml && kubectl apply -f deploy.yaml',
        setupFiles: {},
        verifyId: 'deploy.3',
      },
      {
        id: 'deploy.4',
        title: 'Imperative Deployments',
        badge: 'Deploy',
        body:
          '<p>While YAML files are the recommended declarative approach, you can quickly create Deployments imperatively for testing. ' +
          '<code>kubectl create deployment &lt;name&gt; --image=&lt;image&gt;</code> creates a single-replica Deployment instantly.</p>' +
          '<p>The imperative approach is faster for experimentation but doesn\'t give you version-controlled configuration files. ' +
          'In production, always use declarative YAML files stored in version control — this is the "infrastructure as code" philosophy.</p>' +
          '<p>Create a second deployment for Redis using the imperative command.</p>',
        task: 'Create a deployment named <code>redis-deploy</code> with image <code>redis:7</code> using <code>kubectl create deployment</code>. Verify both deployments exist.',
        hint: 'kubectl create deployment redis-deploy --image=redis:7',
        setupFiles: {},
        verifyId: 'deploy.4',
      },
      {
        id: 'deploy.5',
        title: 'Cleaning Up Deployments',
        badge: 'Deploy',
        body:
          '<p>When you delete a Deployment, Kubernetes automatically cleans up the ReplicaSet and all managed Pods. ' +
          'This cascading deletion ensures no orphaned resources are left behind.</p>' +
          '<p>Use <code>kubectl delete deployment &lt;name&gt;</code> or <code>kubectl delete -f &lt;file&gt;</code>. ' +
          'After deletion, <code>kubectl get pods</code> should show the managed Pods terminating and eventually disappearing.</p>' +
          '<p>Delete all deployments to prepare a clean cluster for Module 3.</p>',
        task: 'Delete both <code>nginx-deployment</code> and <code>redis-deploy</code>. Verify no deployments or pods remain.',
        hint: 'kubectl delete deployment nginx-deployment && kubectl delete deployment redis-deploy',
        setupFiles: {},
        verifyId: 'deploy.5',
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════
   *  MODULE 3: SERVICES
   * ═══════════════════════════════════════════════════════ */
  {
    moduleId: 'services',
    moduleTitle: 'Module 3 — Services',
    lessons: [
      {
        id: 'svc.1',
        title: 'ClusterIP Service',
        badge: 'Services',
        body:
          '<p>A <strong>Service</strong> provides a stable network endpoint (IP + DNS name) for a set of Pods. Since Pod IPs change whenever a Pod is recreated, ' +
          'Services provide the permanent address that other components use to communicate.</p>' +
          '<p><strong>ClusterIP</strong> is the default Service type. It assigns an internal cluster IP that is only accessible from within the cluster. ' +
          'This is what you use for internal communication — for example, your application Pods connecting to a database Pod.</p>' +
          '<p>A Service uses <strong>selectors</strong> to find which Pods it should route traffic to. The selector matches against Pod labels. ' +
          'The Service also acts as a load balancer, distributing requests across matching Pods.</p>',
        task: 'Create a Deployment <code>web-app</code> (image <code>nginx:1.25</code>, 2 replicas, label <code>app: web</code>) and a ClusterIP Service named <code>web-service</code> that selects <code>app: web</code> on port 80. Use a YAML file with both resources.',
        hint: 'echo \'apiVersion: apps/v1\\nkind: Deployment\\nmetadata:\\n  name: web-app\\nspec:\\n  replicas: 2\\n  selector:\\n    matchLabels:\\n      app: web\\n  template:\\n    metadata:\\n      labels:\\n        app: web\\n    spec:\\n      containers:\\n        - name: nginx\\n          image: nginx:1.25\\n          ports:\\n            - containerPort: 80\\n---\\napiVersion: v1\\nkind: Service\\nmetadata:\\n  name: web-service\\nspec:\\n  selector:\\n    app: web\\n  ports:\\n    - port: 80\\n      targetPort: 80\' > web.yaml && kubectl apply -f web.yaml',
        setupFiles: {},
        verifyId: 'svc.1',
      },
      {
        id: 'svc.2',
        title: 'NodePort Service',
        badge: 'Services',
        body:
          '<p><strong>NodePort</strong> extends ClusterIP by also exposing the Service on a static port on each Node\'s IP. ' +
          'External traffic can reach the Service via <code>&lt;NodeIP&gt;:&lt;NodePort&gt;</code>. Valid NodePort range is 30000-32767.</p>' +
          '<p>This is the simplest way to expose a Service externally. In a real cluster, the NodePort is accessible on every Node. ' +
          'In minikube, you access it via the minikube IP.</p>' +
          '<p>The traffic flow: External request → NodePort → Service → Pod. NodePort implicitly creates a ClusterIP as well.</p>',
        task: 'Create a NodePort Service named <code>web-nodeport</code> that selects <code>app: web</code>, maps port 80 to targetPort 80, with nodePort 30080.',
        hint: 'echo \'apiVersion: v1\\nkind: Service\\nmetadata:\\n  name: web-nodeport\\nspec:\\n  type: NodePort\\n  selector:\\n    app: web\\n  ports:\\n    - port: 80\\n      targetPort: 80\\n      nodePort: 30080\' > nodeport.yaml && kubectl apply -f nodeport.yaml',
        setupFiles: {},
        verifyId: 'svc.2',
      },
      {
        id: 'svc.3',
        title: 'LoadBalancer Service',
        badge: 'Services',
        body:
          '<p><strong>LoadBalancer</strong> extends NodePort by provisioning an external load balancer (in cloud environments). ' +
          'It assigns an external IP address that routes to the NodePort and then to the Pods. This is the standard way to expose services in production cloud clusters.</p>' +
          '<p>In minikube, LoadBalancer Services show <code>&lt;pending&gt;</code> for external IP unless you use <code>minikube tunnel</code>. ' +
          'In our simulator, we assign a mock external IP automatically.</p>' +
          '<p>Use <code>kubectl expose</code> to quickly create a LoadBalancer Service from an existing Deployment.</p>',
        task: 'Use <code>kubectl expose</code> to create a LoadBalancer Service for <code>web-app</code> named <code>web-lb</code> on port 80.',
        hint: 'kubectl expose deployment web-app --name=web-lb --port=80 --type=LoadBalancer',
        setupFiles: {},
        verifyId: 'svc.3',
      },
      {
        id: 'svc.4',
        title: 'Service Discovery',
        badge: 'Services',
        body:
          '<p>Kubernetes provides built-in <strong>service discovery</strong> through DNS. Every Service gets a DNS entry: ' +
          '<code>&lt;service-name&gt;.&lt;namespace&gt;.svc.cluster.local</code>. Within the same namespace, you can reach a Service simply by its name.</p>' +
          '<p>Use <code>kubectl describe service &lt;name&gt;</code> to inspect the Service\'s endpoints — these are the Pod IPs and ports that the Service routes to. ' +
          'If the Endpoints list is empty, your selector doesn\'t match any running Pods.</p>' +
          '<p>Inspect your services to understand the connection between selectors, labels, and endpoints.</p>',
        task: 'Run <code>kubectl describe service web-service</code> to see its endpoints. Then run <code>kubectl get services</code> to see all three services. Create a new deployment <code>api-backend</code> (image <code>nginx:1.25</code>, label <code>app: api</code>) and expose it as ClusterIP on port 8080.',
        hint: 'kubectl create deployment api-backend --image=nginx:1.25 && kubectl expose deployment api-backend --port=8080 --type=ClusterIP',
        setupFiles: {},
        verifyId: 'svc.4',
      },
      {
        id: 'svc.5',
        title: 'Full Stack Cleanup',
        badge: 'Services',
        body:
          '<p>In a real workflow, you manage your entire application stack through YAML files — Deployments, Services, ConfigMaps, Secrets. ' +
          'Deleting with <code>kubectl delete -f</code> cleanly removes everything defined in the file.</p>' +
          '<p>For this final exercise, demonstrate mastery by cleaning up the entire cluster: delete all Deployments and all user-created Services. ' +
          'Only the default <code>kubernetes</code> Service should remain.</p>' +
          '<p>Congratulations on completing all three modules! You now understand the core building blocks of Kubernetes: Pods, Deployments, and Services.</p>',
        task: 'Delete ALL deployments and ALL user-created services. Only the default <code>kubernetes</code> service should remain. Verify with <code>kubectl get all</code>.',
        hint: 'kubectl delete deployment web-app && kubectl delete deployment api-backend && kubectl delete service web-service && kubectl delete service web-nodeport && kubectl delete service web-lb && kubectl delete service api-backend',
        setupFiles: {},
        verifyId: 'svc.5',
      },
    ],
  },
];
