import { AnyFieldApi, createForm } from "@tanstack/solid-form";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  on,
  onMount,
  Resource,
  Show,
  useContext,
} from "solid-js";
import { z, ZodEnum, ZodFirstPartyTypeKind, ZodObject, ZodSchema } from "zod";
import { store, setStore } from "~/store";
import { DB } from "~/../db/kysely/kyesely";
import { MediaContext } from "~/contexts/Media";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { LoadingBar } from "../loadingBar";

const getZodType = <T extends z.ZodTypeAny>(schema: T): ZodFirstPartyTypeKind => {
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

function fieldInfo(field: AnyFieldApi): string {
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

export const ObjDisplayer = <T extends keyof DB>(props: {
  tableName: T;
  dataFetcher: (id: string) => Promise<DB[T]>;
  dataSchema: ZodObject<{ [K in keyof DB[T]]: ZodSchema }>;
  fieldGroupMap: Record<string, Array<keyof DB[T]>>;
  fieldGenerator?: (key: keyof DB[T], field: () => AnyFieldApi) => JSX.Element;
  hiddenFields: Array<keyof DB[T]>;
}) => {
  const media = useContext(MediaContext);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [data, { refetch: refetchData }] = createResource(() => store.wiki[props.tableName]?.id, props.dataFetcher);
  const [fieldGrounp, setFieldGroup] = createSignal<
    {
      key: keyof DB[T];
      dom: JSX.Element;
    }[]
  >([]);

  onMount(() => {
    console.log("--ObjDisplayer Render");
  });

  return (
    <Show when={data()} fallback={<LoadingBar />}>
      {(resolvedData) => (
        <div class="FieldGroupContainer flex w-full flex-col gap-3">
          <For each={Object.entries(props.fieldGroupMap)}>
            {([key, fields]) => (
              <div class="FieldGroup w-full">
                <h1 class="text-accent-color flex items-center gap-2 font-bold">
                  {key}
                  <div class="Divider bg-dividing-color h-[1px] w-full flex-1"></div>
                </h1>
                <div class="Content flex flex-col gap-3 p-1">
                  <For each={fields}>
                    {(field) => {
                      const fieldValue = resolvedData()[field];
                      const zodValue = props.dataSchema.shape[field];
                      const valueType = getZodType(zodValue);

                      if (props.hiddenFields.includes(field)) return null;

                      switch (valueType) {
                        case ZodFirstPartyTypeKind.ZodArray:
                        case ZodFirstPartyTypeKind.ZodObject:
                        case ZodFirstPartyTypeKind.ZodLazy:
                          return (
                            <div class="Field flex gap-2">
                              <span class="text-main-text-color">{field.toString()}</span>:
                              <pre class="text-accent-color">{JSON.stringify(fieldValue, null, 2)}</pre>
                              <span class="text-dividing-color">{`[${valueType}]`}</span>
                            </div>
                          );

                        case ZodFirstPartyTypeKind.ZodBoolean:
                        case ZodFirstPartyTypeKind.ZodEnum:
                        case ZodFirstPartyTypeKind.ZodNumber:
                        default:
                          return (
                            <div class="Field flex gap-2">
                              <span class="text-main-text-color">
                                {dictionary().db.mob.fields[field]?.key ?? field}
                              </span>
                              :<span class="text-accent-color font-bold">{String(fieldValue)}</span>
                              <span class="text-dividing-color">{`[${valueType}]`}</span>
                            </div>
                          );
                      }
                    }}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      )}
    </Show>
  );
};
