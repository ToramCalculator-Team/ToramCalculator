/**
 * 自动完成组件
 *
 * 这个组件主要用于处理 ID 和显示值的映射关系，通常用在表单中需要选择关联数据的场景。
 * 例如：选择区域时，需要显示区域名称，但实际存储的是区域 ID。
 *
 * 特点：
 * 1. 支持异步加载选项
 * 2. 自动处理 ID 和显示值的转换
 * 3. 支持键盘导航和点击选择
 * 4. 与表单库（如 tanstack/form）完全兼容
 *
 * 使用示例：
 * ```tsx
 * <Autocomplete
 *   value={field().value}                    // 当前选中的值（通常是 ID）
 *   displayValue={field().displayValue}      // 当前显示的值（通常是名称）
 *   setValue={(value) => field().setValue(value)}  // 更新值的方法
 *   optionsFetcher={async (search) => {      // 异步加载选项的方法
 *     const items = await fetchItems(search);
 *     return items.map(item => ({
 *       label: item.name,  // 显示值
 *       value: item.id     // 实际值
 *     }));
 *   }}
 * />
 * ```
 *
 * @param props.value - 当前选中的值（通常是 ID）
 * @param props.displayValue - 当前显示的值（通常是名称）
 * @param props.setValue - 更新值的方法
 * @param props.optionsFetcher - 异步加载选项的方法，返回 Promise<Array<{label: string, value: string}>>
 */

import { createEffect, createSignal, For, JSX, on, onCleanup, onMount, Show } from "solid-js";

interface AutocompleteOption {
  label: string;
  value: string;
}

interface AutocompleteProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  optionsFetcher: (search: string) => Promise<AutocompleteOption[]>;
  displayValue?: string;
  value: string;
  setValue: (value: string) => void;
}

export function Autocomplete(props: AutocompleteProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [options, setOptions] = createSignal<AutocompleteOption[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>();
  const [isSelecting, setIsSelecting] = createSignal(false);
  const [displayValue, setDisplayValue] = createSignal(props.displayValue ?? props.value);

  // 只在组件挂载时和value变化时更新显示值
  createEffect(
    on(
      () => props.value,
      () => console.log(props.value)
      // async (value) => {
      //   // 如果已经有displayValue，直接使用
      //   if (props.displayValue) {
      //     setDisplayValue(props.displayValue);
      //     return;
      //   }
        
      //   // 否则尝试获取对应的label
      //   if (value) {
      //     const options = await props.optionsFetcher(value);
      //     const option = options.find((opt) => opt.value === value);
      //     if (option) {
      //       setDisplayValue(option.label);
      //     }
      //   } else {
      //     setDisplayValue("");
      //   }
      // }
      ,
    )
  );

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

  const handleInput = async (value: string) => {
    if (isSelecting()) return;
    setDisplayValue(value);
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
    setIsSelecting(true);
    setDisplayValue(option.label);
    props.setValue?.(option.value);
    setIsOpen(false);
    inputRef()?.blur();
    setIsSelecting(false);
  };

  onMount(() => {
    console.log(props.value)
  })

  return (
    <div class="relative w-full">
      <input
        {...Object.fromEntries(Object.entries(props).filter(([key]) => !["onChange", "optionsFetcher"].includes(key)))}
        value={displayValue()}
        onInput={(e) => handleInput(e.target.value)}
        onFocus={() => {
          if (inputRef()?.value) {
            setIsOpen(true);
          }
        }}
        ref={setInputRef}
        class={`text-accent-color bg-area-color w-full rounded p-3`}
      />
      <Show when={isOpen() && inputRef()?.value}>
        <div
          ref={setDropdownRef}
          class="Options bg-primary-color shadow-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md py-1 shadow-lg"
        >
          <Show when={!isLoading()} fallback={<div class="px-4 py-2 text-sm text-gray-500">加载中...</div>}>
            <Show
              when={options().length > 0}
              fallback={<div class="px-4 py-2 text-sm text-gray-500">没有找到相关选项</div>}
            >
              <For each={options()}>
                {(option) => (
                  <button
                    class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option);
                    }}
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
