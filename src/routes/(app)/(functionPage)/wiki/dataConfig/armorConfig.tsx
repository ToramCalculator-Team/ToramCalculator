import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { armorSchema } from "../../../../../../db/generated/zod/index";
import { DB, item, armor } from "../../../../../../db/generated/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { defaultData } from "../../../../../../db/defaultData";
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
  ItemWithSubObjectForm,
} from "./item";
import { CardSharedSection } from "./utils";
import { pick } from "lodash-es";

type ArmorWithRelated = armor & {};

const armorWithRelatedSchema = armorSchema.extend({});

const defaultArmorWithRelated: ArmorWithRelated = {
  ...defaultData.armor,
};

const ArmorWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<armor>(id, "Armor");

const ArmorsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("armor", "armor.itemId", "item.id")
    .selectAll(["item", "armor"])
    .execute();
};

const createArmor = async (trx: Transaction<DB>, value: armor) => {
  return await trx.insertInto("armor").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateArmor = async (trx: Transaction<DB>, value: armor) => {
  return await trx
    .updateTable("armor")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteArmor = async (trx: Transaction<DB>, data: armor) => {
  await trx.deleteFrom("armor").where("itemId", "=", data.itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, data.itemId);
};

export const ArmorDataConfig: dataDisplayConfig<armor & item, armor & ItemWithRelated, armor & ItemWithRelated> = {
  defaultData: {
    ...defaultData.armor,
    ...defaultItemWithRelated,
  },
  dataFetcher: ArmorWithItemFetcher,
  datasFetcher: ArmorsFetcher,
  dataSchema: armorSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: ArmorsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.armor,
        fields: {
          ...dic.db.armor.fields,
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
      type="Armor"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultArmorWithRelated,
        fieldsRender: (data, form) => {
          return (
            <For each={Object.entries(data)}>
              {(field, index) => {
                const fieldKey = field[0] as keyof armor;
                const fieldValue = field[1];
                switch (fieldKey) {
                  case "itemId":
                    return null;
                  default:
                    return renderField<armor, keyof armor>(form, fieldKey, fieldValue, dic.db.armor, armorSchema);
                }
              }}
            </For>
          );
        },
        fieldsHandler: async (trx, newArmorWithRelated, oldArmorWithRelated, item) => {
          const newArmor = pick(newArmorWithRelated, Object.keys(defaultArmorWithRelated) as (keyof armor)[]);
          let armor: armor;
          if (oldArmorWithRelated) {
            // 更新
            armor = await updateArmor(trx, newArmor);
          } else {
            // 新增
            armor = await createArmor(trx, {
              ...newArmor,
              itemId: item.id,
            });
          }
          setWikiStore("cardGroup", (pre) => [...pre, { type: "armor", id: armor.itemId }]);
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
        <div class="ArmorImage bg-area-color h-[18vh] w-full rounded"></div>
        <ObjRender<armor & ItemWithRelated>
          data={data}
          dictionary={{
            ...dic.db.armor,
            fields: {
              ...dic.db.armor.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          }}
          dataSchema={armorSchema.extend(itemWithRelatedSchema.shape)}
          hiddenFields={["itemId"]}
          fieldGroupMap={{
            基本信息: ["name", "baseDef"],
            其他属性: ["modifiers", "details", "dataSources"],
            颜色信息: ["colorA", "colorB", "colorC"],
          }}
        />
        <ItemSharedCardContent data={data} dic={dic} />
        <CardSharedSection dic={dic} data={data} delete={deleteArmor} />
      </>
    );
  },
};
