import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Kubernetes Course — From Newbie to Expert",
  description: "Interactive Kubernetes course with chapters, quizzes, and a real kubectl simulator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="max-w-6xl mx-auto px-5 pt-24 pb-24 animate-fade-in">{children}</main>
        <footer className="border-t border-slate-800 py-8 text-center text-sm text-muted">
          Built from <span className="font-mono text-accent">kubernetes.io</span> + NotebookLM curriculum.
        </footer>
      </body>
    </html>
  );
}
