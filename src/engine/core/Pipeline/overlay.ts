import type { Operand, PipelineInstruction } from "./instruction";

/**
 * overlay 用于在不修改基础管线定义的前提下，对“最终指令序列”做可序列化的增量变更。
 * 变更锚点以 instruction.target（变量名）为准。
 */

export type OverlayOperation =
	| { kind: "insertAfter"; anchor: string; instructions: PipelineInstruction[] }
	| { kind: "insertBefore"; anchor: string; instructions: PipelineInstruction[] }
	| { kind: "replaceInstruction"; target: string; instruction: PipelineInstruction }
	| { kind: "removeInstruction"; target: string }
	| { kind: "replaceOperand"; target: string; operand: "a" | "b"; newValue: Operand }
	| { kind: "replacePipeline"; instructions: PipelineInstruction[] };

export interface PipelineOverlay {
	id: string;
	sourceType: string;
	sourceId: string;
	/** 优先级：数值越大越后应用。 */
	priority: number;
	pipelineName: string;
	operations: readonly OverlayOperation[];
}
