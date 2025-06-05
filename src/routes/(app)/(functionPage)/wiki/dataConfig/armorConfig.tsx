import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import {
  armorSchema,
} from "~/../db/zod";
import { DB, item, armor } from "~/../db/kysely/kyesely";
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
import { defaultItemWithRelated, deleteItem, ItemSharedCardContent, ItemWithRelated, itemWithRelatedDic, itemWithRelatedFetcher, itemWithRelatedSchema } from "./utils";


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

const ArmorWithRelatedForm = (dic: dictionary, oldArmor?: armor) => {
  const formInitialValues = oldArmor ?? defaultData.armor;
  const [item, setItem] = createSignal<ItemWithRelated>();
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newArmor }) => {
      console.log("oldArmor", oldArmor, "newArmor", newArmor);
      const db = await getDB(); 
      await db.transaction().execute(async (trx) => {
        let armorItem: armor;
        if (oldArmor) {
          // 更新
          armorItem = await updateArmor(trx, newArmor);
        } else {
          // 新增
          armorItem = await createArmor(trx, newArmor);
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
        <For each={Object.entries(formInitialValues)}>
          {(field, index) => {
            const fieldKey = field[0] as keyof armor;
            const fieldValue = field[1];
            switch (fieldKey) {
              case "itemId":
                return null;
              default:
                return renderField<armor, keyof armor>(
                  form,
                  fieldKey,
                  fieldValue,
                  dic.db.armor,
                  armorSchema,
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

export const ArmorDataConfig: dataDisplayConfig<armor & item, armor & ItemWithRelated, armor & ItemWithRelated> = {
  defaultData: {
    ...defaultData.armor,
    ...defaultItemWithRelated
  },
  dataFetcher: ArmorWithRelatedFetcher,
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
  form: ({ data, dic }) => ArmorWithRelatedForm(dic, data),
  card: ({ data, dic }) => {
    console.log(data);
    return (
      <>
        <div class="ArmorImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<armor & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.armor,
            fields: {
              ...dic.db.armor.fields,
              ...itemWithRelatedDic(dic).fields,
            }
          },
          dataSchema: armorSchema.extend(itemWithRelatedSchema.shape),
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
