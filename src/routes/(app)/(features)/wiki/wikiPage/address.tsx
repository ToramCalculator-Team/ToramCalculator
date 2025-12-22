import { getDB } from "@db/repositories/database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createSignal, createResource, createMemo, Show } from "solid-js";
import { LoadingBar } from "~/components/controls/loadingBar";
import { dictionary } from "~/locales/type";
import { Icons } from "~/components/icons/index";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { selectAllWorlds } from "@db/generated/repositories/world";

export const AddressPage = (dic: dictionary, itemHandleClick: (id: string) => void) => {
    const [expandedAddresses, setExpandedAddresses] = createSignal<Set<string>>(new Set());
    const [selectedWorldId, setSelectedWorldId] = createSignal<string>("");
  
    const [worlds] = createResource(async () => {
      const db = await getDB();
      return await db.selectFrom("world").selectAll("world").execute();
    });
  
    const [addresses] = createResource(async () => {
      const db = await getDB();
      return await db
        .selectFrom("address")
        .select((eb) => [
          jsonArrayFrom(eb.selectFrom("zone").whereRef("zone.addressId", "=", "address.id").selectAll("zone")).as(
            "zones",
          ),
        ])
        .selectAll("address")
        .execute();
    });
  
    const filteredAddresses = createMemo(() => {
      const worldId = selectedWorldId();
      if (!worldId) return addresses() || [];
      return (addresses() || []).filter((addr) => addr.worldId === worldId);
    });
  
    const gridInfo = createMemo(() => {
      const addressesData = filteredAddresses();
      if (!addressesData || addressesData.length === 0) return null;
      const posX = addressesData.map((a) => a.posX);
      const posY = addressesData.map((a) => a.posY);
      const minX = Math.min(...posX) - 1;
      const maxX = Math.max(...posX) + 1;
      const minY = Math.min(...posY) - 1;
      const maxY = Math.max(...posY) + 1;
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const addressMap = new Map(addressesData.map((a) => [a.posX + "," + a.posY, a]));
      const gridItems = [];
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const key = x + "," + y;
          const address = addressMap.get(key);
          gridItems.push({ x, y, address });
        }
      }
      return { minX, minY, maxX, maxY, width, height, gridItems };
    });
  
    const toggleExpand = (addressId: string) => {
      setExpandedAddresses((prev) => {
        const next = new Set(prev);
        if (next.has(addressId)) {
          next.delete(addressId);
        } else {
          next.add(addressId);
        }
        return next;
      });
    };
  
    return (
      <div class="AddressPage flex h-full w-full flex-col">
        {/* <div class=" px-6">
          <Select
            class="w-full"
            value={selectedWorldId()}
            setValue={setSelectedWorldId}
            optionsFetcher={async () => {
              const worlds = await selectAllWorlds();
              return worlds.map((world) => ({
                label: world.name,
                value: world.id,
              }));
            }}
          />
        </div> */}
        <OverlayScrollbarsComponent
          element="div"
          options={{ scrollbars: { autoHide: "scroll" } }}
          style={{ height: "100%", width: "100%" }}
        >
          <div class="Content relative h-full w-full">
            <Show
              when={gridInfo()}
              fallback={
                <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
                  <LoadingBar class="w-1/2 min-w-[320px]" />
                  <h1 class="animate-pulse">awaiting DB-address sync...</h1>
                </div>
              }
            >
              {(gridInfo) => (
                <div
                  class="grid gap-3 rounded-lg p-4"
                  style={{
                    "grid-template-columns": `repeat(${gridInfo().width}, minmax(128px, 1fr))`,
                    "grid-template-rows": `repeat(${gridInfo().height}, minmax(128px, 1fr))`,
                    "min-width": `${gridInfo().width * 140}px`,
                    "min-height": `${gridInfo().height * 140}px`,
                    position: "relative",
                    "z-index": 2,
                  }}
                >
                  {gridInfo().gridItems.map(({ x, y, address }) =>
                    address ? (
                      <button
                        class="bg-primary-color shadow-dividing-color relative flex cursor-pointer flex-col items-start justify-start gap-1 rounded p-2 shadow-md hover:shadow-xl"
                        style={{
                          "grid-column": x - gridInfo().minX + 1,
                          "grid-row": y - gridInfo().minY + 1,
                        }}
                        onClick={() => itemHandleClick(address.id)}
                      >
                        <div class="overflow-hidden font-bold text-nowrap text-ellipsis">{address.name}</div>
                        <div class="Divider bg-boundary-color h-px w-full flex-none rounded-full"></div>
                        <Show when={address.zones && address.zones.length > 0}>
                          <div class="Zones flex w-full flex-col items-start justify-start gap-1">
                            {(expandedAddresses().has(address.id) ? address.zones : address.zones.slice(0, 4)).map(
                              (zone) => (
                                <div class="text-main-text-color w-full overflow-hidden text-start text-sm text-nowrap text-ellipsis">
                                  {zone.name}
                                </div>
                              ),
                            )}
                            {address.zones.length > 4 && (
                              <Button
                                class="w-full rounded-md p-1!"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(address.id);
                                }}
                              >
                                {expandedAddresses().has(address.id) ? (
                                  <Icons.Outline.Left class="rotate-90" />
                                ) : (
                                  <Icons.Outline.Left class="rotate-270" />
                                )}
                              </Button>
                            )}
                          </div>
                        </Show>
                      </button>
                    ) : (
                      <Button
                        class="flex items-center justify-center border-2 border-dashed border-gray-300 bg-white text-xs text-gray-400"
                        style={{
                          "grid-column": x - gridInfo().minX + 1,
                          "grid-row": y - gridInfo().minY + 1,
                        }}
                      >
                        ({x}, {y})
                      </Button>
                    ),
                  )}
                </div>
              )}
            </Show>
          </div>
        </OverlayScrollbarsComponent>
      </div>
    );
  };