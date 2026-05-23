import type { JSX } from "solid-js";
import { batch, type Component, createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Icons } from "~/components/icons";
import type { State } from "~/lib/mistreevous/State";
import {
	COMPOSITE_NODE_TYPES,
	DECORATOR_NODE_TYPES,
	type EditableBtDropIntent,
	type EditableBtDropPlacement,
	type EditableBtNodeType,
} from "../../model/editableTree";
import type {
	ClientPoint,
	ConnectorType,
	NodeType,
	NodeWithChildren,
	TreeNodeDragStart,
	WorkflowDragOverlay,
} from "../../types/workflow";
import { NodeContainer } from "./NodeContainer";

type CanvasPoint = { x: number; y: number };
type ViewportState = { x: number; y: number; scale: number };
type DropTargetRect = { nodeId: string; rect: DOMRect };
type LayoutAnchor = { nodeId: string; left: number; top: number };
type SelectedNodeBounds = {
	nodeId: string;
	nodeType: string;
	left: number;
	top: number;
	width: number;
	height: number;
};

export type WorkflowCanvasInstance = {
	fit(): void;
};

export type WorkflowCanvasProps = {
	nodes: NodeType[];
	connectors: ConnectorType[];
	selectedNodeId?: string;
	dragNodeType?: EditableBtNodeType;
	dragNodeId?: string;
	activeDropPlacement?: EditableBtDropPlacement;
	dragOverlay?: WorkflowDragOverlay;
	runtimeNodeStates?: Record<string, State>;
	nodeComponents: { [key: string]: Component<NodeType> };
	onInitalise?: (instance: WorkflowCanvasInstance) => void;
	onUpdate?: () => void;
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
	onTreeNodePointerDragMove?: (clientX: number, clientY: number) => void;
	onTreeNodePointerDragEnd?: (clientX: number, clientY: number) => void;
	onTreeNodeDragEnd?: () => void;
	canDeleteNode?: (nodeId: string) => boolean;
	canDropOnNode?: (nodeId: string) => boolean;
	readOnly?: boolean;
};

