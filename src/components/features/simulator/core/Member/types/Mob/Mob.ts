import type { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import { MobRuntimeContext } from "./Agents/RuntimeContext";
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
	MobRuntimeContext
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

		// 重要：runtimeContext 必须是每个成员独立的对象，且引用在构造后不可再被替换
		const runtimeContext: MobRuntimeContext = {
			...MobRuntimeContext,
			owner: undefined,
			position: position ?? { x: 0, y: 0, z: 0 },
		};

		super(
			createMobStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			runtimeContext,
			position,
		);

		// 完成 owner 回填
		this.runtimeContext.owner = this;
	}
}
