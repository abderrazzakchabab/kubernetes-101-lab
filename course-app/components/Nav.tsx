"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/chapters", label: "Chapters" },
  { href: "/lab", label: "Lab" },
  { href: "/quiz", label: "Quiz" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <div className="max-w-6xl mx-auto bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-4 py-2 flex items-center justify-between shadow-glow">
        <Link href="/" className="flex items-center gap-2 cursor-pointer group">
          <span className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 grid place-items-center font-mono text-accent text-sm group-hover:bg-accent/30 transition-colors">k8</span>
          <span className="font-mono text-sm tracking-tight">k8s.course</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors duration-200 ${
                  active ? "bg-accent/15 text-accent" : "text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
