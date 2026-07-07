/**
 * @file overlayStore.ts
 * @description 应用级弹出层管理器 —— 层树数据结构。
 *
 * 设计要点(见 ADR 0017 后续 + 计划文档):
 * - 全局维护一个有序层数组 `layers`。**一个卡片组 = 一层,一个表单组 = 一层**;
 *   层与层之间通过 `parentId` 形成打开来源的树关系。
 * - 层内多条 entry(卡片组的多张卡)由每层自己持有,层内堆叠视觉复用现有 `Card`/`FormSheet`
 *   的 `index/total` 语义,与全局层管理**解耦**。
 * - 关闭一层 = 级联关闭其所有后代层(cascade),避免用户先关表单却看到孤儿卡片。
 * - z-index 按层在数组中的顺序线性推导,取代原来 `z-stack`/`z-stack-top` 二元 hack。
 *
 * 与旧模型的对应关系:
 * - 旧 `globalCardGroup` (全局单例) → 新 `layers` 里 kind==="card" 的**多个层实例**
 * - 旧 `globalFormGroup` (全局单例) → 新 `layers` 里 kind==="form" 的**多个层实例**
 * - 旧 `topGroup` 二元信号 → 由层数组顺序自然决定,不再需要
 */
import type { JSX } from "solid-js";
import { createStore, produce } from "solid-js/store";

export type OverlayLayerKind = "card" | "form";

/** 层内单条内容的 API,交给 render 回调调用。 */
export interface OverlayEntryApi {
	readonly id: string;
	readonly index: number;
	readonly total: number;
	/** 关闭本 entry(触发退出动画,动画完成后由容器 commit 真删)。 */
	close: () => void;
	/** 关闭本层最顶部 entry(卡片组内 drill 场景常用)。 */
	closeTop: () => void;
}

/** 卡片层专属 entry(带 title/titleIcon)。 */
export interface CardEntryInit {
	id?: string;
	title?: string;
	titleIcon?: () => JSX.Element;
	render: (api: OverlayEntryApi) => JSX.Element;
	onClose?: () => void;
}

/** 表单层专属 entry(通常层内单表单,但结构统一)。 */
export interface FormEntryInit {
	id?: string;
	render: (api: OverlayEntryApi) => JSX.Element;
	onClose?: () => void;
}

/** 层内运行时状态(挂 id + closing 标志)。 */
export interface OverlayEntryState {
	id: string;
	title?: string;
	titleIcon?: () => JSX.Element;
	render: (api: OverlayEntryApi) => JSX.Element;
	onClose?: () => void;
	closing: boolean;
}

/** 一层(卡片组 / 表单组 / 未来其它 kind)。 */
export interface OverlayLayer {
	id: string;
	kind: OverlayLayerKind;
	parentId: string | null;
	closing: boolean;
	entries: OverlayEntryState[];
}

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
/** 单层内允许的 entry 数量上限的位宽,避免与相邻层的 z 重叠。 */
const Z_STRIDE = 10;

/** 只读的层数组访问器,供容器 For 遍历。 */
export function overlayLayers(): readonly OverlayLayer[] {
	return layers;
}

/** 打开新层。parentId = 打开来源层的 id,或 null(根级入口)。 */
export function openLayer(
	kind: OverlayLayerKind,
	entry: CardEntryInit | FormEntryInit,
	parentId: string | null,
): { layerId: string; entryId: string } {
	const layerId = createLayerId();
	const entryId = entry.id ?? createEntryId(kind);
	const entryState: OverlayEntryState = {
		id: entryId,
		title: (entry as CardEntryInit).title,
		titleIcon: (entry as CardEntryInit).titleIcon,
		render: entry.render,
		onClose: entry.onClose,
		closing: false,
	};
	setLayers((prev) => [...prev, { id: layerId, kind, parentId, closing: false, entries: [entryState] }]);
	return { layerId, entryId };
}

/** 往已存在的层追加 entry(卡片组内 drill 关联数据)。 */
export function pushEntry(layerId: string, entry: CardEntryInit | FormEntryInit): string {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) {
		throw new Error(`pushEntry: 未找到 layerId=${layerId}`);
	}
	const layer = layers[layerIndex];
	const entryId = entry.id ?? createEntryId(layer.kind);
	const entryState: OverlayEntryState = {
		id: entryId,
		title: (entry as CardEntryInit).title,
		titleIcon: (entry as CardEntryInit).titleIcon,
		render: entry.render,
		onClose: entry.onClose,
		closing: false,
	};
	setLayers(layerIndex, "entries", (prev) => [...prev, entryState]);
	return entryId;
}

/** 关闭层内指定 entry(默认关最顶部)。层内最后一条 entry 关闭 → 自动关本层。 */
export function closeEntry(layerId: string, entryId?: string): void {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) return;
	const layer = layers[layerIndex];
	const targetIndex =
		entryId === undefined ? findTopOpenEntryIndex(layer) : layer.entries.findIndex((e) => e.id === entryId);
	if (targetIndex < 0) return;
	const target = layer.entries[targetIndex];
	if (!target || target.closing) return;
	target.onClose?.();
	setLayers(layerIndex, "entries", targetIndex, "closing", true);
}

/** entry 退出动画完成时容器回调,真正从数组移除该 entry;若该层已无未关闭 entry,自动关层。 */
export function commitEntryRemoval(layerId: string, entryId: string): void {
	const layerIndex = layers.findIndex((l) => l.id === layerId);
	if (layerIndex < 0) return;
	setLayers(layerIndex, "entries", (prev) => prev.filter((e) => e.id !== entryId));
	const remaining = layers[layerIndex]?.entries ?? [];
	if (remaining.length === 0) {
		closeLayer(layerId);
	}
}

/**
 * 关闭一层 —— 级联关闭其所有后代层(cascade)。
 * 只标记 closing,真正的移除等所有层内 entry 退出动画完成后由 commitLayer 提交。
 */
export function closeLayer(layerId: string): void {
	const toClose = collectDescendants(layerId);
	setLayers(
		produce((draft) => {
			for (const layer of draft) {
				if (!toClose.has(layer.id) || layer.closing) continue;
				layer.closing = true;
				for (const entry of layer.entries) {
					if (!entry.closing) {
						entry.onClose?.();
						entry.closing = true;
					}
				}
			}
		}),
	);
}

/** 层退出动画完成后由容器调用,真正从数组移除该层。 */
export function commitLayerRemoval(layerId: string): void {
	setLayers((prev) => prev.filter((l) => l.id !== layerId));
}

/** 关闭最顶层(Escape 用)。返回是否关掉了一个层。 */
export function closeTopLayer(): boolean {
	const top = topLayer();
	if (!top) return false;
	closeLayer(top.id);
	return true;
}

/** 当前最顶层(数组末尾且未 closing)。 */
export function topLayer(): OverlayLayer | undefined {
	for (let i = layers.length - 1; i >= 0; i--) {
		if (!layers[i].closing) return layers[i];
	}
	return undefined;
}

/**
 * 层的 z-index 值。按层在数组中的顺序线性分配:
 * - 越后打开(数组越靠后)z 越高
 * - 用 Z_STRIDE 步长为每层预留 z 空间,避免层内容 z-index 与相邻层混淆
 */
export function layerZIndex(layerId: string): number {
	const index = layers.findIndex((l) => l.id === layerId);
	if (index < 0) return Z_BASE;
	return Z_BASE + index * Z_STRIDE;
}

// ---- 内部工具 ----

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
