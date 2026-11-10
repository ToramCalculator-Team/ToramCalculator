import type {Read, Write} from "./types";

/**
 * A state variable. This class refines the Read interface by letting `get`
 * return T rather than T | Absent. If the state should be nullable or
 * uninitialized, this has to be reflected explicitly in T.
 * 状态变量。此类细化了 `Read` 接口，使 `get` 返回 `T` 而不是 `T | Absent`。
 * 若状态允许为空或未初始化，应在类型 `T` 中显式表达。
 */
export class State<T> implements Read<T>, Write<T> {
  /**
   * Create a new state variable and assign it an initial value.
   * 创建状态变量并设置初始值。
   * @param value The initial value to assign to this state variable.
   */
  constructor(private value: T) {}

  /**
   * Return the current value of this state variable.
   * 返回此状态变量的当前值。
   */
  get(): T {
    return this.value;
  }

  /**
   * Set the current value of this state variable.
   * 设置此状态变量的当前值。
   * @param value
   */
  set(value: T): void {
    this.value = value;
  }
}
