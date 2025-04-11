import { createEffect, createMemo, createResource, createSignal, For, JSX, on, Show } from "solid-js";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";

import { setStore, store } from "~/store";
import { type Locale } from "~/locales/i18n";
import { ConvertToAllString } from "~/repositories/client/untils";
import { DB } from "~/../db/kysely/kyesely";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";

interface FieldInfoProps {
  field: AnyFieldApi;
}

function FieldInfo(props: FieldInfoProps) {
  return (
    <>
      {props.field.state.meta.isTouched && props.field.state.meta.errors.length ? (
        <em>{props.field.state.meta.errors.join(",")}</em>
      ) : null}
      {props.field.state.meta.isValidating ? "Validating..." : null}
    </>
  );
}

export default function Form<Item>(props: {
  tableName: keyof DB;
  item: () => Item;
  itemDic: (locale: Locale) => ConvertToAllString<Item>;
  formHiddenColumns: Array<keyof Item>;
}) {
  const form = createForm(() => ({
    defaultValues: {
      firstName: "",
      lastName: "",
    },
    onSubmit: async ({ value }) => {
      // Do something with form data
      console.log(value);
    },
  }));

  return (
    <div>
      <h1>Simple Form Example</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div>
          {/* A type-safe field component*/}
          <form.Field
            name="firstName"
            validators={{
              onChange: ({ value }) =>
                !value
                  ? "A first name is required"
                  : value.length < 3
                    ? "First name must be at least 3 characters"
                    : undefined,
              onChangeAsyncDebounceMs: 500,
              onChangeAsync: async ({ value }) => {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                return value.includes("error") && 'No "error" allowed in first name';
              },
            }}
            children={(field) => {
              // Avoid hasty abstractions. Render props are great!
              return (
                <>
                  <label for={field().name}>First Name:</label>
                  <input
                    id={field().name}
                    name={field().name}
                    value={field().state.value}
                    onBlur={field().handleBlur}
                    onInput={(e) => field().handleChange(e.target.value)}
                  />
                  <FieldInfo field={field()} />
                </>
              );
            }}
          />
        </div>
        <div>
          <form.Field
            name="lastName"
            children={(field) => (
              <>
                <label for={field().name}>Last Name:</label>
                <input
                  id={field().name}
                  name={field().name}
                  value={field().state.value}
                  onBlur={field().handleBlur}
                  onInput={(e) => field().handleChange(e.target.value)}
                />
                <FieldInfo field={field()} />
              </>
            )}
          />
        </div>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <button type="submit" disabled={!state().canSubmit}>
                {state().isSubmitting ? "..." : "Submit"}
              </button>
            );
          }}
        />
      </form>
    </div>
  );
}
