import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "@db/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { specialSchema } from "@db/generated/zod/index";
import { DB, item, special } from "@db/generated/zod/index";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { defaultData } from "@db/defaultData";
import { renderField } from "../utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import Icons from "~/components/icons/index";
import { Transaction } from "kysely";
import { setStore, store } from "~/store";
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

type SpecialWithRelated = special & {};

const specialWithRelatedSchema = specialSchema.extend({});

const defaultSpecialWithRelated: SpecialWithRelated = {
  ...defaultData.special,
};

const SpecialWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<special>(id, "Special");

const SpecialsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("special", "special.itemId", "item.id")
    .selectAll(["item", "special"])
    .execute();
};

const createSpecial = async (trx: Transaction<DB>, value: special) => {
  return await trx.insertInto("special").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateSpecial = async (trx: Transaction<DB>, value: special) => {
  return await trx
    .updateTable("special")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteSpecial = async (trx: Transaction<DB>, itemId: string) => {
  await trx.deleteFrom("special").where("itemId", "=", itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, itemId);
};

export const SpecialDataConfig: dataDisplayConfig<
  special & item,
  special & ItemWithRelated,
  special & ItemWithRelated
> = {
  defaultData: {
    ...defaultData.special,
    ...defaultItemWithRelated,
  },
  dataFetcher: SpecialWithItemFetcher,
  datasFetcher: SpecialsFetcher,
  dataSchema: specialSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: SpecialsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseAbi", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.special,
        fields: {
          ...dic.db.special.fields,
          ...dic.db.item.fields,
        },
      };
    },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "baseAbi", desc: true },
    tdGenerator: {},
  },
  form: ({ data, dic }) => (
    <ItemWithSubObjectForm
      dic={dic}
      type="Special"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultSpecialWithRelated,
        fieldsRender: (data, form) => {
          return (
            <For each={Object.entries(data)}>
              {(field, index) => {
                const fieldKey = field[0] as keyof special;
                const fieldValue = field[1];
                switch (fieldKey) {
                  case "itemId":
                    return null;
                  default:
                    return renderField<special, keyof special>(
                      form,
                      fieldKey,
                      fieldValue,
                      dic.db.special,
                      specialSchema,
                    );
                }
              }}
            </For>
          );
        },
        fieldsHandler: async (trx, newSpecialWithRelated, oldSpecialWithRelated, item) => {
          const newSpecial = pick(newSpecialWithRelated, Object.keys(defaultData.special) as (keyof special)[]);
          let specialItem: special;
          if (oldSpecialWithRelated) {
            // 更新
            specialItem = await updateSpecial(trx, newSpecial);
          } else {
            // 新增
            specialItem = await createSpecial(trx, {
              ...newSpecial,
              itemId: item.id,
            });
          }
          setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "special", id: specialItem.itemId });
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
        <div class="SpecialImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<special & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.special,
            fields: {
              ...dic.db.special.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: specialSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "baseAbi"],
            其他属性: ["modifiers", "details", "dataSources"],
          },
        })}
        <ItemSharedCardContent data={data} dic={dic} />
        <Show when={data.createdByAccountId === store.session.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-px w-full flex-1" />
            </h3>
            <div class="FunGroup flex gap-1">
              <Button
                class="w-fit"
                icon={<Icons.Outline.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.transaction().execute(async (trx) => {
                    await deleteSpecial(trx, data.itemId);
                  });
                  // 关闭当前卡片
                  setStore("pages","cardGroup", (pre) => pre.slice(0, -1));
                }}
              />
              <Button
                class="w-fit"
                icon={<Icons.Outline.Edit />}
                onclick={() => {
                  // 关闭当前卡片
                  setStore("pages","cardGroup", (pre) => pre.slice(0, -1));
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
