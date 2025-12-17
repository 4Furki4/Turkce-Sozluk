const { heroui } = require("@heroui/react");
/** @type {import('tailwindcss').Config} */


module.exports = ({
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: ["hidden"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "xl": "1280px",
      },
    },

    extend: {
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      fontSize: {
        "fs--2": "var(--step--2)",
        "fs--1": "var(--step--1)",
        "fs-0": "var(--step-0)",
        "fs-1": "var(--step-1)",
        "fs-2": "var(--step-2)",
        "fs-3": "var(--step-3)",
        "fs-4": "var(--step-4)",
        "fs-5": "var(--step-5)",
        "fs-6": "var(--step-6)",
        "fs-7": "var(--step-7)",
        "fs-8": "var(--step-8)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    heroui({
      prefix: "heroui-",
      layout: {
        radius: {
          small: "calc(var(--radius) - 6px)",
          medium: "calc(var(--radius) - 4px)",
          large: "var(--radius)",
        },
      },
      themes: {
        light: {
          colors: {
            background: "#FFFFFF", // Pure white for crisp reading
            foreground: "#09090b", // Almost black, easier on eyes than #000
            primary: {
              DEFAULT: "#a91101",
              50: '#fff1f1', // Lighter, pinkish for very subtle bg
              100: '#ffdfdf',
              200: '#ffc5c5',
              300: '#ff9d9d',
              400: '#ff6464',
              500: '#f83b3b',
              600: '#e52222',
              700: '#c21515',
              800: '#a91101', // Your Target Red
              900: '#8c1313',
              foreground: "#FFFFFF",
            },
            // Switched to Slate (Neutral Cool Gray) - Professional & Clean
            secondary: {
              DEFAULT: "#f4f4f5",
              50: '#f8fafc',
              100: '#f1f5f9',
              200: '#e2e8f0',
              300: '#cbd5e1',
              400: '#94a3b8',
              500: '#64748b',
              600: '#475569',
              700: '#334155',
              800: '#1e293b',
              900: '#0f172a',
              foreground: "#0f172a",
            },
            focus: "#a91101",
          },
        },
        dark: {
          colors: {
            background: "#09090b", // Deep Zinc (Neutral Black), NOT Red-Black
            foreground: "#fafafa",
            primary: {
              DEFAULT: "#a91101",
              50: '#2f0505',
              100: '#5a0a0a',
              200: '#800e0e',
              300: '#a91101', // Your Target Red
              400: '#d92626',
              500: '#f83b3b',
              600: '#ff6464',
              700: '#ff9d9d',
              800: '#ffc5c5',
              900: '#ffe5e2',
              foreground: "#FFFFFF",
            },
            // Dark Mode Secondary: Dark Slate
            secondary: {
              DEFAULT: "#27272a",
              50: '#0f172a',
              100: '#1e293b',
              200: '#334155',
              300: '#475569',
              400: '#64748b',
              500: '#94a3b8',
              600: '#cbd5e1',
              700: '#e2e8f0',
              800: '#f1f5f9',
              900: '#f8fafc',
              foreground: "#FFFFFF",
            },
            focus: "#a91101",
          },
        },
      }
    }),
  ],
});
