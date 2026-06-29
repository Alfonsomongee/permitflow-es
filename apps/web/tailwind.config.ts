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
        // Marca principal
        primary: {
          DEFAULT: "#1B4FD8",
          dark: "#1340B0",
          light: "#EEF3FE",
        },
        // Estados semánticos
        success: {
          DEFAULT: "#16A34A",
          light: "#EAF3DE",
          dark: "#3B6D11",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FAEEDA",
          dark: "#633806",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FCEBEB",
          dark: "#791F1F",
        },
        // Plataformas de tramitación
        plataforma: {
          pues: {
            bg: "#EEF3FE",
            text: "#1340B0",
            border: "#B5D4F4",
          },
          teci: {
            bg: "#EEEDFE",
            text: "#3C3489",
            border: "#AFA9EC",
          },
          miteco: {
            bg: "#E1F5EE",
            text: "#085041",
            border: "#5DCAA5",
          },
        },
        // Superficie y texto (usados como alias semánticos)
        neutral: "#6B7280",
        bg: "#F9FAFB",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["GeistMono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [],
};

export default config;
