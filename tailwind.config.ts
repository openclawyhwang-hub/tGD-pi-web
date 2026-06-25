import type { Config } from "tailwindcss";

// Tailwind v4: content detection is automatic via @tailwindcss/postcss.
// This config is kept for v3 fallback compatibility only.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
