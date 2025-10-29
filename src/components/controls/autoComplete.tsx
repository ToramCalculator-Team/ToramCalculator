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
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import { Button } from "./button";

interface AutocompleteProps<K extends keyof DB, T extends DB[K], P extends Partial<T>>
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  id: string; // input的唯一name
  initialValue: P; // 实际选中的值
  setValue: (value: P) => void; // 设置当前选中的值
  table: K; // 数据表
  extraLabel?: (value: T) => JSX.Element; // 额外标签
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

  // 动态确定的显示字段
  const [displayField, setDisplayField] = createSignal<keyof DB[K]>("id" as keyof DB[K]);

  // 缓存主键字段，避免重复查找
  const primaryKeys = createMemo(() => getPrimaryKeys(props.table));

  // 显示值，作为input的value
  const [inputValue, setInputValue] = createSignal("");

  // 所有可选项
  const [options, { refetch: refetchOptions }] = createResource(async () => {
    console.log("Autocomplete refetchOptions", props.table, repositoryMethods[props.table]);
    const options = (await repositoryMethods[props.table].selectAll?.()) as T[];

    // 动态确定显示字段（只在第一次获取时确定）
    if (options && options.length > 0 && displayField() === "id") {
      const typeObj = options[0];
      let detectedField: keyof DB[K];
      if ("name" in typeObj && typeof typeObj.name === "string") {
        detectedField = "name" as keyof DB[K];
      } else {
        detectedField = "id" as keyof DB[K];
      }
      setDisplayField(() => detectedField);

      // 设置初始显示值
      if (props.initialValue && props.initialValue[detectedField as keyof P]) {
        setInputValue(props.initialValue[detectedField as keyof P] as string);
      }
    }

    return options;
  });

  // 根据输入框内容过滤后的可选项
  const filteredOptions = createMemo(() => {
    const currentOptions = options();
    const currentDisplayField = displayField();
    const currentInputValue = inputValue();

    if (!currentOptions || currentOptions.length === 0) {
      return [];
    }

    // 如果没有输入值，返回所有选项
    if (!currentInputValue || currentInputValue.trim() === "") {
      return currentOptions;
    }

    // 预计算小写的搜索值，避免重复计算
    const searchValue = currentInputValue.toLowerCase();

    return currentOptions.filter((option) => {
      const fieldValue = option[currentDisplayField as keyof T];

      return String(fieldValue).toLowerCase().includes(searchValue);
    });
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
    setInputValue(option[displayField() as keyof T] as string);
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
                class="relative flex w-full items-center px-4 py-2 text-left hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(option);
                  console.log(props.table, option, getPrimaryKeys(props.table));
                }}
              >
                <span class="w-full">{option[displayField() as keyof T] as string}</span>
                {props.extraLabel?.(option)}
                <Button
                  class="Edit bg-area-color rounded-md p-1"
                  level="quaternary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Icons.Outline.InfoCircle />
                </Button>
                <Button
                  class="DetailControlBtn bg-area-color rounded-md p-1"
                  level="quaternary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDetailVisible((prev) => !prev);
                    const currentPrimary = primaryKeys();
                    if (!currentPrimary) {
                      return;
                    }
                    console.log(currentPrimary);
                    setStore("pages", "cardGroup", store.pages.cardGroup.length, {
                      type: props.table,
                      id: String(currentPrimary),
                    }); // 基本上用到的表都只有单主键，没有复合主键，所以直接取第一个
                  }}
                >
                  <Icons.Outline.InfoCircle />
                </Button>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
