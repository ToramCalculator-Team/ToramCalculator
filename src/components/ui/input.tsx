import { createEffect, createMemo, createSignal, JSX } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "lg";

interface MyInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  icon?: JSX.Element;
  size?: Size;
}

const Input = (props: MyInputProps) => {
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
      disableClass: props.disabled ? "pointer-events-none opacity-50" : "",
    };
  });

  const [defaultInputClassNames, setDefaultInputClassNames] = createSignal(``);

  createEffect(() => {
    setDefaultInputClassNames(
      `${config().disableClass} flex flex-none items-center justify-center bg-area-color hover:outline-2 hover:outline-dividing-color focus-within:bg-primary-color ${config().sizeClass} `,
    );
  });

  return (
    <input
      {...props}
      type={props.type ?? "text"}
      ref={props.ref}
      class={` ` + props.class ? defaultInputClassNames() + props.class : defaultInputClassNames()}
    >
      {config().icon}
      {config().children}
    </input>
  );
};

export default Input;
