/**
 * @file DBForm.tsx
 * @description 特化的数据库表单组件，支持嵌套表单功能
 * @version 1.0.0
 */

import { AnyFieldApi, createForm, DeepKeys, DeepValue } from "@tanstack/solid-form";
import { Show, For, Accessor, createMemo, Index } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { ZodEnum, ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Toggle } from "~/components/controls/toggle";
import { Autocomplete } from "~/components/controls/autoComplete";
import { getDictionary } from "~/locales/i18n";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { store, setStore } from "~/store";
import { DB } from "~/../db/generated/zod";
import { 
  isForeignKeyFieldSafe, 
  getForeignKeyFields,
  getPrimaryKeyFields,
  isPrimaryKeyField,
  getFieldDisplayName,
  getForeignKeyReferenceSafe,
  getReferencedTableName
} from "~/utils/formUtils";

export interface DBFormProps<T extends keyof DB> {
  tableName: T;
  initialValue: DB[T];
  dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodType }>;
  dictionary: Dic<DB[T]>;
  hiddenFields?: Array<keyof DB[T]>;
  fieldGroupMap?: Record<string, Array<keyof DB[T]>>;
  fieldGenerator?: Partial<{
    [K in keyof DB[T]]: (
      field: Accessor<AnyFieldApi>,
      dictionary: Dic<DB[T]>,
      dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
    ) => JSX.Element;
  }>;
  onSubmit?: (values: DB[T]) => void;
}

