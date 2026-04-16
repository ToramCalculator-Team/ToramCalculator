import type { PipelineInstruction } from "./instruction";

/**
 * PipelineCatalog：引擎级别“冻结”的基础管线定义来源。
 * - 只读：刻意不提供 register/replace 等可变 API
 * - 供后续 Resolver 缓存与 overlay 叠加使用
 */

export type PipelineName = string;

export interface PipelineDef {
	name: PipelineName;
	instructions: readonly PipelineInstruction[];
}

export interface PipelineCatalog {
	/** 基础定义变更版本号（用于缓存失效）。 */
	readonly version: number;
	/** 获取基础指令序列（overlay 不能直接修改该序列）。 */
	getBase(name: PipelineName): readonly PipelineInstruction[] | undefined;
	/** 枚举所有基础管线名称。 */
	getNames(): readonly PipelineName[];
}

