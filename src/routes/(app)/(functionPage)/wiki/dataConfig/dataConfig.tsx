import { DB } from "~/../db/kysely/kyesely";
import { MobDataConfig } from "./mobConfig";
import { ColumnDef, Cell, VisibilityState, OnChangeFn } from "@tanstack/solid-table";
import { Accessor, JSX, Setter } from "solid-js";
import { ZodObject, ZodTypeAny } from "zod";
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
import { OptEquipDataConfig } from "./optionConfig";
import { SpeEquipDataConfig } from "./specialConfig";
import { WeaponDataConfig } from "./weaponConfig";
import { ZoneDataConfig } from "./zoneConfig";

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type dataDisplayConfig<T extends Record<string, unknown>, D extends Record<string, unknown>> = {
  defaultData: T;
  dataFetcher: (id: string) => Promise<T>;
  datasFetcher: () => Promise<D[]>;
  dataSchema: ZodObject<{ [K in keyof T]: ZodTypeAny }>;
  main?: (dic: dictionary, itemHandleClick: (id: string) => void) => JSX.Element;
  table: (options: {
    dic: dictionary;
    filterStr: Accessor<string>;
    columnHandleClick: (id: string) => void;
    columnVisibility?: VisibilityState;
    onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
    onRefetch?: (refetch: () => void) => void;
  }) => JSX.Element;
  form: (options: { data?: T; dic: dictionary; handleSubmit: (table: keyof DB, id: string) => void }) => JSX.Element;
  card: (options: {
    data: T;
    dic: dictionary;
    appendCardTypeAndIds: Setter<
      {
        type: keyof DB;
        id: string;
      }[]
    >;
    handleEdit: (data: T) => void;
  }) => JSX.Element;
};

export const DBDataConfig: Partial<Record<keyof DB, dataDisplayConfig<any, DB[keyof DB]>>> = {
  activity: ActivityDataConfig,
  address: AddressDataConfig,
  armor: ArmorDataConfig,

  mob: MobDataConfig,
  npc: NpcDataConfig,
  skill: SkillDataConfig,
  consumable: ConsumableDataConfig,
  crystal: CrystalDataConfig,
  material: MaterialDataConfig,
  option: OptEquipDataConfig,

  special: SpeEquipDataConfig,

  task: TaskDataConfig,

  weapon: WeaponDataConfig,
  zone: ZoneDataConfig,
};
