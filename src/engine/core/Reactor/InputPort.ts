import type { ZodType } from "zod";

/**
 * InputPort：Reactor 的声明式输入槽。
 *
 * schema 同时提供编译期类型安全和运行期契约，供编辑器枚举可连接端口使用。
 * 每个 Tag 开始时由 ReactorScheduler 填充，Tag 结束时清空。
 */
export class InputPort<T> {
	readonly name: string;
	readonly schema: ZodType<T>;
	private _value: T | undefined = undefined;
	private _present = false;

	constructor(name: string, schema: ZodType<T>) {
		this.name = name;
		this.schema = schema;
	}

	get isPresent(): boolean {
		return this._present;
	}

	get value(): T | undefined {
		return this._value;
	}

	/** @internal 由 ReactorScheduler 在层间传播时调用。验证失败时抛出 ZodError。 */
	_set(value: unknown): void {
		this._value = this.schema.parse(value) as T;
		this._present = true;
	}

	/** @internal */
	_clear(): void {
		this._value = undefined;
		this._present = false;
	}
}
