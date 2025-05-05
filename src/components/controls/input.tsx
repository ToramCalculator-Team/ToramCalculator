import { createEffect, createMemo, createSignal, JSX, Match, Show, Switch } from "solid-js";
import * as _ from "lodash-es";
import { Toggle } from "./toggle";

type Size = "sm" | "md" | "lg";
export type InputComponentType = "text" | "password" | "number" | "boolean" | "checkBox" | "radio";

// class属性将分配值label标签
interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  title?: string;
  description?: string;
  type?: InputComponentType;
  size?: Size;
  state?: string | null;
  inputWidth?: number;
}

export const Input = (props: InputProps) => {
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
    <label
      class={
        props.class
          ? `flex flex-1 flex-col items-start gap-2 p-2 ` + " " + props.class
          : `flex flex-1 flex-col items-start gap-2 p-2`
      }
    >
      <Show when={props.title}>
        <div class="flex flex-col">
          <span class="p-1">
            <span>{props.title}</span>
            &nbsp;&nbsp;
            <span class="text-brand-color-3rd">{props.state}</span>
          </span>
          <Show when={props.description}>
            {config().description && <span class="text-main-text-color p-1 text-sm">{config().description}</span>}
          </Show>
        </div>
      </Show>
      <Show
        when={props.children}
        fallback={
          <Switch fallback={<div>未知类型的输入框</div>}>
            <Match when={props.type === "text"}>
              <input
                {...props}
                class={`text-accent-color bg-area-color w-full rounded p-3`}
                style={{
                  width: props.inputWidth + "px",
                }}
              />
            </Match>
            <Match when={props.type === "password"}>
              <input
                {...props}
                class={`text-accent-color bg-area-color w-full rounded p-3`}
                style={{
                  width: props.inputWidth + "px",
                }}
              />
            </Match>
            <Match when={props.type === "number"}>
              <input
                {...props}
                class={`text-accent-color bg-area-color w-full rounded p-3`}
                style={{
                  width: props.inputWidth + "px",
                }}
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
