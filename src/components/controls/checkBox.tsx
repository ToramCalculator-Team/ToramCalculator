import { createEffect, createMemo, createSignal, JSX } from "solid-js";
import * as _ from "lodash-es";

type Size = "sm" | "md" | "default" | "lg";

interface CheckBoxProps extends JSX.HTMLAttributes<HTMLInputElement> {
  name: string;
  size?: Size;
  checked?: boolean;
  disabled?: boolean;
}

const CheckBox = (props: CheckBoxProps) => {
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
          text: "p-2 pr-3 gap-3 rounded",
          iconContainer: "w-8 h-8 rounded-md",
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
            iconContainer: "bg-accent-color text-primary-color",
          }
        : {
            text: "text-main-text-color",
            iconContainer: "bg-primary-color text-transparent border-2 border-main-text-color",
          },
    };
  });

  const [defaultCheckBoxClassNames, setDefaultCheckBoxClassNames] = createSignal({
    text: "",
    iconContainer: "",
  });

  createEffect(() => {
    setDefaultCheckBoxClassNames({
      text: `${config().disableClass} cursor-pointer flex flex-none items-center underline-offset-4 ${props.checked ? "" : ""} hover:underline ${config().sizeClass.text} ${config().stateClass.text} `,
      iconContainer: `${config().disableClass} flex flex items-center justify-center  ${config().sizeClass.iconContainer} ${config().stateClass.iconContainer} `,
    });
  });

  return (
    <label class={defaultCheckBoxClassNames().text}>
      <div class={`IconContainer ${defaultCheckBoxClassNames().iconContainer}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="9" viewBox="0 0 12 9" fill="none">
          <path
            d="M1.5 4.5L4.5 7.5L10.5 1.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      {props.children}
      <input {...props} type="checkbox" class={"hidden"} />
    </label>
  );
};

export default CheckBox;
