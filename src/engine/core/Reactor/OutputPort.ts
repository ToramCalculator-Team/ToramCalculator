import type { ZodType } from "zod";

/**
 * OutputPort：Reactor 的声明式输出槽。
 *
 * schema 同时提供编译期类型安全和运行期契约，供编辑器枚举可连接端口使用。
 * Reaction 体调用 set() 写入值；ReactorScheduler 在层间屏障时传播到下游 InputPort，然后清空。
 * 同一 Tag 内多次 set()，后者覆盖前者（LF Overwriting Outputs 语义）。
 */
export class OutputPort<T> {
	readonly name: string;
	readonly schema: ZodType<T>;
	private _value: T | undefined = undefined;
	private _present = false;

	constructor(name: string, schema: ZodType<T>) {
		this.name = name;
		this.schema = schema;
	}

	/** Reaction 体调用，写入本 Tag 的输出值。 */
	set(value: T): void {
		this._value = value;
		this._present = true;
	}

	get isPresent(): boolean {
		return this._present;
	}

	get value(): T | undefined {
		return this._value;
	}

	/** @internal 由 ReactorScheduler 在层间传播后清空。 */
	_clear(): void {
		this._value = undefined;
		this._present = false;
	}
}
