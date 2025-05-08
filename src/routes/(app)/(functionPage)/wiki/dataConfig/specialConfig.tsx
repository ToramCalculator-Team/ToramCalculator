import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, specialSchema } from "~/../db/zod";
import { DB, item, special } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { createSpeEquip, findSpeEquipByItemId, findSpeEquips, SpeEquip } from "~/repositories/speEquip";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { createItem, Item } from "~/repositories/item";
import { Transaction } from "kysely";
import { pick, omit } from "lodash-es";

export type specialWithItem = special & item
export type SpecialCard = Item["Card"] & SpeEquip["Card"]

const specialWithItemSchema = z.object({
  ...itemSchema.shape,
  ...specialSchema.shape,
})

export const createSpecialDataConfig = (dic: Dic<specialWithItem>): dataDisplayConfig<specialWithItem, SpecialCard, {}> => ({
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
        accessorKey: "baseDef",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "modifiers",
        cell: (info) => info.getValue(),
        size: 200,
      },
    ],
    dataFetcher: findSpeEquips,
    defaultSort: { id: "itemType", desc: false },
    hiddenColumnDef: ["id", "itemId"],
    dictionary: dic,
    tdGenerator: (props: { cell: Cell<specialWithItem, keyof specialWithItem>; }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof specialWithItem;
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
          <Show
            when={true}
            fallback={tdContent()}
          >
            {"enumMap" in dic.fields[columnId]
              ? (dic.fields[columnId] as EnumFieldDetail<keyof specialWithItem>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: {
      ...defaultData.item,
      ...defaultData.special,
    },
    extraData: {},
    hiddenFields: ["id", "itemId", "itemType", "createdByAccountId", "updatedByAccountId", "statisticId"],
    dataSchema: specialWithItemSchema,
    dictionary: dic,
    fieldGenerators: {},
    onSubmit: async (data) => {
      const db = await getDB();
      const special = await db.transaction().execute(async (trx) => {
        const itemData = pick(data, Object.keys(defaultData.item) as (keyof item)[]);
        const specialData = omit(data, Object.keys(defaultData.item) as (keyof item)[]);
        const item = await createItem(trx, {
          ...itemData,
          itemType: "Special",
        });
        const special = await createSpeEquip(trx, {
          ...specialData,
          itemId: item.id,
        });
        return special;
      });
    },
  },
  card: {
    dataFetcher: findSpeEquipByItemId,
    cardRender: (data: specialWithItem, appendCardTypeAndIds: (updater: (prev: { type: keyof DB; id: string; }[]) => { type: keyof DB; id: string; }[]) => void) => {
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
          .select(["item.id as itemId", "item.name as itemName"])
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
          {DBDataRender<SpecialCard>({
            data,
            dictionary: dic,
            dataSchema: specialWithItemSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "baseDef"],
              其他属性: ["modifiers", "details", "dataSources"],
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
                    const itemType: keyof DB = (
                      {
                        Weapon: "weapon",
                        Armor: "armor",
                        Option: "option",
                        Special: "special",
                        Crystal: "crystal",
                        Consumable: "consumable",
                        Material: "material",
                      } satisfies Record<item["itemType"], keyof DB>
                    )[recipe.itemType];
                    return {
                      label: recipe.itemName + "(" + recipe.count + ")",
                      onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: itemType, id: recipe.itemId }]),
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
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "item", id: usedIn.itemId }]),
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

