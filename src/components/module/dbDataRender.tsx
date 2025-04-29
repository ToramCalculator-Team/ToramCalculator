import { createMemo, For, JSX } from "solid-js";
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

export function DBDataRender<T extends keyof DB>(props: {
  data: DB[T];
  dataSchema: ZodObject<Record<keyof DB[T], ZodTypeAny>>;
  dictionary: Dic<DB[T]>;
  hiddenFields: Array<keyof DB[T]>;
  fieldGroupMap: Record<string, Array<keyof DB[T]>>;
  fieldGenerator?: (key: keyof DB[T], value: DB[T][keyof DB[T]], dictionary: Dic<DB[T]>) => JSX.Element;
}) {
  return (
    <div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
      <For
        each={Object.entries(props.fieldGroupMap).filter(([_, keys]) =>
          keys.some((key) => !props.hiddenFields.includes(key)),
        )}
      >
        {([groupName, keys]) => (
          <section class="FieldGroup w-full">
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
                    return JSON.stringify(val);
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
