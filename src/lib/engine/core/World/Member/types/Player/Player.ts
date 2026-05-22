import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberBTTree } from "@db/schema/jsons";
import { createLogger } from "~/lib/Logger";
import type { RuntimeAttachment } from "../../attachments/RuntimeAttachment";
import { collectAttachmentSlots } from "../../attachments/RuntimeAttachment";
import { installRuntimeAttachment } from "../../attachments/RuntimeAttachmentInstaller";
import { collectPlayerRuntimeAttachments } from "../../construction/collectPlayerRuntimeAttachments";
import { Member } from "../../Member";
import { MemberRuntimeServicesDefaults } from "../../runtime/Agent/RuntimeServices";
import { mergeSchema, type SlotDeclaration } from "../../runtime/StatContainer/SchemaMerge";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { PlayerRuntime } from "../../runtime/types";
import { PlayerBtBindings } from "./Agents/BtBindings";
import { type PlayerAttrNestedSchema, PlayerAttrSchemaGenerator } from "./PlayerAttrSchema";
import { type PlayerEventType, type PlayerStateContext, playerStateMachine } from "./PlayerStateMachine";
import { selectPlayerSkillVariant } from "./skillLifecycle";

const log = createLogger("Player");

export type PlayerAttrType = ExtractAttrPaths<PlayerAttrNestedSchema>;

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerRuntime> {
	activeCharacter: CharacterWithRelations;
	private readonly runtimeAttachments: RuntimeAttachment<PlayerAttrType>[];

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
		let activeCharacter = activeCharacterId
			? memberData.player.characters.find((character) => character.id === activeCharacterId)
			: undefined;
		if (!activeCharacterId) {
			log.warn("Player数据缺失useIn，将使用第一个角色");
			activeCharacter = memberData.player.characters[0];
		}
		if (!activeCharacter) {
			throw new Error("未在Player.Characters中找到useIn对应的Character");
		}

		const runtimeAttachments = collectPlayerRuntimeAttachments<PlayerAttrType>(activeCharacter, memberData);
		const baseSchema = PlayerAttrSchemaGenerator(activeCharacter);
		// 技能 / 托环 / buff 可能需要额外属性槽（咏咒层数、冷却时间戳等）。
		// 必须在 StatContainer 构造前并入 schema，战斗中不能再扩容（Float64Array 固定长度）。
		const slotDeclarations = Player.collectAttributeSlots(activeCharacter, memberData, runtimeAttachments);
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
		this.runtimeAttachments = runtimeAttachments;
		this.installPassiveBehaviorTrees();
	}

	private installPassiveBehaviorTrees(): void {
		for (const skill of this.activeCharacter.skills) {
			const variant = selectPlayerSkillVariant(skill, this.activeCharacter);
			const tree = variant?.passiveBehaviorTree;
			if (!tree) continue;

			this.btManager.registerParallelBt(`passive:${variant.id}:${tree.name}`, tree.definition, tree.agent);
		}
	}

	/**
	 * 安装战前 RuntimeAttachment。
	 *
	 * 必须在 `setEventCatalog` 之后调用 —— 否则 ProcBus 还未就绪，subscription 会被跳过。
	 * MemberManager 负责调用时序。
	 */
	installPrebattleRuntimeAttachments(): void {
		for (const attachment of this.runtimeAttachments) {
			try {
				installRuntimeAttachment(this, attachment);
			} catch (error) {
				log.warn(`安装战前附加效果失败: ${attachment.source.sourceId ?? attachment.source.id}`, error);
			}
		}
	}

	/**
	 * 收集所有需要在 StatContainer 上预分配的属性槽。
	 *
	 * 来源：
	 * - 当前角色自身 `actions` 行为树声明（如 AI 行动计数器）
	 * - 角色已学技能的自定义行为树与默认行为 DSL 的 `attributeSlots` 声明（如爆能的咏咒层数）
	 * - 装备的托环 / passive 的 `attributeSlots` 声明（如 HP 紧急回复的 lastTriggeredFrame）
	 * - 长期注册行为树的 `attributeSlots` 声明（如弧光剑舞层数）
	 *
	 * 命名约定见 `SchemaMerge.ts`：`skill.<id>.<field>` / `passive.<id>.<field>` / `buff.<id>.<field>`。
	 */
	private static collectAttributeSlots(
		activeCharacter: CharacterWithRelations,
		_memberData: MemberWithRelations,
		runtimeAttachments: readonly RuntimeAttachment[],
	): SlotDeclaration[] {
		const slots: SlotDeclaration[] = collectAttachmentSlots(runtimeAttachments);
		// 设计说明：BT agent 实例字段只承载当前执行对象，跨帧变量通过行为树数据声明槽并并入 StatContainer。
		// 这里收集所有已学技能变体，保证战斗中切换分支或装备匹配变体时不会触发运行期扩容。
		Player.collectBtAttributeSlots(slots, activeCharacter.actions);
		for (const skill of activeCharacter.skills) {
			for (const variant of skill.template.variants) {
				Player.collectBehaviorTreeAttributeSlots(slots, variant.activeBehaviorTree);
				Player.collectBehaviorTreeAttributeSlots(slots, variant.passiveBehaviorTree);
				for (const registeredTree of variant.registeredBehaviorTrees ?? []) {
					Player.collectBehaviorTreeAttributeSlots(slots, registeredTree);
				}
				Player.collectBehaviorAttributeSlots(slots, variant.activeBehavior);
				for (const passiveBehavior of variant.passiveBehavior ?? []) {
					Player.collectBehaviorAttributeSlots(slots, passiveBehavior);
				}
				for (const registeredBehavior of variant.registeredBehavior ?? []) {
					Player.collectBehaviorAttributeSlots(slots, registeredBehavior);
				}
			}
		}
		return slots;
	}

	private static collectBtAttributeSlots(slots: SlotDeclaration[], tree: MemberBTTree): void {
		const attributeSlots = (tree as Partial<MemberBTTree>).attributeSlots;
		if (Array.isArray(attributeSlots)) {
			slots.push(...attributeSlots);
		}
	}

	private static collectBehaviorTreeAttributeSlots(slots: SlotDeclaration[], tree: unknown): void {
		const treeRecord = Player.asRecord(tree);
		const attributeSlots = treeRecord?.attributeSlots;
		if (Array.isArray(attributeSlots)) {
			slots.push(...(attributeSlots as SlotDeclaration[]));
		}
	}

	private static collectBehaviorAttributeSlots(slots: SlotDeclaration[], behavior: unknown): void {
		const behaviorRecord = Player.asRecord(behavior);
		const behaviorParams = Player.asRecord(behaviorRecord?.behaviorParams);
		const attributeSlots = behaviorRecord?.attributeSlots ?? behaviorParams?.attributeSlots;
		if (Array.isArray(attributeSlots)) {
			slots.push(...(attributeSlots as SlotDeclaration[]));
		}
	}

	private static asRecord(value: unknown): Record<string, unknown> | null {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	}
}
