import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberBTTree } from "@db/schema/jsons";
import { Member } from "../../Member";
import { MemberRuntimeServicesDefaults } from "../../runtime/Agent/RuntimeServices";
import { mergeSchema, type SlotDeclaration } from "../../runtime/StatContainer/SchemaMerge";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { MobRuntime } from "../../runtime/types";
import { MobBtBindings } from "./Agents/BtBindings";
import { MobAttrSchema } from "./MobAttrSchema";
import { createMobStateMachine, type MobEventType, type MobStateContext } from "./MobStateMachine";

export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<MobAttrType, MobEventType, MobStateContext, MobRuntime> {
	constructor(
		memberData: MemberWithRelations,
		campId: string,
		teamId: string,
		position?: { x: number; y: number; z: number },
	) {
		if (!memberData.mob) {
			throw new Error("Mob数据缺失");
		}
		const baseSchema = MobAttrSchema(memberData.mob);
		// Mob 没有托环安装阶段；自身 actions 行为树的持久化变量仍需在构造 StatContainer 前声明。
		const slotDeclarations = Mob.collectAttributeSlots(memberData);
		const attrSchema = mergeSchema(baseSchema, slotDeclarations);
		const statContainer = new StatContainer<MobAttrType>(attrSchema);

		const runtime: MobRuntime = {
			type: "Mob",
			tickIndex: 0,
			currentTimeMs: 0,
			deltaTimeMs: 0,
			position: position ?? { x: 0, y: 0, z: 0 },
			targetId: memberData.id,
			statusTags: [],
			skillList: [],
			skillCooldowns: [],
			character: null,
		};

		super(
			createMobStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			runtime,
			MemberRuntimeServicesDefaults,
			position,
			MobBtBindings,
		);
	}

	/** 收集 Mob 行为树声明的持久化属性槽，保证 BT 变量随 StatContainer checkpoint。 */
	private static collectAttributeSlots(memberData: MemberWithRelations): SlotDeclaration[] {
		const slots: SlotDeclaration[] = [];
		if (memberData.mob) {
			Mob.collectBtAttributeSlots(slots, memberData.mob.actions);
		}
		return slots;
	}

	private static collectBtAttributeSlots(slots: SlotDeclaration[], tree: MemberBTTree): void {
		const attributeSlots = (tree as Partial<MemberBTTree>).attributeSlots;
		if (Array.isArray(attributeSlots)) {
			slots.push(...attributeSlots);
		}
	}
}
