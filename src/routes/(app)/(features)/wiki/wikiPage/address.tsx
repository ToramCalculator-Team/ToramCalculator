import { selectAllWorlds } from "@db/generated/repositories/world";
import { getDB } from "@db/repositories/database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createResource, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons/index";
import type { Dictionary } from "~/locales/type";

export const AddressPage = (dic: Dictionary, itemHandleClick: (id: string) => void) => {
	const [expandedAddresses, setExpandedAddresses] = createSignal<Set<string>>(new Set());
	const [selectedWorldId, setSelectedWorldId] = createSignal<string>("Iruna World");
	const [OverlayScrollbarsComponentRef, setOverlayScrollbarsComponentRef] = createSignal<
		OverlayScrollbarsComponentRef | undefined
	>(undefined);

	const [worlds] = createResource(() => selectAllWorlds());

	createEffect(() => {
		const worldList = worlds();
		if (!worldList || worldList.length === 0) return;

		const currentWorldId = selectedWorldId();
		const hasCurrentWorld = worldList.some((world) => world.id === currentWorldId);
		if (!currentWorldId || !hasCurrentWorld) {
			setSelectedWorldId(worldList[0]?.id ?? "");
		}
	});

	const [addresses] = createResource(selectedWorldId, async (worldId) => {
		if (!worldId) return [];

		const db = await getDB();
		return await db
			.selectFrom("address")
			.where("address.worldId", "=", worldId)
			.select((eb) => [
				jsonArrayFrom(eb.selectFrom("zone").whereRef("zone.addressId", "=", "address.id").selectAll("zone")).as(
					"zones",
				),
			])
			.selectAll("address")
			.orderBy("address.posY", "asc")
			.orderBy("address.posX", "asc")
			.execute();
	});

	const gridInfo = createMemo(() => {
		const addressesData = addresses() || [];
		if (!addressesData || addressesData.length === 0) return null;
		const posX = addressesData.map((a) => a.posX);
		const posY = addressesData.map((a) => a.posY);
		// 以原点为中心扩展网格，保证 (0,0) 始终位于正中间
		const maxAbsX = Math.max(...posX.map((x) => Math.abs(x))) + 1;
		const maxAbsY = Math.max(...posY.map((y) => Math.abs(y))) + 1;
		const minX = -maxAbsX;
		const maxX = maxAbsX;
		const minY = -maxAbsY;
		const maxY = maxAbsY;
		const width = maxX - minX + 1;
		const height = maxY - minY + 1;
		const addressMap = new Map(addressesData.map((a) => [`${a.posX},${a.posY}`, a]));
		const gridItems = [];
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				const key = `${x},${y}`;
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

	const centerScrollbars = () => {
		const scrollElement = OverlayScrollbarsComponentRef()?.osInstance()?.elements().scrollOffsetElement;
		if (!scrollElement) return;

		scrollElement.scrollTo({
			left: Math.max(0, (scrollElement.scrollWidth - scrollElement.clientWidth) / 2),
			top: Math.max(0, (scrollElement.scrollHeight - scrollElement.clientHeight) / 2),
			behavior: "auto",
		});
	};

	createEffect(() => {
		const currentWorldId = selectedWorldId();
		const currentGridInfo = gridInfo();
		if (!currentWorldId || !currentGridInfo || worlds.loading || addresses.loading) return;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				centerScrollbars();
			});
		});
	});

	return (
		<div class="AddressPage flex h-full w-full flex-col">
			<Show
				when={!worlds.loading && !addresses.loading}
				fallback={
					<div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
						<LoadingBar class="w-1/2 min-w-[320px]" />
						<h1 class="animate-pulse">loading...</h1>
					</div>
				}
			>
				<div class="flex flex-col border-b border-dividing-color py-3 px-6">
					<Select
						class="w-full"
						value={selectedWorldId()}
						setValue={setSelectedWorldId}
						options={(worlds() ?? []).map((world) => ({
							label: world.name,
							value: world.id,
						}))}
						placeholder={`选择${dic.db.world.selfName}`}
					/>
				</div>
				<OverlayScrollbarsComponent
					ref={setOverlayScrollbarsComponentRef}
					element="div"
					options={{ scrollbars: { autoHide: "scroll" } }}
					style={{ height: "100%", width: "100%" }}
				>
					<div class="Content relative h-full w-full">
						<Show when={gridInfo()}>
							{(validGridInfo) => (
								<div
									class="grid gap-3 rounded-lg p-4"
									style={{
										"grid-template-columns": `repeat(${validGridInfo().width}, minmax(128px, 1fr))`,
										"grid-template-rows": `repeat(${validGridInfo().height}, minmax(128px, 1fr))`,
										"min-width": `${validGridInfo().width * 200}px`,
										"min-height": `${validGridInfo().height * 200}px`,
										position: "relative",
										"z-index": 2,
									}}
								>
									<For each={validGridInfo().gridItems}>
										{({ x, y, address }) => (
											<Show
												when={address}
												fallback={
													<Button
														class="flex items-center justify-center border border-dashed border-dividing-color"
														style={{
															"grid-column": x - validGridInfo().minX + 1,
															"grid-row": y - validGridInfo().minY + 1,
														}}
													>
														({x}, {y})
													</Button>
												}
											>
												{(address) => (
													<button
														type="button"
														class="bg-primary-color overflow-hidden shadow-dividing-color relative flex cursor-pointer flex-col rounded shadow-md hover:shadow-xl"
														style={{
															"grid-column": x - validGridInfo().minX + 1,
															"grid-row": y - validGridInfo().minY + 1,
														}}
														onClick={() => itemHandleClick(address().id)}
													>
														<div class="Name overflow-hidden font-bold text-nowrap text-ellipsis p-2 bg-accent-color text-primary-color w-full">
															{address().name}
														</div>
														<Show when={address().zones && address().zones.length > 0}>
															<div class="Zones flex w-full flex-col items-start justify-start gap-1 p-2">
																<For
																	each={
																		expandedAddresses().has(address().id)
																			? address().zones
																			: address().zones.slice(0, 4)
																	}
																>
																	{(zone) => (
																		<div class="text-main-text-color w-full overflow-hidden text-start text-sm text-nowrap text-ellipsis">
																			{zone.name}
																		</div>
																	)}
																</For>
																<Show when={address().zones.length > 4}>
																	<Button
																		class="w-full rounded-md p-1!"
																		onClick={(e) => {
																			e.stopPropagation();
																			toggleExpand(address().id);
																		}}
																	>
																		{expandedAddresses().has(address().id) ? (
																			<Icons.Outline.Left class="rotate-90" />
																		) : (
																			<Icons.Outline.Left class="rotate-270" />
																		)}
																	</Button>
																</Show>
															</div>
														</Show>
													</button>
												)}
											</Show>
										)}
									</For>
								</div>
							)}
						</Show>
					</div>
				</OverlayScrollbarsComponent>
			</Show>
		</div>
	);
};
