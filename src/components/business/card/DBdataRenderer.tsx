import {
  MODEL_METADATA,
  RELATION_METADATA,
  getPrimaryKeys as getPrimaryKeyFields,
  getChildRelationNames,
  getRelationType,
  getManyToManyTableName,
} from "@db/generated/dmmf-utils";
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

  // 获取当前表的所有子关系表名（OneToMany 和 ManyToMany）
  const childRelationTableNames = getChildRelationNames(props.tableName);
  const currentPrimaryKey = getPrimaryKeyFields(props.tableName)[0];
  const currentPrimaryKeyValue = props.data[currentPrimaryKey];

  const [relations, { refetch: refetchRelations }] = createResource(async () => {
    type RelationItem = { data: any; displayName: string };
    type RelationGroup = { tableName: keyof DB; items: RelationItem[] };
    const groupMap = new Map<keyof DB, RelationItem[]>();

    if (childRelationTableNames.length === 0) return [] as RelationGroup[];

    const db = await getDB();

    // 遍历所有子关系表
    for (const childTableName of childRelationTableNames) {
      // 查找关系元数据
      const relationMetadata = RELATION_METADATA.find(
        (r) =>
          ((r.from === props.tableName && r.to === childTableName) ||
            (r.to === props.tableName && r.from === childTableName)) &&
          (r.type === "OneToMany" || r.type === "ManyToMany"),
      );

      if (!relationMetadata) continue;

      const relationType = relationMetadata.type;
      const targetTableName = relationMetadata.to === props.tableName ? relationMetadata.from : relationMetadata.to;
      const targetPrimaryKey = getPrimaryKeyFields(targetTableName as keyof DB)[0];

      try {
        let relationData: any[] = [];

        if (relationType === "ManyToMany") {
          // 多对多关系：通过中间表查询
          const intermediateTableName =
            relationMetadata.joinTable ||
            getManyToManyTableName(props.tableName, targetTableName, relationMetadata.name);

          if (!intermediateTableName) continue;

          // 获取中间表的元数据以确定字段名
          const intermediateTableInfo = MODEL_METADATA.find((m) => m.tableName === intermediateTableName);
          if (!intermediateTableInfo) continue;

          // 查找指向当前表和目标表的外键字段
          // 中间表有两个外键字段，分别指向两个相关表
          const currentTableModelName = tableInfo.name;
          const targetTableModelName = MODEL_METADATA.find((m) => m.tableName === targetTableName)?.name;

          // 查找指向当前表的字段（relationToFields 包含当前表的主键）
          const currentTableField = intermediateTableInfo.fields.find(
            (f) => f.relationName && f.relationToFields && f.type === currentTableModelName,
          );
          // 查找指向目标表的字段
          const targetTableField = intermediateTableInfo.fields.find(
            (f) => f.relationName && f.relationToFields && f.type === targetTableModelName,
          );

          // 如果找不到，则使用默认的 A/B 字段名（Prisma 隐式多对多表的约定）
          const currentTableFieldName =
            currentTableField?.relationFromFields?.[0] || (relationMetadata.from === props.tableName ? "A" : "B");
          const targetTableFieldName =
            targetTableField?.relationFromFields?.[0] || (relationMetadata.from === props.tableName ? "B" : "A");

          relationData = await (db as any)
            .selectFrom(intermediateTableName)
            .innerJoin(
              targetTableName,
              `${intermediateTableName}.${targetTableFieldName}`,
              `${targetTableName}.${targetPrimaryKey}`,
            )
            .where(`${intermediateTableName}.${currentTableFieldName}`, "=", currentPrimaryKeyValue)
            .selectAll(targetTableName)
            .execute();
        } else if (relationType === "OneToMany") {
          // 一对多关系：在目标表中查找外键指向当前表主键的记录
          const foreignKeyField =
            relationMetadata.from === props.tableName ? relationMetadata.toField : relationMetadata.fromField;

          if (!foreignKeyField) continue;

          // 查找目标表中有外键字段的元数据
          const targetTableInfo = MODEL_METADATA.find((m) => m.tableName === targetTableName);
          const foreignKeyMetadata = targetTableInfo?.fields.find((f) => f.name === foreignKeyField);

          if (!foreignKeyMetadata || !foreignKeyMetadata.relationFromFields) continue;

          // 外键字段名（通常第一个）
          const fkFieldName = foreignKeyMetadata.relationFromFields[0];

          relationData = await db
            .selectFrom(targetTableName as any)
            .where(fkFieldName as any, "=", currentPrimaryKeyValue)
            .selectAll()
            .execute();
        }

        // 处理查询到的关联数据
        for (const item of relationData) {
          // 确定显示名称：有 name 字段则用 name，否则用主键值
          const displayName =
            "name" in item && typeof (item as any).name === "string"
              ? (item as any).name
              : String(item[targetPrimaryKey as keyof typeof item]);

          const key = targetTableName as keyof DB;
          if (!groupMap.has(key)) groupMap.set(key, []);
          groupMap.get(key)!.push({ data: item, displayName });
        }
      } catch (error) {
        console.error(`查询关联表 ${targetTableName} 失败:`, error);
      }
    }

    // 转换为分组数组，按表名排序
    return Array.from(groupMap.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([tableName, items]) => ({ tableName, items }));
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
      <Show when={childRelationTableNames.length > 0 && relations.latest}>
        <Show when={relations()}>
          {(relationGroups) => (
            <For each={relationGroups()}>
              {(group) => (
                <section class="FieldGroup flex w-full flex-col gap-2">
                  <h3 class="text-accent-color flex items-center gap-2 font-bold">
                    {dictionary().db[group.tableName].selfName}
                    <div class="Divider bg-dividing-color h-px w-full flex-1" />
                  </h3>
                  <div class="Content flex flex-col gap-3 p-1">
                    <For each={group.items}>
                      {(item) => (
                        <Button
                          onclick={() => {
                            const itemPrimaryKey = getPrimaryKeyFields(group.tableName)[0];
                            const itemId = String(item.data[itemPrimaryKey as keyof typeof item.data]);
                            setStore("pages", "cardGroup", store.pages.cardGroup.length, {
                              type: group.tableName,
                              id: itemId,
                            });
                          }}
                        >
                          {item.displayName}
                        </Button>
                      )}
                    </For>
                  </div>
                </section>
              )}
            </For>
          )}
        </Show>
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
