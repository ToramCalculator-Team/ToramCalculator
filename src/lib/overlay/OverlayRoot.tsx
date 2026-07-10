/**
 * @file OverlayRoot.tsx
 * @description 应用级弹出层根容器。取代旧的 GlobalCardContainer + GlobalFormContainer。
 *
 * 职责:
 * - 遍历 overlayStore.layers,按 kind 渲染对应层容器(DialogLayer / SheetLayer)。
 * - 每层外包 OverlayScopeProvider,注入本层 scope 供层内 render 使用 useOverlay 时读取。
 * - z-index 从 layerZIndex 派生,退休原来的 topGroup 二元切换。
 * - 层内多条 entry 的堆叠视觉(旋转、偏移)由 Dialog / Sheet 实例处理。
 */
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, For, type JSX, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { Frame } from "~/components/containers/frame";
import { useMedia } from "~/contexts/Media-component";
import { store } from "~/store";
import { makeEntryApi, OverlayScopeProvider } from "./OverlayContext";
import {
	completeEntryExit,
	completeLayerExit,
	type DialogLayer,
	type DialogLayerEntryState,
	layerZIndex,
	overlayLayers,
	requestCloseEntry,
	type SheetLayer,
	type SheetLayerEntryState,
} from "./overlayStore";

function SheetSurface(props: { children: JSX.Element }) {
	return <div class="Children flex flex-col gap-3 w-full h-full">{props.children}</div>;
}

function Dialog(props: {
	layerId: string;
	entry: DialogLayerEntryState;
	index: number;
	activeSize: () => number;
	total: () => number;
}) {
	const isVisible = () => props.total() - props.index < 5;
	const shouldRender = () => isVisible() || props.entry.closing;
	const layout = () => props.entry.layout ?? "content";
	const rotation = () => (props.activeSize() - props.index - 1) * 2;
	const closingDelay = () => (props.entry.closing ? Math.max(0, props.activeSize() - 1 - props.index) * 0.15 : 0);
	const title = () => (typeof props.entry.title === "function" ? props.entry.title() : props.entry.title);

	createEffect(() => {
		if (props.entry.closing && !store.settings.userInterface.isAnimationEnabled) {
			completeEntryExit(props.layerId, props.entry.id);
		}
	});

	const api = makeEntryApi({
		layerId: props.layerId,
		entryId: props.entry.id,
		index: () => props.index,
		total: props.total,
	});

	return (
		<Show when={shouldRender()}>
			<Motion.div
				class="DialogHost fixed top-1/2 left-1/2 max-h-[70vh] w-full max-w-[50vw] -translate-x-1/2 -translate-y-1/2 portrait:max-w-[90vw] lg:max-w-240 flex items-center justify-center"
				classList={{ "h-[70vh]": layout() === "fill" }}
				style={{ "z-index": props.index }}
				initial={{ transform: "rotate(0deg)", opacity: 0 }}
				animate={
					props.entry.closing
						? { transform: "rotate(0deg)", opacity: 0 }
						: { transform: `rotate(${rotation()}deg)`, opacity: 1 }
				}
				transition={{
					duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
					delay: closingDelay(),
				}}
				onMotionComplete={() => {
					if (props.entry.closing) completeEntryExit(props.layerId, props.entry.id);
				}}
			>
				<div
					role="application"
					class="DialogSurface bg-primary-color shadow-dividing-color shadow-dialog relative flex w-full flex-col items-center gap-3 rounded p-2"
					classList={{ "h-full": layout() === "fill" }}
					style={{ "max-width": props.entry.maxWidth }}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						e.stopPropagation();
						if (e.key === "Escape") api.close();
					}}
				>
					<Show when={title()}>
						<div class="DialogTitle z-10 drop-shadow-dividing-color absolute -top-3 flex items-center drop-shadow-xl">
							<svg width="30" height="48" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg">
								<title>Dialog Title Decorate</title>
								<path
									d="M13.8958 -6.07406e-07L-1.04907e-06 24L13.8958 48L29 48L29 -1.26763e-06L13.8958 -6.07406e-07Z"
									fill="rgb(var(--primary))"
								/>
								<path d="M19 6.99999L9 24L19 41L29 41L29 6.99999L19 6.99999Z" fill="currentColor" />
								<path
									d="M29.5 3.49999L29.5 44.5L16.2109 44.5L16.0664 44.249L4.56641 24.249L4.42285 24L4.56641 23.751L16.0664 3.75097L16.2109 3.49999L29.5 3.49999Z"
									stroke="currentColor"
									stroke-opacity="0.55"
								/>
							</svg>

							<div class="bg-primary-color z-10 -mx-px py-0.75">
								<div class="border-boundary-color flex items-center border-y py-0.75">
									<Show when={props.entry.titleIcon}>
										<div class="TitleIcon bg-accent-color flex items-center h-8.5 w-8.5">
											{props.entry.titleIcon?.()}
										</div>
									</Show>
									<h1 class="text-primary-color bg-accent-color py-0.75 text-xl font-bold">{title()}</h1>
								</div>
							</div>
							<svg width="30" height="48" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg">
								<title>Dialog Title Decorate</title>
								<path
									d="M16.1042 -6.07406e-07L30 24L16.1042 48L0.999998 48L1 -1.26763e-06L16.1042 -6.07406e-07Z"
									fill="rgb(var(--primary))"
								/>
								<path
									d="M0.500063 3.49999L0.500061 44.5L13.7891 44.5L13.9337 44.249L25.4337 24.249L25.5772 24L25.4337 23.751L13.9337 3.75097L13.7891 3.49999L0.500063 3.49999Z"
									stroke="currentColor"
									stroke-opacity="0.55"
								/>
								<path d="M11 6.99999L21 24L11 41L1.00003 41L1.00003 6.99999L11 6.99999Z" fill="currentColor" />
							</svg>
						</div>
					</Show>
					<Frame>
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							class="h-full w-full flex-1 rounded border-8 border-primary-color"
						>
							<div class="Childern mx-3 my-6 flex flex-col gap-3">{props.entry.render(api)}</div>
						</OverlayScrollbarsComponent>
					</Frame>
				</div>
			</Motion.div>
		</Show>
	);
}

