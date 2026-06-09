import Link from "next/link";
import { chapters } from "@/lib/curriculum";

export default function Home() {
  const byLevel = {
    beginner: chapters.filter(c => c.level === "beginner").length,
    intermediate: chapters.filter(c => c.level === "intermediate").length,
    advanced: chapters.filter(c => c.level === "advanced").length,
    expert: chapters.filter(c => c.level === "expert").length,
  };
  return (
    <div className="space-y-20">
      <section className="text-center pt-10 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blink" /> interactive curriculum
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-[1.1]">
          Kubernetes — from <span className="text-accent">$ kubectl get pods</span><br /> to production fluency.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-slate-300 text-lg">
          Eight chapters. A simulated <span className="font-mono text-accent2">kubectl</span> terminal in your browser.
          A quiz that grades you. Zero install — no Docker, no cluster.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/chapters" className="cursor-pointer px-5 py-3 rounded-xl bg-accent text-slate-900 font-semibold hover:bg-accent/90 transition-colors duration-200">
            Start the course →
          </Link>
          <Link href="/lab" className="cursor-pointer px-5 py-3 rounded-xl border border-slate-700 hover:border-accent2/60 hover:text-accent2 transition-colors duration-200 font-mono text-sm">
            Open the lab
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          ["Beginner", byLevel.beginner, "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"],
          ["Intermediate", byLevel.intermediate, "bg-sky-500/10 text-sky-300 border-sky-500/30"],
          ["Advanced", byLevel.advanced, "bg-amber-500/10 text-amber-300 border-amber-500/30"],
          ["Expert", byLevel.expert, "bg-rose-500/10 text-rose-300 border-rose-500/30"],
        ] as const).map(([label, n, cls]) => (
          <div key={label} className={`rounded-2xl border p-5 ${cls}`}>
            <div className="text-3xl font-semibold font-mono">{n}</div>
            <div className="text-xs uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">What you'll build a feel for</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { t: "The reconciliation loop", d: "Why declarative beats imperative once you have more than one machine." },
            { t: "Pods, Deployments, Services", d: "The three objects that get you 80% of the way." },
            { t: "Operational kubectl", d: "Five commands that diagnose almost any failure in under a minute." },
          ].map(({ t, d }) => (
            <div key={t} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-colors duration-200">
              <div className="font-semibold mb-1">{t}</div>
              <div className="text-sm text-slate-400">{d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
