import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { findItemById, findItems, Item } from "~/repositories/item";
import { DBdataDisplayConfig } from "./dataConfig";
import { itemSchema } from "~/../db/zod";
import { DB, item } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "../../../../../../db/defaultData";

export const createItemConfig = <T extends item["type"]>(type: T): DBdataDisplayConfig<"item", Item["Card"], any> => ({
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
        size: 220,
      },
      {
        accessorKey: "type",
        cell: (info) => info.getValue(),
        size: 150,
      },
      {
        accessorKey: "details",
        cell: (info) => info.getValue(),
        size: 150,
      },
    ],
    dataFetcher: () => findItems({ type }),
    defaultSort: { id: "name", desc: false },
    hiddenColumnDef: ["id"],
    tdGenerator: (props: { cell: Cell<item, keyof item>; dictionary: Dic<item> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof item;
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
          {"enumMap" in props.dictionary.fields[columnId]
            ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof item>).enumMap[props.cell.getValue()]
            : props.cell.getValue()}
        </td>
      );
    },
  },
  form: {
    data: defaultData.item,
    hiddenFields: ["id"],
    dataSchema: itemSchema,
    fieldGenerators: {},
  },
  card: {
    dataFetcher: (id: string) => findItemById(id, type),
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
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
            "item.type as itemType",
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
          <div class="ItemImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"item">({
            data,
            dictionary: dictionary,
            dataSchema: itemSchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name", "type", "details", "dataSources"],
            },
          })}

          <Show when={recipeData.latest?.length}>
            <CardSection
              title={dictionary.cardFields?.recipes ?? "合成配方"}
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
                      } satisfies Record<item["type"], keyof DB>
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
              title={dictionary.cardFields?.dropBy ?? "掉落于"}
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
              title={dictionary.cardFields?.rewardItem ?? "可从这些任务获得"}
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
              title={dictionary.cardFields?.usedIn ?? "是这些道具的原料"}
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
              title={dictionary.cardFields?.usedInTask ?? "是这些任务的材料"}
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
