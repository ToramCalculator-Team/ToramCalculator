/**
 * @file OverlayRoot.tsx
 * @description 应用级弹出层根容器。取代旧的 GlobalCardContainer + GlobalFormContainer。
 *
 * 职责:
 * - 遍历 overlayStore.layers,按 kind 渲染对应层容器(CardLayer / FormLayer)。
 * - 每层外包 OverlayScopeProvider,注入本层 scope 供层内 render 使用 useOverlay 时读取。
 * - z-index 从 layerZIndex 派生,退休原来的 topGroup 二元切换。
 * - 层内多条 entry 的堆叠视觉(旋转、偏移)由现有 Card / FormSheet 组件自己处理。
 */
import { For, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Card } from "~/components/business/card/Card";
import { FormSheet } from "~/components/business/form/FormSheet";
import { store } from "~/store";
import { makeEntryApi, OverlayScopeProvider } from "./OverlayContext";
import { commitEntryRemoval, commitLayerRemoval, layerZIndex, type OverlayLayer, overlayLayers } from "./overlayStore";

function CardLayer(props: { layer: OverlayLayer }) {
	const entries = () => props.layer.entries;
	// 层内堆叠角度用 activeSize(非 closing 的数量)计算,与旧行为一致
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
						// 遮罩点击关最顶部 entry(旧 GlobalCardContainer 行为一致)
						const top = entries().findLast((e) => !e.closing);
						if (top) commitEntryRemoval(props.layer.id, top.id);
					}}
					onMotionComplete={() => {
						if (props.layer.closing) commitLayerRemoval(props.layer.id);
					}}
				>
					<OverlayScopeProvider layerId={props.layer.id} kind="card">
						<For each={entries()}>
							{(entry, entryIndex) => {
								const api = makeEntryApi({
									layerId: props.layer.id,
									entryId: entry.id,
									index: () => entryIndex(),
									total: () => entries().length,
								});
								const content = entry.render(api);
								return (
									<Card
										display={entries().length - entryIndex() < 5}
										index={entryIndex()}
										total={activeSize()}
										titleIcon={entry.titleIcon}
										title={entry.title ?? ""}
										closing={entry.closing}
										onExitComplete={() => commitEntryRemoval(props.layer.id, entry.id)}
									>
										{content}
									</Card>
								);
							}}
						</For>
					</OverlayScopeProvider>
				</Motion.div>
			</Show>
		</Presence>
	);
}

function FormLayer(props: { layer: OverlayLayer }) {
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
					onMotionComplete={() => {
						if (props.layer.closing) commitLayerRemoval(props.layer.id);
					}}
				>
					<OverlayScopeProvider layerId={props.layer.id} kind="form">
						<For each={entries()}>
							{(entry, entryIndex) => {
								const api = makeEntryApi({
									layerId: props.layer.id,
									entryId: entry.id,
									index: () => entryIndex(),
									total: () => entries().length,
								});
								return (
									<FormSheet
										display={!entry.closing}
										index={entryIndex()}
										total={entries().length}
										onClose={api.closeTop}
										onExitComplete={() => commitEntryRemoval(props.layer.id, entry.id)}
									>
										{entry.render(api)}
									</FormSheet>
								);
							}}
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
				<Show when={layer.kind === "card"} fallback={<FormLayer layer={layer} />}>
					<CardLayer layer={layer} />
				</Show>
			)}
		</For>
	);
}
