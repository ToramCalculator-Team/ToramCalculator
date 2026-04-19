/**
 * 管线指令模型（二元运算 / 三地址码）。
 */

/** 支持的运算符集合（有限闭集）。 */
export type InstructionOp =
	| "+"
	| "-"
	| "*"
	| "/"
	| "%"
	| "^"
	| "max"
	| "min"
	| "clamp"
	| "floor"
	| "ceil"
	| "round"
	| "abs"
	| ">"
	| ">="
	| "<"
	| "<="
	| "=="
	| "!="
	| "and"
	| "or"
	| "not"
	| "select"
	| "get"
	| "eval"
	// 副作用：向编排层派发事件。a = 事件名（字符串字面量），b = 可选 payload 表达式；
	// target 写入一个布尔标志（1 = 已派发）。
	| "emit";

/** 操作数：数字字面量 / 变量引用 / 属性路径字符串。 */
export type Operand = number | string;

/** 单条三地址指令：target = a op b。 */
export interface PipelineInstruction {
	/** 目标变量名（在单条管线内应唯一，也作为 overlay 锚点）。 */
	target: string;
	/** 运算符。 */
	op: InstructionOp;
	/** 第一个操作数。 */
	a: Operand;
	/** 第二个操作数（对 floor/abs/not 等一元运算可省略）。 */
	b?: Operand;
}

/** 规范字符串形式：`target = a op b` */
export type PipelineInstructionString = string;

export {
	parseInstruction,
	parsePipeline,
	serializeInstruction,
	serializePipeline,
} from "./InstructionParser";

