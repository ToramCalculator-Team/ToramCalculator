import { createMemo, For, JSX, Show } from "solid-js";
import { z, ZodFirstPartyTypeKind, ZodObject, ZodTypeAny } from "zod";
import { DB } from "~/../db/kysely/kyesely";
import { Dic } from "~/locales/type";

// 缓存 Zod 类型解析
const schemaTypeCache = new WeakMap<ZodTypeAny, ZodFirstPartyTypeKind>();

function getZodType(schema?: ZodTypeAny): ZodFirstPartyTypeKind {
  if (!schema) return ZodFirstPartyTypeKind.ZodUndefined;

  if (schemaTypeCache.has(schema)) {
    return schemaTypeCache.get(schema)!;
  }

  const def = schema._def;
  let type: ZodFirstPartyTypeKind;

  if ("innerType" in def) {
    type = getZodType(def.innerType);
  } else {
    type = def.typeName as ZodFirstPartyTypeKind;
  }

  schemaTypeCache.set(schema, type);
  return type;
}

export function DBDataRender<T extends Record<string, unknown>>(props: {
  data: T;
  dataSchema: ZodObject<Record<keyof T, ZodTypeAny>>;
  dictionary: Dic<T>;
  hiddenFields: Array<keyof T>;
  fieldGroupMap: Record<string, Array<keyof T>>;
  fieldGenerator?: (key: keyof T, value: T[keyof T], dictionary: Dic<T>) => JSX.Element;
}) {
  return (
    <div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
      <For
        each={Object.entries(props.fieldGroupMap).filter(([_, keys]) =>
          keys.some((key) => !props.hiddenFields.includes(key)),
        )}
      >
        {([groupName, keys]) => (
          <section class="FieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {groupName}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <For each={keys}>
                {(key) => {
                  const val = props.data[key];
                  const schemaField = props.dataSchema.shape[key];
                  const kind = getZodType(schemaField);

                  // 处理嵌套结构
                  if (kind === ZodFirstPartyTypeKind.ZodObject || kind === ZodFirstPartyTypeKind.ZodArray) {
                    const content = Object.entries(val as Record<string, unknown>);
                    return (
                      props.fieldGenerator?.(key, val, props.dictionary) ?? (
                        <div class="Fieldflex flex-col gap-2">
                          <span class="Title text-main-text-color text-nowrap">{props.dictionary.fields[key].key}</span> :
                          <Show when={content.length > 0}>
                            <div class="List bg-area-color rounded-md p-2">
                              <For each={content}>
                                {([key, val]) => (
                                  <div class="Field flex gap-1">
                                    <span class="text-boundary-color text-nowrap">{key} : </span>
                                    <span class="text-nowrap">{String(val)}</span>
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      )
                    );
                  }

                  return (
                    props.fieldGenerator?.(key, val, props.dictionary) ?? (
                      <div class="Field flex gap-2">
                        <span class="text-main-text-color text-nowrap">{props.dictionary.fields[key].key}</span>:
                        <span class="font-bold text-nowrap">{String(val)}</span>
                        <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span>
                      </div>
                    )
                  );
                }}
              </For>
            </div>
          </section>
        )}
      </For>
    </div>
  );
}
