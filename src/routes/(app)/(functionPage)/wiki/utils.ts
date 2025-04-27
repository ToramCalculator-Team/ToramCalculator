import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { Transaction } from "kysely";
import { Accessor, JSX, Resource } from "solid-js";
import { z, ZodFirstPartyTypeKind, ZodObject, ZodRawShape, ZodSchema, ZodType, ZodTypeAny } from "zod";
import { DB } from "~/../db/kysely/kyesely";
import { DeepHiddenFields } from "~/components/module/objRender";
import { Dic } from "~/locales/type";
import { DataType } from "~/repositories/untils";

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
export type DBdataDisplayConfig<T extends Record<string, unknown>, Card extends object> = {
  table: {
    dataFetcher: () => Promise<T[]>;
    columnDef: Array<ColumnDef<T, unknown>>;
    hiddenColumnDef: Array<keyof T>;
    defaultSort: { id: keyof T; desc: boolean };
    tdGenerator: (props: { cell: Cell<T, keyof T>; dictionary: Dic<T> }) => JSX.Element;
  };
  form: {
    data: T;
    dataSchema: ZodObject<{ [K in keyof T]: ZodTypeAny }>;
    hiddenFields: Array<keyof T>;
    fieldGenerator?: (key: keyof T, field: () => AnyFieldApi, dictionary: Dic<T>) => JSX.Element;
    onChange?: (data: T) => void;
    onSubmit?: (data: T) => void;
  };
  card: {
    dataFetcher: (id: string) => Promise<Card>;
    dataSchema: ZodObject<Record<keyof Card, ZodTypeAny>>;
    deepHiddenFields: DeepHiddenFields<Card>;
    fieldGroupMap: Record<string, Array<keyof Card>>;
    fieldGenerator?: (key: keyof Card, value: Card[keyof Card], dictionary: Dic<Card>) => JSX.Element;
  };
};
