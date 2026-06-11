/**
 * 基于同构数组的高性能响应式系统
 *
 * 特性：
 * - TypedArray存储：使用Float64Array和Uint32Array提供最高性能
 * - 位标志优化：使用位运算管理属性状态
 * - 批量更新：支持一次性更新多个属性
 * - 内存优化：连续内存布局，减少GC压力
 */
import * as Enums from "@db/schema/enums";
import { createLogger } from "~/lib/Logger";
import type { Checkpointable, StatContainerCheckpoint } from "../../../../types";
import { AttributeFlags, BitFlags } from "./BitFlags";
import { DependencyGraph } from "./DependencyGraph";
import type { AttributeExpression, NestedSchema } from "./SchemaTypes";
import { SchemaFlattener } from "./SchemaTypes";
import { StatContainerASTCompiler } from "./StatContainerAST";
import type { AttributeChangeListener, DataStorage, ModifierSource } from "./StatContainerTypes";
import { ModifierType } from "./StatContainerTypes";

export { AttributeFlags, BitFlags } from "./BitFlags";
export { DependencyGraph } from "./DependencyGraph";
export type {
	AttributeChangeListener,
	DataStorage,
	DataStorages,
	Modifier,
	ModifierSource,
	StatModifierKind,
	StatModifierParam,
} from "./StatContainerTypes";
export {
	dynamicTotalValue,
	isDataStorageType,
	ModifierSourceTypeSchema,
	ModifierType,
	StatModifierKindSchema,
	StatModifierParamSchema,
} from "./StatContainerTypes";

// 见 docs/decisions/0006-stat-container-same-frame-dirty-convergence.md
const log = createLogger("StatContainer");

type PendingValueChange = {
	index: number;
	oldValue: number;
	newValue: number;
};

// ============================== 枚举映射生成 ==============================

/**
 * 生成枚举字符串到数字的映射
 */
function createEnumMappings(): Map<string, number> {
	const enumMapping = new Map<string, number>();

	// 遍历所有枚举数组
	Object.entries(Enums).forEach(([key, value]) => {
		// 检查是否是数组且以_TYPE结尾的常量
		if (Array.isArray(value) && key.endsWith("_TYPE")) {
			// console.log(`📋 注册枚举映射: ${key}`, value);

			// 为每个枚举值创建字符串->数字映射
			value.forEach((enumValue: string, index: number) => {
				enumMapping.set(enumValue, index);
				// console.log(`  ${enumValue} -> ${index}`);
			});
		}
	});

	// console.log(`✅ 枚举映射创建完成，共 ${enumMapping.size} 个映射`);
	return enumMapping;
}

// 全局枚举映射
const ENUM_MAPPINGS = createEnumMappings();

// ============================== 主要实现 ==============================

/**
 * 基于TypedArray的高性能响应式数据管理器
 */
export class StatContainer<T extends string> implements Checkpointable<StatContainerCheckpoint> {
	// ==================== 核心数据结构 ====================

	/** 主要属性值存储 - 连续内存布局 */
	private readonly values: Float64Array;

	/** 属性状态标志位 */
	private readonly flags: Uint32Array;

	/**
	 * 属性是否已经被观测过（首次 `updateDirtyValues` 写入 `values[index]` 后置 1）。
	 * 用于 `onChange` 判定：未观测过时跳过事件，避免构造期把 0→初值 误报成 change。
	 */
	private readonly hasObserved: Uint32Array;

	/** onChange 监听器表：attrIndex -> callback 集合 */
	private readonly changeListeners: Map<number, Set<AttributeChangeListener>> = new Map();

	/** 修饰符数据存储 - 5个数组分别存储不同类型的修饰符 */
	private readonly modifierArrays: Float64Array[];

	/** 修饰符来源聚合：按类型 -> 属性索引 -> sourceId -> value */
	private readonly modifierSources: Map<ModifierType, Map<number, Map<string, number>>>;

	/** sourceId 反向索引：sourceId -> (type * keyCount + attrIndex) 集合 */
	private readonly sourceIndex: Map<string, Set<number>>;

	/** 依赖图 */
	private readonly dependencyGraph: DependencyGraph;

	/** 脏属性队列 - 使用Uint32Array作为位图 */
	private readonly dirtyBitmap: Uint32Array;

	/** 脏属性迭代队列：位图负责去重，数组负责让刷新成本跟本帧变更规模相关。 */
	private dirtyList: number[] = [];

	/** 属性拓扑 rank：刷新批次按 rank 排序，保证依赖先于依赖者计算。 */
	private readonly topologyRank: Int32Array;

	/** 刷新中的 onChange 事件先入队，当前计算批次完成后再统一派发。 */
	private pendingNotifications: PendingValueChange[] = [];

	/** 防止 listener 内 getValue / flushDirtyValues 嵌套启动完整 drain。 */
	private isFlushing = false;

	/** 同帧定点迭代上限按属性规模扩展，避免合法长链被小常量误判。 */
	private readonly maxFlushPasses: number;

	/** 计算函数存储（无参，内部闭包获取需要的上下文） */
	private readonly computationFunctions: Map<number, () => number>;

	/** 属性键映射 */
	private readonly keyToIndex: Map<T, number>;
	private readonly indexToKey: T[];

	/** 显示名称映射（用于调试） */
	private readonly displayNames: Map<T, string>;

	/** 表达式原文映射（用于导出展示） */
	private readonly expressionStrings: Map<T, string> = new Map();

	/** 标记属性是否为 noBaseValue（百分比修正不参与乘法，仅做加法累加） */
	private readonly isNoBaseValue: boolean[] = [];

	/** 正在计算的属性集合（防止递归） */
	private readonly isComputing: Set<number> = new Set();

	// ==================== 性能统计 ====================

	private readonly stats = {
		computations: 0,
		cacheHits: 0,
		cacheMisses: 0,
		lastUpdateTime: 0,
		batchUpdates: 0,
	};

	// ==================== 构造函数 ====================

