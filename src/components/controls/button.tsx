import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "lg" | "xl";
type Level = "primary" | "secondary" | "default" | "quaternary";

interface MyButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: JSX.Element;
  size?: Size;
  level?: Level;
  active?: boolean;
}

export const Button = (props: MyButtonProps) => {
  const config = createMemo(() => {
    return {
      icon: props.icon,
      children: props.children,
      sizeClass: {
        sm: "gap-2 rounded px-4 py-3",
        md: "gap-2 rounded-md px-4 py-3",
        default: "gap-2 rounded px-4 py-3",
        lg: "gap-2 rounded-lg px-4 py-3",
        xl: "gap-2 rounded-xl px-4 py-3",
      }[props.size ?? "default"],
      levelClass: {
        primary: `bg-accent-color text-primary-color hover:bg-accent-color-0`,
        secondary: `bg-primary-color hover:bg-accent-color hover:text-primary-color`,
        default: props.active
          ? `bg-accent-color text-primary-color`
          : `bg-area-color hover:bg-dividing-color active:bg-accent-color active:text-primary-color`,
        quaternary: props.active
        ? `bg-accent-color text-primary-color`
        : `bg-transparent hover:bg-area-color`,
      }[props.level ?? "default"],
      disableClass: props.disabled ? "pointer-events-none opacity-50" : "",
    };
  });

  const [defaultButtonClassNames, setDefaultButtonClassNames] = createSignal(``);

  createEffect(() => {
    setDefaultButtonClassNames(
      `${config().disableClass} cursor-pointer flex items-center justify-center underline-offset-4 hover:underline ${config().sizeClass} ${config().levelClass}`,
    );
  });

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      class={` ` + props.class ? defaultButtonClassNames() + " " + props.class : defaultButtonClassNames()}
    >
      {config().icon}
      {config().children}
    </button>
  );
};
