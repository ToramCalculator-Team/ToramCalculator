import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, specialSchema } from "~/../db/zod";
import { DB, item, special } from "~/../db/kysely/kyesely";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { createSpeEquip, SpeEquip } from "~/repositories/speEquip";
import { createItem, findItems, Item } from "~/repositories/item";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { EnumSelect } from "~/components/controls/enumSelect";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import omit from "lodash-es/omit";
import { itemTypeToTableType } from "./utils";
import { createForm, Field } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import * as Icon from "~/components/icon";

type specialWithItem = special & item;

const specialWithItemSchema = z.object({
  ...itemSchema.shape,
  ...specialSchema.shape,
});

const defaultSpeEquipWithItem: specialWithItem = {
  ...defaultData.item,
  ...defaultData.special,
};

const SpeEquipWithItemWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.special,
  fields: {
    ...dic.db.special.fields,
    ...dic.db.item.fields,
  },
});

const SpeEquipWithItemForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultSpeEquipWithItem,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const special = await db.transaction().execute(async (trx) => {
        const itemData = pick(value, Object.keys(defaultData.item) as (keyof item)[]);
        const specialData = omit(value, Object.keys(defaultData.item) as (keyof item)[]);
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
      handleSubmit("special", special.itemId);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.special.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultSpeEquipWithItem)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof specialWithItem;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "itemId":
              case "itemType":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              default:
                return renderField<specialWithItem, keyof specialWithItem>(
                  form,
                  fieldKey,
                  fieldValue,
                  SpeEquipWithItemWithRelatedDic(dic),
                  specialWithItemSchema,
                );
            }
          }}
        </For>
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

export const createSpeEquipDataConfig = (dic: dictionary): dataDisplayConfig<specialWithItem, special & item> => ({
  defaultData: defaultSpeEquipWithItem,
  dataFetcher: async (id) => {
    const db = await getDB();
    return await db
      .selectFrom("item")
      .where("id", "=", id)
      .innerJoin("special", "special.itemId", "item.id")
      .selectAll(["item", "special"])
      .executeTakeFirstOrThrow();
  },
  datasFetcher: async () => {
    const db = await getDB();
    return await db
      .selectFrom("item")
      .innerJoin("special", "special.itemId", "item.id")
      .selectAll(["item", "special"])
      .execute();
  },
  dictionary: dic,
  dataSchema: specialWithItemSchema,
  table: {
    columnDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dic: SpeEquipWithItemWithRelatedDic(dic),
    defaultSort: { id: "baseDef", desc: true },
    hiddenColumns: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    tdGenerator: {},
  },
  form: (handleSubmit) => SpeEquipWithItemForm(dic, handleSubmit),
  card: {
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
          {DBDataRender<specialWithItem>({
            data,
            dictionary: SpeEquipWithItemWithRelatedDic(dic),
            dataSchema: specialWithItemSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "baseDef"],
              其他属性: ["modifiers", "details", "dataSources"],
            },
          })}

          <Show when={recipeData.latest?.length}>
            <CardSection
              title={dic.db.recipe.selfName}
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
                      onClick: () =>
                        appendCardTypeAndIds((prev) => [
                          ...prev,
                          { type: itemTypeToTableType(recipe.itemType), id: recipe.itemId },
                        ]),
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
              title={"掉落于" + dic.db.mob.selfName}
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
              title={"可从这些" + dic.db.task.selfName + "获得"}
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
              title={"是这些" + dic.db.item.selfName + "的原料"}
              data={usedInRecipeData.latest}
              renderItem={(usedIn) => {
                return {
                  label: usedIn.itemName,
                  onClick: () =>
                    appendCardTypeAndIds((prev) => [
                      ...prev,
                      { type: itemTypeToTableType(usedIn.itemType), id: usedIn.itemId },
                    ]),
                };
              }}
            />
          </Show>
          <Show when={usedInTaskData.latest?.length}>
            <CardSection
              title={"被用于" + dic.db.task.selfName}
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
