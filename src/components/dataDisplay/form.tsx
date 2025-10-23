// 由于DeepKeys<T>与for方法的遍历结果不一致，目前存在许多ts问题，但是不影响实际使用，暂时忽略

import { selectZoneById } from "@db/generated/repository/zone";
import { AnyFieldApi, createForm, DeepKeys, DeepValue, Field } from "@tanstack/solid-form";
import { Show, For, Accessor, createMemo, Index } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { ZodEnum, ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Toggle } from "~/components/controls/toggle";
import { getZodType } from "~/lib/utils/zodTools";
import { getDictionary } from "~/locales/i18n";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { store } from "~/store";



console.log(await selectZoneById("defaultZoneId"))

export const Form = <T extends Record<string, unknown>>(props: {
  initialValue: T;
  dataSchema: ZodObject<{ [K in keyof T]: ZodType }>;
  dictionary: Dic<T>;
  hiddenFields?: Array<keyof T>;
  fieldGroupMap: Record<string, Array<keyof T>>;
  fieldGenerator?: Partial<{
    [K in keyof T]: (
      field: Accessor<AnyFieldApi>,
      dictionary: Dic<T>,
      dataSchema: ZodObject<Record<keyof T, ZodType>>,
    ) => JSX.Element;
  }>;
  onSubmit?: (values: T) => void;
}) => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const form = createForm(() => ({
    defaultValues: props.initialValue,
    onSubmit: async ({ value: newValues }) => {
      console.log("提交内容：", newValues);
      props.onSubmit?.(newValues);
    },
  }));

  const fieldGropuGenerator = (fieldGroup: Array<keyof T>) => (
    <For each={fieldGroup}>
      {(key) => {
        if (props.hiddenFields?.includes(key)) return null;
        const schemaFieldVlaue = props.dataSchema?.shape[key];
        const fieldGenerator = props.fieldGenerator?.[key];
        const hasGenerator = !!fieldGenerator;

        // 处理嵌套结构
        switch (schemaFieldVlaue.type) {
          case "array": {
            return (
              <form.Field
                name={key} // 数组名是DeepKeys<T>类型
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: props.dataSchema.shape[key],
                }}
              >
                {(field) => {
                  // 一般数组对象字段会单独处理，如果这里被调用，说明是简单的字符串数组
                  const arrayValue = () => field().state.value as string[];
                  return (
                    <Input
                      title={field().name}
                      description={""}
                      state={fieldInfo(field())}
                      class={`border-dividing-color bg-primary-color w-full rounded-md border`}
                    >
                      <div class="ArrayBox flex w-full flex-col gap-2">
                        <Index each={arrayValue()}>
                          {(item, index) => (
                            <div class="flex items-center gap-2">
                              <div class="flex-1">
                                <Input
                                  type="text"
                                  value={item()}
                                  onChange={(e) => {
                                    field().replaceValue(index, e.target.value);
                                  }}
                                  class="w-full p-0!"
                                />
                              </div>
                              <Button
                                onClick={(e) => {
                                  field().removeValue(index);
                                  e.stopPropagation();
                                }}
                              >
                                -
                              </Button>
                            </div>
                          )}
                        </Index>
                        <Button
                          onClick={(e) => {
                            field().pushValue("");
                          }}
                          class="w-full"
                        >
                          +
                        </Button>
                      </div>
                    </Input>
                  );
                }}
              </form.Field>
            );
          }
          default: {
            const safeKey = key as DeepKeys<T>;
            return (
              <form.Field
                name={safeKey}
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: props.dataSchema.shape[key],
                }}
              >
                {(field) => {
                  if (hasGenerator) {
                    return fieldGenerator(field, props.dictionary, props.dataSchema);
                  } else {
                    return <FieldRenderer field={field} dictionary={props.dictionary} dataSchema={props.dataSchema} />;
                  }
                }}
              </form.Field>
            );
          }
        }
      }}
    </For>
  );

  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{props.dictionary.selfName ?? "字典中没有找到表名"}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <Show when={"fieldGroupMap" in props} fallback={fieldGropuGenerator(Object.keys(props.initialValue))}>
          <For
            each={Object.entries(props.fieldGroupMap).filter(([_, keys]) =>
              keys.some((key) => !props.hiddenFields?.includes(key)),
            )}
          >
            {([groupName, keys]) => (
              <section class="FieldGroup flex w-full flex-col gap-2">
                <h3 class="text-accent-color flex items-center gap-2 font-bold">
                  {groupName}
                  <div class="Divider bg-dividing-color h-px w-full flex-1" />
                </h3>
                <div class="Content flex flex-col gap-3">{fieldGropuGenerator(keys)}</div>
              </section>
            )}
          </For>
        </Show>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <div class="flex items-center gap-1">
                <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                  {state().isSubmitting
                    ? "..."
                    : props.initialValue
                      ? dictionary().ui.actions.update
                      : dictionary().ui.actions.add}
                </Button>
              </div>
            );
          }}
        />
      </form>
    </div>
  );
};

