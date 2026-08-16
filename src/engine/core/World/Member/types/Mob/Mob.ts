import type { MemberBTTree } from "@db/schema/jsons";
import { PlayerLocomotionProfile } from "~/game/locomotion";
import type { EngineMember } from "../../../../engineScenarioSchema";
import { Member } from "../../Member";
import { MemberRuntimeServicesDefaults } from "../../RuntimeServices";
import { AttributeContainer } from "../../runtime/AttributeContainer/AttributeContainer";
import { mergeSchema, type SlotDeclaration } from "../../runtime/AttributeContainer/SchemaMerge";
import type { ExtractAttrPaths } from "../../runtime/AttributeContainer/SchemaTypes";
import type { MemberStateName } from "../../runtime/State/MemberState";
import type { MobRuntime } from "../../runtime/types";
import { createMobBtBindings } from "./Agents/BtBindings";
import { MobAttrSchema } from "./MobAttrSchema";
import { createMobStateMachine, type MobFSMContext, type MobSpecificEvent } from "./MobStateMachine";

export type MobAttrKey = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<MobAttrKey, MobSpecificEvent, MobFSMContext, MobRuntime> {
	constructor(
		memberData: EngineMember,
		campId: string,
		teamId: string,
		position?: { x: number; y: number; z: number },
	) {
		if (!memberData.mob) {
			throw new Error("Mob数据缺失");
		}
		const baseSchema = MobAttrSchema(memberData.mob);
		// Mob 没有托环安装阶段；解析后的固有 AI 属性槽仍需在构造 AttributeContainer 前声明。
		const slotDeclarations = Mob.collectAttributeSlots(memberData);
		const attrSchema = mergeSchema(baseSchema, slotDeclarations);
		const attributeContainer = new AttributeContainer<MobAttrKey>(attrSchema);

		const runtime: MobRuntime = {
			type: "Mob",
			memberId: memberData.id,
			name: memberData.name,
			campId,
			teamId,
			tickIndex: 0,
			currentTimeMs: 0,
			deltaTimeMs: 0,
			position: position ?? { x: 0, y: 0, z: 0 },
			targetId: memberData.id,
			yaw: 0,
			movement: null,
			verticalVelocity: 0,
			grounded: true,
			locomotion: {
				walkSpeed: PlayerLocomotionProfile.WALK_SPEED,
				runSpeed: PlayerLocomotionProfile.RUN_SPEED,
				gravity: PlayerLocomotionProfile.GRAVITY,
				jumpSpeed: PlayerLocomotionProfile.JUMP_SPEED,
			},
			statusTags: [],
			skillList: [],
			skillCooldowns: [],
			data: null,
			currentSkill: null,
			previousSkill: null,
		};

		super(
			createMobStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			attributeContainer,
			runtime,
			MemberRuntimeServicesDefaults,
			position,
			createMobBtBindings,
		);
	}

	/**
	 * 使用 XState snapshot.matches 读取 FSM 当前动作状态。
	 * Mob 不再在 FSM 里定义技能阶段；技能状态由 member-flow BT 声明。
	 */
	protected resolveFsmState(): MemberStateName {
		const snapshot = this.actor.getSnapshot();
		if (snapshot.matches("死亡")) return "dead";
		if (snapshot.matches({ 存活: { 可操作状态: "控制状态" } })) return "controlled";
		return "idle";
	}

	/** 收集 Mob 行为树声明的持久化属性槽，保证 BT 变量随 AttributeContainer checkpoint。 */
	private static collectAttributeSlots(memberData: EngineMember): SlotDeclaration[] {
		const slots: SlotDeclaration[] = [];
		Mob.collectBtAttributeSlots(slots, memberData.resolvedBehavior);
		return slots;
	}

	private static collectBtAttributeSlots(slots: SlotDeclaration[], tree: MemberBTTree): void {
		const attributeSlots = (tree as Partial<MemberBTTree>).attributeSlots;
		if (Array.isArray(attributeSlots)) {
			slots.push(...attributeSlots);
		}
	}
}
