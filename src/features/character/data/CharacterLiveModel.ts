import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { waitFor } from "~/lib/bootstrap/context-standalone";
import { waitForElectricTables } from "~/lib/bootstrap/electricReadiness";
import {
	createKyselyLiveQuerySource,
	type LiveQuerySource,
	type LiveQuerySubscription,
} from "~/lib/pglite/kyselyLiveQuerySource";
import type { LiveQueryStatus } from "~/lib/pglite/liveQuery";
import {
	type CharacterAggregateIdentity,
	type CharacterLiveAggregate,
	characterAggregateSignature,
	parseCharacterAggregateRows,
	selectCharacterAggregateQuery,
} from "./characterAggregateQuery";

export type CharacterLiveSnapshot = {
	identity: CharacterAggregateIdentity;
	status: LiveQueryStatus;
	aggregate: CharacterLiveAggregate | null;
	aggregateRevision: number;
	error: Error | undefined;
};

// Character 聚合查询展开的同步表。已有本地行时不会等待；只有空结果需要这组门闩确认“确实不存在”。
const CHARACTER_AGGREGATE_SYNC_TABLES = [
	"player",
	"item",
	"weapon",
	"armor",
	"option",
	"special",
	"avatar",
	"_avatarTocharacter",
	"crystal",
	"_crystalToplayer_weapon",
	"_crystalToplayer_armor",
	"_crystalToplayer_option",
	"_crystalToplayer_special",
	"skill",
	"skill_variant",
	"behavior_tree",
	"player_weapon",
	"player_armor",
	"player_option",
	"player_special",
	"character_skill",
	"registlet",
	"character_registlet",
	"consumable",
	"_characterToconsumable",
	"combo",
	"combo_step",
	"character",
] as const satisfies readonly (keyof DB)[];

const initialSnapshot = (identity: CharacterAggregateIdentity): CharacterLiveSnapshot => ({
	identity,
	status: "idle",
	aggregate: null,
	aggregateRevision: 0,
	error: undefined,
});

/**
 * 当前正式 Character 的唯一响应式持久读模型。
 * 它直接投影一条本地 PGlite live subscription，不编排连接恢复或维护第二份领域副本。
 */
export class CharacterLiveModel<TSource = unknown> {
	private snapshot: CharacterLiveSnapshot;
	private signature = characterAggregateSignature(null);
	private readonly listeners = new Set<(snapshot: CharacterLiveSnapshot) => void>();
	private subscription: LiveQuerySubscription<TSource> | null = null;
	private generation = 0;
	private started = false;

	constructor(
		readonly identity: CharacterAggregateIdentity,
		private readonly createSource: () => Promise<LiveQuerySource<TSource>>,
		private readonly parseRows: (rows: readonly TSource[]) => CharacterLiveAggregate | null,
	) {
		this.snapshot = initialSnapshot(identity);
	}

	getSnapshot(): CharacterLiveSnapshot {
		return this.snapshot;
	}

	subscribe(listener: (snapshot: CharacterLiveSnapshot) => void): () => void {
		this.listeners.add(listener);
		listener(this.snapshot);
		return () => this.listeners.delete(listener);
	}

	start(): void {
		if (this.started) return;
		this.started = true;
		const generation = ++this.generation;
		this.snapshot = { ...this.snapshot, status: "loading", error: undefined };
		this.emit();
		void this.connect(generation);
	}

	async stop(): Promise<void> {
		if (!this.started && this.snapshot.status === "idle") return;
		this.started = false;
		this.generation += 1;
		const subscription = this.subscription;
		this.subscription = null;
		if (subscription) await subscription.unsubscribe().catch(() => undefined);
		this.signature = characterAggregateSignature(null);
		this.snapshot = initialSnapshot(this.identity);
		this.emit();
	}

	private async connect(generation: number): Promise<void> {
		try {
			const source = await this.createSource();
			if (!this.isCurrent(generation)) return;
			const subscription = await source.subscribe((rows) => {
				if (this.isCurrent(generation)) this.projectRows(rows);
			});
			if (!this.isCurrent(generation)) {
				await subscription.unsubscribe().catch(() => undefined);
				return;
			}
			this.subscription = subscription;
			this.projectRows(subscription.initialRows);
		} catch (cause) {
			if (!this.isCurrent(generation)) return;
			this.snapshot = {
				...this.snapshot,
				status: "error",
				error: cause instanceof Error ? cause : new Error(String(cause)),
			};
			this.emit();
		}
	}

	private projectRows(rows: readonly TSource[]): void {
		try {
			const candidate = this.parseRows(rows);
			const signature = characterAggregateSignature(candidate);
			const changed = signature !== this.signature;
			if (changed) this.signature = signature;
			this.snapshot = {
				identity: this.identity,
				status: "ready",
				aggregate: changed ? candidate : this.snapshot.aggregate,
				aggregateRevision: changed ? this.snapshot.aggregateRevision + 1 : this.snapshot.aggregateRevision,
				error: undefined,
			};
		} catch (cause) {
			this.snapshot = {
				...this.snapshot,
				status: "error",
				error: cause instanceof Error ? cause : new Error(String(cause)),
			};
		}
		this.emit();
	}

	private emit(): void {
		for (const listener of this.listeners) listener(this.snapshot);
	}

	private isCurrent(generation: number): boolean {
		return this.started && this.generation === generation;
	}
}

/** 构造生产 CharacterLiveModel；查询编译、初始同步门闩和订阅只在这个数据边界内装配。 */
export function createCharacterLiveModel(identity: CharacterAggregateIdentity): CharacterLiveModel {
	return new CharacterLiveModel<unknown>(
		identity,
		async () => {
			await waitFor("pgworker");
			const db = await getDB();
			const compiled = selectCharacterAggregateQuery(db, identity).compile();
			const source = await createKyselyLiveQuerySource<DB, unknown>(db, compiled);
			// 持久缓存已有 Character 时立即订阅；空缓存必须等相关 shape 首轮完成，避免暂时空库触发 not-found。
			if ((await source.execute()).length === 0) await waitForElectricTables(CHARACTER_AGGREGATE_SYNC_TABLES);
			return source;
		},
		parseCharacterAggregateRows,
	);
}
