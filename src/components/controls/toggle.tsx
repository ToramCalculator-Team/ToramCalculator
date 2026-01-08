import { createEffect, createMemo, createSignal, JSX } from "solid-js";

type Size = "sm" | "md" | "default" | "lg";

interface SwitchProps extends JSX.HTMLAttributes<HTMLInputElement> {
  name: string;
  size?: Size;
  checked?: boolean;
}

export const Toggle = (props: SwitchProps) => {
  const config = createMemo(() => {
    return {
      sizeClass: {
        sm: {
          thumb: "gap-1 rounded px-4 py-1",
          track: "gap-2 rounded px-4 py-1",
        },
        md: {
          thumb: "gap-2 rounded px-4 py-2",
          track: "gap-2 rounded px-4 py-2",
        },
        default: {
          thumb: "top-1 w-8 h-8 rounded-md bg-primary-color",
          track: "w-20 h-10 p-1 rounded",
        },
        lg: {
          thumb: "gap-3 rounded-lg px-6 py-3",
          track: "gap-3 rounded-lg px-6 py-3",
        },
      }[props.size ?? "default"],
      stateClass: props.checked
        ? {
            thumb: "",
            track: "bg-accent-color text-primary-color justify-end",
          }
        : {
            thumb: "",
            track: "bg-boundary-color text-main-text-color justify-start",
          },
    };
  });

  return (
    <label class={`Track flex items-center cursor-pointer ${config().sizeClass.track} ${config().stateClass.track}`}>
      <div class={`Thumb ${config().sizeClass.thumb} ${config().stateClass.thumb}`}></div>
      <input {...props} type="radio" class="sr-only" />
    </label>
  );
};

