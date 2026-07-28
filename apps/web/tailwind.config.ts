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

        // Acento IA (funciones asistidas por LLM: simulador, chatbot) —
        // se usa con moderación para diferenciar lo "inteligente" de lo normativo
        ai: {
          DEFAULT: "#0D9488",
          light: "#E7F8F6",
          dark: "#0B6B62",
        },

        // Tokens shadcn/ui (base-nova) — necesarios para que los primitivos de
        // components/ui/* (button, card, badge, alert, table, tabs...) resuelvan
        // sus utilidades bg-*/text-*/border-* en Tailwind v3. Mapeados sobre la
        // misma paleta anterior para mantener coherencia visual en toda la app.
        background: "#F9FAFB",
        foreground: "#111827",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        accent: {
          DEFAULT: "#EEF3FE",
          foreground: "#1340B0",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        input: "#E5E7EB",
        ring: "#1B4FD8",
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
      boxShadow: {
        xs: "0 1px 2px 0 rgb(16 24 40 / 0.04)",
        card: "0 1px 3px 0 rgb(16 24 40 / 0.06), 0 1px 2px -1px rgb(16 24 40 / 0.04)",
        "card-hover":
          "0 4px 12px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06)",
        dropdown:
          "0 8px 24px -4px rgb(16 24 40 / 0.12), 0 2px 6px -2px rgb(16 24 40 / 0.08)",
        "focus-primary": "0 0 0 3px rgb(27 79 216 / 0.15)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #1B4FD8 0%, #1340B0 100%)",
        "gradient-surface": "linear-gradient(180deg, #FFFFFF 0%, #FAFBFD 100%)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
