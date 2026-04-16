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
	/** overlay 作用域：先从 member/skill 两层开始。 */
	scope: "member" | "skill";
	sourceType: string;
	sourceId: string;
	/** 优先级：数值越大越后应用。 */
	priority: number;
	/** revision 变更用于触发 resolver 缓存失效。 */
	revision: number;
	pipelineName: string;
	operations: readonly OverlayOperation[];
}