	/**
	 * 构造函数 - 使用统一的Schema模式
	 *
	 * @param schema 嵌套的Schema结构
	 */
	constructor(schema: NestedSchema) {
		// console.log("🚀 StatContainer 构造函数", schema);
		const flattened = SchemaFlattener.flatten<T>(schema);
		const attrKeys = flattened.attrKeys;
		const expressions = flattened.expressions;
		const displayNames = flattened.displayNames;
		const keyCount = attrKeys.length;

		// 初始化核心数据结构
		this.values = new Float64Array(keyCount);
		this.flags = new Uint32Array(Math.ceil(keyCount / 32));
		this.dirtyBitmap = new Uint32Array(Math.ceil(keyCount / 32));
		this.hasObserved = new Uint32Array(Math.ceil(keyCount / 32));
		this.topologyRank = new Int32Array(keyCount);
		this.maxFlushPasses = Math.max(1, keyCount * 2);

		// 初始化修饰符数组
		this.modifierArrays = [];
		for (let i = 0; i < ModifierType.MODIFIER_ARRAYS_COUNT; i++) {
			this.modifierArrays[i] = new Float64Array(keyCount);
		}

		// 初始化修饰符来源聚合结构
		this.modifierSources = new Map();
		this.sourceIndex = new Map();

		// 初始化映射关系
		this.keyToIndex = new Map();
		this.indexToKey = attrKeys;
		this.displayNames = displayNames;
		// 记录表达式原文，便于导出展示
		for (const [key, expr] of expressions) {
			this.expressionStrings.set(key, expr.expression);
		}
		attrKeys.forEach((key, index) => {
			this.keyToIndex.set(key, index);
		});

		// 初始化 noBaseValue 标记数组（在 keyToIndex 完成后）
		this.isNoBaseValue = new Array(keyCount).fill(false);
		for (const [key, expr] of expressions) {
			const idx = this.keyToIndex.get(key);
			if (idx !== undefined && expr.noBaseValue) this.isNoBaseValue[idx] = true;
		}

		// 初始化依赖图和JS处理器
		this.dependencyGraph = new DependencyGraph(keyCount);
		this.computationFunctions = new Map();

		// 设置表达式，填充依赖关系
		if (expressions.size > 0) {
			this.setupExpressions(expressions);
		}
		this.rebuildTopologyRank();

		// 标记基础属性（无计算函数的属性视为基础值）
		for (let i = 0; i < this.indexToKey.length; i++) {
			if (!BitFlags.has(this.flags, i, AttributeFlags.HAS_COMPUTATION)) {
				BitFlags.set(this.flags, i, AttributeFlags.IS_BASE);
			}
		}

		// 标记所有属性为脏值
		this.markAllDirty();

		// console.log(`🚀 StatContainer 初始化完成:`, this);
		log.info(`🚀 StatContainer 初始化完成:`, this.exportFlatValues());
	}

	// ==================== 公共API - 属性访问 ====================

	/**
	 * 获取属性值
	 */
	getValue(attr: T): number {
		const index = this.keyToIndex.get(attr);
		if (index === undefined) {
			log.warn(`⚠️ 尝试获取不存在的属性值: ${attr}`);
			return 0;
		}

		// 检查是否需要更新
		if (this.isDirty(index)) {
			if (this.isFlushing) {
				this.computeDirtyAttributeForRead(index, this.pendingNotifications);
			} else {
				this.updateDirtyValues();
			}
		}

		// 检查是否有缓存值
		if (BitFlags.has(this.flags, index, AttributeFlags.IS_CACHED)) {
			this.stats.cacheHits++;
			return this.values[index];
		}

		// 重新计算
		this.stats.cacheMisses++;
		const pending = this.isFlushing ? this.pendingNotifications : [];
		const value = this.computeAndCommitAttribute(index, pending);
		if (!this.isFlushing) {
			this.fireValueChanges(pending);
		}
		return value;
	}

	hasKey(key: string): boolean {
		return this.keyToIndex.has(key as T);
	}

	getAllKeys(): T[] {
		return this.indexToKey.slice();
	}

	/**
	 * 获取属性基础值（表达式求值结果，叠加 modifier 之前）
	 */
	getBaseValue(attr: T): number {
		const index = this.keyToIndex.get(attr);
		if (index === undefined) {
			log.warn(`⚠️ 尝试获取不存在的属性基础值: ${attr}`);
			return 0;
		}

		// 确保依赖链已更新
		if (this.isDirty(index)) {
			if (this.isFlushing) {
				this.computeDirtyAttributeForRead(index, this.pendingNotifications);
			} else {
				this.updateDirtyValues();
			}
		}

		const computationFn = this.computationFunctions.get(index);
		if (computationFn) {
			return computationFn();
		}
		return this.modifierArrays[ModifierType.BASE_VALUE][index];
	}

	/**
	 * 批量获取属性值
	 */
	getValues(attrs?: T[]): Record<T, number> {
		const targetAttrs = attrs || this.indexToKey;
		const result: Record<T, number> = {} as Record<T, number>;

		// 只在有脏值时才批量更新
		if (this.hasDirtyValues() || this.pendingNotifications.length > 0) {
			this.updateDirtyValues();
		}

		// 批量读取（不计入缓存统计，因为这是直接数组访问）
		for (const attr of targetAttrs) {
			const index = this.keyToIndex.get(attr);
			if (index !== undefined) {
				result[attr] = this.values[index];
			}
		}

		return result;
	}

	/**
	 * 获取属性的显示名称
	 */
	getDisplayName(attr: T): string {
		return this.displayNames.get(attr) || attr;
	}

	// ==================== 公共API - 变更订阅 ====================

	/**
	 * 订阅属性变更。
	 *
	 * 语义：
	 * - 仅在属性"已被至少观测过一次"且 `oldValue !== newValue` 时触发 callback。
	 *   构造期的初始计算（0 → 初值）不会被误报。
	 * - 变更检测发生在属性真正被重算时（getValue / updateDirtyValues）；
	 *   为让跨阈值触发器即时响应，业务侧（或 Member.tick）应在每帧调用 `flushDirtyValues`。
	 * - 纯被动机制：数据层不持有业务语义，阈值 / 过滤交给编排层的 `AttributeThresholdSource`。
	 *
	 * @returns 取消订阅的函数
	 */
	onChange(attr: T, listener: AttributeChangeListener): () => void {
		const index = this.keyToIndex.get(attr);
		if (index === undefined) {
			log.warn(`onChange: 未知属性 ${attr}`);
			return () => {};
		}
		let set = this.changeListeners.get(index);
		if (!set) {
			set = new Set();
			this.changeListeners.set(index, set);
		}
		set.add(listener);
		return () => {
			const s = this.changeListeners.get(index);
			if (!s) return;
			s.delete(listener);
			if (s.size === 0) this.changeListeners.delete(index);
		};
	}

