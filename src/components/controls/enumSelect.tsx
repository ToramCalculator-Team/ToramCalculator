import { For, JSX } from "solid-js";
import * as Icon from "~/components/icon";
import { Input } from "./input";
import { AnyFieldApi, FieldState } from "@tanstack/solid-form";
import { EnumFieldDetail } from "~/locales/type";

type EnumSelectProps = {
  title: string;
  description: string;
  state: string;
  options: string[];
  field: () => AnyFieldApi;
  dic: EnumFieldDetail<string>["enumMap"];
};

export function EnumSelect(props: EnumSelectProps) {
  let icon: JSX.Element = null;
  return (
    <Input
      title={props.title}
      description={props.description}
      state={props.state}
      class="border-dividing-color bg-primary-color w-full rounded-md border-1"
    >
      <div class="EnumsBox flex flex-wrap gap-1">
        <For each={props.options}>
          {(option) => {
            switch (option) {
              case "None":
              case "Self":
              case "Player":
              case "Enemy":
                icon = <Icon.Filled.Basketball />;
                break;
            }
            return (
              <label
                class={`flex cursor-pointer gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${props.field().state.value === option ? "border-accent-color bg-area-color" : "border-dividing-color opacity-50"}`}
              >
                {icon}
                {props.dic[option]}
                <input
                  id={props.field().name + option}
                  name={props.field().name}
                  value={option}
                  checked={props.field().state.value === option}
                  type="radio"
                  onBlur={props.field().handleBlur}
                  onChange={(e) => props.field().handleChange(e.target.value)}
                  class="mt-0.5 hidden rounded px-4 py-2"
                />
              </label>
            );
          }}
        </For>
      </div>
    </Input>
  );
}
