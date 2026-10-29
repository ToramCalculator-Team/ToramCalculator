import type { MemberBTTree } from "@db/schema/jsons";
import { DefaultMobLocomotionProfile } from "~/game/locomotion";
import type { WorldMember } from "../../../ScenarioSchema";
import { AttributeContainer } from "../../AttributeContainer/AttributeContainer";
import { mergeSchema, type SlotDeclaration } from "../../AttributeContainer/SchemaMerge";
import type { ExtractAttrPaths } from "../../AttributeContainer/SchemaTypes";
import { Member } from "../../Member";
import type { MobRuntime } from "../../runtime/SharedRuntime";
import { createMobControlBehaviorBindings } from "./ControlBehavior/Bindings";
import { createMobEffectBindings } from "./EffectBehavior/Bindings";
import { type MobAttrNestedSchema, MobAttrSchema } from "./MobAttrSchema";
import { createMobStateMachine, type MobFSMContext, type MobFSMEvent } from "./MobStateMachine";

export type MobAttrKey = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<MobAttrNestedSchema, MobFSMEvent, MobFSMContext, MobRuntime> {
	constructor(memberData: WorldMember, campId: string, teamId: string, position?: { x: number; y: number; z: number }) {
		if (!memberData.mob) {
			throw new Error("Mob数据缺失");
		}
		const baseSchema = MobAttrSchema(memberData.mob);
		// Mob 没有托环安装阶段；解析后的固有 AI 属性槽仍需在构造 AttributeContainer 前声明。
		const slotDeclarations = Mob.collectAttributeSlots(memberData);
		const attrSchema = mergeSchema(baseSchema, slotDeclarations);
		const attributeContainer = new AttributeContainer(attrSchema);

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
				walkSpeed: DefaultMobLocomotionProfile.WALK_SPEED,
				runSpeed: DefaultMobLocomotionProfile.RUN_SPEED,
				gravity: DefaultMobLocomotionProfile.GRAVITY,
				jumpSpeed: DefaultMobLocomotionProfile.JUMP_SPEED,
			},
			statusTags: [],
			skillList: [],
			skillCooldowns: [],
			data: null,
			currentSkill: null,
			nextSkillExecutionInstance: 0,
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
			position,
			createMobControlBehaviorBindings,
			createMobEffectBindings,
		);
	}

	/** 收集 Mob 行为树声明的持久化属性槽，保证 BT 变量随 AttributeContainer checkpoint。 */
	private static collectAttributeSlots(memberData: WorldMember): SlotDeclaration[] {
		const slots: SlotDeclaration[] = [];
		if (memberData.resolvedBehavior) Mob.collectBtAttributeSlots(slots, memberData.resolvedBehavior);
		return slots;
	}

	private static collectBtAttributeSlots(slots: SlotDeclaration[], tree: MemberBTTree): void {
		const attributeSlots = (tree as Partial<MemberBTTree>).attributeSlots;
		if (Array.isArray(attributeSlots)) {
			slots.push(...attributeSlots);
		}
	}
}