export const WorkflowCanvas: Component<WorkflowCanvasProps> = (props) => {
	let canvasWrapperRef: HTMLDivElement | undefined;
	let canvasSurfaceRef: HTMLDivElement | undefined;
	let rootNodesContainerRef: HTMLDivElement | undefined;
	let canvasDragStartPosition: { x: number; y: number } | null = null;
	let canvasPanButton: 0 | 1 | null = null;
	let hasCanvasDragMoved = false;
	let lastCanvasDragPosition: CanvasPoint | null = null;
	const activePointers = new Map<number, CanvasPoint>();
	let pinchStart: { distance: number; scale: number } | null = null;
	let viewportState: ViewportState = { x: 0, y: 0, scale: 1 };
	let pendingViewport: ViewportState | null = null;
	let viewportAnimationFrame: number | undefined;
	let fitAnimationFrame: number | undefined;
	let selectionMeasureFrame: number | undefined;
	let layoutAnchor: LayoutAnchor | null = null;
	let layoutStabilizationQueued = false;
	let dropTargetRects: DropTargetRect[] = [];
	let dropSourceKey = "";
	let treeNodePointerDrag: { pointerId: number } | null = null;
	const [translateX, setTranslateX] = createSignal(0);
	const [translateY, setTranslateY] = createSignal(0);
	const [scale, setScale] = createSignal(1);
	const [isViewportInteracting, setIsViewportInteracting] = createSignal(false);
	const [selectedNodeBounds, setSelectedNodeBounds] = createSignal<SelectedNodeBounds | null>(null);

	// 获取嵌套的根节点
	const getNestedRootNodes = (nodes: NodeType[], connectors: ConnectorType[]): NodeWithChildren[] => {
		const addChildNodes = (parent: NodeWithChildren) => {
			// Get all outgoing connectors for the parent node.
			const outgoingConnectors = connectors.filter((connector) => connector.from === parent.node.id);

			parent.children = outgoingConnectors.map((connector) => {
				// Get the child node that is linked to the parent node.
				const childNode = nodes.find((node) => node.id === connector.to);

				if (!childNode) {
					throw new Error("missing target node");
				}

				return {
					connector,
					child: { node: childNode, children: [] },
				};
			});

			parent.children.forEach(({ child }) => {
				addChildNodes(child);
			});
		};

		// Get all of the nodes without incoming connectors, these will be our root nodes.
		const rootNodes: NodeWithChildren[] = nodes
			.filter((node) => !connectors.find((connector) => connector.to === node.id))
			.map((node) => ({ node, children: [] }));

		// Recursively populate our tree from the root nodes.
		rootNodes.forEach((rootNode) => {
			addChildNodes(rootNode);
		});

		return rootNodes;
	};

	// Memoize nested root nodes to avoid unnecessary recalculations
	const nestedRootNodes = createMemo(() => getNestedRootNodes(props.nodes, props.connectors));
	const nestedRootNodeById = createMemo(
		() => new Map(nestedRootNodes().map((rootNode) => [rootNode.node.id, rootNode])),
	);
	const nestedRootNodeIds = createMemo(() => nestedRootNodes().map((rootNode) => rootNode.node.id));
	const getNestedRootNodeById = (nodeId: string): NodeWithChildren => {
		const rootNode = nestedRootNodeById().get(nodeId);
		if (!rootNode) throw new Error(`missing root node ${nodeId}`);
		return rootNode;
	};
	const dragOverlayRootNodes = createMemo(() =>
		props.dragOverlay ? getNestedRootNodes(props.dragOverlay.nodes, props.dragOverlay.edges) : [],
	);
	const dragOverlayRootNodeById = createMemo(
		() => new Map(dragOverlayRootNodes().map((rootNode) => [rootNode.node.id, rootNode])),
	);
	const dragOverlayRootNodeIds = createMemo(() => dragOverlayRootNodes().map((rootNode) => rootNode.node.id));
	const getDragOverlayRootNodeById = (nodeId: string): NodeWithChildren => {
		const rootNode = dragOverlayRootNodeById().get(nodeId);
		if (!rootNode) throw new Error(`missing drag overlay root node ${nodeId}`);
		return rootNode;
	};
	const nodeLayoutSignature = createMemo(() =>
		props.nodes.map((node) => `${node.id}:${node.caption}:${node.type}:${node.isPlaceholder ? "p" : ""}`).join("|"),
	);
	const snapToDevicePixel = (value: number): number => {
		const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
		return Math.round(value * ratio) / ratio;
	};

	// Fit the contents into the centre of the canvas.
	const fit = () => {
		if (fitAnimationFrame !== undefined) {
			cancelAnimationFrame(fitAnimationFrame);
		}
		// 设计说明：画布尺寸会受顶部诊断条、左右栏和字体渲染影响；延后一帧测量，避免用半完成布局计算初始居中。
		fitAnimationFrame = requestAnimationFrame(() => {
			fitAnimationFrame = undefined;
			fitNow();
		});
	};

	const fitNow = () => {
		if (!canvasWrapperRef || !rootNodesContainerRef) return;
		const canvasWrapperOffsetHeight = canvasWrapperRef.offsetHeight;
		const canvasWrapperOffsetWidth = canvasWrapperRef.offsetWidth;
		const rootNodesContainerOffsetHeight = rootNodesContainerRef.offsetHeight;
		const rootNodesContainerOffsetWidth = rootNodesContainerRef.offsetWidth;

		commitViewport(
			{
				x: canvasWrapperOffsetWidth / 2 - rootNodesContainerOffsetWidth / 2,
				y: canvasWrapperOffsetHeight / 2 - rootNodesContainerOffsetHeight / 2,
				scale: 1,
			},
			true,
		);
	};

	// 创建实例对象
	const instance: WorkflowCanvasInstance = {
		fit,
	};

	onMount(() => {
		props.onInitalise?.(instance);
		props.onUpdate?.();
		fit();

		// Wheel 保留桌面缩放；触控缩放走 pointer 事件。
		if (canvasWrapperRef) {
			// 使用 passive: false，因为缩放时需要 preventDefault 阻止页面滚动。
			canvasWrapperRef.addEventListener("wheel", handleWheel, {
				passive: false,
			});
		}
		window.addEventListener("mouseup", resetCanvasInteraction);
		window.addEventListener("dragstart", resetCanvasInteraction);
		window.addEventListener("dragend", resetCanvasInteraction);
		window.addEventListener("blur", resetCanvasInteraction);
		window.addEventListener("resize", scheduleSelectionMeasure);
		// 设计说明：拖拽开始后 pointer 流归画布会话管理；源节点可能因预览重排而被替换，后续 move/up 不能依赖源节点组件继续存活。
		window.addEventListener("pointermove", handleGlobalTreeNodePointerMove, { capture: true, passive: false });
		window.addEventListener("pointerup", handleGlobalTreeNodePointerEnd, { capture: true, passive: false });
		window.addEventListener("pointercancel", handleGlobalTreeNodePointerCancel, { capture: true, passive: false });
	});

	onCleanup(() => {
		// 清理事件监听器
		if (canvasWrapperRef) {
			canvasWrapperRef.removeEventListener("wheel", handleWheel);
		}
		window.removeEventListener("mouseup", resetCanvasInteraction);
		window.removeEventListener("dragstart", resetCanvasInteraction);
		window.removeEventListener("dragend", resetCanvasInteraction);
		window.removeEventListener("blur", resetCanvasInteraction);
		window.removeEventListener("resize", scheduleSelectionMeasure);
		window.removeEventListener("pointermove", handleGlobalTreeNodePointerMove, true);
		window.removeEventListener("pointerup", handleGlobalTreeNodePointerEnd, true);
		window.removeEventListener("pointercancel", handleGlobalTreeNodePointerCancel, true);
		if (viewportAnimationFrame !== undefined) {
			cancelAnimationFrame(viewportAnimationFrame);
		}
		if (fitAnimationFrame !== undefined) {
			cancelAnimationFrame(fitAnimationFrame);
		}
		if (selectionMeasureFrame !== undefined) {
			cancelAnimationFrame(selectionMeasureFrame);
		}
	});

	createEffect(() => {
		props.onUpdate?.();
	});

	createEffect(() => {
		const nextDropSourceKey = `${props.dragNodeType ?? ""}:${props.dragNodeId ?? ""}`;
		if (nextDropSourceKey !== dropSourceKey) {
			dropSourceKey = nextDropSourceKey;
			dropTargetRects = [];
		}
		if (!props.dragNodeId) treeNodePointerDrag = null;
	});

	createEffect(() => {
		const selectedNodeId = props.selectedNodeId;
		translateX();
		translateY();
		scale();
		nodeLayoutSignature();
		if (!selectedNodeId || props.readOnly || props.dragNodeType) {
			setSelectedNodeBounds(null);
			return;
		}
		// 设计说明：加号 hover 会插入占位节点，操作按钮坐标在预览期间保持冻结，避免树重排造成 hover 抖动。
		if (props.activeDropPlacement) return;
		scheduleSelectionMeasure();
	});

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (e.deltaY < 0) {
			commitViewport({ ...viewportState, scale: Math.min(viewportState.scale + 0.1, 2) });
		} else if (e.deltaY > 0) {
			commitViewport({ ...viewportState, scale: Math.max(viewportState.scale - 0.1, 0.5) });
		}
	};

	const commitViewport = (next: ViewportState, immediate = false) => {
		viewportState = next;
		pendingViewport = next;
		if (immediate) {
			if (viewportAnimationFrame !== undefined) {
				cancelAnimationFrame(viewportAnimationFrame);
				viewportAnimationFrame = undefined;
			}
			flushViewport();
			return;
		}
		if (viewportAnimationFrame !== undefined) return;
		viewportAnimationFrame = requestAnimationFrame(flushViewport);
	};

	const flushViewport = () => {
		viewportAnimationFrame = undefined;
		const next = pendingViewport;
		if (!next) return;
		pendingViewport = null;
		// 拖拽期间只允许每个动画帧提交一次视口状态，避免同一帧内重复刷新画布和网格。
		batch(() => {
			setTranslateX(next.x);
			setTranslateY(next.y);
			setScale(next.scale);
		});
		scheduleSelectionMeasure();
	};

	const getCanvasSurfaceRect = (): DOMRect | null => {
		const surface = canvasSurfaceRef ?? canvasWrapperRef;
		return surface?.getBoundingClientRect() ?? null;
	};

	const getRenderedNodeElement = (nodeId: string): HTMLElement | null => {
		if (!rootNodesContainerRef) return null;
		return (
			[...rootNodesContainerRef.querySelectorAll<HTMLElement>("[data-bt-node-id]")].find(
				(element) => element.dataset.btNodeId === nodeId && element.dataset.btPlaceholder !== "true",
			) ?? null
		);
	};

	const scheduleSelectionMeasure = () => {
		if (selectionMeasureFrame !== undefined) return;
		selectionMeasureFrame = requestAnimationFrame(() => {
			selectionMeasureFrame = undefined;
			measureSelectedNodeBounds();
		});
	};

	const measureSelectedNodeBounds = () => {
		const selectedNodeId = props.selectedNodeId;
		const selectedNode = props.nodes.find((node) => node.id === selectedNodeId);
		if (!canvasWrapperRef || !selectedNodeId || !selectedNode || props.readOnly || props.dragNodeType) {
			setSelectedNodeBounds(null);
			return;
		}
		const selectedElement = getRenderedNodeElement(selectedNodeId);
		const canvasRect = getCanvasSurfaceRect();
		if (!selectedElement || !canvasRect) {
			setSelectedNodeBounds(null);
			return;
		}
		const nodeRect = selectedElement.getBoundingClientRect();
		setSelectedNodeBounds({
			nodeId: selectedNode.id,
			nodeType: selectedNode.type,
			left: nodeRect.left - canvasRect.left,
			top: nodeRect.top - canvasRect.top,
			width: nodeRect.width,
			height: nodeRect.height,
		});
	};

	const getNodeCanvasRect = (nodeId: string): { left: number; top: number } | null => {
		const selectedElement = getRenderedNodeElement(nodeId);
		const canvasRect = getCanvasSurfaceRect();
		if (!selectedElement || !canvasRect) return null;
		const nodeRect = selectedElement.getBoundingClientRect();
		return {
			left: nodeRect.left - canvasRect.left,
			top: nodeRect.top - canvasRect.top,
		};
	};

	const captureLayoutAnchor = (nodeId?: string) => {
		if (!nodeId) return;
		const rect = getNodeCanvasRect(nodeId);
		if (!rect) return;
		layoutAnchor = {
			nodeId,
			left: rect.left,
			top: rect.top,
		};
	};

	const capturePreviewLayoutAnchor = (placement: EditableBtDropPlacement | null) => {
		captureLayoutAnchor(placement?.targetNodeId ?? props.activeDropPlacement?.targetNodeId ?? props.selectedNodeId);
	};

	const scheduleLayoutStabilization = () => {
		if (layoutStabilizationQueued) return;
		layoutStabilizationQueued = true;
		queueMicrotask(() => {
			layoutStabilizationQueued = false;
			stabilizeLayoutAnchor();
		});
	};

	const stabilizeLayoutAnchor = () => {
		const anchor = layoutAnchor;
		layoutAnchor = null;
		if (!anchor) return;
		const nextRect = getNodeCanvasRect(anchor.nodeId);
		if (!nextRect) return;
		const deltaX = anchor.left - nextRect.left;
		const deltaY = anchor.top - nextRect.top;
		if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
			scheduleSelectionMeasure();
			return;
		}
		// 设计说明：占位节点会触发树布局重排；用目标节点锚点反向平移视口，让用户眼中的树位置保持稳定。
		commitViewport({ ...viewportState, x: viewportState.x + deltaX, y: viewportState.y + deltaY }, true);
	};

	const beginCanvasInteraction = (x: number, y: number, button: 0 | 1) => {
		canvasDragStartPosition = { x, y };
		canvasPanButton = button;
		hasCanvasDragMoved = false;
		setIsViewportInteracting(true);
	};

	const resetCanvasInteraction = () => {
		canvasPanButton = null;
		lastCanvasDragPosition = null;
		canvasDragStartPosition = null;
		activePointers.clear();
		pinchStart = null;
		setIsViewportInteracting(false);
	};

	const isCanvasPanTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return true;
		return !target.closest("[data-bt-node-id], button, input, textarea, select, [draggable='true']");
	};

	const isMiddleMousePanTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return true;
		return !target.closest("input, textarea, select, [contenteditable='true']");
	};

	const markCanvasMoved = (x: number, y: number) => {
		if (!canvasDragStartPosition) return;
		if (Math.hypot(x - canvasDragStartPosition.x, y - canvasDragStartPosition.y) > 4) {
			hasCanvasDragMoved = true;
		}
	};

	const handleMouseDown = (e: MouseEvent) => {
		if (props.dragNodeType) return;
		const primaryPan = e.button === 0 && isCanvasPanTarget(e.target);
		const middlePan = e.button === 1 && isMiddleMousePanTarget(e.target);
		if (!primaryPan && !middlePan) return;
		e.preventDefault();
		beginCanvasInteraction(e.clientX, e.clientY, e.button as 0 | 1);
		lastCanvasDragPosition = { x: e.clientX, y: e.clientY };
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (props.dragNodeType) {
			resetCanvasInteraction();
			return;
		}
		const lastPos = lastCanvasDragPosition;
		if (!lastPos) return;

		markCanvasMoved(e.clientX, e.clientY);
		commitViewport({
			...viewportState,
			x: viewportState.x + e.clientX - lastPos.x,
			y: viewportState.y + e.clientY - lastPos.y,
		});
		lastCanvasDragPosition = { x: e.clientX, y: e.clientY };
	};

	const handleMouseUp = (e: MouseEvent) => {
		if (canvasPanButton !== null && e.button !== canvasPanButton) return;
		resetCanvasInteraction();
	};

	const handleMouseLeave = () => {
		resetCanvasInteraction();
	};

	const pointerDistance = (points: Array<{ x: number; y: number }>) => {
		const [a, b] = points;
		if (!a || !b) return 0;
		return Math.hypot(a.x - b.x, a.y - b.y);
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (event.pointerType === "mouse") return;
		event.preventDefault();
		beginCanvasInteraction(event.clientX, event.clientY, 0);
		canvasWrapperRef?.setPointerCapture(event.pointerId);
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (activePointers.size === 1) {
			lastCanvasDragPosition = { x: event.clientX, y: event.clientY };
			pinchStart = null;
		}
		if (activePointers.size === 2) {
			hasCanvasDragMoved = true;
			const distance = pointerDistance([...activePointers.values()]);
			pinchStart = { distance, scale: viewportState.scale };
			lastCanvasDragPosition = null;
		}
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (event.pointerType === "mouse") return;
		event.preventDefault();
		if (!activePointers.has(event.pointerId)) return;
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (activePointers.size === 1) {
			markCanvasMoved(event.clientX, event.clientY);
			const lastPos = lastCanvasDragPosition;
			if (lastPos) {
				commitViewport({
					...viewportState,
					x: viewportState.x + event.clientX - lastPos.x,
					y: viewportState.y + event.clientY - lastPos.y,
				});
			}
			lastCanvasDragPosition = { x: event.clientX, y: event.clientY };
		}
		if (activePointers.size === 2) {
			hasCanvasDragMoved = true;
			const distance = pointerDistance([...activePointers.values()]);
			if (pinchStart && pinchStart.distance > 0) {
				commitViewport({
					...viewportState,
					scale: Math.max(0.5, Math.min(2, pinchStart.scale * (distance / pinchStart.distance))),
				});
			}
		}
	};

	const handlePointerEnd = (event: PointerEvent) => {
		if (event.pointerType === "mouse") return;
		if (canvasWrapperRef?.hasPointerCapture(event.pointerId)) {
			canvasWrapperRef.releasePointerCapture(event.pointerId);
		}
		activePointers.delete(event.pointerId);
		if (activePointers.size === 0) {
			lastCanvasDragPosition = null;
			pinchStart = null;
			canvasDragStartPosition = null;
			setIsViewportInteracting(false);
		}
		if (activePointers.size === 1) {
			const point = [...activePointers.values()][0];
			lastCanvasDragPosition = point;
			pinchStart = null;
		}
	};

	const handleCanvasClick = () => {
		if (hasCanvasDragMoved) return;
		props.onCanvasClick?.();
	};

	const handleCanvasKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return;
		props.onCanvasClick?.();
	};

	const getDropPlacement = (clientX: number, clientY: number): EditableBtDropPlacement | null => {
		if (!canvasWrapperRef) return null;
		const best = getClosestNode(clientX, clientY, getDropTargetRects());
		if (!best?.nodeId || best.distance > 96) {
			return null;
		}
		return {
			targetNodeId: best.nodeId,
			intent: getDropIntent(best.rect, clientX, clientY),
		};
	};

	const getDropTargetRects = (): DropTargetRect[] => {
		if (dropTargetRects.length > 0) return dropTargetRects;
		if (!canvasWrapperRef) return [];
		// 设计说明：拖放命中使用拖拽开始后的正式节点坐标快照，避免占位节点重排反过来改变落点计算。
		dropTargetRects = [
			...canvasWrapperRef.querySelectorAll<HTMLElement>('[data-bt-node-id]:not([data-bt-placeholder="true"])'),
		]
			.map((element) => ({
				nodeId: element.dataset.btNodeId ?? "",
				rect: element.getBoundingClientRect(),
			}))
			.filter((candidate) => candidate.nodeId && (!props.canDropOnNode || props.canDropOnNode(candidate.nodeId)));
		return dropTargetRects;
	};

	const getClosestNode = (clientX: number, clientY: number, candidates: DropTargetRect[]) => {
		let best: { nodeId: string; rect: DOMRect; distance: number } | null = null;
		for (const candidate of candidates) {
			const rect = candidate.rect;
			const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
			const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
			const distance = Math.hypot(dx, dy);
			if (!best || distance < best.distance) {
				best = { nodeId: candidate.nodeId, rect, distance };
			}
		}
		return best;
	};

	const getDropIntent = (rect: DOMRect, clientX: number, clientY: number): EditableBtDropIntent => {
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const deltaX = clientX - centerX;
		const deltaY = clientY - centerY;
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			return deltaX < 0 ? "parent" : "child";
		}
		return deltaY < 0 ? "before" : "after";
	};

	const handleDragOver = (event: DragEvent) => {
		if (!props.dragNodeType) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = props.dragNodeId ? "move" : "copy";
		const placement = getDropPlacement(event.clientX, event.clientY);
		props.onNodeDragOver?.(placement, { x: event.clientX, y: event.clientY });
	};

	const handleDrop = (event: DragEvent) => {
		if (!props.dragNodeType) return;
		event.preventDefault();
		const placement = getDropPlacement(event.clientX, event.clientY);
		props.onNodeDrop?.(placement);
		dropTargetRects = [];
		props.onNodeDragEnd?.();
	};

	const handleDragLeave = (event: DragEvent) => {
		if (!props.dragNodeType) return;
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof Node && canvasWrapperRef?.contains(nextTarget)) return;
		props.onNodeDragOver?.(null);
	};

	const handleTreeNodeDragStart = (payload: TreeNodeDragStart) => {
		treeNodePointerDrag = { pointerId: payload.pointerId };
		resetCanvasInteraction();
		dropTargetRects = [];
		props.onTreeNodeDragStart?.(payload);
		dropTargetRects = getDropTargetRects();
		const placement = getDropPlacement(payload.currentPointer.x, payload.currentPointer.y);
		props.onNodeDragOver?.(placement, payload.currentPointer);
	};

	// 设计说明：树节点的 pointer 拖拽复用画布落点计算，移动端和桌面鼠标使用同一套预览/提交规则。
	const handleTreeNodePointerDragMove = (clientX: number, clientY: number) => {
		if (!props.dragNodeType) return;
		const placement = getDropPlacement(clientX, clientY);
		props.onNodeDragOver?.(placement, { x: clientX, y: clientY });
		props.onTreeNodePointerDragMove?.(clientX, clientY);
	};

	const handleTreeNodePointerDragEnd = (clientX: number, clientY: number) => {
		treeNodePointerDrag = null;
		if (!props.dragNodeType) {
			resetCanvasInteraction();
			return;
		}
		const placement = getDropPlacement(clientX, clientY);
		props.onNodeDrop?.(placement);
		dropTargetRects = [];
		props.onNodeDragEnd?.();
		props.onTreeNodePointerDragEnd?.(clientX, clientY);
		resetCanvasInteraction();
	};

	const handleTreeNodeDragCancel = () => {
		treeNodePointerDrag = null;
		props.onNodeDragOver?.(null);
		dropTargetRects = [];
		props.onTreeNodeDragEnd?.();
		resetCanvasInteraction();
	};

	const isActiveTreeNodePointer = (event: PointerEvent): boolean =>
		!!treeNodePointerDrag && treeNodePointerDrag.pointerId === event.pointerId;

	const handleGlobalTreeNodePointerMove = (event: PointerEvent) => {
		if (!isActiveTreeNodePointer(event)) return;
		event.preventDefault();
		handleTreeNodePointerDragMove(event.clientX, event.clientY);
	};

	const handleGlobalTreeNodePointerEnd = (event: PointerEvent) => {
		if (!isActiveTreeNodePointer(event)) return;
		event.preventDefault();
		handleTreeNodePointerDragEnd(event.clientX, event.clientY);
	};

	const handleGlobalTreeNodePointerCancel = (event: PointerEvent) => {
		if (!isActiveTreeNodePointer(event)) return;
		event.preventDefault();
		handleTreeNodeDragCancel();
	};

	const handleInsertPreview = (placement: EditableBtDropPlacement) => {
		capturePreviewLayoutAnchor(placement);
		props.onNodeInsertPreview?.(placement);
		scheduleLayoutStabilization();
	};

	const handleInsertCancel = () => {
		capturePreviewLayoutAnchor(null);
		props.onNodeInsertCancel?.();
		scheduleLayoutStabilization();
	};

	const handleInsertCommit = (placement: EditableBtDropPlacement) => {
		capturePreviewLayoutAnchor(placement);
		props.onNodeInsertCommit?.(placement);
		scheduleLayoutStabilization();
	};

	const getDragOverlayStyle = (overlay: WorkflowDragOverlay): JSX.CSSProperties => {
		const canvasRect = canvasWrapperRef?.getBoundingClientRect();
		const canvasLeft = canvasRect?.left ?? 0;
		const canvasTop = canvasRect?.top ?? 0;
		const deltaX = overlay.currentPointer.x - overlay.startPointer.x;
		const deltaY = overlay.currentPointer.y - overlay.startPointer.y;
		return {
			left: `${snapToDevicePixel(overlay.sourceRect.left - canvasLeft + deltaX)}px`,
			top: `${snapToDevicePixel(overlay.sourceRect.top - canvasTop + deltaY)}px`,
			transform: `scale(${scale()})`,
			"transform-origin": "0 0",
		};
	};

	const handleAuxClick = (event: MouseEvent) => {
		if (event.button === 1) event.preventDefault();
	};

	return (
		<div
			role="application"
			ref={canvasWrapperRef}
			class="relative h-full w-full touch-none overflow-hidden"
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseLeave}
			onAuxClick={handleAuxClick}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerEnd}
			onPointerCancel={handlePointerEnd}
			onClick={handleCanvasClick}
			onKeyDown={handleCanvasKeyDown}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onDragLeave={handleDragLeave}
		>
			<div ref={canvasSurfaceRef} class="absolute inset-0 bg-area-color">
				<svg class="absolute inset-0 w-full h-full">
					<title>Workflow Canvas</title>
					<defs>
						<pattern
							id="canvas-pattern-background"
							x={snapToDevicePixel(translateX())}
							y={snapToDevicePixel(translateY())}
							width={20 * scale()}
							height={20 * scale()}
							patternUnits="userSpaceOnUse"
						>
							<circle cx="1" cy="1" r="1" class="fill-dividing-color" />
						</pattern>
					</defs>
					<rect x="0" y="0" width="100%" height="100%" fill="url(#canvas-pattern-background)" />
				</svg>
				{/* 设计说明：视口平移/缩放以画布左上角为原点，保证网格、节点和悬浮菜单使用同一坐标系。 */}
				<div
					class="absolute"
					classList={{ "will-change-transform": isViewportInteracting() }}
					style={{
						transform: `translate(${snapToDevicePixel(translateX())}px, ${snapToDevicePixel(translateY())}px) scale(${scale()})`,
						"transform-origin": "0 0",
					}}
				>
					<div ref={rootNodesContainerRef} class="flex flex-col items-center">
						<For each={nestedRootNodeIds()}>
							{(rootNodeId) => {
								const rootNode = createMemo(() => getNestedRootNodeById(rootNodeId));
								return (
									<NodeContainer
										parentNode={rootNode().node}
										childNodes={rootNode().children}
										nodeComponents={props.nodeComponents}
										selectedNodeId={props.selectedNodeId}
										draggingNodeId={props.dragNodeId}
										onNodeClick={props.onNodeClick}
										onNodeLongPress={props.onNodeLongPress}
										onTreeNodeDragStart={handleTreeNodeDragStart}
										onTreeNodePointerDragMove={handleTreeNodePointerDragMove}
										onTreeNodePointerDragEnd={handleTreeNodePointerDragEnd}
										onTreeNodeDragEnd={handleTreeNodeDragCancel}
										runtimeNodeStates={props.runtimeNodeStates}
										readOnly={props.readOnly || !!props.dragNodeType}
									/>
								);
							}}
						</For>
					</div>
				</div>
				<Show when={props.dragOverlay}>
					{(overlay) => (
						<div
							data-bt-drag-overlay="true"
							class="pointer-events-none absolute z-40 opacity-90 drop-shadow-lg"
							style={getDragOverlayStyle(overlay())}
						>
							<For each={dragOverlayRootNodeIds()}>
								{(rootNodeId) => {
									const rootNode = createMemo(() => getDragOverlayRootNodeById(rootNodeId));
									return (
										<NodeContainer
											parentNode={rootNode().node}
											childNodes={rootNode().children}
											nodeComponents={props.nodeComponents}
											runtimeNodeStates={props.runtimeNodeStates}
											readOnly
										/>
									);
								}}
							</For>
						</div>
					)}
				</Show>
				<Show when={selectedNodeBounds()}>
					{(bounds) => (
						<NodeSelectionControls
							bounds={bounds()}
							canDelete={!!props.canDeleteNode?.(bounds().nodeId)}
							onInspect={props.onNodeInspect ? () => props.onNodeInspect?.(bounds().nodeId) : undefined}
							onDelete={() => props.onNodeDelete?.(bounds().nodeId)}
							onPreview={handleInsertPreview}
							onCancel={handleInsertCancel}
							onCommit={handleInsertCommit}
						/>
					)}
				</Show>
			</div>
		</div>
	);
};

