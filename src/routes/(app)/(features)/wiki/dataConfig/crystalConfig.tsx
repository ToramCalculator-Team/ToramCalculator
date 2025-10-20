import { createResource, createSignal, For, Index, onMount, Show } from "solid-js";
import { getDB } from "@db/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { crystalSchema, itemSchema } from "@db/generated/zod/index";
import { DB, item, crystal } from "@db/generated/kysely/kysely";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { defaultData } from "@db/defaultData";
import { fieldInfo, renderField } from "../utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import { Transaction } from "kysely";
import { setWikiStore } from "../store";
import {
  defaultItemWithRelated,
  deleteItem,
  ItemSharedCardContent,
  ItemSharedFormDataSubmitor,
  ItemSharedFormField,
  ItemWithRelated,
  itemWithRelatedDic,
  itemWithRelatedFetcher,
  itemWithRelatedSchema,
  ItemWithSubObjectForm,
} from "./item";
import z from "zod/v4";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { CardSharedSection } from "./utils";
import pick from "lodash-es/pick";
import { EnumSelect } from "~/components/controls/enumSelect";
import { CrystalType } from "@db/schema/enums";
import { Select } from "~/components/controls/select";
import Icons from "~/components/icons";
import { setStore, store } from "~/store";

type CrystalWithRelated = crystal & {
  front: (crystal & item)[];
  back: (crystal & item)[];
};

const crystalWithRelatedSchema = crystalSchema.extend({
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

const CrystalWithItemFetcher = async (id: string) => {
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
  console.log("createCrystal", value);
  return await trx.insertInto("crystal").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateCrystal = async (trx: Transaction<DB>, value: crystal) => {
  console.log("updateCrystal", value);
  return await trx
    .updateTable("crystal")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteCrystal = async (trx: Transaction<DB>, data: crystal & ItemWithRelated) => {
  // 删除前置和后置锻晶关系
  await trx.deleteFrom("_frontRelation").where("A", "=", data.id).execute();
  await trx.deleteFrom("_backRelation").where("A", "=", data.id).execute();
  await trx.deleteFrom("crystal").where("itemId", "=", data.id).executeTakeFirstOrThrow();
  await deleteItem(trx, data.id);
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
  dataFetcher: CrystalWithItemFetcher,
  datasFetcher: CrystalsFetcher,
  dataSchema: crystalWithRelatedSchema.extend(itemWithRelatedSchema.shape),
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
  form: ({ dic, data }) => (
    <ItemWithSubObjectForm
      dic={dic}
      type="Crystal"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultCrystalWithRelated,
        fieldsRender: (data, form) => (
          <For each={Object.entries(data)}>
            {(field, index) => {
              const fieldKey = field[0] as keyof CrystalWithRelated;
              const fieldValue = field[1];
              switch (fieldKey) {
                case "itemId":
                  return null;
                case "type":
                  return (
                    <form.Field
                      name={fieldKey}
                      validators={{
                        onChangeAsyncDebounceMs: 500,
                        onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
                      }}
                    >
                      {(field) => (
                        <Input
                          title={dic.db.crystal.fields[fieldKey].key}
                          description={dic.db.crystal.fields[fieldKey].formFieldDescription}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <Select
                            value={field().state.value}
                            setValue={(value) => field().setValue(value as CrystalType)}
                            options={Object.entries(dic.db.crystal.fields.type.enumMap).map(([key, value]) => ({
                              label: value,
                              value: key,
                            }))}
                            optionGenerator={(option, selected, handleSelect) => {
                              return (
                                <div
                                  class={`hover:bg-area-color flex cursor-pointer gap-3 px-3 py-2 ${selected ? "bg-area-color" : ""}`}
                                  onClick={handleSelect}
                                >
                                  <Icons.Spirits iconName={option.value} size={24} />
                                  {option.label}
                                </div>
                              );
                            }}
                          />
                        </Input>
                      )}
                    </form.Field>
                  );
                case "front":
                case "back":
                  return (
                    <form.Field
                      name={fieldKey}
                      mode="array"
                      validators={{
                        onChangeAsyncDebounceMs: 500,
                        onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
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
                                          initialValue={item().id}
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
        ),
        fieldsHandler: async (trx, newCrystalWithRelated, oldCrystalWithRelated, item) => {
          const newCrystal = pick(newCrystalWithRelated, Object.keys(defaultData.crystal) as (keyof crystal)[]);
          const oldCrystal =
            oldCrystalWithRelated && pick(oldCrystalWithRelated, Object.keys(defaultData.crystal) as (keyof crystal)[]);

          let crystalItem: crystal;
          if (oldCrystal) {
            // 更新
            crystalItem = await updateCrystal(trx, newCrystal);
          } else {
            // 新增
            crystalItem = await createCrystal(trx, {
              ...newCrystal,
              itemId: item.id,
            });
          }

          const oldFront = oldCrystalWithRelated?.front ?? [];
          const oldBack = oldCrystalWithRelated?.back ?? [];

          const newFront = newCrystalWithRelated.front;
          const newBack = newCrystalWithRelated.back;

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

          setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "crystal", id: crystalItem.itemId });
          setWikiStore("form", {
            data: undefined,
            isOpen: false,
          });
        },
      }}
    />
  ),
  card: ({ dic, data }) => {
    const [frontData] = createResource(data.id, async (itemId) => {
      const db = await getDB();
      return await db
        .selectFrom("_frontRelation")
        .innerJoin("item", "_frontRelation.A", "item.id")
        .innerJoin("crystal", "_frontRelation.B", "crystal.itemId")
        .where("_frontRelation.B", "=", itemId)
        .selectAll(["item", "crystal"])
        .execute();
    });

    const [backData] = createResource(data.id, async (itemId) => {
      const db = await getDB();
      return await db
        .selectFrom("_backRelation")
        .innerJoin("item", "_backRelation.A", "item.id")
        .innerJoin("crystal", "_backRelation.B", "crystal.itemId")
        .where("_backRelation.B", "=", itemId)
        .selectAll(["item", "crystal"])
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
          dataSchema: crystalWithRelatedSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "modifiers"],
            其他属性: ["details", "dataSources"],
          },
          fieldGenerator: {
            name: (key, value, dic) => {
              return (
                <div class="Field flex gap-2">
                  <span class="text-main-text-color text-nowrap">{dic.fields[key].key}</span>:
                  <span class="flex items-center gap-2 font-bold">
                    <Icons.Spirits iconName={data.type} size={24} /> {String(value)}
                  </span>
                </div>
              );
            },
          },
        })}
        <CardSection
          title={"前置" + dic.db.crystal.selfName}
          data={frontData.latest}
          dataRender={(front) => {
            return (
              <Button
                onClick={() => setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "crystal", id: front.id })}
                icon={<Icons.Spirits iconName={front.type} size={24} />}
                class="justify-start"
              >
                {front.name}
              </Button>
            );
          }}
        />
        <CardSection
          title={"后置" + dic.db.crystal.selfName}
          data={backData.latest}
          dataRender={(back) => {
            return (
              <Button
                onClick={() => setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "crystal", id: back.id })}
                icon={<Icons.Spirits iconName={back.type} size={24} />}
                class="justify-start"
              >
                {back.name}
              </Button>
            );
          }}
        />
        <ItemSharedCardContent data={data} dic={dic} />
        <CardSharedSection dic={dic} data={data} delete={deleteCrystal} />
      </>
    );
  },
};
