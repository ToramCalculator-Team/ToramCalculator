import { type Component, type JSX, Show } from "solid-js";
import { Icons } from "~/components/icons";
import type { NodeType } from "../../types/workflow";
import { Divider } from "../Divider/Divider";

export type NodeProps = {
	wrapped: Component<NodeType>;
	model: NodeType;
	selected?: boolean;
	onClick?: (nodeId: string) => void;
	onLongPress?: (nodeId: string) => void;
	onMove?: (nodeId: string, direction: -1 | 1) => void;
	onDelete?: (nodeId: string) => void;
	onDragStart?: (nodeId: string) => void;
	onDragEnd?: () => void;
	canDelete?: (nodeId: string) => boolean;
	readOnly?: boolean;
};

export const Node: Component<NodeProps> = (props) => {
	const Wrapped = props.wrapped;
	let longPressTimer: number | undefined;
	const canDrag = () => !props.readOnly && props.model.type !== "root" && !props.model.isPlaceholder;

	const clearLongPress = () => {
		if (longPressTimer) {
			window.clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
	};

	return (
		<div class="relative inline-flex items-center">
			<button
				type="button"
				data-bt-node-id={props.model.id}
				data-bt-placeholder={props.model.isPlaceholder ? "true" : undefined}
				class={`select-none bg-transparent p-0 text-left ${canDrag() ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
				draggable={canDrag()}
				onClick={(event) => {
					event.stopPropagation();
					props.onClick?.(props.model.id);
				}}
				onMouseDown={(event) => {
					event.stopPropagation();
				}}
				onMouseUp={(event) => {
					event.stopPropagation();
				}}
				onDragStart={(event) => {
					event.stopPropagation();
					if (props.readOnly || props.model.type === "root" || props.model.isPlaceholder) {
						event.preventDefault();
						return;
					}
					event.dataTransfer?.setData("application/x-bt-tree-node", props.model.id);
					event.dataTransfer?.setData("text/plain", props.model.caption);
					if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
					props.onDragStart?.(props.model.id);
				}}
				onDragEnd={() => props.onDragEnd?.()}
				onPointerDown={(event) => {
					event.stopPropagation();
					clearLongPress();
					longPressTimer = window.setTimeout(() => props.onLongPress?.(props.model.id), 500);
				}}
				onPointerUp={(event) => {
					event.stopPropagation();
					clearLongPress();
				}}
				onPointerCancel={(event) => {
					event.stopPropagation();
					clearLongPress();
				}}
				onPointerLeave={(event) => {
					event.stopPropagation();
					clearLongPress();
				}}
			>
				<Wrapped {...props.model} variant={props.selected ? "selected" : props.model.variant} />
			</button>
			<Show when={props.selected && props.model.type !== "root" && !props.readOnly}>
				<div class="-top-12 left-0 absolute z-20 flex text-primary-color rounded-md bg-brand-color-3rd shadow shadow-dividing-color">
					<NodeActionButton label="上移" onClick={() => props.onMove?.(props.model.id, -1)}>
						<Icons.Outline.Left class=" rotate-90" />
					</NodeActionButton>
					<Divider orientation="vertical" />
					<NodeActionButton label="下移" onClick={() => props.onMove?.(props.model.id, 1)}>
						<Icons.Outline.Left class=" -rotate-90" />
					</NodeActionButton>
					<Divider orientation="vertical" />
					<NodeActionButton
						label="删除"
						disabled={!props.canDelete?.(props.model.id)}
						onClick={() => props.onDelete?.(props.model.id)}
					>
						<Icons.Outline.Trash />
					</NodeActionButton>
				</div>
			</Show>
		</div>
	);
};

const NodeActionButton: Component<{
	children: JSX.Element;
	label: string;
	disabled?: boolean;
	onClick: () => void;
}> = (props) => (
	<button
		type="button"
		aria-label={props.label}
		title={props.label}
		disabled={props.disabled}
		class="flex h-10 items-center cursor-pointer justify-center hover:bg-dividing-color p-3 text-xs disabled:pointer-events-none disabled:opacity-40"
		onPointerDown={(event) => event.stopPropagation()}
		onClick={(event) => {
			event.stopPropagation();
			props.onClick();
		}}
	>
		{props.children}
	</button>
);
