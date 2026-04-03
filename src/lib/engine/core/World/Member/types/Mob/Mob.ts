import type { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import { MobBtBindings, MobContext } from "./Agents/Context";
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
	MobContext
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

		// 重要：context 必须是每个成员独立的对象，且引用在构造后不可再被替换
		const context: MobContext = {
			...MobContext,
			owner: undefined,
			position: position ?? { x: 0, y: 0, z: 0 },
			// Responsibility: share the same initial target snapshot with the FSM.
			// Purpose: avoid Mob runtime starting with different targetId values in
			// shared context vs. state-machine context.
			targetId: memberData.id,
		};

		super(
			createMobStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			context,
			position,
			MobBtBindings,
		);

		// 完成 owner 回填
		this.context.owner = this;
	}
}