	/**
	 * 将所有标脏属性立即刷新计算，并触发对应的 onChange 监听器。
	 *
	 * 用法：每帧由成员 tick 调用一次，使阈值 watcher 能够及时拿到 modifier 变更后的值。
	 */
	flushDirtyValues(): void {
		if (this.hasDirtyValues() || this.pendingNotifications.length > 0) {
			this.updateDirtyValues();
		}
	}

	/**
	 * 记录 onChange 事件；仅在属性已被观测过且值真正改变时入队。
	 *
	 * @internal 供 StatContainer 内部各写入路径调用。
	 */
	private queueValueChange(index: number, oldValue: number, newValue: number, pending: PendingValueChange[]): void {
		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		const alreadyObserved = (this.hasObserved[arrayIndex] & (1 << bitIndex)) !== 0;
		this.hasObserved[arrayIndex] |= 1 << bitIndex;
		if (!alreadyObserved) return;
		if (oldValue === newValue) return;
		const listeners = this.changeListeners.get(index);
		if (!listeners || listeners.size === 0) return;

		pending.push({ index, oldValue, newValue });
	}

	/**
	 * 触发 onChange 监听器。
	 *
	 * 计算阶段只产生事件记录，通知阶段统一派发；listener 写回产生的新脏值交给外层 drain 下一轮吸收。
	 */
	private fireValueChanges(pending: PendingValueChange[]): void {
		for (const change of pending) {
			const listeners = this.changeListeners.get(change.index);
			if (!listeners || listeners.size === 0) continue;
			const path = String(this.indexToKey[change.index]);
			for (const cb of listeners) {
				try {
					cb(change.oldValue, change.newValue, path);
				} catch (error) {
					log.error(`StatContainer.onChange 监听器抛错 (${path})：`, error);
				}
			}
		}
	}

	// ==================== 公共API - 修饰符管理 ====================

	private getSourceEntryKey(type: ModifierType, attrIndex: number): number {
		return type * this.values.length + attrIndex;
	}

	private addSourceIndexEntry(sourceId: string, entryKey: number): void {
		let set = this.sourceIndex.get(sourceId);
		if (!set) {
			set = new Set();
			this.sourceIndex.set(sourceId, set);
		}
		set.add(entryKey);
	}

	private removeSourceIndexEntry(sourceId: string, entryKey: number): void {
		const set = this.sourceIndex.get(sourceId);
		if (!set) return;
		set.delete(entryKey);
		if (set.size === 0) {
			this.sourceIndex.delete(sourceId);
		}
	}

	/**
	 * 添加修饰符
	 */
	addModifier(attr: T, targetType: ModifierType, value: number, source: ModifierSource): void {
		// 获取属性索引
		const index = this.keyToIndex.get(attr);
		if (index === undefined) {
			log.warn(`⚠️ 尝试为不存在的属性添加修饰器: ${attr}`);
			return;
		}
		const type = targetType;
		const amount = value;
		if (amount === 0) return;

		const entryKey = this.getSourceEntryKey(type, index);
		const sourceId = source.id;

		// 来源聚合：记录 sourceId 的值并同步到累加数组
		let perType = this.modifierSources.get(type);
		if (!perType) {
			perType = new Map();
			this.modifierSources.set(type, perType);
		}
		let perAttr = perType.get(index);
		if (!perAttr) {
			perAttr = new Map();
			perType.set(index, perAttr);
		}
		const prev = perAttr.get(sourceId) ?? 0;
		const next = prev + amount;
		const delta = next - prev;
		if (delta !== 0) {
			this.modifierArrays[type][index] += delta;
			this.markDirty(index);
		}
		if (next === 0) {
			perAttr.delete(sourceId);
			if (perAttr.size === 0) {
				perType.delete(index);
				if (perType.size === 0) {
					this.modifierSources.delete(type);
				}
			}
			this.removeSourceIndexEntry(sourceId, entryKey);
		} else {
			perAttr.set(sourceId, next);
			this.addSourceIndexEntry(sourceId, entryKey);
		}

		// console.log(`✅ 成功添加修饰器: ${attr} ,位置${targetType.toString()} ,值${value} (来源: ${source.name})`);
	}

	/**
	 * 批量添加修饰符（包含基础值）
	 */
	addModifiers(
		items: Array<{
			attr: T;
			targetType: ModifierType;
			value: number;
			source: ModifierSource;
		}>,
	): void {
		for (const it of items) {
			this.addModifier(it.attr, it.targetType, it.value, it.source);
		}
		this.stats.batchUpdates++;
	}

	/**
	 * 移除修饰符
	 */
	removeModifier(attr: T, targetType: ModifierType, sourceId: string): void {
		const index = this.keyToIndex.get(attr);
		if (index === undefined) {
			log.warn(`⚠️ 尝试为不存在的属性移除修饰器: ${attr}`);
			return;
		}

		const entryKey = this.getSourceEntryKey(targetType, index);
		// 来源级移除：从来源聚合删除并从累加数组扣减
		const perType = this.modifierSources.get(targetType);
		const perAttr = perType?.get(index);
		if (!perType || !perAttr || !perAttr.has(sourceId)) return;
		const amount = perAttr.get(sourceId) ?? 0;
		this.modifierArrays[targetType][index] -= amount;
		perAttr.delete(sourceId);
		if (perAttr.size === 0) {
			perType.delete(index);
			if (perType.size === 0) {
				this.modifierSources.delete(targetType);
			}
		}
		this.removeSourceIndexEntry(sourceId, entryKey);
		this.markDirty(index);
		log.debug(`✅ 成功移除修饰器: ${attr} -${amount} (来源: ${sourceId})`);
	}

	/**
	 * 按 sourceId 查询其影响的所有修饰条目
	 */
	getModifiersBySourceId(sourceId: string): Array<{ attr: T; targetType: ModifierType; value: number }> {
		const keys = this.sourceIndex.get(sourceId);
		if (!keys || keys.size === 0) return [];

		const result: Array<{ attr: T; targetType: ModifierType; value: number }> = [];
		const keyCount = this.values.length;

		for (const entryKey of keys) {
			const type = Math.floor(entryKey / keyCount) as ModifierType;
			const attrIndex = entryKey - type * keyCount;
			const value = this.modifierSources.get(type)?.get(attrIndex)?.get(sourceId);
			if (value === undefined || value === 0) continue;
			result.push({ attr: this.indexToKey[attrIndex], targetType: type, value });
		}

		return result;
	}

