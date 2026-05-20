import type { Component } from "solid-js";
import type { NodeType } from "../../types/workflow";

export type NodeProps = {
	wrapped: Component<NodeType>;
	model: NodeType;
	selected?: boolean;
	onClick?: (nodeId: string) => void;
	onLongPress?: (nodeId: string) => void;
	onDragStart?: (nodeId: string) => void;
	onPointerDragMove?: (clientX: number, clientY: number) => void;
	onPointerDragEnd?: (clientX: number, clientY: number) => void;
	onDragEnd?: () => void;
	readOnly?: boolean;
};

export const Node: Component<NodeProps> = (props) => {
	const Wrapped = props.wrapped;
	// 设计说明：节点交互以 pointer 状态机为准，松开前才判定点击或拖拽，避免移动端按下节点时立即打开属性面板。
	type PointerInteraction =
		| { state: "idle" }
		| { state: "pressed"; pointerId: number; startX: number; startY: number }
		| { state: "dragging"; pointerId: number };
	let pointerInteraction: PointerInteraction = { state: "idle" };
	let skipNextNativeClick = false;
	let nativeClickResetTimer: number | undefined;
	let nodeButtonRef: HTMLButtonElement | undefined;
	const dragActivationDistance = 6;
	const canDrag = () => !props.readOnly && props.model.type !== "root" && !props.model.isPlaceholder;

	const resetPointerInteraction = () => {
		pointerInteraction = { state: "idle" };
	};

	const releasePointerCapture = (pointerId: number) => {
		if (nodeButtonRef?.hasPointerCapture(pointerId)) {
			nodeButtonRef.releasePointerCapture(pointerId);
		}
	};

	const markNativeClickHandledByPointer = () => {
		skipNextNativeClick = true;
		if (nativeClickResetTimer !== undefined) window.clearTimeout(nativeClickResetTimer);
		nativeClickResetTimer = window.setTimeout(() => {
			skipNextNativeClick = false;
			nativeClickResetTimer = undefined;
		}, 80);
	};

	const clearNativeClickSkip = () => {
		skipNextNativeClick = false;
		if (nativeClickResetTimer !== undefined) {
			window.clearTimeout(nativeClickResetTimer);
			nativeClickResetTimer = undefined;
		}
	};

	return (
		<div class="relative inline-flex items-center">
			<button
				ref={nodeButtonRef}
				type="button"
				data-bt-node-id={props.model.id}
				data-bt-placeholder={props.model.isPlaceholder ? "true" : undefined}
				class={`touch-none select-none bg-transparent p-0 text-left ${canDrag() ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
				draggable={false}
				onClick={(event) => {
					event.stopPropagation();
					if (skipNextNativeClick) {
						event.preventDefault();
						clearNativeClickSkip();
						return;
					}
					props.onClick?.(props.model.id);
				}}
				onMouseDown={(event) => {
					if (event.button !== 1) event.stopPropagation();
				}}
				onMouseUp={(event) => {
					if (event.button !== 1) event.stopPropagation();
				}}
				onPointerDown={(event) => {
					if (event.pointerType === "mouse" && event.button !== 0) return;
					event.stopPropagation();
					event.preventDefault();
					pointerInteraction = {
						state: "pressed",
						pointerId: event.pointerId,
						startX: event.clientX,
						startY: event.clientY,
					};
					clearNativeClickSkip();
					nodeButtonRef?.setPointerCapture(event.pointerId);
				}}
				onPointerMove={(event) => {
					const interaction = pointerInteraction;
					if (interaction.state === "idle" || interaction.pointerId !== event.pointerId) return;
					event.stopPropagation();
					event.preventDefault();
					if (interaction.state === "pressed") {
						const distance = Math.hypot(event.clientX - interaction.startX, event.clientY - interaction.startY);
						if (distance <= dragActivationDistance || !canDrag()) return;
						pointerInteraction = { state: "dragging", pointerId: event.pointerId };
						props.onDragStart?.(props.model.id);
					}
					if (pointerInteraction.state === "dragging") {
						props.onPointerDragMove?.(event.clientX, event.clientY);
					}
				}}
				onPointerUp={(event) => {
					const interaction = pointerInteraction;
					if (interaction.state === "idle" || interaction.pointerId !== event.pointerId) return;
					event.stopPropagation();
					event.preventDefault();
					releasePointerCapture(event.pointerId);
					resetPointerInteraction();
					if (interaction.state === "dragging") {
						markNativeClickHandledByPointer();
						props.onPointerDragEnd?.(event.clientX, event.clientY);
						return;
					}
					markNativeClickHandledByPointer();
					props.onClick?.(props.model.id);
				}}
				onPointerCancel={(event) => {
					const interaction = pointerInteraction;
					if (interaction.state === "idle" || interaction.pointerId !== event.pointerId) return;
					event.stopPropagation();
					releasePointerCapture(event.pointerId);
					resetPointerInteraction();
					clearNativeClickSkip();
					if (interaction.state === "dragging") {
						props.onDragEnd?.();
					}
				}}
				onPointerLeave={(event) => {
					if (pointerInteraction.state === "idle") return;
					event.stopPropagation();
				}}
			>
				<Wrapped {...props.model} variant={props.selected ? "selected" : props.model.variant} />
			</button>
		</div>
	);
};
