import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";
import type { MemberType } from "@db/schema/enums";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { StageData } from "../../../../Pipeline/stageEnv";
import type { MemberDomainEvent } from "../../../../types";
import type { AttributeWatcherRegistry } from "../AttributeWatcher/AttributeWatcher";
import type { ProcBus } from "../ProcBus/ProcBus";
import type { StatContainer } from "../StatContainer/StatContainer";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import type { MemberRuntimeServices } from "./RuntimeServices";

export interface BtTreeController {
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): unknown;
	unregisterParallelBt(name: string): void;
	hasBuff(name: string): boolean;
}

/**
 * Member 提供给 BT 的能力边界。
 *
 * 设计说明：
 * - BtManager 只依赖这份 env，不依赖完整 Member 类。
 * - 运行期仍挂在 BtContext.owner 上，保留现有 MDSL / agent 的 `this.owner` 访问方式。
 */
export interface MemberBtEnv<
	TAttrKey extends string = string,
	TStateEvent extends MemberEventType = MemberEventType,
	_TStateContext extends MemberStateContext = MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> {
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	position: { x: number; y: number; z: number };
	runtime: TRuntime;
	statContainer: StatContainer<TAttrKey>;
	services: MemberRuntimeServices;
	btManager: BtTreeController;
	procBus: ProcBus | null;
	attributeWatchers: AttributeWatcherRegistry<TAttrKey>;
	renderState: { lastAction?: { name: string; ts: number; params?: Record<string, unknown> } };
	notifyDomainEvent(event: MemberDomainEvent): void;
	runPipeline(pipelineName: string, params?: Record<string, unknown>): StageData;
	send(event: TStateEvent): void;
}

/**
 * BT 执行期上下文的最小公共形状。
 *
 * 说明：
 * - BT 上下文由 `BtManager.buildBtContext()` 构建，并通过只读 getter 暴露 `member.runtime` 字段。
 * - 字段全部扁平，直接对应 `MemberSharedRuntime` 的同名字段，MDSL 可直接 `$字段名` 引用。
 * - FSM 是这些字段的唯一写入方；BT 仅读取。
 */
export interface BtContext<
	TAttrKey extends string = string,
	TStateEvent extends MemberEventType = MemberEventType,
	TStateContext extends MemberStateContext = MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> extends MemberSharedRuntime {
	owner?: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>;
	runtime?: TRuntime;
	statusTags: string[];
	targetId: string;
	position: { x: number; y: number; z: number };

	currentSkill?: CharacterSkillWithRelations | null;
	previousSkill?: CharacterSkillWithRelations | null;
	currentSkillVariant?: SkillVariantWithRelations | null;
	currentSkillBranchParams?: Record<string, number>;

	/** 当前技能生命周期的四段毫秒（FSM 在"执行技能中"进入时由管线计算一次，BT 只读）。 */
	currentSkillStartupMs?: number;
	currentSkillChargingMs?: number;
	currentSkillChantingMs?: number;
	currentSkillActionMs?: number;
}
