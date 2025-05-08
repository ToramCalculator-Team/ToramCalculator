import { activity, address, armor, consumable, crystal, DB, item, material, mob, npc, option, skill, special, task, weapon, zone } from "~/../db/kysely/kyesely";
import { createMobDataConfig } from "./mobDataConfig";
import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { JSX } from "solid-js";
import { ZodObject, ZodTypeAny } from "zod";
import { Dic, dictionary, FieldDetail, FieldDict } from "~/locales/type";
import { createSkillDataConfig } from "./skillConfig";
import { createAddressDataConfig } from "./addressConfig";
import { createNpcDataConfig } from "./npcConfig";
import { createActivityDataConfig } from "./activityConfig";
import { createTaskDataConfig } from "./taskConfig";
import { createArmorDataConfig } from "./armorConfig";
import { createConsumableDataConfig } from "./consumableConfig";
import { createCrystalDataConfig } from "./crystalConfig";
import { createMaterialDataConfig } from "./materialConfig";
import { createOptionDataConfig } from "./optionConfig";
import { createSpecialDataConfig } from "./specialConfig";
import { createWeaponDataConfig } from "./weaponConfig";
import { createZoneDataConfig } from "./zoneConfig";
export type ExtraData<E extends Record<string, string[]>> = {
  [K in keyof E]: {
    defaultValue: string[];
    dictionary: FieldDetail;
    optionsFetcher: (name: string) => Promise<{ label: string; value: string }[]>;
  };
};

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type dataDisplayConfig<T extends Record<string, unknown>, Card extends object, E extends Record<string, string[]>> = {
  table: {
    dataFetcher: () => Promise<T[]>;
    columnDef: Array<ColumnDef<T, unknown>>;
    hiddenColumnDef: Array<keyof T>;
    defaultSort: { id: keyof T; desc: boolean };
    tdGenerator: (props: { cell: Cell<T, keyof T>; }) => JSX.Element;
    dictionary: Dic<T>;
  };
  form: {
    data: T;
    extraData?: ExtraData<E>;
    dataSchema: ZodObject<{ [K in keyof T]: ZodTypeAny }>;
    dictionary: Dic<T>;
    hiddenFields: Array<keyof T>;
    fieldGenerators: Partial<{
      [K in keyof T]: (key: K, field: () => AnyFieldApi) => JSX.Element;
    }>;
    onChange?: (data: T & E) => void;
    onSubmit?: (data: T & E) => void;
  };
  card: {
    dataFetcher: (id: string) => Promise<Card>;
    cardRender: (
      data: Card,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => JSX.Element;
  };
};

export const DBDataConfig = (dictionary: dictionary): Partial<Record<keyof DB, dataDisplayConfig<any, any, any>>> => ({
  activity: createActivityDataConfig(dictionary.db.activity),
  address: createAddressDataConfig(dictionary.db.address),
  armor: createArmorDataConfig({
    ...dictionary.db.armor,
    fields: {
      ...dictionary.db.armor.fields,
      ...dictionary.db.item.fields,
    },
  }),

  // consumable: consumableDataConfig,
  // crystal: crystalDataConfig,

  // item: createItemConfig("Weapon"),
  // material: materialDataConfig,

  mob: createMobDataConfig(dictionary.db.mob),
  npc: createNpcDataConfig(dictionary.db.npc),
  skill: createSkillDataConfig(dictionary.db.skill),
  consumable: createConsumableDataConfig({
    ...dictionary.db.consumable,
    fields: {
      ...dictionary.db.consumable.fields,
      ...dictionary.db.item.fields,
    },
  }),
  crystal: createCrystalDataConfig({
    ...dictionary.db.crystal,
    fields: {
      ...dictionary.db.crystal.fields,
      ...dictionary.db.item.fields,
    },
  }),
  material: createMaterialDataConfig({
    ...dictionary.db.material,
    fields: {
      ...dictionary.db.material.fields,
      ...dictionary.db.item.fields,
    },
  }),
  option: createOptionDataConfig({
    ...dictionary.db.option,
    fields: {
      ...dictionary.db.option.fields,
      ...dictionary.db.item.fields,
    },
  }),

  special: createSpecialDataConfig({
    ...dictionary.db.special,
    fields: {
      ...dictionary.db.special.fields,
      ...dictionary.db.item.fields,
    },
  }),

  task: createTaskDataConfig(dictionary.db.task),

  weapon: createWeaponDataConfig({
    ...dictionary.db.weapon,
    fields: {
      ...dictionary.db.weapon.fields,
      ...dictionary.db.item.fields,
    },
  }),
  // world: mobDataConfig,
  zone: createZoneDataConfig(dictionary.db.zone),
});
