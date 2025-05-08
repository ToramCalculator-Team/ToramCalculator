import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, weaponSchema } from "~/../db/zod";
import { DB, item, weapon } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { createWeapon, findItemWithWeaponById, findWeapons, Weapon } from "~/repositories/weapon";
import { createItem, findItems, Item } from "~/repositories/item";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { EnumSelect } from "~/components/controls/enumSelect";
import { fieldInfo } from "../utils";
import pick from "lodash-es/pick";
import omit from "lodash-es/omit";
import { itemTypeToTableType } from "./utils";

export type weaponWithItem = weapon & item;
export type WeaponCard = Item["Card"] & Weapon["Card"];

const weaponWithItemSchema = z.object({
  ...itemSchema.shape,
  ...weaponSchema.shape,
});

export const createWeaponDataConfig = (
  dic: Dic<weaponWithItem>,
): dataDisplayConfig<weaponWithItem, WeaponCard, {}> => ({
  table: {
    columnDef: [
      {
        accessorKey: "id",
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "name",
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "itemId",
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "itemType",
        cell: (info) => info.getValue(),
        size: 150,
      },
      {
        accessorKey: "baseAbi",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "stability",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "elementType",
        cell: (info) => info.getValue(),
        size: 150,
      },
    ],
    dataFetcher: findWeapons,
    defaultSort: { id: "itemType", desc: false },
    hiddenColumnDef: ["id", "itemId"],
    dictionary: dic,
    tdGenerator: (props: { cell: Cell<weaponWithItem, keyof weaponWithItem> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof weaponWithItem;
      switch (columnId) {
        default:
          setTdContent(flexRender(props.cell.column.columnDef.cell, props.cell.getContext()));
          break;
      }
      return (
        <td
          style={{
            ...getCommonPinningStyles(props.cell.column),
            width: getCommonPinningStyles(props.cell.column).width + "px",
          }}
          class={defaultTdClass}
        >
          <Show when={true} fallback={tdContent()}>
            {"enumMap" in dic.fields[columnId]
              ? (dic.fields[columnId] as EnumFieldDetail<keyof weaponWithItem>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: {
      ...defaultData.item,
      ...defaultData.weapon,
    },
    extraData: {},
    hiddenFields: ["id", "itemId", "itemType", "createdByAccountId", "updatedByAccountId", "statisticId"],
    dataSchema: weaponWithItemSchema,
    dictionary: dic,
    fieldGenerators: {
      type: (key, field) => {
        const zodValue = weaponSchema.shape[key];
        return (
          <EnumSelect
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            options={zodValue.options}
            field={field}
            dic={dic.fields[key].enumMap}
          />
        );
      },
      elementType: (key, field) => {
        const zodValue = weaponSchema.shape[key];
        return (
          <EnumSelect
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            options={zodValue.options}
            field={field}
            dic={dic.fields[key].enumMap}
          />
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const weapon = await db.transaction().execute(async (trx) => {
        const itemData = pick(data, Object.keys(defaultData.item) as (keyof item)[]);
        const weaponData = omit(data, Object.keys(defaultData.item) as (keyof item)[]);
        const item = await createItem(trx, {
          ...itemData,
          itemType: "Weapon",
        });
        const weapon = await createWeapon(trx, {
          ...weaponData,
          itemId: item.id,
        });
        return weapon;
      });
    },
  },
  card: {
    dataFetcher: findItemWithWeaponById,
    cardRender: (data, appendCardTypeAndIds) => {
      const [recipeData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("recipe")
          .where("recipe.itemId", "=", itemId)
          .innerJoin("recipe_ingredient", "recipe.id", "recipe_ingredient.recipeId")
          .innerJoin("item", "recipe_ingredient.itemId", "item.id")
          .select([
            "recipe_ingredient.type",
            "recipe_ingredient.count",
            "item.id as itemId",
            "item.itemType as itemType",
            "item.name as itemName",
          ])
          .execute();
      });

      const [dropByData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("drop_item")
          .innerJoin("mob", "drop_item.dropById", "mob.id")
          .where("drop_item.itemId", "=", itemId)
          .select(["mob.id as mobId", "mob.name as mobName"])
          .execute();
      });

      const [rewardItemData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_reward")
          .innerJoin("task", "task_reward.taskId", "task.id")
          .where("task_reward.itemId", "=", itemId)
          .select(["task.id as taskId", "task.name as taskName"])
          .execute();
      });

      const [usedInRecipeData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("recipe_ingredient")
          .innerJoin("recipe", "recipe_ingredient.recipeId", "recipe.id")
          .innerJoin("item", "recipe_ingredient.itemId", "item.id")
          .where("recipe_ingredient.itemId", "=", itemId)
          .select(["item.id as itemId", "item.name as itemName", "item.itemType as itemType"])
          .execute();
      });

      const [usedInTaskData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_collect_require")
          .innerJoin("task", "task_collect_require.taskId", "task.id")
          .where("task_collect_require.itemId", "=", itemId)
          .select(["task.id as taskId", "task.name as taskName"])
          .execute();
      });
      return (
        <>
          {DBDataRender<WeaponCard>({
            data,
            dictionary: dic,
            dataSchema: weaponWithItemSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "type", "baseAbi", "stability", "elementType"],
              其他属性: ["modifiers", "details", "dataSources", "colorA", "colorB", "colorC"],
            },
          })}

          <Show when={recipeData.latest?.length}>
            <CardSection
              title={dic.cardFields?.recipes ?? "合成配方"}
              data={recipeData.latest}
              renderItem={(recipe) => {
                const type = recipe.type;
                switch (type) {
                  case "Gold":
                    return {
                      label: recipe.itemName,
                      onClick: () => null,
                    };

                  case "Item":
                    return {
                      label: recipe.itemName + "(" + recipe.count + ")",
                      onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: itemTypeToTableType(recipe.itemType), id: recipe.itemId }]),
                    };
                  default:
                    return {
                      label: recipe.itemName,
                      onClick: () => null,
                    };
                }
              }}
            />
          </Show>
          <Show when={dropByData.latest?.length}>
            <CardSection
              title={dic.cardFields?.dropBy ?? "掉落于"}
              data={dropByData.latest}
              renderItem={(dropBy) => {
                return {
                  label: dropBy.mobName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: dropBy.mobId }]),
                };
              }}
            />
          </Show>
          <Show when={rewardItemData.latest?.length}>
            <CardSection
              title={dic.cardFields?.rewarditem ?? "可从这些任务获得"}
              data={rewardItemData.latest}
              renderItem={(rewardItem) => {
                return {
                  label: rewardItem.taskName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: rewardItem.taskId }]),
                };
              }}
            />
          </Show>
          <Show when={usedInRecipeData.latest?.length}>
            <CardSection
              title={dic.cardFields?.usedIn ?? "是这些道具的原料"}
              data={usedInRecipeData.latest}
              renderItem={(usedIn) => {
                return {
                  label: usedIn.itemName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: itemTypeToTableType(usedIn.itemType), id: usedIn.itemId }]),
                };
              }}
            />
          </Show>
          <Show when={usedInTaskData.latest?.length}>
            <CardSection
              title={dic.cardFields?.usedInTask ?? "是这些任务的材料"}
              data={usedInTaskData.latest}
              renderItem={(usedInTask) => {
                return {
                  label: usedInTask.taskName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: usedInTask.taskId }]),
                };
              }}
            />
          </Show>
        </>
      );
    },
  },
});
