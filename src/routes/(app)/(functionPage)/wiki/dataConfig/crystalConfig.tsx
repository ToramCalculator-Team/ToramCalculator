import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, Index, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, crystalSchema } from "~/../db/zod";
import { DB, item, crystal } from "~/../db/kysely/kyesely";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { createCrystal } from "~/repositories/crystal";
import { createItem } from "~/repositories/item";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import omit from "lodash-es/omit";
import { itemTypeToTableType } from "./utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import * as Icon from "~/components/icon";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { createId } from "@paralleldrive/cuid2";

type crystalWithItem = crystal &
  item & {
    front: Array<crystal & item>;
    back: Array<crystal & item>;
  };

const crystalWithItemSchema = z.object({
  ...itemSchema.shape,
  ...crystalSchema.shape,
  front: z.array(crystalSchema.extend(itemSchema.shape)),
  back: z.array(crystalSchema.extend(itemSchema.shape)),
});

const defaultCrystalWithItem: crystalWithItem = {
  ...defaultData.item,
  ...defaultData.crystal,
  front: [],
  back: [],
};

const CrystalWithItemWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.crystal,
  fields: {
    ...dic.db.crystal.fields,
    ...dic.db.item.fields,
    front: {
      key: "front",
      tableFieldDescription: dic.db.item.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.item.fields.name.formFieldDescription,
    },
    back: {
      key: "back",
      tableFieldDescription: dic.db.item.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.item.fields.name.formFieldDescription,
    },
  },
});

const CrystalWithItemForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultCrystalWithItem,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const { front, back, ...rest } = value;
      const crystal = await db.transaction().execute(async (trx) => {
        const itemData = pick(rest, Object.keys(defaultData.item) as (keyof item)[]);
        const crystalData = omit(rest, Object.keys(defaultData.item) as (keyof item)[]);
        const item = await createItem(trx, {
          ...itemData,
          id: createId(),
          itemType: "Crystal",
        });
        const crystal = await createCrystal(trx, {
          ...crystalData,
          itemId: item.id,
        });
        for (const frontCrystal of front) {
          await trx.insertInto("_frontRelation").values({
            A: item.id,
            B: frontCrystal.itemId,
          }).execute();
        }
        for (const backCrystal of back) {
          await trx.insertInto("_backRelation").values({
            A: item.id,
            B: backCrystal.itemId,
          }).execute();
        }

        return crystal;
      });
      handleSubmit("crystal", crystal.itemId);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.crystal.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultCrystalWithItem)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof crystalWithItem;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "itemId":
              case "itemType":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "front":
              case "back":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: crystalWithItemSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return (
                        <Input
                          title={(fieldKey === "front" ? "前置" : "后置") + dic.db.crystal.selfName}
                          description={dic.db.crystal.description}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <div class="ArrayBox flex w-full flex-col gap-2">
                            <Index each={field().state.value}>
                              {(item, index) => {
                                return (
                                  <div class="Filed flex items-center gap-2">
                                    <label for={fieldKey + index} class="flex-1">
                                      <Autocomplete
                                        id={fieldKey + index}
                                        initialValue={item()}
                                        setValue={(value) => {
                                          field().setValue((pre) => {
                                            const newArray = [...pre];
                                            newArray[index] = value;
                                            return newArray;
                                          });
                                        }}
                                        datasFetcher={async () => {
                                          const db = await getDB();
                                          const crystals = await db
                                            .selectFrom("crystal")
                                            .innerJoin("item", "crystal.itemId", "item.id")
                                            .selectAll(["crystal", "item"])
                                            .execute();
                                          return crystals;
                                        }}
                                        displayField="name"
                                        valueField="id"
                                      />
                                    </label>
                                    <Button
                                      onClick={(e) => {
                                        field().removeValue(index);
                                        e.stopPropagation();
                                      }}
                                    >
                                      -
                                    </Button>
                                  </div>
                                );
                              }}
                            </Index>
                            <Button
                              onClick={(e) => {
                                field().pushValue({
                                  ...defaultData.crystal,
                                  ...defaultData.item,
                                });
                              }}
                              class="w-full"
                            >
                              +
                            </Button>
                          </div>
                        </Input>
                      );
                    }}
                  </form.Field>
                );

              default:
                return renderField<crystalWithItem, keyof crystalWithItem>(
                  form,
                  fieldKey,
                  fieldValue,
                  CrystalWithItemWithRelatedDic(dic),
                  crystalWithItemSchema,
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

export const createCrystalDataConfig = (dic: dictionary): dataDisplayConfig<crystalWithItem> => ({
  defaultData: defaultCrystalWithItem,
  dataFetcher: async (id) => {
    const db = await getDB();
    const result = await db
      .selectFrom("item")
      .where("id", "=", id)
      .innerJoin("crystal", "crystal.itemId", "item.id")
      .selectAll(["item", "crystal"])
      .select((eb) => [
        jsonArrayFrom(
          eb.selectFrom("_frontRelation").whereRef("_frontRelation.A", "=", "item.id").selectAll(["crystal", "item"]),
        ).as("front"),
        jsonArrayFrom(
          eb
            .selectFrom("_backRelation")
            .whereRef("_backRelation.A", "=", "crystal.itemId")
            .selectAll(["crystal", "item"]),
        ).as("back"),
      ])
      .executeTakeFirstOrThrow();

    return result;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const result = await db
      .selectFrom("item")
      .innerJoin("crystal", "crystal.itemId", "item.id")
      .selectAll(["item", "crystal"])
      .select((eb) => [
        jsonArrayFrom(
          eb.selectFrom("_frontRelation").whereRef("_frontRelation.A", "=", "item.id").selectAll(["crystal", "item"]),
        ).as("front"),
        jsonArrayFrom(
          eb
            .selectFrom("_backRelation")
            .whereRef("_backRelation.A", "=", "crystal.itemId")
            .selectAll(["crystal", "item"]),
        ).as("back"),
      ])
      .execute();

    return result;
  },
  dictionary: dic,
  dataSchema: crystalWithItemSchema,
  table: {
    measure: {
      estimateSize: 168,
    },
    columnDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 150 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "modifiers", cell: (info: any) => info.getValue(), size: 260 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "details", cell: (info: any) => info.getValue(), size: 150 },
    ],
    dic: CrystalWithItemWithRelatedDic(dic),
    defaultSort: { id: "name", desc: true },
    hiddenColumns: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    tdGenerator: {
      modifiers: (props) => (
        <div class="ModifierBox bg-area-color flex flex-col gap-1 rounded-r-md">
          <For each={props.cell.getValue<string[]>()}>
            {(modifier) => {
              return <div class="bg-area-color w-full p-1">{modifier}</div>;
            }}
          </For>
        </div>
      ),
    },
  },
  form: (handleSubmit) => CrystalWithItemForm(dic, handleSubmit),
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

      const [frontData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("crystal")
          .innerJoin("item", "crystal.itemId", "item.id")
          .where("crystal.itemId", "=", itemId)
          .selectAll(["crystal", "item"])
          .execute();
      });

      const [backData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("crystal")
          .innerJoin("item", "crystal.itemId", "item.id")
          .where("crystal.itemId", "=", itemId)
          .selectAll(["crystal", "item"])
          .execute();
      });

      return (
        <>
          {DBDataRender<crystalWithItem>({
            data,
            dictionary: CrystalWithItemWithRelatedDic(dic),
            dataSchema: crystalWithItemSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "modifiers", "type"],
              其他属性: ["details", "dataSources"],
            },
          })}
          <Show when={frontData.latest?.length}>
            <CardSection
              title={"前置" + dic.db.crystal.selfName}
              data={frontData.latest}
              renderItem={(front) => {
                return {
                  label: front.name,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "crystal", id: front.itemId }]),
                };
              }}
            />
          </Show>
          <Show when={backData.latest?.length}>
            <CardSection
              title={"后置" + dic.db.crystal.selfName}
              data={backData.latest}
              renderItem={(back) => {
                return {
                  label: back.name,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "crystal", id: back.itemId }]),
                };
              }}
            />
          </Show>
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
