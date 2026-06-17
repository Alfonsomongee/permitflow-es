import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4FD8',
          dark:    '#1340B0',
          light:   '#EEF3FE',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger:  '#DC2626',
        neutral: '#6B7280',
        bg:      '#F9FAFB',
        surface: '#FFFFFF',
        border:  '#E5E7EB',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        }
      },
    },
  },
  plugins: [],
};
export default config;
