import type { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import { MemberRuntimeServicesDefaults } from "../../runtime/Agent/RuntimeServices";
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
		const attrSchema = MobAttrSchema(memberData.mob);
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
}
