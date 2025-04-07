import { createEffect, createMemo, createSignal, JSX, Match, Show, Switch } from "solid-js";
import * as _ from "lodash-es";
import Toggle from "./toggle";

type Size = "sm" | "md" | "lg";
export type InputComponentType = "text" | "password" | "number" | "boolean" | "checkBox" | "radio";

// class属性将分配值label标签
interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  title: string;
  description?: string;
  type?: InputComponentType;
  size?: Size;
  state?: string | null;
}

const Input = (props: InputProps) => {
  const config = createMemo(() => {
    return {
      description: props.description,
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
    <label class={props.class ? ` flex flex-1 flex-col items-start gap-3 p-2 ` + " " + props.class : ` flex flex-1 flex-col items-start gap-3 p-2 `}>
      <span class="leading-none">
        <span>{props.title}</span>
        &nbsp;&nbsp;
        <span class="text-brand-color-3rd">{props.state}</span>
      </span>
      {config().description && <span class="text-main-text-color text-sm">{config().description}</span>}
      <Show
        when={props.children}
        fallback={
          <Switch fallback={<div>未知类型的输入框</div>}>
            <Match when={props.type === "text"}>
              <input
                {...props}
                class={`w-full text-accent-color bg-area-color rounded p-3`}
              />
            </Match>
            <Match when={props.type === "password"}>
              <input
                {...props}
                class={`w-full text-accent-color bg-area-color rounded p-3`}
              />
            </Match>
            <Match when={props.type === "number"}>
              <input
                {...props}
                class={`w-full text-accent-color bg-area-color rounded p-3`}
              />
            </Match>
          </Switch>
        }
      >
        {config().children}
      </Show>
    </label>
  );
};

export default Input;
