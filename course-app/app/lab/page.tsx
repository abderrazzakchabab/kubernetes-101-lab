import { Terminal } from "@/components/Terminal";

export default function LabPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">The Lab</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          A simulated cluster + a real <span className="font-mono text-accent">kubectl</span>-style shell. Try the commands below or
          paste any YAML you'd write against a real cluster.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        <Terminal />
        <aside className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 h-fit">
          <h3 className="text-sm uppercase tracking-wider text-muted mb-3">Try these</h3>
          <ul className="space-y-2 text-sm font-mono text-slate-300">
            <li className="text-accent">kubectl get nodes</li>
            <li className="text-accent">kubectl get pods</li>
            <li className="text-accent">kubectl create deployment web --image=nginx</li>
            <li className="text-accent">kubectl scale deploy/web --replicas=3</li>
            <li className="text-accent">kubectl expose deploy/web --port=80</li>
            <li className="text-accent">kubectl get svc</li>
          </ul>
          <div className="mt-5 pt-5 border-t border-slate-800 text-xs text-slate-500">
            Everything runs locally in your browser against an in-memory cluster.
          </div>
        </aside>
      </div>
    </div>
  );
}
