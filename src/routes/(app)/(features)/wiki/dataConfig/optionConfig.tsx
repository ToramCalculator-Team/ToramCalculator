import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "@db/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { optionSchema } from "@db/generated/zod/index";
import { DB, item, option } from "@db/generated/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { defaultData } from "@db/defaultData";
import { renderField } from "../utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import Icons from "~/components/icons/index";
import { Transaction } from "kysely";
import { store } from "~/store";
import { setWikiStore } from "../store";
import {
  defaultItemWithRelated,
  deleteItem,
  ItemSharedCardContent,
  ItemWithRelated,
  itemWithRelatedDic,
  itemWithRelatedFetcher,
  itemWithRelatedSchema,
  ItemWithSubObjectForm,
} from "./item";
import pick from "lodash-es/pick";

type OptionWithRelated = option & {};

const optionWithRelatedSchema = optionSchema.extend({});

const defaultOptionWithRelated: OptionWithRelated = {
  ...defaultData.option,
};

const OptionWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<option>(id, "Option");

const OptionsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("option", "option.itemId", "item.id")
    .selectAll(["item", "option"])
    .execute();
};

const createOption = async (trx: Transaction<DB>, value: option) => {
  return await trx.insertInto("option").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateOption = async (trx: Transaction<DB>, value: option) => {
  return await trx
    .updateTable("option")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteOption = async (trx: Transaction<DB>, itemId: string) => {
  await trx.deleteFrom("option").where("itemId", "=", itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, itemId);
};

export const OptionDataConfig: dataDisplayConfig<option & item, option & ItemWithRelated, option & ItemWithRelated> = {
  defaultData: {
    ...defaultData.option,
    ...defaultItemWithRelated,
  },
  dataFetcher: OptionWithItemFetcher,
  datasFetcher: OptionsFetcher,
  dataSchema: optionSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: OptionsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.option,
        fields: {
          ...dic.db.option.fields,
          ...dic.db.item.fields,
        },
      };
    },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "baseDef", desc: true },
    tdGenerator: {},
  },
  form: ({ data, dic }) => (
    <ItemWithSubObjectForm
      dic={dic}
      type="Option"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultOptionWithRelated,
        fieldsRender: (data, form) => {
          return (
            <For each={Object.entries(data)}>
              {(field, index) => {
                const fieldKey = field[0] as keyof option;
                const fieldValue = field[1];
                switch (fieldKey) {
                  case "itemId":
                    return null;
                  default:
                    return renderField<option, keyof option>(form, fieldKey, fieldValue, dic.db.option, optionSchema);
                }
              }}
            </For>
          );
        },
        fieldsHandler: async (trx, newOptionWithRelated, oldOptionWithRelated, item) => {
          const newOption = pick(newOptionWithRelated, Object.keys(defaultData.option) as (keyof option)[]);
          let optionItem: option;
          if (oldOptionWithRelated) {
            // 更新
            optionItem = await updateOption(trx, newOption);
          } else {
            // 新增
            optionItem = await createOption(trx, {
              ...newOption,
              itemId: item.id,
            });
          }
          setWikiStore("cardGroup", (pre) => [...pre, { type: "option", id: optionItem.itemId }]);
          setWikiStore("form", {
            data: undefined,
            isOpen: false,
          });
        },
      }}
    />
  ),
  card: ({ data, dic }) => {
    return (
      <>
        <div class="OptionImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<option & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.option,
            fields: {
              ...dic.db.option.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: optionSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "baseDef"],
            其他属性: ["modifiers", "details", "dataSources"],
            颜色信息: ["colorA", "colorB", "colorC"],
          },
        })}
        <ItemSharedCardContent data={data} dic={dic} />
        <Show when={data.createdByAccountId === store.session.user.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="FunGroup flex gap-1">
              <Button
                class="w-fit"
                icon={<Icons.Outline.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.transaction().execute(async (trx) => {
                    await deleteOption(trx, data.itemId);
                  });
                  // 关闭当前卡片
                  setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
                }}
              />
              <Button
                class="w-fit"
                icon={<Icons.Outline.Edit />}
                onclick={() => {
                  // 关闭当前卡片
                  setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
                  setWikiStore("form", { isOpen: true, data: data });
                }}
              />
            </div>
          </section>
        </Show>
      </>
    );
  },
};
