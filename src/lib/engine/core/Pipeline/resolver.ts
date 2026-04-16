import type { PipelineName } from "./catalog";
import type { PipelineInstruction } from "./instruction";
import type { PipelineOverlay } from "./overlay";
 
/**
 * Resolver 相关类型。
 */

export interface ResolvedPipeline {
	/** 最终指令序列（基础 + overlays 应用后的结果）。 */
	instructions: readonly PipelineInstruction[];
	/** 用于缓存编译结果的签名。 */
	signature: string;
	/** 调试追踪：标注每条指令来自哪个层。 */
	trace?: readonly {
		target: string;
		source: "base" | "overlay";
		sourceId?: string;
	}[];
}

export interface PipelineResolverService {
	resolve(pipelineName: PipelineName, overlays: readonly PipelineOverlay[]): ResolvedPipeline;
}