function DialogLayerView(props: { layer: DialogLayer }) {
	const entries = () => props.layer.entries;
	const activeSize = () => entries().filter((e) => !e.closing).length;

	createEffect(() => {
		if (props.layer.closing && !store.settings.userInterface.isAnimationEnabled) {
			completeLayerExit(props.layer.id);
		}
	});

	return (
		<Show when={entries().length > 0 || props.layer.closing}>
			<div
				class="DialogLayerHost pointer-events-none fixed top-0 left-0 h-dvh w-dvw"
				style={{ "z-index": layerZIndex(props.layer.id) }}
			>
				<Motion.div
					initial={{ transform: "scale(1.05)", opacity: 0 }}
					animate={
						props.layer.closing ? { transform: "scale(1.05)", opacity: 0 } : { transform: "scale(1)", opacity: 1 }
					}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="DialogLayerSurface bg-primary-color-10 pointer-events-auto absolute top-0 left-0 grid h-dvh w-dvw transform place-items-center backdrop-blur"
					onClick={() => {
						requestCloseEntry(props.layer.id);
					}}
					onMotionComplete={() => {
						if (props.layer.closing) completeLayerExit(props.layer.id);
					}}
				>
					<OverlayScopeProvider layerId={props.layer.id} kind="dialog">
						<For each={entries()}>
							{(entry, entryIndex) => (
								<Dialog
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
			</div>
		</Show>
	);
}

function Sheet(props: { layerId: string; entry: SheetLayerEntryState; index: number; total: () => number }) {
	const media = useMedia();
	const offsetLevel = () => props.total() - props.index - 1;
	const shouldRender = () => props.entry.closing || props.total() > props.index;

	createEffect(() => {
		if (props.entry.closing && !store.settings.userInterface.isAnimationEnabled) {
			completeEntryExit(props.layerId, props.entry.id);
		}
	});

	const api = makeEntryApi({
		layerId: props.layerId,
		entryId: props.entry.id,
		index: () => props.index,
		total: props.total,
	});

	return (
		<Show when={shouldRender()}>
			<div
				class="SheetHost absolute portrait:bottom-0 portrait:w-dvw landscape:right-0 landscape:h-dvh"
				style={{
					"z-index": props.index,
					width: media.orientation === "landscape" ? `${offsetLevel() > 0 ? 100 : 90}vw` : "100vw",
					height: media.orientation === "landscape" ? "100vh" : `${offsetLevel() > 0 ? 100 : 90}vh`,
				}}
			>
				<Motion.div
					initial={{
						transform: media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)",
					}}
					animate={
						props.entry.closing
							? {
									transform: media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)",
								}
							: {
									transform: "translateY(0)",
								}
					}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
					}}
					onMotionComplete={() => {
						if (props.entry.closing) completeEntryExit(props.layerId, props.entry.id);
					}}
					class="SheetContent bg-primary-color shadow-dividing-color shadow-dialog flex h-full w-full flex-col items-center overflow-y-auto portrait:rounded-t-[12px]"
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
			</div>
		</Show>
	);
}

function SheetLayerView(props: { layer: SheetLayer }) {
	const entries = () => props.layer.entries;

	createEffect(() => {
		if (props.layer.closing && !store.settings.userInterface.isAnimationEnabled) {
			completeLayerExit(props.layer.id);
		}
	});

	return (
		<Show when={entries().length > 0 || props.layer.closing}>
			<div
				class="SheetLayerHost pointer-events-none fixed top-0 left-0 h-dvh w-dvw"
				style={{ "z-index": layerZIndex(props.layer.id) }}
			>
				<Motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: props.layer.closing ? 0 : 1 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="SheetLayerSurface bg-primary-color-10 pointer-events-auto absolute top-0 left-0 grid h-dvh w-dvw transform place-items-center backdrop-blur"
					onClick={() => requestCloseEntry(props.layer.id)}
					onMotionComplete={() => {
						if (props.layer.closing) completeLayerExit(props.layer.id);
					}}
				>
					<OverlayScopeProvider layerId={props.layer.id} kind="sheet">
						<For each={entries()}>
							{(entry, entryIndex) => (
								<Sheet layerId={props.layer.id} entry={entry} index={entryIndex()} total={() => entries().length} />
							)}
						</For>
					</OverlayScopeProvider>
				</Motion.div>
			</div>
		</Show>
	);
}

export function OverlayRoot() {
	return (
		<For each={overlayLayers()}>
			{(layer) => (layer.kind === "dialog" ? <DialogLayerView layer={layer} /> : <SheetLayerView layer={layer} />)}
		</For>
	);
}
