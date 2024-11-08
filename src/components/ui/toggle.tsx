import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "lg";

interface MyButtonProps extends JSX.ButtonHTMLAttributes<HTMLDivElement> {
  size?: Size;
  state?: boolean;
  ref?: (el: HTMLDivElement) => void;
}

const Toggle = (props: MyButtonProps) => {
  const rest = _.omit(props, "size", "state");
  const config = createMemo(() => {
    return {
      sizeClass: {
        sm: "p-0.5",
        md: "p-1",
        lg: "p-2",
      }[props.size ?? "md"],
      disableClass: rest.disabled ? "pointer-events-none opacity-50" : "",
      activedClass: props.state ? "justify-start bg-brand-color-1st" : "justify-end bg-transition-color-20",
    };
  })

  const [defaultBoxClassNames, setDefaultBoxClassNames] = createSignal("");
  const [defaultBallClassNames, setDefaultBallClassNames] = createSignal("");
  let switchRef: HTMLDivElement | undefined;

  createEffect(() => {
    setDefaultBoxClassNames(
      `${config().disableClass} group cursor-pointer w-20 h-fit rounded-full flex flex-none items-center hover:underline ${config().sizeClass} ${config().activedClass} `,
    );
    setDefaultBallClassNames(
      `${config().disableClass} h-[34px] w-[34px] rounded-full bg-primary-color group-hover:scale-110`,
    );
  });

  return (
    <div ref={switchRef} {...rest} class={` ` + rest.class ? defaultBoxClassNames() + rest.class : defaultBoxClassNames()}>
      <div class={defaultBallClassNames()}></div>
    </div>
  );
};

export default Toggle;
