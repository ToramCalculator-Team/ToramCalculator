import { createEffect, createSignal, JSX, onMount } from "solid-js";

type Size = "sm" | "md" | "lg";

interface MyButtonProps extends JSX.ButtonHTMLAttributes<HTMLDivElement> {
  size?: Size;
  state?: boolean;
  ref?: (el: HTMLDivElement) => void;
}

const Toggle = (props: MyButtonProps) => {
  const { size, state, ...rest } = props;
  const sizeClass = {
    sm: "p-0.5",
    md: "p-1",
    lg: "p-2",
  }[size ?? "md"];
  const [disableClass, setDisableClass] = createSignal("");
  const [activedClass, setActivedClass] = createSignal("");
  const [defaultBoxClassNames, setDefaultBoxClassNames] = createSignal("");
  const [defaultBallClassNames, setDefaultBallClassNames] = createSignal("");
  let switchRef: HTMLDivElement | undefined;

  createEffect(() => {
    setDisableClass(rest.disabled ? "pointer-events-none opacity-50" : "");
    setActivedClass(props.state ? "justify-start bg-brand-color-1st" : "justify-end bg-transition-color-20");
    setDefaultBoxClassNames(
      `${disableClass()} group cursor-pointer w-20 rounded-full flex flex-none items-center hover:underline ${sizeClass} ${activedClass()} `,
    );
    setDefaultBallClassNames(
      `${disableClass()} h-[34px] w-[34px] rounded-full bg-primary-color group-hover:scale-110`,
    );
  });

  return (
    <div ref={switchRef} {...rest} class={` ` + rest.class ? defaultBoxClassNames() + rest.class : defaultBoxClassNames()}>
      <div class={defaultBallClassNames()}></div>
    </div>
  );
};

export default Toggle;
