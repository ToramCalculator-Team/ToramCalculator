import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { specialSchema } from "~/../db/zod/index";
import { DB, item, special } from "~/../db/kysely/kyesely";
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
import {
  defaultItemWithRelated,
  deleteItem,
  ItemSharedCardContent,
  ItemWithRelated,
  itemWithRelatedDic,
  itemWithRelatedFetcher,
  itemWithRelatedSchema,
} from "./item";

const SpecialWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<special>(id, "Special");

const SpecialsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("special", "special.itemId", "item.id")
    .selectAll(["item", "special"])
    .execute();
};

const createSpecial = async (trx: Transaction<DB>, value: special) => {
  return await trx.insertInto("special").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateSpecial = async (trx: Transaction<DB>, value: special) => {
  return await trx
    .updateTable("special")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteSpecial = async (trx: Transaction<DB>, itemId: string) => {
  await trx.deleteFrom("special").where("itemId", "=", itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, itemId);
};

const SpecialWithItemForm = (dic: dictionary, oldSpecial?: special) => {
  const formInitialValues = oldSpecial ?? defaultData.special;
  const [item, setItem] = createSignal<ItemWithRelated>();
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newSpecial }) => {
      console.log("oldSpecial", oldSpecial, "newSpecial", newSpecial);
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        let specialItem: special;
        if (oldSpecial) {
          // 更新
          specialItem = await updateSpecial(trx, newSpecial);
        } else {
          // 新增
          specialItem = await createSpecial(trx, newSpecial);
        }
        setWikiStore("cardGroup", (pre) => [...pre, { type: "special", id: specialItem.itemId }]);
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
        <For each={Object.entries(formInitialValues)}>
          {(field, index) => {
            const fieldKey = field[0] as keyof special;
            const fieldValue = field[1];
            switch (fieldKey) {
              case "itemId":
                return null;
              default:
                return renderField<special, keyof special>(form, fieldKey, fieldValue, dic.db.special, specialSchema);
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

export const SpecialDataConfig: dataDisplayConfig<
  special & item,
  special & ItemWithRelated,
  special & ItemWithRelated
> = {
  defaultData: {
    ...defaultData.special,
    ...defaultItemWithRelated,
  },
  dataFetcher: SpecialWithItemFetcher,
  datasFetcher: SpecialsFetcher,
  dataSchema: specialSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: SpecialsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.special,
        fields: {
          ...dic.db.special.fields,
          ...dic.db.item.fields,
        },
      };
    },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "baseDef", desc: true },
    tdGenerator: {},
  },
  form: ({ data, dic }) => SpecialWithItemForm(dic, data),
  card: ({ data, dic }) => {
    console.log(data);
    return (
      <>
        <div class="SpecialImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<special & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.special,
            fields: {
              ...dic.db.special.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: specialSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "baseDef"],
            其他属性: ["modifiers", "details", "dataSources"],
          },
        })}
        <ItemSharedCardContent data={data} dic={dic} />
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
                    await deleteSpecial(trx, data.itemId);
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
