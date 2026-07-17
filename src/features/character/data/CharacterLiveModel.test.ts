import { defaultData } from "@db/defaultData";
import { CharacterWithRelationsSchema } from "@db/generated/repositories/character";
import { CharacterSchema, PlayerSchema } from "@db/generated/zod/index";
import { describe, expect, it, vi } from "vitest";
import type { LiveQuerySource, LiveQuerySubscription } from "~/lib/pglite/kyselyLiveQuerySource";
import { CharacterLiveModel } from "./CharacterLiveModel";
import type { CharacterLiveAggregate } from "./characterAggregateQuery";

const identity = { playerId: "player-1", characterId: "character-1" };

const createAggregate = (name: string): CharacterLiveAggregate => {
	const player = PlayerSchema.parse({ ...defaultData.player, id: identity.playerId });
	const character = CharacterWithRelationsSchema.parse({
		...defaultData.character,
		id: identity.characterId,
		name,
		belongToPlayerId: identity.playerId,
		weapon: null,
		subWeapon: null,
		armor: null,
		option: null,
		special: null,
		avatars: [],
		skills: [],
		registlets: [],
		consumables: [],
		combos: [],
		statistic: defaultData.statistic,
	});
	return {
		player,
		character,
		characters: [CharacterSchema.parse(character)],
		assets: {
			weapons: [],
			armors: [],
			options: [],
			specials: [],
			weaponsById: {},
			armorsById: {},
			optionsById: {},
			specialsById: {},
		},
		relations: { skillsById: {}, registletsById: {}, combosById: {}, consumablesById: {} },
	};
};

const parseAggregate = (rows: readonly (CharacterLiveAggregate | null)[]): CharacterLiveAggregate | null =>
	rows[0] ?? null;

class FakeLiveSource implements LiveQuerySource<CharacterLiveAggregate | null> {
	private listener: ((rows: readonly (CharacterLiveAggregate | null)[]) => void) | null = null;
	readonly unsubscribe = vi.fn(async () => {});

	constructor(private readonly initialRows: readonly (CharacterLiveAggregate | null)[]) {}

	readonly subscribe = vi.fn(
		async (
			listener: (rows: readonly (CharacterLiveAggregate | null)[]) => void,
		): Promise<LiveQuerySubscription<CharacterLiveAggregate | null>> => {
			this.listener = listener;
			return { initialRows: this.initialRows, unsubscribe: this.unsubscribe };
		},
	);

	readonly execute = vi.fn(async () => this.initialRows);

	emit(rows: readonly (CharacterLiveAggregate | null)[]): void {
		this.listener?.(rows);
	}
}

describe("CharacterLiveModel", () => {
	it("初始订阅完成后进入 ready", async () => {
		const source = new FakeLiveSource([createAggregate("Character A")]);
		const model = new CharacterLiveModel(identity, async () => source, parseAggregate);

		model.start();
		expect(model.getSnapshot()).toMatchObject({ status: "loading", aggregate: null, aggregateRevision: 0 });
		await vi.waitFor(() => expect(model.getSnapshot().status).toBe("ready"));
		expect(model.getSnapshot()).toMatchObject({ aggregateRevision: 1, error: undefined });
	});

	it("只在规范化聚合真实变化时推进 aggregateRevision", async () => {
		const firstAggregate = createAggregate("Character A");
		const source = new FakeLiveSource([firstAggregate]);
		const model = new CharacterLiveModel(identity, async () => source, parseAggregate);
		model.start();
		await vi.waitFor(() => expect(model.getSnapshot().status).toBe("ready"));
		const firstSnapshot = model.getSnapshot();

		source.emit([structuredClone(firstAggregate)]);
		expect(model.getSnapshot().aggregateRevision).toBe(1);
		expect(model.getSnapshot().aggregate).toBe(firstSnapshot.aggregate);

		source.emit([createAggregate("Character B")]);
		expect(model.getSnapshot()).toMatchObject({ aggregateRevision: 2, status: "ready" });
		expect(model.getSnapshot().aggregate?.character.name).toBe("Character B");
	});

	it("ready 空结果是有效聚合变化", async () => {
		const source = new FakeLiveSource([createAggregate("Character A")]);
		const model = new CharacterLiveModel(identity, async () => source, parseAggregate);
		model.start();
		await vi.waitFor(() => expect(model.getSnapshot().status).toBe("ready"));

		source.emit([]);
		expect(model.getSnapshot()).toMatchObject({ aggregate: null, aggregateRevision: 2, status: "ready" });

		await model.stop();
		expect(source.unsubscribe).toHaveBeenCalledOnce();
		expect(model.getSnapshot()).toMatchObject({ status: "idle", aggregate: null, aggregateRevision: 0 });
	});

	it("订阅初始化失败时直接暴露 error，不编排重连", async () => {
		const createSource = vi.fn(async (): Promise<LiveQuerySource<CharacterLiveAggregate | null>> => {
			throw new Error("subscription failed");
		});
		const model = new CharacterLiveModel(identity, createSource, parseAggregate);

		model.start();
		await vi.waitFor(() => expect(model.getSnapshot().status).toBe("error"));
		expect(model.getSnapshot().error?.message).toBe("subscription failed");
		expect(createSource).toHaveBeenCalledOnce();
	});
});
