/** Steady palette from the design spec: teal for actions, green for covered,
 *  amber for estimates and caution (never red), soft blue-white surfaces. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        teal: { DEFAULT: "#0D5C58", dark: "#08413E", soft: "#DDEFEC", line: "#9FD3CC" },
        mint: { DEFAULT: "#10B981", soft: "#D5F7E8", ink: "#046C4E" },
        amber: { DEFAULT: "#D97706", soft: "#FDEFD8", ink: "#8A3B06" },
        ink: { DEFAULT: "#1E293B", muted: "#4B5568" },
        surface: { DEFAULT: "#ECEFFB", page: "#F3F5FD", line: "#DDE2F3" },
        bills: "#A9B8D6",
      },
      borderRadius: { card: "20px" },
    },
  },
  plugins: [],
};
