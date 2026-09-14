/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1B2430",
        slate: {
          850: "#1E2733",
        },
        safety: {
          amber: "#E0A62B",
          red: "#C1432A",
          green: "#2F7A4D",
        },
        paper: "#F4F5F1",
        steel: "#3E5C76",
      },
      fontFamily: {
        display: ["'IBM Plex Sans Condensed'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
