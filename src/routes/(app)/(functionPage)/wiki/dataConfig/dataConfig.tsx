import { DB } from "~/../db/kysely/kyesely";
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

export type ExtraData<E extends Record<string, string[]>> = {
  [K in keyof E]: {
    defaultValue: string[];
    dictionary: FieldDetail;
    optionsFetcher: (name: string) => Promise<{ label: string; value: string }[]>;
  };
};

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type DBdataDisplayConfig<T extends keyof DB, Card extends object, E extends Record<string, string[]>> = {
  table: {
    dataFetcher: () => Promise<DB[T][]>;
    columnDef: Array<ColumnDef<DB[T], unknown>>;
    hiddenColumnDef: Array<keyof DB[T]>;
    defaultSort: { id: keyof DB[T]; desc: boolean };
    tdGenerator: (props: { cell: Cell<DB[T], keyof DB[T]>; dictionary: Dic<DB[T]> }) => JSX.Element;
  };
  form: {
    data: DB[T];
    extraData?: ExtraData<E>;
    dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodTypeAny }>;
    hiddenFields: Array<keyof DB[T]>;
    fieldGenerators: Partial<{
      [K in keyof DB[T]]: (key: K, field: () => AnyFieldApi, dictionary: Dic<DB[T]>) => JSX.Element;
    }>;
    onChange?: (data: DB[T] & E) => void;
    onSubmit?: (data: DB[T] & E) => void;
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
  activity: activityDataConfig as DBdataDisplayConfig<"activity", any, any>,
  address: addressDataConfig as DBdataDisplayConfig<"address", any, any>,
  // armor: mobDataConfig,

  // consumable: mobDataConfig,
  // crystal: mobDataConfig,

  // item: mobDataConfig,
  // material: mobDataConfig,

  mob: mobDataConfig as DBdataDisplayConfig<"mob", any, any>,
  npc: npcDataConfig as DBdataDisplayConfig<"npc", any, any>,
  // option: mobDataConfig,

  skill: skillDataConfig as DBdataDisplayConfig<"skill", any, any>,

  // special: mobDataConfig,

  task: taskDataConfig as DBdataDisplayConfig<"task", any, any>,

  // weapon: mobDataConfig,
  // world: mobDataConfig,
  zone: zoneDataConfig as DBdataDisplayConfig<"zone", any, any>,
};
