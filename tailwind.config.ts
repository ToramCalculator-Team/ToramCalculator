import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./src/**/*.tsx"],
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
      "water": "rgb(var(--water) / <alpha-value>)",
      "fire": "rgb(var(--fire) / <alpha-value>)",
      "earth": "rgb(var(--earth) / <alpha-value>)",
      "wind": "rgb(var(--wind) / <alpha-value>)",
      "light": "rgb(var(--light) / <alpha-value>)",
      "dark": "rgb(var(--dark) / <alpha-value>)",
    },
    borderRadius: {
      none: "0px",
      sm: "0.25rem",
      DEFAULT: "0.5rem",
      md: "0.75rem",
      lg: "1rem",
      xl: "1.5rem",
      "2xl": "2rem",
      "3xl": "3rem",
      full: "9999px",
    },
    extend: {
      maxWidth: {
        "8xl": "96rem",
      },
      height: {
        line: "1px",
      },
      borderWidth: {
        "1.5": "1.5px",
      },
      visible: {
        invisible: "hidden",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "up": {
          "0%": {
            transform: "translateY(20px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0px)",
            opacity: "1",
          },
        }
      },
      animation: {
        "up": "up 0.3s ease-in-out forwards",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
