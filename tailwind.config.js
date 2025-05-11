/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          navy: "#183153",
          green: "#2ECC71",
          blue: "#4A90E2",
          gray: "#F5F7FA",
        },
        verdict: {
          true: "#2ECC71",
          false: "#E74C3C",
          partial: "#F39C12",
        },
      },
    },
  },
  plugins: [],
};
