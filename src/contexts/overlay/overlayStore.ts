/**
 * @file overlayStore.ts
 * @description 应用级弹出层管理器 —— 层树数据结构。
 *
 * 设计要点(见 ADR 0017 后续 + 计划文档):
 * - 全局维护一个有序层数组 `layers`。**一个 dialog 栈 = 一层,一个 sheet 栈 = 一层**;
 *   层与层之间通过 `parentId` 形成打开来源的树关系。
 * - 层内多条 entry 由每层自己持有,层内堆叠视觉由 `OverlayRoot` 的 DialogLayer/SheetLayer 负责。
 * - 关闭一层 = 级联关闭其所有后代层(cascade),避免用户先关表单却看到孤儿卡片。
 * - z-index 按层在数组中的顺序线性推导,取代原来 `z-stack`/`z-stack-top` 二元 hack。
 *
 * 与旧模型的对应关系:
 * - 旧全局卡片单例 → 新 `layers` 里 kind==="dialog" 的**多个层实例**
 * - 旧全局表单单例 → 新 `layers` 里 kind==="sheet" 的**多个层实例**
 * - 旧 `topGroup` 二元信号 → 由层数组顺序自然决定,不再需要
 */
import { type Accessor, batch, type JSX } from "solid-js";
import { createStore } from "solid-js/store";

export type OverlayLayerKind = "dialog" | "sheet";

/** 层内单条内容的 API,交给 render 回调调用。 */
export interface OverlayEntryApi {
	readonly id: string;
	readonly index: number;
	readonly total: number;
	/** 关闭本 entry(触发退出动画,动画完成后由容器 complete 真删)。 */
	close: () => void;
	/** 关闭本层最顶部 entry(dialog drill 场景常用)。 */
	closeTop: () => void;
}

interface OverlayEntryInitBase {
	id?: string;
	render: (api: OverlayEntryApi) => JSX.Element;
	/** 关闭请求发起时调用,不等待退出动画完成。 */
	onCloseRequest?: () => void;
}

/** Dialog layer 专属 entry(带 title/titleIcon)。 */
export interface DialogLayerEntryInit extends OverlayEntryInitBase {
	title?: string | Accessor<string>;
	titleIcon?: () => JSX.Element;
	layout?: "content" | "fill";
	maxWidth?: string;
}

/** Sheet layer 专属 entry(通常层内单表单,但结构统一)。 */
export interface SheetLayerEntryInit extends OverlayEntryInitBase {}

/** 层内运行时状态(挂 id + closing 标志)。 */
interface OverlayEntryStateBase {
	id: string;
	render: (api: OverlayEntryApi) => JSX.Element;
	/** 关闭请求发起时调用,不等待退出动画完成。 */
	onCloseRequest?: () => void;
	closing: boolean;
}

export interface DialogLayerEntryState extends OverlayEntryStateBase {
	title?: string | Accessor<string>;
	titleIcon?: () => JSX.Element;
	layout?: "content" | "fill";
	maxWidth?: string;
}

export interface SheetLayerEntryState extends OverlayEntryStateBase {}

export type OverlayEntryState = DialogLayerEntryState | SheetLayerEntryState;

interface OverlayLayerBase<TKind extends OverlayLayerKind, TEntry extends OverlayEntryState> {
	id: string;
	kind: TKind;
	parentId: string | null;
	closing: boolean;
	entries: TEntry[];
}

/** 一层 dialog stack。 */
export type DialogLayer = OverlayLayerBase<"dialog", DialogLayerEntryState>;

/** 一层 sheet stack。 */
export type SheetLayer = OverlayLayerBase<"sheet", SheetLayerEntryState>;

/** 一层(dialog stack / sheet stack / 未来其它 kind)。 */
export type OverlayLayer = DialogLayer | SheetLayer;

let layerSerial = 0;
let entrySerial = 0;
const createLayerId = () => `overlay-layer-${Date.now()}-${++layerSerial}`;
const createEntryId = (kind: OverlayLayerKind) => `overlay-${kind}-${Date.now()}-${++entrySerial}`;

const [layers, setLayers] = createStore<OverlayLayer[]>([]);

/**
 * z-index 基准值:高于 foundation.css 的 z-stack(60,RealtimeSimulator 常驻层),
 * 保证任意浮层都盖在实时模拟器之上;层级按打开顺序向上线性叠加。
 */
const Z_BASE = 70;
/** 层级步长:为未来 layer 局部层级预留空间。 */
const Z_STRIDE = 10;

/** 只读的层数组访问器,供容器 For 遍历。 */
export function overlayLayers(): readonly OverlayLayer[] {
	return layers;
}

/** 打开新 dialog layer。parentId = 打开来源层的 id,或 null(根级入口)。 */
export function openDialogLayer(
	entry: DialogLayerEntryInit,
	parentId: string | null,
): { layerId: string; entryId: string } {
	const layerId = createLayerId();
	const entryState = createDialogEntryState(entry);
	setLayers(layers.length, { id: layerId, kind: "dialog", parentId, closing: false, entries: [entryState] });
	return { layerId, entryId: entryState.id };
}

/** 打开新 sheet layer。parentId = 打开来源层的 id,或 null(根级入口)。 */
export function openSheetLayer(
	entry: SheetLayerEntryInit,
	parentId: string | null,
): { layerId: string; entryId: string } {
	const layerId = createLayerId();
	const entryState = createSheetEntryState(entry);
	setLayers(layers.length, { id: layerId, kind: "sheet", parentId, closing: false, entries: [entryState] });
	return { layerId, entryId: entryState.id };
}

