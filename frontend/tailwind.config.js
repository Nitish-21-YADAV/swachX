/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:    ["'Inter'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        bg:      { base:"#050D05", card:"#0B1A0B", hover:"#112011", border:"#1E3A1E" },
        acid:    { DEFAULT:"#C8F135", dim:"#8BB820", dark:"#4A6610" },
        text:    { primary:"#E8F5E2", secondary:"#7A9470", muted:"#3D5C3D" },
        status:  { pending:"#FBBF24", cleaned:"#4ADE80", rejected:"#F87171", review:"#C4B5FD" },
      },
      animation: {
        "fade-up":   "fadeUp 0.4s ease-out both",
        "fade-in":   "fadeIn 0.3s ease-out both",
        "scan":      "scan 2.4s linear infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp:   { "0%":{"opacity":"0","transform":"translateY(16px)"},    "100%":{"opacity":"1","transform":"translateY(0)"} },
        fadeIn:   { "0%":{"opacity":"0"},                                   "100%":{"opacity":"1"} },
        scan:     { "0%":{"transform":"translateY(-100%)"},                 "100%":{"transform":"translateY(400%)"} },
        pulseDot: { "0%,100%":{"opacity":"1","transform":"scale(1)"},       "50%":{"opacity":"0.4","transform":"scale(0.85)"} },
      }
    }
  },
  plugins: []
}
