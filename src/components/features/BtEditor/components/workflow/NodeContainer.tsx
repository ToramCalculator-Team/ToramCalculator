import { type Component, createEffect, createMemo, createSignal, For, on, onCleanup, Show } from "solid-js";
import { State } from "~/lib/mistreevous/State";
import type { ChildNode, ConnectorVariant, NodeType, TreeNodeDragStart } from "../../types/workflow";
import { Node } from "./Node";

export type NodeContainerProps = {
	parentNode: NodeType;
	childNodes: ChildNode[];
	nodeComponents: { [key: string]: Component<NodeType> };
	selectedNodeId?: string;
	draggingNodeId?: string;
	onNodeClick?: (nodeId: string) => void;
	onNodeLongPress?: (nodeId: string) => void;
	onTreeNodeDragStart?: (payload: TreeNodeDragStart) => void;
	onTreeNodePointerDragMove?: (clientX: number, clientY: number) => void;
	onTreeNodePointerDragEnd?: (clientX: number, clientY: number) => void;
	onTreeNodeDragEnd?: () => void;
	runtimeNodeStates?: Record<string, State>;
	readOnly?: boolean;
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

const stateToConnectorVariant = (state: State): ConnectorVariant => {
	if (state === State.RUNNING) return "active";
	if (state === State.SUCCEEDED) return "succeeded";
	if (state === State.FAILED) return "failed";
	return "default";
};

export const NodeContainer: Component<NodeContainerProps> = (props) => {
	let nodeChildrenContainerRef: HTMLDivElement | undefined;
	let connectorMeasureFrame: number | undefined;
	let measuredParentNodeId = props.parentNode.id;
	const [connectorTargetOffsets, setConnectorTargetOffsets] = createSignal<number[] | null>(null);
	const [nodeChildrenContainerHeight, setNodeChildrenContainerHeight] = createSignal<number>(0);
	const getRuntimeNodeState = (node: NodeType): State => props.runtimeNodeStates?.[node.path] ?? node.state;
	const parentNodeModel = createMemo(() => ({
		...props.parentNode,
		state: getRuntimeNodeState(props.parentNode),
	}));
	const childNodeById = createMemo(
		() => new Map(props.childNodes.map((childNode) => [childNode.child.node.id, childNode])),
	);
	const childNodeIds = createMemo(() => props.childNodes.map((childNode) => childNode.child.node.id));
	const getChildNodeById = (nodeId: string): ChildNode => {
		const childNode = childNodeById().get(nodeId);
		if (!childNode) throw new Error(`missing child node ${nodeId}`);
		return childNode;
	};
	const getNodeLayoutSignature = (node: NodeType): string =>
		[
			node.id,
			node.caption,
			node.type,
			node.isPlaceholder ? "p" : "",
			JSON.stringify(node.args),
			JSON.stringify(node.whileGuard),
			JSON.stringify(node.untilGuard),
			JSON.stringify(node.entryCallback),
			JSON.stringify(node.stepCallback),
			JSON.stringify(node.exitCallback),
		].join(":");
	const getChildLayoutSignature = (childNode: ChildNode): string =>
		`${getNodeLayoutSignature(childNode.child.node)}[${childNode.child.children.map(getChildLayoutSignature).join("|")}]`;
	const childLayoutSignature = createMemo(() => props.childNodes.map(getChildLayoutSignature).join("|"));

	const areOffsetsEqual = (left: number[] | null, right: number[]): boolean =>
		!!left && left.length === right.length && left.every((value, index) => Math.abs(value - right[index]) < 0.5);

	const scheduleConnectorOffsetsCalculation = () => {
		if (connectorMeasureFrame !== undefined) return;
		connectorMeasureFrame = requestAnimationFrame(() => {
			connectorMeasureFrame = undefined;
			calculateConnectorOffsets();
		});
	};

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

		// 设计说明：测量值来自 DOM，重复写入相同几何只会制造无意义刷新；几何变化时才更新连线。
		if (!areOffsetsEqual(connectorTargetOffsets(), offsets)) {
			setConnectorTargetOffsets(offsets);
		}
		if (Math.abs(nodeChildrenContainerHeight() - currentNodeChildrenContainerHeight) >= 0.5) {
			setNodeChildrenContainerHeight(currentNodeChildrenContainerHeight);
		}
	};

	// 额外监听节点 ID 和可见内容的变化
	// 原因：当编辑器内容更新时，节点可能会被替换（相同数量但不同节点），
	// 此时需要重新计算连接器位置。使用节点 ID 的签名作为依赖，既明确又轻量
	createEffect(
		on(
			() => `${props.parentNode.id}:${childLayoutSignature()}`,
			() => {
				if (measuredParentNodeId !== props.parentNode.id) {
					measuredParentNodeId = props.parentNode.id;
					setConnectorTargetOffsets(null);
					setNodeChildrenContainerHeight(0);
				}
				scheduleConnectorOffsetsCalculation();
			},
		),
	);

	onCleanup(() => {
		if (connectorMeasureFrame !== undefined) {
			cancelAnimationFrame(connectorMeasureFrame);
		}
	});

	return (
		<div class="flex flex-row items-stretch">
			<div class="my-[5px] flex items-center">
				<Node
					wrapped={props.nodeComponents[props.parentNode.variant]}
					model={parentNodeModel()}
					selected={props.selectedNodeId === props.parentNode.id}
					dragging={props.draggingNodeId === props.parentNode.id}
					onClick={props.onNodeClick}
					onLongPress={props.onNodeLongPress}
					onDragStart={props.onTreeNodeDragStart}
					onPointerDragMove={props.onTreeNodePointerDragMove}
					onPointerDragEnd={props.onTreeNodePointerDragEnd}
					onDragEnd={props.onTreeNodeDragEnd}
					readOnly={props.readOnly}
				/>
			</div>
			<Show when={props.childNodes.length > 0}>
				<div class="relative my-[3px] w-10 self-stretch">
					<Show when={connectorTargetOffsets() && nodeChildrenContainerHeight() > 0}>
						<svg class="absolute inset-0 h-full w-full">
							<title>Connector Path</title>
							<For each={childNodeIds()}>
								{(childNodeId, index) => {
									const childNode = createMemo(() => getChildNodeById(childNodeId));
									const connectorPath = createMemo(() => {
										const offsets = connectorTargetOffsets();
										const height = nodeChildrenContainerHeight();
										const offset = offsets?.[index()];
										if (!offsets || height === 0 || offset === undefined) return undefined;
										const source = { x: 0, y: height / 2 };
										const target = { x: 40, y: offset };
										const containerWidth = 40;
										return `M${source.x} ${source.y} C${containerWidth / 2} ${source.y} ${containerWidth / 2} ${target.y} ${target.x} ${target.y}`;
									});
									const connectorVariant = createMemo(() =>
										stateToConnectorVariant(getRuntimeNodeState(childNode().child.node)),
									);

									return (
										<Show when={connectorPath()}>
											{(pathD) => (
												<path
													class={getConnectorClass(connectorVariant())}
													d={pathD()}
													stroke-width="2"
													fill="transparent"
													stroke-linejoin={connectorVariant() === "active" ? "round" : undefined}
													stroke-dasharray={connectorVariant() === "active" ? "8, 4" : undefined}
												/>
											)}
										</Show>
									);
								}}
							</For>
						</svg>
					</Show>
				</div>
				<div ref={nodeChildrenContainerRef} class="my-[3px] flex flex-col items-stretch">
					<For each={childNodeIds()}>
						{(childNodeId) => {
							const childNode = createMemo(() => getChildNodeById(childNodeId));
							return (
								<NodeContainer
									parentNode={childNode().child.node}
									childNodes={childNode().child.children}
									nodeComponents={props.nodeComponents}
									selectedNodeId={props.selectedNodeId}
									draggingNodeId={props.draggingNodeId}
									onNodeClick={props.onNodeClick}
									onNodeLongPress={props.onNodeLongPress}
									onTreeNodeDragStart={props.onTreeNodeDragStart}
									onTreeNodePointerDragMove={props.onTreeNodePointerDragMove}
									onTreeNodePointerDragEnd={props.onTreeNodePointerDragEnd}
									onTreeNodeDragEnd={props.onTreeNodeDragEnd}
									runtimeNodeStates={props.runtimeNodeStates}
									readOnly={props.readOnly}
								/>
							);
						}}
					</For>
				</div>
			</Show>
		</div>
	);
};
