import { createLogger } from "~/lib/Logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { BtManagerCheckpoint, Checkpointable } from "../../../../types";
import type { BtContext, MemberBtEnv } from "../Agent/BtContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";

const log = createLogger("BtManager");

type BtEntry<
	TAttrKey extends string = string,
	TStateEvent extends MemberEventType = MemberEventType,
	TStateContext extends MemberStateContext = MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> = {
	bt: BehaviourTree;
	btContext: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>;
};

export class BtManager<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> implements Checkpointable<BtManagerCheckpoint>
{
	private activeEffectEntry: BtEntry<TAttrKey, TStateEvent, TStateContext, TRuntime> | undefined;
	private parallelEntries: Map<string, BtEntry<TAttrKey, TStateEvent, TStateContext, TRuntime>> = new Map();
	private btOptions: { random?: () => number } = {};

	constructor(
		private owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
		/**
		 * BT-only callable bindings.
		 * Purpose: keep BT actions / conditions out of the public member context contract.
		 */
		private readonly btBindings: Record<string, unknown> = {},
	) {}

	setRandom(randomFn: () => number): void {
		this.btOptions = { random: randomFn };
	}

	/**
	 * Build a BT-private context.
	 *
	 * 可访问槽：
	 * 1. user agent 实例字段/方法（若有）
	 * 2. BT bindings（action/condition invokers）
	 * 3. owner 句柄（BT 专用 env，用于动作内通过 `this.owner` 访问成员能力）
	 * 4. member.runtime 只读 getter（BT 直接消费 $currentFrame / $currentSkill / $targetId 等）
	 *
	 * 说明：
	 * - runtime 字段保持扁平命名，getter 每次读取 owner.runtime 的当前值。
	 * - FSM 是 runtime 的唯一写入方；BT 仅读取。
	 */
	private buildBtContext(
		agent?: string,
	): BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown> {
		const runtime = this.owner.runtime as unknown as Record<string, unknown>;
		const btContext = {} as BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>;

		this.defineRuntimeReadSlots(btContext, runtime);

		Object.defineProperty(btContext, "runtime", {
			get: () => this.owner.runtime,
			enumerable: false,
			configurable: false,
		});

		Object.defineProperty(btContext, "owner", {
			get: () => this.owner,
			enumerable: false,
			configurable: false,
		});

		this.defineBtBindings(btContext);

		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		if (!agent) {
			return btContext;
		}

		let AgentClass: AgentCtor;
		try {
			const agentClassCreator = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as unknown as (
				bt: typeof BehaviourTree,
				state: typeof State,
				owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
			) => AgentCtor;

			AgentClass = agentClassCreator(BehaviourTree, State, this.owner);
		} catch (error) {
			log.warn(
				`[${this.owner.name}] failed to compile BT agent: ${error instanceof Error ? error.message : String(error)}`,
			);
			return btContext;
		}

		let instance: AgentInstance;
		try {
			instance = new AgentClass();
		} catch (error) {
			log.warn(
				`[${this.owner.name}] failed to initialize BT agent: ${error instanceof Error ? error.message : String(error)}`,
			);
			return btContext;
		}

		const registerProperty = (name: string, descriptor: PropertyDescriptor): void => {
			if (!name || name === "constructor") return;

			const runtimeSlotExists =
				Object.hasOwn(this.owner.runtime as unknown as Record<string, unknown>, name) ||
				!!Object.getOwnPropertyDescriptor(this.owner.runtime as unknown as Record<string, unknown>, name);
			const btSlotExists = Object.hasOwn(btContext, name) || !!Object.getOwnPropertyDescriptor(btContext, name);

			if (runtimeSlotExists || btSlotExists) {
				log.warn(`[${this.owner.name}] skipped BT agent member "${name}" because the slot already exists`);
				return;
			}

			Object.defineProperty(btContext, name, {
				...descriptor,
				configurable: true,
			});
		};

		for (const key of Object.getOwnPropertyNames(instance)) {
			const descriptor = Object.getOwnPropertyDescriptor(instance, key);
			if (descriptor) {
				registerProperty(key, descriptor);
			}
		}

		const proto = AgentClass.prototype as object;
		for (const key of Object.getOwnPropertyNames(proto)) {
			if (key === "constructor") continue;
			const descriptor = Object.getOwnPropertyDescriptor(proto, key);
			if (descriptor) {
				registerProperty(key, descriptor);
			}
		}

		return btContext;
	}

