import { createMemo, For, JSX } from "solid-js";
import { z, ZodFirstPartyTypeKind, ZodObject, ZodTypeAny } from "zod";
import { Dic } from "~/locales/type";

// 增强类型：支持层级化隐藏字段处理
export type DeepHiddenFields<T> = Array<
  | keyof T
  | {
      [K in keyof T]?: DeepHiddenFields<NonNullable<T[K]>>;
    }
>;

// 最终修复版
function processLayer<T extends object>(obj: T, hiddenFields: DeepHiddenFields<T>, tier: number): T {
  if (tier > 0 || !obj || typeof obj !== "object") return obj;

  const isArray = Array.isArray(obj);
  const clone: Record<string | number, any> = isArray ? [...obj] : { ...obj };

  for (const field of hiddenFields) {
    if (typeof field === "string") {
      const key = field as Extract<keyof T, string>;
      if (isArray) {
        const index = Number(key);
        if (!isNaN(index) && index < clone.length) {
          clone.splice(index, 1);
        }
      } else if (key in clone) {
        delete clone[key];
      }
    } else if (typeof field === "object" && field !== null) {
      for (const key of Object.keys(field) as Array<Extract<keyof T, string>>) {
        if (clone[key] !== undefined && typeof clone[key] === "object") {
          clone[key] = processLayer(clone[key], field[key as keyof typeof field]!, tier + 1);
        }
      }
    }
  }

  return isArray ? (clone as unknown as T) : (Object.assign(Object.create(Object.getPrototypeOf(obj)), clone) as T);
}

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

export function ObjRender<T extends object>(props: {
  data: T;
  dataSchema: ZodObject<Record<keyof T, ZodTypeAny>>;
  dictionary: Dic<T>;
  deepHiddenFields: DeepHiddenFields<T>;
  fieldGroupMap: Record<string, Array<keyof T>>;
  fieldGenerator?: (key: keyof T, value: T[keyof T], dictionary: Dic<T>) => JSX.Element;
  tier?: number;
}) {
  const tier = props.tier || 0;

  // 按层级处理数据（单次遍历）
  const processedData = createMemo(() => processLayer(props.data, props.deepHiddenFields, tier));

  return (
    <div class="FieldGroupContainer flex w-full flex-col gap-3" style={{ "margin-left": tier * 4 + "px" }}>
      <For each={Object.entries(props.fieldGroupMap)}>
        {([groupName, keys]) => (
          <section class="FieldGroup w-full">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {groupName}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <For each={keys}>
                {(key) => {
                  const val = processedData()[key];
                  const schemaField = props.dataSchema.shape[key];
                  const kind = getZodType(schemaField);

                  // 处理嵌套结构
                  if (kind === ZodFirstPartyTypeKind.ZodObject || kind === ZodFirstPartyTypeKind.ZodArray) {
                    const childData = val && typeof val === "object" ? val : {};
                    const childSchema =
                      kind === ZodFirstPartyTypeKind.ZodArray ? (schemaField as any).element : schemaField;

                    // 自动生成子字段分组
                    const childKeys = Object.keys(childData) as Array<keyof typeof childData>;
                    const childGroupMap = childKeys.length > 0 ? { [key as string]: childKeys } : {};

                    return (
                      <ObjRender
                        data={childData}
                        dataSchema={childSchema}
                        dictionary={props.dictionary}
                        deepHiddenFields={props.deepHiddenFields
                          .filter(
                            (f): f is { [K in keyof T]?: DeepHiddenFields<NonNullable<T[K]>> } =>
                              typeof f === "object" && key in f,
                          )
                          .map((f) => f[key]!)}
                        fieldGroupMap={childGroupMap}
                        tier={tier + 1}
                      />
                    );
                  }

                  return (
                    props.fieldGenerator?.(key, val, props.dictionary) ?? (
                      <div class="Field flex gap-2">
                        <span class="text-main-text-color">{String(key)}</span>:
                        <span class="font-bold">{String(val)}</span>
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
