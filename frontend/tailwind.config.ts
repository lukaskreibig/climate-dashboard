import type { Config } from "tailwindcss"

/** Tailwind drives *all* design tokens.  
 * `next-themes` will add / remove the `dark` class on <html>. */
export default {
  darkMode: "class",                 // ←–– crucial for next-themes
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arctic: {
          50:"#e5f9ff",100:"#d7eef5",200:"#b4d9e6",
          300:"#98c9da",400:"#6db1c9",500:"#58a6c1",
          600:"#4aa0be",700:"#388ca8",800:"#2a7c97",900:"#0a6c86",
        },
        night:{50:"#2e3440",900:"#4c566a"},
        snow :{50:"#d8dee9",900:"#eceff4"},
      },
      fontFamily: {
        sans   : ["var(--font-geist)", "Inter", "sans-serif"],
        mono   : ["var(--font-mono)",  "ui-monospace"],
        display: ["var(--font-bebas)","var(--font-rubik)","ui-serif"],
        body   : ["var(--font-markazi-text)","ui-sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
