import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { Member } from "../../Member";
import { ModifierType } from "../../runtime/StatContainer/StatContainer";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import { PlayerRuntimeContext } from "./Agents/RuntimeContext";
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

type RegisterRingEffectDef = {
	maxLevel: number;
	apply: (params: {
		level: number;
		statContainer: StatContainer<PlayerAttrType>;
		sourceId: string;
		sourceName: string;
	}) => void;
};

const BuiltinRegisterRingEffects: Record<string, RegisterRingEffectDef> = {
	sleep_insufficient: {
		maxLevel: 5,
		apply: ({ level, statContainer, sourceId, sourceName }) => {
			statContainer.addModifier("status.sleep.durationRate", ModifierType.STATIC_FIXED, -10 * level, {
				id: sourceId,
				name: sourceName,
				type: "equipment",
			});
		},
	},
};

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerRuntimeContext> {
	characterIndex: number;
	activeCharacter: CharacterWithRelations;

	constructor(
		memberData: MemberWithRelations,
		campId: string,
		teamId: string,
		characterIndex: number,
		position?: { x: number; y: number; z: number },
	) {
		if (!memberData.player) {
			throw new Error("Player数据缺失");
		}
		if (!memberData.player.characters[characterIndex]) {
			throw new Error("Character数据缺失");
		}
		const attrSchema = PlayerAttrSchemaGenerator(memberData.player.characters[characterIndex]);
		const statContainer = new StatContainer<PlayerAttrType>(attrSchema);
		const initialSkillList = memberData.player.characters[characterIndex].skills ?? [];

		// 重要：runtimeContext 必须是每个成员独立的对象，且引用在构造后不可再被替换
		// 否则 MemberManager 注入 evaluateExpression 后会被覆盖掉，导致 “evaluateExpression 未注入”
		const runtimeContext: PlayerRuntimeContext = {
			...PlayerRuntimeContext,
			owner: undefined,
			position: position ?? { x: 0, y: 0, z: 0 },
			// 技能栏的"静态技能列表"应该在初始化时就可用，动态计算（mp/cd 等）由事件流/订阅面板驱动
			skillList: initialSkillList,
			// 冷却数组：与 skillList 对齐，初始为 0（可用）
			skillCooldowns: initialSkillList.map(() => 0),
			character: memberData.player.characters[characterIndex],
		};

		super(playerStateMachine, campId, teamId, memberData, attrSchema, statContainer, runtimeContext, position);

		// 完成 owner 回填
		this.runtimeContext.owner = this;
		this.characterIndex = characterIndex;
		this.activeCharacter = memberData.player.characters?.[characterIndex];

		// Player特有的被动技能初始化
		this.initializePassiveSkills(memberData);

		// 应用战前修饰器
		applyPrebattleModifiers(this.statContainer, memberData);

		// 挂载角色初始化增强（当前先支持纯数据托环 -> stat modifier）
		this.mountRegisterRingEffects();
	}

	/**
	 * 初始化Player的被动技能
	 * 遍历技能树，向管线管理器添加初始化时的技能效果
	 */
	private initializePassiveSkills(memberData: MemberWithRelations): void {
		log.debug("initializePassiveSkills", memberData);
		// TODO: 与实际的技能系统集成
		// 1. 获取Player的角色配置 (memberData.player?.characters)
		// 2. 遍历角色的技能树 (character.skills)
		// 3. 查询技能效果，找到insertTime === "engine_init"的效果
		// 4. 通过buffManager.addBuff()应用这些被动效果
	}

	private mountRegisterRingEffects(): void {
		const config = this.parseRuntimeAugments(this.activeCharacter?.details);

		for (const ring of config.registerRings) {
			const normalizedId = ring.id.trim().toLowerCase();
			const effect = BuiltinRegisterRingEffects[normalizedId];
			if (!effect) {
				log.warn(`未实现的托环效果，已跳过: ${ring.id}`);
				continue;
			}

			const level = Math.max(1, Math.min(ring.level, effect.maxLevel));
			const sourceId = `register_ring.${normalizedId}`;
			effect.apply({
				level,
				statContainer: this.statContainer,
				sourceId,
				sourceName: normalizedId,
			});
		}
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
