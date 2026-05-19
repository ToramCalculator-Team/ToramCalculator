import { batch, type Component, createEffect, createMemo, createSignal, Index, onCleanup, onMount } from "solid-js";
import type { EditableBtDropIntent, EditableBtDropPlacement, EditableBtNodeType } from "../../model/editableTree";
import type { ConnectorType, NodeType, NodeWithChildren } from "../../types/workflow";
import { NodeContainer } from "./NodeContainer";

type CanvasPoint = { x: number; y: number };
type ViewportState = { x: number; y: number; scale: number };
type DropTargetRect = { nodeId: string; rect: DOMRect };

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
	nodeComponents: { [key: string]: Component<NodeType> };
	onInitalise?: (instance: WorkflowCanvasInstance) => void;
	onUpdate?: () => void;
	onNodeDragOver?: (placement: EditableBtDropPlacement | null) => void;
	onNodeDrop?: (placement: EditableBtDropPlacement | null) => void;
	onNodeDragEnd?: () => void;
	onCanvasClick?: () => void;
	onNodeClick?: (nodeId: string) => void;
	onNodeLongPress?: (nodeId: string) => void;
	onNodeMove?: (nodeId: string, direction: -1 | 1) => void;
	onNodeDelete?: (nodeId: string) => void;
	onTreeNodeDragStart?: (nodeId: string) => void;
	onTreeNodeDragEnd?: () => void;
	canDeleteNode?: (nodeId: string) => boolean;
	canDropOnNode?: (nodeId: string) => boolean;
	readOnly?: boolean;
};

export const WorkflowCanvas: Component<WorkflowCanvasProps> = (props) => {
	let canvasWrapperRef: HTMLDivElement | undefined;
	let rootNodesContainerRef: HTMLDivElement | undefined;
	let canvasDragStartPosition: { x: number; y: number } | null = null;
	let hasCanvasDragMoved = false;
	let lastCanvasDragPosition: CanvasPoint | null = null;
	const activePointers = new Map<number, CanvasPoint>();
	let pinchStart: { distance: number; scale: number } | null = null;
	let viewportState: ViewportState = { x: 0, y: 0, scale: 1 };
	let pendingViewport: ViewportState | null = null;
	let viewportAnimationFrame: number | undefined;
	let dropTargetRects: DropTargetRect[] = [];
	let dropSourceKey = "";
	const [translateX, setTranslateX] = createSignal(0);
	const [translateY, setTranslateY] = createSignal(0);
	const [scale, setScale] = createSignal(1);
	const [isViewportInteracting, setIsViewportInteracting] = createSignal(false);

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
	const snapToDevicePixel = (value: number): number => {
		const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
		return Math.round(value * ratio) / ratio;
	};

	// Fit the contents into the centre of the canvas.
	const fit = () => {
		const canvasWrapperOffsetHeight = canvasWrapperRef?.offsetHeight || 0;
		const canvasWrapperOffsetWidth = canvasWrapperRef?.offsetWidth || 0;
		const rootNodesContainerOffsetHeight = rootNodesContainerRef?.offsetHeight || 0;
		const rootNodesContainerOffsetWidth = rootNodesContainerRef?.offsetWidth || 0;

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

		// 延迟执行，确保 DOM 元素已经渲染
		setTimeout(() => {
			fit();
		}, 1);

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
		if (viewportAnimationFrame !== undefined) {
			cancelAnimationFrame(viewportAnimationFrame);
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
	};

	const beginCanvasInteraction = (x: number, y: number) => {
		canvasDragStartPosition = { x, y };
		hasCanvasDragMoved = false;
		setIsViewportInteracting(true);
	};

	const resetCanvasInteraction = () => {
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

	const markCanvasMoved = (x: number, y: number) => {
		if (!canvasDragStartPosition) return;
		if (Math.hypot(x - canvasDragStartPosition.x, y - canvasDragStartPosition.y) > 4) {
			hasCanvasDragMoved = true;
		}
	};

	const handleMouseDown = (e: MouseEvent) => {
		if (e.button !== 0 || props.dragNodeType || !isCanvasPanTarget(e.target)) return;
		beginCanvasInteraction(e.clientX, e.clientY);
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

	const handleMouseUp = () => {
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
		beginCanvasInteraction(event.clientX, event.clientY);
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
		props.onNodeDragOver?.(getDropPlacement(event.clientX, event.clientY));
	};

	const handleDrop = (event: DragEvent) => {
		if (!props.dragNodeType) return;
		event.preventDefault();
		props.onNodeDrop?.(getDropPlacement(event.clientX, event.clientY));
		dropTargetRects = [];
		props.onNodeDragEnd?.();
	};

	const handleDragLeave = (event: DragEvent) => {
		if (!props.dragNodeType) return;
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof Node && canvasWrapperRef?.contains(nextTarget)) return;
		props.onNodeDragOver?.(null);
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
			<div class="absolute inset-0 bg-area-color">
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
				<div
					class="absolute"
					classList={{ "will-change-transform": isViewportInteracting() }}
					style={{
						transform: `translate(${snapToDevicePixel(translateX())}px, ${snapToDevicePixel(translateY())}px) scale(${scale()})`,
					}}
				>
					<div ref={rootNodesContainerRef} class="flex flex-col items-center">
						<Index each={nestedRootNodes()}>
							{(rootNode) => (
								<NodeContainer
									parentNode={rootNode().node}
									childNodes={rootNode().children}
									nodeComponents={props.nodeComponents}
									selectedNodeId={props.selectedNodeId}
									onNodeClick={props.onNodeClick}
									onNodeLongPress={props.onNodeLongPress}
									onNodeMove={props.onNodeMove}
									onNodeDelete={props.onNodeDelete}
									onTreeNodeDragStart={props.onTreeNodeDragStart}
									onTreeNodeDragEnd={props.onTreeNodeDragEnd}
									canDeleteNode={props.canDeleteNode}
									readOnly={props.readOnly || !!props.dragNodeType}
								/>
							)}
						</Index>
					</div>
				</div>
			</div>
		</div>
	);
};