	/**
	 * 按 sourceId 覆盖更新一组修饰条目（会移除该 sourceId 旧的所有条目）
	 *
	 * 注意：暂不考虑同一 sourceId 下出现同 (attr, targetType) 的重复条目。
	 */
	updateModifiersBySourceId(
		sourceId: string,
		items: Array<{ attr: T; targetType: ModifierType; value: number }>,
	): void {
		const desired = new Map<number, number>();
		const keyCount = this.values.length;

		for (const item of items) {
			const attrIndex = this.keyToIndex.get(item.attr);
			if (attrIndex === undefined) {
				log.warn(`⚠️ 尝试为不存在的属性更新修饰器: ${item.attr}`);
				continue;
			}
			const entryKey = this.getSourceEntryKey(item.targetType, attrIndex);
			if (desired.has(entryKey)) {
				log.warn(`⚠️ updateModifiersBySourceId 收到重复条目: ${String(item.attr)} ${ModifierType[item.targetType]}`);
			}
			desired.set(entryKey, item.value);
		}

		const prevKeys = this.sourceIndex.get(sourceId);
		const allKeys = new Set<number>();
		if (prevKeys) {
			for (const k of prevKeys) allKeys.add(k);
		}
		for (const k of desired.keys()) allKeys.add(k);

		for (const entryKey of allKeys) {
			const type = Math.floor(entryKey / keyCount) as ModifierType;
			const attrIndex = entryKey - type * keyCount;
			const perType = this.modifierSources.get(type);
			const perAttr = perType?.get(attrIndex);
			const prev = perAttr?.get(sourceId) ?? 0;
			const next = desired.get(entryKey) ?? 0;
			if (prev === next) continue;

			if (next === 0) {
				if (perType && perAttr && perAttr.has(sourceId)) {
					this.modifierArrays[type][attrIndex] -= prev;
					perAttr.delete(sourceId);
					if (perAttr.size === 0) {
						perType.delete(attrIndex);
						if (perType.size === 0) this.modifierSources.delete(type);
					}
				}
				this.removeSourceIndexEntry(sourceId, entryKey);
			} else {
				let ensuredPerType = perType;
				if (!ensuredPerType) {
					ensuredPerType = new Map();
					this.modifierSources.set(type, ensuredPerType);
				}
				let ensuredPerAttr = ensuredPerType.get(attrIndex);
				if (!ensuredPerAttr) {
					ensuredPerAttr = new Map();
					ensuredPerType.set(attrIndex, ensuredPerAttr);
				}
				ensuredPerAttr.set(sourceId, next);
				this.addSourceIndexEntry(sourceId, entryKey);
				this.modifierArrays[type][attrIndex] += next - prev;
			}

			this.markDirty(attrIndex);
		}

		this.stats.batchUpdates++;
	}

	/**
	 * 按 sourceId 移除其全部修饰条目
	 */
	removeModifiersBySourceId(sourceId: string): void {
		this.updateModifiersBySourceId(sourceId, []);
	}

	/**
	 * 按 sourceId 前缀移除其全部修饰条目。
	 *
	 * 用于 passive / buff 卸载：`passive.<id>` 前缀下的所有 sourceId（含动态后缀如
	 * `passive.<id>.<suffix>.<frame>`）一次清理完。
	 */
	removeModifiersBySourceIdPrefix(sourceIdPrefix: string): void {
		if (this.sourceIndex.size === 0) return;
		// 拷贝 key 列表避免在迭代时改 map
		const matchingIds: string[] = [];
		for (const sourceId of this.sourceIndex.keys()) {
			if (sourceId === sourceIdPrefix || sourceId.startsWith(`${sourceIdPrefix}.`)) {
				matchingIds.push(sourceId);
			}
		}
		for (const id of matchingIds) {
			this.updateModifiersBySourceId(id, []);
		}
	}

	// ==================== 公共API - 数据导出 ====================

	/**
	 * 导出扁平数值映射（attrKey -> value）
	 * 会在导出前自动同步所有脏值
	 */
	public exportFlatValues(): Record<T, number> {
		return this.getValues();
	}

	/**
	 * 导出嵌套结构的属性值对象
	 * 根据属性键的 DSL 路径（如 "hp.current"）重建层级对象
	 */
	public exportNestedValues(): Record<string, unknown> {
		// 确保最新值
		if (this.hasDirtyValues() || this.pendingNotifications.length > 0) {
			this.updateDirtyValues();
		}

		const result: Record<string, unknown> = {};

		// 收集指定类型在某属性索引下的全部来源条目
		const collect = (type: ModifierType, attrIndex: number): Array<{ sourceId: string; value: number }> => {
			const perType = this.modifierSources.get(type);
			const perAttr = perType?.get(attrIndex);
			const out: Array<{ sourceId: string; value: number }> = [];
			if (perAttr) {
				for (const [sourceId, value] of perAttr) {
					out.push({ sourceId, value });
				}
			}
			return out;
		};

		const setNested = (root: Record<string, unknown>, path: string[], leafKey: string, value: number) => {
			let current: Record<string, unknown> = root;
			for (const seg of path) {
				const next = current[seg];
				if (typeof next !== "object" || next === null) {
					current[seg] = {} as Record<string, unknown>;
				}
				current = current[seg] as Record<string, unknown>;
			}

			// 组装 DataStorage 单元
			const attrPath = [...path, leafKey].join(".");
			const index = this.keyToIndex.get(attrPath as T);
			const storage: DataStorage = {
				displayName: this.displayNames.get(attrPath as T) || attrPath,
				expression: this.expressionStrings.get(attrPath as T) || "",
				baseValue: 0,
				actValue: Number.isFinite(value) ? value : 0,
				static: { fixed: [], percentage: [] },
				dynamic: { fixed: [], percentage: [] },
			};
			if (index !== undefined) {
				// 基础值：若为计算属性，则取表达式计算结果作为"基础值"；否则读取 BASE_VALUE 槽位
				let base = this.modifierArrays[ModifierType.BASE_VALUE][index];
				if (BitFlags.has(this.flags, index, AttributeFlags.HAS_COMPUTATION)) {
					const computationFn = this.computationFunctions.get(index);
					if (computationFn) {
						try {
							base = computationFn();
						} catch {
							base = 0;
						}
					}
				}
				storage.baseValue = Number.isFinite(base) ? base : 0;
				storage.static.fixed = collect(ModifierType.STATIC_FIXED, index);
				storage.static.percentage = collect(ModifierType.STATIC_PERCENTAGE, index);
				storage.dynamic.fixed = collect(ModifierType.DYNAMIC_FIXED, index);
				storage.dynamic.percentage = collect(ModifierType.DYNAMIC_PERCENTAGE, index);
			}

			current[leafKey] = storage as unknown as Record<string, unknown>;
		};

		for (let i = 0; i < this.indexToKey.length; i++) {
			const key = this.indexToKey[i] as string; // DSL 路径
			const parts = key.split(".");
			const leaf = parts.pop() as string;
			const parentPath = parts;
			const value = this.values[i];
			// 即便 value 不是有限数，也返回结构齐全的 DataStorage
			setNested(result, parentPath, leaf, Number.isFinite(value) ? value : 0);
		}

		return result;
	}