// 简化后的表单字段
export type SimplifiedFieldApi<T extends Record<string, unknown>, K extends DeepKeys<T> = DeepKeys<T>> = {
  name: string;
  setValue: (value: DeepValue<T, K>) => void;
  handleChange: (value: DeepValue<T, K>) => void;
  handleBlur: () => void;
  state: {
    value: DeepValue<T, K>;
    meta: {
      isTouched: boolean;
      isValidating: boolean;
      errors: any[];
    };
  };
};

// 获取表单字段的错误信息
// export function fieldInfo<T extends Record<string, unknown>, K extends DeepKeys<T>>(field: SimplifiedFieldApi<T, K>): string {
export function fieldInfo(field: AnyFieldApi): string {
  if (!field.state.meta) {
    return "";
  }
  const errors =
    field.state.meta.isTouched && field.state.meta.errors?.length ? field.state.meta.errors.join(",") : null;
  const isValidating = field.state.meta.isValidating ? "..." : null;
  if (errors) {
    console.log(field.state.meta.errors);
    return errors;
  }
  if (isValidating) {
    return isValidating;
  }
  return "";
}

// 工具：根据值类型选择字段组件
export function FieldRenderer<T extends Record<string, unknown>>(props: {
  field: Accessor<AnyFieldApi>;
  dictionary: Dic<T>;
  dataSchema: ZodObject<Record<keyof T, ZodType>>;
}) {
  // 获取字段名
  const fieldName = props.field().name;
  let inputTitle = String(fieldName);
  let inputDescription = "";
  try {
    inputTitle = props.dictionary.fields[fieldName].key;
    inputDescription = props.dictionary.fields[fieldName].formFieldDescription;
    // console.log("key", fieldName, "inputTitle", inputTitle);
  } catch (error) {
    console.log("字典中不存在字段：", fieldName);
  }
  const fieldCalss = `border-dividing-color bg-primary-color rounded-md border w-full`;

  switch (props.dataSchema.shape[fieldName].type) {
    case "enum": {
      return (
        <Input title={inputTitle} description={inputDescription} state={fieldInfo(props.field())} class={fieldCalss}>
          <EnumSelect
            value={props.field().state.value as string}
            setValue={(value) => props.field().setValue(value as DeepValue<T, DeepKeys<T>>)}
            options={(props.dataSchema.shape[fieldName] as ZodEnum<any>).options.map((i) => i.toString())}
            dic={(props.dictionary.fields[fieldName] as EnumFieldDetail<string>).enumMap}
            field={{
              id: props.field().name,
              name: props.field().name,
            }}
          />
        </Input>
      );
    }

    case "number": {
      return (
        <Input
          title={inputTitle}
          description={inputDescription}
          autocomplete="off"
          type="text"
          id={props.field().name}
          name={props.field().name}
          value={props.field().state.value as number}
          onBlur={props.field().handleBlur}
          onChange={(e) => props.field().handleChange(e.target.value)}
          state={fieldInfo(props.field())}
          class={fieldCalss}
        />
      );
    }

    case "array": {
      throw new Error("array type is not supported");
    }

    case "object": {
      throw new Error("object type is not supported");
    }

    case "lazy": {
      return (
        <Input
          title={inputTitle}
          description={inputDescription}
          autocomplete="off"
          type="text"
          id={props.field().name}
          name={props.field().name}
          value={props.field().state.value as string}
          onBlur={props.field().handleBlur}
          onChange={(e) => {
            const target = e.target;
            props.field().handleChange(target.value as DeepValue<T, DeepKeys<T>>);
          }}
          state={fieldInfo(props.field())}
          class={fieldCalss}
        >
          "逻辑编辑器，暂未处理"
        </Input>
      );
    }

    case "boolean": {
      return (
        <Input title={inputTitle} description={inputDescription} state={fieldInfo(props.field())} class={fieldCalss}>
          <Toggle
            id={props.field().name}
            onClick={() => {
              props.field().setValue(!props.field().state.value as DeepValue<T, DeepKeys<T>>);
            }}
            onBlur={props.field().handleBlur}
            name={props.field().name}
            checked={props.field().state.value as boolean}
          />
        </Input>
      );
    }

    // 字符串输入
    default: {
      return (
        <Input
          title={inputTitle}
          description={inputDescription}
          autocomplete="off"
          type="text"
          id={props.field().name}
          name={props.field().name}
          value={props.field().state.value as string}
          onBlur={props.field().handleBlur}
          onChange={(e) => {
            const target = e.target;
            props.field().handleChange(target.value as DeepValue<T, DeepKeys<T>>);
          }}
          state={fieldInfo(props.field())}
          class={fieldCalss}
        />
      );
    }
  }
}