const NodeSelectionControls: Component<{
	bounds: SelectedNodeBounds;
	canDelete: boolean;
	onInspect?: () => void;
	onDelete: () => void;
	onPreview?: (placement: EditableBtDropPlacement) => void;
	onCancel: () => void;
	onCommit: (placement: EditableBtDropPlacement) => void;
}> = (props) => {
	const placement = (intent: EditableBtDropIntent): EditableBtDropPlacement => ({
		targetNodeId: props.bounds.nodeId,
		intent,
	});
	const canInsertSibling = () => props.bounds.nodeType !== "root";
	const canInsertChild = () =>
		COMPOSITE_NODE_TYPES.has(props.bounds.nodeType as EditableBtNodeType) ||
		DECORATOR_NODE_TYPES.has(props.bounds.nodeType as EditableBtNodeType);

	return (
		<div class="pointer-events-none absolute inset-0 z-30">
			<Show when={canInsertSibling()}>
				<NodeOverlayMenuGroup
					anchor="top"
					style={{
						left: `${props.bounds.left + props.bounds.width / 2}px`,
						top: `${props.bounds.top}px`,
					}}
				>
					<NodeInsertOverlayButton
						label="在上方新增动作"
						placement={placement("before")}
						onPreview={props.onPreview}
						onCancel={props.onCancel}
						onCommit={props.onCommit}
					/>
				</NodeOverlayMenuGroup>
			</Show>
			<Show when={props.canDelete}>
				<NodeOverlayMenuGroup
					anchor="left"
					style={{
						left: `${props.bounds.left}px`,
						top: `${props.bounds.top + props.bounds.height / 2}px`,
					}}
				>
					<NodeOverlayButton
						label="删除节点"
						class="bg-brand-color-3rd text-primary-color hover:bg-brand-color-2nd"
						onClick={props.onDelete}
					>
						<Icons.Outline.Trash />
					</NodeOverlayButton>
				</NodeOverlayMenuGroup>
			</Show>
			<Show when={canInsertSibling()}>
				<NodeOverlayMenuGroup
					anchor="bottom"
					style={{
						left: `${props.bounds.left + props.bounds.width / 2}px`,
						top: `${props.bounds.top + props.bounds.height}px`,
					}}
				>
					<NodeInsertOverlayButton
						label="在下方新增动作"
						placement={placement("after")}
						onPreview={props.onPreview}
						onCancel={props.onCancel}
						onCommit={props.onCommit}
					/>
				</NodeOverlayMenuGroup>
			</Show>
			<Show when={canInsertChild() || props.onInspect}>
				<NodeOverlayMenuGroup
					anchor="right"
					style={{
						left: `${props.bounds.left + props.bounds.width}px`,
						top: `${props.bounds.top + props.bounds.height / 2}px`,
					}}
				>
					<Show when={props.onInspect}>
						<NodeOverlayButton
							label="打开节点配置"
							class="bg-brand-color-1st text-primary-color hover:bg-brand-color-2nd lg:hidden"
							onClick={() => props.onInspect?.()}
						>
							<Icons.Outline.Settings />
						</NodeOverlayButton>
					</Show>
					<Show when={canInsertChild()}>
						<NodeInsertOverlayButton
							label="向子级末尾新增动作"
							placement={placement("child")}
							onPreview={props.onPreview}
							onCancel={props.onCancel}
							onCommit={props.onCommit}
						/>
					</Show>
				</NodeOverlayMenuGroup>
			</Show>
		</div>
	);
};

