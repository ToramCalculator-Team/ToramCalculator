import { AnyFieldApi, createForm, DeepKeys, DeepValue, FormApi } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { createMemo, For, JSX, onCleanup, onMount, Show, useContext } from "solid-js";
import { z, ZodEnum, ZodFirstPartyTypeKind, ZodObject, ZodSchema } from "zod";
import { store, setStore } from "~/store";
import { Button } from "../controls/button";
import { Toggle } from "../controls/toggle";
import { NodeEditor } from "./nodeEditor";
import { Dic, EnumFieldDetail, FieldDetail } from "~/locales/type";
import { getDictionary } from "~/locales/i18n";
import { Autocomplete } from "../controls/autoComplete";
import { EnumSelect } from "../controls/enumSelect";

const getZodType = <T extends z.ZodTypeAny>(schema: T): ZodFirstPartyTypeKind => {
  if (schema === undefined || schema == null) {
    return ZodFirstPartyTypeKind.ZodUndefined;
  }
  if ("_def" in schema) {
    if ("innerType" in schema._def) {
      return getZodType(schema._def.innerType);
    } else {
      return schema._def.typeName as ZodFirstPartyTypeKind;
    }
  }
  return ZodFirstPartyTypeKind.ZodUndefined;
};

function fieldInfo(field: AnyFieldApi): string {
  const errors =
    field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(",") : null;
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

export const Form = <T extends Record<string, unknown>>(props: {
  title: string;
  data: T;
  dictionary: Dic<T>;
  dataSchema: ZodObject<{ [K in keyof T]: ZodSchema }>;
  hiddenFields: Array<keyof T>;
  fieldGenerators: Partial<{
    [K in keyof T]: (
      key: K,
      field: () => AnyFieldApi,
      getFormValue: (key: keyof T) => unknown,
      dictionary: Dic<T>,
    ) => JSX.Element;
  }>;
  onChange?: (data: T) => void;
  onSubmit?: (data: T) => Promise<void>;
}) => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  const form = createForm(() => ({
    defaultValues: props.data,
    onSubmit: async ({ value }) => {
      const data = value;
      if (props.onSubmit) {
        props.onSubmit(data);
      } else {
        console.log("onSubmit is not defined");
        console.log("value:", value);
      }
    },
  }));

  const getFormValue = (key: keyof T) => {
    return form.getFieldValue(key as DeepKeys<T>);
  };

  onMount(() => {
    console.log("form mounted");
  });

  onCleanup(() => {
    console.log("form unmounted");
  });

  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{props.title}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class="Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none"
      >
        <For each={Object.entries(props.data)}>
          {(_field, index) => {
            const fieldKey = _field[0] as DeepKeys<T>;
            const fieldValue = _field[1];
            // 过滤掉隐藏的数据
            if (props.hiddenFields.includes(fieldKey)) return;
            // 输入框的类型计算
            const zodValue = props.dataSchema.shape[fieldKey];
            // 判断字段类型，便于确定默认输入框
            const valueType = getZodType(zodValue);
            // 判断是否有自定义fieldGenerator
            const hasFieldGenerator = fieldKey in props.fieldGenerators;
            const fieldGenerator = hasFieldGenerator ? props.fieldGenerators[fieldKey] : null;

            switch (valueType) {
              case ZodFirstPartyTypeKind.ZodEnum: {
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: props.dataSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      const enumValue = zodValue as ZodEnum<any>;
                      return fieldGenerator ? (
                        fieldGenerator(fieldKey, field, getFormValue, props.dictionary)
                      ) : (
                        <Input
                          title={props.dictionary.fields[fieldKey].key}
                          description={props.dictionary.fields[fieldKey].formFieldDescription}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <EnumSelect
                            value={field().state.value as string}
                            setValue={(value) => field().setValue(value as DeepValue<T, DeepKeys<T>>)}
                            options={enumValue.options}
                            dic={(props.dictionary.fields[fieldKey] as EnumFieldDetail<string>).enumMap}
                            field={{
                              id: field().name,
                              name: field().name,
                            }}
                          />
                        </Input>
                      );
                    }}
                  </form.Field>
                );
              }

              case ZodFirstPartyTypeKind.ZodNumber: {
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: props.dataSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return fieldGenerator ? (
                        fieldGenerator(fieldKey, field, getFormValue, props.dictionary)
                      ) : (
                        <Input
                          title={props.dictionary.fields[fieldKey].key}
                          description={props.dictionary.fields[fieldKey].formFieldDescription}
                          autocomplete="off"
                          type="number"
                          id={field().name}
                          name={field().name}
                          value={field().state.value as number}
                          onBlur={field().handleBlur}
                          onChange={(e) =>
                            field().handleChange(parseFloat(e.target.value) as DeepValue<T, DeepKeys<T>>)
                          }
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        />
                      );
                    }}
                  </form.Field>
                );
              }
              case ZodFirstPartyTypeKind.ZodArray: {
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: props.dataSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      // 非关系字段出现数组时，基本上只可能是字符串数组，因此断言
                      const arrayValue = () => field().state.value as string[];
                      return fieldGenerator ? (
                        fieldGenerator(fieldKey, field, getFormValue, props.dictionary)
                      ) : (
                        <Input
                          title={fieldKey}
                          description={""}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <div class="ArrayBox flex w-full flex-col gap-2">
                            <For each={arrayValue()}>
                              {(item, index) => (
                                <div class="flex items-center gap-2">
                                  <div class="flex-1">
                                    <Input
                                      type="text"
                                      value={item}
                                      onChange={(e) => {
                                        const newArray = [...arrayValue()];
                                        newArray[index()] = e.target.value;
                                        field().setValue(newArray as any);
                                      }}
                                      class="w-full p-0!"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      const newArray = arrayValue().filter((_, i) => i !== index());
                                      field().setValue(newArray as any);
                                    }}
                                  >
                                    {dictionary().ui.actions.remove}
                                  </Button>
                                </div>
                              )}
                            </For>
                            <Button
                              onClick={() => {
                                const newArray = [...arrayValue(), ""];
                                field().setValue(newArray as any);
                              }}
                              class="w-full"
                            >
                              {dictionary().ui.actions.add}
                            </Button>
                          </div>
                        </Input>
                      );
                    }}
                  </form.Field>
                );
              }
              case ZodFirstPartyTypeKind.ZodObject: {
                return JSON.stringify(fieldValue, null, 2);
              }

              case ZodFirstPartyTypeKind.ZodLazy: {
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: props.dataSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      // const defaultFieldsetClass = "flex basis-1/2 flex-col gap-1 p-2 lg:basis-1/4";
                      return fieldGenerator ? (
                        fieldGenerator(fieldKey, field, getFormValue, props.dictionary)
                      ) : (
                        <Input
                          title={props.dictionary.fields[fieldKey].key}
                          description={props.dictionary.fields[fieldKey].formFieldDescription}
                          autocomplete="off"
                          type="text"
                          id={field().name}
                          name={field().name}
                          value={field().state.value as string}
                          onBlur={field().handleBlur}
                          onChange={(e) => {
                            const target = e.target;
                            field().handleChange(target.value as DeepValue<T, DeepKeys<T>>);
                          }}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <NodeEditor
                            data={field().state.value}
                            setData={(data) => field().setValue(data as DeepValue<T, DeepKeys<T>>)}
                            state={true}
                            id={field().name}
                            class="h-[80vh] w-full"
                          />
                        </Input>
                      );
                    }}
                  </form.Field>
                );
              }

              case ZodFirstPartyTypeKind.ZodBoolean: {
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: props.dataSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return fieldGenerator ? (
                        fieldGenerator(fieldKey, field, getFormValue, props.dictionary)
                      ) : (
                        <Input
                          title={props.dictionary.fields[fieldKey].key}
                          description={props.dictionary.fields[fieldKey].formFieldDescription}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <Toggle
                            id={field().name}
                            onClick={() => {
                              field().setValue(!field().state.value as DeepValue<T, DeepKeys<T>>);
                            }}
                            onBlur={field().handleBlur}
                            name={field().name}
                            checked={field().state.value as boolean}
                          />
                        </Input>
                      );
                    }}
                  </form.Field>
                );
              }

              // 字符串输入
              default: {
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: props.dataSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      // console.log("FieldKey:", fieldKey, props.dictionary.fields[fieldKey].key);
                      return fieldGenerator ? (
                        fieldGenerator(fieldKey, field, getFormValue, props.dictionary)
                      ) : (
                        <Input
                          title={props.dictionary.fields[fieldKey].key}
                          description={props.dictionary.fields[fieldKey].formFieldDescription}
                          autocomplete="off"
                          type="text"
                          id={field().name}
                          name={field().name}
                          value={field().state.value as string}
                          onBlur={field().handleBlur}
                          onChange={(e) => {
                            const target = e.target;
                            field().handleChange(target.value as DeepValue<T, DeepKeys<T>>);
                          }}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        />
                      );
                    }}
                  </form.Field>
                );
              }
            }
          }}
        </For>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <div class="flex items-center gap-1">
                <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                  {state().isSubmitting ? "..." : dictionary().ui.actions.add}
                </Button>
              </div>
            );
          }}
        />
      </form>
    </div>
  );
};
