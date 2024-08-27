import { createEffect, createMemo, createSignal, JSX } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "lg";
type Level = "primary" | "secondary" | "tertiary" | "quaternary";

interface MyButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: JSX.Element;
  size?: Size;
  state?: boolean;
  ref?: (el: HTMLButtonElement) => void;
}

const CheckBox = (props: MyButtonProps) => {
  const rest = _.omit(props, "children", "icon", "size", "level", "state");
  const config = createMemo(() => {
    return {
      children: props.children,
      sizeClass: {
        sm: "gap-1 rounded px-4 py-1",
        md: "gap-2 rounded px-4 py-2",
        lg: "gap-3 rounded-lg px-6 py-3",
      }[props.size ?? "md"],
      state: props.state,
      disableClass: props.disabled ? "pointer-events-none opacity-50" : "",
      stateClass: props.state ? "outline-brand-color-1st" : "outline-transition-color-20 text-accent-color-70",
    };
  });

  const [defaultButtonClassNames, setDefaultButtonClassNames] = createSignal(
    `${config().disableClass} cursor-pointer flex flex-none items-center justify-center underline-offset-4 outline-2 hover:underline ${config().sizeClass} ${config().stateClass} `,
  );

  createEffect(() => {
    setDefaultButtonClassNames(
      `${config().disableClass} cursor-pointer flex flex-none items-center justify-center underline-offset-4 outline-2 hover:underline ${config().sizeClass} ${config().stateClass} `,
    );
  });

  let buttonRef: HTMLButtonElement | undefined;

  return (
    <button
      ref={buttonRef}
      {...rest}
      class={` ` + rest.class ? defaultButtonClassNames() + rest.class : defaultButtonClassNames()}
    >
      {config().children}
    </button>
  );
};

export default CheckBox;
