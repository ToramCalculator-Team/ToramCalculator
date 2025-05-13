import { createSignal, For, JSX, Show, onCleanup, onMount, createResource, createEffect, on } from "solid-js";
import { Presence } from "solid-motionone";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  value: string;
  setValue: (value: string) => void;
  options?: SelectOption[];
  optionsFetcher?: (name: string) => Promise<SelectOption[]>;
  optionGenerator?: (index: number, option: SelectOption, selected: boolean, onClick: () => void) => JSX.Element;
  placeholder?: string;
  class?: string;
  disabled?: boolean;
};

export function Select(props: SelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [selectedOption, setSelectedOption] = createSignal<SelectOption | undefined>(undefined);

  // 初始化时获取选项
  const [initialOptions] = createResource(async () => {
    let options: SelectOption[] = [];
    if (props.optionsFetcher) {
      options = await props.optionsFetcher("");
    } else if (props.options) {
      options = props.options;
    }
    return options;
  });

  // 当初始选项加载完成后，设置选中的选项
  createEffect(
    on(initialOptions, async (options) => {
      console.log("options:====", options);
      if (options) {
        const option = options.find((opt) => opt.value === props.value);
        if (option) {
          setSelectedOption(option);
        }
      }
    }),
  );

  const handleSelect = (option: SelectOption) => {
    setSelectedOption(option);
    props.setValue(option.value);
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".select-container")) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClickOutside);
  });

  return (
    <div class={`select-container relative w-full ${props.class ?? ""}`}>
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
      <Show when={isOpen()}>
        <div class="Options bg-primary-color shadow-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md shadow-lg">
          <Show when={initialOptions.latest?.length}>
            <For each={initialOptions.latest}>
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
          </Show>
        </div>
      </Show>
    </div>
  );
}