	/**
	 * 导出修饰符来源明细
	 * 结构以属性键为单位，细分五类修饰符，并列出每个来源的累积值
	 */
	public exportModifierDetails(): Record<
		T,
		{
			baseValue: number;
			static: {
				fixed: Array<{ sourceId: string; value: number }>;
				percentage: Array<{ sourceId: string; value: number }>;
			};
			dynamic: {
				fixed: Array<{ sourceId: string; value: number }>;
				percentage: Array<{ sourceId: string; value: number }>;
			};
		}
	> {
		const collect = (type: ModifierType, attrIndex: number): Array<{ sourceId: string; value: number }> => {
			const perType = this.modifierSources.get(type);
			const perAttr = perType?.get(attrIndex);
			const out: Array<{ sourceId: string; value: number }> = [];
			if (perAttr) {
				for (const [sourceId, value] of perAttr) {
					out.push({ sourceId, value });
				}
			}
			return out;
		};

		const result = {} as Record<
			T,
			{
				baseValue: number;
				static: {
					fixed: Array<{ sourceId: string; value: number }>;
					percentage: Array<{ sourceId: string; value: number }>;
				};
				dynamic: {
					fixed: Array<{ sourceId: string; value: number }>;
					percentage: Array<{ sourceId: string; value: number }>;
				};
			}
		>;

		for (let i = 0; i < this.indexToKey.length; i++) {
			const key = this.indexToKey[i];
			result[key] = {
				baseValue: this.modifierArrays[ModifierType.BASE_VALUE][i],
				static: {
					fixed: collect(ModifierType.STATIC_FIXED, i),
					percentage: collect(ModifierType.STATIC_PERCENTAGE, i),
				},
				dynamic: {
					fixed: collect(ModifierType.DYNAMIC_FIXED, i),
					percentage: collect(ModifierType.DYNAMIC_PERCENTAGE, i),
				},
			};
		}

		return result;
	}

	// ==================== 内部实现 - 表达式处理 ====================

	/**
	 * 设置表达式和依赖关系
	 */
	private setupExpressions(expressions: Map<T, AttributeExpression>): void {
		// console.log("🔧 设置表达式和依赖关系...");
		for (const [attrName, expressionData] of expressions) {
			const index = this.keyToIndex.get(attrName);
			if (index === undefined || !expressionData.expression) {
				continue;
			}

			// 不注入GameEngine上下文，只处理self属性访问
			const compiled = this.compileExpressionOnce(attrName as T, expressionData.expression);
			// console.log(attrName, compiled);
			if (compiled.constant !== null) {
				// 常量：直接作为基础值
				this.modifierArrays[ModifierType.BASE_VALUE][index] = compiled.constant;
				BitFlags.set(this.flags, index, AttributeFlags.IS_BASE);
				// console.log(this.exportNestedValues())
				continue;
			}

			if (compiled.code) {
				// 注册依赖
				for (const dep of compiled.deps) {
					const depIndex = this.keyToIndex.get(dep as T);
					if (depIndex !== undefined && depIndex !== index) {
						this.dependencyGraph.addDependency(index, depIndex);
					}
				}

				// 创建计算函数
				const code = compiled.code;
				// 预编译表达式函数（避免每次计算都 new Function）
				const fn = new Function("ctx", `with (ctx) { return ${code}; }`) as (ctx: {
					_get: (k: string) => number;
				}) => unknown;
				// 仅注入取值函数，避免对 Member 的强耦合
				const executionContext = { _get: (k: string) => this.getValue(k as T) };
				this.computationFunctions.set(index, () => {
					if (this.isComputing.has(index)) {
						log.warn(`⚠️ 检测到递归计算 ${attrName}，返回默认值`);
						return 0;
					}
					this.isComputing.add(index);
					try {
						const result = fn(executionContext);
						return typeof result === "number" ? result : 0;
					} catch (error) {
						log.error(`❌ 属性 ${attrName} 表达式执行失败:`, error);
						log.error(`❌ 失败的编译代码: ${code}`);
						return 0;
					} finally {
						this.isComputing.delete(index);
					}
				});

				BitFlags.set(this.flags, index, AttributeFlags.HAS_COMPUTATION);
			} else {
				log.error(`❌ 属性 ${attrName} 表达式编译失败: ${expressionData.expression}`);
				this.computationFunctions.set(index, () => 0);
				BitFlags.set(this.flags, index, AttributeFlags.HAS_COMPUTATION);
			}
			// 依赖关系已在上方注册
		}

		// console.log(`✅ 表达式和依赖关系设置完成`);
	}

	/**
	 * 基于AST的表达式编译 - 精确处理属性访问转换
	 */
	private compileExpressionOnce(
		currentAttr: T,
		expression: string,
	): { code: string | null; deps: string[]; constant: number | null } {
		// 1) 纯数字常量
		if (!Number.isNaN(Number(expression)) && Number.isFinite(Number(expression))) {
			return { code: null, deps: [], constant: Number(expression) };
		}

		// 2) 枚举常量
		const enumValue = this.getEnumValue(expression);
		if (enumValue !== null) {
			return { code: null, deps: [], constant: enumValue };
		}

		// 3) 自引用保护
		if (expression.trim() === String(currentAttr)) {
			log.warn(`⚠️ 检测到自引用: ${expression}，返回0`);
			return { code: null, deps: [], constant: 0 };
		}

		// 4) AST 编译，一次性得到 code 与 deps
		try {
			const knownAttributes = Array.from(this.keyToIndex.keys()).map((attr) => String(attr));
			const compiler = new StatContainerASTCompiler(knownAttributes, String(currentAttr));
			const result = compiler.compile(expression);
			if (!result.success) {
				log.error(`❌ AST编译失败: ${expression}`, result.error);
				return { code: null, deps: [], constant: null };
			}
			return {
				code: result.compiledCode,
				deps: result.dependencies,
				constant: null,
			};
		} catch (error) {
			log.error(`❌ 表达式编译异常: ${expression}`, error);
			return { code: null, deps: [], constant: null };
		}
	}

