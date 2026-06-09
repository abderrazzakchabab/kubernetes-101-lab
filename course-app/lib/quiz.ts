export interface Question {
  id: string;
  chapterId: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export const questions: Question[] = [
  {
    id: "q1", chapterId: "what-is-kubernetes", level: "beginner",
    prompt: "Kubernetes is best described as…",
    choices: [
      "A container runtime that replaces Docker",
      "A declarative orchestrator that reconciles desired vs actual state",
      "A CI/CD system",
      "A virtual machine hypervisor",
    ],
    answer: 1,
    explanation: "K8s schedules and reconciles containers across nodes; it uses a runtime (containerd, CRI-O) but isn't one itself."
  },
  {
    id: "q2", chapterId: "pods", level: "beginner",
    prompt: "What does it mean that a Pod is 'ephemeral'?",
    choices: [
      "It runs only for a fixed time then exits.",
      "When it dies it is not restarted in place; a new Pod with a new IP replaces it.",
      "It cannot have persistent storage.",
      "It only exists during a deployment rollout.",
    ],
    answer: 1,
    explanation: "Pods are not restarted; controllers like Deployments create replacements."
  },
  {
    id: "q3", chapterId: "pods", level: "beginner",
    prompt: "Containers inside the same Pod share…",
    choices: ["Nothing", "Only volumes", "Network namespace and volumes", "Their entire filesystem"],
    answer: 2,
    explanation: "Same IP, same localhost, and any volumes declared on the Pod."
  },
  {
    id: "q4", chapterId: "labels-selectors", level: "beginner",
    prompt: "How does a Service know which Pods to send traffic to?",
    choices: ["By Pod name", "By IP range", "By matching its label selector against Pod labels", "By namespace alone"],
    answer: 2,
    explanation: "Services continuously match labels to build their endpoint list."
  },
  {
    id: "q5", chapterId: "deployments", level: "intermediate",
    prompt: "Changing `image:` and re-applying a Deployment triggers…",
    choices: [
      "An immediate delete of all Pods and recreate",
      "A rolling update governed by maxSurge / maxUnavailable",
      "Nothing until you also bump `replicas`",
      "A node reboot",
    ],
    answer: 1,
    explanation: "The Deployment creates a new ReplicaSet and rolls Pods over gradually."
  },
  {
    id: "q6", chapterId: "deployments", level: "intermediate",
    prompt: "Which command rewinds a Deployment to the previous revision?",
    choices: [
      "kubectl rollback deploy/web",
      "kubectl rollout undo deploy/web",
      "kubectl revert deploy/web",
      "kubectl apply --rollback",
    ],
    answer: 1,
    explanation: "`kubectl rollout undo` is the correct verb."
  },
  {
    id: "q7", chapterId: "services", level: "intermediate",
    prompt: "Which Service type gets you a stable cluster-internal virtual IP only?",
    choices: ["NodePort", "LoadBalancer", "ClusterIP", "ExternalName"],
    answer: 2,
    explanation: "ClusterIP is the default and is reachable only inside the cluster."
  },
  {
    id: "q8", chapterId: "config-secrets", level: "intermediate",
    prompt: "By default, the content of a Kubernetes Secret is…",
    choices: ["Encrypted with AES-256", "Base64 encoded, not encrypted", "Hashed with SHA-256", "Stored only in memory"],
    answer: 1,
    explanation: "Secrets are base64 only. Enable encryption-at-rest on the API server for real protection."
  },
  {
    id: "q9", chapterId: "scaling-rollouts", level: "advanced",
    prompt: "A Pod is Running but the readiness probe is failing. What happens?",
    choices: [
      "It's killed and restarted.",
      "Nothing — Pods keep receiving traffic.",
      "It's removed from the Service's endpoint list until the probe passes.",
      "The whole Deployment is rolled back.",
    ],
    answer: 2,
    explanation: "Liveness kills; readiness gates traffic."
  },
  {
    id: "q10", chapterId: "troubleshooting", level: "expert",
    prompt: "Your Service has 0 endpoints despite Pods existing. Most likely cause?",
    choices: [
      "The cluster DNS is down.",
      "The Service selector doesn't match any Pod labels, or no Pod is Ready.",
      "You need to restart kube-proxy.",
      "The Service type must be NodePort to have endpoints.",
    ],
    answer: 1,
    explanation: "Endpoints are populated by selector → Ready Pods. Check both."
  },
  {
    id: "q11", chapterId: "troubleshooting", level: "expert",
    prompt: "A container is in CrashLoopBackOff. Which command shows the logs from the last failed run?",
    choices: [
      "kubectl logs <pod>",
      "kubectl logs <pod> --previous",
      "kubectl debug <pod>",
      "kubectl describe pod <pod>",
    ],
    answer: 1,
    explanation: "`--previous` retrieves the prior container instance's logs."
  },
  {
    id: "q12", chapterId: "scaling-rollouts", level: "advanced",
    prompt: "Which HPA configuration scales between 2 and 10 replicas at 70% CPU?",
    choices: [
      "kubectl scale deploy/web --replicas=10",
      "kubectl autoscale deploy/web --min=2 --max=10 --cpu-percent=70",
      "kubectl rollout autoscale deploy/web 2 10 70",
      "kubectl set hpa deploy/web 2-10@70%",
    ],
    answer: 1,
    explanation: "`kubectl autoscale` is the imperative HPA shortcut."
  }
];
