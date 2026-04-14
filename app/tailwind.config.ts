/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Institutional dark background
        void:    "#040810",
        surface: "#080f1e",
        panel:   "#0d1829",
        border:  "#1a2f4a",
        // Encrypt accent — cyan
        encrypt: {
          DEFAULT: "#00d2ff",
          dim:     "#0099cc",
          glow:    "rgba(0, 210, 255, 0.15)",
        },
        // Ika accent — violet
        ika: {
          DEFAULT: "#a855f7",
          dim:     "#7c3aed",
          glow:    "rgba(168, 85, 247, 0.15)",
        },
        // Status
        success: "#10b981",
        warning: "#f59e0b",
        danger:  "#ef4444",
        muted:   "#4a6080",
        text:    "#c8d8f0",
        subtle:  "#6b8aac",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "encrypt-gradient": "linear-gradient(135deg, #00d2ff 0%, #0099cc 100%)",
        "ika-gradient":     "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
        "match-gradient":   "linear-gradient(135deg, #00d2ff 0%, #a855f7 100%)",
        "grid-pattern": `linear-gradient(rgba(0,210,255,0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(0,210,255,0.03) 1px, transparent 1px)`,
      },
      animation: {
        "pulse-encrypt": "pulse-encrypt 2s ease-in-out infinite",
        "pulse-ika":     "pulse-ika 2s ease-in-out infinite",
        "spin-slow":     "spin 3s linear infinite",
        "fade-in":       "fade-in 0.4s ease-out",
        "slide-up":      "slide-up 0.4s ease-out",
        "shimmer":       "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-encrypt": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,210,255,0)" },
          "50%":       { boxShadow: "0 0 20px 4px rgba(0,210,255,0.3)" },
        },
        "pulse-ika": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(168,85,247,0)" },
          "50%":       { boxShadow: "0 0 20px 4px rgba(168,85,247,0.3)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        "encrypt": "0 0 20px rgba(0,210,255,0.2), 0 4px 40px rgba(0,0,0,0.6)",
        "ika":     "0 0 20px rgba(168,85,247,0.2), 0 4px 40px rgba(0,0,0,0.6)",
        "panel":   "0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
