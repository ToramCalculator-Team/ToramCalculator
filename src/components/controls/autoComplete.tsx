import { createEffect, createSignal, For, JSX, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Input } from "./input";

interface AutocompleteOption {
  label: string;
  value: string;
}

interface AutocompleteProps {
  title?: string;
  description?: string;
  state: {
    value: string;
    setValue: (value: string) => void;
    error?: string;
  };
  class?: string;
  optionsFetcher: (search: string) => Promise<AutocompleteOption[]>;
}

export function Autocomplete(props: AutocompleteProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [options, setOptions] = createSignal<AutocompleteOption[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>();
  const [displayText, setDisplayText] = createSignal("");

  // 处理点击外部关闭下拉框
  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef() &&
        !dropdownRef()?.contains(event.target as Node) &&
        inputRef() &&
        !inputRef()?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutside);
    });
  });

  // 处理键盘导航
  createEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen()) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, options().length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (selectedIndex() >= 0) {
            const option = options()[selectedIndex()];
            handleSelect(option);
          }
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  const handleInput = async (value: string) => {
    setDisplayText(value);
    setIsLoading(true);
    try {
      const fetchedOptions = await props.optionsFetcher(value);
      setOptions(fetchedOptions);
      setIsOpen(true);
    } catch (error) {
      console.error("Error fetching options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    setDisplayText(option.label);
    props.state.setValue(option.value);
    setIsOpen(false);
  };

  return (
    <div class="relative">
      <Input
        title={props.title ?? ""}
        description={props.description}
        type="text"
        state={props.state.error || null}
        value={displayText()}
        onInput={(e) => handleInput(e.target.value)}
        class={props.class}
        onFocus={() => setIsOpen(true)}
        ref={setInputRef}
      />
      <Show when={isOpen() && displayText().length > 0}>
        <div
          ref={setDropdownRef}
          class="Options bg-primary-color border-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border py-1 shadow-lg"
        >
          <Show when={!isLoading()} fallback={<div class="px-4 py-2 text-sm text-gray-500">加载中...</div>}>
            <Show
              when={options().length > 0}
              fallback={<div class="px-4 py-2 text-sm text-gray-500">没有找到相关选项</div>}
            >
              <For each={options()}>
                {(option, index) => (
                  <button
                    class={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      selectedIndex() === index() ? "bg-gray-100" : ""
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}