export const DBForm = <T extends keyof DB>(props: DBFormProps<T>) => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const form = createForm(() => ({
    defaultValues: props.initialValue,
    onSubmit: async ({ value: newValues }) => {
      props.onSubmit?.(newValues);
    },
  }));

  // 获取外键字段
  const foreignKeyFields = createMemo(() => {
    return getForeignKeyFields(props.tableName);
  });

  // 获取主键字段
  const primaryKeyFields = createMemo(() => {
    return getPrimaryKeyFields(props.tableName);
  });


  // 字段组生成器
  const fieldGroupGenerator = (fieldGroup: Array<keyof DB[T]>) => (
    <For each={fieldGroup}>
      {(key) => {
        if (props.hiddenFields?.includes(key)) return null;
        
        const fieldName = String(key);
        const schemaFieldValue = props.dataSchema?.shape[key];
        const fieldGenerator = props.fieldGenerator?.[key];
        const hasGenerator = !!fieldGenerator;
        
        // 检查是否为外键字段
        const isForeignKey = isForeignKeyFieldSafe(props.tableName, key);
        const isPrimaryKey = isPrimaryKeyField(props.tableName, key);

        // 处理嵌套结构
        switch (schemaFieldValue.type) {
          case "array": {
            return (
              <form.Field
                name={key as DeepKeys<DB[T]>}
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: props.dataSchema.shape[key] as any,
                }}
              >
                {(field) => {
                  // 一般数组对象字段会单独处理，如果这里被调用，说明是简单的字符串数组
                  const arrayValue = () => field().state.value as string[];
                  return (
                    <Input
                      title={getFieldDisplayName(fieldName)}
                      description=""
                      state={fieldInfo(field())}
                      class="border-dividing-color bg-primary-color w-full rounded-md border"
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
                                    field().replaceValue(index, e.target.value as any);
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
                            field().pushValue("" as any);
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
            const safeKey = key as DeepKeys<DB[T]>;
            return (
              <form.Field
                name={safeKey}
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: props.dataSchema.shape[key] as any,
                }}
              >
                {(field) => {
                  if (hasGenerator) {
                    return fieldGenerator(field, props.dictionary, props.dataSchema);
                  } else if (isForeignKey) {
                    // 外键字段使用 AutoComplete
                    const referenceInfo = getForeignKeyReferenceSafe(props.tableName, fieldName);
                    const referencedTable = getReferencedTableName(props.tableName, fieldName);
                    
                    if (referencedTable) {
                      
                      return (
                        <Input
                          title={getFieldDisplayName(fieldName)}
                          description={`选择 ${referencedTable} 记录`}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color rounded-md border w-full"
                        >
                          <Autocomplete
                            id={fieldName}
                            initialValue={{ id: field().state.value } as any}
                            setValue={(value: any) => field().setValue(value.id)}
                            table={referencedTable as any}
                            valueMap={(value: any) => ({ id: value.id })}
                          />
                        </Input>
                      );
                    }
                  } else {
                    return <DBFieldRenderer field={field} dictionary={props.dictionary} dataSchema={props.dataSchema} />;
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
        <h1 class="FormTitle text-2xl font-black">
          {props.dictionary.selfName ?? `编辑 ${props.tableName}`}
        </h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class="Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none"
      >
        <Show 
          when={props.fieldGroupMap} 
          fallback={fieldGroupGenerator(Object.keys(props.initialValue) as Array<keyof DB[T]>)}
        >
          <For
            each={Object.entries(props.fieldGroupMap!).filter(([_, keys]) =>
              keys.some((key) => !props.hiddenFields?.includes(key)),
            )}
          >
            {([groupName, keys]) => (
              <section class="FieldGroup flex w-full flex-col gap-2">
                <h3 class="text-accent-color flex items-center gap-2 font-bold">
                  {groupName}
                  <div class="Divider bg-dividing-color h-px w-full flex-1" />
                </h3>
                <div class="Content flex flex-col gap-3">{fieldGroupGenerator(keys)}</div>
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
                <Button level="primary" class="SubmitBtn flex-1" type="submit" disabled={!state().canSubmit}>
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

// 获取表单字段的错误信息
export function fieldInfo(field: AnyFieldApi): string {
  if (!field.state.meta) {
    return "";
  }
  const errors =
    field.state.meta.isTouched && field.state.meta.errors?.length ? field.state.meta.errors.join(",") : null;
  const isValidating = field.state.meta.isValidating ? "..." : null;
  if (errors) {
    return errors;
  }
  if (isValidating) {
    return isValidating;
  }
  return "";
}

// 数据库字段渲染器
export function DBFieldRenderer<T extends keyof DB>(props: {
  field: Accessor<AnyFieldApi>;
  dictionary: Dic<DB[T]>;
  dataSchema: ZodObject<Record<keyof DB[T], ZodType>>;
}) {
  // 获取字段名
  const fieldName = props.field().name;
  let inputTitle = getFieldDisplayName(fieldName);
  let inputDescription = "";
  
  try {
    inputTitle = (props.dictionary.fields as any)[fieldName].key;
    inputDescription = (props.dictionary.fields as any)[fieldName].formFieldDescription;
  } catch (error) {
  }
  
  const fieldClass = "border-dividing-color bg-primary-color rounded-md border w-full";

  switch ((props.dataSchema.shape as any)[fieldName].type) {
    case "enum": {
      return (
        <Input title={inputTitle} description={inputDescription} state={fieldInfo(props.field())} class={fieldClass}>
          <EnumSelect
            value={props.field().state.value as string}
            setValue={(value) => props.field().setValue(value as DeepValue<DB[T], DeepKeys<DB[T]>>)}
            options={((props.dataSchema.shape as any)[fieldName] as ZodEnum<any>).options.map((i) => i.toString())}
            dic={((props.dictionary.fields as any)[fieldName] as EnumFieldDetail<string>).enumMap}
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
          class={fieldClass}
        />
      );
    }

    case "array": {
      throw new Error("array type is not supported in DBFieldRenderer");
    }

    case "object": {
      throw new Error("object type is not supported in DBFieldRenderer");
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
            props.field().handleChange(target.value as DeepValue<DB[T], DeepKeys<DB[T]>>);
          }}
          state={fieldInfo(props.field())}
          class={fieldClass}
        >
          "逻辑编辑器，暂未处理"
        </Input>
      );
    }

    case "boolean": {
      return (
        <Input title={inputTitle} description={inputDescription} state={fieldInfo(props.field())} class={fieldClass}>
          <Toggle
            id={props.field().name}
            onClick={() => {
              props.field().setValue(!props.field().state.value as DeepValue<DB[T], DeepKeys<DB[T]>>);
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
            props.field().handleChange(target.value as DeepValue<DB[T], DeepKeys<DB[T]>>);
          }}
          state={fieldInfo(props.field())}
          class={fieldClass}
        />
      );
    }
  }
}
