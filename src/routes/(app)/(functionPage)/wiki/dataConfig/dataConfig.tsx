import { DB } from "~/../db/kysely/kyesely";
import { createMobDataConfig } from "./mobDataConfig";
import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { JSX } from "solid-js";
import { ZodObject, ZodTypeAny } from "zod";
import { Dic, dictionary } from "~/locales/type";
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

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type dataDisplayConfig<T extends Record<string, unknown>> = {
  defaultData: T;
  dataFetcher: (id: string) => Promise<T>;
  datasFetcher: () => Promise<T[]>;
  dictionary: Dic<T>;
  dataSchema: ZodObject<{ [K in keyof T]: ZodTypeAny }>;
  table: {
    columnDef: Array<ColumnDef<T, unknown>>;
    hiddenColumns: Array<keyof T>;
    defaultSort: { id: keyof T; desc: boolean };
    tdGenerator: (props: { cell: Cell<T, keyof T> }) => JSX.Element;
  };
  form: {
    hiddenFields: Array<keyof T>;
    fieldGenerators: Partial<{
      [K in keyof T]: (key: K, field: () => AnyFieldApi, getFormValue: (key: keyof T) => unknown) => JSX.Element;
    }>;
    onChange?: (data: T) => void;
    onSubmit?: (data: T) => void;
  };
  card: {
    cardRender: (
      data: T,
      appendCTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => JSX.Element;
  };
};

export const DBDataConfig = (
  dictionary: dictionary,
): Partial<Record<keyof DB, dataDisplayConfig<Record<string, unknown>>>> => ({
  activity: createActivityDataConfig(dictionary.db.activity),
  address: createAddressDataConfig(dictionary.db.address),
  armor: createArmorDataConfig({
    ...dictionary.db.armor,
    fields: {
      ...dictionary.db.armor.fields,
      ...dictionary.db.item.fields,
    },
  }),

  mob: createMobDataConfig({
    ...dictionary.db.mob,
    fields: {
      ...dictionary.db.mob.fields,
      belongToZones: {
        key: "belongToZones",
        ...dictionary.db.zone.fields,
        tableFieldDescription: dictionary.db.zone.fields.name.tableFieldDescription,
        formFieldDescription: dictionary.db.zone.fields.name.formFieldDescription,
      },
      dropItems: {
        key: "dropItems",
        ...dictionary.db.drop_item.fields,
        tableFieldDescription: dictionary.db.drop_item.fields.itemId.tableFieldDescription,
        formFieldDescription: dictionary.db.drop_item.fields.itemId.formFieldDescription,
      },
    },
  }),
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
  zone: createZoneDataConfig(dictionary.db.zone),
});