const NodeOverlayMenuGroup: Component<{
	anchor: "top" | "left" | "bottom" | "right";
	children: JSX.Element;
	style: JSX.CSSProperties;
}> = (props) => {
	const anchorClass = () =>
		({
			top: "-mt-2 -translate-x-1/2 -translate-y-full",
			left: "-ml-2 -translate-x-full -translate-y-1/2",
			bottom: "translate-y-2 -translate-x-1/2",
			right: "translate-x-2 -translate-y-1/2",
		})[props.anchor];

	return (
		// 设计说明：节点菜单按四个方向组织，锚点类只描述几何偏移；按钮只负责行为，避免新增菜单项时重复计算散点坐标。
		<div
			class={`pointer-events-none absolute flex flex-row items-center justify-center gap-2 ${anchorClass()}`}
			style={props.style}
		>
			{props.children}
		</div>
	);
};

const NodeInsertOverlayButton: Component<{
	label: string;
	placement: EditableBtDropPlacement;
	onPreview?: (placement: EditableBtDropPlacement) => void;
	onCancel: () => void;
	onCommit: (placement: EditableBtDropPlacement) => void;
}> = (props) => (
	<NodeOverlayButton
		label={props.label}
		class="bg-brand-color-3rd text-accent-color hover:bg-brand-color-1st"
		onMouseEnter={() => props.onPreview?.(props.placement)}
		onMouseLeave={props.onCancel}
		onFocus={() => props.onPreview?.(props.placement)}
		onBlur={props.onCancel}
		onClick={() => props.onCommit(props.placement)}
	>
		<span class="text-xl leading-none">+</span>
	</NodeOverlayButton>
);

const NodeOverlayButton: Component<{
	children: JSX.Element;
	label: string;
	class: string;
	onClick: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	onFocus?: () => void;
	onBlur?: () => void;
}> = (props) => (
	<button
		type="button"
		aria-label={props.label}
		title={props.label}
		class={`pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full p-2 text-xs shadow shadow-dividing-color lg:h-9 lg:w-9 ${props.class}`}
		onMouseEnter={props.onMouseEnter}
		onMouseLeave={props.onMouseLeave}
		onFocus={props.onFocus}
		onBlur={props.onBlur}
		onPointerDown={(event) => event.stopPropagation()}
		onClick={(event) => {
			event.stopPropagation();
			props.onClick();
		}}
	>
		{props.children}
	</button>
);
