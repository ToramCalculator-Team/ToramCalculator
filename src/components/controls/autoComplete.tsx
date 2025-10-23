/**
 * 自动完成组件
 *
 * 负责对对象字段进行选择
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
import Icons from "~/components/icons/index";
import { DB } from "@db/generated/zod";
import { setStore, store } from "~/store";
import { DATABASE_SCHEMA } from "@db/generated/database-schema";
import { repositoryMethods } from "@db/generated/repository";

interface AutocompleteProps<K extends keyof DB, T extends DB[K], P extends Partial<T>>
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  id: string; // input的唯一name
  initialValue: P; // 实际选中的值
  setValue: (value: P) => void; // 设置当前选中的值
  table: K; // 数据表
  extraLabel?: (value: T) => JSX.Element; // 额外标签
  displayField: keyof { [K in keyof T as T[K] extends string ? K : never]: T[K] }; // 显示字段，作为input的value
  valueMap: (value: T) => P; // 值映射
}

export function Autocomplete<K extends keyof DB, T extends DB[K], P extends Partial<T>>(
  props: AutocompleteProps<K, T, P>,
) {
  const [optionsIsOpen, setOptionsIsOpen] = createSignal(false);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>();

  // 是否处在选择过程中，防止在选择期间输入框内容变化引起搜索
  const [isSelecting, setIsSelecting] = createSignal(false);

  // 是否已选择，用于控制input的边框样式
  const [isSelected, setIsSelected] = createSignal(true);


  // 显示值，作为input的value
  const [inputValue, setInputValue] = createSignal("");
  setInputValue(props.initialValue[props.displayField] as string);

  // 所有可选项
  const [options, { refetch: refetchOptions }] = createResource(async () => {
    const options = await repositoryMethods[props.table].selectAll?.() as T[];
    return options;
  });

  // 根据输入框内容过滤后的可选项
  const filteredOptions = createMemo(() => {
    return options()?.filter((option) => (option[props.displayField] as string).includes(inputValue()));
  });

  createEffect(() => {
    console.log(options());
  });

  // 输入框内容变化时，如果输入事件发生在选择事件期间，则不进行任何操作
  const handleInput = (value: string) => {
    // 如果正在选择，则不进行任何操作
    if (isSelecting()) return;
    // 设置已选择状态
    setIsSelected(false);
    // 更新输入框内容
    setInputValue(value);
    // 打开下拉框
    setOptionsIsOpen(true);
  };

  const handleSelect = (option: T) => {
    // 设置正在选择状态，防止在选择期间输入框内容变化引起搜索
    setIsSelecting(true);
    // 设置输入框内容
    setInputValue(option[props.displayField] as string);
    // 调用父组件的setValue方法，更新表单的值
    props.setValue(props.valueMap(option));
    // 关闭下拉框
    setOptionsIsOpen(false);
    // 设置已选择状态
    setIsSelected(true);
    // 设置正在选择状态结束
    setIsSelecting(false);
  };

  // 详情是否可见
  const [detailVisible, setDetailVisible] = createSignal(false);
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
        {...props}
        id={props.id}
        value={inputValue()}
        onInput={(e) => handleInput(e.target.value)}
        ref={setInputRef}
        autocomplete="off"
        class={`text-accent-color bg-area-color w-full rounded p-3 ${isSelected() ? "" : "outline-brand-color-2nd!"}`}
      />
      <Show when={optionsIsOpen()}>
        <div
          ref={setDropdownRef}
          class="Options bg-primary-color shadow-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md py-1 shadow-lg"
        >
        <For each={filteredOptions()}>
          {(option) => (
            <button
              class="relative flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(option);
              }}
            >
              <span>{option[props.displayField] as string}</span>
              {props.extraLabel?.(option)}
              <div
                class="DetailControlBtn bg-area-color rounded-md p-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDetailVisible((prev) => !prev);
                  const primaryKeys = DATABASE_SCHEMA.tables.find((table) => table.name === props.table)?.primaryKeys;
                  if (!primaryKeys) {
                    return;
                  }
                  setStore("pages", "cardGroup", store.pages.cardGroup.length, {
                    type: props.table,
                    id: option[primaryKeys[0] as keyof T] as string,
                  }); // 基本上用到的表都只有单主键，没有复合主键，所以直接取第一个
                }}
              >
                <Icons.Outline.InfoCircle />
              </div>
            </button>
          )}
        </For>
        </div>
      </Show>
    </div>
  );
}
