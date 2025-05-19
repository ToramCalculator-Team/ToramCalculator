import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, materialSchema } from "~/../db/zod";
import { DB, item, material } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { createMaterial } from "~/repositories/material";
import { createItem } from "~/repositories/item";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import omit from "lodash-es/omit";
import { itemTypeToTableType } from "./utils";
import { createForm, Field } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { ElementType, MaterialType } from "../../../../../../db/kysely/enums";
import * as Icon from "~/components/icon";

type materialWithRelated = material & item;

const materialWithRelatedSchema = z.object({
  ...itemSchema.shape,
  ...materialSchema.shape,
});

const defaultMaterialWithRelated: materialWithRelated = {
  ...defaultData.item,
  ...defaultData.material,
};

const MaterialWithRelatedWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.material,
  fields: {
    ...dic.db.material.fields,
    ...dic.db.item.fields,
  },
});

const MaterialWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultMaterialWithRelated,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const material = await db.transaction().execute(async (trx) => {
        const itemData = pick(value, Object.keys(defaultData.item) as (keyof item)[]);
        const materialData = omit(value, Object.keys(defaultData.item) as (keyof item)[]);
        const item = await createItem(trx, {
          ...itemData,
          itemType: "Material",
        });
        const material = await createMaterial(trx, {
          ...materialData,
          itemId: item.id,
        });
        return material;
      });
      handleSubmit("material", material.itemId);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.material.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultMaterialWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof materialWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "itemId":
              case "itemType":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "type":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{ onChangeAsyncDebounceMs: 500, onChangeAsync: materialWithRelatedSchema.shape[fieldKey] }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.material.fields[fieldKey].key}
                        description={dic.db.material.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Select
                          value={field().state.value}
                          setValue={(value) => field().setValue(value as MaterialType)}
                          options={Object.entries(dic.db.material.fields.type.enumMap).map(([key, value]) => ({
                            label: value,
                            value: key,
                          }))}
                        />
                      </Input>
                    )}
                  </form.Field>
                );
              default:
                return renderField<materialWithRelated, keyof materialWithRelated>(
                  form,
                  fieldKey,
                  fieldValue,
                  MaterialWithRelatedWithRelatedDic(dic),
                  materialWithRelatedSchema,
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

export const createMaterialDataConfig = (dic: dictionary): dataDisplayConfig<materialWithRelated, material & item> => ({
  defaultData: defaultMaterialWithRelated,
  dataFetcher: async (id) => {
    const db = await getDB();
    return await db
      .selectFrom("item")
      .where("id", "=", id)
      .innerJoin("material", "material.itemId", "item.id")
      .selectAll(["item", "material"])
      .executeTakeFirstOrThrow();
  },
  datasFetcher: async () => {
    const db = await getDB();
    return await db
      .selectFrom("item")
      .innerJoin("material", "material.itemId", "item.id")
      .selectAll(["item", "material"])
      .execute();
  },
  dictionary: dic,
  dataSchema: materialWithRelatedSchema,
  table: {
    columnDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 150 },
      { accessorKey: "price", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "ptValue", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dic: MaterialWithRelatedWithRelatedDic(dic),
    defaultSort: { id: "id", desc: true },
    hiddenColumns: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    tdGenerator: {},
  },
  form: (handleSubmit) => MaterialWithRelatedForm(dic, handleSubmit),
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
          <div class="MaterialImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<materialWithRelated>({
            data,
            dictionary: MaterialWithRelatedWithRelatedDic(dic),
            dataSchema: materialWithRelatedSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "type", "price", "ptValue"],
              其他属性: ["details", "dataSources"],
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
