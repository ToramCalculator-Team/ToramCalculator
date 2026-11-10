import { Startup } from "./action";
import type { PrioritySetElement } from "./queue";
import type { MutationSandbox, ReactionSandbox, Reactor, Timer } from "./reactor";
import { Tag, type TimeValue } from "./time";
import type { ArgList, Sortable, Variable } from "./types";
import { Log } from "./util";

/**
 * A number that indicates a reaction's position with respect to other
 * reactions in an acyclic precedence graph.
 * @see ReactionQueue
 * 表示反应在无环优先级图中的执行位置的数值。
 */
export type Priority = number;

/**
 * Generic base class for reactions. The type parameter `T` denotes the type of
 * the argument list of the `react` function that that is applied to when this
 * reaction gets triggered.
 * 反应的通用基类。类型参数 `T` 表示此反应触发时调用其 `react` 函数所使用的参数列表类型。
 *
 * @author Marten Lohstroh <marten@berkeley.edu>
 * 反应的通用基类。类型参数 `T` 表示反应触发时传给 `react` 函数的参数列表类型。
 */
export class Reaction<T extends Variable[]> implements Sortable<Priority>, PrioritySetElement<Priority> {
	/**
	 * Priority derived from this reaction's location in the dependency graph
	 * that spans the entire hierarchy of components inside the top-level reactor
	 * that this reaction is also embedded in.
	 * 根据此反应在依赖图中的位置计算出的优先级。该依赖图覆盖此反应所在顶层反应器
	 * 内部的完整组件层级。
	 */
	private priority: Priority = 0; // Number.MAX_SAFE_INTEGER;

	/**
	 * Pointer to the next reaction, used by the runtime when this reaction is staged
	 * for execution at the current logical time.
	 * 指向下一个反应的指针；当此反应被加入当前逻辑时间的待执行队列时，运行时会使用此指针。
	 */
	public next: PrioritySetElement<Priority> | undefined;

	/**
	 * Construct a new reaction by passing in a reference to the reactor that
	 * will own it, an object to execute the its `react` and `late` functions
	 * on, a list of triggers, the arguments to pass into `react` and `late`,
	 * an implementation of this reaction's `react` function, an optional
	 * deadline to be observed, and an optional custom implementation of the
	 * `late` function that is invoked when logical time lags behind physical time
	 * with a margin that exceeds the time interval denoted by the deadline.
	 * 创建一个反应：传入其所属反应器、作为 `react` 和 `late` 函数 `this` 的对象、触发器列表、传递给这两个函数的参数、此反应的 `react` 函数实现，以及可选的截止期限。
	 * 还可提供自定义 `late` 函数：当逻辑时间落后于物理时间的幅度超过截止期限所表示的时间间隔时，将调用该函数。
	 * @param reactor The owner of this reaction.
	 * @param sandbox The `this` object for `react` and `late`.
	 * @param trigs The ports, actions, or timers, which, when they receive
	 * values, will trigger this reaction.
	 * @param args The arguments to be passed to `react` and `late`.
	 * @param react Function that gets execute when triggered and "on time."
	 * @param deadline The maximum amount by which logical time may lag behind
	 * physical time when `react` has been triggered and is ready to execute.
	 * @param late Function that gets execute when triggered and "late."
	 */
	constructor(
		private readonly reactor: Reactor,
		private readonly sandbox: ReactionSandbox,
		readonly trigs: Variable[],
		readonly args: [...ArgList<T>],
		private readonly react: (...args: ArgList<T>) => void,
		private deadline?: TimeValue,
		private readonly late: (...args: ArgList<T>) => void = () => {
			Log.globalLogger.warn("Deadline violation occurred!");
		},
	) {}

	/**
	 * Indicates whether or not this reaction is active. A reaction become
	 * active when its container starts up, inactive when its container
	 * shuts down.
	 * 表示此反应是否处于活动状态。其容器启动时反应变为活动状态；容器关闭时反应变为非活动状态。
	 */
	public active = false;

	/**
	 * Return true if this reaction is triggered immediately (by startup or a
	 * timer with zero offset).
	 * 若此反应由启动动作或零偏移量定时器立即触发，则返回 true。
	 */
	isTriggeredImmediately(): boolean {
		const isTimer = (trig: unknown): trig is Timer => (trig as { _isTimer?: boolean })._isTimer === true;

		return this.trigs.filter((trig) => trig instanceof Startup || (isTimer(trig) && trig.offset.isZero())).length > 0;
	}