	/**
	 * 获取枚举值对应的数字，如果不是枚举则返回null
	 */
	private getEnumValue(expression: string): number | null {
		const trimmed = expression.trim();

		// 排除JavaScript内置对象和关键字
		const excludedValues = [
			"Math",
			"Number",
			"String",
			"Object",
			"Array",
			"Boolean",
			"Date",
			"RegExp",
			"console",
			"window",
			"document",
			"parseInt",
			"parseFloat",
			"isNaN",
			"isFinite",
		];
		if (excludedValues.includes(trimmed)) {
			return null;
		}

		// 排除明显的属性名（包含点号或常见属性模式）
		if (trimmed.includes(".") || /^[a-z][A-Za-z]*$/.test(trimmed)) {
			return null;
		}

		// 从枚举映射中查找（只查找PascalCase的枚举值）
		const enumValue = ENUM_MAPPINGS.get(trimmed);
		if (enumValue !== undefined) {
			// console.log(`🎯 匹配到枚举: ${trimmed} -> ${enumValue}`);
			return enumValue;
		}

		return null;
	}

	// ==================== 内部实现 - 计算引擎 ====================

	/**
	 * 构建属性拓扑 rank。
	 *
	 * 依赖图只在表达式初始化阶段生成；刷新时只需要 rank 排序当前脏集，
	 * 避免每帧遍历整张拓扑表。
	 */
	private rebuildTopologyRank(): void {
		for (let i = 0; i < this.topologyRank.length; i++) {
			this.topologyRank[i] = this.topologyRank.length + i;
		}

		try {
			const order = this.dependencyGraph.getTopologicalOrder();
			for (let rank = 0; rank < order.length; rank++) {
				this.topologyRank[order[rank]] = rank;
			}
		} catch (_err) {
			log.warn("⚠️ 检测到循环依赖，拓扑 rank 降级为属性索引顺序");
			for (let i = 0; i < this.topologyRank.length; i++) {
				this.topologyRank[i] = i;
			}
		}
	}

	/**
	 * 计算单个属性值
	 */
	private computeAttributeValue(index: number): number {
		this.stats.computations++;

		// 获取修饰符值
		const staticFixed = this.modifierArrays[ModifierType.STATIC_FIXED][index];
		const staticPercentage = this.modifierArrays[ModifierType.STATIC_PERCENTAGE][index];
		const dynamicFixed = this.modifierArrays[ModifierType.DYNAMIC_FIXED][index];
		const dynamicPercentage = this.modifierArrays[ModifierType.DYNAMIC_PERCENTAGE][index];

		const totalPercentage = staticPercentage + dynamicPercentage;
		const totalFixed = staticFixed + dynamicFixed;

		// noBaseValue 属性：不做“基础值 * (1 + %)”的乘法，只对修正值做加法累加
		if (this.isNoBaseValue[index]) {
			const computationFn = this.computationFunctions.get(index);
			const baseValue = computationFn ? computationFn() : this.modifierArrays[ModifierType.BASE_VALUE][index];
			return baseValue + totalFixed + totalPercentage;
		}

		// 如果有计算函数，先计算基础值，然后应用修饰符
		const computationFn = this.computationFunctions.get(index);
		if (computationFn) {
			const baseValue = computationFn();
			return Math.floor(baseValue * (1 + totalPercentage / 100) + totalFixed);
		}

		// 否则使用标准计算（基于BASE_VALUE）
		const base = this.modifierArrays[ModifierType.BASE_VALUE][index];
		return Math.floor(base * (1 + totalPercentage / 100) + totalFixed);
	}

	/**
	 * 计算并提交属性值。
	 *
	 * 只负责写入缓存、清脏位、记录事件；事件派发由外层 drain 控制，
	 * 避免 listener 写回时重入完整刷新流程。
	 */
	private computeAndCommitAttribute(index: number, pending: PendingValueChange[]): number {
		const oldValue = this.values[index];
		const value = this.computeAttributeValue(index);
		this.values[index] = value;
		BitFlags.set(this.flags, index, AttributeFlags.IS_CACHED);
		this.clearDirty(index);
		this.queueValueChange(index, oldValue, value, pending);
		return value;
	}

	/**
	 * listener 内读取刚标脏的属性时，只重算该属性的依赖链。
	 *
	 * 该路径不处理下游依赖者；下游依赖者仍留在 dirtyList，交给外层同帧 drain 按拓扑序处理。
	 */
	private computeDirtyAttributeForRead(
		index: number,
		pending: PendingValueChange[],
		visiting: Set<number> = new Set(),
	): void {
		if (!this.isDirty(index)) return;
		if (visiting.has(index)) {
			log.warn(`⚠️ 检测到递归读取 ${this.indexToKey[index]}，跳过按需重算`);
			return;
		}

		visiting.add(index);
		for (const dependency of this.dependencyGraph.getDependencies(index)) {
			if (this.isDirty(dependency)) {
				this.computeDirtyAttributeForRead(dependency, pending, visiting);
			}
		}
		visiting.delete(index);

		if (this.isDirty(index)) {
			this.computeAndCommitAttribute(index, pending);
		}
	}

	/**
	 * 取出当前脏批次并按拓扑 rank 排序。
	 *
	 * dirtyList 被清空后，listener 写回会追加到下一批；当前批次中被按需读取提前清掉的 index 会在计算时跳过。
	 */
	private drainDirtyBatchByTopologyRank(): number[] {
		const batch = this.dirtyList;
		this.dirtyList = [];
		batch.sort((a, b) => {
			const rankDiff = this.topologyRank[a] - this.topologyRank[b];
			return rankDiff === 0 ? a - b : rankDiff;
		});
		return batch;
	}

	/**
	 * 计算一个脏批次。
	 */
	private computePass(batch: number[], pending: PendingValueChange[]): void {
		for (const index of batch) {
			if (!this.isDirty(index)) continue;
			this.computeAndCommitAttribute(index, pending);
		}
	}

