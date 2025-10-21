import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "@db/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { consumableSchema } from "@db/generated/zod/index";
import { DB, item, consumable } from "@db/generated/zod/index";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { defaultData } from "@db/defaultData";
import { fieldInfo, renderField } from "../utils";
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
  ItemSharedFormDataSubmitor,
  ItemSharedFormField,
  ItemWithRelated,
  itemWithRelatedDic,
  itemWithRelatedFetcher,
  itemWithRelatedSchema,
  ItemWithSubObjectForm,
} from "./item";
import { CardSharedSection } from "./utils";
import pick from "lodash-es/pick";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { ConsumableType } from "@db/schema/enums";

type ConsumableWithRelated = consumable & {};

const consumableWithRelatedSchema = consumableSchema.extend({});

const defaultConsumableWithRelated: ConsumableWithRelated = {
  ...defaultData.consumable,
};

const ConsumableWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<consumable>(id, "Consumable");

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

export const ConsumableDataConfig: dataDisplayConfig<
  consumable & item,
  consumable & ItemWithRelated,
  consumable & ItemWithRelated
> = {
  defaultData: {
    ...defaultData.consumable,
    ...defaultItemWithRelated,
  },
  dataFetcher: ConsumableWithItemFetcher,
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
  form: ({ dic, data }) => (
    <ItemWithSubObjectForm
      dic={dic}
      type="Consumable"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultConsumableWithRelated,
        fieldsRender: (data, form) => {
          return (
            <For each={Object.entries(data)}>
              {(field, index) => {
                const fieldKey = field[0] as keyof consumable;
                const fieldValue = field[1];
                switch (fieldKey) {
                  case "itemId":
                    return null;
                  case "type":
                    return (
                      <form.Field
                        name={fieldKey}
                        validators={{
                          onChangeAsyncDebounceMs: 500,
                          onChangeAsync: consumableWithRelatedSchema.shape[fieldKey],
                        }}
                      >
                        {(field) => (
                          <Input
                            title={dic.db.consumable.fields[fieldKey].key}
                            description={dic.db.consumable.fields[fieldKey].formFieldDescription}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border"
                          >
                            <Select
                              value={field().state.value}
                              setValue={(value) => field().setValue(value as ConsumableType)}
                              options={Object.entries(dic.db.consumable.fields.type.enumMap).map(([key, value]) => ({
                                label: value,
                                value: key,
                              }))}
                              optionGenerator={(option, selected, handleSelect) => {
                                return (
                                  <div
                                    class={`hover:bg-area-color flex cursor-pointer gap-3 px-3 py-2 ${selected ? "bg-area-color" : ""}`}
                                    onClick={handleSelect}
                                  >
                                    <Icons.Spirits iconName={option.value} size={24} />
                                    {option.label}
                                  </div>
                                );
                              }}
                            />
                          </Input>
                        )}
                      </form.Field>
                    );

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
          );
        },
        fieldsHandler: async (trx, newConsumableWithRelated, oldConsumableWithRelated, item) => {
          const newConsumable = pick(
            newConsumableWithRelated,
            Object.keys(defaultData.consumable) as (keyof consumable)[],
          );

          let consumableItem: consumable;
          if (oldConsumableWithRelated) {
            // 更新
            consumableItem = await updateConsumable(trx, newConsumable);
          } else {
            // 新增
            consumableItem = await createConsumable(trx, {
              ...newConsumable,
              itemId: item.id,
            });
          }
          setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "consumable", id: consumableItem.itemId });
          setWikiStore("form", {
            data: undefined,
            isOpen: false,
          });
        },
      }}
    />
  ),
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
