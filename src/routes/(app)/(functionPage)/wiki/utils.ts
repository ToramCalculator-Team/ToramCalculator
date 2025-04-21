import { AnyFieldApi } from "@tanstack/solid-form";
import { ColumnDef, Cell } from "@tanstack/solid-table";
import { Transaction } from "kysely";
import { Accessor, JSX, Resource } from "solid-js";
import { z, ZodFirstPartyTypeKind, ZodObject, ZodSchema } from "zod";
import { DB } from "~/../db/kysely/kyesely";

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

export type WikiPageConfig<T extends keyof DB> = {
  tableName: T;
  table: {
    columns: Array<ColumnDef<DB[T]>>;
    dataList: Resource<DB[T][]>;
    dataListRefetcher: () => void;
    hiddenColumns: Array<keyof DB[T]>;
    tdGenerator: (props: { cell: Cell<DB[T], keyof DB[T]> }) => JSX.Element;
  };
  form: {
    defaultData: DB[T];
    data: Accessor<DB[T]>;
    hiddenFields: Array<keyof DB[T]>;
    fieldGenerator?: (key: keyof DB[T], field: AnyFieldApi) => JSX.Element;
    createData: (trx: Transaction<DB>, item: DB[T]) => Promise<DB[T] | null>;
    dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodSchema }>;
    refetchItemList: () => void;
  };
  card: {
    hiddenFields: Array<keyof DB[T]>;
    fieldGenerator?: (key: keyof DB[T], field: AnyFieldApi) => JSX.Element;
  };
};
