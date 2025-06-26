import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { materialSchema } from "~/../db/zod/index";
import { DB, item, material } from "~/../db/kysely/kyesely";
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
  ItemSharedFormDataSubmitor,
  ItemSharedFormField,
  ItemWithRelated,
  itemWithRelatedDic,
  itemWithRelatedFetcher,
  itemWithRelatedSchema,
} from "./item";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { MaterialType } from "../../../../../../db/kysely/enums";
import pick from "lodash-es/pick";
import { CardSharedSection } from "./utils";

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

const MaterialWithItemForm = (dic: dictionary, oldMaterialWithItem?: material & ItemWithRelated) => {
  const oldMaterial = oldMaterialWithItem && pick(oldMaterialWithItem, Object.keys(defaultData.material) as (keyof material)[]);
  const oldItem =
    oldMaterialWithItem && pick(oldMaterialWithItem, Object.keys(defaultItemWithRelated) as (keyof ItemWithRelated)[]);
  const materialFormFieldInitialValues = oldMaterial ?? defaultData.material;
  const itemFormFieldInitialValues = oldItem ?? defaultItemWithRelated;
  const formInitialValues = oldMaterialWithItem ?? {
    ...defaultData.material,
    ...defaultItemWithRelated,
  };
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newMaterialWithItem }) => {
      const newMaterial = pick(newMaterialWithItem, Object.keys(defaultData.material) as (keyof material)[]);
      const newItem = pick(newMaterialWithItem, Object.keys(defaultItemWithRelated) as (keyof ItemWithRelated)[]);
      console.log("oldMaterialWithItem", oldMaterialWithItem, "newMaterialWithItem", newMaterialWithItem);
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        const item = await ItemSharedFormDataSubmitor(trx, "Material", newItem, oldItem);
        let materialItem: material;
        if (oldMaterial) {
          // 更新
          materialItem = await updateMaterial(trx, newMaterial);
        } else {
          // 新增
          materialItem = await createMaterial(trx, {
            ...newMaterial,
            itemId: item.id,
          });
        }
        setWikiStore("cardGroup", (pre) => [...pre, { type: "material", id: materialItem.itemId }]);
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
        <For each={Object.entries(materialFormFieldInitialValues)}>
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
        {ItemSharedFormField(dic, itemFormFieldInitialValues, form)}
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
  form: ({ data, dic }) => MaterialWithItemForm(dic, data),
  card: ({ data, dic }) => {
    console.log(data);
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
