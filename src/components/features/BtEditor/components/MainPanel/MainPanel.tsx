import { Component, Show, createSignal, createEffect } from 'solid-js';
import { WorkflowCanvas, WorkflowCanvasInstance } from '../workflow/WorkflowCanvas';
import { DefaultNode } from '../workflow/DefaultNode';
import { Button } from '../';
import { NodeType, ConnectorType } from '../../types/workflow';

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
    <div class="relative w-full h-full font-['Consolas']">
      <WorkflowCanvas
        onInitalise={(instance: WorkflowCanvasInstance) => setCanvasInstance(instance)}
        nodes={props.elements.nodes}
        connectors={props.elements.edges}
        nodeComponents={{
          default: DefaultNode,
        }}
      />
      <div class="absolute bottom-0 left-0 m-3.75 flex gap-3.75">
        <Show when={props.showPlayButton}>
          <Button
            variant="fab"
            size="medium"
            color="primary"
            onClick={props.onPlayButtonClick}
            class="run-tree-fab"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </Button>
        </Show>
        <Show when={props.showReplayButton}>
          <Button
            variant="fab"
            size="medium"
            color="primary"
            onClick={props.onReplayButtonClick}
            class="run-tree-fab"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
            </svg>
          </Button>
        </Show>
        <Show when={props.showStopButton}>
          <Button
            variant="fab"
            size="medium"
            color="primary"
            onClick={props.onStopButtonClick}
            class="run-tree-fab"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </Button>
        </Show>
        <Show when={props.elements.edges.length > 0 && props.elements.nodes.length > 0}>
          <Button
            variant="fab"
            size="medium"
            color="primary"
            onClick={() => canvasInstance()?.fit()}
            class="run-tree-fab"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h7v7H4V4zm9 9h7v7h-7v-7zM4 13h7v7H4v-7zm9-9h7v7h-7V4z" />
            </svg>
          </Button>
        </Show>
      </div>
    </div>
  );
};

