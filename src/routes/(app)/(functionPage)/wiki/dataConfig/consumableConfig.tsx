import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { consumableSchema } from "~/../db/zod/index";
import { DB, item, consumable } from "~/../db/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { defaultData } from "~/../db/defaultData";
import { renderField } from "../utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import * as Icon from "~/components/icon";
import { Transaction } from "kysely";
import { store } from "~/store";
import { setWikiStore } from "../store";
import {
  defaultItemWithRelated,
  deleteItem,
  ItemSharedCardContent,
  ItemSharedFormDataSubmitor,
  ItemSharedFormField,
  ItemWithRelated,
  itemWithRelatedDic,
  itemWithRelatedFetcher,
  itemWithRelatedSchema,
} from "./item";
import { CardSharedSection } from "./utils";
import pick from "lodash-es/pick";

const ConsumableWithRelatedFetcher = async (id: string) => await itemWithRelatedFetcher<consumable>(id, "Consumable");

const ConsumablesFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "consumable.itemId", "item.id")
    .selectAll(["item", "consumable"])
    .execute();
};

const createConsumable = async (trx: Transaction<DB>, value: consumable) => {
  return await trx.insertInto("consumable").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateConsumable = async (trx: Transaction<DB>, value: consumable) => {
  return await trx
    .updateTable("consumable")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteConsumable = async (trx: Transaction<DB>, data: consumable & ItemWithRelated) => {
  await trx.deleteFrom("consumable").where("itemId", "=", data.id).executeTakeFirstOrThrow();
  await deleteItem(trx, data.id);
};

const ConsumableWithRelatedForm = (dic: dictionary, oldConsumableWithRelated?: consumable & ItemWithRelated) => {
  const oldConsumable =
    oldConsumableWithRelated &&
    pick(oldConsumableWithRelated, Object.keys(defaultData.consumable) as (keyof consumable)[]);
  const oldItem =
    oldConsumableWithRelated &&
    pick(oldConsumableWithRelated, Object.keys(defaultItemWithRelated) as (keyof ItemWithRelated)[]);
  const consumableFormFieldInitialValues = oldConsumable ?? defaultData.consumable;
  const itemFormFieldInitialValues = oldItem ?? defaultItemWithRelated;
  const formInitialValues = oldConsumableWithRelated ?? {
    ...defaultData.consumable,
    ...defaultItemWithRelated,
  };
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newConsumableWithRelated }) => {
      const newConsumable = pick(newConsumableWithRelated, Object.keys(defaultData.consumable) as (keyof consumable)[]);
      const newItem = pick(newConsumableWithRelated, Object.keys(defaultItemWithRelated) as (keyof ItemWithRelated)[]);
      console.log(
        "oldConsumableWithRelated",
        oldConsumableWithRelated,
        "newConsumableWithRelated",
        newConsumableWithRelated,
      );
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        const item = await ItemSharedFormDataSubmitor(trx, "Consumable", newItem, oldItem);
        let consumableItem: consumable;
        if (oldConsumable) {
          // 更新
          consumableItem = await updateConsumable(trx, newConsumable);
        } else {
          // 新增
          consumableItem = await createConsumable(trx, {
            ...newConsumable,
            itemId: item.id,
          });
        }
        setWikiStore("cardGroup", (pre) => [...pre, { type: "consumable", id: consumableItem.itemId }]);
        setWikiStore("form", {
          data: undefined,
          isOpen: false,
        });
      });
    },
  }));

  onMount(() => {
    console.log(form.state.values);
  });

  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.consumable.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(consumableFormFieldInitialValues)}>
          {(field, index) => {
            const fieldKey = field[0] as keyof consumable;
            const fieldValue = field[1];
            switch (fieldKey) {
              case "itemId":
                return null;
              default:
                return renderField<consumable, keyof consumable>(
                  form,
                  fieldKey,
                  fieldValue,
                  dic.db.consumable,
                  consumableSchema,
                );
            }
          }}
        </For>
        {ItemSharedFormField(dic, itemFormFieldInitialValues, form)}
        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          children={(state) => (
            <div class="flex items-center gap-1">
              <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                {state().isSubmitting ? "..." : dic.ui.actions.add}
              </Button>
            </div>
          )}
        />
      </form>
    </div>
  );
};

export const ConsumableDataConfig: dataDisplayConfig<
  consumable & item,
  consumable & ItemWithRelated,
  consumable & ItemWithRelated
> = {
  defaultData: {
    ...defaultData.consumable,
    ...defaultItemWithRelated,
  },
  dataFetcher: ConsumableWithRelatedFetcher,
  datasFetcher: ConsumablesFetcher,
  dataSchema: consumableSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: ConsumablesFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 150 },
      { accessorKey: "effectDuration", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "effects", cell: (info: any) => info.getValue(), size: 150 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.consumable,
        fields: {
          ...dic.db.consumable.fields,
          ...dic.db.item.fields,
        },
      };
    },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "id", desc: true },
    tdGenerator: {},
  },
  form: ({ dic, data }) => ConsumableWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
    return (
      <>
        <div class="ConsumableImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<consumable & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.consumable,
            fields: {
              ...dic.db.consumable.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: consumableSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "type", "effectDuration", "effects"],
            其他属性: ["details", "dataSources"],
          },
        })}
        <ItemSharedCardContent data={data} dic={dic} />
        <CardSharedSection dic={dic} data={data} delete={deleteConsumable} />
      </>
    );
  },
};
