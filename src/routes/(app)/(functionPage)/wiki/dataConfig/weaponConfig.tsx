import { createSignal, For, onMount, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { weaponSchema } from "~/../db/zod/index";
import { DB, item, weapon } from "~/../db/kysely/kyesely";
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
  ItemWithSubObjectForm,
} from "./item";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { ElementType, WeaponType } from "../../../../../../db/kysely/enums";
import { EnumSelect } from "~/components/controls/enumSelect";
import pick from "lodash-es/pick";

type WeaponWithRelated = weapon & {};

const weaponWithRelatedSchema = weaponSchema.extend({});

const defaultWeaponWithRelated: WeaponWithRelated = {
  ...defaultData.weapon,
};

const WeaponWithItemFetcher = async (id: string) => await itemWithRelatedFetcher<weapon>(id, "Weapon");

const WeaponsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("weapon", "weapon.itemId", "item.id")
    .selectAll(["item", "weapon"])
    .execute();
};

const createWeapon = async (trx: Transaction<DB>, value: weapon) => {
  return await trx.insertInto("weapon").values(value).returningAll().executeTakeFirstOrThrow();
};

const updateWeapon = async (trx: Transaction<DB>, value: weapon) => {
  return await trx
    .updateTable("weapon")
    .set(value)
    .where("itemId", "=", value.itemId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteWeapon = async (trx: Transaction<DB>, itemId: string) => {
  await trx.deleteFrom("weapon").where("itemId", "=", itemId).executeTakeFirstOrThrow();
  await deleteItem(trx, itemId);
};

export const WeaponDataConfig: dataDisplayConfig<weapon & item, weapon & ItemWithRelated, weapon & ItemWithRelated> = {
  defaultData: {
    ...defaultData.weapon,
    ...defaultItemWithRelated,
  },
  dataFetcher: WeaponWithItemFetcher,
  datasFetcher: WeaponsFetcher,
  dataSchema: weaponSchema.extend(itemWithRelatedSchema.shape),
  table: {
    dataFetcher: WeaponsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseAbi", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "stability", cell: (info: any) => info.getValue(), size: 100 },
      { accessorKey: "elementType", cell: (info: any) => info.getValue(), size: 150 },
    ],
    dictionary: (dic) => {
      return {
        ...dic.db.weapon,
        fields: {
          ...dic.db.weapon.fields,
          ...dic.db.item.fields,
        },
      };
    },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "baseAbi", desc: true },
    tdGenerator: {},
  },
  form: ({ data, dic }) => (
    <ItemWithSubObjectForm
      dic={dic}
      type="Weapon"
      oldData={data}
      subObjectConfig={{
        defaultData: defaultWeaponWithRelated,
        fieldsRender: (data, form) => {
          return (
            <For each={Object.entries(data)}>
              {(field, index) => {
                const fieldKey = field[0] as keyof weapon;
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
                          onChangeAsync: weaponSchema.shape[fieldKey],
                        }}
                      >
                        {(field) => (
                          <Input
                            title={dic.db.weapon.fields[fieldKey].key}
                            description={dic.db.weapon.fields[fieldKey].formFieldDescription}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                          >
                            <Select
                              value={field().state.value}
                              setValue={(value) => field().setValue(value as WeaponType)}
                              options={Object.entries(dic.db.weapon.fields.type.enumMap).map(([key, value]) => ({
                                label: value,
                                value: key,
                              }))}
                            />
                          </Input>
                        )}
                      </form.Field>
                    );
                  case "elementType":
                    return (
                      <form.Field
                        name={fieldKey}
                        validators={{
                          onChangeAsyncDebounceMs: 500,
                          onChangeAsync: weaponSchema.shape[fieldKey],
                        }}
                      >
                        {(field) => (
                          <Input
                            title={dic.db.weapon.fields[fieldKey].key}
                            description={dic.db.weapon.fields[fieldKey].formFieldDescription}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                          >
                            <EnumSelect
                              value={field().state.value}
                              setValue={(value) => field().setValue(value as ElementType)}
                              options={weaponSchema.shape[fieldKey].options}
                              dic={dic.db.weapon.fields[fieldKey].enumMap}
                              iconMap={{
                                Water: <Icon.Element.Water class="h-6 w-6" />,
                                Fire: <Icon.Element.Fire class="h-6 w-6" />,
                                Earth: <Icon.Element.Earth class="h-6 w-6" />,
                                Wind: <Icon.Element.Wind class="h-6 w-6" />,
                                Light: <Icon.Element.Light class="h-6 w-6" />,
                                Dark: <Icon.Element.Dark class="h-6 w-6" />,
                                Normal: <Icon.Element.NoElement class="h-6 w-6" />,
                              }}
                              field={{
                                id: field().name,
                                name: field().name,
                              }}
                            />
                          </Input>
                        )}
                      </form.Field>
                    );
                  default:
                    return renderField<weapon, keyof weapon>(form, fieldKey, fieldValue, dic.db.weapon, weaponSchema);
                }
              }}
            </For>
          );
        },
        fieldsHandler: async (trx, newWeaponWithRelated, oldWeaponWithRelated, item) => {
          const newWeapon = pick(newWeaponWithRelated, Object.keys(defaultData.weapon) as (keyof weapon)[]);
          let weaponItem: weapon;
          if (oldWeaponWithRelated) {
            // 更新
            weaponItem = await updateWeapon(trx, newWeapon);
          } else {
            // 新增
            weaponItem = await createWeapon(trx, {
              ...newWeapon,
              itemId: item.id,
            });
          }
          setWikiStore("cardGroup", (pre) => [...pre, { type: "weapon", id: weaponItem.itemId }]);
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
        <div class="WeaponImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<weapon & ItemWithRelated>({
          data,
          dictionary: {
            ...dic.db.weapon,
            fields: {
              ...dic.db.weapon.fields,
              ...itemWithRelatedDic(dic).fields,
            },
          },
          dataSchema: weaponSchema.extend(itemWithRelatedSchema.shape),
          hiddenFields: ["itemId"],
          fieldGroupMap: {
            基本信息: ["name", "baseAbi", "stability", "elementType"],
            其他属性: ["modifiers", "details", "dataSources"],
            颜色信息: ["colorA", "colorB", "colorC"],
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
                    await deleteWeapon(trx, data.itemId);
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