	/**
	 * 把 runtime 字段投影成 BT context 上的只读槽。
	 * 目的：保留 `$currentFrame` 这类扁平引用，同时阻止 BT 写出 shadow runtime 值。
	 */
	private defineRuntimeReadSlots(
		btContext: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>,
		runtime: Record<string, unknown>,
	): void {
		for (const key of Object.keys(runtime)) {
			Object.defineProperty(btContext, key, {
				get: () => (this.owner.runtime as unknown as Record<string, unknown>)[key],
				set: () => {
					throw new Error(`[${this.owner.name}] BT runtime field is read-only: ${key}`);
				},
				enumerable: false,
				configurable: false,
			});
		}
	}

	private defineBtBindings(
		btContext: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>,
	): void {
		for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(this.btBindings))) {
			if (Object.hasOwn(btContext, name) || !!Object.getOwnPropertyDescriptor(btContext, name)) {
				log.warn(`[${this.owner.name}] skipped BT binding "${name}" because the slot already exists`);
				continue;
			}
			Object.defineProperty(btContext, name, {
				...descriptor,
				configurable: true,
			});
		}
	}

	tickAll(): void {
		if (this.activeEffectEntry) {
			const state = this.activeEffectEntry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.activeEffectEntry = undefined;
				this.owner.send({ type: "技能执行完成" } as TStateEvent);
			} else {
				this.activeEffectEntry.bt.step();
			}
		}

		this.parallelEntries.forEach((entry, name) => {
			const state = entry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.parallelEntries.delete(name);
			} else {
				entry.bt.step();
			}
		});
	}

	registerActiveEffectBt(
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const btContext = this.buildBtContext(agent?.trim());
		const bt = new BehaviourTree(definition, btContext, this.btOptions);
		this.activeEffectEntry = { bt, btContext };
		return bt;
	}

	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const btContext = this.buildBtContext(agent?.trim());
		const bt = new BehaviourTree(definition, btContext, this.btOptions);
		this.parallelEntries.set(name, { bt, btContext });
		return bt;
	}

	unregisterActiveEffectBt(): void {
		this.activeEffectEntry = undefined;
	}

	unregisterParallelBt(name: string): void {
		this.parallelEntries.delete(name);
	}

	getParallelBt(name: string): BehaviourTree | undefined {
		return this.parallelEntries.get(name)?.bt;
	}

	getActiveEffectBt(): BehaviourTree | undefined {
		return this.activeEffectEntry?.bt;
	}

	hasBuff(name: string): boolean {
		return this.parallelEntries.has(name);
	}

	clear(): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
	}

	/**
	 * Shallow snapshot of BT context own properties; skips functions (not postMessage-safe).
	 */
	private snapshotBtContext(ctx: Record<string, unknown>): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(ctx)) {
			const v = ctx[key];
			if (typeof v === "function") continue;
			out[key] = v;
		}
		return out;
	}

	private deriveBtId(bt: BehaviourTree): string {
		try {
			const id = bt.getTreeNodeDetails()?.id;
			if (typeof id === "string" && id.length > 0) return id;
		} catch {
			// mistreevous may throw on malformed trees
		}
		return "<unknown>";
	}

	captureCheckpoint(): BtManagerCheckpoint {
		const parallelEntries: BtManagerCheckpoint["parallelEntries"] = [];
		for (const [name, entry] of this.parallelEntries) {
			parallelEntries.push({
				name,
				btId: this.deriveBtId(entry.bt),
				context: this.snapshotBtContext(entry.btContext),
			});
		}

		const active = this.activeEffectEntry;
		if (!active) {
			return { hasActiveEffect: false, parallelEntries };
		}

		return {
			hasActiveEffect: true,
			activeEffectBtId: this.deriveBtId(active.bt),
			activeEffectContext: this.snapshotBtContext(active.btContext),
			parallelEntries,
		};
	}

	restoreCheckpoint(_checkpoint: BtManagerCheckpoint): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
	}
}
