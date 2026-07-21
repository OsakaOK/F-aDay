import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Vintage Atlas palette — all driven by CSS variables (see globals.css) so
      // light (parchment) and dark (candlelit study) swap cleanly.
      colors: {
        parchment: "var(--parchment)",
        paper: "var(--paper)",
        paper2: "var(--paper-2)",
        ink: "var(--ink)",
        inkMuted: "var(--ink-muted)",
        edge: "var(--edge)",
        edgeSoft: "var(--edge-soft)",
        teal: "var(--teal)",
        tealStrong: "var(--teal-strong)",
        tealTint: "var(--teal-tint)",
        brass: "var(--brass)",
        brassSoft: "var(--brass-soft)",
        correct: "var(--correct)",
        correctBg: "var(--correct-bg)",
        wrong: "var(--wrong)",
        wrongBg: "var(--wrong-bg)",
        hintBg: "var(--hint-bg)",
        hintEdge: "var(--hint-edge)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        shake: "shake 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
