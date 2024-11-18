import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      "primary-color": {
        DEFAULT: "rgb(var(--primary) / <alpha-value>)",
        90: {
          DEFAULT: "rgb(var(--primary) / .9)",
        },
       
        30: {
          DEFAULT: "rgb(var(--primary) / .3)",
        },
        10: {
          DEFAULT: "rgb(var(--primary) / .1)",
        },
        0: {
          DEFAULT: "rgb(var(--primary) / 0)",
        },
      },
      "accent-color": "rgb(var(--accent) / 1)",
      "mainText-color": "rgb(var(--accent) / 0.7)",
      "boundary-color": "rgb(var(--accent) / 0.55)",
      "area-color": "rgb(var(--transition) / .08)",
      "dividing-color": "rgb(var(--transition) / .2)",
      "brand-color-1st": "rgb(var(--brand-1st) / <alpha-value>)",
      "brand-color-2nd": "rgb(var(--brand-2nd) / <alpha-value>)",
      "brand-color-3rd": "rgb(var(--brand-3rd) / <alpha-value>)",
      "brand-color-4th": "rgb(var(--brand-4th) / <alpha-value>)",
      water: "rgb(var(--water) / <alpha-value>)",
      fire: "rgb(var(--fire) / <alpha-value>)",
      earth: "rgb(var(--earth) / <alpha-value>)",
      wind: "rgb(var(--wind) / <alpha-value>)",
      light: "rgb(var(--light) / <alpha-value>)",
      dark: "rgb(var(--dark) / <alpha-value>)",
    },
    borderRadius: {
      DEFAULT: "var(--radius)",
      xl: "calc(var(--radius) + 8px)",
      lg: "calc(var(--radius) + 4px)",
      md: "calc(var(--radius) - 2px)",
      sm: "calc(var(--radius) - 4px)",
      none: "0px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      backgroundImage: {
        aeskl: "url('/app-image/bg.jpg')",
        // gradient: "linear-gradient(180deg, rgb(var(--accent) 0%, rgb(var(--accent)) 100%)",
      },
      boxShadowColor: {
        DEFAULT: "rgb(var(--transition) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 4px 4px 0, 0 4px 16px 0",
      }
    },
  },
  plugins: [typography],
} satisfies Config;
