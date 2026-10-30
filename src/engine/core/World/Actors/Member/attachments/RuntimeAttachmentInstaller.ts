import type { RuntimeAttachment, RuntimeAttachmentMember } from "./RuntimeAttachment";
import { installModifiers, uninstallModifiers } from "./RuntimeAttachmentInstallers/installModifiers";
import { installPipelinePatches, uninstallPipelinePatches } from "./RuntimeAttachmentInstallers/installPipelinePatches";
import { installSubscriptions } from "./RuntimeAttachmentInstallers/installSubscriptions";
import {
	installThresholdWatchers,
	uninstallThresholdWatchers,
} from "./RuntimeAttachmentInstallers/installThresholdWatchers";
import { type RuntimeAttachmentSource, runtimeAttachmentSourceId } from "./RuntimeAttachmentSource";

/**
 * RuntimeAttachment 的统一门面。
 * 具体能力由分能力 installer 处理，这里只保证安装顺序、幂等清理和批量编排。
 */

/** 按 sourceId 清理该来源产生的全部运行时效果。 */
export function uninstallRuntimeAttachment(member: RuntimeAttachmentMember, source: RuntimeAttachmentSource): void {
	const sourceId = runtimeAttachmentSourceId(source);
	uninstallPipelinePatches(member, sourceId);
	member.procBus?.unsubscribeBySource(sourceId);
	uninstallThresholdWatchers(member, sourceId);
	uninstallModifiers(member, sourceId);
}

/**
 * 幂等安装单个 attachment：先清理同一来源，再按能力写入运行时组件。
 * 调用方必须在成员所需服务注入完成后调用此函数。
 */
export function installRuntimeAttachment<TExtraAttrKey extends string = string>(
	member: RuntimeAttachmentMember<TExtraAttrKey>,
	attachment: RuntimeAttachment<TExtraAttrKey>,
): void {
	uninstallRuntimeAttachment(member, attachment.source);
	installModifiers(member, attachment);
	installPipelinePatches(member, attachment);
	installSubscriptions(member, attachment);
	installThresholdWatchers(member, attachment);
}

/** 按声明顺序安装多个来源，单个来源仍保持幂等。 */
export function installRuntimeAttachments<TExtraAttrKey extends string = string>(
	member: RuntimeAttachmentMember<TExtraAttrKey>,
	attachments: readonly RuntimeAttachment<TExtraAttrKey>[],
): void {
	for (const attachment of attachments) installRuntimeAttachment(member, attachment);
}
