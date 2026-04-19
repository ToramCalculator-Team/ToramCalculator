/**
 * Registlet overlay 清理工具。
 *
 * `Member.pipelineOverlays` 是一个数组，registlet 安装时追加若干 overlay 条目（用 registlet 派生的
 * sourceId 标识），卸载时按 sourceId 原样移除。
 */

import type { PipelineOverlay } from "../../../Pipeline/overlay";
import type { AnyMember } from "./types";

/** 从 member 的 overlays 数组中移除所有 sourceId 匹配的条目。 */
export function removeOverlaysBySourceId(member: AnyMember, sourceId: string): void {
	for (let i = member.pipelineOverlays.length - 1; i >= 0; i--) {
		if (member.pipelineOverlays[i]?.sourceId === sourceId) {
			member.pipelineOverlays.splice(i, 1);
		}
	}
}

/**
 * 便捷构造：创建一条 overlay 条目的公共字段，registlet 安装时只需填 `pipelineName` / `operations`。
 */
export function buildOverlay(params: {
	id: string;
	sourceId: string;
	pipelineName: string;
	priority?: number;
	operations: PipelineOverlay["operations"];
}): PipelineOverlay {
	return {
		id: params.id,
		scope: "member",
		sourceType: "registlet",
		sourceId: params.sourceId,
		priority: params.priority ?? 0,
		revision: 1,
		pipelineName: params.pipelineName,
		operations: params.operations,
	};
}
