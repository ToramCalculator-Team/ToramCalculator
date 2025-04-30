import { AnyFieldApi, createForm, DeepKeys } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { createMemo, For, JSX, useContext } from "solid-js";
import { z, ZodEnum, ZodFirstPartyTypeKind, ZodObject, ZodSchema } from "zod";
import { store, setStore } from "~/store";
import { Button } from "../controls/button";
import { Toggle } from "../controls/toggle";
import { NodeEditor } from "./nodeEditor";
import { Dic } from "~/locales/type";
import { MediaContext } from "~/contexts/Media";
import { getDictionary } from "~/locales/i18n";

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
  fieldGenerator?: (key: keyof T, field: () => AnyFieldApi, dictionary: Dic<T>) => JSX.Element;
  onChange?: (data: T) => void;
  onSubmit?: (data: T) => void;
}) => {
  const media = useContext(MediaContext);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  const form = createForm(() => ({
    defaultValues: props.data,
    onSubmit: async ({ value }) => {
      if (props.onSubmit) {
        props.onSubmit(value);
      } else {
        console.log("onSubmit is not defined");
        console.log("value:", value);
      }
    },
    // validatorAdapter: zodValidator,
  }));

  return (
    <div class="FormBox flex w-full flex-col gap-2">
      <div class="Title flex items-center lg:p-2">
        <h1 class="FormTitle text-2xl font-black">{props.title}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class="Form lg:bg-area-color flex flex-col gap-3 lg:rounded lg:p-3"
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
                      return props.fieldGenerator && props.fieldGenerator(fieldKey, field, props.dictionary) ? (
                        props.fieldGenerator(fieldKey, field, props.dictionary)
                      ) : (
                        <Input
                          title={props.dictionary.fields[fieldKey].key}
                          description={props.dictionary.fields[fieldKey].formFieldDescription}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <div class="EnumsBox flex flex-wrap gap-1">
                            <For each={enumValue.options}>
                              {(option) => {
                                return (
                                  <label
                                    class={`flex cursor-pointer gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${field().state.value === option ? "border-accent-color bg-area-color" : "border-dividing-color opacity-50"}`}
                                  >
                                    {option}
                                    <input
                                      id={field().name + option}
                                      name={field().name}
                                      value={option}
                                      checked={field().state.value === option}
                                      type="radio"
                                      onBlur={field().handleBlur}
                                      onChange={(e) => field().handleChange(e.target.value)}
                                      class="mt-0.5 rounded px-4 py-2"
                                    />
                                  </label>
                                );
                              }}
                            </For>
                          </div>
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
                      return props.fieldGenerator && props.fieldGenerator(fieldKey, field, props.dictionary) ? (
                        props.fieldGenerator(fieldKey, field, props.dictionary)
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
                          onChange={(e) => field().handleChange(parseFloat(e.target.value))}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        />
                      );
                    }}
                  </form.Field>
                );
              }
              case ZodFirstPartyTypeKind.ZodArray:
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
                      return props.fieldGenerator && props.fieldGenerator(fieldKey, field, props.dictionary) ? (
                        props.fieldGenerator(fieldKey, field, props.dictionary)
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
                            field().handleChange(target.value);
                          }}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <NodeEditor
                            data={field().state.value}
                            setData={(data) => field().setValue(data)}
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
                      return props.fieldGenerator && props.fieldGenerator(fieldKey, field, props.dictionary) ? (
                        props.fieldGenerator(fieldKey, field, props.dictionary)
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
                              field().setValue(!field().state.value);
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
                      return props.fieldGenerator && props.fieldGenerator(fieldKey, field, props.dictionary) ? (
                        props.fieldGenerator(fieldKey, field, props.dictionary)
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
                            field().handleChange(target.value);
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