	/**
	 * Return the priority of this reaction. It determines the execution order among
	 * reactions staged for execution at the same logical time.
	 * 返回此反应的优先级。它决定同一逻辑时间内已准备执行的反应之间的执行顺序。
	 */
	getPriority(): Priority {
		return this.priority;
	}

	/**
	 * Return whether or not this reaction has priority over another.
	 * 返回此反应的优先级是否高于另一个反应。
	 * @param another Reaction to compare this reaction's priority against.
	 */
	hasPriorityOver(another: PrioritySetElement<Priority> | undefined): boolean {
		if (another != null && this.getPriority() < another.getPriority()) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Return whether another, newly staged reaction is equal to this one.
	 * Because reactions are just object references, no updating is necessary.
	 * Returning true just signals that the scheduler shouldn't stage it twice.
	 * 判断另一个新加入待执行队列的反应是否与此反应相同。反应以对象引用表示，因此无需更新；返回 true 仅表示调度器不应重复加入该反应。
	 * @param node
	 */
	updateIfDuplicateOf(node: PrioritySetElement<Priority> | undefined): boolean {
		return Object.is(this, node);
	}

	/**
	 * Invoke the react function in the appropriate sandbox and with the argument
	 * list that was specified upon the construction of this reaction object.
	 * 在相应的沙箱中，使用创建此反应对象时指定的参数列表调用 `react` 函数。
	 */
	public doReact(): void {
		Log.debug(this, () => ">>> Reacting >>> " + this.constructor.name + " >>> " + this.toString());
		Log.debug(this, () => `Reaction deadline: ${this.deadline}`);

		// If this reaction was loaded onto the reaction queue but the trigger(s)
		// absorbed by a mutation that routed the value(s) elsewhere, then return
		// without invoking the reaction.
		if (!this.active) {
			return;
		}
		// Test if this reaction has a deadline which has been violated.
		// This is the case if the reaction has a defined timeout and
		// logical time + timeout < physical time
		if (
			this.deadline != null &&
			this.sandbox.util
				.getCurrentTag()
				.getLaterTag(this.deadline)
				.isSmallerThan(new Tag(this.sandbox.util.getCurrentPhysicalTime(), 0))
		) {
			this.late.apply(this.sandbox, this.args); // late
		} else {
			this.react.apply(this.sandbox, this.args); // on time
		}
	}

	/**
	 * Set a deadline for this reaction. The given time value denotes the maximum
	 * allowable amount by which logical time may lag behind physical time at the
	 * point that this reaction is ready to execute. If this maximum lag is
	 * exceeded, the `late` function is executed instead of the `react` function.
	 * 为此反应设置截止期限。给定的时间值表示此反应准备执行时，逻辑时间相对于物理时间允许的最大落后量。若超过该上限，则执行 `late` 函数而不是 `react` 函数。
	 * @param deadline The deadline to set to this reaction.
	 */
	public setDeadline(deadline: TimeValue): this {
		this.deadline = deadline;
		return this;
	}

	/**
	 * Set for reaction priority, to be used only by the runtime environment.
	 * The priority of each reaction is determined on the basis of its
	 * dependencies on other reactions.
	 * 设置反应的优先级，仅供运行时环境使用。每个反应的优先级根据它对其他反应的依赖关系确定。
	 * @param priority The priority for this reaction.
	 */
	public setPriority(priority: number): void {
		this.priority = priority;
	}

	/**
	 * Return string representation of the reaction.
	 * 返回此反应的字符串表示。
	 */
	public toString(): string {
		return `${this.reactor._getFullyQualifiedName()}[R${this.reactor._getReactionIndex(
			this as unknown as Reaction<Variable[]>,
		)}]`;
	}
}

export class Procedure<T extends Variable[]> extends Reaction<T> {}

export class Mutation<T extends Variable[]> extends Reaction<T> {
	readonly parent: Reactor;

	constructor(
		__parent__: Reactor,
		sandbox: MutationSandbox,
		trigs: Variable[],
		args: [...ArgList<T>],
		react: (...args: ArgList<T>) => void,
		deadline?: TimeValue,
		late?: (...args: ArgList<T>) => void,
	) {
		super(__parent__, sandbox, trigs, args, react, deadline, late);
		this.parent = __parent__;
	}

	/**
	 * @override
	 */
	public toString(): string {
		return `${this.parent._getFullyQualifiedName()}[M${this.parent._getReactionIndex(
			this as unknown as Reaction<Variable[]>,
		)}]`;
	}
}
