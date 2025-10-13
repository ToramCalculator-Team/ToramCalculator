import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "@db/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { materialSchema } from "@db/generated/zod/index";
import { DB, item, material } from "@db/generated/kysely/kysely";
import { dictionary } from "~/locales/type";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { defaultData } from "@db/defaultData";
import { fieldInfo, renderField } from "../utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import Icons from "~/components/icons/index";
import { Transaction } from "kysely";
import { setStore, store } from "~/store";
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
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { MaterialType } from "@db/schema/enums";
import pick from "lodash-es/pick";
import { CardSharedSection } from "./utils";

type MaterialWithRelated = material & {};

const materialWithRelatedSchema = materialSchema.extend({});

const defaultMaterialWithRelated: MaterialWithRelated = {
  ...defaultData.material,
};

const MaterialWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<material>(id, "Material");

const MaterialsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("material", "material.itemId", "item.id")
    .selectAll(["item", "material"])
    .execute();
};

const createMaterial = async (trx: Transaction<DB>, value: material) => {
  return await trx.insertInto("material").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateMaterial = async (trx: Transaction<DB>, value: material) => {
  return await trx
    .updateTable("material")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteMaterial = async (trx: Transaction<DB>, data: material & ItemWithRelated) => {
  await trx.deleteFrom("material").where("itemId", "=", data.id).executeTakeFirstOrThrow();
  await deleteItem(trx, data.id);
};

export const MaterialDataConfig: dataDisplayConfig<
  material & item,
  material & ItemWithRelated,
  material & ItemWithRelated
> = {
  defaultData: {
    ...defaultData.material,
    ...defaultItemWithRelated,
  },
  dataFetcher: MaterialWithItemFetcher,
  datasFetcher: MaterialsFetcher,
  dataSchema: materialSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: MaterialsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 150 },
      { accessorKey: "price", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "ptValue", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.material,
        fields: {
          ...dic.db.material.fields,
          ...dic.db.item.fields,
        },
      };
    },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "id", desc: true },
    tdGenerator: {},
  },
  form: ({ data, dic }) => (
    <ItemWithSubObjectForm
      dic={dic}
      type="Material"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultMaterialWithRelated,
        fieldsRender: (data, form) => {
          return (
            <For each={Object.entries(data)}>
              {(field, index) => {
                const fieldKey = field[0] as keyof material;
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
                          onChangeAsync: materialSchema.shape[fieldKey],
                        }}
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
                    return renderField<material, keyof material>(
                      form,
                      fieldKey,
                      fieldValue,
                      dic.db.material,
                      materialSchema,
                    );
                }
              }}
            </For>
          );
        },
        fieldsHandler: async (trx, newMaterialWithRelated, oldMaterialWithRelated, item) => {
          const newMaterial = pick(newMaterialWithRelated, Object.keys(defaultData.material) as (keyof material)[]);
          let materialItem: material;
          if (oldMaterialWithRelated) {
            // 更新
            materialItem = await updateMaterial(trx, newMaterial);
          } else {
            // 新增
            materialItem = await createMaterial(trx, {
              ...newMaterial,
              itemId: item.id,
            });
          }
          setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "material", id: materialItem.itemId });
          setWikiStore("form", {
            data: undefined,
            isOpen: false,
          });
        },
      }}
    />
  ),
  card: ({ data, dic }) => {
    return (
      <>
        <div class="MaterialImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<material & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.material,
            fields: {
              ...dic.db.material.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: materialSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "type", "price", "ptValue"],
            其他属性: ["details", "dataSources"],
          },
        })}
        <ItemSharedCardContent data={data} dic={dic} />
        <CardSharedSection dic={dic} data={data} delete={deleteMaterial} />
      </>
    );
  },
};
