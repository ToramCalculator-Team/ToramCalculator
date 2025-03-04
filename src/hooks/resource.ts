import { createResource, createEffect, on } from "solid-js";
import { store } from "~/store";

export function createSyncResource<T>(
  table: keyof typeof store.database.tableSyncState,
  fetcher: () => Promise<T>
) {
  const [resource, { refetch }] = createResource(fetcher);

  createEffect(
    on(
      () => store.database.tableSyncState[table],
      () => {
        console.log(`sync: ${table} changed`);
        refetch();
      },
      { defer: true }
    )
  );

  return resource;
}