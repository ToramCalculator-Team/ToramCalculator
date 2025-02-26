import { createEffect, createMemo, createSignal, JSX } from "solid-js";
import * as _ from "lodash-es";
import Switch from "./switch";

type Size = "sm" | "md" | "lg";
export type InputComponentType = "text" | "password" | "number" | "boolean" | "checkBox" | "radio";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  title: string;
  description?: string;
  type?: InputComponentType;
  size?: Size;
}

const Input = (props: InputProps) => {
  const config = createMemo(() => {
    return {
      label: props.title,
      description: props.description,
      type: props.type,
      children: props.children,
      sizeClass: {
        sm: "gap-2 rounded px-4 py-3",
        md: "gap-2 rounded-md px-4 py-3",
        default: "gap-3 p-2",
        lg: "gap-2 rounded-lg px-4 py-3",
        xl: "gap-2 rounded-xl px-4 py-3",
      }[props.size ?? "default"],
      disableClass: props.disabled ? "pointer-events-none opacity-50" : "",
    };
  });

  const [defaultInputClassNames, setDefaultInputClassNames] = createSignal(``);

  createEffect(() => {
    setDefaultInputClassNames(`${config().disableClass} flex flex-col ${config().sizeClass} `);
  });

  return (
    <fieldset class="flex flex-1 flex-col items-start p-2 gap-3">
      <span class="leading-none">{config().label}</span>
      {config().description && <span class="text-sm text-main-text-color">{config().description}</span>}
      {config().children}
    </fieldset>
  );
};

export default Input;
