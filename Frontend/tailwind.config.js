/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f9ff",
          100: "#e8f1ff",
          500: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a"
        }
      }
    }
  },
  plugins: []
};
