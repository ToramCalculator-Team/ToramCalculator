/**
 * 事件目录（扁平注册表）。
 *
 * 与 `PipelineCatalog` / `AttributeSchema` 地位对称：引擎初始化时一次性构建并冻结；
 * 定义引擎里所有**可订阅事件类型**的位索引、payload schema 与描述。
 *
 * 设计要点：
 * - 扁平：不提供 overlay 式层叠扩展。事件的扩展发生在订阅侧（新增 subscriber），
 *   或在计算层的 `emit` 算子（向已有事件派发）。新增事件类型须在此目录注册。
 * - 位索引：基于 `TagRegistry` 同种算法——对事件名字符串排序后分配稳定 bit，
 *   跨启动稳定（checkpoint 回放必要条件）。
 * - payload 形状：Zod schema。事件派发侧与订阅侧都可用它做校验；本版只存不校验，
 *   校验开关可在开发模式打开。
 */

import type { z } from "zod/v4";

/**
 * 事件定义。
 */
export interface EventDefinition {
	/** 事件名（唯一 key，建议 dot-namespace：`status.entered` / `damage.received`）。 */
	name: string;
	/** payload 的 Zod schema。实际派发的 payload 形状。 */
	payloadSchema: z.ZodTypeAny;
	/** 调试描述。 */
	description: string;
}

/**
 * 扁平事件目录。构造后只读。
 */
export class EventCatalog {
	public readonly size: number;
	private readonly byName: ReadonlyMap<string, EventDefinition>;
	private readonly bitByName: ReadonlyMap<string, number>;
	private readonly nameByBit: readonly string[];

	constructor(defs: readonly EventDefinition[]) {
		const deduped = new Map<string, EventDefinition>();
		for (const def of defs) {
			if (deduped.has(def.name)) {
				throw new Error(`EventCatalog: 事件名重复 "${def.name}"`);
			}
			deduped.set(def.name, def);
		}

		// 排序后分配 bit，保证跨启动稳定（同 TagRegistry）
		const sortedNames = [...deduped.keys()].sort();
		const bitByName = new Map<string, number>();
		sortedNames.forEach((name, index) => {
			bitByName.set(name, index);
		});

		this.byName = deduped;
		this.bitByName = bitByName;
		this.nameByBit = Object.freeze(sortedNames);
		this.size = sortedNames.length;
		Object.freeze(this);
	}

	/** 取事件定义；未注册则返回 undefined（调用方自行处理）。 */
	get(name: string): EventDefinition | undefined {
		return this.byName.get(name);
	}

	/** 取事件的 bit 索引；未注册抛错（避免 proc mask 悄无声息失效）。 */
	getBit(name: string): number {
		const bit = this.bitByName.get(name);
		if (bit === undefined) {
			throw new Error(`EventCatalog: 未注册的事件 "${name}"`);
		}
		return bit;
	}

	/** 根据一组事件名合成 proc mask。 */
	getMask(names: Iterable<string>): bigint {
		let mask = 0n;
		for (const name of names) {
			mask |= 1n << BigInt(this.getBit(name));
		}
		return mask;
	}

	/** 反查某 bit 对应的事件名（调试 / 日志用）。 */
	getName(bit: number): string | undefined {
		return this.nameByBit[bit];
	}

	/** 列出 mask 包含的所有事件名。 */
	listNames(mask: bigint): string[] {
		const result: string[] = [];
		for (let i = 0; i < this.nameByBit.length; i++) {
			if ((mask & (1n << BigInt(i))) !== 0n) {
				result.push(this.nameByBit[i]);
			}
		}
		return result;
	}
}
