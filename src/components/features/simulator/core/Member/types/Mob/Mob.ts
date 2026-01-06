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
		renderMessageSender: ((payload: unknown) => void) | null,
		position?: { x: number; y: number; z: number },
	) {
		if (!memberData.mob) {
			throw new Error("Mob数据缺失");
		}
		const attrSchema = MobAttrSchema(memberData.mob);
		const statContainer = new StatContainer<MobAttrType>(attrSchema);

		super(
			createMobStateMachine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			MobRuntimeContext,
			renderMessageSender,
			position,
		);

		// 初始化运行时上下文
		this.runtimeContext = {
			...MobRuntimeContext,
			owner: this,
			position: position ?? { x: 0, y: 0, z: 0 },
		}
	}
}
