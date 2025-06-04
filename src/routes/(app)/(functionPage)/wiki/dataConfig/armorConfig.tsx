import { Accessor, createEffect, createResource, createSignal, For, Index, JSX, on, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import {
  itemSchema,
  armorSchema,
  recipeSchema,
  recipe_ingredientSchema,
  drop_itemSchema,
  task_rewardSchema,
  task_collect_requireSchema,
} from "~/../db/zod";
import { DB, item, armor, recipe, mob, task, recipe_ingredient, drop_item, task_reward, task_collect_require } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { defaultData } from "~/../db/defaultData";
import { z } from "zod";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import { createItem, defaultItemWithRelated, deleteItem, ItemSharedCardContent, ItemWithRelated, itemWithRelatedDic, itemWithRelatedFetcher, itemWithRelatedSchema, updateItem } from "./utils";
import { createForm, Field } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import * as Icon from "~/components/icon";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Toggle } from "~/components/controls/toggle";
import { BossPartBreakRewardType, BossPartType, RecipeIngredientType } from "~/../db/kysely/enums";
import { createId } from "@paralleldrive/cuid2";
import { Transaction } from "kysely";
import { store } from "~/store";
import { setWikiStore } from "../store";
import { createStatistic } from "~/repositories/statistic";

// form和card的数据类型
type armorWithRelated = armor & ItemWithRelated;

const armorWithRelatedSchema = z.object({
  ...armorSchema.shape,
  ...itemWithRelatedSchema.shape,
});

const defaultArmorWithRelated: armorWithRelated = {
  ...defaultData.armor,
  ...defaultItemWithRelated,
};

const ArmorWithRelatedWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.armor,
  fields: {
    ...dic.db.armor.fields,
    ...itemWithRelatedDic(dic).fields,
  },
});

const ArmorWithRelatedFetcher = async (id: string) => await itemWithRelatedFetcher<armor>(id, "Armor");

const ArmorsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("armor", "armor.itemId", "item.id")
    .selectAll(["item", "armor"])
    .execute();
};

const createArmor = async (trx: Transaction<DB>, value: armor) => {
  return await trx
  .insertInto("armor")
  .values(value)
  .returningAll()
  .executeTakeFirstOrThrow();
};

const updateArmor = async (trx: Transaction<DB>, value: armor) => {
  return await trx
  .updateTable("armor")
  .set(value)
  .where("itemId", "=", value.itemId)
  .returningAll()
  .executeTakeFirstOrThrow();
};

const deleteArmor = async (trx: Transaction<DB>, itemId: string) => {
  await trx.deleteFrom("armor").where("itemId", "=", itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, itemId);
};

const ArmorWithRelatedForm = (dic: dictionary, data?: armorWithRelated) => {
  const form = createForm(() => ({
    defaultValues: data ?? defaultArmorWithRelated,
    onSubmit: async ({ value }) => {
      console.log("oldValue", data, "newValue", value);
      const db = await getDB();
      const armorData = pick(value, Object.keys(defaultData.armor) as (keyof armor)[]);
      const itemData = pick(value, Object.keys(defaultData.item) as (keyof item)[]);
      await db.transaction().execute(async (trx) => {
        let armorItem: armor;
        if (data) {
          // 更新
          const item = await updateItem(trx, { ...itemData, itemType: "Armor" });
          armorItem = await updateArmor(trx, armorData);
        } else {
          // 新增
          const item = await createItem(trx, { ...itemData, itemType: "Armor" });
          armorItem = await createArmor(trx, { ...armorData, itemId: item.id });
        }
        setWikiStore("cardGroup", (pre) => [...pre, { type: "armor", id: armorItem.itemId }]);
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
        <h1 class="FormTitle text-2xl font-black">{dic.db.armor.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(data ?? defaultArmorWithRelated)}>
          {(field, index) => {
            const fieldKey = field[0] as keyof armorWithRelated;
            const fieldValue = field[1];
            switch (fieldKey) {
              case "id":
              case "itemId":
              case "itemType":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              default:
                return renderField<armorWithRelated, keyof armorWithRelated>(
                  form,
                  fieldKey,
                  fieldValue,
                  ArmorWithRelatedWithRelatedDic(dic),
                  armorWithRelatedSchema,
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

export const ArmorDataConfig: dataDisplayConfig<armorWithRelated, armor & item> = {
  defaultData: defaultArmorWithRelated,
  dataFetcher: ArmorWithRelatedFetcher,
  datasFetcher: ArmorsFetcher,
  dataSchema: armorWithRelatedSchema,
  table: {
    dataFetcher: ArmorsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: (dic) => ArmorWithRelatedWithRelatedDic(dic),
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "baseDef", desc: true },
    tdGenerator: {},
  },
  form: ({ data, dic }) => ArmorWithRelatedForm(dic, data),
  card: ({ data, dic }) => {
    console.log(data);
    return (
      <>
        <div class="ArmorImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<armorWithRelated>({
          data,
          dictionary: ArmorWithRelatedWithRelatedDic(dic),
          dataSchema: armorWithRelatedSchema,
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "baseDef"],
            其他属性: ["modifiers", "details", "dataSources"],
            颜色信息: ["colorA", "colorB", "colorC"],
          },
        })}
        {ItemSharedCardContent(data, dic)}
        <Show when={data.createdByAccountId === store.session.user.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="FunGroup flex gap-1">
              <Button
                class="w-fit"
                icon={<Icon.Line.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.transaction().execute(async (trx) => {
                    await deleteArmor(trx, data.itemId);
                  });
                  // 关闭当前卡片
                  setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
                }}
              />
              <Button
                class="w-fit"
                icon={<Icon.Line.Edit />}
                onclick={() => {
                  // 关闭当前卡片
                  setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
                  // 打开表单
                  if (data.recipe === null || data.recipe === undefined) {
                    data.recipe = {
                      ...defaultData.recipe,
                      recipeEntries: [],
                    };
                  }
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
