import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS-variable tokens
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Standalone neon blue — use as `text-neon`, `bg-neon`, `border-neon`, etc.
        neon: "#0080ff",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      dropShadow: {
        // Text / SVG glow — use as `drop-shadow-neon` on icons and headings
        "neon-sm": "0 0 4px rgba(0,128,255,0.7)",
        neon: ["0 0 6px rgba(0,128,255,0.9)", "0 0 20px rgba(0,128,255,0.4)"],
      },
      boxShadow: {
        // Layered glow utilities: shadow-neon, shadow-neon-sm, shadow-neon-lg
        "neon-sm": "0 0 4px #0080ff, 0 0 12px rgba(0,128,255,0.4)",
        neon: "0 0 6px #0080ff, 0 0 20px rgba(0,128,255,0.45), 0 0 40px rgba(0,128,255,0.2)",
        "neon-lg":
          "0 0 8px #0080ff, 0 0 30px rgba(0,128,255,0.5), 0 0 60px rgba(0,128,255,0.25)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
