import { activity, address, armor, consumable, crystal, DB, item, material, mob, npc, option, skill, special, task, weapon, zone } from "~/../db/kysely/kyesely";
import { mobDataConfig } from "./mobDataConfig";
import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { JSX } from "solid-js";
import { ZodObject, ZodTypeAny } from "zod";
import { Dic, FieldDetail, FieldDict } from "~/locales/type";
import { zoneDataConfig } from "./zoneConfig";
import { skillDataConfig } from "./skillDataConfig";
import { addressDataConfig } from "./addressConfig";
import { npcDataConfig } from "./npcConfig";
import { activityDataConfig } from "./activityConfig";
import { taskDataConfig } from "./taskConfig";
import { armorDataConfig } from "./armorConfig";
import { consumableDataConfig } from "./consumableConfig";
import { crystalDataConfig } from "./crystalConfig";
import { materialDataConfig } from "./materialConfig";
import { optionDataConfig } from "./optionConfig";
import { specialDataConfig } from "./specialConfig";
import { weaponDataConfig } from "./weaponConfig";
import { createItemConfig } from "./itemConfig";

export type ExtraData<E extends Record<string, string[]>> = {
  [K in keyof E]: {
    defaultValue: string[];
    dictionary: FieldDetail;
    optionsFetcher: (name: string) => Promise<{ label: string; value: string }[]>;
  };
};

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type DBdataDisplayConfig<T extends DB[keyof DB], Card extends object, E extends Record<string, string[]>> = {
  table: {
    dataFetcher: () => Promise<T[]>;
    columnDef: Array<ColumnDef<T, unknown>>;
    hiddenColumnDef: Array<keyof T>;
    defaultSort: { id: keyof T; desc: boolean };
    tdGenerator: (props: { cell: Cell<T, keyof T>; dictionary: Dic<T> }) => JSX.Element;
  };
  form: {
    data: T;
    extraData?: ExtraData<E>;
    dataSchema: ZodObject<{ [K in keyof T]: ZodTypeAny }>;
    hiddenFields: Array<keyof T>;
    fieldGenerators: Partial<{
      [K in keyof T]: (key: K, field: () => AnyFieldApi, dictionary: Dic<T>) => JSX.Element;
    }>;
    onChange?: (data: T & E) => void;
    onSubmit?: (data: T & E) => void;
  };
  card: {
    dataFetcher: (id: string) => Promise<Card>;
    cardRender: (
      data: Card,
      dictionary: Dic<Card>,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => JSX.Element;
  };
};

export const DBDataConfig: Partial<Record<keyof DB, DBdataDisplayConfig<any, any, any>>> = {
  activity: activityDataConfig as DBdataDisplayConfig<activity, any, any>,
  address: addressDataConfig as DBdataDisplayConfig<address, any, any>,
  armor: armorDataConfig as DBdataDisplayConfig<armor, any, any>,

  // consumable: consumableDataConfig as DBdataDisplayConfig<consumable, any, any>,
  // crystal: crystalDataConfig as DBdataDisplayConfig<crystal, any, any>,

  // item: createItemConfig("Weapon") as DBdataDisplayConfig<item, any, any>,
  // material: materialDataConfig as DBdataDisplayConfig<material, any, any>,

  mob: mobDataConfig as DBdataDisplayConfig<mob, any, any>,
  npc: npcDataConfig as DBdataDisplayConfig<npc, any, any>,
  option: optionDataConfig as DBdataDisplayConfig<option, any, any>,

  skill: skillDataConfig as DBdataDisplayConfig<skill, any, any>,

  special: specialDataConfig as DBdataDisplayConfig<special, any, any>,

  task: taskDataConfig as DBdataDisplayConfig<task, any, any>,

  weapon: weaponDataConfig as DBdataDisplayConfig<weapon, any, any>,
  // world: mobDataConfig,
  zone: zoneDataConfig as DBdataDisplayConfig<zone, any, any>,
};
