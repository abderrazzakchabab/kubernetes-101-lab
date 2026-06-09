"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    K8sTerminal?: { init: (el: HTMLElement) => void; fit: () => void; clearTerminal: () => void; writeOutput: (s: string) => void };
    verifyTask?: (id: string) => { passed: boolean; message: string };
    clusterState?: any;
  }
}

export function Terminal({ verifyId, goal }: { verifyId?: string; goal?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [verdict, setVerdict] = useState<{ passed: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (window.K8sTerminal && (window as any).Terminal && (window as any).FitAddon && ref.current) {
        window.K8sTerminal.init(ref.current);
        try { window.K8sTerminal.fit(); } catch {}
      } else {
        setTimeout(tryInit, 80);
      }
    };
    tryInit();
    return () => { cancelled = true; };
  }, [ready]);

  const check = () => {
    if (!verifyId || !window.verifyTask) return;
    setVerdict(window.verifyTask(verifyId));
  };
  const reset = () => {
    // Re-init cluster by reloading scripts is heavy — instead clear file system + workloads.
    if (window.clusterState) {
      window.clusterState.pods = [];
      window.clusterState.deployments = [];
      window.clusterState.services = [];
      window.clusterState.fileSystem = {};
      window.K8sTerminal?.clearTerminal();
      window.K8sTerminal?.writeOutput("\r\n\x1b[33m⚠ Cluster reset.\x1b[0m\r\n");
      setVerdict(null);
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css" />
      <Script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js" strategy="afterInteractive" />
      <Script src="/sim/state.js" strategy="afterInteractive" />
      <Script src="/sim/terminal-parser.js" strategy="afterInteractive" />
      <Script src="/sim/verifier.js" strategy="afterInteractive" onLoad={() => setReady(true)} />

      <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-glow">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/70" />
            <span className="w-3 h-3 rounded-full bg-amber-500/70" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            <span className="ml-3 text-xs font-mono text-slate-400">simulated kubectl · in-memory cluster</span>
          </div>
          <div className="flex items-center gap-2">
            {verifyId && (
              <button onClick={check} className="cursor-pointer text-xs px-3 py-1 rounded-lg bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 transition-colors duration-200">
                Check my work
              </button>
            )}
            <button onClick={reset} className="cursor-pointer text-xs px-3 py-1 rounded-lg border border-slate-700 hover:border-rose-500/60 hover:text-rose-300 transition-colors duration-200">
              Reset
            </button>
          </div>
        </div>
        <div ref={ref} className="term-screen" />
      </div>

      {verdict && (
        <div className={`mt-3 p-4 rounded-xl border text-sm animate-slide-up ${
          verdict.passed ? "border-accent/50 bg-accent/10 text-accent" : "border-danger/50 bg-danger/10 text-rose-300"
        }`}>
          <span className="font-mono mr-2">{verdict.passed ? "✓ PASS" : "✗ FAIL"}</span>
          {verdict.message}
        </div>
      )}
      {goal && !verdict && (
        <div className="mt-3 text-xs text-slate-500 font-mono">goal: {goal}</div>
      )}
    </>
  );
}
