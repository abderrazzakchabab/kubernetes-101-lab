export type Level = "beginner" | "intermediate" | "advanced" | "expert";

export interface Lab {
  goal: string;
  steps: string[];
  verifyId: string;
}
export interface Section { heading: string; body: string }
export interface Chapter {
  id: string;
  level: Level;
  number: number;
  title: string;
  summary: string;
  duration: string;
  sections: Section[];
  keyCommands: string[];
  lab?: Lab;
}

export const chapters: Chapter[] = [
  {
    id: "what-is-kubernetes",
    number: 1, level: "beginner", duration: "10 min",
    title: "What is Kubernetes?",
    summary: "The why and what behind container orchestration — and the mental model you need before touching kubectl.",
    sections: [
      { heading: "From containers to clusters", body:
        "Containers package an app and its dependencies. But running one container on your laptop is easy; running **hundreds** across many machines, restarting them when they crash, rolling out new versions without downtime, and reaching them over the network — that's *orchestration*.\n\nKubernetes (K8s) is the open-source orchestrator originally built at Google. You describe **what** you want (\"3 replicas of this image, exposed on port 80\") and Kubernetes continuously works to make reality match that desired state." },
      { heading: "The control plane and the nodes", body:
        "A cluster has two halves:\n\n- **Control plane** — the brain. Components like `kube-apiserver`, `etcd` (the cluster database), `scheduler`, and `controller-manager`.\n- **Worker nodes** — the muscle. Each runs `kubelet` (the agent that talks to the control plane) and a container runtime (containerd, CRI-O).\n\nYou never SSH into nodes to start containers. You talk to the **API server** with `kubectl`, and the cluster does the rest." },
      { heading: "Declarative, not imperative", body:
        "Kubernetes is *declarative*. Instead of `start this container`, you submit a YAML document that *describes* the end state. Controllers loop forever comparing **desired** vs **actual** state and reconcile the difference. Crash a Pod manually — a new one appears. Drain a node — workloads reschedule elsewhere." }
    ],
    keyCommands: ["kubectl version", "kubectl cluster-info", "kubectl get nodes"]
  },
  {
    id: "pods",
    number: 2, level: "beginner", duration: "15 min",
    title: "Pods — the atom of Kubernetes",
    summary: "A Pod is the smallest deployable unit. Learn its anatomy, lifecycle, and why you almost never create one by hand in production.",
    sections: [
      { heading: "One or more containers, shared everything", body:
        "A **Pod** is a group of one or more containers that share a network namespace (same IP, same localhost) and storage volumes. Most Pods have a single container; multi-container Pods exist for tightly-coupled helpers like log shippers or sidecar proxies.\n\nA Pod is **ephemeral** — when it dies, it's not restarted; a *new* Pod (with a new IP) is created in its place. That's why you almost always wrap Pods in a higher-level object like a Deployment." },
      { heading: "Anatomy of a Pod manifest", body:
        "```yaml\napiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\n  labels:\n    app: nginx\nspec:\n  containers:\n    - name: nginx\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n```\n\n- `apiVersion` + `kind` tell the API server *what* you're creating.\n- `metadata.labels` are key/value tags — Services and Deployments use them to *find* this Pod.\n- `spec.containers[].image` is the immutable contract." },
      { heading: "Phases and conditions", body:
        "A Pod moves through phases: `Pending` → `Running` → `Succeeded`/`Failed`. Inside `Running`, the *Ready* condition flips true once all readiness probes pass. `kubectl describe pod <name>` shows the full timeline and any pull errors." }
    ],
    keyCommands: ["kubectl apply -f pod.yaml", "kubectl get pods", "kubectl describe pod nginx-pod", "kubectl delete pod nginx-pod"],
    lab: {
      goal: "Create the nginx-pod from the YAML above and verify it is Running.",
      steps: [
        "Create pod.yaml with the manifest from the section above (use the `echo '…' > pod.yaml` form).",
        "Apply it: `kubectl apply -f pod.yaml`",
        "List pods: `kubectl get pods`"
      ],
      verifyId: "pods.1"
    }
  },
  {
    id: "labels-selectors",
    number: 3, level: "beginner", duration: "10 min",
    title: "Labels & Selectors",
    summary: "Labels are how everything in Kubernetes finds everything else. Master them or be lost.",
    sections: [
      { heading: "Tags, not hierarchy", body:
        "A label is just `key: value` metadata you stick on any object: `app=frontend`, `tier=cache`, `env=prod`. Unlike folders, labels are *flat and overlapping* — a Pod can have many." },
      { heading: "Selectors find sets of objects", body:
        "A **selector** is a query against labels. Services use selectors to decide which Pods receive traffic. Deployments use them to know which Pods they own.\n\n```yaml\nselector:\n  matchLabels:\n    app: frontend\n    tier: web\n```\n\nOn the CLI: `kubectl get pods -l app=frontend,tier=web`." }
    ],
    keyCommands: ["kubectl get pods --show-labels", "kubectl label pod nginx-pod env=dev", "kubectl get pods -l app=nginx"],
    lab: {
      goal: "Create a Pod with labels app=frontend, tier=web.",
      steps: ["Write a Pod manifest with those two labels.", "Apply and list with `-l app=frontend`."],
      verifyId: "pods.3"
    }
  },
  {
    id: "deployments",
    number: 4, level: "intermediate", duration: "20 min",
    title: "Deployments — declarative app lifecycle",
    summary: "The object you actually use in production. Replicas, rolling updates, rollbacks — all by editing one field.",
    sections: [
      { heading: "Why not just Pods?", body:
        "Pods are ephemeral and unmanaged. A **Deployment** is a higher-level controller that manages a **ReplicaSet**, which in turn ensures *N* Pod replicas are always running. Kill a Pod → ReplicaSet notices → new Pod appears." },
      { heading: "A minimal Deployment", body:
        "```yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deploy\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n        - name: nginx\n          image: nginx:1.25\n```\n\nThe `template` is a Pod spec. The `selector` must match the template's labels — it's how the Deployment owns the Pods it creates." },
      { heading: "Scaling and rolling updates", body:
        "Change `replicas: 5` and re-apply — the Deployment scales up. Change `image: nginx:1.27` and re-apply — the Deployment performs a **rolling update**: spin up new Pods, wait for Ready, terminate old, repeat. `kubectl rollout status deploy/nginx-deploy` watches it; `kubectl rollout undo` rewinds." }
    ],
    keyCommands: [
      "kubectl apply -f deploy.yaml",
      "kubectl get deploy",
      "kubectl scale deploy/nginx-deploy --replicas=5",
      "kubectl set image deploy/nginx-deploy nginx=nginx:1.27",
      "kubectl rollout undo deploy/nginx-deploy"
    ],
    lab: {
      goal: "Create a Deployment with 3 replicas of nginx, then scale to 5.",
      steps: [
        "Apply the Deployment manifest from above.",
        "Run `kubectl scale deploy/nginx-deploy --replicas=5`.",
        "Verify with `kubectl get pods`."
      ],
      verifyId: "deploy.2"
    }
  },
  {
    id: "services",
    number: 5, level: "intermediate", duration: "20 min",
    title: "Services & Networking",
    summary: "Pods come and go. Services give them a stable virtual address — and decide who can reach them.",
    sections: [
      { heading: "The Service abstraction", body:
        "A **Service** is a stable DNS name + virtual IP that load-balances traffic to a *set* of Pods matched by a label selector. As Pods are created and destroyed, the Service's endpoint list updates automatically." },
      { heading: "Service types", body:
        "- **ClusterIP** (default) — internal-only virtual IP. The bedrock of in-cluster communication.\n- **NodePort** — opens a port (30000–32767) on every node. Great for dev, awkward for prod.\n- **LoadBalancer** — provisions a cloud load balancer with a public IP.\n- **ExternalName** — DNS CNAME to an external service." },
      { heading: "Connecting to a Deployment", body:
        "```yaml\napiVersion: v1\nkind: Service\nmetadata:\n  name: nginx-svc\nspec:\n  type: ClusterIP\n  selector:\n    app: nginx\n  ports:\n    - port: 80\n      targetPort: 80\n```\n\nNow any Pod can reach `http://nginx-svc` (or `nginx-svc.default.svc.cluster.local`) and traffic load-balances across the nginx Pods." }
    ],
    keyCommands: [
      "kubectl expose deploy/nginx-deploy --port=80 --target-port=80",
      "kubectl get svc",
      "kubectl describe svc nginx-svc"
    ],
    lab: {
      goal: "Expose the nginx Deployment as a ClusterIP Service on port 80.",
      steps: ["Run `kubectl expose deploy/nginx-deploy --port=80 --target-port=80 --name=nginx-svc`.", "Verify with `kubectl get svc`."],
      verifyId: "svc.1"
    }
  },
  {
    id: "config-secrets",
    number: 6, level: "intermediate", duration: "15 min",
    title: "ConfigMaps & Secrets",
    summary: "Stop baking configuration into images. Inject it at runtime — and keep credentials out of git.",
    sections: [
      { heading: "ConfigMap: non-sensitive config", body:
        "A ConfigMap stores key/value pairs (or whole files) that Pods consume as env vars, command-line args, or mounted files. Update the ConfigMap, restart the Pods, new config takes effect — no image rebuild." },
      { heading: "Secret: same shape, base64 encoded", body:
        "A Secret has the same structure as a ConfigMap but is intended for credentials. By default Secrets are only *base64*, not encrypted — enable **encryption at rest** on the API server and restrict RBAC. For production, integrate an external vault (Sealed Secrets, External Secrets Operator, Vault)." },
      { heading: "Mounting into a Pod", body:
        "```yaml\nenvFrom:\n  - configMapRef:\n      name: app-config\n  - secretRef:\n      name: app-creds\n```\n\nOr mount as files with `volumes` + `volumeMounts` when the app expects to read from a path." }
    ],
    keyCommands: [
      "kubectl create configmap app-config --from-literal=LOG_LEVEL=debug",
      "kubectl create secret generic app-creds --from-literal=API_KEY=xyz",
      "kubectl get cm,secret"
    ]
  },
  {
    id: "scaling-rollouts",
    number: 7, level: "advanced", duration: "20 min",
    title: "Scaling, Rollouts & Self-Healing",
    summary: "From manual scale to HPA, from rolling updates to blue/green. The operational toolkit.",
    sections: [
      { heading: "Rolling-update strategy", body:
        "`strategy.rollingUpdate.maxSurge` (extra Pods during update) and `maxUnavailable` (Pods that may be down) tune update aggressiveness. Set `maxUnavailable: 0` for zero-downtime; `maxSurge: 100%` for fastest." },
      { heading: "Horizontal Pod Autoscaler", body:
        "HPA scales replicas based on CPU, memory, or custom metrics: `kubectl autoscale deploy/web --min=2 --max=10 --cpu-percent=70`. Requires the metrics-server (or Prometheus adapter for custom metrics)." },
      { heading: "Probes power self-healing", body:
        "- **livenessProbe** — restart the container if it fails (deadlocked process).\n- **readinessProbe** — remove from Service endpoints if it fails (warming up, dependency down).\n- **startupProbe** — give slow-booting apps a grace window before liveness kicks in.\n\nWithout probes, a Pod that is *up* but *broken* still receives traffic." }
    ],
    keyCommands: [
      "kubectl autoscale deploy/web --min=2 --max=10 --cpu-percent=70",
      "kubectl rollout status deploy/web",
      "kubectl rollout history deploy/web",
      "kubectl rollout undo deploy/web --to-revision=2"
    ]
  },
  {
    id: "troubleshooting",
    number: 8, level: "expert", duration: "25 min",
    title: "Troubleshooting with kubectl",
    summary: "When the cluster is on fire, these are the five commands that find the root cause in under a minute.",
    sections: [
      { heading: "The five-command triage", body:
        "1. `kubectl get pods -A` — what's not Running/Ready?\n2. `kubectl describe pod <name>` — the **Events** section at the bottom shows pull failures, FailedScheduling, OOMKilled, probe failures.\n3. `kubectl logs <pod> -c <container> --previous` — the previous container's logs survive a restart.\n4. `kubectl get events --sort-by=.lastTimestamp` — cluster-wide chronological events.\n5. `kubectl exec -it <pod> -- sh` — open a shell inside the container to test DNS, ports, files." },
      { heading: "Common failure modes", body:
        "- **ImagePullBackOff** — wrong image name/tag or missing imagePullSecret.\n- **CrashLoopBackOff** — container exits non-zero repeatedly. Check `logs --previous`.\n- **Pending** — no node has the requested CPU/memory, or a PVC isn't bound.\n- **OOMKilled** — container exceeded its memory limit; raise `resources.limits.memory` or fix the leak.\n- **Service has no endpoints** — selector doesn't match any Pod labels, or Pods aren't Ready." },
      { heading: "Beyond kubectl", body:
        "Use `kubectl debug` to attach an ephemeral debug container to a running Pod without modifying its spec. Use `kubectl port-forward svc/foo 8080:80` to reach a ClusterIP from your laptop. Pipe `kubectl get … -o jsonpath='{.items[*].status.phase}'` for scripting." }
    ],
    keyCommands: [
      "kubectl get pods -A",
      "kubectl describe pod <name>",
      "kubectl logs <pod> --previous",
      "kubectl get events --sort-by=.lastTimestamp",
      "kubectl exec -it <pod> -- sh"
    ]
  }
];

export function getChapter(id: string) {
  return chapters.find((c) => c.id === id);
}
