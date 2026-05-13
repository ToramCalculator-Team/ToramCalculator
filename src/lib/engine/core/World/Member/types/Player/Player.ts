import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { createLogger } from "~/lib/Logger";
import { Member } from "../../Member";
import { BUILT_IN_REGISTLETS_BY_ID } from "../../Registlets/BuiltInRegistlets";
import { installRegistlet } from "../../Registlets/RegistletLoader";
import { MemberRuntimeServicesDefaults } from "../../runtime/Agent/RuntimeServices";
import { mergeSchema, type SlotDeclaration } from "../../runtime/StatContainer/SchemaMerge";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { PlayerRuntime } from "../../runtime/types";
import { PlayerBtBindings } from "./Agents/BtBindings";
import { type PlayerAttrNestedSchema, PlayerAttrSchemaGenerator } from "./PlayerAttrSchema";
import { type PlayerEventType, type PlayerStateContext, playerStateMachine } from "./PlayerStateMachine";
import { applyPrebattleModifiers } from "./PrebattleDataSysModifiers";

const log = createLogger("Player");

export type PlayerAttrType = ExtractAttrPaths<PlayerAttrNestedSchema>;

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerRuntime> {
	activeCharacter: CharacterWithRelations;

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

		const baseSchema = PlayerAttrSchemaGenerator(activeCharacter);
		// 技能 / 托环 / buff 可能需要额外属性槽（咏咒层数、冷却时间戳等）。
		// 必须在 StatContainer 构造前并入 schema，战斗中不能再扩容（Float64Array 固定长度）。
		const slotDeclarations = Player.collectAttributeSlots(activeCharacter, memberData);
		const attrSchema = mergeSchema(baseSchema, slotDeclarations);
		const statContainer = new StatContainer<PlayerAttrType>(attrSchema);
		const initialSkillList = activeCharacter.skills;

		if (!initialSkillList) {
			throw new Error("未在Character.Skills中找到技能");
		}

		const runtime: PlayerRuntime = {
			type: "Player",
			tickIndex: 0,
			currentTimeMs: 0,
			deltaTimeMs: 0,
			position: position ?? { x: 0, y: 0, z: 0 },
			targetId: memberData.id,
			statusTags: [],
			currentSkill: null,
			previousSkill: null,
			currentSkillVariant: null,
			currentSkillBranchParams: {},
			currentSkillStartupMs: 0,
			currentSkillChargingMs: 0,
			currentSkillChantingMs: 0,
			currentSkillActionMs: 0,
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

		applyPrebattleModifiers(this.statContainer, memberData);
	}

	/**
	 * 从 character_registlet 关联列表安装已装备的雷吉斯托环。
	 *
	 * 必须在 `setEventCatalog` 之后调用 —— 否则 ProcBus 还未就绪，subscription 会被跳过。
	 * MemberManager 负责调用时序。
	 */
	installRegistletsFromCharacter(): void {
		const rings = this.activeCharacter?.registlets ?? [];
		for (const ring of rings) {
			const template = BUILT_IN_REGISTLETS_BY_ID.get(ring.templateId);
			if (!template) {
				log.debug(`托环模板未在内置表中登记，跳过: ${ring.templateId}`);
				continue;
			}
			try {
				installRegistlet(this, template, ring.level);
			} catch (error) {
				log.warn(`安装托环失败: ${template.id}`, error);
			}
		}
	}

	/**
	 * 收集所有需要在 StatContainer 上预分配的属性槽。
	 *
	 * 来源（当前为 no-op，数据模型接入后在此填充）：
	 * - 角色已学技能的 `attributeSlots` 声明（如爆能的咏咒层数）
	 * - 装备的托环 / passive 的 `attributeSlots` 声明（如 HP 紧急回复的 lastTriggeredFrame）
	 * - 预插 buff 的 `attributeSlots` 声明（如弧光剑舞层数）
	 *
	 * 命名约定见 `SchemaMerge.ts`：`skill.<id>.<field>` / `passive.<id>.<field>` / `buff.<id>.<field>`。
	 */
	private static collectAttributeSlots(
		_activeCharacter: CharacterWithRelations,
		_memberData: MemberWithRelations,
	): SlotDeclaration[] {
		const slots: SlotDeclaration[] = [];
		// 数据模型补齐后在此追加：
		// for (const skill of _activeCharacter.skills) {
		//   slots.push(...(skill.template?.attributeSlots ?? []));
		// }
		return slots;
	}
}
