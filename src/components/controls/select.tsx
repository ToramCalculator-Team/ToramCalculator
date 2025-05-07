import { createSignal, For, JSX, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  value: string;
  setValue: (value: string) => void;
  options: SelectOption[];
  optionGenerator?: (index: number, option: SelectOption, selected: boolean, onClick: () => void) => JSX.Element;
  placeholder?: string;
  class?: string;
  disabled?: boolean;
};

export function Select(props: SelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [selectedOption, setSelectedOption] = createSignal<SelectOption | undefined>(
    props.options.find((option) => option.value === props.value),
  );

  const handleSelect = (option: SelectOption) => {
    setSelectedOption(option);
    props.setValue(option.value);
    setIsOpen(false);
  };

  return (
    <div class={`relative ${props.class ?? ""}`}>
      <button
        type="button"
        onClick={() => !props.disabled && setIsOpen(!isOpen())}
        class={`border-dividing-color bg-primary-color text-main-text-color flex w-full items-center justify-between rounded-md border-1 px-3 py-2 ${
          props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <span class="truncate">{selectedOption()?.label ?? props.placeholder ?? "请选择"}</span>
        <svg
          class={`h-4 w-4 transition-transform ${isOpen() ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Presence>
        <Show when={isOpen()}>
          <div class="border-dividing-color bg-primary-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border-1 shadow-lg">
            <For each={props.options}>
              {(option, index) => {
                const selected = option.value === selectedOption()?.value;
                const hasOptionGenerator = props.optionGenerator !== undefined;
                const optionGenerator = hasOptionGenerator ? props.optionGenerator : undefined;
                return optionGenerator ? (
                  optionGenerator(index(), option, selected, () => handleSelect(option))
                ) : (
                  <div
                    class={`hover:bg-area-color cursor-pointer px-3 py-2 ${selected ? "bg-area-color" : ""}`}
                    onClick={(e) => handleSelect(option)}
                  >
                    {option.label}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Presence>
    </div>
  );
}
