import type { Member } from "../World/Member/Member";
import type { MemberContext } from "../World/Member/MemberContext";
import type { MemberRuntimeServices } from "../World/Member/runtime/Agent/RuntimeServices";
import type { StatContainer } from "../World/Member/runtime/StatContainer/StatContainer";
import type { MemberEventType, MemberStateContext } from "../World/Member/runtime/StateMachine/types";

type AnyMemberRef = Member<string, MemberEventType, MemberStateContext, MemberContext & Record<string, unknown>>;

export interface PipelineExecutionMeta {
	pipelineName: string;
	stageName?: string;
	traceId?: string;
	frame?: number;
	sourceType?: string;
	sourceId?: string;
	skillId?: string;
	ringId?: string;
}

/**
 * 单次 pipeline 执行的工作台。
 *
 * 设计目标：
 * - 以“引用共享 runtime + 持有本次 scratch/output”为主
 * - 避免把中间值直接污染到成员共享 member.context
 * - 为后续把 pipeline 从 BT/FSM 中解耦提供稳定类型边界
 */
export interface PipelineExecutionContext<
	TRuntimeState extends MemberContext = MemberContext,
	TAttrKey extends string = string,
	TInput = Record<string, unknown>,
	TScratch extends Record<string, unknown> = Record<string, unknown>,
	TOutput = Record<string, unknown>,
> {
	/** 当前执行主体，一般为本次结算真正被更新的成员。 */
	subject: AnyMemberRef | undefined;
	/** 可选来源成员。 */
	source?: AnyMemberRef;
	/** 可选目标成员。 */
	target?: AnyMemberRef;
	/** 主体共享运行时状态视图（长期对象引用）。 */
	memberContext: TRuntimeState;
	/** 主体数值属性容器。 */
	stats?: StatContainer<TAttrKey>;
	/** 引擎注入服务引用。 */
	services: MemberRuntimeServices;
	/** 本次输入。 */
	input: TInput;
	/** 本次执行中间值。 */
	scratch: TScratch;
	/** 本次输出。 */
	output: TOutput;
	/** 本次执行元信息。 */
	meta: PipelineExecutionMeta;
}
