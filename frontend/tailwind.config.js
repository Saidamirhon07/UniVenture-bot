/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06101f",
        panel: "#0d1a2d",
        cyan: "#39d9ff",
        electric: "#5f7cff"
      },
      boxShadow: {
        glow: "0 0 40px rgba(57, 217, 255, .14)",
      },
    },
  },
  plugins: [],
};

