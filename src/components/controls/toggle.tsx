import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "lg";

interface MyToggleProps extends JSX.ButtonHTMLAttributes<HTMLDivElement> {
  size?: Size;
  state?: boolean;
  ref?: (el: HTMLDivElement) => void;
}

const Toggle = (props: MyToggleProps) => {
  const rest = _.omit(props, "size", "state");
  const config = createMemo(() => {
    return {
      sizeClass: {
        sm: "p-0.5",
        md: "p-1",
        lg: "p-2",
      }[props.size ?? "md"],
      disableClass: rest.disabled ? "pointer-events-none opacity-50" : "",
      activedClass: props.state ? "justify-start bg-brand-color-1st" : "justify-end bg-dividing-color",
    };
  });

  const [defaultToggleClassNames, setDefaultToggleClassNames] = createSignal("");
  const [defaultThumbClassNames, setDefaultThumbClassNames] = createSignal("");
  let switchRef: HTMLDivElement | undefined;

  createEffect(() => {
    setDefaultToggleClassNames(
      `${config().disableClass} group cursor-pointer w-20 h-fit rounded-full flex flex-none items-center hover:underline ${config().sizeClass} ${config().activedClass} `,
    );
    setDefaultThumbClassNames(
      `${config().disableClass} h-[34px] w-[34px] rounded-full bg-primary-color group-hover:scale-110`,
    );
  });

  return (
    <div
      tabIndex={0}
      role="switch"
      onKeyDown={(e) => e.key === "Enter" && switchRef?.click()}
      ref={switchRef}
      {...rest}
      class={` ` + rest.class ? defaultToggleClassNames() + rest.class : defaultToggleClassNames()}
    >
      <div class={defaultThumbClassNames()}></div>
    </div>
  );
};

export default Toggle;
