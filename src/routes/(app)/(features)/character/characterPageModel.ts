/**
 * Character 页面数据流模型。
 *
 * 设计目的：
 * - 页面打开后，UI 以 pageData 工作副本为读写真相，避免复杂聚合查询和 live query 频繁重建角色页。
 * - 用户操作先同步修改工作副本，再把 DB 写入和引擎刷新作为副作用排队，保证输入反馈不被 I/O 或 Worker 计算阻塞。
 * - 每个 mutation 自带 applyLocal / rollbackLocal / persist，使乐观更新、事务提交、失败撤回使用同一份行为契约。
 * - 引擎只消费当前 revision 的角色快照，连续 patch 被 trailing debounce 合并，避免能力值连点时重复重建预览场景。
 *
 * 设计边界：
 * - createResource 只负责首次加载和 reload 校准，编辑中的状态由 createStore 工作副本承载。
 * - character 详情聚合不依赖 createLiveKyselyQuery；页面内的关系、资产缓存由命令统一维护。
 * - 叶子组件可以保留局部交互状态，但影响角色配置、DB、引擎的数据变更必须通过 dispatch(command) 进入本模型。
 */
import {
	type CharacterWithRelations,
	selectAllCharactersByBelongtoplayerid,
	updateCharacter,
} from "@db/generated/repositories/character";
import type { CharacterRegistletWithRelations } from "@db/generated/repositories/character_registlet";
import {
	type CharacterSkillWithRelations,
	deleteCharacterSkill,
	insertCharacterSkill,
	updateCharacterSkill,
} from "@db/generated/repositories/character_skill";
import type { ComboWithRelations } from "@db/generated/repositories/combo";
import type { ConsumableWithRelations } from "@db/generated/repositories/consumable";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MobWithRelations } from "@db/generated/repositories/mob";
import { type PlayerWithRelations, selectPlayerByIdWithRelations } from "@db/generated/repositories/player";
import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import type { Skill } from "@db/generated/repositories/skill";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import type { character, DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { Transaction } from "kysely";
import type { Accessor } from "solid-js";
import { createEffect, createMemo, createResource, on, onCleanup } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import type { EngineContextValue } from "~/lib/engine/core/thread/EngineContext";
import { createPreviewConfig, type EngineScenarioData } from "~/lib/engine/core/types";

// 设计说明：DB 写入比 UI 响应慢，150ms 用于合并拖动、连点、快速切换产生的同类写入。
const DB_DEBOUNCE_MS = 150;
// 设计说明：引擎预览重算成本更高，100ms trailing debounce 让 Worker 只处理最近一次稳定快照。
const ENGINE_SYNC_DEBOUNCE_MS = 100;

type PendingMutationState = {
	id: string;
	status: "pending" | "failed";
	error?: string;
};

type CharacterPageAssets = {
	weaponsById: Record<string, PlayerWeaponWithRelations>;
	armorsById: Record<string, PlayerArmorWithRelations>;
	optionsById: Record<string, PlayerOptionWithRelations>;
	specialsById: Record<string, PlayerSpecialWithRelations>;
};

type CharacterPageRelations = {
	skillsById: Record<string, CharacterSkillWithRelations>;
	registletsById: Record<string, CharacterRegistletWithRelations>;
	combosById: Record<string, ComboWithRelations>;
	consumablesById: Record<string, ConsumableWithRelations>;
};

export type CharacterPageData = {
	// 设计说明：player / character 保留仓库聚合形状，兼容现有面板读取；assets / relations 提供按 id 写入的局部缓存。
	player: PlayerWithRelations | null;
	character: CharacterWithRelations | null;
	characters: character[];
	assets: CharacterPageAssets;
	relations: CharacterPageRelations;
	revision: number;
	pending: Record<string, PendingMutationState>;
};

export type CharacterPageStatus = "idle" | "loading" | "ready" | "error";

export type CharacterSkillLevelChange = {
	template: Skill;
	lv: number;
	characterSkillId?: string;
};

export type CharacterPageCommand =
	// 设计说明：command 是组件到页面模型的唯一写入口，组件描述意图，模型决定本地更新、DB 提交和引擎同步策略。
	| {
			type: "character.patch";
			patch: Partial<character>;
			relations?: Partial<CharacterWithRelations>;
			affectsEngine?: boolean;
	  }
	| {
			type: "skills.setLevels";
			changes: CharacterSkillLevelChange[];
	  }
	| {
			type: "skills.removeTree";
			templateIds: string[];
			characterSkillIds: string[];
	  };

export type CharacterPageModel = {
	pageData: CharacterPageData;
	status: Accessor<CharacterPageStatus>;
	error: Accessor<unknown>;
	dispatch: (command: CharacterPageCommand) => void;
	reload: () => Promise<unknown>;
};

type CharacterPageLoadSource = {
	playerId: string;
	characterId: string;
};

type CharacterPageLoadResult = {
	player: PlayerWithRelations;
	character: CharacterWithRelations;
	characters: character[];
};

type CharacterPageMutationBase = {
	// 设计说明：mutation 是乐观更新的最小事务单元；同一个对象同时描述本地生效、失败撤回和 DB 持久化。
	ids: string[];
	scopeCharacterId: string;
	mergeKey?: string;
	affectsEngine: boolean;
	applyLocal: () => void;
	rollbackLocal: () => void;
	persist: (trx: Transaction<DB>) => Promise<void>;
};

type CharacterPatchMutation = CharacterPageMutationBase & {
	kind: "character.patch";
	patch: Partial<character>;
	expandedPatch: Partial<CharacterWithRelations>;
	previous: Partial<CharacterWithRelations>;
	previousBase: Partial<character>;
};

type SkillLevelsMutation = CharacterPageMutationBase & {
	kind: "skills.setLevels";
	changes: CharacterSkillLevelChange[];
	previousSkills: CharacterSkillWithRelations[];
};

type SkillTreeRemoveMutation = CharacterPageMutationBase & {
	kind: "skills.removeTree";
	previousSkills: CharacterSkillWithRelations[];
};

type CharacterPageMutation = CharacterPatchMutation | SkillLevelsMutation | SkillTreeRemoveMutation;

type PreviewIds = {
	teamAId: string;
	teamBId: string;
	memberId: string;
	statisticId: string;
};

const emptyAssets = (): CharacterPageAssets => ({
	weaponsById: {},
	armorsById: {},
	optionsById: {},
	specialsById: {},
});

const emptyRelations = (): CharacterPageRelations => ({
	skillsById: {},
	registletsById: {},
	combosById: {},
	consumablesById: {},
});

const emptyPageData = (): CharacterPageData => ({
	player: null,
	character: null,
	characters: [],
	assets: emptyAssets(),
	relations: emptyRelations(),
	revision: 0,
	pending: {},
});

function mutationId(prefix: string): string {
	return `${prefix}:${createId()}`;
}

function indexById<T extends { id: string }>(rows: T[]): Record<string, T> {
	return Object.fromEntries(rows.map((row) => [row.id, row]));
}

function normalizeLoadResult(result: CharacterPageLoadResult): CharacterPageData {
	// 设计说明：加载结果在入口处归一化成工作副本，后续写入只更新工作副本而不重新依赖聚合查询。
	return {
		player: result.player,
		character: result.character,
		characters: result.characters,
		assets: {
			weaponsById: indexById(result.player.weapons),
			armorsById: indexById(result.player.armors),
			optionsById: indexById(result.player.options),
			specialsById: indexById(result.player.specials),
		},
		relations: {
			skillsById: indexById(result.character.skills),
			registletsById: indexById(result.character.registlets),
			combosById: indexById(result.character.combos),
			consumablesById: Object.fromEntries(result.character.consumables.map((row) => [row.itemId, row])),
		},
		revision: 0,
		pending: {},
	};
}

async function loadCharacterPageData(source: CharacterPageLoadSource): Promise<CharacterPageLoadResult | null> {
	// 设计说明：首次加载需要 player 资产全集和当前 character 关系全集，后续编辑通过 mutation 保持它们同步。
	const [player, characters] = await Promise.all([
		selectPlayerByIdWithRelations(source.playerId),
		selectAllCharactersByBelongtoplayerid(source.playerId),
	]);
	if (!player) return null;
	const character = player.characters.find((candidate) => candidate.id === source.characterId);
	if (!character) return null;
	return { player, character, characters };
}

function createPendingState(ids: string[]): Record<string, PendingMutationState> {
	return Object.fromEntries(ids.map((id) => [id, { id, status: "pending" as const }]));
}

function removePending(
	pending: Record<string, PendingMutationState>,
	ids: string[],
): Record<string, PendingMutationState> {
	const next = { ...pending };
	for (const id of ids) {
		delete next[id];
	}
	return next;
}

function failPending(
	pending: Record<string, PendingMutationState>,
	ids: string[],
	error: unknown,
): Record<string, PendingMutationState> {
	const message = error instanceof Error ? error.message : String(error);
	const next = { ...pending };
	for (const id of ids) {
		next[id] = { id, status: "failed", error: message };
	}
	return next;
}

function hasOwn<T extends object>(value: T, key: PropertyKey): key is keyof T {
	return Object.hasOwn(value, key);
}

function cloneForWorker<T>(value: T): T {
	// 设计说明：Worker postMessage 使用 structured clone；Solid store 的 Proxy/响应式数组不能跨线程传输。
	return structuredClone(unwrap(value)) as T;
}

export function createCharacterPageModel(input: {
	playerId: Accessor<string | undefined>;
	characterId: Accessor<string | undefined>;
	engine: EngineContextValue;
	previewIds: PreviewIds;
}): CharacterPageModel {
	// 设计说明：pageData 是角色页编辑期的单一工作副本；loadedData 只提供初始化和手动校准来源。
	const [pageData, setPageData] = createStore<CharacterPageData>(emptyPageData());
	const [loadedData, { refetch }] = createResource(
		() => {
			const playerId = input.playerId();
			const characterId = input.characterId();
			if (!playerId || !characterId) return null;
			return { playerId, characterId };
		},
		async (source) => {
			if (!source) return null;
			return loadCharacterPageData(source);
		},
	);

	let dbFlushTimer: number | undefined;
	let engineSyncTimer: number | undefined;
	let engineSyncInFlight = false;
	let engineSyncQueued = false;
	const dbQueue: CharacterPageMutation[] = [];
	let scenarioLoadedForCharacterId: string | undefined;
	let latestEngineSyncToken = 0;

	// 设计说明：路由身份变化会切断旧角色的定时器、pending 视图和引擎场景，防止旧角色副作用污染新页面。
	const currentSourceKey = () => {
		const playerId = input.playerId();
		const characterId = input.characterId();
		return playerId && characterId ? `${playerId}:${characterId}` : "";
	};
	let activeSourceKey = "";

	const bumpRevision = () => {
		setPageData("revision", (revision) => revision + 1);
	};

	const patchLocalCharacter = (
		characterId: string,
		expandedPatch: Partial<CharacterWithRelations>,
		basePatch: Partial<character>,
	) => {
		// 设计说明：同一个角色同时存在于 character、characters 列表和 player.characters 聚合中，局部 patch 必须同步三处视图。
		setPageData("character", (current) =>
			current && current.id === characterId ? ({ ...current, ...expandedPatch } as CharacterWithRelations) : current,
		);
		setPageData("characters", (characters) =>
			characters.map((candidate) => (candidate.id === characterId ? { ...candidate, ...basePatch } : candidate)),
		);
		setPageData("player", (player) =>
			player
				? {
						...player,
						characters: player.characters.map((candidate) =>
							candidate.id === characterId ? ({ ...candidate, ...expandedPatch } as CharacterWithRelations) : candidate,
						),
					}
				: player,
		);
	};

	const replaceCharacterSkills = (characterId: string, skills: CharacterSkillWithRelations[]) => {
		patchLocalCharacter(characterId, { skills }, {});
		setPageData("relations", "skillsById", indexById(skills));
	};

	const cacheCharacterPatchRelations = (relationPatch: Partial<CharacterWithRelations>) => {
		// 设计说明：新增装备会先写入装备表，再回写角色 FK；缓存 relation 后，同一轮本地 patch 可立即展开槽位 UI。
		if (relationPatch.weapon) {
			setPageData("assets", "weaponsById", relationPatch.weapon.id, relationPatch.weapon);
		}
		if (relationPatch.subWeapon) {
			setPageData("assets", "weaponsById", relationPatch.subWeapon.id, relationPatch.subWeapon);
		}
		if (relationPatch.armor) {
			setPageData("assets", "armorsById", relationPatch.armor.id, relationPatch.armor);
		}
		if (relationPatch.option) {
			setPageData("assets", "optionsById", relationPatch.option.id, relationPatch.option);
		}
		if (relationPatch.special) {
			setPageData("assets", "specialsById", relationPatch.special.id, relationPatch.special);
		}
	};

	const expandCharacterPatch = (
		patch: Partial<character>,
		relationPatch: Partial<CharacterWithRelations> = {},
	): Partial<CharacterWithRelations> => {
		// 设计说明：装备 FK 变化会立即影响 UI 和引擎输入，因此在本地 patch 阶段同步补齐 relation object。
		const expanded: Partial<CharacterWithRelations> = { ...patch };
		if (hasOwn(patch, "weaponId")) {
			expanded.weapon = patch.weaponId ? (pageData.assets.weaponsById[patch.weaponId] ?? null) : null;
		}
		if (hasOwn(patch, "subWeaponId")) {
			expanded.subWeapon = patch.subWeaponId ? (pageData.assets.weaponsById[patch.subWeaponId] ?? null) : null;
		}
		if (hasOwn(patch, "armorId")) {
			expanded.armor = patch.armorId ? (pageData.assets.armorsById[patch.armorId] ?? null) : null;
		}
		if (hasOwn(patch, "optionId")) {
			expanded.option = patch.optionId ? (pageData.assets.optionsById[patch.optionId] ?? null) : null;
		}
		if (hasOwn(patch, "specialId")) {
			expanded.special = patch.specialId ? (pageData.assets.specialsById[patch.specialId] ?? null) : null;
		}
		return { ...expanded, ...relationPatch };
	};

	const captureCharacterPrevious = (patch: Partial<CharacterWithRelations>): Partial<CharacterWithRelations> => {
		// 设计说明：rollback 只撤回本次 mutation 触碰过的字段，避免覆盖之后已经生效的其他局部状态。
		const current = pageData.character;
		if (!current) return {};
		const previous: Partial<CharacterWithRelations> = {};
		for (const key of Object.keys(patch) as Array<keyof CharacterWithRelations>) {
			previous[key] = current[key] as never;
		}
		return previous;
	};

	const captureCharacterBasePrevious = (patch: Partial<character>): Partial<character> => {
		const current = pageData.character;
		if (!current) return {};
		const previous: Partial<character> = {};
		for (const key of Object.keys(patch) as Array<keyof character>) {
			previous[key] = current[key] as never;
		}
		return previous;
	};

	const createCharacterPatchMutation = (
		characterId: string,
		patch: Partial<character>,
		relationPatch: Partial<CharacterWithRelations> = {},
		previous = captureCharacterPrevious(expandCharacterPatch(patch, relationPatch)),
		previousBase = captureCharacterBasePrevious(patch),
		ids = [mutationId(`character:${characterId}:patch`)],
	): CharacterPatchMutation => {
		// 设计说明：character patch 默认影响引擎；连续标量和装备槽更新可通过 mergeKey 合并为最后一次 DB 写入。
		const expandedPatch = expandCharacterPatch(patch, relationPatch);
		return {
			kind: "character.patch",
			ids,
			scopeCharacterId: characterId,
			mergeKey: `character:${characterId}:patch`,
			affectsEngine: true,
			patch,
			expandedPatch,
			previous,
			previousBase,
			applyLocal: () => {
				if (pageData.character?.id !== characterId) return;
				cacheCharacterPatchRelations(relationPatch);
				patchLocalCharacter(characterId, expandedPatch, patch);
				bumpRevision();
			},
			rollbackLocal: () => {
				if (pageData.character?.id !== characterId) return;
				patchLocalCharacter(characterId, previous, previousBase);
				bumpRevision();
			},
			persist: async (trx) => {
				await updateCharacter(characterId, patch, trx);
			},
		};
	};

	const createSkillLevelsMutation = (
		characterId: string,
		changes: CharacterSkillLevelChange[],
		previousSkills = [...(pageData.character?.skills ?? [])],
		ids = [mutationId(`skills:${characterId}:levels`)],
	): SkillLevelsMutation => {
		// 设计说明：技能等级连点允许 latest-wins 合并，前置链补齐后的最终技能集合才需要写库和刷新预览。
		return {
			kind: "skills.setLevels",
			ids,
			scopeCharacterId: characterId,
			mergeKey: `skills:${characterId}:levels`,
			affectsEngine: true,
			changes,
			previousSkills,
			applyLocal: () => {
				if (pageData.character?.id !== characterId) return;
				const skillsByTemplateId = new Map(pageData.character.skills.map((skill) => [skill.templateId, skill]));
				for (const change of changes) {
					const existing = skillsByTemplateId.get(change.template.id);
					if (existing) {
						skillsByTemplateId.set(change.template.id, { ...existing, lv: change.lv });
						continue;
					}
					if (!change.characterSkillId || change.lv <= 0) continue;
					skillsByTemplateId.set(change.template.id, {
						id: change.characterSkillId,
						lv: change.lv,
						isStarGem: false,
						templateId: change.template.id,
						belongToCharacterId: characterId,
						template: change.template as CharacterSkillWithRelations["template"],
					});
				}
				replaceCharacterSkills(characterId, Array.from(skillsByTemplateId.values()));
				bumpRevision();
			},
			rollbackLocal: () => {
				if (pageData.character?.id !== characterId) return;
				replaceCharacterSkills(characterId, previousSkills);
				bumpRevision();
			},
			persist: async (trx) => {
				const previousByTemplateId = new Map(previousSkills.map((skill) => [skill.templateId, skill]));
				for (const change of changes) {
					const previousSkill = previousByTemplateId.get(change.template.id);
					if (previousSkill) {
						await updateCharacterSkill(previousSkill.id, { lv: change.lv }, trx);
						continue;
					}
					if (!change.characterSkillId || change.lv <= 0) continue;
					await insertCharacterSkill(
						{
							id: change.characterSkillId,
							lv: change.lv,
							isStarGem: false,
							templateId: change.template.id,
							belongToCharacterId: characterId,
						},
						trx,
					);
				}
			},
		};
	};

	const createSkillTreeRemoveMutation = (
		characterId: string,
		templateIds: string[],
		characterSkillIds: string[],
	): SkillTreeRemoveMutation => {
		const previousSkills = [...(pageData.character?.skills ?? [])];
		const templateIdSet = new Set(templateIds);
		return {
			// 设计说明：技能树删除涉及多行 delete，不能被吞并，否则 DB 事务边界和 rollback 集合会变得不可推断。
			kind: "skills.removeTree",
			ids: [mutationId(`skills:${characterId}:removeTree`)],
			scopeCharacterId: characterId,
			affectsEngine: true,
			previousSkills,
			applyLocal: () => {
				if (pageData.character?.id !== characterId) return;
				replaceCharacterSkills(
					characterId,
					pageData.character.skills.filter((skill) => !templateIdSet.has(skill.templateId)),
				);
				bumpRevision();
			},
			rollbackLocal: () => {
				if (pageData.character?.id !== characterId) return;
				replaceCharacterSkills(characterId, previousSkills);
				bumpRevision();
			},
			persist: async (trx) => {
				for (const skillId of characterSkillIds) {
					await deleteCharacterSkill(skillId, trx);
				}
			},
		};
	};

	const mergeMutations = (queued: CharacterPageMutation, next: CharacterPageMutation): CharacterPageMutation | null => {
		// 设计说明：合并只发生在有相同 mergeKey 的同类 mutation 上；previous 保留最早状态，patch 使用最后状态。
		if (queued.kind === "character.patch" && next.kind === "character.patch") {
			return createCharacterPatchMutation(
				queued.scopeCharacterId,
				{ ...queued.patch, ...next.patch },
				{ ...queued.expandedPatch, ...next.expandedPatch },
				{ ...next.previous, ...queued.previous },
				{ ...next.previousBase, ...queued.previousBase },
				[...queued.ids, ...next.ids],
			);
		}
		if (queued.kind === "skills.setLevels" && next.kind === "skills.setLevels") {
			const mergedByTemplateId = new Map(queued.changes.map((change) => [change.template.id, change]));
			for (const change of next.changes) {
				mergedByTemplateId.set(change.template.id, change);
			}
			return createSkillLevelsMutation(
				queued.scopeCharacterId,
				Array.from(mergedByTemplateId.values()),
				queued.previousSkills,
				[...queued.ids, ...next.ids],
			);
		}
		return null;
	};

	const markPending = (mutation: CharacterPageMutation) => {
		setPageData("pending", (pending) => ({ ...pending, ...createPendingState(mutation.ids) }));
	};

	const clearPending = (ids: string[]) => {
		setPageData("pending", (pending) => removePending(pending, ids));
	};

	const markFailed = (ids: string[], error: unknown) => {
		setPageData("pending", (pending) => failPending(pending, ids, error));
	};

	const enqueueDbMutation = (mutation: CharacterPageMutation) => {
		// 设计说明：DB 队列按命令顺序提交；可合并 mutation 只压缩同一语义键，创建后装备等跨实体动作保留顺序。
		if (mutation.mergeKey) {
			const index = dbQueue.findIndex((queued) => queued.mergeKey === mutation.mergeKey);
			const queued = index >= 0 ? dbQueue[index] : undefined;
			const merged = queued ? mergeMutations(queued, mutation) : null;
			if (merged) {
				dbQueue[index] = merged;
			} else {
				dbQueue.push(mutation);
			}
		} else {
			dbQueue.push(mutation);
		}

		if (dbFlushTimer !== undefined) {
			window.clearTimeout(dbFlushTimer);
		}
		dbFlushTimer = window.setTimeout(() => {
			dbFlushTimer = undefined;
			void flushDbQueue();
		}, DB_DEBOUNCE_MS);
	};

	const flushDbQueue = async () => {
		// 设计说明：一个 flush 批次放进同一事务，失败时逆序 rollback，恢复到本批次执行前的页面工作副本。
		const batch = dbQueue.splice(0);
		if (batch.length === 0) return;
		try {
			const db = await getDB();
			await db.transaction().execute(async (trx) => {
				for (const mutation of batch) {
					await mutation.persist(trx);
				}
			});
			clearPending(batch.flatMap((mutation) => mutation.ids));
		} catch (error) {
			for (const mutation of [...batch].reverse()) {
				mutation.rollbackLocal();
			}
			const visibleFailedIds = batch
				.filter((mutation) => mutation.scopeCharacterId === pageData.character?.id)
				.flatMap((mutation) => mutation.ids);
			if (visibleFailedIds.length > 0) markFailed(visibleFailedIds, error);
			scheduleEngineSync();
			console.error("Character 页面数据写入失败", error);
		}
	};

	const createPreviewScenario = (): EngineScenarioData | null => {
		// 设计说明：角色页预览固定使用当前路由 character，避免父 player.useIn 的历史值把预览切到其他角色。
		const player = pageData.player;
		const currentCharacter = pageData.character;
		if (!player || !currentCharacter || !player.id) return null;
		const now = new Date().toISOString();
		const previewTargetStatisticId = `${input.previewIds.statisticId}:target`;
		const previewTargetMobId = `${input.previewIds.memberId}:target-mob`;
		const previewTargetMemberId = `${input.previewIds.memberId}:target-member`;
		// 设计说明：预览输入由页面工作副本生成，保证 UI、DB 回滚和引擎投影使用同一个角色快照。
		const previewPlayer: PlayerWithRelations = {
			...player,
			useIn: currentCharacter.id,
			characters: player.characters.map((candidate) =>
				candidate.id === currentCharacter.id ? currentCharacter : candidate,
			),
		};
		const trainingMob: MobWithRelations = {
			id: previewTargetMobId,
			name: "CharacterPreviewTarget",
			type: "Mob",
			captureable: false,
			baseLv: currentCharacter.lv,
			experience: 0,
			partsExperience: 0,
			initialElement: "Normal",
			radius: 1,
			maxhp: 1000000,
			physicalDefense: 0,
			physicalResistance: 0,
			magicalDefense: 0,
			magicalResistance: 0,
			criticalResistance: 0,
			avoidance: 0,
			dodge: 0,
			block: 0,
			normalDefExp: 0,
			physicDefExp: 0,
			magicDefExp: 0,
			// 设计说明：Mob 预览只需要一个合法、可结构克隆的行为树定义；实际预览只消费其存在，不依赖该 BT 运行结果。
			actions: {
				name: "CharacterPreviewTargetActions",
				definition: "root { wait [1] }",
				agent: "",
				memberType: "Mob",
			},
			details: null,
			dataSources: "character-preview",
			statisticId: previewTargetStatisticId,
			updatedByAccountId: null,
			createdByAccountId: null,
			drops: [],
			statistic: {
				id: previewTargetStatisticId,
				updatedAt: now,
				createdAt: now,
				usageTimestamps: [],
				viewTimestamps: [],
			},
			images: [],
		};
		const targetMember: MemberWithRelations = {
			id: previewTargetMemberId,
			name: trainingMob.name,
			sequence: 1,
			type: "Mob",
			playerId: null,
			partnerId: null,
			mercenaryId: null,
			mobId: trainingMob.id,
			mobDifficultyFlag: "Normal",
			belongToTeamId: input.previewIds.teamBId,
			player: null,
			partner: null,
			mercenary: null,
			mob: trainingMob,
		};
		const member: MemberWithRelations = {
			id: input.previewIds.memberId,
			name: currentCharacter.name ?? "未命名角色",
			sequence: 0,
			type: "Player",
			playerId: player.id,
			partnerId: null,
			mercenaryId: null,
			mobId: null,
			mobDifficultyFlag: "Normal",
			belongToTeamId: input.previewIds.teamAId,
			player: previewPlayer,
			partner: null,
			mercenary: null,
			mob: null,
		};
		const teamA: TeamWithRelations = {
			id: input.previewIds.teamAId,
			name: "CharacterPreviewTeamA",
			gems: [],
			members: [member],
		};
		const teamB: TeamWithRelations = {
			id: input.previewIds.teamBId,
			name: "CharacterPreviewTeamB",
			gems: [],
			// 设计说明：预览场景必须包含一个敌对目标，技能预览和 dps_impact 才能命中非空目标集合。
			members: [targetMember],
		};
		const scenario: EngineScenarioData = {
			simulator: {
				id: "CHARACTER_PREVIEW_SIMULATOR",
				name: "CharacterPreviewSimulator",
				details: null,
				statisticId: input.previewIds.statisticId,
				updatedByAccountId: null,
				createdByAccountId: null,
				campA: [teamA],
				campB: [teamB],
				statistic: {
					id: input.previewIds.statisticId,
					updatedAt: now,
					createdAt: now,
					usageTimestamps: [],
					viewTimestamps: [],
				},
			},
			runtimeSelection: {
				primaryMemberId: input.previewIds.memberId,
			},
		};
		return cloneForWorker(scenario);
	};

	const syncCurrentPageStateToEngine = async (revision: number, token: number) => {
		// 设计说明：revision 和 token 共同过滤过期同步；路由切换或新 patch 到来后，旧 Worker 结果不再写回当前预览。
		if (!input.engine.ready()) return;
		if (token !== latestEngineSyncToken || revision !== pageData.revision) return;
		const currentCharacter = pageData.character;
		if (!currentCharacter) return;
		try {
			const scenario = createPreviewScenario();
			const member = scenario?.simulator.campA[0]?.members[0];
			if (!scenario || !member) return;
			// 设计说明：首次进入角色或切换角色需要完整场景；同一角色的后续配置变化只 patch member，降低重建成本。
			if (scenarioLoadedForCharacterId !== currentCharacter.id) {
				await input.engine.service.loadScenario(scenario);
				await input.engine.service.setRuntimeConfig(createPreviewConfig());
				await input.engine.refreshMembers();
				if (pageData.character?.id === currentCharacter.id) {
					scenarioLoadedForCharacterId = currentCharacter.id;
				}
				return;
			}
			await input.engine.patchMemberConfig(input.previewIds.memberId, cloneForWorker(member));
		} catch (error) {
			console.error("Character 页面加载预览场景失败", error);
		}
	};

	const runEngineSync = async (revision: number, token: number) => {
		// 设计说明：Worker 同步可能耗时 0.5s 以上；运行中收到新请求时只记录 queued，完成后再处理最新快照。
		if (engineSyncInFlight) {
			engineSyncQueued = true;
			return;
		}
		engineSyncInFlight = true;
		try {
			await syncCurrentPageStateToEngine(revision, token);
		} finally {
			engineSyncInFlight = false;
			if (engineSyncQueued || token !== latestEngineSyncToken || revision !== pageData.revision) {
				engineSyncQueued = false;
				scheduleEngineSync();
			}
		}
	};

	const scheduleEngineSync = (delay = ENGINE_SYNC_DEBOUNCE_MS) => {
		if (engineSyncTimer !== undefined) {
			window.clearTimeout(engineSyncTimer);
		}
		const revision = pageData.revision;
		const token = latestEngineSyncToken + 1;
		latestEngineSyncToken = token;
		if (engineSyncInFlight) {
			engineSyncQueued = true;
			return;
		}
		// 设计说明：引擎同步是页面工作副本的副作用出口，采用 trailing debounce 合并高频输入。
		// 每次本地 patch 只刷新待提交快照，Worker 始终接收最近一次稳定后的角色数据。
		engineSyncTimer = window.setTimeout(() => {
			engineSyncTimer = undefined;
			void runEngineSync(revision, token);
		}, delay);
	};

	const runMutation = (mutation: CharacterPageMutation) => {
		// 设计说明：mutation 执行顺序固定为本地生效、标记 pending、排队写库、调度引擎，保证 UI 永远先响应用户输入。
		mutation.applyLocal();
		markPending(mutation);
		enqueueDbMutation(mutation);
		if (mutation.affectsEngine) {
			scheduleEngineSync();
		}
	};

	const dispatch = (command: CharacterPageCommand) => {
		// 设计说明：dispatch 把组件事件翻译为 mutation，组件不直接触碰 DB 和引擎，避免副作用分散到叶子节点。
		const current = pageData.character;
		if (!current) return;
		if (command.type === "character.patch") {
			runMutation(createCharacterPatchMutation(current.id, command.patch, command.relations));
			return;
		}
		if (command.type === "skills.setLevels") {
			if (command.changes.length === 0) return;
			runMutation(createSkillLevelsMutation(current.id, command.changes));
			return;
		}
		runMutation(createSkillTreeRemoveMutation(current.id, command.templateIds, command.characterSkillIds));
	};

	createEffect(
		on(currentSourceKey, (nextSourceKey) => {
			// 设计说明：playerId 在 session 恢复或刷新期间可能短暂为空；空身份不是一次有效路由切换，
			// 不能据此清空 pageData，否则会出现 loading → 内容 → loading → 内容的闪烁。
			if (!nextSourceKey) return;
			if (!activeSourceKey) {
				activeSourceKey = nextSourceKey;
				return;
			}
			if (activeSourceKey === nextSourceKey) return;
			activeSourceKey = nextSourceKey;
			// 设计说明：离开当前角色前先尝试 flush 已排队写入，再清空本页同步状态，降低快速路由切换的数据丢失风险。
			if (dbFlushTimer !== undefined) {
				window.clearTimeout(dbFlushTimer);
				dbFlushTimer = undefined;
				void flushDbQueue();
			}
			if (engineSyncTimer !== undefined) {
				window.clearTimeout(engineSyncTimer);
				engineSyncTimer = undefined;
			}
			latestEngineSyncToken += 1;
			engineSyncQueued = false;
			scenarioLoadedForCharacterId = undefined;
			setPageData(reconcile(emptyPageData()));
		}),
	);

	createEffect(
		on(
			() => loadedData(),
			(data) => {
				// 设计说明：resource 返回值只在身份仍匹配当前路由时写入工作副本，避免慢查询覆盖新角色页面。
				if (data === undefined) return;
				if (data === null) {
					if (!currentSourceKey()) return;
					setPageData(reconcile(emptyPageData()));
					scenarioLoadedForCharacterId = undefined;
					return;
				}
				if (data.player.id !== input.playerId() || data.character.id !== input.characterId()) return;
				setPageData(reconcile(normalizeLoadResult(data)));
				scenarioLoadedForCharacterId = undefined;
				scheduleEngineSync(0);
			},
		),
	);

	createEffect(
		on(
			() => input.engine.ready(),
			(ready) => {
				if (ready) scheduleEngineSync(0);
			},
		),
	);

	onCleanup(() => {
		if (dbFlushTimer !== undefined) {
			window.clearTimeout(dbFlushTimer);
		}
		if (engineSyncTimer !== undefined) {
			window.clearTimeout(engineSyncTimer);
		}
	});

	const status = createMemo<CharacterPageStatus>(() => {
		if (loadedData.error) return "error";
		if (pageData.character) return "ready";
		if (loadedData.loading) return "loading";
		return "idle";
	});

	return {
		pageData,
		status,
		error: () => loadedData.error,
		dispatch,
		reload: async () => refetch(),
	};
}
