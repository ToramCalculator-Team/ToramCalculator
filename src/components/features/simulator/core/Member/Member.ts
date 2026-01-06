import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberType } from "@db/schema/enums";
import { createActor } from "xstate";
import type { GameEngine } from "../GameEngine";
import type { CommonRuntimeContext } from "./runtime/Agent/CommonRuntimeContext";
import { BtManager } from "./runtime/BehaviourTree/BtManager";
import type { NestedSchema } from "./runtime/StatContainer/SchemaTypes";
import type { StatContainer } from "./runtime/StatContainer/StatContainer";
import type {
	MemberActor,
	MemberEventType,
	MemberStateContext,
	MemberStateMachine,
} from "./runtime/StateMachine/types";

export interface MemberSerializeData {
	attrs: Record<string, unknown>;
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	position: {
		x: number;
		y: number;
		z: number;
	};
}

export class Member<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntimeContext extends CommonRuntimeContext & Record<string, unknown>,
> {
	/** 成员ID */
	id: string;
	/** 成员类型 */
	type: MemberType;
	/** 成员名称 */
	name: string;
	/** 所属阵营ID */
	campId: string;
	/** 所属队伍ID */
	teamId: string;
	/** 属性Schema（用于编译表达式等） */
	dataSchema: NestedSchema;
	/** 响应式系统实例（用于稳定导出属性） */
	statContainer: StatContainer<TAttrKey>;
	/** 运行时上下文 */
	runtimeContext: TRuntimeContext;
	/** 行为树管理器 */
	btManager: BtManager<TAttrKey, TStateEvent, TStateContext>;
	/** 成员Actor引用 */
	actor: MemberActor<TStateEvent, TStateContext>;
	/** 引擎引用 */
	engine: GameEngine;
	/** 成员数据 */
	data: MemberWithRelations;
	/** 位置信息 */
	position: { x: number; y: number; z: number };

	constructor(
		stateMachine: (
			member: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>,
		) => MemberStateMachine<TStateEvent, TStateContext>,
		engine: GameEngine,
		campId: string,
		teamId: string,
		memberData: MemberWithRelations,
		dataSchema: NestedSchema,
		statContainer: StatContainer<TAttrKey>,
		runtimeContext: TRuntimeContext,
		position?: { x: number; y: number; z: number },
	) {
		this.id = memberData.id;
		this.type = memberData.type;
		this.name = memberData.name;
		this.engine = engine;
		this.campId = campId;
		this.teamId = teamId;
		this.runtimeContext = runtimeContext;
		this.dataSchema = dataSchema;
		this.data = memberData;

		// 初始化响应式系统
		this.statContainer = statContainer;

		// 初始化行为树管理器
		this.btManager = new BtManager(this);

		this.position = position ?? { x: 0, y: 0, z: 0 };

		// 创建并启动状态机
		this.actor = createActor(stateMachine(this), {
			id: memberData.id,
		});
		this.actor.start();
	}

	/** 序列化方法 */
	serialize(): MemberSerializeData {
		return {
			attrs: this.statContainer.exportNestedValues(),
			id: this.id,
			type: this.type,
			name: this.name,
			campId: this.campId,
			teamId: this.teamId,
			position: this.position,
		};
	}

	/**
	 * 新的执行入口：每帧 tick
	 */
	tick(frame: number): void {
		// 更新状态机
		// 由于 TStateEvent extends MemberEventType，而 MemberEventType 包含 MemberUpdateEvent，
		// 所以 MemberUpdateEvent 总是 TStateEvent 的子类型，这里使用类型断言是安全的
		this.actor.send({ type: "update", timestamp: frame } as TStateEvent);

		// 更新行为树
		this.btManager.tickAll();
	}
}
