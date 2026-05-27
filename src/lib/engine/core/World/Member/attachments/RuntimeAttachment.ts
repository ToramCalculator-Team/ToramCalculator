import type {
	EventSubscriptionEffect,
	PipelinePatchEffect,
	RegistletHandler,
	RegistletValue,
	ThresholdWatcherEffect,
} from "@db/schema/jsons";
import type { Member } from "../Member";
import type { SlotDeclaration } from "../runtime/StatContainer/SchemaMerge";
import type { ModifierSource, ModifierType } from "../runtime/StatContainer/StatContainer";
import type { MemberEventType, MemberStateContext } from "../runtime/StateMachine/types";
import type { MemberSharedRuntime } from "../runtime/types";

/** 泛化的 Member 类型别名，供战前附加效果安装器跨 Player / Mob 使用。 */
export type RuntimeAttachmentMember<TExtraAttrKey extends string = string> = Member<string, MemberEventType, MemberStateContext, MemberSharedRuntime<TExtraAttrKey>>;

export type RuntimeAttachmentSourceType = ModifierSource["type"];

/**
 * 战前附加效果来源。
 *
 * 设计说明：
 * - `id` 保留来源表或业务对象的稳定 id。
 * - `sourceId` 是运行时卸载前缀；历史数据已有完整前缀时可显式传入，避免迁移期改变清理边界。
 */
export interface RuntimeAttachmentSource {
	id: string;
	name: string;
	type: RuntimeAttachmentSourceType;
	level?: number;
	maxLevel?: number;
	sourceId?: string;
}

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

export type RuntimeAttachmentHandler = RegistletHandler;
export type RuntimeAttachmentValue = RegistletValue;

export function runtimeAttachmentSourceId(source: RuntimeAttachmentSource): string {
	return source.sourceId ?? `${source.type}.${source.id}`;
}

export function runtimeAttachmentLevel(source: RuntimeAttachmentSource): number {
	const rawLevel = source.level ?? 0;
	if (source.maxLevel === undefined) return Math.max(0, rawLevel);
	return Math.max(0, Math.min(rawLevel, source.maxLevel));
}

export function collectAttachmentSlots(attachments: readonly RuntimeAttachment[]): SlotDeclaration[] {
	const slots: SlotDeclaration[] = [];
	for (const attachment of attachments) {
		if (attachment.attributeSlots) {
			slots.push(...attachment.attributeSlots);
		}
	}
	return slots;
}
