import { DB } from "@db/generated/zod";
import { createSignal, For, JSX, Show } from "solid-js";
import { ZodAny, ZodObject, ZodType } from "zod/v4";
import { FieldGenMap } from "~/components/dataDisplay/objRender";
import { Dic, EnumFieldDetail } from "~/locales/type";

export type DBdataRendererProps<TableName extends keyof DB, TData extends DB[TableName]> = {
  data: TData;
  dataSchema: ZodObject<Record<keyof TData, ZodType>>;
  dictionary: Dic<TData>;
  hiddenFields?: Array<keyof TData>;
  fieldGroupMap?: Record<string, Array<keyof TData>>;
  fieldGenerator?: FieldGenMap<TData>;
  before?: (
    data: TData,
    setData: (data: TData) => void,
    dataSchema: ZodObject<Record<keyof TData, ZodType>>,
    dictionary: Dic<TData>,
  ) => JSX.Element;
  after?: (
    data: TData,
    setData: (data: TData) => void,
    dataSchema: ZodObject<Record<keyof TData, ZodType>>,
    dictionary: Dic<TData>,
  ) => JSX.Element;
};

export function DBdataRenderer<TableName extends keyof DB, TData extends DB[TableName]>(
  props: DBdataRendererProps<TableName, TData>,
) {
  const [data, setData] = createSignal<TData>(props.data);

  const fieldRenderer = (key: keyof TData, val: TData[typeof key]) => {
    // 跳过需要隐藏的字段
    if (props.hiddenFields?.some((hiddenField) => hiddenField === key)) return null;
    const fieldName = props.dictionary?.fields[key].key ?? key;
    const fieldValue = val;
    const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];

    // 处理嵌套结构
    if (props.dataSchema.shape[key].type === "array") {
      const content = Object.entries(val as Record<string, unknown>);
      return props.dictionary && hasGenerator ? (
        props.fieldGenerator?.[key]?.(data(), key, props.dictionary)
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
      props.fieldGenerator?.[key]?.(data(), key, props.dictionary)
    ) : (
      <div class="Field flex gap-2">
        <span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
        <span class="font-bold">
          {props.dataSchema.shape[key].type === "enum"
            ? (props.dictionary?.fields[key] as EnumFieldDetail<any>).enumMap[val]
            : String(fieldValue)}
        </span>
        {/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
      </div>
    );
  };

  return (
    <div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
      <div class="Image bg-area-color h-[18vh] w-full rounded"></div>
      <Show when={props.before}>{(before) => before()(data(), setData, props.dataSchema, props.dictionary)}</Show>
      <Show
        when={"fieldGroupMap" in props && Object.keys(props.fieldGroupMap ?? {}).length > 0}
        fallback={
          <For each={Object.entries(data())}>
            {([_key, _val]) => <>{fieldRenderer(_key as keyof TData, _val as TData[keyof TData])}</>}
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
                <For each={keys}>{(key) => <>{fieldRenderer(key, data()[key])}</>}</For>
              </div>
            </section>
          )}
        </For>
      </Show>
      <Show when={props.after}>{(after) => after()(data(), setData, props.dataSchema, props.dictionary)}</Show>
    </div>
  );
}
