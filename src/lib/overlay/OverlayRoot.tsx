/**
 * @file OverlayRoot.tsx
 * @description 应用级弹出层根容器。取代旧的 GlobalCardContainer + GlobalFormContainer。
 *
 * 职责:
 * - 遍历 overlayStore.layers,按 kind 渲染对应层容器(DialogLayer / SheetLayer)。
 * - 每层外包 OverlayScopeProvider,注入本层 scope 供层内 render 使用 useOverlay 时读取。
 * - z-index 从 layerZIndex 派生,退休原来的 topGroup 二元切换。
 * - 层内多条 entry 的堆叠视觉(旋转、偏移)由 DialogLayer / SheetLayer 处理。
 */
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, For, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Dialog } from "~/components/containers/dialog";
import { SheetSurface } from "~/components/containers/sheet";
import { useMedia } from "~/contexts/Media-component";
import { store } from "~/store";
import { makeEntryApi, OverlayScopeProvider } from "./OverlayContext";
import {
	closeEntry,
	commitEntryRemoval,
	commitLayerRemoval,
	layerZIndex,
	type OverlayEntryState,
	type OverlayLayer,
	overlayLayers,
} from "./overlayStore";

function DialogEntry(props: {
	layerId: string;
	entry: OverlayEntryState;
	index: number;
	activeSize: () => number;
	total: () => number;
}) {
	const isVisible = () => props.total() - props.index < 5;
	const rotation = () => (props.activeSize() - props.index - 1) * 2;
	const closingDelay = () => (props.entry.closing ? Math.max(0, props.activeSize() - 1 - props.index) * 0.15 : 0);
	const title = () => (typeof props.entry.title === "function" ? props.entry.title() : props.entry.title);

	createEffect(() => {
		if (props.entry.closing && !store.settings.userInterface.isAnimationEnabled) {
			commitEntryRemoval(props.layerId, props.entry.id);
		}
	});

	const api = makeEntryApi({
		layerId: props.layerId,
		entryId: props.entry.id,
		index: () => props.index,
		total: props.total,
	});

	return (
		<Presence exitBeforeEnter>
			<Show when={isVisible() && !props.entry.closing}>
				<Motion.div
					initial={{ transform: "translate(-50%, -50%) rotate(0deg)", opacity: 0 }}
					animate={{ transform: `translate(-50%, -50%) rotate(${rotation()}deg)`, opacity: 1 }}
					exit={{ transform: "translate(-50%, -50%) rotate(0deg)", opacity: 0 }}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
						delay: closingDelay(),
					}}
					onMotionComplete={() => {
						if (props.entry.closing) commitEntryRemoval(props.layerId, props.entry.id);
					}}
					class="DialogEntry fixed top-1/2 left-1/2 max-h-[70vh] lg:max-w-240 w-full h-full max-w-[50vw] portrait:max-w-[90vw]"
					style={{ "z-index": props.index }}
					onClick={(e) => e.stopPropagation()}
				>
					<Dialog title={title()} titleIcon={props.entry.titleIcon} maxWith={props.entry.maxWith}>
						{props.entry.render(api)}
					</Dialog>
				</Motion.div>
			</Show>
		</Presence>
	);
}

function DialogLayer(props: { layer: OverlayLayer }) {
	const entries = () => props.layer.entries;
	const activeSize = () => entries().filter((e) => !e.closing).length;

	return (
		<Presence exitBeforeEnter>
			<Show when={!props.layer.closing && entries().length > 0}>
				<Motion.div
					animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
					exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="DialogBG bg-primary-color-10 pointer-events-auto fixed top-0 left-0 grid h-dvh w-dvw transform place-items-center backdrop-blur"
					style={{ "z-index": layerZIndex(props.layer.id) }}
					onClick={() => {
						closeEntry(props.layer.id);
					}}
					onMotionComplete={() => {
						if (props.layer.closing) commitLayerRemoval(props.layer.id);
					}}
				>
					<OverlayScopeProvider layerId={props.layer.id} kind="dialog">
						<For each={entries()}>
							{(entry, entryIndex) => (
								<DialogEntry
									layerId={props.layer.id}
									entry={entry}
									index={entryIndex()}
									activeSize={activeSize}
									total={() => entries().length}
								/>
							)}
						</For>
					</OverlayScopeProvider>
				</Motion.div>
			</Show>
		</Presence>
	);
}

function SheetEntry(props: { layerId: string; entry: OverlayEntryState; index: number; total: () => number }) {
	const media = useMedia();
	const offsetLevel = () => props.total() - props.index - 1;

	createEffect(() => {
		if (props.entry.closing && !store.settings.userInterface.isAnimationEnabled) {
			commitEntryRemoval(props.layerId, props.entry.id);
		}
	});

	const api = makeEntryApi({
		layerId: props.layerId,
		entryId: props.entry.id,
		index: () => props.index,
		total: props.total,
	});

	return (
		<Presence exitBeforeEnter>
			<Show when={!props.entry.closing}>
				<Motion.div
					animate={{
						transform: [media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)", "translateY(0)"],
						filter: ["blur(12px)", "blur(0px)"],
					}}
					exit={{
						transform: ["translateY(0)", media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)"],
						filter: ["blur(0px)", "blur(12px)"],
					}}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
					}}
					onMotionComplete={() => {
						if (props.entry.closing) commitEntryRemoval(props.layerId, props.entry.id);
					}}
					class="SheetContent absolute bg-primary-color shadow-dividing-color shadow-dialog flex flex-col items-center overflow-y-auto portrait:rounded-t-[12px] portrait:bottom-0 portrait:w-dvw landscape:right-0 landscape:h-dvh"
					style={{
						"z-index": props.index,
						width: media.orientation === "landscape" ? `${offsetLevel() > 0 ? 100 : 90}vw` : "100vw",
						height: media.orientation === "landscape" ? "100vh" : `${offsetLevel() > 0 ? 100 : 90}vh`,
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<OverlayScrollbarsComponent
						element="div"
						options={{ scrollbars: { autoHide: "scroll" } }}
						class="h-full w-full flex-1"
					>
						<SheetSurface>{props.entry.render(api)}</SheetSurface>
					</OverlayScrollbarsComponent>
				</Motion.div>
			</Show>
		</Presence>
	);
}

function SheetLayer(props: { layer: OverlayLayer }) {
	const entries = () => props.layer.entries;

	return (
		<Presence exitBeforeEnter>
			<Show when={!props.layer.closing && entries().length > 0}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="GlobalFormContainer pointer-events-auto fixed top-0 left-0 h-dvh w-dvw"
					style={{ "z-index": layerZIndex(props.layer.id) }}
					onClick={() => closeEntry(props.layer.id)}
					onMotionComplete={() => {
						if (props.layer.closing) commitLayerRemoval(props.layer.id);
					}}
				>
					<OverlayScopeProvider layerId={props.layer.id} kind="sheet">
						<For each={entries()}>
							{(entry, entryIndex) => (
								<SheetEntry
									layerId={props.layer.id}
									entry={entry}
									index={entryIndex()}
									total={() => entries().length}
								/>
							)}
						</For>
					</OverlayScopeProvider>
				</Motion.div>
			</Show>
		</Presence>
	);
}

export function OverlayRoot() {
	return (
		<For each={overlayLayers()}>
			{(layer) => (
				<Show when={layer.kind === "dialog"} fallback={<SheetLayer layer={layer} />}>
					<DialogLayer layer={layer} />
				</Show>
			)}
		</For>
	);
}
