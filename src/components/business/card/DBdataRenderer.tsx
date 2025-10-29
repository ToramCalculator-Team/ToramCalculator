import { MODEL_METADATA, type FieldMetadata as FieldInfo, getPrimaryKeys as getPrimaryKeyFields } from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import { DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { Transaction } from "kysely";
import { createMemo, createResource, createSignal, For, JSX, Show } from "solid-js";
import { ZodAny, ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { FieldGenMap } from "~/components/dataDisplay/objRender";
import Icons from "~/components/icons";
import { getDictionary } from "~/locales/i18n";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { setStore, store } from "~/store";

export type DBdataRendererProps<TName extends keyof DB> = {
  tableName: TName;
  data: DB[TName];
  dataSchema: ZodObject<Record<keyof DB[TName], ZodType>>;
  hiddenFields?: Array<keyof DB[TName]>;
  fieldGroupMap?: Record<string, Array<keyof DB[TName]>>;
  fieldGenerator?: FieldGenMap<DB[TName]>;
  before?: (
    data: DB[TName],
    setData: (data: DB[TName]) => void,
    dataSchema: ZodObject<Record<keyof DB[TName], ZodType>>,
    dictionary: Dic<DB[TName]>,
  ) => JSX.Element;
  after?: (
    data: DB[TName],
    setData: (data: DB[TName]) => void,
    dataSchema: ZodObject<Record<keyof DB[TName], ZodType>>,
    dictionary: Dic<DB[TName]>,
  ) => JSX.Element;
};

export function DBdataRenderer<TName extends keyof DB>(props: DBdataRendererProps<TName>) {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const [data, setData] = createSignal<DB[TName]>(props.data);
  const primaryKey = getPrimaryKeyFields(props.tableName)[0];
  const [canEdit, { refetch: refetchCanEdit }] = createResource(async () => {
    // 主键字段的值总是 string 类型
    const canEdit = await repositoryMethods[props.tableName].canEdit?.(String(data()[primaryKey]));
    return canEdit;
  });

  const fieldRenderer = (key: keyof DB[TName], val: DB[TName][typeof key]) => {
    // 跳过需要隐藏的字段
    if (props.hiddenFields?.some((hiddenField) => hiddenField === key)) return null;
    const fieldName = dictionary().db[props.tableName].fields[key].key ?? key;
    const fieldValue = val;
    const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];

    // 处理嵌套结构
    if (props.dataSchema.shape[key].type === "array") {
      const content = Object.entries(val as Record<string, unknown>);
      return hasGenerator ? (
        props.fieldGenerator?.[key]?.(data(), key, dictionary().db[props.tableName])
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

    return hasGenerator ? (
      props.fieldGenerator?.[key]?.(data(), key, dictionary().db[props.tableName])
    ) : (
      <div class="Field flex gap-2">
        <span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
        <span class="font-bold">
          {props.dataSchema.shape[key].type === "enum"
            ? (dictionary().db[props.tableName].fields[key] as EnumFieldDetail<any>).enumMap[val]
            : String(fieldValue)}
        </span>
        {/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
      </div>
    );
  };

  const tableInfo = MODEL_METADATA.find((model) => model.tableName === props.tableName);
  if (!tableInfo) throw new Error(`Table ${props.tableName} not found in MODEL_METADATA`);

  const hasRelation = tableInfo.fields.filter((field) => field.relationName)?.length > 0;

  const [relations, { refetch: refetchRelations }] = createResource(async () => {
    const relations: JSX.Element[] = [];
    if (hasRelation) {
      const relationFields = tableInfo.fields.filter((field) => field.relationName);
      if (relationFields.length > 0) {
        for (const field of relationFields) {
          console.log("==================", field.name, "==================");
          // 关联表信息
          const targetTableInfo = MODEL_METADATA.find((model) => model.name === field.type);
          let relationType: "MANY_TO_MANY" | "ONE_TO_MANY" | "MANY_TO_ONE" = "ONE_TO_MANY";
          // 在自身和目标表的relationFromFields字段上查找是否存在关联字段，没有的话则说明是多对多关系
          const selfRelationFromFields = field.relationFromFields
          const targetRelationFromFields = targetTableInfo?.fields.filter((targetField) => targetField.relationFromFields?.includes(field.name));
          console.log("selfRelationFromFields", selfRelationFromFields, "targetRelationFromFields", targetRelationFromFields);
          if (selfRelationFromFields?.length === 0 && targetRelationFromFields?.length === 0) { 
            relationType = "MANY_TO_MANY";
          }
          console.log(field.relationName,field.relationFromFields)
          console.log("relationType", relationType);
          const targetTableName = field.type as keyof DB;
          console.log("targetTableName", targetTableName);
          const targetPrimaryKey = getPrimaryKeyFields(targetTableName)[0];
          console.log("targetPrimaryKey", targetPrimaryKey);
          const currentPrimaryKey = getPrimaryKeyFields(props.tableName)[0];
          console.log("currentPrimaryKey", currentPrimaryKey);
          const relationDataFetcher = async () => {
            const targetFieldName = `${targetTableName}.${String(currentPrimaryKey)}`;
            const targerFieldValue = props.data[currentPrimaryKey];
            console.log("where clause", targetFieldName, "=", targerFieldValue);
            const db = await getDB();
            let relationData: DB[typeof targetTableName][] = []
            switch (relationType) { 
              case "MANY_TO_MANY":
                const intermediateTableName = `_${field.relationName}`;
                console.log("中间表名：", intermediateTableName);
                relationData = await db
                  .selectFrom(intermediateTableName as any)
                  // @ts-ignore-next-line
                  .innerJoin(targetTableName, `${intermediateTableName}.B`, `${targetTableName}.${String(targetPrimaryKey)}`)
                  // @ts-ignore-next-line
                  // @ts-ignore-next-line
                  .where(targetFieldName, "=", targerFieldValue)
                  .selectAll()
                  .execute();
                break;
              case "ONE_TO_MANY":
                break;
              case "MANY_TO_ONE":
                break;
            }
            return relationData;
          };
          const res = await relationDataFetcher();
          relations.push(
            <For each={res}>
              {(val) => {
                let detectedField: keyof DB[typeof targetTableName];
                if ("name" in val && typeof val.name === "string") {
                  detectedField = "name" as keyof DB[typeof targetTableName];
                } else {
                  detectedField = "id" as keyof DB[typeof targetTableName];
                }
                return <Button>{String(val[detectedField])}</Button>;
              }}
            </For>,
          );
        }
      }
    }
    return relations;
  });

  return (
    <div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
      <div class="Image bg-area-color h-[18vh] w-full rounded"></div>
      {/* 前置内容 */}
      <Show when={props.before}>
        {(before) => before()(data(), setData, props.dataSchema, dictionary().db[props.tableName])}
      </Show>
      {/* 主内容 */}
      <Show
        when={"fieldGroupMap" in props && Object.keys(props.fieldGroupMap ?? {}).length > 0}
        fallback={
          <For each={Object.entries(data())}>
            {([_key, _val]) => <>{fieldRenderer(_key as keyof DB[TName], _val as DB[TName][keyof DB[TName]])}</>}
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
      {/* 关联内容 */}

      <Show when={hasRelation && relations.latest}>
        <section class="FieldGroup flex w-full flex-col gap-2">
          <h3 class="text-accent-color flex items-center gap-2 font-bold">
            关联内容
            <div class="Divider bg-dividing-color h-px w-full flex-1" />
          </h3>
          <div class="Content flex flex-col gap-3 p-1">
            <For each={relations()}>{(val) => val}</For>
          </div>
        </section>
      </Show>
      {/* 后置内容 */}
      <Show when={props.after}>
        {(after) => after()(data(), setData, props.dataSchema, dictionary().db[props.tableName])}
      </Show>
      {/* 操作按钮 */}
      <Show when={canEdit()}>
        <section class="FunFieldGroup flex w-full flex-col gap-2">
          <h3 class="text-accent-color flex items-center gap-2 font-bold">
            {dictionary().ui.actions.operation}
            <div class="Divider bg-dividing-color h-px w-full flex-1" />
          </h3>
          <div class="FunGroup flex gap-1">
            <Button
              class="w-fit"
              icon={<Icons.Outline.Trash />}
              onclick={async () => {
                // 执行删除方法
                repositoryMethods[props.tableName].delete?.(String(data()[primaryKey]));
                // 关闭当前卡片
                setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
              }}
            />
            <Button
              class="w-fit"
              icon={<Icons.Outline.Edit />}
              onclick={() => {
                // 关闭当前卡片
                setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
                // 打开表单
                setStore("pages", "formGroup", store.pages.formGroup.length, {
                  type: props.tableName,
                  data: props.data,
                });
              }}
            />
          </div>
        </section>
      </Show>
    </div>
  );
}
