import { DB } from "~/../db/kysely/kyesely";
import { createMobDataConfig } from "./mobDataConfig";
import { AnyFieldApi, DeepKeys, DeepValue } from "@tanstack/solid-form";
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
import { createOptEquipDataConfig } from "./optionConfig";
import { createSpeEquipDataConfig } from "./specialConfig";
import { createWeaponDataConfig } from "./weaponConfig";
import { createZoneDataConfig } from "./zoneConfig";
import { SimplifiedFieldApi } from "../utils";

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type dataDisplayConfig<T extends Record<string, unknown>> = {
  defaultData: T;
  dataFetcher: (id: string) => Promise<T>;
  datasFetcher: () => Promise<T[]>;
  dictionary: dictionary;
  dataSchema: ZodObject<{ [K in keyof T]: ZodTypeAny }>;
  table: {
    measure?: {
      estimateSize: number;
    };
    columnDef: Array<ColumnDef<T, unknown>>;
    dic: Dic<T>;
    hiddenColumns: Array<keyof T>;
    defaultSort: { id: keyof T; desc: boolean };
    tdGenerator: Partial<{
      [K in keyof T]: (props: { cell: Cell<T, unknown>; dic: Dic<T> }) => JSX.Element;
    }>;
  };
  form: (handleSubmit: (table: keyof DB, id: string) => void) => JSX.Element;
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
  activity: createActivityDataConfig(dictionary),
  address: createAddressDataConfig(dictionary),
  armor: createArmorDataConfig(dictionary),

  mob: createMobDataConfig(dictionary),
  npc: createNpcDataConfig(dictionary),
  skill: createSkillDataConfig(dictionary),
  consumable: createConsumableDataConfig(dictionary),
  crystal: createCrystalDataConfig(dictionary),
  material: createMaterialDataConfig(dictionary),
  option: createOptEquipDataConfig(dictionary),

  special: createSpeEquipDataConfig(dictionary),

  task: createTaskDataConfig(dictionary),

  weapon: createWeaponDataConfig(dictionary),
  zone: createZoneDataConfig(dictionary),
});
