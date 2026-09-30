import type { ModifierSource } from "../runtime/AttributeContainer/AttributeContainer";

/** 来源类型同时用于 modifier provenance 和 attachment 的默认命名空间。 */
export type RuntimeAttachmentSourceType = ModifierSource["type"];

/**
 * 一个 attachment 的稳定来源身份。
 * sourceId 是安装、卸载、订阅清理和 pipeline overlay 清理共用的边界。
 */

export interface RuntimeAttachmentSource {
	id: string;
	name: string;
	type: RuntimeAttachmentSourceType;
	level?: number;
	maxLevel?: number;
	sourceId?: string;
}

/** 未显式提供 sourceId 时，使用 type.id 生成稳定的默认身份。 */
export function runtimeAttachmentSourceId(source: RuntimeAttachmentSource): string {
	return source.sourceId ?? `${source.type}.${source.id}`;
}

/**
 * 为来源生成 modifier provenance。
 * effectId 只标识来源内部的具体效果，不改变 attachment 的卸载前缀。
 */
export function runtimeAttachmentModifierSource(
	memberId: string,
	source: RuntimeAttachmentSource,
	key = runtimeAttachmentSourceId(source),
	effectId?: string,
): ModifierSource {
	return {
		key,
		name: source.name,
		type: source.type,
		chain: [
			{ kind: "member", id: memberId },
			{ kind: source.type, id: source.id },
			...(effectId ? [{ kind: "effect" as const, id: effectId }] : []),
		],
	};
}

/** 将来源等级限制在非负值和模板允许的最大等级之间。 */
export function runtimeAttachmentLevel(source: RuntimeAttachmentSource): number {
	const rawLevel = source.level ?? 0;
	if (source.maxLevel === undefined) return Math.max(0, rawLevel);
	return Math.max(0, Math.min(rawLevel, source.maxLevel));
}
