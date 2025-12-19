import { Component, Index, Show, createEffect, createSignal, on, onMount, onCleanup } from "solid-js";
import { Node } from "./Node";
import { NodeType, ChildNode, ConnectorVariant } from "../../types/workflow";

export type NodeContainerProps = {
  parentNode: NodeType;
  childNodes: ChildNode[];
  nodeComponents: { [key: string]: Component<any> };
};

// Get connector class based on variant
const getConnectorClass = (variant: ConnectorVariant): string => {
  switch (variant) {
    case "active":
      return "active-connector-path stroke-brand-color-4th";
    case "succeeded":
      return "succeeded-connector-path stroke-brand-color-1st";
    case "failed":
      return "failed-connector-path stroke-brand-color-2nd";
    case "default":
      return "default-connector-path stroke-boundary-color";
  }
};

export const NodeContainer: Component<NodeContainerProps> = (props) => {
  let nodeChildrenContainerRef: HTMLDivElement | undefined;
  const [connectorTargetOffsets, setConnectorTargetOffsets] = createSignal<number[] | null>(null);
  const [nodeChildrenContainerHeight, setNodeChildrenContainerHeight] = createSignal<number>(0);

  // 计算连接器目标偏移量的函数
  // 注意：不进行缓存判断，每次都重新计算，确保连线位置始终准确
  // 原因：当节点内容更新时（文本换行、参数变化），节点高度可能变化，
  // 即使总高度相同，单个节点的高度变化也会影响连接器位置
  const calculateConnectorOffsets = () => {
    if (!nodeChildrenContainerRef) return;

    const currentNodeChildrenContainerHeight = nodeChildrenContainerRef.clientHeight || 0;
    const childrenCount = nodeChildrenContainerRef.children.length || 0;
    const expectedChildrenCount = props.childNodes.length;

    // 等待 DOM 更新完成 - 子元素数量必须与预期数量匹配
    if (childrenCount !== expectedChildrenCount) {
      return;
    }

    // 总是重新计算偏移量，不进行缓存判断
    // 这样可以确保当节点内容更新导致高度变化时，连接器位置也会更新
    const offsets: number[] = [];
    let childPositionOffset = 0;

    for (let childIndex = 0; childIndex < childrenCount; childIndex++) {
      // 获取当前子元素
      const childElement = nodeChildrenContainerRef.children[childIndex] as HTMLElement;
      if (!childElement) continue;

      // 获取子元素的高度
      const childHeight = childElement.clientHeight;

      // 计算连接器的终点，应该与子元素对齐
      const childConnectorOffset = childPositionOffset + childHeight / 2;

      offsets.push(childConnectorOffset);

      // 将子元素高度添加到偏移量中
      childPositionOffset += childHeight;
    }

    // 总是更新 signals，确保连线始终使用最新数据
    setConnectorTargetOffsets(offsets);
    setNodeChildrenContainerHeight(currentNodeChildrenContainerHeight);
  };

  // 额外监听节点 ID 的变化
  // 原因：当编辑器内容更新时，节点可能会被替换（相同数量但不同节点），
  // 此时需要重新计算连接器位置。使用节点 ID 的签名作为依赖，既明确又轻量
  createEffect(
    on(
      () => props.childNodes.length,
      () => {
        setNodeChildrenContainerHeight(0);
        setTimeout(() => {
          calculateConnectorOffsets();
        }, 10);
      }
    )
  );

  return (
    <div class="flex flex-row items-stretch">
      <div class="my-[5px] flex items-center">
        <Node wrapped={props.nodeComponents[props.parentNode.variant]} model={props.parentNode} />
      </div>
      <Show when={props.childNodes.length > 0}>
        <div class="relative my-[3px] w-10" style={{ height: `${nodeChildrenContainerHeight() || 1}px` }}>
          <Show
            when={
              connectorTargetOffsets() &&
              connectorTargetOffsets()!.length === props.childNodes.length &&
              nodeChildrenContainerHeight() > 0
            }
          >
            <svg class="absolute inset-0 w-full" style={{ height: `${nodeChildrenContainerHeight() || 1}px` }}>
            <Index each={props.childNodes}>
                {(childNode, index) => {
                  const offsets = connectorTargetOffsets();
                  const height = nodeChildrenContainerHeight();
                  if (!offsets || height === 0) return null;

                  const offset = offsets[index];
                  const variant = childNode().connector.variant;
                  const source = { x: 0, y: height / 2 };
                  const target = { x: 40, y: offset };
                  const containerWidth = 40;
                  
                  // Calculate path data
                  const pathD = `M${source.x} ${source.y} C${containerWidth / 2} ${source.y} ${containerWidth / 2} ${target.y} ${target.x} ${target.y}`;

                  return (
                    <path
                      class={getConnectorClass(variant)}
                      d={pathD}
                      stroke-width="2"
                      fill="transparent"
                      stroke-linejoin={variant === "active" ? "round" : undefined}
                      stroke-dasharray={variant === "active" ? "8, 4" : undefined}
                    />
                  );
                }}
              </Index>
            </svg>
          </Show>
        </div>
        <div ref={nodeChildrenContainerRef} class="my-[3px] flex flex-col items-stretch">
          <Index each={props.childNodes}>
            {(childNode) => (
              <NodeContainer
                parentNode={childNode().child.node}
                childNodes={childNode().child.children}
                nodeComponents={props.nodeComponents}
              />
            )}
          </Index>
        </div>
      </Show>
    </div>
  );
};
