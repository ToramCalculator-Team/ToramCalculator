import { createLogger } from "~/lib/Logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { BtManagerCheckpoint, Checkpointable } from "../../../../types";
import type { Member } from "../../Member";
import type { BtContext } from "../Agent/BtContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";

const log = createLogger("BtManager");

type BtEntry = {
	bt: BehaviourTree;
	btContext: BtContext & Record<string, unknown>;
};

export class BtManager<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> implements Checkpointable<BtManagerCheckpoint>
{
	private activeEffectEntry: BtEntry | undefined;
	private parallelEntries: Map<string, BtEntry> = new Map();

	constructor(
		private owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntime>,
		/**
		 * BT-only callable bindings.
		 * Purpose: keep BT actions / conditions out of the public member context contract.
		 */
		private readonly btBindings: Record<string, unknown> = {},
	) {}

	/**
	 * Build a BT-private context.
	 *
	 * 分层顺序（原型链由近到远）：
	 * 1. user agent 实例字段/方法（最近，若有）
	 * 2. BT bindings（action/condition invokers）
	 * 3. owner 句柄（用于 BT 动作内通过 `this.owner` 访问 member 服务）
	 * 4. member.runtime 作为共享只读面（BT 直接消费 $currentFrame / $currentSkill / $targetId 等）
	 *
	 * 说明：
	 * - runtime 已是扁平结构（含 currentSkill* / currentSkillStartupFrames 等），无需再做 get/set 映射。
	 * - FSM 是 runtime 的唯一写入方；BT 仅读取。
	 */
	private buildBtContext(agent?: string): BtContext & Record<string, unknown> {
		const owner = this.owner;
		const runtime = owner.runtime as unknown as Record<string, unknown>;

		// 以 runtime 作为原型：BT 通过原型链直读 runtime 字段，且写入会落在 btContext 自身（不污染 runtime）。
		const btContext = Object.create(runtime) as Record<string, unknown>;

		Object.defineProperty(btContext, "owner", {
			value: owner,
			enumerable: true,
			configurable: true,
		});

		Object.defineProperties(btContext, Object.getOwnPropertyDescriptors(this.btBindings));

		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		if (!agent) {
			return btContext as BtContext & Record<string, unknown>;
		}

		let AgentClass: AgentCtor;
		try {
			const agentClassCreator = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as unknown as (
				bt: typeof BehaviourTree,
				state: typeof State,
				owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntime>,
			) => AgentCtor;

			AgentClass = agentClassCreator(BehaviourTree, State, this.owner);
		} catch (error) {
			log.warn(
				`[${this.owner.name}] failed to compile BT agent: ${error instanceof Error ? error.message : String(error)}`,
			);
			return btContext as BtContext & Record<string, unknown>;
		}

		let instance: AgentInstance;
		try {
			instance = new AgentClass();
		} catch (error) {
			log.warn(
				`[${this.owner.name}] failed to initialize BT agent: ${error instanceof Error ? error.message : String(error)}`,
			);
			return btContext as BtContext & Record<string, unknown>;
		}

		const registerProperty = (name: string, descriptor: PropertyDescriptor): void => {
			if (!name || name === "constructor") return;

			const memberSlotExists =
				Object.hasOwn(runtime, name) || !!Object.getOwnPropertyDescriptor(runtime, name);
			const btSlotExists = Object.hasOwn(btContext, name) || !!Object.getOwnPropertyDescriptor(btContext, name);

			if (memberSlotExists || btSlotExists) {
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

		return btContext as BtContext & Record<string, unknown>;
	}

	tickAll(): void {
		if (this.activeEffectEntry) {
			const state = this.activeEffectEntry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.activeEffectEntry = undefined;
				this.owner.actor.send({ type: "技能执行完成" } as TStateEvent);
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
		const bt = new BehaviourTree(definition, btContext);
		this.activeEffectEntry = { bt, btContext };
		return bt;
	}

	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const btContext = this.buildBtContext(agent?.trim());
		const bt = new BehaviourTree(definition, btContext);
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
