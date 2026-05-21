import { type Component, createEffect, createSignal, type JSX, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import type { State } from "~/lib/mistreevous/State";
import type { EditableBtDropPlacement, EditableBtNodeType } from "../../model/editableTree";
import type {
	ClientPoint,
	ConnectorType,
	NodeType,
	TreeNodeDragStart,
	WorkflowDragOverlay,
} from "../../types/workflow";
import { DefaultNode } from "../workflow/DefaultNode";
import { WorkflowCanvas, type WorkflowCanvasInstance } from "../workflow/WorkflowCanvas";

export type CanvasElements = {
	nodes: NodeType[];
	edges: ConnectorType[];
};

export type MainPanelProps = {
	layoutId: string | null;
	elements: CanvasElements;
	selectedNodeId?: string;
	dragNodeType?: EditableBtNodeType;
	dragNodeId?: string;
	activeDropPlacement?: EditableBtDropPlacement;
	dragOverlay?: WorkflowDragOverlay;
	showPlayButton: boolean;
	showReplayButton: boolean;
	showStopButton: boolean;
	onPlayButtonClick(): void;
	onReplayButtonClick(): void;
	onStopButtonClick(): void;
	canUndo?: boolean;
	canRedo?: boolean;
	onUndo?: () => void;
	onRedo?: () => void;
	previewStatus?: JSX.Element;
	runtimeNodeStates?: Record<string, State>;
	onNodeDragOver?: (placement: EditableBtDropPlacement | null, pointer?: ClientPoint) => void;
	onNodeDrop?: (placement: EditableBtDropPlacement | null) => void;
	onNodeDragEnd?: () => void;
	onCanvasClick?: () => void;
	onNodeClick?: (nodeId: string) => void;
	onNodeLongPress?: (nodeId: string) => void;
	onNodeInspect?: (nodeId: string) => void;
	onNodeDelete?: (nodeId: string) => void;
	onNodeInsertPreview?: (placement: EditableBtDropPlacement) => void;
	onNodeInsertCancel?: () => void;
	onNodeInsertCommit?: (placement: EditableBtDropPlacement) => void;
	onTreeNodeDragStart?: (payload: TreeNodeDragStart) => void;
	onTreeNodeDragEnd?: () => void;
	canDeleteNode?: (nodeId: string) => boolean;
	canDropOnNode?: (nodeId: string) => boolean;
	showCanvasControls?: boolean;
	readOnly?: boolean;
};

export const MainPanel: Component<MainPanelProps> = (props) => {
	const [canvasInstance, setCanvasInstance] = createSignal<WorkflowCanvasInstance | null>(null);
	const [isFitNeeded, setIsFitNeeded] = createSignal<boolean>(true);
	const [lastLayoutId, setLastLayoutId] = createSignal<string | null>(null);

	// An effect to call 'fit' on our canvas under certain conditions.
	createEffect(() => {
		const doNodesExist = props.elements.nodes.length > 0;
		const instance = canvasInstance();

		// If we ever go from having no layout to some layout we should call 'fit'.
		if (doNodesExist && isFitNeeded()) {
			instance?.fit();
			setIsFitNeeded(false);
		} else if (!doNodesExist && !isFitNeeded()) {
			setIsFitNeeded(true);
		}

		// If we swap layouts we should call 'fit'.
		if (lastLayoutId() !== props.layoutId) {
			instance?.fit();
			setLastLayoutId(props.layoutId);
		}
	});

	return (
		<div class="relative h-full w-full font-['Consolas']">
			<WorkflowCanvas
				onInitalise={(instance: WorkflowCanvasInstance) => setCanvasInstance(instance)}
				nodes={props.elements.nodes}
				connectors={props.elements.edges}
				selectedNodeId={props.selectedNodeId}
				dragNodeType={props.dragNodeType}
				dragNodeId={props.dragNodeId}
				activeDropPlacement={props.activeDropPlacement}
				dragOverlay={props.dragOverlay}
				runtimeNodeStates={props.runtimeNodeStates}
				nodeComponents={{
					default: DefaultNode,
					selected: DefaultNode,
				}}
				onNodeDragOver={props.onNodeDragOver}
				onNodeDrop={props.onNodeDrop}
				onNodeDragEnd={props.onNodeDragEnd}
				onCanvasClick={props.onCanvasClick}
				onNodeClick={props.onNodeClick}
				onNodeLongPress={props.onNodeLongPress}
				onNodeInspect={props.onNodeInspect}
				onNodeDelete={props.onNodeDelete}
				onNodeInsertPreview={props.onNodeInsertPreview}
				onNodeInsertCancel={props.onNodeInsertCancel}
				onNodeInsertCommit={props.onNodeInsertCommit}
				onTreeNodeDragStart={props.onTreeNodeDragStart}
				onTreeNodeDragEnd={props.onTreeNodeDragEnd}
				canDeleteNode={props.canDeleteNode}
				canDropOnNode={props.canDropOnNode}
				readOnly={props.readOnly}
			/>
			<Show when={props.showCanvasControls !== false}>
				<div class="absolute w-[calc(100%-1.5rem)] bottom-3 left-3 flex gap-2">
					<Show when={props.showPlayButton}>
						<Button level="primary" onClick={props.onPlayButtonClick} class="run-tree-fab flex-none">
							<Icons.Outline.Play />
						</Button>
					</Show>
					<Show when={props.onUndo}>
						<Button
							level="primary"
							disabled={!props.canUndo}
							onClick={() => props.onUndo?.()}
							class="run-tree-fab flex-none"
						>
							<Icons.Outline.Back />
						</Button>
					</Show>
					<Show when={props.onRedo}>
						<Button
							level="primary"
							disabled={!props.canRedo}
							onClick={() => props.onRedo?.()}
							class="run-tree-fab flex-none"
						>
							<Icons.Outline.Replay />
						</Button>
					</Show>
					<Show when={props.showReplayButton}>
						<Button level="primary" onClick={props.onReplayButtonClick} class="run-tree-fab flex-none">
							<Icons.Outline.Replay />
						</Button>
					</Show>
					<Show when={props.showStopButton}>
						<Button level="primary" onClick={props.onStopButtonClick} class="run-tree-fab flex-none">
							<Icons.Outline.Stop />
						</Button>
					</Show>
					<Show when={props.elements.edges.length > 0 && props.elements.nodes.length > 0}>
						<Button
							level="primary"
							onClick={() => canvasInstance()?.fit()}
							class="run-tree-fab hidden flex-none lg:flex"
						>
							<Icons.Outline.Location />
						</Button>
					</Show>
					<Show when={props.previewStatus}>{props.previewStatus}</Show>
				</div>
			</Show>
		</div>
	);
};
