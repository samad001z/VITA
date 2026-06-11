/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAF8",
        surface: "#FFFFFF",
        ink: "#1A1A1E",
        "ink-soft": "rgba(26,26,30,0.55)",
        "ink-faint": "rgba(26,26,30,0.35)",
        sage: "#7C9885",
        "sage-soft": "rgba(124,152,133,0.12)",
        coral: "#E8826B",
        "coral-soft": "rgba(232,130,107,0.12)",
        hairline: "rgba(0,0,0,0.06)",
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "24px",
      },
      fontSize: {
        caption: "13px",
        label: "15px",
        body: "17px",
        heading: "22px",
        title: "28px",
        display: "34px",
      },
    },
  },
  plugins: [],
};
