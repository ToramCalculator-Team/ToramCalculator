import { createResource, createSignal, For, Index, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { crystalSchema, itemSchema } from "~/../db/zod/index";
import { DB, item, crystal } from "~/../db/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { defaultData } from "~/../db/defaultData";
import { fieldInfo, renderField } from "../utils";
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
} from "./utils";
import z from "zod";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { CardSection } from "~/components/module/cardSection";

type CrystalWithRelated = crystal & {
  front: (crystal & item)[];
  back: (crystal & item)[];
};

const CrystalWithRelatedSchema = crystalSchema.extend({
  front: z.array(
    z.object({
      ...crystalSchema.shape,
      ...itemSchema.shape,
    }),
  ),
  back: z.array(
    z.object({
      ...crystalSchema.shape,
      ...itemSchema.shape,
    }),
  ),
});

const defaultCrystalWithRelated: CrystalWithRelated = {
  ...defaultData.crystal,
  front: [],
  back: [],
};

const CrystalWithRelatedFetcher = async (id: string) => {
  const db = await getDB();
  const baseData = await itemWithRelatedFetcher<crystal>(id, "Crystal");
  const frontData = await db
    .selectFrom("_frontRelation")
    .where("_frontRelation.A", "=", id)
    .innerJoin("item", "_frontRelation.B", "item.id")
    .innerJoin("crystal", "_frontRelation.B", "crystal.itemId")
    .selectAll()
    .execute();
  const backData = await db
    .selectFrom("_backRelation")
    .where("_backRelation.A", "=", id)
    .innerJoin("item", "_backRelation.B", "item.id")
    .innerJoin("crystal", "_backRelation.B", "crystal.itemId")
    .selectAll()
    .execute();
  return {
    ...baseData,
    front: frontData,
    back: backData,
  };
};

const CrystalsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("crystal", "crystal.itemId", "item.id")
    .selectAll(["item", "crystal"])
    .execute();
};

const createCrystal = async (trx: Transaction<DB>, value: crystal) => {
  return await trx.insertInto("crystal").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateCrystal = async (trx: Transaction<DB>, value: crystal) => {
  return await trx
    .updateTable("crystal")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteCrystal = async (trx: Transaction<DB>, itemId: string) => {
  // 删除前置和后置锻晶关系
  await trx.deleteFrom("_frontRelation").where("A", "=", itemId).execute();
  await trx.deleteFrom("_backRelation").where("A", "=", itemId).execute();
  await trx.deleteFrom("crystal").where("itemId", "=", itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, itemId);
};

const CrystalWithRelatedForm = (dic: dictionary, oldCrystal?: CrystalWithRelated) => {
  const formInitialValues = oldCrystal ?? {
    ...defaultData.crystal,
    front: [],
    back: [],
  };
  const [item, setItem] = createSignal<ItemWithRelated>();
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newCrystal }) => {
      console.log("oldCrystal", oldCrystal, "newCrystal", newCrystal);
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        let crystalItem: crystal;
        if (oldCrystal) {
          // 更新
          crystalItem = await updateCrystal(trx, newCrystal);
        } else {
          // 新增
          crystalItem = await createCrystal(trx, newCrystal);
        }

        const oldFront = oldCrystal?.front ?? [];
        const oldBack = oldCrystal?.back ?? [];

        const newFront = newCrystal.front;
        const newBack = newCrystal.back;

        const frontToAdd = newFront.filter((front) => !oldFront.some((old) => old.itemId === front.itemId));
        const backToAdd = newBack.filter((back) => !oldBack.some((old) => old.itemId === back.itemId));

        const frontToRemove = oldFront.filter(
          (old) => !newFront.some((newCrystal) => newCrystal.itemId === old.itemId),
        );
        const backToRemove = oldBack.filter((old) => !newBack.some((newCrystal) => newCrystal.itemId === old.itemId));

        for (const frontCrystal of frontToAdd) {
          await trx
            .insertInto("_frontRelation")
            .values({
              A: frontCrystal.itemId,
              B: crystalItem.itemId,
            })
            .execute();
        }
        for (const backCrystal of backToAdd) {
          await trx
            .insertInto("_backRelation")
            .values({
              A: backCrystal.itemId,
              B: crystalItem.itemId,
            })
            .execute();
        }

        for (const frontCrystal of frontToRemove) {
          await trx
            .deleteFrom("_frontRelation")
            .where("A", "=", frontCrystal.itemId)
            .where("B", "=", crystalItem.itemId)
            .execute();
        }
        for (const backCrystal of backToRemove) {
          await trx
            .deleteFrom("_backRelation")
            .where("A", "=", backCrystal.itemId)
            .where("B", "=", crystalItem.itemId)
            .execute();
        }

        setWikiStore("cardGroup", (pre) => [...pre, { type: "crystal", id: crystalItem.itemId }]);
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
        <For each={Object.entries(formInitialValues)}>
          {(field, index) => {
            const fieldKey = field[0] as keyof CrystalWithRelated;
            const fieldValue = field[1];
            switch (fieldKey) {
              case "itemId":
                return null;
              case "front":
              case "back":
                return (
                  <form.Field
                    name={fieldKey}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: CrystalWithRelatedSchema.shape[fieldKey],
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
                                            return newArray as Array<crystal & item>;
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
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldValue = fieldValue as string;
                return renderField<crystal, keyof crystal>(
                  form,
                  fieldKey,
                  simpleFieldValue,
                  dic.db.crystal,
                  crystalSchema,
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

export const CrystalDataConfig: dataDisplayConfig<
  crystal & item,
  CrystalWithRelated & ItemWithRelated,
  CrystalWithRelated & ItemWithRelated
> = {
  defaultData: {
    ...defaultCrystalWithRelated,
    ...defaultItemWithRelated,
  },
  dataFetcher: CrystalWithRelatedFetcher,
  datasFetcher: CrystalsFetcher,
  dataSchema: CrystalWithRelatedSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: CrystalsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 150 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "modifiers", cell: (info: any) => info.getValue(), size: 480 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "details", cell: (info: any) => info.getValue(), size: 150 },
    ],
    dictionary: (dic) => {
      return {
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
      };
    },
    hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ dic, data }) => CrystalWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
    const [frontData] = createResource(data.id, async (itemId) => {
      const db = await getDB();
      return await db
        .selectFrom("_frontRelation")
        .innerJoin("item", "_frontRelation.A", "item.id")
        .where("_frontRelation.B", "=", itemId)
        .selectAll(["item"])
        .execute();
    });

    const [backData] = createResource(data.id, async (itemId) => {
      const db = await getDB();
      return await db
        .selectFrom("_backRelation")
        .innerJoin("item", "_backRelation.A", "item.id")
        .where("_backRelation.B", "=", itemId)
        .selectAll(["item"])
        .execute();
    });

    return (
      <>
        <div class="CrystalImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<CrystalWithRelated & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.crystal,
            fields: {
              ...dic.db.crystal.fields,
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
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: CrystalWithRelatedSchema.extend(itemWithRelatedSchema.shape),
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
                onClick: () => setWikiStore("cardGroup", (pre) => [...pre, { type: "crystal", id: front.id }]),
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
                onClick: () => setWikiStore("cardGroup", (pre) => [...pre, { type: "crystal", id: back.id }]),
              };
            }}
          />
        </Show>
        {ItemSharedCardContent(data, dic)}
      </>
    );
  },
};
