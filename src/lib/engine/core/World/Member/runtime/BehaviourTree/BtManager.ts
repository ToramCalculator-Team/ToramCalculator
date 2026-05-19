import { createLogger } from "~/lib/Logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { BtManagerCheckpoint, Checkpointable } from "../../../../types";
import type { MemberBtEnv } from "../Agent/BtContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import { createBtContext } from "./BtContextFactory";

const log = createLogger("BtManager");

type BtOptions = {
	random?: () => number;
	getDeltaTimeMs?: () => number;
};

type BtEntry = {
	bt: BehaviourTree;
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
	private btOptions: BtOptions = {};

	constructor(
		private owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
		/**
		 * BT-only callable bindings.
		 * Purpose: keep BT actions / conditions out of the public member context contract.
		 */
		private readonly btBindings: Record<string, unknown> = {},
	) {}

	setRandom(randomFn: () => number): void {
		this.btOptions = { ...this.btOptions, random: randomFn };
	}

	private createBtOptions(): BtOptions {
		return {
			...this.btOptions,
			getDeltaTimeMs: () => this.owner.runtime.deltaTimeMs,
		};
	}

	private buildBtContext(agent?: string): Record<string, unknown> {
		const { context } = createBtContext({
			owner: this.owner,
			btBindings: this.btBindings,
			agent,
			onWarning: (warning) => log.warn(warning.message),
		});
		return context;
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
		const bt = new BehaviourTree(definition, btContext, this.createBtOptions());
		this.activeEffectEntry = { bt };
		return bt;
	}

	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const btContext = this.buildBtContext(agent?.trim());
		const bt = new BehaviourTree(definition, btContext, this.createBtOptions());
		this.parallelEntries.set(name, { bt });
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

	/** 供引擎停止策略判断成员技能生命周期，避免外部读取 activeEffectEntry 私有结构。 */
	hasActiveEffectBt(): boolean {
		return !!this.activeEffectEntry;
	}

	hasBuff(name: string): boolean {
		return this.parallelEntries.has(name);
	}

	clear(): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
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
			});
		}

		const active = this.activeEffectEntry;
		if (!active) {
			return { hasActiveEffect: false, parallelEntries };
		}

		return {
			hasActiveEffect: true,
			activeEffectBtId: this.deriveBtId(active.bt),
			parallelEntries,
		};
	}

	restoreCheckpoint(_checkpoint: BtManagerCheckpoint): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
	}
}
