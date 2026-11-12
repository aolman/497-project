/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#004340", "primary-container": "#0d5c58", "on-primary": "#ffffff",
        "on-primary-container": "#8ed2cc", "primary-fixed": "#abefe9", "primary-fixed-dim": "#8fd3cd",
        secondary: "#006c49", "secondary-container": "#6cf8bb", "secondary-fixed": "#6ffbbe",
        "secondary-fixed-dim": "#4edea3", "on-secondary-container": "#00714d",
        tertiary: "#5d3000", "tertiary-container": "#7f4300", "tertiary-fixed": "#ffdcc3", // fixed: Stitch omitted the '#'
        "tertiary-fixed-dim": "#ffb77d",
        surface: "#f9f9ff", "surface-dim": "#cfdaf2", "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f3ff", "surface-container": "#e7eeff",
        "surface-container-high": "#dee8ff", "surface-container-highest": "#d8e3fb",
        "on-surface": "#111c2d", "on-surface-variant": "#3f4947",
        outline: "#6f7978", "outline-variant": "#bec9c7",
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: { margin: "1rem", "space-xs": "0.25rem", "space-sm": "0.5rem" },
      fontFamily: { sans: ["DM Sans", "system-ui", "sans-serif"] },
      fontSize: {
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "700" }],
        "label-md": ["13px", { lineHeight: "18px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-lg": ["15px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-hero-mobile": ["32px", { lineHeight: "38px", letterSpacing: "-0.015em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};