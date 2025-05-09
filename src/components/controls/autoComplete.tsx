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
 * @param props.optionsFetcher - 异步加载选项的方法，根据输入框内的label返回对应的options
 */

import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";


interface AutocompleteProps<T extends Record<string, unknown>> extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  initialValue: T;
  setValue: (value: T) => void;
  dataFetcher: () => Promise<T[]>;
  displayField: keyof { [K in keyof T as T[K] extends string ? K : never]: T[K] };
  valueField: keyof { [K in keyof T as T[K] extends string ? K : never]: T[K] };
}

export function Autocomplete<T extends Record<string, unknown>>(props: AutocompleteProps<T>) {
  console.log("props", props);
  const [optionsIsOpen, setOptionsIsOpen] = createSignal(false);
  const [optionsIsLoading, setOptionsIsLoading] = createSignal(false);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>();
  const [isSelecting, setIsSelecting] = createSignal(false);
  const [displayValue, setDisplayValue] = createSignal("");
  // 用于存储输入框值，输入框内容变化时，会重新获取options
  const [searchValue, setSearchValue] = createSignal("");
  const [options, setOptions] = createSignal<T[]>([]);
  const filteredOptions = createMemo(() => {
    const visibleOptions = options();
    if (visibleOptions) {
      return visibleOptions.filter((option) => option[props.displayField]);
    }
    return [];
  });

  // 输入框内容变化时，如果输入事件发生在选择事件期间，则不进行任何操作
  const handleInput = async (value: string) => {
    if (isSelecting()) return;
    setSearchValue(value);
    setOptionsIsOpen(true);
  };

  const handleSelect = (option: T) => {
    setDisplayValue(String(option[props.displayField]));
    props.setValue(option);
    setOptionsIsOpen(false);
  };

  // 处理初始值显示
  createEffect(async () => {
    const initialOptions = await props.dataFetcher();
    setOptions(initialOptions);
    const option = initialOptions.find((option) => String(option[props.valueField]) === props.initialValue[props.valueField]);
    if (option) {
      setDisplayValue(String(option[props.displayField]));
    }
    console.log("initialOptions", initialOptions, option, option?.[props.valueField]);
  });

  onMount(() => {
    // 处理点击外部关闭下拉框
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef() &&
        !dropdownRef()?.contains(event.target as Node) &&
        inputRef() &&
        !inputRef()?.contains(event.target as Node)
      ) {
        setOptionsIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutside);
    });
  });

  return (
    <div class="relative w-full">
      <input
        {...Object.fromEntries(Object.entries(props).filter(([key]) => !["onChange", "optionsFetcher"].includes(key)))}
        value={displayValue()}
        onInput={(e) => handleInput(e.target.value)}
        ref={setInputRef}
        class={`text-accent-color bg-area-color w-full rounded p-3`}
      />
      <Show when={optionsIsOpen() && inputRef()?.value}>
        <div
          ref={setDropdownRef}
          class="Options bg-primary-color shadow-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md py-1 shadow-lg"
        >
          <Show when={!optionsIsLoading()} fallback={<div class="px-4 py-2 text-sm text-gray-500">加载中...</div>}>
            <Show when={options()} fallback={<div class="px-4 py-2 text-sm text-gray-500">没有找到相关选项</div>}>
              <For each={filteredOptions()}>
                {(option) => (
                  <button
                    class="w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                  >
                    {String(option[props.displayField])}
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
