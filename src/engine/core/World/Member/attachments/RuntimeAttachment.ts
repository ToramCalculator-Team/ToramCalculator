import type {
	EventSubscriptionEffect,
	PipelinePatchEffect,
	RegistletHandler,
	RegistletValue,
	ThresholdWatcherEffect,
} from "@db/schema/jsons";
import type { Member } from "../Member";
import type { ModifierSource, ModifierType } from "../runtime/AttributeContainer/AttributeContainer";

export {
	type RuntimeAttachmentSource,
	type RuntimeAttachmentSourceType,
	runtimeAttachmentLevel,
	runtimeAttachmentModifierSource,
	runtimeAttachmentSourceId,
} from "./RuntimeAttachmentSource";

import type { SlotDeclaration } from "../runtime/AttributeContainer/SchemaMerge";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { RuntimeAttachmentSource } from "./RuntimeAttachmentSource";

/**
 * Attachment 安装器所需的最小 Member 运行时视图。
 * attachment 不参与 FSM，因此放宽 FSM 类型参数，只依赖成员运行时服务和运行时组件。
 */
export type RuntimeAttachmentMember<TExtraAttrKey extends string = string> = Member<
	TExtraAttrKey,
	any,
	any,
	MemberSharedRuntime<TExtraAttrKey>
>;

/** 一个来源直接贡献的静态或战前属性修正。 */
export interface RuntimeModifierEffect<TAttrKey extends string = string> {
	attribute: TAttrKey;
	modifierType: ModifierType;
	value: number;
	/** 缺省时由 attachment.source 派生 ModifierSource。 */
	source?: ModifierSource;
}

/**
 * Member 战前附加效果的统一声明。
 *
 * collector 按来源产生本结构，installer 按能力写入运行时组件。
 */
export interface RuntimeAttachment<TAttrKey extends string = string> {
	source: RuntimeAttachmentSource;
	attributeSlots?: readonly SlotDeclaration[];
	modifiers?: readonly RuntimeModifierEffect<TAttrKey>[];
	pipelinePatches?: readonly PipelinePatchEffect[];
	subscriptions?: readonly EventSubscriptionEffect[];
	thresholdWatchers?: readonly ThresholdWatcherEffect[];
}

/** 事件订阅和阈值监听触发时执行的声明式动作。 */
export type RuntimeAttachmentHandler = RegistletHandler;
export type RuntimeAttachmentValue = RegistletValue;

/**
 * 在 AttributeContainer 创建前收集所有来源声明的槽位。
 * Float64Array 创建后不能扩容，因此该函数必须在安装 attachment 之前调用。
 */
export function collectAttachmentSlots(attachments: readonly RuntimeAttachment[]): SlotDeclaration[] {
	const slots: SlotDeclaration[] = [];
	for (const attachment of attachments) {
		if (attachment.attributeSlots) {
			slots.push(...attachment.attributeSlots);
		}
	}
	return slots;
}
