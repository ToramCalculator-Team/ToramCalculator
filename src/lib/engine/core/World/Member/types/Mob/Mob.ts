import type { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import { MemberRuntimeServicesDefaults } from "../../runtime/Agent/RuntimeServices";
import { mergeSchema, type SlotDeclaration } from "../../runtime/StatContainer/SchemaMerge";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { MobRuntime } from "../../runtime/types";
import { MobBtBindings } from "./Agents/BtBindings";
import { MobAttrSchema } from "./MobAttrSchema";
import {
	createMobStateMachine,
	type MobEventType,
	type MobStateContext,
} from "./MobStateMachine";

export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<
	MobAttrType,
	MobEventType,
	MobStateContext,
	MobRuntime
> {
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
		// Mob 目前没有托环；预留入口便于将来怪物技能也能声明槽。
		const slotDeclarations = Mob.collectAttributeSlots(memberData);
		const attrSchema = mergeSchema(baseSchema, slotDeclarations);
		const statContainer = new StatContainer<MobAttrType>(attrSchema);

		const runtime: MobRuntime = {
			type: "Mob",
			currentFrame: 0,
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

	/** 预留入口，当前为空。Mob 技能数据模型补齐后在此收集 attribute slots。 */
	private static collectAttributeSlots(_memberData: MemberWithRelations): SlotDeclaration[] {
		return [];
	}
}
