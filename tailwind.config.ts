import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#123A69",
          secondary: "#86201A",
          navy: "#0F2745",
          background: "#F7F9FC",
          surface: "#FFFFFF",
          text: "#142033",
          muted: "#5B667A"
        }
      },
      boxShadow: {
        editorial: "0 24px 80px rgba(15, 39, 69, 0.12)"
      },
      borderRadius: {
        editorial: "28px"
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        sans: ["Arial", "Helvetica", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
