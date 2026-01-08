import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import { PlayerRuntimeContext } from "./Agents/RuntimeContext";
import { PlayerAttrSchemaGenerator } from "./PlayerAttrSchema";
import { type PlayerEventType, type PlayerStateContext, playerStateMachine } from "./PlayerStateMachine";
import { applyPrebattleModifiers } from "./PrebattleDataSysModifiers";

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchemaGenerator>>;

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerRuntimeContext> {
	characterIndex: number;
	activeCharacter: CharacterWithRelations;

	constructor(
		memberData: MemberWithRelations,
		campId: string,
		teamId: string,
		characterIndex: number,
		renderMessageSender: ((payload: unknown) => void) | null,
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

		super(
			playerStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			runtimeContext,
			renderMessageSender,
			position,
		);

		// 完成 owner 回填
		this.runtimeContext.owner = this;
		this.characterIndex = characterIndex;
		this.activeCharacter = memberData.player.characters?.[characterIndex];

		// Player特有的被动技能初始化
		this.initializePassiveSkills(memberData);

		// 应用战前修饰器
		applyPrebattleModifiers(this.statContainer, memberData);
	}

	/**
	 * 初始化Player的被动技能
	 * 遍历技能树，向管线管理器添加初始化时的技能效果
	 */
	private initializePassiveSkills(memberData: MemberWithRelations): void {
		console.log("initializePassiveSkills", memberData);
		// TODO: 与实际的技能系统集成
		// 1. 获取Player的角色配置 (memberData.player?.characters)
		// 2. 遍历角色的技能树 (character.skills)
		// 3. 查询技能效果，找到insertTime === "engine_init"的效果
		// 4. 通过buffManager.addBuff()应用这些被动效果
	}
}
