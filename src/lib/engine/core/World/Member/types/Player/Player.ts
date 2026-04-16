import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { Member } from "../../Member";
import { MemberRuntimeServicesDefaults } from "../../runtime/Agent/RuntimeServices";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { ModifierType, StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { PlayerRuntime } from "../../runtime/types";
import { PlayerBtBindings } from "./Agents/BtBindings";
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

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerRuntime> {
	activeCharacter: CharacterWithRelations;

	/**
	 * 每个技能的托环参数索引。
	 *
	 * 目的：
	 * - 构造期一次性解析托环的“按技能参数”效果
	 * - 施放时复用索引结果，避免重复扫描
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
		const initialSkillList = activeCharacter.skills;

		if (!initialSkillList) {
			throw new Error("未在Character.Skills中找到技能");
		}

		const runtime: PlayerRuntime = {
			type: "Player",
			currentFrame: 0,
			position: position ?? { x: 0, y: 0, z: 0 },
			targetId: memberData.id,
			statusTags: [],
			currentSkill: null,
			previousSkill: null,
			currentSkillVariant: null,
			currentSkillParams: {},
			currentSkillStartupFrames: 0,
			currentSkillChargingFrames: 0,
			currentSkillChantingFrames: 0,
			currentSkillActionFrames: 0,
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
			runtime,
			MemberRuntimeServicesDefaults,
			position,
			PlayerBtBindings,
		);
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
				// 旧 PipelineManager 已移除；此处改为构造纯数据 overlay。
				// 注意：旧的 "stageName" -> 新的 "instruction anchor" 映射尚未建立，
				// 当前内置托环效果未使用 pipelinePatches，因此先做告警并跳过。
				log.warn(
					`托环管线补丁暂未迁移（已跳过）：${pipelinePatch.pipelineName} after=${pipelinePatch.afterStageName} insert=${pipelinePatch.insertStageName}`,
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
