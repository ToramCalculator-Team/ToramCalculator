import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { GameEngine } from "../../../GameEngine";
import { Member } from "../../Member";
import { DefaultAgent, type RuntimeContext } from "../../runtime/Agent/RuntimeContext";
import type { ExtractAttrPaths } from "../../runtime/StatContainer/SchemaTypes";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
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
	RuntimeContext
> {
	constructor(
		engine: GameEngine,
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
		const runtimeContext: RuntimeContext = {
			...DefaultAgent,
		};

		super(
			createMobStateMachine,
			engine,
			campId,
			teamId,
			memberData,
			attrSchema,
			statContainer,
			runtimeContext,
			position,
		);

		// 通过引擎消息通道发送渲染命令（走 Simulation.worker 的 MessageChannel）
		const spawnCmd = {
			type: "render:cmd" as const,
			cmd: {
				type: "spawn" as const,
				entityId: this.id,
				name: this.name,
				position: { x: 0, y: 1, z: 0 },
				seq: 0,
				ts: Date.now(),
			},
		};

		// 引擎统一出口：通过已建立的MessageChannel发送渲染指令
		if (this.engine.postRenderMessage) {
			// 首选方案：使用引擎提供的统一渲染消息接口
			// 这个方法会通过 Simulation.worker 的 MessagePort 将指令发送到主线程
			this.engine.postRenderMessage(spawnCmd);
		} else {
			// 如果引擎的渲染消息接口不可用，记录错误但不使用fallback
			// 这确保我们只使用正确的通信通道，避免依赖全局变量
			console.error(
				`👤 [${this.name}] 无法发送渲染指令：引擎渲染消息接口不可用`,
			);
		}
	}
}
