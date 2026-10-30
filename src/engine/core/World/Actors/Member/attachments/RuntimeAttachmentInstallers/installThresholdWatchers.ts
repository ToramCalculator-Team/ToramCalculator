import type { ThresholdWatcherEffect } from "@db/schema/jsons";
import type { RuntimeAttachment, RuntimeAttachmentMember } from "../RuntimeAttachment";
import { runtimeAttachmentLevel, runtimeAttachmentSourceId } from "../RuntimeAttachmentSource";
import { evaluateHandlerValue, runHandlers } from "./installSubscriptions";

/**
 * 把属性阈值穿越注册为 ProcBus 的 attr.crossed 订阅。
 * registrationId 用于区分同一属性上的不同来源，避免事件交叉触发。
 */
export function installThresholdWatchers(member: RuntimeAttachmentMember, attachment: RuntimeAttachment): void {
	const watchers = attachment.thresholdWatchers ?? [];
	if (!watchers.length) return;
	if (!member.procBus) return;
	const sourceId = runtimeAttachmentSourceId(attachment.source);
	const level = runtimeAttachmentLevel(attachment.source);
	for (const watcher of watchers as readonly ThresholdWatcherEffect[]) {
		const direction = watcher.direction ?? "falling";
		const registrationId = member.attributeThresholdSource.register(
			sourceId,
			watcher.path,
			evaluateHandlerValue(watcher.threshold, member, level),
			direction,
			{ fireOnRegister: watcher.fireOnRegister ?? false },
		);
		let lastFiredTimeMs = Number.NEGATIVE_INFINITY;
		member.procBus.subscribeByName(
			sourceId,
			["attr.crossed"],
			(event) => (event.payload as { registrationId?: number }).registrationId === registrationId,
			(event) => {
				let timeMs: number;
				try {
					timeMs = member.services.getCurrentTimeMs();
				} catch {
					timeMs = member.runtime.currentTimeMs;
				}
				const cooldownMs = watcher.cooldownMs ?? 0;
				if (cooldownMs > 0 && timeMs - lastFiredTimeMs < cooldownMs) return;
				lastFiredTimeMs = timeMs;
				const dir = (event.payload as { direction?: string }).direction ?? direction;
				runHandlers(watcher.handlers, member, attachment, timeMs, `threshold:${watcher.path}:${dir}`);
			},
		);
	}
}

/** 清理该来源注册的全部阈值监视。 */
export function uninstallThresholdWatchers(member: RuntimeAttachmentMember, sourceId: string): void {
	member.attributeThresholdSource.unregisterBySource(sourceId);
}
