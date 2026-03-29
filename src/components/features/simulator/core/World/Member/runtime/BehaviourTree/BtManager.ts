import { createLogger } from "~/lib/Logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { BtManagerCheckpoint, Checkpointable } from "../../../../types";
import type { Member } from "../../Member";
import type { MemberContext } from "../../MemberContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";

const log = createLogger("BtManager");

type BtEntry = {
	bt: BehaviourTree;
	btContext: Record<string, unknown>;
};

export class BtManager<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TContext extends MemberContext & Record<string, unknown> = MemberContext & Record<string, unknown>,
> implements Checkpointable<BtManagerCheckpoint>
{
	private activeEffectEntry: BtEntry | undefined;
	private parallelEntries: Map<string, BtEntry> = new Map();

	constructor(
		private owner: Member<TAttrKey, TStateEvent, TStateContext, TContext>,
		/**
		 * BT-only callable bindings.
		 * Purpose: keep BT actions / conditions out of the public member context contract.
		 */
		private readonly btBindings: Record<string, unknown> = {},
	) {}

	/**
	 * Build a BT-private context.
	 * Layering order:
	 * 1. member.context as the shared public runtime surface
	 * 2. BT bindings such as action/condition invokers
	 * 3. user-supplied skill agent fields/getters/methods
	 */
	private buildBtContext(agent?: string): Record<string, unknown> {
		const memberContext = this.owner.context;
		const btContext = Object.create(memberContext) as Record<string, unknown>;
		Object.defineProperties(btContext, Object.getOwnPropertyDescriptors(this.btBindings));

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
				owner: Member<TAttrKey, TStateEvent, TStateContext, TContext>,
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

			const memberSlotExists =
				Object.hasOwn(memberContext, name) || !!Object.getOwnPropertyDescriptor(memberContext, name);
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

		return btContext;
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
