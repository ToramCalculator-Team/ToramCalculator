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
        80: {
          DEFAULT: "rgb(var(--primary) / .8)",
        },
        70: {
          DEFAULT: "rgb(var(--primary) / .7)",
        },
        60: {
          DEFAULT: "rgb(var(--primary) / .6)",
        },
        50: {
          DEFAULT: "rgb(var(--primary) / .5)",
        },
        40: {
          DEFAULT: "rgb(var(--primary) / .4)",
        },
        30: {
          DEFAULT: "rgb(var(--primary) / .3)",
        },
        20: {
          DEFAULT: "rgb(var(--primary) / .2)",
        },
        10: {
          DEFAULT: "rgb(var(--primary) / .1)",
        },
        0: {
          DEFAULT: "rgb(var(--primary) / 0)",
        },
      },
      "accent-color": {
        DEFAULT: "rgb(var(--accent) / <alpha-value>)",
        90: {
          DEFAULT: "rgb(var(--accent) / .9)",
        },
        80: {
          DEFAULT: "rgb(var(--accent) / .8)",
        },
        70: {
          DEFAULT: "rgb(var(--accent) / .7)",
        },
        60: {
          DEFAULT: "rgb(var(--accent) / .6)",
        },
        50: {
          DEFAULT: "rgb(var(--accent) / .5)",
        },
        40: {
          DEFAULT: "rgb(var(--accent) / .4)",
        },
        30: {
          DEFAULT: "rgb(var(--accent) / .3)",
        },
        20: {
          DEFAULT: "rgb(var(--accent) / .2)",
        },
        10: {
          DEFAULT: "rgb(var(--accent) / .1)",
        },
        0: {
          DEFAULT: "rgb(var(--accent) / 0)",
        },
      },
      "transition-color": {
        DEFAULT: "rgb(var(--transition) / <alpha-value>)",
        20: {
          DEFAULT: "rgb(var(--transition) / .2)",
        },
        8: {
          DEFAULT: "rgb(var(--transition) / .08)",
        },
      },
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
