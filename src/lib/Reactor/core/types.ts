import type {Tag, TimeValue} from "./time";

/**
 * A variable can be read, written to, or scheduled. Variables may be passed to
 * reactions in an argument list.
 * @see Read
 * @see Write
 * @see Sched
 * 可读取、写入或调度的变量类型。变量可以作为参数传递给反应。
 */
export type Variable =
  | Read<unknown>
  | MultiRead<unknown>
  | Array<Read<unknown> | MultiRead<unknown>>;

/**
 * Interface for writable ports.
 * 可写端口的接口。
 */
export interface Write<T> {
  set: (value: T) => void;
}

/**
 * Type for simple variables that are both readable and writable.
 * 同时支持读取和写入的简单变量类型。
 */
export type ReadWrite<T> = Read<T> & Write<T>;

export type MultiReadWrite<T> = MultiRead<T> & MultiWrite<T>;

/**
 * Interface for readable variables.
 * 可读变量的接口。
 */
export interface Read<T> {
  get: () => T | Absent;
}

export interface MultiRead<T> {
  /**
   * Return the number of channels.
   */
  width: () => number;

  /**
   * Given an index that identifies a particular channel, return the current
   * value of the identified channel.
   * 根据通道索引返回该通道的当前值。
   * @param index the index that identifies the channel to return the value of
   * 要读取的通道索引。
   * @returns the value that corresponds to the identified channel
   * 指定通道对应的值。
   */
  get: (index: number) => T | Absent;
}

export interface MultiWrite<T> {
  /**
   * Return the number of channels.
   */
  width: () => number;

  set: (index: number, value: T) => void;

  values: () => Array<T | Absent>;
}

// --------------------------------------------------------------------------//
// Types                                                                    //
// --------------------------------------------------------------------------//

/**
 * Type that denotes the absence of a value.
 * 表示值缺失的类型。
 * @see Variable
 */
export type Absent = undefined;

/**
 * Conditional type for argument lists of reactions. If the type variable
 * `T` is inferred to be a subtype of `Variable[]` it will yield `T`; it
 * will yield `never` if `T` is not a subtype of `Variable[]`.
 * @see Reaction
 * 反应参数列表的条件类型。若 `T` 是 `Variable[]` 的子类型则得到 `T`，否则得到 `never`。
 */
export type ArgList<T> = T extends Variable[] ? T : never;

/**
 * Type that describes a tuple of parameters passed into the constructor
 * of a reactor class.
 * 描述反应器类构造函数参数元组的类型。
 */
export type ParmList<T> = T extends unknown[] ? T : never;

export interface Sortable<P> {
  setPriority: (priority: P) => void;

  // getSTPUntil(): TimeInstant
  // setSTPUntil(): TimeInstant
}

/**
 * Interface for schedulable actions.
 * 可调度动作的接口。
 */
export interface Sched<T> extends Read<T> {
  schedule: (extraDelay: TimeValue | 0, value: T, intendedTag?: Tag) => void;
  // FIXME: it makes sense to be able to check the presence of a (re)schedulable action.
}

/** Interface for passing in configuration options to a federate
 * 向联邦参与者传递配置选项的接口。
 */
export interface FederateConfig {
  dependsOn: number[];
  executionTimeout?: TimeValue;
  fast: boolean;
  federateID: number;
  federationID: string;
  keepAlive?: boolean;
  minOutputDelay?: TimeValue;
  networkMessageActions: string[];
  rtiHost: string;
  rtiPort: number;
  sendsTo: number[];
  upstreamConnectionDelays: TimeValue[][];
}
