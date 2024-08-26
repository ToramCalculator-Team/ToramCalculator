import { createEffect, createSignal, JSX } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "lg";
type Level = "primary" | "secondary" | "tertiary" | "quaternary";

interface MyButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: JSX.Element;
  icon?: JSX.Element;
  size?: Size;
  level?: Level;
  active?: boolean;
  ref?: (el: HTMLButtonElement) => void;
}

const Button = (props: MyButtonProps) => {
  const rest  = _.omit(props,"children", "icon", "size", "level", "active");
  const [iconNode, setIconNode] = createSignal<JSX.Element | null>(null);
  const [childrenNode, setChildrenNode] = createSignal<JSX.Element | null>(null);
  const [sizeClass, setSizeClass] = createSignal("");
  const [levelClass, setLevelClass] = createSignal("");
  const [disableClass, setDisableClass] = createSignal("");
  const [activedClass, setActivedClass] = createSignal("");
  const [defaultButtonClassNames, setDefaultButtonClassNames] = createSignal("");

  let buttonRef: HTMLButtonElement | undefined;

  createEffect(() => {
    setIconNode(props.icon);
    setChildrenNode(props.children);
    setSizeClass(
      {
        sm: "gap-1 rounded px-4 py-1",
        md: "gap-2 rounded px-4 py-2",
        lg: "gap-3 rounded-lg px-6 py-3",
      }[props.size ?? "md"],
    );
    setLevelClass(
      {
        primary: "border-1.5 border-transparent bg-accent-color text-primary-color hover:bg-accent-color-80",
        secondary: "border-1.5 border-accent-color-30 bg-primary-color hover:bg-accent-color hover:text-primary-color",
        tertiary: "border-1.5 border-transparent bg-transition-color-8 hover:bg-transition-color-20",
        quaternary: "border-1.5 border-transparent bg-transparent hover:bg-transition-color-20",
      }[props.level ?? "secondary"],
    );
    setDisableClass(props.disabled ? "pointer-events-none opacity-50" : "");
    setActivedClass(props.active ? "outline-2 outline-brand-color-1st" : "");
    setDefaultButtonClassNames(
      `${disableClass()} cursor-pointer flex flex-none items-center justify-center underline-offset-4 hover:underline ${sizeClass()} ${levelClass()} ${activedClass()} `,
    );
  });

  return (
    <button
      ref={buttonRef}
      {...rest}
      class={` ` + rest.class ? defaultButtonClassNames() + rest.class : defaultButtonClassNames()}
    >
      {iconNode()}
      {childrenNode()}
    </button>
  );
};

export default Button;
