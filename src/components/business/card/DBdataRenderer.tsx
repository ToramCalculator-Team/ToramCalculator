import { DB } from "@db/generated/zod";
import { For, JSX, Show } from "solid-js";
import { ZodAny, ZodObject, ZodType } from "zod/v4";
import { getZodType } from "~/lib/utils/zodTools";
import { Dic, EnumFieldDetail } from "~/locales/type";

export type FieldGenMap<T> = Partial<{
  [K in keyof T]: (key: K, value: T[K], dictionary: Dic<T>["fields"][K]) => JSX.Element;
}>;

export function DBdataRenderer<TableName extends keyof DB, TData extends DB[TableName]>(props: {
  data: TData;
  dataSchema: ZodObject<Record<keyof TData, ZodType>>;
  dictionary?: Dic<TData>;
  hiddenFields?: Array<keyof TData>;
  fieldGroupMap?: Record<string, Array<keyof TData>>;
  fieldGenerator?: FieldGenMap<TData>;
}) {
  return (
    <div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
      <Show
        when={"fieldGroupMap" in props}
        fallback={
          <For each={Object.entries(props.data)}>
            {([_key, _val]) => {
              const key = _key as keyof TData;
              const val = _val as TData[typeof key];
              // 跳过需要隐藏的字段
              if (props.hiddenFields?.some((hiddenField) => hiddenField === key)) return null;
              const fieldName = props.dictionary?.fields[key].key ?? key;
              let fieldValue = val;
              const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];

              // 处理嵌套结构
              if (props.dataSchema?.shape[key].type === "array") {
                const content = Object.entries(val as Record<string, unknown>);
                return props.dictionary && hasGenerator ? (
                  props.fieldGenerator?.[key]?.(key, val, props.dictionary.fields[key])
                ) : (
                  <div class="Field flex flex-col gap-2">
                    <span class="Title text-main-text-color text-nowrap">{String(fieldName)}</span>
                    <Show when={content.length > 0}>
                      <div class="List bg-area-color rounded-md p-2">
                        <For each={content}>
                          {([key, val]) => (
                            <div class="Field flex gap-1">
                              <span class="text-boundary-color w-3 text-sm text-nowrap">{key}</span>
                              &nbsp;:&nbsp;
                              <span class="text-sm text-nowrap">{String(val)}</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                );
              }

              return props.dictionary && hasGenerator ? (
                props.fieldGenerator?.[key]?.(key, val, props.dictionary.fields[key])
              ) : (
                <div class="Field flex gap-2">
                  <span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
                  <span class="font-bold">
                    {props.dataSchema?.shape[key].type === "enum"
                      ? (props.dictionary?.fields[key] as EnumFieldDetail<any>).enumMap[val]
                      : String(fieldValue)}
                  </span>
                  {/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
                </div>
              );
            }}
          </For>
        }
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
              <div class="Content flex flex-col gap-3 p-1">
                <For each={keys}>
                  {(key) => {
                    const val = props.data[key];
                    const fieldName = props.dictionary?.fields[key].key ?? key;
                    let fieldValue = val;
                    const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];
                    // 处理嵌套结构
                    if (props.dataSchema?.shape[key].type === "array") {
                      const content = Object.entries(val as Record<string, unknown>);
                      return props.dictionary && hasGenerator ? (
                        props.fieldGenerator?.[key]?.(key, val, props.dictionary.fields[key])
                      ) : (
                        <div class="Field flex flex-col gap-2">
                          <span class="Title text-main-text-color text-nowrap">{String(fieldName)}</span>
                          <Show when={content.length > 0}>
                            <div class="List bg-area-color rounded-md p-2">
                              <For each={content}>
                                {([key, val]) => (
                                  <div class="Field flex gap-1">
                                    <span class="text-boundary-color w-3 text-sm text-nowrap">{key}</span>
                                    &nbsp;:&nbsp;
                                    <span class="text-sm text-nowrap">{String(val)}</span>
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      );
                    }

                    return props.dictionary && hasGenerator ? (
                      props.fieldGenerator?.[key]?.(key, val, props.dictionary.fields[key])
                    ) : (
                      <div class="Field flex gap-2">
                        <span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
                        <span class="font-bold">
                          {props.dataSchema?.shape[key].type === "enum"
                            ? (props.dictionary?.fields[key] as EnumFieldDetail<any>).enumMap[val]
                            : String(fieldValue)}
                        </span>
                        {/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
                      </div>
                    );
                  }}
                </For>
              </div>
            </section>
          )}
        </For>
      </Show>
    </div>
  );
}
