import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { Member } from "../../Member";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { ModifierType, StatContainer } from "../../runtime/StatContainer/StatContainer";
import { PlayerBtBindings, PlayerContext } from "./Agents/Context";
import { PlayerAttrSchemaGenerator } from "./PlayerAttrSchema";
import { type PlayerEventType, type PlayerStateContext, playerStateMachine } from "./PlayerStateMachine";
import { applyPrebattleModifiers } from "./PrebattleDataSysModifiers";

const log = createLogger("Player");

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchemaGenerator>>;

const registerRingConfigSchema = z.object({
	id: z.string(),
	level: z.number().int().min(1).default(1),
});

const characterRuntimeAugmentSchema = z.object({
	registerRings: z.array(registerRingConfigSchema).default([]),
});

type CharacterRuntimeAugmentConfig = z.output<typeof characterRuntimeAugmentSchema>;

type RegistletAttrModifierDef = {
	attr: PlayerAttrType;
	modifierType: ModifierType;
	valuePerLevel: number;
};

type RegistletPipelinePatchDef = {
	pipelineName: string;
	afterStageName: string;
	insertStageName: string;
	params?: Record<string, unknown>;
	priority?: number;
};

type RegistletSkillParamDef = {
	skillId: string;
	param: string;
	value: number;
};

type RegistletEffectDef = {
	maxLevel: number;
	attrModifiers: RegistletAttrModifierDef[];
	pipelinePatches: RegistletPipelinePatchDef[];
	skillParams: RegistletSkillParamDef[];
};

const BuiltinRegistletEffects: Record<string, RegistletEffectDef> = {
	sleep_insufficient: {
		maxLevel: 5,
		attrModifiers: [
			{
				attr: "status.sleep.durationRate",
				modifierType: ModifierType.STATIC_FIXED,
				valuePerLevel: -10,
			},
		],
		pipelinePatches: [],
		skillParams: [],
	},
};

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerContext> {
	activeCharacter: CharacterWithRelations;

	/**
	 * Per-skill registlet parameter index.
	 * Purpose: resolve skill-specific registlet effects once during construction,
	 * then reuse the indexed result when a skill enters execution.
	 */
	private readonly skillParamsBySkillId = new Map<string, RegistletSkillParamDef[]>();

	constructor(
		memberData: MemberWithRelations,
		campId: string,
		teamId: string,
		position?: { x: number; y: number; z: number },
	) {
		log.info("Player constructor", memberData);
		if (!memberData.player) {
			throw new Error("Player数据缺失");
		}
		const activeCharacterId = memberData.player?.useIn;
		let activeCharacter = memberData.player.characters.find((character) => character.id === activeCharacterId);
		if (!activeCharacter) {
			throw new Error("未在Player.Characters中找到useIn对应的Character");
		}
		if (!activeCharacterId) {
			log.warn("Player数据缺失useIn，将使用第一个角色");
			activeCharacter = memberData.player.characters[0];
		}

		const attrSchema = PlayerAttrSchemaGenerator(activeCharacter);
		const statContainer = new StatContainer<PlayerAttrType>(attrSchema);
		const initialSkillList = activeCharacter.skills ?? [];

		// The shared member context is mutated by runtime service injection,
		// so every player must own a dedicated object instance.
		const context: PlayerContext = {
			...PlayerContext,
			owner: undefined,
			position: position ?? { x: 0, y: 0, z: 0 },
			// Responsibility: keep the shared member context aligned with the
			// long-standing FSM bootstrap default.
			// Purpose: remove the first targetId split before the FSM mirror sync
			// runs on later frames.
			targetId: memberData.id,
			skillList: initialSkillList,
			skillCooldowns: initialSkillList.map(() => 0),
			character: activeCharacter,
		};

		super(
			playerStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			context,
			position,
			PlayerBtBindings,
		);

		this.context.owner = this;
		this.activeCharacter = activeCharacter;

		this.initializePassiveSkills(memberData);
		applyPrebattleModifiers(this.statContainer, memberData);
		this.mountRegistletEffects();
	}

	private initializePassiveSkills(memberData: MemberWithRelations): void {
		log.debug("initializePassiveSkills", memberData);
		// TODO: integrate passive skill initialization with the real skill system.
	}

	/**
	 * Split all equipped registlets into the three supported effect lanes:
	 * 1. stat modifiers
	 * 2. always-on pipeline inserts
	 * 3. skill parameter overlays
	 */
	private mountRegistletEffects(): void {
		const config = this.parseRuntimeAugments(this.activeCharacter?.details);

		for (const ring of config.registerRings) {
			const normalizedId = ring.id.trim().toLowerCase();
			const effect = BuiltinRegistletEffects[normalizedId];
			if (!effect) {
				log.warn(`未实现的托环效果，已跳过: ${ring.id}`);
				continue;
			}

			const level = Math.max(1, Math.min(ring.level, effect.maxLevel));
			const sourceId = `registlet.${normalizedId}`;

			for (const attrModifier of effect.attrModifiers) {
				this.statContainer.addModifier(
					attrModifier.attr,
					attrModifier.modifierType,
					attrModifier.valuePerLevel * level,
					{
						id: sourceId,
						name: normalizedId,
						type: "equipment",
					},
				);
			}

			for (const pipelinePatch of effect.pipelinePatches) {
				this.pipelineManager.insertPipelineStage(
					pipelinePatch.pipelineName,
					pipelinePatch.afterStageName as never,
					pipelinePatch.insertStageName as never,
					`${sourceId}.${pipelinePatch.insertStageName}`,
					sourceId,
					pipelinePatch.params,
					pipelinePatch.priority ?? 0,
				);
			}

			for (const skillParam of effect.skillParams) {
				this.registerSkillParam(skillParam);
			}
		}
	}

	resolveSkillParams(skill: CharacterSkillWithRelations | null): Record<string, number> {
		if (!skill) {
			return {};
		}

		const params = this.skillParamsBySkillId.get(skill.id);
		if (!params?.length) {
			return {};
		}

		const result: Record<string, number> = {};
		for (const skillParam of params) {
			result[skillParam.param] = skillParam.value;
		}
		return result;
	}

	private registerSkillParam(skillParam: RegistletSkillParamDef): void {
		const existing = this.skillParamsBySkillId.get(skillParam.skillId);
		if (existing) {
			existing.push(skillParam);
			return;
		}
		this.skillParamsBySkillId.set(skillParam.skillId, [skillParam]);
	}

	private parseRuntimeAugments(details?: string | null): CharacterRuntimeAugmentConfig {
		if (!details) {
			return { registerRings: [] };
		}

		try {
			const parsed = JSON.parse(details);
			const result = characterRuntimeAugmentSchema.safeParse(parsed);
			if (!result.success) {
				log.warn(`角色 details 中的运行时增强配置无效，已忽略: ${result.error.message}`);
				return { registerRings: [] };
			}
			return result.data;
		} catch (error) {
			log.warn(`角色 details 不是有效 JSON，已忽略托环配置: ${error instanceof Error ? error.message : String(error)}`);
			return { registerRings: [] };
		}
	}
}