	/**
	 * 批量更新脏值。
	 *
	 * 同帧定点迭代：计算当前脏批次，统一派发通知；通知写回的新脏值进入下一轮。
	 */
	private updateDirtyValues(): void {
		if (this.isFlushing) return;

		const startTime = performance.now();
		let pass = 0;

		this.isFlushing = true;
		try {
			while (this.dirtyList.length > 0 || this.pendingNotifications.length > 0) {
				if (++pass > this.maxFlushPasses) {
					this.reportDirtyOscillation(pass);
					break;
				}

				if (this.dirtyList.length > 0) {
					const batch = this.drainDirtyBatchByTopologyRank();
					this.computePass(batch, this.pendingNotifications);
				}

				if (this.pendingNotifications.length > 0) {
					const pending = this.pendingNotifications;
					this.pendingNotifications = [];
					this.fireValueChanges(pending);
				}
			}
		} finally {
			this.isFlushing = false;
			this.stats.lastUpdateTime = performance.now() - startTime;
			// 统计保留 lastUpdateTime；热路径不构造调试日志字符串。
		}
	}

	private reportDirtyOscillation(pass: number): void {
		const dirtyAttrs = this.collectDirtyAttributeNames();
		const pendingAttrs = this.pendingNotifications.map((change) => String(this.indexToKey[change.index]));
		log.error(`⚠️ StatContainer 刷新超过 ${this.maxFlushPasses} 轮，疑似监听器写回振荡`, {
			pass,
			dirtyAttrs,
			pendingAttrs,
		});
	}

	private collectDirtyAttributeNames(): string[] {
		const result: string[] = [];
		const seen = new Set<number>();
		for (const index of this.dirtyList) {
			if (seen.has(index) || !this.isDirty(index)) continue;
			seen.add(index);
			result.push(String(this.indexToKey[index]));
		}
		return result;
	}

	// ==================== 内部实现 - 脏值管理 ====================

	/**
	 * 标记属性为脏值（带依赖传播）
	 */
	private markDirty(index: number): void {
		if (this.isDirty(index)) return;

		const queue: number[] = [index];
		const visited = new Set<number>();
		let head = 0;
		while (head < queue.length) {
			const current = queue[head++];
			if (visited.has(current)) continue;
			visited.add(current);

			if (!this.setDirty(current)) continue;

			const dependents = this.dependencyGraph.getDependents(current);
			for (const dep of dependents) {
				if (!visited.has(dep)) queue.push(dep);
			}
		}
	}

	/**
	 * 设置单个脏位并入队。
	 *
	 * 位图是去重来源；dirtyList 是刷新迭代来源。二者一起维护，避免刷新阶段扫描整张 schema。
	 */
	private setDirty(index: number): boolean {
		if (this.isDirty(index)) return false;

		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		this.dirtyBitmap[arrayIndex] |= 1 << bitIndex;
		BitFlags.clear(this.flags, index, AttributeFlags.IS_CACHED);
		this.dirtyList.push(index);
		return true;
	}

	/**
	 * 清除脏值标记
	 */
	private clearDirty(index: number): void {
		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		this.dirtyBitmap[arrayIndex] &= ~(1 << bitIndex);
		// dirtyList 以批次 drain；清位时不做数组删除，避免热路径 O(n) 搬移。
	}

	/**
	 * 检查是否为脏值
	 */
	private isDirty(index: number): boolean {
		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		return (this.dirtyBitmap[arrayIndex] & (1 << bitIndex)) !== 0;
	}

	/**
	 * 检查是否有脏值需要更新
	 */
	private hasDirtyValues(): boolean {
		return this.dirtyList.length > 0;
	}

	/**
	 * 标记所有属性为脏值
	 */
	private markAllDirty(): void {
		this.dirtyBitmap.fill(0);
		this.dirtyList = [];
		for (let i = 0; i < this.values.length; i++) {
			this.setDirty(i);
		}
	}

	/**
	 * 从 checkpoint 的 dirtyBitmap 重建 dirtyList。
	 *
	 * checkpoint 持久化位图；dirtyList 是运行时迭代索引，restore 后必须从位图恢复。
	 */
	private rebuildDirtyListFromBitmap(): void {
		this.dirtyList = [];
		for (let i = 0; i < this.values.length; i++) {
			if (this.isDirty(i)) this.dirtyList.push(i);
		}
	}

	// ==================== 调试和统计 ====================

	/**
	 * 获取统计信息
	 */
	getStats() {
		return {
			...this.stats,
			totalAttributes: this.values.length,
			memoryUsage: {
				values: this.values.byteLength,
				flags: this.flags.byteLength,
				modifiers: this.modifierArrays.reduce((sum, arr) => sum + arr.byteLength, 0),
				total:
					this.values.byteLength +
					this.flags.byteLength +
					this.modifierArrays.reduce((sum, arr) => sum + arr.byteLength, 0),
			},
		};
	}

	/**
	 * 重置统计信息
	 */
	resetStats(): void {
		this.stats.computations = 0;
		this.stats.cacheHits = 0;
		this.stats.cacheMisses = 0;
		this.stats.lastUpdateTime = 0;
		this.stats.batchUpdates = 0;
	}

	/**
	 * 获取调试信息
	 */
	getDebugInfo(): Record<string, unknown> {
		const result: Record<string, unknown> = {};

		for (let i = 0; i < this.indexToKey.length; i++) {
			const key = this.indexToKey[i];
			result[key] = {
				value: this.values[i],
				isDirty: this.isDirty(i),
				isCached: BitFlags.has(this.flags, i, AttributeFlags.IS_CACHED),
				hasComputation: BitFlags.has(this.flags, i, AttributeFlags.HAS_COMPUTATION),
				dependencies: Array.from(this.dependencyGraph.getDependencies(i)).map((idx) => this.indexToKey[idx]),
				dependents: Array.from(this.dependencyGraph.getDependents(i)).map((idx) => this.indexToKey[idx]),
				modifiers: {
					base: this.modifierArrays[ModifierType.BASE_VALUE][i],
					staticFixed: this.modifierArrays[ModifierType.STATIC_FIXED][i],
					staticPercentage: this.modifierArrays[ModifierType.STATIC_PERCENTAGE][i],
					dynamicFixed: this.modifierArrays[ModifierType.DYNAMIC_FIXED][i],
					dynamicPercentage: this.modifierArrays[ModifierType.DYNAMIC_PERCENTAGE][i],
				},
			};
		}

		return result;
	}

