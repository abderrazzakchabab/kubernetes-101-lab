import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F172A",
        surface: "#1E293B",
        surface2: "#334155",
        text: "#F8FAFC",
        muted: "#94A3B8",
        accent: "#22C55E",
        accent2: "#38BDF8",
        warn: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,197,94,.25), 0 8px 40px -8px rgba(34,197,94,.35)",
      },
      animation: {
        "fade-in": "fadeIn .35s ease-out both",
        "slide-up": "slideUp .4s ease-out both",
        blink: "blink 1s steps(1) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        blink: { "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
