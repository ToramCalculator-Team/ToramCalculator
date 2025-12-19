import { Component, createSignal, createEffect, onMount, createMemo, Index } from 'solid-js';
import { NodeContainer } from './NodeContainer';
import { NodeType, ConnectorType, NodeWithChildren } from '../../types/workflow';

export type WorkflowCanvasInstance = {
  fit(): void;
};

export type WorkflowCanvasProps = {
  nodes: NodeType[];
  connectors: ConnectorType[];
  nodeComponents: { [key: string]: Component<any> };
  onInitalise?: (instance: WorkflowCanvasInstance) => void;
  onUpdate?: () => void;
};

export const WorkflowCanvas: Component<WorkflowCanvasProps> = (props) => {
  let canvasWrapperRef: HTMLDivElement | undefined;
  let rootNodesContainerRef: HTMLDivElement | undefined;
  const [translateX, setTranslateX] = createSignal(0);
  const [translateY, setTranslateY] = createSignal(0);
  const [scale, setScale] = createSignal(1);
  const [lastCanvasDragPosition, setLastCanvasDragPosition] = createSignal<{ x: number; y: number } | null>(null);

  // 获取嵌套的根节点
  const getNestedRootNodes = (nodes: NodeType[], connectors: ConnectorType[]): NodeWithChildren[] => {
    const addChildNodes = (parent: NodeWithChildren) => {
      // Get all outgoing connectors for the parent node.
      const outgoingConnectors = connectors.filter((connector) => connector.from === parent.node.id);

      parent.children = outgoingConnectors.map((connector) => {
        // Get the child node that is linked to the parent node.
        const childNode = nodes.find((node) => node.id === connector.to);

        if (!childNode) {
          throw new Error('missing target node');
        }

        return {
          connector,
          child: { node: childNode, children: [] },
        };
      });

      parent.children.forEach(({ child }) => addChildNodes(child));
    };

    // Get all of the nodes without incoming connectors, these will be our root nodes.
    const rootNodes: NodeWithChildren[] = nodes
      .filter((node) => !connectors.find((connector) => connector.to === node.id))
      .map((node) => ({ node, children: [] }));

    // Recursively populate our tree from the root nodes.
    rootNodes.forEach((rootNode) => addChildNodes(rootNode));

    return rootNodes;
  };

  // Memoize nested root nodes to avoid unnecessary recalculations
  const nestedRootNodes = createMemo(() => getNestedRootNodes(props.nodes, props.connectors));

  // Fit the contents into the centre of the canvas.
  const fit = () => {
    const canvasWrapperOffsetHeight = canvasWrapperRef?.offsetHeight || 0;
    const canvasWrapperOffsetWidth = canvasWrapperRef?.offsetWidth || 0;
    const rootNodesContainerOffsetHeight = rootNodesContainerRef?.offsetHeight || 0;
    const rootNodesContainerOffsetWidth = rootNodesContainerRef?.offsetWidth || 0;

    setTranslateY((canvasWrapperOffsetHeight / 2) - (rootNodesContainerOffsetHeight / 2));
    setTranslateX((canvasWrapperOffsetWidth / 2) - (rootNodesContainerOffsetWidth / 2));
    setScale(1);
  };

  // 创建实例对象
  const instance: WorkflowCanvasInstance = {
    fit,
  };

  onMount(() => {
    props.onInitalise?.(instance);
    props.onUpdate?.();
  });

  createEffect(() => {
    props.onUpdate?.();
  });

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.1, 2));
    } else if (e.deltaY > 0) {
      setScale((prev) => Math.max(prev - 0.1, 0.5));
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    setLastCanvasDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    const lastPos = lastCanvasDragPosition();
    if (!lastPos) return;

    setTranslateX((prev) => prev - (lastPos.x - e.clientX));
    setTranslateY((prev) => prev - (lastPos.y - e.clientY));
    setLastCanvasDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setLastCanvasDragPosition(null);
  };

  const handleMouseLeave = () => {
    setLastCanvasDragPosition(null);
  };

  return (
    <div
      ref={canvasWrapperRef}
      class="relative w-full h-full overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div class="absolute inset-0 bg-area-color">
        <svg class="absolute inset-0 w-full h-full">
          <defs>
            <pattern
              id="canvas-pattern-background"
              x={translateX()}
              y={translateY()}
              width={20 * scale()}
              height={20 * scale()}
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" class="fill-dividing-color" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#canvas-pattern-background)" />
        </svg>
        <div
          class="absolute"
          style={{
            transform: `translate(${translateX()}px, ${translateY()}px) translateZ(1px) scale(${scale()})`,
          }}
        >
          <div ref={rootNodesContainerRef} class="flex flex-col items-center">
            <Index each={nestedRootNodes()}>
              {(rootNode) => (
                <NodeContainer
                  parentNode={rootNode().node}
                  childNodes={rootNode().children}
                  nodeComponents={props.nodeComponents}
                />
              )}
            </Index>
          </div>
        </div>
      </div>
    </div>
  );
};

