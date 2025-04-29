import { DB } from "~/../db/kysely/kyesely";
import { mobDataConfig } from "./mobDataConfig";
import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { JSX } from "solid-js";
import { ZodObject, ZodTypeAny } from "zod";
import { Dic } from "~/locales/type";
import { zoneDataConfig } from "./zoneConfig";
import { skillDataConfig } from "./skillDataConfig";
import { addressDataConfig } from "./addressConfig";
import { npcDataConfig } from "./npcConfig";

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type DBdataDisplayConfig<T extends keyof DB, Card extends object> = {
  table: {
    dataFetcher: () => Promise<DB[T][]>;
    columnDef: Array<ColumnDef<DB[T], unknown>>;
    hiddenColumnDef: Array<keyof DB[T]>;
    defaultSort: { id: keyof DB[T]; desc: boolean };
    tdGenerator: (props: { cell: Cell<DB[T], keyof DB[T]>; dictionary: Dic<DB[T]> }) => JSX.Element;
  };
  form: {
    data: DB[T];
    dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodTypeAny }>;
    hiddenFields: Array<keyof DB[T]>;
    fieldGenerator?: (key: keyof DB[T], field: () => AnyFieldApi, dictionary: Dic<DB[T]>) => JSX.Element;
    onChange?: (data: DB[T]) => void;
    onSubmit?: (data: DB[T]) => void;
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

export const DBDataConfig: Partial<Record<keyof DB, DBdataDisplayConfig<any, any>>> = {
  // activity: mobDataConfig,
  address: addressDataConfig as DBdataDisplayConfig<"address", any>,
  // armor: mobDataConfig,

  // consumable: mobDataConfig,
  // crystal: mobDataConfig,

  // item: mobDataConfig,
  // material: mobDataConfig,

  mob: mobDataConfig as DBdataDisplayConfig<"mob", any>,
  npc: npcDataConfig as DBdataDisplayConfig<"npc", any>,
  // option: mobDataConfig,

  skill: skillDataConfig as DBdataDisplayConfig<"skill", any>,

  // special: mobDataConfig,

  // task: mobDataConfig,

  // weapon: mobDataConfig,
  // world: mobDataConfig,
  zone: zoneDataConfig as DBdataDisplayConfig<"zone", any>,
};
