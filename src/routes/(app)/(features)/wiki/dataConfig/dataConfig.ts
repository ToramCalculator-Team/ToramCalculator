import { DB } from "@db/generated/zod/index";
import { MobDataConfig } from "./mobConfig";
import { ColumnDef, Cell, VisibilityState, OnChangeFn } from "@tanstack/solid-table";
import { Accessor, JSX, Setter } from "solid-js";
import { ZodObject, ZodType } from "zod/v4";
import { Dic, dictionary } from "~/locales/type";
import { SkillDataConfig } from "./skillConfig";
import { AddressDataConfig } from "./addressConfig";
import { NpcDataConfig } from "./npcConfig";
import { ActivityDataConfig } from "./activityConfig";
import { TaskDataConfig } from "./taskConfig";
import { ArmorDataConfig } from "./armorConfig";
import { ConsumableDataConfig } from "./consumableConfig";
import { CrystalDataConfig } from "./crystalConfig";
import { MaterialDataConfig } from "./materialConfig";
import { OptionDataConfig } from "./optionConfig";
import { SpecialDataConfig } from "./specialConfig";
import { WeaponDataConfig } from "./weaponConfig";
import { ZoneDataConfig } from "./zoneConfig";

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type dataDisplayConfig<T extends Record<string, unknown>, F extends Record<string, unknown>, C extends Record<string, unknown>> = {
  defaultData: F;
  dataFetcher: (id: string) => Promise<C>;
  datasFetcher: () => Promise<T[]>;
  dataSchema: ZodObject<{ [K in keyof F]: ZodType }>;
  main?: (dic: dictionary, itemHandleClick: (id: string) => void) => JSX.Element;
  table: {
    dataFetcher: () => Promise<T[]>;
    columnsDef: ColumnDef<T>[];
    dictionary: (dic: dictionary) => Dic<T>;
    hiddenColumnDef: Array<keyof T>;
    defaultSort: { id: keyof T; desc: boolean };
    tdGenerator: Partial<{
      [K in keyof T]: (props: { cell: Cell<T, unknown>; dic: Dic<T> }) => JSX.Element;
    }>;
  };
  form: (options: { data?: F; dic: dictionary }) => JSX.Element;
  card: (options: { data: C; dic: dictionary }) => JSX.Element;
};

export const DBDataConfig: Partial<Record<keyof DB, dataDisplayConfig<any, any,any>>> = {
  activity: ActivityDataConfig,
  address: AddressDataConfig,
  armor: ArmorDataConfig,

  mob: MobDataConfig,
  npc: NpcDataConfig,
  skill: SkillDataConfig,
  consumable: ConsumableDataConfig,
  crystal: CrystalDataConfig,
  material: MaterialDataConfig,
  option: OptionDataConfig,

  special: SpecialDataConfig,

  task: TaskDataConfig,

  weapon: WeaponDataConfig,
  zone: ZoneDataConfig,
};