	/**
	 * 获取依赖图信息（用于调试）
	 */
	getDependencyGraphInfo(): Record<string, string[]> {
		// 使用依赖图提供的导出方法，避免在此类中重复图遍历逻辑
		const raw = this.dependencyGraph.toDependentsObject();
		const result: Record<string, string[]> = {};
		for (const [idxStr, arr] of Object.entries(raw)) {
			const i = Number(idxStr);
			result[this.indexToKey[i]] = arr.map((j) => this.indexToKey[j]);
		}
		return result;
	}

	/**
	 * 输出响应式系统的依赖关系图
	 * 用于调试和理解属性之间的依赖关系
	 *
	 * @param memberName 成员名称
	 * @param memberType 成员类型
	 */
	outputDependencyGraph(memberName: string, memberType: string): void {
		log.debug(`\n📊 === ${memberType} 响应式系统依赖关系图 ===`);
		log.debug(`🏷️  成员: ${memberName} (${memberType})`);
		log.debug(`📦 属性总数: ${this.indexToKey.length}`);

		// 分类属性
		const baseAttrs: string[] = [];
		const computedAttrs: string[] = [];
		const dependencyMap = new Map<string, string[]>();

		for (let i = 0; i < this.indexToKey.length; i++) {
			const attrKey = this.indexToKey[i];
			const isBase = BitFlags.has(this.flags, i, AttributeFlags.IS_BASE);

			if (isBase) {
				baseAttrs.push(attrKey);
			} else {
				computedAttrs.push(attrKey);
				// 获取该属性的依赖关系
				const dependencies = Array.from(this.dependencyGraph.getDependencies(i));
				const depNames = dependencies.map((depIndex) => this.indexToKey[depIndex]);
				dependencyMap.set(attrKey, depNames);
			}
		}

		// 获取当前所有属性值
		const currentValues = this.getValues(this.indexToKey as T[]);

		// 输出基础属性
		log.debug(`\n🔹 基础属性 (${baseAttrs.length}):`);
		baseAttrs.sort().forEach((attr) => {
			const value = currentValues[attr as T];
			log.debug(`  📌 ${attr}: ${value}`);
		});

		// 输出计算属性及其依赖
		log.debug(`\n🔸 计算属性 (${computedAttrs.length}):`);
		computedAttrs.sort().forEach((attr) => {
			const value = currentValues[attr as T];
			const deps = dependencyMap.get(attr) || [];

			log.debug(`  🧮 ${attr}: ${value}`);
			if (deps.length > 0) {
				log.debug(`     🔗 依赖: ${deps.join(", ")}`);
			}
			log.debug("");
		});

		// 输出依赖关系统计
		const totalDeps = Array.from(dependencyMap.values()).reduce((sum, deps) => sum + deps.length, 0);
		const avgComplexity = computedAttrs.length > 0 ? totalDeps / computedAttrs.length : 0;

		log.debug(`📈 依赖关系统计:`);
		log.debug(`   • 基础属性: ${baseAttrs.length}`);
		log.debug(`   • 计算属性: ${computedAttrs.length}`);
		log.debug(`   • 依赖关系: ${totalDeps}`);
		log.debug(`   • 复杂度: ${avgComplexity.toFixed(2)} (平均每个计算属性的依赖数)`);

		// 如果有循环依赖，输出警告
		const hasCycles = this.dependencyGraph.detectCycles();
		if (hasCycles.length > 0) {
			log.warn(`\n⚠️  检测到循环依赖:`);
			hasCycles.forEach((cycle, index) => {
				const cycleNames = cycle.map((idx) => this.indexToKey[idx]);
				log.warn(`   ${index + 1}. ${cycleNames.join(" → ")} → ${cycleNames[0]}`);
			});
		}

		log.debug(`\n🎯 === 依赖关系图输出完成 ===\n`);
	}

	// ==================== Checkpoint / Restore ====================

	captureCheckpoint(): StatContainerCheckpoint {
		const modifierSources: StatContainerCheckpoint["modifierSources"] = [];
		for (const [modifierType, perType] of this.modifierSources) {
			const entries: StatContainerCheckpoint["modifierSources"][number]["entries"] = [];
			for (const [attrIndex, perAttr] of perType) {
				const sources: Array<{ sourceId: string; value: number }> = [];
				for (const [sourceId, value] of perAttr) {
					sources.push({ sourceId, value });
				}
				entries.push({ attrIndex, sources });
			}
			modifierSources.push({ modifierType, entries });
		}

		return {
			values: this.values.slice(),
			flags: this.flags.slice(),
			dirtyBitmap: this.dirtyBitmap.slice(),
			modifierArrays: this.modifierArrays.map((arr) => arr.slice()),
			modifierSources,
		};
	}

	restoreCheckpoint(checkpoint: StatContainerCheckpoint): void {
		this.values.set(checkpoint.values);
		this.flags.set(checkpoint.flags);
		this.dirtyBitmap.set(checkpoint.dirtyBitmap);
		this.rebuildDirtyListFromBitmap();
		this.pendingNotifications = [];
		this.isFlushing = false;
		// checkpoint 里的值视为"过去已经观测过"。此后再变化才广播 onChange，
		// 避免回放时把 restore 后的"首次计算"误报成变更事件。
		this.hasObserved.fill(0xffffffff);
		for (let i = 0; i < this.modifierArrays.length; i++) {
			this.modifierArrays[i].set(checkpoint.modifierArrays[i]);
		}

		this.modifierSources.clear();
		this.sourceIndex.clear();

		const keyCount = this.values.length;
		for (const { modifierType, entries } of checkpoint.modifierSources) {
			const perType = new Map<number, Map<string, number>>();
			this.modifierSources.set(modifierType as ModifierType, perType);
			for (const { attrIndex, sources } of entries) {
				const perAttr = new Map<string, number>();
				perType.set(attrIndex, perAttr);
				for (const { sourceId, value } of sources) {
					perAttr.set(sourceId, value);
					const entryKey = modifierType * keyCount + attrIndex;
					let set = this.sourceIndex.get(sourceId);
					if (!set) {
						set = new Set();
						this.sourceIndex.set(sourceId, set);
					}
					set.add(entryKey);
				}
			}
		}

		this.isComputing.clear();
	}
}
