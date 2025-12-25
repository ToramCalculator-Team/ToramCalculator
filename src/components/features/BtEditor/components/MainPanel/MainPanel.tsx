import { type Component, createEffect, createSignal, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import type { ConnectorType, NodeType } from "../../types/workflow";
import { DefaultNode } from "../workflow/DefaultNode";
import {
	WorkflowCanvas,
	type WorkflowCanvasInstance,
} from "../workflow/WorkflowCanvas";

export type CanvasElements = {
	nodes: NodeType[];
	edges: ConnectorType[];
};

export type MainPanelProps = {
	layoutId: string | null;
	elements: CanvasElements;
	showPlayButton: boolean;
	showReplayButton: boolean;
	showStopButton: boolean;
	onPlayButtonClick(): void;
	onReplayButtonClick(): void;
	onStopButtonClick(): void;
};

export const MainPanel: Component<MainPanelProps> = (props) => {
	const [canvasInstance, setCanvasInstance] =
		createSignal<WorkflowCanvasInstance | null>(null);
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
				onInitalise={(instance: WorkflowCanvasInstance) =>
					setCanvasInstance(instance)
				}
				nodes={props.elements.nodes}
				connectors={props.elements.edges}
				nodeComponents={{
					default: DefaultNode,
				}}
			/>
			<div class="absolute bottom-0 left-0 m-3.75 flex gap-3.75">
				<Show when={props.showPlayButton}>
					<Button
						level="primary"
						onClick={props.onPlayButtonClick}
						class="run-tree-fab"
					>
						<Icons.Outline.Play />
					</Button>
				</Show>
				<Show when={props.showReplayButton}>
					<Button
						level="primary"
						onClick={props.onReplayButtonClick}
						class="run-tree-fab"
					>
						<Icons.Outline.Replay />
					</Button>
				</Show>
				<Show when={props.showStopButton}>
					<Button
						level="primary"
						onClick={props.onStopButtonClick}
						class="run-tree-fab"
					>
						<Icons.Outline.Stop />
					</Button>
				</Show>
				<Show
					when={
						props.elements.edges.length > 0 && props.elements.nodes.length > 0
					}
				>
					<Button
						level="primary"
						onClick={() => canvasInstance()?.fit()}
						class="run-tree-fab"
					>
						<Icons.Outline.Location />
					</Button>
				</Show>
			</div>
		</div>
	);
};