/** 往已存在的层追加 entry(dialog drill / sheet 递进编辑)。 */
export function pushDialogEntry(layerId: string, entry: DialogLayerEntryInit): string {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) {
		throw new Error(`pushDialogEntry: 未找到 layerId=${layerId}`);
	}
	const layer = layers[layerIndex];
	if (layer.kind !== "dialog") {
		throw new Error(`pushDialogEntry: layerId=${layerId} 是 ${layer.kind} layer`);
	}
	const entryState = createDialogEntryState(entry);
	setLayers(layerIndex, "entries", (prev) => [...prev, entryState]);
	return entryState.id;
}

/** 往已存在的 sheet 层追加 entry。 */
export function pushSheetEntry(layerId: string, entry: SheetLayerEntryInit): string {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) {
		throw new Error(`pushSheetEntry: 未找到 layerId=${layerId}`);
	}
	const layer = layers[layerIndex];
	if (layer.kind !== "sheet") {
		throw new Error(`pushSheetEntry: layerId=${layerId} 是 ${layer.kind} layer`);
	}
	const entryState = createSheetEntryState(entry);
	setLayers(layerIndex, "entries", (prev) => [...prev, entryState]);
	return entryState.id;
}

/** 关闭层内指定 entry(默认关最顶部)。层内最后一条 entry 关闭 → 自动关本层。 */
export function requestCloseEntry(layerId: string, entryId?: string): void {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) return;
	const layer = layers[layerIndex];
	const targetIndex =
		entryId === undefined ? findTopOpenEntryIndex(layer) : layer.entries.findIndex((e) => e.id === entryId);
	if (targetIndex < 0) return;
	const target = layer.entries[targetIndex];
	if (!target || target.closing) return;
	const onCloseRequest = target.onCloseRequest;
	setLayers(layerIndex, "entries", targetIndex, "closing", true);
	onCloseRequest?.();
}

/** entry 退出动画完成时容器回调,真正从数组移除该 entry;若该层已无未关闭 entry,自动关层。 */
export function completeEntryExit(layerId: string, entryId: string): void {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) return;
	const willBeEmpty = layers[layerIndex].entries.every((entry) => entry.id === entryId);
	batch(() => {
		setLayers(layerIndex, "entries", (prev) => prev.filter((entry) => entry.id !== entryId));
		if (willBeEmpty) requestCloseLayer(layerId);
	});
}

/**
 * 关闭一层 —— 级联关闭其所有后代层(cascade)。
 * 只标记 closing,真正的移除等退出动画完成后由 completeLayerExit 提交。
 */
export function requestCloseLayer(layerId: string): void {
	const toClose = collectDescendants(layerId);
	const onCloseRequests: Array<() => void> = [];
	batch(() => {
		for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
			const layer = layers[layerIndex];
			if (!toClose.has(layer.id) || layer.closing) continue;
			setLayers(layerIndex, "closing", true);
			for (let entryIndex = 0; entryIndex < layer.entries.length; entryIndex++) {
				const entry = layer.entries[entryIndex];
				if (entry.closing) continue;
				if (entry.onCloseRequest) onCloseRequests.push(entry.onCloseRequest);
				setLayers(layerIndex, "entries", entryIndex, "closing", true);
			}
		}
	});
	for (const onCloseRequest of onCloseRequests) {
		onCloseRequest();
	}
}

/** 层退出动画完成后由容器调用,真正从数组移除该层。 */
export function completeLayerExit(layerId: string): void {
	setLayers((prev) => prev.filter((l) => l.id !== layerId));
}

/** 关闭最顶层(Escape 用)。返回事件是否被顶层消费。 */
export function requestCloseTopLayer(): boolean {
	const top = topLayer();
	if (!top) return false;
	if (!top.closing) {
		requestCloseLayer(top.id);
	}
	return true;
}

/** 当前视觉最顶层。closing 顶层也会消费 Escape,避免关闭事件穿透到下层。 */
export function topLayer(): OverlayLayer | undefined {
	return layers[layers.length - 1];
}

/**
 * 层的 z-index 值。按层在数组中的顺序线性分配:
 * - 越后打开(数组越靠后)z 越高
 * - 保持步长,为未来 layer 内部局部层级预留空间
 */
export function layerZIndex(layerId: string): number {
	const index = layers.findIndex((l) => l.id === layerId);
	if (index < 0) return Z_BASE;
	return Z_BASE + index * Z_STRIDE;
}

// ---- 内部工具 ----

function createDialogEntryState(entry: DialogLayerEntryInit): DialogLayerEntryState {
	return {
		id: entry.id ?? createEntryId("dialog"),
		title: entry.title,
		titleIcon: entry.titleIcon,
		layout: entry.layout,
		maxWidth: entry.maxWidth,
		render: entry.render,
		onCloseRequest: entry.onCloseRequest,
		closing: false,
	};
}

function createSheetEntryState(entry: SheetLayerEntryInit): SheetLayerEntryState {
	return {
		id: entry.id ?? createEntryId("sheet"),
		render: entry.render,
		onCloseRequest: entry.onCloseRequest,
		closing: false,
	};
}

function findTopOpenEntryIndex(layer: OverlayLayer): number {
	for (let i = layer.entries.length - 1; i >= 0; i--) {
		if (!layer.entries[i].closing) return i;
	}
	return -1;
}

/** 收集 layerId 及其所有后代层的 id(用于级联关闭)。 */
function collectDescendants(layerId: string): Set<string> {
	const result = new Set<string>([layerId]);
	// 层数量有限,直接迭代扫描到不动为止
	let changed = true;
	while (changed) {
		changed = false;
		for (const layer of layers) {
			if (result.has(layer.id)) continue;
			if (layer.parentId && result.has(layer.parentId)) {
				result.add(layer.id);
				changed = true;
			}
		}
	}
	return result;
}
