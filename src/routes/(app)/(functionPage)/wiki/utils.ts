import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { Transaction } from "kysely";
import { Accessor, JSX, Resource } from "solid-js";
import { z, ZodFirstPartyTypeKind, ZodObject, ZodRawShape, ZodSchema, ZodType } from "zod";
import { DB } from "~/../db/kysely/kyesely";
import { DeepHiddenFields } from "~/components/module/objRender";

export function fieldInfo(field: AnyFieldApi): string {
  const errors =
    field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(",") : null;
  const isValidating = field.state.meta.isValidating ? "..." : null;
  if (errors) {
    console.log(field.state.meta.errors);
    return errors;
  }
  if (isValidating) {
    return isValidating;
  }
  return "";
}

export const getZodType = <T extends z.ZodTypeAny>(schema: T): ZodFirstPartyTypeKind => {
  if (schema === undefined || schema == null) {
    return ZodFirstPartyTypeKind.ZodUndefined;
  }
  if ("_def" in schema) {
    if ("innerType" in schema._def) {
      return getZodType(schema._def.innerType);
    } else {
      return schema._def.typeName as ZodFirstPartyTypeKind;
    }
  }
  return ZodFirstPartyTypeKind.ZodUndefined;
};

// DB表的数据配置，包括表格配置，表单配置，卡片配置
export type DBdataDisplayConfig<T extends keyof DB, Card> = {
  tableName: T;
  table: {
    dataList: Resource<DB[T][]>;
    columnDef: Array<ColumnDef<DB[T]>>;
    hiddenColumnDef: Array<keyof DB[T]>;
    defaultSort: { id: keyof DB[T]; desc: boolean };
    dataListRefetcher: () => void;
    tdGenerator: (props: { cell: Cell<DB[T], keyof DB[T]> }) => JSX.Element;
  };
  form: {
    defaultData: DB[T];
    data: Accessor<DB[T]>;
    hiddenFields: Array<keyof DB[T]>;
    fieldGenerator?: (key: keyof DB[T], field: () => AnyFieldApi) => JSX.Element;
    createData: (trx: Transaction<DB>, item: DB[T]) => Promise<DB[T] | null>;
    dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodSchema }>;
    refetchItemList: () => void;
  };
  card: {
    dataFetcher: (id: string) => Promise<DB[T]>;
    dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodSchema }>;
    fieldGroupMap: Record<string, Array<keyof Card>>;
    fieldGenerator?: (key: keyof DB[T], value: DB[T][keyof DB[T]]) => JSX.Element;
    hiddenFields: DeepHiddenFields<DB[T]>;
  };
};
