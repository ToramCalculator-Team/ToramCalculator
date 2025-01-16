import { createEffect, createMemo, createSignal, JSX } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "default" | "lg";

interface RadioProps extends JSX.HTMLAttributes<HTMLInputElement> {
  name: string;
  size?: Size;
  checked?: boolean;
  disabled?: boolean;
}

const Radio = (props: RadioProps) => {
  const config = createMemo(() => {
    return {
      sizeClass: {
        sm: {
          text: "",
          iconContainer: "",
        },
        md: {
          text: "",
          iconContainer: "",
        },
        default: {
          text: "p-2 pr-3 gap-3",
          iconContainer: "w-8 h-8 rounded-full p-[2px] border-2 ",
        },
        lg: {
          text: "",
          iconContainer: "",
        },
      }[props.size ?? "default"],
      disableClass: props.disabled ? "pointer-events-none opacity-50" : "",
      stateClass: props.checked
        ? {
            text: "text-accent-color",
            iconContainer: "border-accent-color",
          }
        : {
            text: "text-mainText-color",
            iconContainer: "border-mainText-color text-transparent",
          },
    };
  });

  const [defaultRadioClassNames, setDefaultRadioClassNames] = createSignal({
    text: "",
    iconContainer: "",
  });

  createEffect(() => {
    setDefaultRadioClassNames({
      text: `${config().disableClass} cursor-pointer flex flex-none items-center underline-offset-4 ${props.checked ? "" : ""} hover:underline ${config().sizeClass.text} ${config().stateClass.text} `,
      iconContainer: `${config().disableClass} flex flex items-center justify-center  ${config().sizeClass.iconContainer} ${config().stateClass.iconContainer} `,
    });
  });

  return (
    <label class={defaultRadioClassNames().text}>
      <div class={`IconContainer ${defaultRadioClassNames().iconContainer}`}>
        <div class="Icon bg-current w-full h-full rounded-full"></div>
      </div>
      {props.children}
      <input {...props} type="checkbox" class={"hidden"} />
    </label>
  );
};

export default Radio;
