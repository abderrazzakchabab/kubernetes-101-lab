import Link from "next/link";
import { chapters } from "@/lib/curriculum";

const levelStyles: Record<string, string> = {
  beginner: "text-emerald-300 border-emerald-500/40 bg-emerald-500/5",
  intermediate: "text-sky-300 border-sky-500/40 bg-sky-500/5",
  advanced: "text-amber-300 border-amber-500/40 bg-amber-500/5",
  expert: "text-rose-300 border-rose-500/40 bg-rose-500/5",
};

export default function ChaptersIndex() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Curriculum</h1>
        <p className="text-slate-400 mt-2">Eight chapters, progressing newbie → expert. Each ends with an interactive lab and quiz questions.</p>
      </header>

      <ol className="space-y-3">
        {chapters.map((c) => (
          <li key={c.id}>
            <Link href={`/chapters/${c.id}`} className="group block p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-accent/40 transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="font-mono text-2xl text-slate-600 group-hover:text-accent transition-colors w-10 text-right">{String(c.number).padStart(2, "0")}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold">{c.title}</h2>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${levelStyles[c.level]}`}>{c.level}</span>
                    <span className="text-xs text-slate-500 font-mono">{c.duration}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{c.summary}</p>
                </div>
                <div className="text-slate-600 group-hover:text-accent transition-colors">→</div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
