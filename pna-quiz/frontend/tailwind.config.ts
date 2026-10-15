import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "#0B0F17",
          card: "#131B2B",
          accent: "#1C273C",
        },
        text: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
        },
        brand: {
          indigo: "#4F46E5",
          cobalt: "#2563EB",
        },
        feedback: {
          success: "#10B981",
          danger: "#EF4444",
          alert: "#F59E0B",
        }
      },
    },
  },
  plugins: [],
};
export default config;
