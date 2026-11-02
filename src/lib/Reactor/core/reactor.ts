/**
 * Core of the reactor runtime.
 * Reactor 运行时的核心实现。
 *
 * @author Marten Lohstroh (marten@berkeley.edu),
 * @author Matt Weber (matt.weber@berkeley.edu),
 * @author Hokeun Kim (hokeunkim@berkeley.edu)
 */

import { createId } from "@paralleldrive/cuid2";
import { Action, Dummy, SchedulableAction, Shutdown, Startup } from "./action";
import { Bank } from "./bank";
import { Component } from "./component";
import { TaggedEvent } from "./event";
import { PrecedenceGraph, ReactionGraph } from "./graph";
import { MultiPort } from "./multiport";
import { ConnectablePort, InPort, IOPort, OutPort, Port, WritableMultiPort, WritablePort } from "./port";
import { PrioritySet } from "./queue";
import { Mutation, type Priority, Procedure, Reaction } from "./reaction";
import { Alarm, getCurrentPhysicalTime, Origin, Tag, TimeValue } from "./time";
import { ScheduledTrigger, Trigger, type TriggerManager } from "./trigger";
import type { Absent, ArgList, Read, Sched, Variable, Write } from "./types";
import { Log } from "./util";

// Set the default log level.
Log.setLevel(Log.LogLevel.ERROR);

// --------------------------------------------------------------------------//
// Interfaces                                                               //
// --------------------------------------------------------------------------//

/**
 * Interface for the invocation of remote procedures.
 * 远程过程调用接口。
 */
export interface Call<A, R> extends Write<A>, Read<R> {
	invoke: (args: A) => R | undefined;
}

export enum CanConnectResult {
	SUCCESS = 0,
	SELF_LOOP = "Source port and destination port are the same.",
	DESTINATION_OCCUPIED = "Destination port is already occupied.",
	DOWNSTREAM_WRITE_CONFLICT = "Write conflict: port is already occupied.",
	NOT_IN_SCOPE = "Source and destination ports are not in scope.",
	RT_CONNECTION_OUTSIDE_CONTAINER = "New connection is outside of container.",
	RT_DIRECT_FEED_THROUGH = "New connection introduces direct feed through.",
	RT_CYCLE = "New connection introduces cycle.",
	MUTATION_CAUSALITY_LOOP = "New connection will change the causal effect of the mutation that triggered this connection.",
}

/**
 * Abstract class for a schedulable action. It is intended as a wrapper for a
 * regular action. In addition to a get method, it also has a schedule method
 * that allows for the action to be scheduled.
 * 可调度动作的抽象包装器，除读取值外还提供安排动作执行的方法。
 */

// --------------------------------------------------------------------------//
// Core Reactor Classes                                                     //
// --------------------------------------------------------------------------//

export class Parameter<T> implements Read<T> {
	constructor(private readonly value: T) {}

	get(): T {
		return this.value;
	}
}

/**
 * A timer is an attribute of a reactor which periodically (or just once)
 * creates a timer event. A timer has an offset and a period. Upon initialization
 * the timer will schedule an event at the given offset from starting wall clock time.
 * Whenever this timer's event comes off the event queue, it will
 * reschedule the event at the current logical time + period in the future. A 0
 * period indicates the timer's event is a one-off and should not be rescheduled.
 * 定时器是反应器的属性，可周期性触发或只触发一次。初始化时，首个事件安排在执行开始后的偏移量处；
 * 定时器事件出队后，会按当前逻辑时间加周期重新调度。周期为零表示只触发一次。
 */
export class Timer extends ScheduledTrigger<Tag> implements Read<Tag> {
	readonly _isTimer = true;

	period: TimeValue;

	offset: TimeValue;

	/**
	 * Timer constructor.
	 * @param __container__ The reactor this timer is attached to.
	 * @param offset The interval between the start of execution and the first
	 * timer event. Cannot be negative.
	 * @param period The interval between rescheduled timer events. If 0, will
	 * not reschedule. Cannot be negative.

	 */
	constructor(__container__: Reactor, offset: TimeValue | 0, period: TimeValue | 0) {
		super(__container__);

		if (!(offset instanceof TimeValue)) {
			this.offset = TimeValue.secs(0);
		} else {
			this.offset = offset;
		}

		if (!(period instanceof TimeValue)) {
			this.period = TimeValue.secs(0);
		} else {
			this.period = period;
		}
		Log.debug(this, () => `Creating timer: ${this._getFullyQualifiedName()}`);
		// Initialize this timer.
		this.runtime.initialize(this);
	}

	public toString(): string {
		return `Timer from ${this._getContainer()._getFullyQualifiedName()} 
            with period: ${this.period} 
            offset: ${this.offset}`;
	}

	public get(): Tag | Absent {
		if (this.isPresent()) {
			return this.tag;
		} else {
			return undefined;
		}
	}
}

/**
 * A reactor is a software component that reacts to input events, timer events,
 * and action events. It has private state variables that are not visible to any
 * other reactor. Its reactions can consist of altering its own state, sending
 * messages to other reactors, or affecting the environment through some kind of
 * actuation or side effect.
 * 反应器是响应输入、定时器和动作事件的软件组件。它拥有其他反应器不可见的私有状态；
 * 反应可以修改自身状态、向其他反应器发送消息，或通过执行器及副作用影响外部环境。
 */
export abstract class Reactor extends Component {
	readonly _isReactor = true;

	/**
	 * Data structure to keep track of registered components.
	 * Note: declare this class member before any other ones as they may
	 * attempt to access it.
	 * 跟踪已注册组件的数据结构。此成员必须先于其他成员声明，因为其他成员可能会访问它。
	 */
	private readonly _keyChain = new Map<Component, symbol>();

	/**
	 * This graph has in it all the dependencies implied by this container's
	 * ports, reactions, and connections.
	 * 此图包含由当前容器的端口、反应和连接关系产生的全部依赖。
	 */
	protected _dependencyGraph = new PrecedenceGraph<Port<unknown> | Reaction<Variable[]>>();

	/**
	 * The runtime object, which has a collection of privileged functions that are passed down from the
	 * container.
	 * 运行时对象，包含由容器向下传递的一组特权函数。
	 */
	private _runtime!: Runtime;

	/**
	 * Index that specifies the location of the reactor instance in a bank,
	 * if it is a member of one.
	 * 若此反应器实例属于某个 bank，此字段记录它在该 bank 中的位置。
	 */
	private readonly _bankIndex: number;

	/**
	 * Return the location of the reactor instance in a bank,
	 * if it is a member of one; return -1 otherwise.
	 * 返回此反应器实例在所属 bank 中的位置；若它不属于任何 bank，则返回 -1。
	 */
	public getBankIndex(): number {
		if (this._bankIndex === undefined) {
			return -1;
		}
		return this._bankIndex;
	}

	/**
	 * This graph has some overlap with the reactors dependency graph, but is
	 * different in two respects:
	 * - transitive dependencies between ports have been collapsed; and
	 * - it incorporates the causality interfaces of all contained reactors.
	 * It thereby carries enough information to find out whether adding a new
	 * connection at runtime could result in a cyclic dependency, _without_
	 * having to consult other reactors.
	 * 此图与反应器的依赖图有部分重叠，但有两点不同：端口之间的传递依赖已折叠；并且此图包含所有子反应器的因果接口。
	 * 因此，它包含足够的信息，可以在不查询其他反应器的情况下，判断运行时新增连接是否会造成循环依赖。
	 */
	private readonly _causalityGraph = new PrecedenceGraph<Port<unknown>>();

	/**
	 * Indicates whether this reactor is active (meaning it has reacted to a
	 * startup action), or not (in which case it either never started up or has
	 * reacted to a shutdown action).
	 * 表示此反应器是否处于活动状态：活动状态意味着它已响应启动动作；非活动状态意味着它尚未启动，或已响应关闭动作。
	 */
	protected _active = false;

	/**
	 * This reactor's shutdown action.
	 */
	readonly shutdown: Shutdown;

	/**
	 * This reactor's startup action.
	 */
	readonly startup: Startup;

	/**
	 * This reactor's dummy action.
	 */
	readonly __dummy: Dummy;

	/**
	 * The list of reactions this reactor has.
	 */
	private readonly _reactions: Array<Reaction<Variable[]>> = [];

	/**
	 * Sandbox for the execution of reactions.
	 */
	private _reactionScope: ReactionSandbox;

	/**
	 * The list of mutations this reactor has.
	 */
	private readonly _mutations: Array<Mutation<Variable[]>> = [];

	/**
	 * Sandbox for the execution of mutations.
	 */
	private _mutationScope: MutationSandbox;

	/**
	 * Receive the runtime object from the container of this reactor.
	 * Invoking this method in any user-written code will result in a
	 * runtime error.
	 * 从此反应器的容器接收运行时对象。用户代码调用此方法会导致运行时错误。
	 * @param runtime The runtime object handed down from the container.
	 */
	public _receiveRuntimeObject(runtime: Runtime): void {
		if (this._runtime == null && runtime != null) {
			this._runtime = runtime;
			// In addition to setting the runtime object, also make its
			// utility functions available as a protected member.
			this.util = runtime.util;
		} else {
			throw new Error("Can only establish link to runtime once.");
		}
	}

	/**
	 * Add a component to this container.
	 *
	 * A component that is created as part of this reactor invokes this method
	 * upon creation.
	 * 将组件添加到此容器。作为此反应器一部分创建的组件会在创建时调用此方法。
	 * @param component The component to register.
	 * @param key The component's key.
	 */
	public _register(component: Component, key: symbol): void {
		if (component === undefined || component === null) {
			throw new Error("Unable to register undefined or null component");
		}
		if (component._isRegistered()) {
			throw new Error(`Unable to register ${component._getFullyQualifiedName()} as it already has a container.`);
		}
		// Only add key if the component isn't a self-reference
		// and isn't already registered.
		// 仅当组件不是自身引用且尚未注册时，才添加其密钥。
		if (component !== this && !this._keyChain.has(component)) {
			this._keyChain.set(component, key);
		}
	}

	public _requestRuntimeObject(component: Component): void {
		if (component._isContainedBy(this)) {
			component._receiveRuntimeObject(this._runtime);
		}
	}

	/**
	 * Remove all the connections associated with a given reactor.
	 * 删除与指定反应器相关的所有连接。
	 * @param reactor
	 */
	private _deleteConnections(reactor: Reactor): void {
		for (const port of reactor._findOwnPorts()) {
			this._dependencyGraph.removeNode(port);
		}
	}

	/**
	 * Remove this reactor from its container and sever any connections it may
	 * still have. This reactor will become defunct and is ready for garbage
	 * collection.
	 * 将此反应器从其容器中移除，并断开它可能仍保有的连接。此后该反应器失效，可供垃圾回收。
	 */
	protected _unplug(): void {
		this._getContainer()._deregister(this, this._key);
	}

	/**
	 * Remove the given reactor and its connections from this container if
	 * the key matches.
	 * 密钥匹配时，将指定反应器及其连接从此容器中移除。
	 * @param reactor
	 * @param key
	 */
	public _deregister(reactor: Reactor, key: symbol): void {
		let found: boolean | undefined = false;
		for (const v of this._keyChain.values()) {
			if (v === key) {
				found = true;
				break;
			}
		}
		if (found ?? false) {
			this._keyChain.delete(reactor);
			this._deleteConnections(reactor);
		} else {
			console.log(`Unable to deregister reactor: ${reactor._getFullyQualifiedName()}`);
		}
	}

	private _getLast(reactions: Set<Reaction<Variable[]>>): Reaction<Variable[]> | undefined {
		let index = -1;
		const all = this._getReactionsAndMutations();

		for (const reaction of reactions) {
			const found = all.indexOf(reaction);
			if (found >= 0) {
				index = Math.max(found, index);
			}
		}
		if (index >= 0) {
			return all[index];
		}
	}

	private _getFirst(reactions: Set<Reaction<Variable[]>>): Reaction<Variable[]> | undefined {
		let index = -1;
		const all = this._getReactionsAndMutations();

		for (const reaction of reactions) {
			const found = all.indexOf(reaction);
			if (found >= 0) {
				index = Math.min(found, index);
			}
		}
		if (index >= 0) {
			return all[index];
		}
	}

	/**
	 * If the given component is owned by this reactor, look up its key and
	 * return it. Otherwise, if a key has been provided, and it matches the
	 * key of this reactor, also look up the component's key and return it.
	 * Otherwise, if the component is owned by a reactor that is owned by
	 * this reactor, request the component's key from that reactor and return
	 * it. If the component is an action, this request is not honored because
	 * actions are never supposed to be accessed across levels of hierarchy.
	 * 若给定组件由此反应器持有，则查找并返回该组件的密钥。否则，若提供的密钥与此反应器的密钥匹配，也查找并返回该组件的密钥。
	 * 若组件由此反应器所持有的反应器持有，则向该反应器请求组件密钥并返回。动作不适用此请求，因为动作不应跨层级访问。
	 * @param component The component to look up the key for.
	 * @param key The key that verifies the containment relation between this
	 * reactor and the component, with at most one level of indirection.
	 */
	public _getKey(component: Trigger, key?: symbol): symbol | undefined {
		if (component._isContainedBy(this) || this._key === key) {
			return this._keyChain.get(component);
		} else if (!(component instanceof Action) && component._isContainedByContainerOf(this)) {
			const owner = component.getContainer();
			if (owner !== null) {
				return owner._getKey(component, this._keyChain.get(owner));
			}
		}
	}

	/**
	 * Collection of utility functions for this reactor and its subclasses.
	 * 此反应器及其子类可用的实用函数集合。
	 */
	protected util!: UtilityFunctions;

	/**
	 * Mark this reactor for deletion, trigger all of its shutdown reactions
	 * and mutations, and also delete all of the reactors that this reactor
	 * contains.
	 * 将此反应器标记为待删除，触发它的所有关闭反应和变更，并删除此反应器包含的所有反应器。
	 */
	private _delete(): void {
		// console.log("Marking for deletion: " + this._getFullyQualifiedName())
		this._runtime.delete(this);
		this.shutdown.update(new TaggedEvent(this.shutdown, this.util.getCurrentTag(), null));
		// this._findOwnReactors().forEach(r => r._delete())
	}

	/**
	 * Inner class intended to provide access to methods that should be
	 * accessible to mutations, not to reactions.
	 * 此内部类用于提供变更可访问的方法；这些方法不向反应开放。
	 */
	private readonly _mutationSandbox = class implements MutationSandbox {
		public util: UtilityFunctions;

		constructor(private readonly reactor: Reactor) {
			this.reactor = reactor;
			this.util = reactor.util;
			this.getBankIndex = () => reactor.getBankIndex();
		}

		getBankIndex: () => number;

		/**
		 *
		 * @param src
		 * @param dst
		 */

		public connect<R, S extends R>(src: ConnectablePort<S>, dst: ConnectablePort<R>): void;
		public connect<A extends T, R, T, S extends R>(src: CallerPort<A, R>, dst: CalleePort<T, S>): void;
		public connect<A extends T, R, T, S extends R>(
			...[src, dst]: [ConnectablePort<S>, ConnectablePort<R>] | [CallerPort<A, R>, CalleePort<T, S>]
		): void {
			if (src instanceof CallerPort && dst instanceof CalleePort) {
				this.reactor._connectCall(src, dst);
			} else if (src instanceof ConnectablePort && dst instanceof ConnectablePort) {
				this.reactor._connect(src.getPort(), dst.getPort());
			} else {
				throw Error(
					"Logically unreachable code: src and dst type mismatch, Caller(ee) port cannot be connected to IOPort.",
				);
			}
		}

		public disconnect<R, S extends R>(src: IOPort<S>, dst?: IOPort<R>): void {
			if (src instanceof IOPort && (dst === undefined || dst instanceof IOPort)) {
				this.reactor._disconnect(src, dst);
			} else {
				// FIXME: Add an error reporting mechanism such as an exception.
			}
		}

		/**
		 * Return the reactor containing the mutation using this sandbox.
		 * 返回使用此沙箱的变更所属的反应器。
		 */
		public getReactor(): Reactor {
			return this.reactor;
		}

		/**
		 * Mark the given reactor for deletion.
		 * 将指定反应器标记为待删除。
		 *
		 * @param reactor
		 */
		public delete(reactor: Reactor): void {
			reactor._delete();
		}
	};

	/**
	 * Inner class that furnishes an execution environment for reactions.
	 * 此内部类为反应提供执行环境。
	 */
	private readonly _reactionSandbox = class implements ReactionSandbox {
		public util: UtilityFunctions;

		public getBankIndex: () => number;

		constructor(public reactor: Reactor) {
			this.util = reactor.util;
			this.getBankIndex = () => reactor.getBankIndex();
		}
	};

	/**
	 * Create a new reactor.
	 * 创建一个新的反应器。
	 * @param container The container of this reactor.
	 */
	constructor(container: Reactor | null) {
		super(container);
		this._bankIndex = -1;
		if (container !== null) {
			const index = Bank.initializationMap.get(container);
			if (index !== undefined) {
				this._bankIndex = index;
			}
		}

		this._linkToRuntimeObject();
		this.shutdown = new Shutdown(this);
		this.startup = new Startup(this);
		this.__dummy = new Dummy(this);

		// Utils get passed down the hierarchy. If this is an App,
		// the container refers to this object, making the following
		// assignment idemponent.
		// 实用函数沿层级向下传递。若此对象是 App，则容器指向对象自身，因此下面的赋值具有幂等性。
		// this.util = this._getContainer().util

		// Create sandboxes for the reactions and mutations to execute in.
		// 为反应和变更创建执行沙箱。
		this._reactionScope = new this._reactionSandbox(this);
		this._mutationScope = new this._mutationSandbox(this);

		// Pass in a reference to the reactor because the runtime object
		// is inaccessible for the top-level reactor (it is created after this constructor returns).
		// 传入反应器引用，因为顶层反应器无法访问运行时对象；该对象要等此构造函数返回后才会创建。
		const self = this as Reactor;
		this.addMutation([this.shutdown], [], function (this) {
			self._findOwnReactors().forEach((r) => {
				r._delete();
			});
		});

		// If this reactor was created at runtime, simply set the priority of
		// the default to the priority of from the last mutation of its
		// container plus one. Subsequent reactions and mutations that are added
		// will get a priority relative to this one.
		// 若此反应器在运行时创建，则将默认优先级设为其容器最后一个变更的优先级加一。之后添加的反应和变更将据此确定相对优先级。
		// FIXME: If any of the assigned priorities is larger than any downstream
		// reaction, then the priorities of those downstream reactions must be
		// increased.
		// FIXME：若分配的优先级高于任何下游反应的优先级，则必须提高这些下游反应的优先级。
		if (!(this instanceof App) && this._runtime.isRunning()) {
			const toDependOn = this._getContainer()._getLastMutation();
			if (toDependOn != null) this._mutations[0].setPriority(toDependOn.getPriority() + 1);
		}
	}

	protected _initializeReactionScope(): void {
		this._reactionScope = new this._reactionSandbox(this);
	}

	protected _initializeMutationScope(): void {
		this._mutationScope = new this._mutationSandbox(this);
	}

	// protected _isActive(): boolean {
	//     return this._active
	// }

	//

	public allWritable<T>(port: MultiPort<T>): WritableMultiPort<T> {
		return port.asWritable(this._getKey(port));
	}

	public writable<T>(port: IOPort<T>): WritablePort<T> {
		return port.asWritable(this._getKey(port));
	}

	/**
	 * Return the index of the reaction given as an argument.
	 * 返回参数指定的反应在此反应器中的索引。
	 * @param reaction The reaction to return the index of.
	 */
	public _getReactionIndex(reaction: Reaction<Variable[]>): number {
		let index: number | undefined;

		if (reaction instanceof Mutation) {
			index = this._mutations.indexOf(reaction as Mutation<Variable[]>);
		} else {
			index = this._reactions.indexOf(reaction);
		}

		if (index !== undefined) return index;

		throw new Error("Reaction is not listed.");
	}

	protected schedulable<T>(action: Action<T>): Sched<T> {
		return action.asSchedulable(this._getKey(action));
	}

	private _recordDeps<T extends Variable[]>(reaction: Reaction<T>): void {
		// Add a dependency on the previous reaction or mutation, if it exists.
		// 若存在先前的反应或变更，则添加对它的依赖。
		const prev = this._getLastReactionOrMutation();
		if (prev != null) {
			this._dependencyGraph.addEdge(prev, reaction as unknown as Reaction<Variable[]>);
		}

		// FIXME: Add a dependency on the last mutation that the owner of this reactor
		// has. How do we know that it is the last? We have a "lastCaller" problem here.
		// Probably better to solve this at the level of the dependency graph with a function
		// that allows for a link to be updated.
		// FIXME：添加对此反应器所属者最后一个变更的依赖。目前存在如何确定“最后一个”的问题，即 `lastCaller` 问题。
		// 更适合在依赖图层面通过可更新链接的函数解决。

		// Set up the triggers.
		// 设置触发器。
		for (const t of reaction.trigs) {
			// Link the trigger to the reaction.
			// 将触发器关联到反应。
			if (t instanceof Trigger) {
				t.getManager(this._getKey(t)).addReaction(reaction as unknown as Reaction<Variable[]>);
			} else if (t instanceof Array) {
				t.forEach((trigger) => {
					if (trigger instanceof Trigger) {
						trigger.getManager(this._getKey(trigger)).addReaction(reaction as unknown as Reaction<Variable[]>);
					} else {
						throw new Error("Non-Trigger included in Triggers list.");
					}
				});
			}

			// Also record this trigger as a dependency.
			// 同时将此触发器记录为依赖项。
			if (t instanceof IOPort) {
				this._dependencyGraph.addEdge(t, reaction as unknown as Reaction<Variable[]>);
			} else if (t instanceof MultiPort) {
				t.channels().forEach((channel) => {
					this._dependencyGraph.addEdge(channel, reaction as unknown as Reaction<Variable[]>);
				});
			} else if (t instanceof Array) {
				t.forEach((trigger) => {
					if (trigger instanceof IOPort) {
						this._dependencyGraph.addEdge(trigger, reaction as unknown as Reaction<Variable[]>);
					} else if (trigger instanceof MultiPort) {
						trigger.channels().forEach((channel) => {
							this._dependencyGraph.addEdge(channel, reaction as unknown as Reaction<Variable[]>);
						});
					} else {
						throw new Error("Non-Port included in Triggers list.");
					}
				});
			} else {
				Log.debug(
					this,
					() => `
        >>>>> not a dependency: ${t}`,
				);
			}
		}

		const sources = new Set<Port<unknown>>();
		const effects = new Set<Port<unknown>>();

		for (const a of reaction.args) {
			if (a instanceof IOPort) {
				this._dependencyGraph.addEdge(a, reaction as unknown as Reaction<Variable[]>);
				sources.add(a);
			} else if (a instanceof MultiPort) {
				a.channels().forEach((channel) => {
					this._dependencyGraph.addEdge(channel, reaction as unknown as Reaction<Variable[]>);
					sources.add(channel);
				});
			} else if (a instanceof CalleePort) {
				this._dependencyGraph.addEdge(reaction as unknown as Reaction<Variable[]>, a);
			} else if (a instanceof CallerPort) {
				this._dependencyGraph.addEdge(a, reaction as unknown as Reaction<Variable[]>);
			}
			// Only necessary if we want to add actions to the dependency graph.
			// 只有在需要将动作加入依赖图时才需要处理。
			else if (a instanceof Action) {
				// dep
				// 正向依赖。
			} else if (a instanceof SchedulableAction) {
				// antidep
				// 反依赖。
			} else if (a instanceof WritablePort) {
				this._dependencyGraph.addEdge(reaction as unknown as Reaction<Variable[]>, a.getPort());
				effects.add(a.getPort());
			} else if (a instanceof WritableMultiPort) {
				a.getPorts().forEach((channel) => {
					this._dependencyGraph.addEdge(reaction as unknown as Reaction<Variable[]>, channel);
					effects.add(channel);
				});
			}
		}
		// Make effects dependent on sources.
		// 建立 effect 对 source 的依赖关系。
		for (const effect of effects) {
			for (const source of sources) {
				this._causalityGraph.addEdge(source, effect);
			}
		}
	}

	/**
	 * Given a reaction, return the reaction within this reactor that directly
	 * precedes it, or `undefined` if there is none.
	 * 给定一个反应，返回此反应器中直接位于它之前的反应；若没有，则返回 `undefined`。
	 * @param reaction A reaction to find the predecessor of.
	 */
	protected prevReaction(reaction: Reaction<Variable[]>): Reaction<Variable[]> | undefined {
		let index: number | undefined;

		if (reaction instanceof Mutation) {
			index = this._mutations.indexOf(reaction as Mutation<Variable[]>);
			if (index !== undefined && index > 0) {
				return this._mutations[index - 1];
			}
		} else {
			index = this._reactions.indexOf(reaction);
			if (index !== undefined && index > 0) {
				return this._reactions[index - 1];
			} else {
				const len = this._mutations.length;
				if (len > 0) {
					return this._mutations[len - 1];
				}
			}
		}
	}

	/**
	 * Given a reaction, return the reaction within this reactior that directly
	 * succeeds it, or `undefined` if there is none.
	 * 给定一个反应，返回此反应器中直接位于它之后的反应；若没有，则返回 `undefined`。
	 * @param reaction A reaction to find the successor of.
	 */
	protected nextReaction(reaction: Reaction<Variable[]>): Reaction<Variable[]> | undefined {
		let index: number | undefined;

		if (reaction instanceof Mutation) {
			index = this._mutations.indexOf(reaction as Mutation<Variable[]>);
			if (index !== undefined && index < this._mutations.length - 1) {
				return this._mutations[index + 1];
			} else if (this._reactions.length > 0) {
				return this._reactions[0];
			}
		} else {
			index = this._reactions.indexOf(reaction);
			if (index !== undefined && index < this._reactions.length - 1) {
				return this._reactions[index + 1];
			}
		}
	}

	/**
	 * Add a reaction to this reactor. Each newly added reaction will acquire a
	 * dependency either on the previously added reaction, or on the last added
	 * mutation (in case no reactions had been added prior to this one). A
	 * reaction is specified by a list of triggers, a list of arguments, a react
	 * function, an optional deadline, and an optional late function (which
	 * represents the reaction body of the deadline). All triggers a reaction
	 * needs access must be included in the arguments.
	 * 向此反应器添加一个反应。每个新添加的反应都将依赖于先前添加的反应；若此前尚未添加任何反应，则依赖于最近添加的变更。
	 * 反应由触发器列表、参数列表、react 函数、可选截止期限和可选 late 函数组成；late 函数表示截止期限违例时执行的反应体。
	 * 反应需要访问的所有触发器都必须包含在参数列表中。
	 *
	 * @param trigs
	 * @param args
	 * @param react
	 * @param deadline
	 * @param late
	 */
	protected addReaction<T extends Variable[]>(
		trigs: Variable[],
		args: [...ArgList<T>],
		react: (this: ReactionSandbox, ...args: ArgList<T>) => void,
		deadline?: TimeValue,
		late: (this: ReactionSandbox, ...args: ArgList<T>) => void = () => {
			Log.globalLogger.warn("Deadline violation occurred!");
		},
	): void {
		const calleePorts = trigs.filter((trig) => trig instanceof CalleePort);

		if (calleePorts.length > 0) {
			// This is a procedure.
			// 这是一个过程。
			const port = calleePorts[0] as CalleePort<unknown, unknown>;
			const procedure = new Procedure(this, this._reactionScope, trigs, args, react, deadline, late);
			if (trigs.length > 1) {
				// A procedure can only have a single trigger.
				// 一个过程只能有一个触发器。
				throw new Error(`Procedure "${procedure}" has multiple triggers.`);
			}
			procedure.active = true;
			this._recordDeps(procedure);
			// Let the last caller point to the reaction that precedes this one.
			// This lets the first caller depend on it.
			// 让最后一个 caller 指向此过程之前的反应，从而使第一个 caller 依赖于该反应。
			port.getManager(this._getKey(port)).setLastCaller(this._getLastReactionOrMutation());
			this._reactions.push(procedure as unknown as Procedure<Variable[]>);
			// FIXME: set priority manually if this happens at runtime.
		} else {
			// This is an ordinary reaction.
			// 这是一个普通反应。
			const reaction = new Reaction(this, this._reactionScope, trigs, args, react, deadline, late);
			// Stage it directly if it to be triggered immediately.
			// 若此反应应立即触发，则直接将其加入待执行队列。
			if (reaction.isTriggeredImmediately()) {
				this._runtime.stage(reaction as unknown as Reaction<Variable[]>);
				// FIXME: if we're already running, then we need to set the priority as well.
				// FIXME：若运行时已启动，还需要设置此反应的优先级。
			}
			reaction.active = true;
			this._recordDeps(reaction);
			this._reactions.push(reaction as unknown as Reaction<Variable[]>);
			// FIXME: set priority manually if this happens at runtime.
		}
	}

	protected addMutation<T extends Variable[]>(
		trigs: Variable[],
		args: [...ArgList<T>],
		react: (this: MutationSandbox, ...args: ArgList<T>) => void,
		deadline?: TimeValue,
		late: (this: MutationSandbox, ...args: ArgList<T>) => void = () => {
			Log.globalLogger.warn("Deadline violation occurred!");
		},
	): void {
		const mutation = new Mutation(this, this._mutationScope, trigs, args, react, deadline, late);
		// Stage it directly if it to be triggered immediately.
		// 若此变更应立即触发，则直接将其加入待执行队列。
		if (mutation.isTriggeredImmediately()) {
			this._runtime.stage(mutation as unknown as Mutation<Variable[]>);
		}
		mutation.active = true;
		this._recordDeps(mutation);
		this._mutations.push(mutation as unknown as Mutation<Variable[]>);
	}

	private _addHierarchicalDependencies(): void {
		const dependent = this._getFirstReactionOrMutation();
		const toDependOn = this._getContainer()._getLastMutation();
		if (dependent != null && toDependOn != null && this._getContainer() !== this) {
			this._dependencyGraph.addEdge(toDependOn, dependent); // FIXME: this assumes there is always at least one mutation.
		}
	}

	private _addRPCDependencies(): void {
		// FIXME: Potentially do this in connect instead upon connecting to a
		// callee port. So far, it is unclear how RPCs would work when
		// established at runtime by a mutation.
		// FIXME：也许应在 connect 连接到 callee 端口时执行此操作。目前尚不清楚由变更在运行时建立的 RPC 应如何工作。
		//
		// Check if there are any callee ports owned by this reactor.
		// If there are, add a dependency from its last caller to the antidependencies
		// of the procedure (excluding the callee port itself).
		// 检查此反应器是否拥有 callee 端口。若有，则从其最后一个 caller 向过程的反依赖项添加依赖，但不包括 callee 端口本身。
		const calleePorts = this._findOwnCalleePorts();
		for (const p of calleePorts) {
			const procedure = p.getManager(this._getKey(p)).getProcedure();
			const lastCaller = p.getManager(this._getKey(p)).getLastCaller();
			if (procedure != null && lastCaller != null) {
				const effects = this._dependencyGraph.getDownstreamNeighbors(procedure);
				for (const e of effects) {
					if (!(e instanceof CalleePort)) {
						// Also add edge to the local graph.
						// 同时向局部依赖图添加此边。
						this._dependencyGraph.addEdge(lastCaller, e);
					}
				}
			} else {
				Error("No procedure");
			}
		}
	}

	/**
	 * Recursively collect the local dependency graph of each contained reactor
	 * and merge them all in one graph.
	 *
	 * The recursion depth can be limited via the depth parameter. A depth of 0
	 * will only return the local dependency graph of this reactor, a depth
	 * of 1 will merge the local graph only with this reactor's immediate
	 * children, etc. The default dept is -1, which will let this method
	 * recurse until it has reached a reactor with no children.
	 *
	 * Some additional constraits are added to guarantee the following:
	 *  - The first reaction or mutation has a dependency on the last mutation
	 *    of this reactor's container; and
	 *  - RPCs occur in a deterministic order.
	 * 递归收集每个所包含反应器的局部依赖图，并将它们合并为一张图。
	 * `depth` 参数可限制递归深度：0 仅返回此反应器的局部依赖图；1 将此图与直接子反应器的局部依赖图合并；以此类推。
	 * 默认值 -1 表示递归到没有子反应器为止。
	 * 此方法还会添加额外约束，以保证：第一个反应或变更依赖于此反应器容器的最后一个变更；RPC 按确定性顺序发生。
	 * @param depth The depth of recursion.
	 */
	protected _getPrecedenceGraph(depth = -1): PrecedenceGraph<Port<unknown> | Reaction<Variable[]>> {
		const graph = new PrecedenceGraph<Port<unknown> | Reaction<Variable[]>>();

		this._addHierarchicalDependencies();
		this._addRPCDependencies();

		graph.addAll(this._dependencyGraph);

		if (depth > 0 || depth < 0) {
			if (depth > 0) {
				depth--;
			}
			for (const r of this._getOwnReactors()) {
				graph.addAll(r._getPrecedenceGraph(depth));
			}
		}

		return graph;
	}

	/**
	 * Return the reactors that this reactor owns.
	 * 返回此反应器所拥有的反应器。
	 */
	private _getOwnReactors(): Reactor[] {
		// eslint-disable-next-line
		return Array.from(this._keyChain.keys()).filter((it) => it instanceof Reactor) as Reactor[];
	}

	/**
	 * Return a list of reactions owned by this reactor.
	 * 返回此反应器拥有的反应列表。
	 */
	protected _getReactions(): Array<Reaction<Variable[]>> {
		const arr: Reaction<Variable[]>[] = [];
		this._reactions.forEach((it) => {
			arr.push(it);
		});
		return arr;
	}

	/**
	 * Return a list of reactions and mutations owned by this reactor.
	 * 返回此反应器拥有的反应和变更列表。
	 */
	protected _getReactionsAndMutations(): Array<Reaction<Variable[]>> {
		const arr: Reaction<Variable[]>[] = [];
		this._mutations.forEach((it) => {
			arr.push(it);
		});
		this._reactions.forEach((it) => {
			arr.push(it);
		});
		return arr;
	}

	/**
	 * Return the last mutation of this reactor. All contained reactors
	 * must have their reactions depend on this.
	 * 返回此反应器的最后一个变更。所有子反应器中的反应都必须依赖于它。
	 */
	protected _getLastMutation(): Mutation<Variable[]> | undefined {
		const len = this._mutations.length;
		if (len > 0) {
			return this._mutations[len - 1];
		}
	}

	protected _getFirstReactionOrMutation(): Reaction<Variable[]> | undefined {
		if (this._mutations.length > 0) {
			return this._mutations[0];
		}
		if (this._reactions.length > 0) {
			return this._reactions[0];
		}
	}

	/**
	 * Return the last reaction or mutation of this reactor.
	 * 返回此反应器的最后一个反应或变更。
	 */
	protected _getLastReactionOrMutation(): Reaction<Variable[]> | undefined {
		let len = this._reactions.length;
		if (len > 0) {
			return this._reactions[len - 1];
		}
		len = this._mutations.length;
		if (len > 0) {
			return this._mutations[len - 1];
		}
	}

	/**
	 * Return a list of reactions owned by this reactor.
	 *
	 * The returned list is a copy of the list kept inside of the reactor,
	 * so changing it will not affect this reactor.
	 * 返回列表是此反应器内部列表的副本，因此修改该列表不会影响此反应器。
	 */
	protected _getMutations(): Array<Reaction<Variable[]>> {
		const arr: Reaction<Variable[]>[] = [];
		this._mutations.forEach((it) => {
			arr.push(it);
		});
		return arr;
	}

	/**
	 * Report whether the given port is downstream of this reactor. If so, the
	 * given port can be connected to with an output port of this reactor.
	 * 报告给定端口是否位于此反应器的下游。若是，此反应器的输出端口可以连接到该端口。
	 * @param port
	 */
	public _isDownstream(port: Port<unknown>): boolean {
		if (port instanceof InPort) {
			if (port._isContainedByContainerOf(this)) {
				return true;
			}
		}
		if (port instanceof OutPort) {
			if (port._isContainedBy(this)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Report whether the given port is upstream of this reactor. If so, the
	 * given port can be connected to an input port of this reactor.
	 * 报告给定端口是否位于此反应器的上游。若是，该端口可以连接到此反应器的输入端口。
	 * @param port
	 */
	public _isUpstream(port: Port<unknown>): boolean {
		if (port instanceof OutPort) {
			if (port._isContainedByContainerOf(this)) {
				return true;
			}
		}
		if (port instanceof InPort) {
			if (port._isContainedBy(this)) {
				return true;
			}
		}
		return false;
	}

	public canConnectCall<A extends T, R, T, S extends R>(src: CallerPort<A, R>, dst: CalleePort<T, S>): boolean {
		// FIXME: can we change the inheritance relationship so that we can overload?

		if (!this._runtime.isRunning()) {
			// console.log("Connecting before running")
			// Validate connections between callers and callees.

			if (src._isContainedByContainerOf(this) && dst._isContainedByContainerOf(this)) {
				return true;
			}
			return false;
		} else {
			// FIXME
		}
		return false;
	}

	/**
	 * Returns true if a given source port can be connected to the
	 * given destination port, false otherwise. Valid connections
	 * must:
	 * (1) adhere to the scoping rules and connectivity constraints
	 *     of reactors; and
	 * (2) not introduce cycles.
	 *
	 * The scoping rules of reactors can be summarized as follows:
	 *  - A port cannot connect to itself;
	 *  - Unless the connection is between a caller and callee, the
	 *    destination can only be connected to one source;
	 *  - ...
	 * 若给定源端口可以连接到给定目标端口，则返回 true，否则返回 false。有效连接必须遵循反应器的作用域规则和连通约束，并且不能引入循环。
	 * 反应器的作用域规则可概括为：端口不能连接到自身；除 caller 与 callee 之间的连接外，一个目标端口只能连接到一个源端口；……
	 * @param src The start point of a new connection.
	 * @param dst The end point of a new connection.
	 */
	public canConnect<R, S extends R>(src: IOPort<S>, dst: IOPort<R>): CanConnectResult {
		// Immediate rule out trivial self loops.
		// 立即排除简单的自环连接。
		if (src === dst) {
			return CanConnectResult.SELF_LOOP;
		}

		// Check the race condition
		//   - between reactors and reactions (NOTE: check also needs to happen
		//     in addReaction)
		// 检查反应器与反应之间的竞争条件（注意：`addReaction` 中也需要检查）。
		const deps = this._dependencyGraph.getUpstreamNeighbors(dst); // FIXME this will change with multiplex ports
		if (deps !== undefined && deps.size > 0) {
			return CanConnectResult.DESTINATION_OCCUPIED;
		}

		if (!this._runtime.isRunning()) {
			// console.log("Connecting before running")
			// Validate connections between callers and callees.
			// Additional checks for regular ports.
			// 校验 caller 与 callee 之间的连接，并对普通端口执行额外检查。

			// console.log("IOPort")
			// Rule out write conflicts.
			//   - (between reactors)
			// 排除反应器之间的写入冲突。
			if (this._dependencyGraph.getDownstreamNeighbors(dst).size > 0) {
				return CanConnectResult.DOWNSTREAM_WRITE_CONFLICT;
			}

			if (!this._isInScope(src, dst)) {
				return CanConnectResult.NOT_IN_SCOPE;
			}
			return CanConnectResult.SUCCESS;
		} else {
			// Attempt to make a connection while executing.
			// Check the local dependency graph to figure out whether this change
			// introduces zero-delay feedback.
			// 尝试在执行期间建立连接。检查局部依赖图，以判断此更改是否引入零延迟反馈。
			// console.log("Runtime connect.")

			// check if the connection is outside of container
			// 检查连接是否越出容器作用域。
			if (src instanceof OutPort && dst instanceof InPort && src._isContainedBy(this) && dst._isContainedBy(this)) {
				return CanConnectResult.RT_CONNECTION_OUTSIDE_CONTAINER;
			}

			/**
			 * TODO (axmmisaka): The following code is commented for multiple reasons:
			 * The causality interface check is not fully implemented so new checks are failing
			 * Second, direct feedthrough itself would not cause any problem *per se*.
			 * To ensure there is no cycle, the safest way is to check against the global dependency graph.
			 * TODO：以下代码因多种原因暂不采用：因果接口检查尚未完整实现，新增检查会失败；此外，直接馈通本身并不必然导致问题。为确保无环，最稳妥的方式是检查全局依赖图。
			 */

			let app = this as Reactor;
			while (app._getContainer() !== app) {
				app = app._getContainer();
			}
			const graph = app._getPrecedenceGraph();
			graph.addEdge(src, dst);
			if (graph.hasCycle()) {
				return CanConnectResult.RT_CYCLE;
			}

			return CanConnectResult.SUCCESS;
		}
	}

	private _isInScope(src: IOPort<unknown>, dst?: IOPort<unknown>): boolean {
		// Assure that the general scoping and connection rules are adhered to.
		// 确保遵循通用作用域和连接规则。
		if (src instanceof OutPort) {
			if (dst instanceof InPort) {
				// OUT to IN
				// 输出端口连接到输入端口。
				if (src._isContainedByContainerOf(this) && dst._isContainedByContainerOf(this)) {
					return true;
				} else {
					return false;
				}
			} else {
				// OUT to OUT
				// 输出端口连接到输出端口。
				if (src._isContainedByContainerOf(this) && (dst === undefined || dst._isContainedBy(this))) {
					return true;
				} else {
					return false;
				}
			}
		} else {
			if (dst instanceof InPort) {
				// IN to IN
				// 输入端口连接到输入端口。
				if (src._isContainedBy(this) && dst._isContainedByContainerOf(this)) {
					return true;
				} else {
					return false;
				}
			} else {
				// IN to OUT
				// 输入端口连接到输出端口。
				if (src._isContainedBy(this) && dst !== undefined && dst._isContainedBy(this)) {
					return true;
				} else {
					return false;
				}
			}
		}
	}

	/**
	 * Connect a source port to a downstream destination port without canConnect() check.
	 * This must be used with caution after checking canConnect for the given ports.
	 * 将源端口连接到下游目标端口，但不执行 `canConnect()` 检查。此方法必须谨慎使用，并且应先对给定端口调用 `canConnect()`。
	 * @param src The source port to connect.
	 * @param dst The destination port to connect.
	 */
	private _uncheckedConnect<R, S extends R>(src: IOPort<S>, dst: IOPort<R>): void {
		Log.debug(this, () => `connecting ${src} and ${dst}`);
		// Add dependency implied by connection to local graph.
		// 将连接所表示的依赖关系添加到局部依赖图。
		this._dependencyGraph.addEdge(src, dst);
		// Register receiver for value propagation.
		// 注册接收端以传播端口值。
		const writer = dst.asWritable(this._getKey(dst));
		src.getManager(this._getKey(src)).addReceiver(writer as unknown as WritablePort<S>);
		const val = src.get();
		if (this._runtime.isRunning() && val !== undefined) {
			writer.set(val);
		}
	}

	/**
	 * Connect a source port to a downstream destination port. If a source is a
	 * regular port, then the type variable of the source has to be a subtype of
	 * the type variable of the destination. If the source is a caller port,
	 * then the destination has to be a callee port that is effectively a
	 * subtype of the caller port. Because functions have a contra-variant
	 * subtype relation, the arguments of the caller side must be a subtype of
	 * the callee's, and the return value of the callee's must be a subtype of
	 * the caller's.
	 * 将源端口连接到下游目标端口。若源是普通端口，则源端口的类型变量必须是目标端口类型变量的子类型。
	 * 若源是 caller 端口，则目标必须是一个 callee 端口，并且其类型相对于 caller 端口构成有效子类型关系。由于函数参数的子类型关系是逆变的，caller 端的参数类型必须是 callee 端的子类型，而 callee 的返回值类型必须是 caller 端的子类型。
	 * @param src The source port to connect.
	 * @param dst The destination port to connect.
	 */
	protected _connect<R, S extends R>(src: IOPort<S>, dst: IOPort<R>): void {
		if (src === undefined || src === null) {
			throw new Error("Cannot connect unspecified source");
		}
		if (dst === undefined || dst === null) {
			throw new Error("Cannot connect unspecified destination");
		}
		const canConnectResult = this.canConnect(src, dst);
		// I know, this looks a bit weird. But
		// 这里看起来有些奇怪，但……
		if (canConnectResult !== CanConnectResult.SUCCESS) {
			throw new Error(`ERROR connecting ${src} to ${dst}. Reason is ${canConnectResult.valueOf()}`);
		}
		this._uncheckedConnect(src, dst);
	}

	protected _connectMulti<R, S extends R>(
		src: Array<MultiPort<S> | IOPort<S>>,
		dest: Array<MultiPort<R> | IOPort<R>>,
		repeatLeft: boolean,
	): void {
		const leftPorts = new Array<IOPort<S>>(0);
		const rightPorts = new Array<IOPort<R>>(0);

		// TODO(hokeun): Check if the multiport's container is Bank when Bank is implemented.
		// TODO：Bank 实现完成后，检查 multiport 的容器是否为 Bank。
		src.forEach((port) => {
			if (port instanceof MultiPort) {
				port.channels().forEach((singlePort) => {
					leftPorts.push(singlePort);
				});
			} else if (port instanceof IOPort) {
				leftPorts.push(port);
			}
		});

		dest.forEach((port) => {
			if (port instanceof MultiPort) {
				port.channels().forEach((singlePort) => {
					rightPorts.push(singlePort);
				});
			} else if (port instanceof IOPort) {
				rightPorts.push(port);
			}
		});

		if (repeatLeft) {
			const leftPortsSize = leftPorts.length;
			for (let i = 0; leftPorts.length < rightPorts.length; i++) {
				leftPorts.push(leftPorts[i % leftPortsSize]);
			}
		}

		if (leftPorts.length < rightPorts.length) {
			Log.warn(null, () => "There are more right ports than left ports. ", "Not all ports will be connected!");
		} else if (leftPorts.length > rightPorts.length) {
			Log.warn(null, () => "There are more left ports than right ports. ", "Not all ports will be connected!");
		}

		for (let i = 0; i < leftPorts.length && i < rightPorts.length; i++) {
			const canConnectResult = this.canConnect(leftPorts[i], rightPorts[i]);
			if (canConnectResult !== CanConnectResult.SUCCESS) {
				throw new Error(
					`ERROR connecting ${leftPorts[i]} 
                    to ${rightPorts[i]} 
                    in multiple connections from ${src} 
                    to ${dest}`,
				);
			}
		}
		for (let i = 0; i < leftPorts.length && i < rightPorts.length; i++) {
			this._uncheckedConnect(leftPorts[i], rightPorts[i]);
		}
	}

	protected _connectCall<A extends T, R, T, S extends R>(src: CallerPort<A, R>, dst: CalleePort<T, S>): void {
		if (this.canConnectCall(src, dst)) {
			Log.debug(this, () => `connecting ${src} and ${dst}`);
			// Treat connections between callers and callees separately.
			// Note that because A extends T and S extends R, we can safely
			// cast CalleePort<T,S> to CalleePort<A,R>.
			// 单独处理 caller 与 callee 之间的连接。由于 A 扩展 T 且 S 扩展 R，可以安全地将 `CalleePort<T,S>` 转换为 `CalleePort<A,R>`。
			src.remotePort = dst as unknown as CalleePort<A, R>;
			// Register the caller in the callee reactor so that it can
			// establish dependencies on the callers.
			// 在 callee 所属反应器中注册 caller，以便建立对 caller 的依赖。
			const calleeManager = dst.getManager(this._getKey(dst));
			const callerManager = src.getManager(this._getKey(src));
			const container = callerManager.getContainer();
			const callers = new Set<Reaction<Variable[]>>();
			container._dependencyGraph.getDownstreamNeighbors(src).forEach((dep) => {
				if (dep instanceof Reaction) {
					callers.add(dep);
				}
			});
			const first = container._getFirst(callers);
			const last = container._getLast(callers);
			const lastCaller = calleeManager.getLastCaller();
			if (lastCaller !== undefined) {
				// This means the callee port is bound to a reaction and
				// there may be zero or more callers. We now continue
				// building a chain of callers.
				// 这表示 callee 端口已绑定到一个反应，并且可能有零个或多个 caller。此处继续构建 caller 链。
				if (first != null) {
					this._dependencyGraph.addEdge(lastCaller, first);
				} else {
					this._dependencyGraph.addEdge(dst, src);
				}
				if (last != null) calleeManager.setLastCaller(last);
			} else {
				throw new Error("No procedure linked to callee port");
			}
		} else {
			throw new Error(`ERROR connecting ${src} to ${dst}`);
		}
	}

	/**
	 * Return a dependency graph consisting of only this reactor's own ports
	 * and the dependencies between them.
	 * 返回仅包含此反应器自身端口及其相互依赖关系的依赖图。
	 */
	protected _getCausalityInterface(): PrecedenceGraph<Port<unknown>> {
		const ifGraph = this._causalityGraph;
		// Find all the input and output ports that this reactor owns.
		// 查找此反应器拥有的所有输入端口和输出端口。

		const inputs = this._findOwnInputs();
		const outputs = this._findOwnOutputs();
		const visited = new Set();

		const search = (output: OutPort<unknown>, nodes: Set<Port<unknown> | Reaction<Variable[]>>): void => {
			for (const node of nodes) {
				if (!visited.has(node)) {
					visited.add(node);
					if (node instanceof InPort && inputs.has(node as InPort<unknown>)) {
						ifGraph.addEdge(node, output);
					} else {
						search(output, this._dependencyGraph.getUpstreamNeighbors(output));
					}
				}
			}
		};

		// For each output, walk the graph and add dependencies to
		// the inputs that are reachable.
		// 遍历每个输出端口，并为图中可达的输入端口添加依赖。
		for (const output of outputs) {
			search(output, this._dependencyGraph.getUpstreamNeighbors(output));
			visited.clear();
		}

		return ifGraph;
	}

	private _findOwnCalleePorts(): Set<CalleePort<unknown, unknown>> {
		const ports = new Set<CalleePort<unknown, unknown>>();
		for (const component of this._keyChain.keys()) {
			if (component instanceof CalleePort) {
				ports.add(component as CalleePort<unknown, unknown>);
			}
		}
		return ports;
	}

	private _findOwnPorts(): Set<Port<unknown>> {
		const ports = new Set<Port<unknown>>();
		for (const component of this._keyChain.keys()) {
			if (component instanceof Port) {
				ports.add(component as Port<unknown>);
			}
		}
		return ports;
	}

	private _findOwnInputs(): Set<InPort<unknown>> {
		const inputs = new Set<InPort<unknown>>();
		for (const component of this._keyChain.keys()) {
			if (component instanceof InPort) {
				inputs.add(component as InPort<unknown>);
			}
		}
		return inputs;
	}

	private _findOwnOutputs(): Set<OutPort<unknown>> {
		const outputs = new Set<OutPort<unknown>>();
		for (const component of this._keyChain.keys()) {
			if (component instanceof OutPort) {
				outputs.add(component as OutPort<unknown>);
			}
		}
		return outputs;
	}

	private _findOwnReactors(): Set<Reactor> {
		const reactors = new Set<Reactor>();
		for (const component of this._keyChain.keys()) {
			if (component instanceof Reactor) {
				reactors.add(component);
			}
		}
		return reactors;
	}

	/**
	 * Delete the connection between the source and destination nodes.
	 * If the destination node is not specified, all connections from the source node to any other node are deleted.
	 * 删除源节点与目标节点之间的连接。若未指定目标节点，则删除源节点到其他所有节点的连接。
	 * @param src Source port of connection to be disconnected.
	 * @param dst Destination port of connection to be disconnected. If undefined, disconnect all connections from the source port.
	 */
	protected _disconnect<R, S extends R>(src: IOPort<S>, dst?: IOPort<R>): void {
		if ((!this._runtime.isRunning() && this._isInScope(src, dst)) || this._runtime.isRunning()) {
			this._uncheckedDisconnect(src, dst);
		} else {
			throw new Error(`ERROR disconnecting ${src} to ${dst}`);
		}
	}

	private _uncheckedDisconnect(src: IOPort<unknown>, dst?: IOPort<unknown>): void {
		Log.debug(this, () => `disconnecting ${src} and ${dst}`);
		if (dst instanceof IOPort) {
			const writer = dst.asWritable(this._getKey(dst));
			src.getManager(this._getKey(src)).delReceiver(writer);
			this._dependencyGraph.removeEdge(src, dst);
		} else {
			const nodes = this._dependencyGraph.getDownstreamNeighbors(src);
			for (const node of nodes) {
				if (node instanceof IOPort) {
					const writer = node.asWritable(this._getKey(node));
					src.getManager(this._getKey(src)).delReceiver(writer);
					this._dependencyGraph.removeEdge(src, node);
				}
			}
		}
	}

	// /**
	//  * Set all the timers of this reactor.
	//  */
	// protected _setTimers(): void {
	//     Log.debug(this, () => "Setting timers for: " + this);
	//     let timers = new Set<Timer>();
	//     for (const [k, v] of Object.entries(this)) {
	//         if (v instanceof Timer) {
	//             this._setTimer(v);
	//         }
	//     }
	// }

	// protected _setTimer(timer: Timer): void {
	//     Log.debug(this, () => ">>>>>>>>>>>>>>>>>>>>>>>>Setting timer: " + timer);
	//     let startTime;
	//     if (timer.offset.isZero()) {
	//         // getLaterTime always returns a microstep of zero, so handle the
	//         // zero offset case explicitly.
	//         startTime = this.util.getCurrentTag().getMicroStepsLater();
	//     } else {
	//         startTime = this.util.getCurrentTag().getLaterTag(timer.offset);
	//     }// FIXME: startup and a timer with offset zero should be simultaneous and not retrigger events
	//     this._schedule(new TaggedEvent(timer, this.util.getCurrentTag().getLaterTag(timer.offset), null));
	// }

	/**
	 * Report a timer to the app so that it gets unscheduled.
	 * 向应用报告定时器，以取消其调度。
	 * @param timer The timer to report to the app.
	 */
	protected _unsetTimer(timer: Timer): void {
		// FIXME: we could either set the timer to 'inactive' to tell the
		// scheduler to ignore future event and prevent it from rescheduling any.
		// The problem with this approach is that if, for some reason, a timer would get
		// reactivated, it could start seeing events that were scheduled prior to its
		// becoming inactive. Alternatively, we could remove the event from the queue,
		// but we'd have to add functionality for this.
		// 若定时器之后重新激活，它可能会收到停用前已安排的事件。另一种做法是从队列中移除该事件，但这需要为队列增加相应功能。
	}

	/**
	 * Unset all the timers of this reactor.
	 */
	protected _unsetTimers(): void {
		// Log.global.debug("Getting timers for: " + this)
		for (const [, v] of Object.entries(this)) {
			if (v instanceof Timer) {
				this._unsetTimer(v);
			}
		}
	}

	/**
	 * Return the fully qualified name of this reactor.
	 * 返回此反应器的全限定名称。
	 */
	toString(): string {
		return this._getFullyQualifiedName();
	}
}

/*
interface ComponentManager {
    getOwner(): Reactor;
}
*/

/**
 * A caller port sends arguments of type T and receives a response of type R.
 */
export class CallerPort<A, R> extends Port<R> implements Write<A>, Read<R> {
	public get(): R | undefined {
		if (this.tag?.isSimultaneousWith(this.runtime.util.getCurrentTag()) ?? false) return this.remotePort?.retValue;
	}

	public remotePort: CalleePort<A, R> | undefined;

	public set(value: A): void {
		// Invoke downstream reaction directly, and return store the result.
		if (this.remotePort != null) {
			this.remotePort.invoke(value);
		}
		this.tag = this.runtime.util.getCurrentTag();
	}

	public invoke(value: A): R | undefined {
		// If connected, this will trigger a reaction and update the
		// value of this port.
		this.set(value);
		// Return the updated value.
		return this.get();
	}

	/**
	 *
	 * @param container Reference to the container of this port
	 * (or the container thereof).
	 */
	public getManager(key: symbol | undefined): TriggerManager {
		if (this._key === key) {
			return this.manager;
		}
		throw Error("Unable to grant access to manager.");
	}

	protected manager: TriggerManager = new (class implements TriggerManager {
		constructor(private readonly port: CallerPort<A, R>) {}

		addReaction(reaction: Reaction<Variable[]>): void {
			throw new Error("A Caller port cannot use used as a trigger.");
		}

		delReaction(reaction: Reaction<Variable[]>): void {
			throw new Error("A Caller port cannot use used as a trigger.");
		}

		getContainer(): Reactor {
			return this.port._getContainer();
		}
	})(this);

	toString(): string {
		return "CallerPort";
	}
}

interface CalleeManager extends TriggerManager {
	setLastCaller: (reaction: Reaction<Variable[]> | undefined) => void;
	getLastCaller: () => Reaction<Variable[]> | undefined;
	addReaction: (procedure: Procedure<Variable[]>) => void;
	getProcedure: () => Procedure<Variable[]> | undefined;
}

/**
 * A callee port receives arguments of type A and send a response of type R.
 */
export class CalleePort<A, R> extends Port<A> implements Read<A>, Write<R> {
	get(): A | undefined {
		return this.argValue;
	}

	public retValue: R | undefined;

	public argValue: A | undefined;

	protected procedure: Procedure<Variable[]> | undefined;

	protected lastCaller: Reaction<Variable[]> | undefined;

	public invoke(value: A): R | undefined {
		this.argValue = value;
		this.procedure?.doReact();
		return this.retValue;
	}

	public set(value: R): void {
		// NOTE: this will not trigger reactions because
		// connections between caller ports and callee ports
		// are invoked directly.
		this.retValue = value;
	}

	public return(value: R): void {
		this.set(value);
	}

	/**
	 *
	 * @param key
	 */
	public getManager(key: symbol | undefined): CalleeManager {
		if (this._key === key) {
			return this.manager;
		}
		throw Error("Unable to grant access to manager.");
	}

	protected manager: CalleeManager = new (class implements CalleeManager {
		constructor(private readonly port: CalleePort<A, unknown>) {}

		getContainer(): Reactor {
			return this.port._getContainer();
		}

		addReaction(procedure: Reaction<Variable[]>): void {
			if (this.port.procedure !== undefined) {
				throw new Error(
					"Each callee port can trigger only a single" +
						" reaction, but two or more are found on: " +
						this.port.toString(),
				);
			}
			this.port.procedure = procedure;
		}

		delReaction(reaction: Reaction<Variable[]>): void {
			throw new Error("Method not implemented.");
		}

		setLastCaller(reaction: Reaction<Variable[]> | undefined): void {
			this.port.lastCaller = reaction;
		}

		getProcedure(): Procedure<Variable[]> | undefined {
			return this.port.procedure;
		}

		getLastCaller(): Reaction<Variable[]> | undefined {
			return this.port.lastCaller;
		}
	})(this);

	toString(): string {
		return "CalleePort";
	}
}

class EventQueue extends PrioritySet<Tag> {
	public push(event: TaggedEvent<unknown>): void {
		super.push(event);
	}

	public pop(): TaggedEvent<unknown> | undefined {
		return super.pop() as TaggedEvent<unknown>;
	}

	public peek(): TaggedEvent<unknown> | undefined {
		return super.peek() as TaggedEvent<unknown>;
	}
}

class ReactionQueue extends PrioritySet<Priority> {
	public push(reaction: Reaction<Variable[]>): void {
		super.push(reaction);
	}

	public pop(): Reaction<Variable[]> {
		return super.pop() as Reaction<Variable[]>;
	}

	public peek(): Reaction<Variable[]> {
		return super.peek() as Reaction<Variable[]>;
	}
}

export interface Runtime {
	util: UtilityFunctions;
	stage: (reaction: Reaction<Variable[]>) => void;
	initialize: (timer: Timer) => void;
	schedule: (e: TaggedEvent<unknown>) => void;
	delete: (r: Reactor) => void;
	isRunning: () => boolean;
}
interface UtilityFunctions {
	requestStop: () => void;
	reportError: (message?: string) => void;
	requestErrorStop: (message?: string) => void;
	isLastTAGProvisional: () => boolean;
	getCurrentTag: () => Tag;
	getCurrentLogicalTime: () => TimeValue;
	getCurrentPhysicalTime: () => TimeValue;
	getStartTag: () => Tag;
	getStartTime: () => TimeValue;
	getElapsedLogicalTime: () => TimeValue;
	getElapsedPhysicalTime: () => TimeValue;
	sendRTIMessage: <T>(data: T, destFederateID: number, destPortID: number) => void;
	sendRTITimedMessage: <T>(data: T, destFederateID: number, destPortID: number, time: TimeValue | undefined) => void;
	sendRTIPortAbsent: (destFederateID: number, destPortID: number, additionalDelay: TimeValue | undefined) => void;
}

export interface MutationSandbox extends ReactionSandbox {
	connect: {
		<R, S extends R>(src: ConnectablePort<S>, dst: ConnectablePort<R>): void;
		<A extends T, R, T, S extends R>(src: CallerPort<A, R>, dst: CalleePort<T, S>): void;
	};

	disconnect: <R, S extends R>(src: IOPort<S>, dst?: IOPort<R>) => void;

	delete: (reactor: Reactor) => void;

	getReactor: () => Reactor; // Container

	// FIXME:
	// forkJoin(constructor: new () => Reactor, ): void;
}

export interface ReactionSandbox {
	/**
	 * Collection of utility functions accessible from within a `react` function.
	 */
	util: UtilityFunctions;
	getBankIndex: () => number;
}

export class App extends Reactor {
	readonly _alarm = new Alarm();

	protected _errored = false;

	protected _errorMessage?: string;

	readonly _uuid = createId();

	/**
	 * Set of reactions to stage when this app starts executing.
	 */
	private readonly _reactionsAtStartup = new Set<Reaction<Variable[]>>();

	/**
	 * Set of timers to schedule when this app starts executing.
	 */
	private readonly _timersToSchedule = new Set<Timer>();

	/**
	 * Set of reactors that gets populated during each execution step,
	 * identifying all the terminated reactors that are to be removed
	 * at the end of that execution step.
	 */
	private readonly _reactorsToRemove = [] as Reactor[];

	/**
	 * Stores whether the current tag's reactions queue is empty.
	 * This will be false when a federate waits for network inputs.
	 * Note that this should be initialized with false to handle startup
	 * reactions of each federate.
	 * 记录当前标签的反应队列是否已处理完毕。联邦参与者等待网络输入时，该值为 false。
	 * 为处理各参与者的启动反应，此值应初始化为 false。
	 */
	private _isDone = false;

	/**
	 * Stores whether the last received TAG (Tag Advance Grant) was provisional.
	 * Every federate starts out assuming that it has been granted a PTAG
	 * at the start time, or if it has no upstream federates, a TAG.
	 * 记录最近收到的 TAG（Tag Advance Grant，标签推进授权）是否为临时授权。
	 * 每个联邦参与者初始时都假定自己在起始时刻获得了 PTAG；若没有上游参与者，则假定获得了 TAG。
	 */
	protected _isLastTAGProvisional = false;

	/**
	 * Inner class that provides access to utilities that are safe to expose to
	 * reaction code.
	 * 此内部类提供可安全开放给反应代码使用的实用函数。
	 */
	protected util: UtilityFunctions = new (class implements UtilityFunctions {
		constructor(private readonly app: App) {}

		public requestStop(): void {
			this.app._shutdown();
		}

		public requestErrorStop(message?: string): void {
			this.reportError(message);
			this.app._shutdown();
		}

		public reportError(message?: string): void {
			this.app._errored = true;
			if (this.app._errorMessage === undefined) {
				this.app._errorMessage = message;
			} else {
				this.app._errorMessage += ` || ${message ?? ""}`;
			}
		}

		public isLastTAGProvisional(): boolean {
			return this.app._isLastTAGProvisional;
		}

		public getCurrentTag(): Tag {
			return this.app._currentTag;
		}

		public getCurrentLogicalTime(): TimeValue {
			return this.app._currentTag.time;
		}

		public getCurrentPhysicalTime(): TimeValue {
			return getCurrentPhysicalTime();
		}

		public getStartTag(): Tag {
			return new Tag(this.app._startOfExecution, 0);
		}

		public getStartTime(): TimeValue {
			return this.app._startOfExecution;
		}

		public getElapsedLogicalTime(): TimeValue {
			return this.app._currentTag.time.difference(this.app._startOfExecution);
		}

		public getElapsedPhysicalTime(): TimeValue {
			return getCurrentPhysicalTime().subtract(this.app._startOfExecution);
		}

		public sendRTIMessage<T>(data: T, destFederateID: number, destPortID: number): void {
			this.app.sendRTIMessage(data, destFederateID, destPortID);
		}

		public sendRTITimedMessage<T>(
			data: T,
			destFederateID: number,
			destPortID: number,
			time: TimeValue | undefined,
		): void {
			this.app.sendRTITimedMessage(data, destFederateID, destPortID, time);
		}

		public sendRTIPortAbsent(destFederateID: number, destPortID: number, additionalDelay: TimeValue | undefined): void {
			this.app.sendRTIPortAbsent(destFederateID, destPortID, additionalDelay);
		}
	})(this);

	/**
	 * Inner class that provides access to the Runtime object.
	 * 此内部类提供对 Runtime 对象的访问。
	 */
	private readonly __runtime: Runtime = new (class implements Runtime {
		util: UtilityFunctions;

		constructor(private readonly app: App) {
			this.util = app.util;
		}

		/**
		 * Report whether the runtime has started processing events yet.
		 */
		public isRunning(): boolean {
			return this.app._active;
		}

		/**
		 * Stage the given reaction for execution at the current logical time.
		 * @param reaction The reaction to load onto the reaction queue.
		 */
		public stage(reaction: Reaction<Variable[]>): void {
			if (this.app._active) {
				this.app._reactionQ.push(reaction);
			} else {
				// If execution hasn't started yet, collect the staged reactions.
				// They will be queued once they have been assigned priorities.
				// 若执行尚未开始，则暂存已加入待执行队列的反应；待分配优先级后再将它们加入队列。
				this.app._reactionsAtStartup.add(reaction);
			}
		}

		/**
		 * Initialize the given timer.
		 *
		 * If execution has already begun, do the following:
		 *  - if the offset is nonzero, schedule the timer at t + offset; and
		 *  - otherwise, if the period is nonzero, schedule the it at t + period.
		 * If exection is yet to start, postpone initialization until the start
		 * time is known.
		 * 初始化指定定时器。若执行已开始：偏移量非零时，将定时器安排在 t + offset；否则，若周期非零，则安排在 t + period。
		 * 若执行尚未开始，则延迟初始化，直到起始时间确定。
		 *
		 * @param timer The timer to initialize.
		 */
		public initialize(timer: Timer): void {
			if (this.app._active) {
				Log.debug(this, () => `Scheduling timer ${timer._getFullyQualifiedName()}`);
				// Schedule relative to the current tag.
				// 相对于当前标签进行调度。
				let nextTag: Tag | null = null;
				if (!timer.offset.isZero()) {
					nextTag = this.app._currentTag.getLaterTag(timer.offset);
				} else if (!timer.period.isZero()) {
					nextTag = this.app._currentTag.getLaterTag(timer.period);
				}

				if (nextTag != null) {
					Log.debug(this, () => `Postponed scheduling of timer ${timer._getFullyQualifiedName()}`);
					this.schedule(new TaggedEvent(timer, nextTag, nextTag));
				}
			} else {
				// If execution hasn't started yet, collect the timers.
				// They will be initialized once it is known what the start time is.
				// 若执行尚未开始，则暂存定时器；确定起始时间后再初始化。
				this.app._timersToSchedule.add(timer);
			}
		}

		/**
		 * Push an event onto the event queue.
		 * 将事件推入事件队列。
		 * @param e Tagged event to push onto the event queue.
		 */
		public schedule(e: TaggedEvent<unknown>): void {
			const head = this.app._eventQ.peek();

			// Don't schedule events past the end of execution.
			// 不调度超出执行结束时间的事件。
			if (this.app._endOfExecution == null || !this.app._endOfExecution.isSmallerThan(e.tag)) {
				this.app._eventQ.push(e);
			}

			Log.debug(this, () => `Scheduling with trigger: ${e.trigger}`);
			Log.debug(this, () => `Elapsed logical time in schedule: ${String(this.util.getElapsedLogicalTime())}`);
			Log.debug(this, () => `Elapsed physical time in schedule: ${String(this.util.getElapsedPhysicalTime())}`);

			// If the scheduled event has an earlier tag than whatever is at the
			// head of the queue, set a new alarm.
			// 若待调度事件的标签早于队首事件的标签，则设置新的闹钟。
			if (head === undefined || e.tag.isSmallerThan(head.tag)) {
				this.app._setAlarmOrYield(e.tag);
			}
		}

		/**
		 * Mark a reactor for deletion. At the end of logical time at which
		 * this method was invoked the reactor will be removed from its
		 * container.
		 * 将反应器标记为待删除。调用此方法所在逻辑时间结束时，该反应器将从其容器中移除。
		 * @param r The reactor to be deleted.
		 */
		public delete(r: Reactor): void {
			this.app._reactorsToRemove.push(r);
		}
	})(this);

	/**
	 * Send an (untimed) message to the designated federate port through the RTI.
	 * This function throws an error if it isn't called on a FederatedApp.
	 * 通过 RTI 向指定联邦参与者的端口发送无时间戳消息。若不是在 FederatedApp 上调用，则抛出错误。
	 * @param data The data that contain the body of the message.
	 * @param destFederateID The federate ID that is the destination of this message.
	 * @param destPortID The port ID that is the destination of this message.
	 */
	protected sendRTIMessage<T>(data: T, destFederateID: number, destPortID: number): void {
		throw new Error("Cannot call sendRTIMessage from an App. sendRTIMessage may be called only from a FederatedApp");
	}

	/**
	 * Send a (timed) message to the designated federate port through the RTI.
	 * This function throws an error if it isn't called on a FederatedApp.
	 * 通过 RTI 向指定联邦参与者的端口发送带时间戳的消息。若不是在 FederatedApp 上调用，则抛出错误。
	 * @param data The data that contain the body of the message.
	 * @param destFederateID The federate ID that is the destination of this message.
	 * @param destPortID The port ID that is the destination of this message.
	 */
	protected sendRTITimedMessage<T>(
		data: T,
		destFederateID: number,
		destPortID: number,
		time: TimeValue | undefined,
	): void {
		throw new Error("Cannot call sendRTIMessage from an App. sendRTIMessage may be called only from a FederatedApp");
	}

	/**
	 * Send a port absent message to the destination port.
	 * This function throws an error if it isn't called on a FederatedApp.
	 * 向目标端口发送端口缺席消息。若不是在 FederatedApp 上调用，则抛出错误。
	 * @param additional_delay The offset applied to the timestamp
	 *  using after. The additional delay will be greater or equal to zero
	 *  if an after is used on the connection. If no after is given in the
	 *  program, NEVER is passed. To be overriden by the FederatedApp class.
	 * @param destFederatedID The fed ID of the receiving federate.
	 * @param destPortID The ID of the receiving port.
	 */
	protected sendRTIPortAbsent(
		destFederateID: number,
		destPortID: number,
		additionalDelay: TimeValue | undefined,
	): void {
		throw new Error(
			"Cannot call sendRTIPortAbsent from an App. sendRTIPortAbsent may be called only from a FederatedApp",
		);
	}

	/**
	 * The current time, made available so actions may be scheduled relative to it.
	 * 当前时间，供动作据此安排其执行时间。
	 */
	private _currentTag: Tag;

	/**
	 * Reference to "immediate" invocation of next.
	 * 指向 `next` 即时调用的引用。
	 */
	protected _immediateRef: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Priority set that keeps track of scheduled events.
	 * 跟踪已调度事件的优先级集合。
	 */
	private readonly _eventQ = new EventQueue();

	/**
	 * If not null, finish execution with success, this time interval after the
	 * start of execution.
	 * 若该值非 null，则在执行开始经过此时间间隔后，以成功状态结束执行。
	 */
	private readonly _executionTimeout: TimeValue | undefined;

	/**
	 * The time at which normal execution should terminate. When this time is
	 * defined, we can assume that a shutdown event associated with this time
	 * has been scheduled.
	 * 正常执行应终止的时间。定义此时间后，可认为已安排与之对应的关闭事件。
	 */
	private _endOfExecution: Tag | undefined;

	/**
	 * If false, execute with normal delays to allow physical time to catch up
	 * to logical time. If true, don't wait for physical time to match logical
	 * time.
	 * 为 false 时按正常延迟执行，使物理时间追上逻辑时间；为 true 时不等待二者同步。
	 */
	private readonly _fast: boolean;

	/**
	 * Indicates whether the program should continue running once the event
	 * queue is empty.
	 * 指示事件队列为空后程序是否继续运行。
	 */
	protected _keepAlive = false;

	/**
	 * Priority set that keeps track of reactions at the current Logical time.
	 * 跟踪当前逻辑时间下反应的优先级集合。
	 */
	protected readonly _reactionQ = new ReactionQueue();

	/**
	 * The physical time when execution began relative to January 1, 1970 00:00:00 UTC.
	 * Initialized in start().
	 * 执行开始时的物理时间，以 UTC 1970 年 1 月 1 日 00:00:00 为基准；由 `start()` 初始化。
	 */
	private _startOfExecution!: TimeValue;

	/**
	 * Indicates if _finish() was already called.
	 * This prevents _finish() from being called recursively.
	 * 指示 `_finish()` 是否已调用，以防止递归调用。
	 */
	private _done = false;

	/**
	 * Interval for snoozing and waking up.
	 * 暂停后再次唤醒的时间间隔。
	 */
	private _advanceMessageInterval: TimeValue = TimeValue.secs(1);

	public setAdvanceMessageInterval(advanceMessageInterval: TimeValue): void {
		this._advanceMessageInterval = advanceMessageInterval;
	}

	/**
	 * Unset all the timers of this reactor.
	 */
	protected _unsetTimers(): void {
		Object.entries(this)
			.filter((it) => it[1] instanceof Timer)
			.forEach((it) => {
				this._unsetTimer(it[1] as Timer);
			});
	}

	private readonly snooze: Action<Tag>;

	readonly _name: string;

	/**
	 * Create a new top-level reactor.
	 * 创建新的顶层反应器。
	 * @param executionTimeout Optional parameter to let the execution of the app time out.
	 * @param keepAlive Optional parameter, if true allows execution to continue with an empty event queue.
	 * @param fast Optional parameter, if true does not wait for physical time to catch up to logical time.
	 * @param success Optional callback to be used to indicate a successful execution.
	 * @param failure Optional callback to be used to indicate a failed execution.
	 */
	constructor(
		executionTimeout: TimeValue | undefined = undefined,
		keepAlive = false,
		fast = false,
		public success: () => void = () => undefined,
		public failure: () => void = () => undefined,
	) {
		super(null);

		let name = this.constructor.name;
		if (name === "") {
			name = "app";
		} else {
			name = name.charAt(0).toLowerCase() + name.slice(1);
		}
		this._name = name;

		// Update pointer to runtime object for this reactor and
		// its startup and shutdown action since the inner class
		// instance this.__runtime isn't initialized up until here.
		// 更新此反应器及其启动、关闭动作所持有的运行时对象引用；内部类实例 `this.__runtime` 到此处才完成初始化。
		this._receiveRuntimeObject(this.__runtime);
		this.startup._receiveRuntimeObject(this.__runtime);
		this.shutdown._receiveRuntimeObject(this.__runtime);
		this.__dummy._receiveRuntimeObject(this.__runtime);
		this.snooze = new Action(this, Origin.logical);

		// Initialize the scope in which reactions and mutations of this
		// reactor will execute. This is already done in the super constructor,
		// but has to be redone because at that time this.utils was not
		// initialized at that point.
		// 初始化此反应器中反应和变更的执行作用域。超类构造函数已执行过此操作，但当时 `this.utils` 尚未初始化，因此需要重新初始化。
		this._initializeReactionScope();
		this._initializeMutationScope();

		this._fast = fast;
		this._keepAlive = keepAlive;
		this._executionTimeout = executionTimeout;

		// NOTE: these will be reset properly during startup.
		// 注意：启动期间会正确重置这些值。
		this._currentTag = new Tag(TimeValue.secs(0), 0);
		this._startOfExecution = this._currentTag.time;
	}

	/**
	 * Check whether the next event can be handled or not.
	 *
	 * In a non-federated context this method always returns true.
	 * 检查是否可以处理下一个事件。在非联邦执行环境中，此方法始终返回 true。
	 * @param event The next event to be processed.
	 */
	protected _canProceed(event: TaggedEvent<unknown>): boolean {
		return true;
	}

	/**
	 * Set the current tag to be the next tag.
	 * 将当前标签设为下一个标签。
	 *
	 * @param event The tag of the next event to be handled.
	 */
	protected _advanceTime(nextTag: Tag): void {
		this._currentTag = nextTag;
	}

	protected _iterationComplete(): void {
		Log.debug(this, () => `Completed iteration at tag: ${this._currentTag}`);
	}

	/**
	 * Add a dummy event to the event queue.
	 * Currently, the sole usage of this is to ensure LET to be sent to the RTI
	 * when there is any physical action triggering output port(s) in federated execution.
	 * 向事件队列添加虚拟事件。目前唯一用途是在联邦执行中，物理动作触发任意输出端口时，确保向 RTI 发送 LET。
	 *
	 * @param tag The tag at which this dummy event occurs.
	 */
	protected _addDummyEvent(tag: Tag): void {
		this._eventQ.push(new TaggedEvent(this.__dummy, tag, 0));
	}

	/**
	 * Iterate over all reactions in the reaction queue and execute them.
	 * 遍历反应队列并执行其中的所有反应。
	 * @returns Whether every reactions at this tag are executed. This can
	 * be false in the federated exection.
	 */
	protected _react(): boolean {
		let r: Reaction<Variable[]>;
		while (this._reactionQ.size() > 0) {
			try {
				r = this._reactionQ.pop();
				r.doReact();
			} catch (e) {
				Log.error(this, () => `Exception occurred in reaction: ${r}: ${e}`);
				// Allow errors in reactions to kill execution.
				// 允许反应中的错误终止执行。
				throw e;
			}
		}
		Log.globalLogger.debug("Finished handling all events at current time.");
		return true;
	}

	/**
	 * Do the steps needed for the new logical tag.
	 * This function is overriden by federation.ts.
	 * 执行推进到新逻辑标签所需的步骤。此函数由 `federation.ts` 覆盖。
	 */
	protected _startTimeStep(): void {
		Log.debug(this, () => `Starting time step at tag: ${this._currentTag}`);
	}

	/**
	 * Pop all events from event_q with timestamp equal to current tag,
	 * extract all the reactions triggered by these events, and stick them
	 * into the reaction queue.
	 * 从 `event_q` 中取出所有时间戳等于当前标签的事件，提取这些事件触发的反应，并将其加入反应队列。
	 */
	private _popEvents(): void {
		// Execute all reactions that are triggered at the current tag
		// in topological order. After that, if the next event on the event queue
		// has the same time (but a greater microstep), repeat. This prevents
		// JS event loop from gaining control and imposing overhead. Asynchronous
		// activity therefore might get blocked, but since the results of such
		// activities are typically reported via physical actions, the tags of
		// the resulting events would be in the future, anyway.
		// 按拓扑顺序执行当前标签触发的所有反应。若队列中的下一个事件时间相同但微步更大，则重复处理。
		// 这样可避免 JS 事件循环接管控制并产生额外开销。因此异步活动可能被阻塞；不过这类活动的结果通常通过物理动作报告，
		// 所产生事件的标签无论如何都会位于未来。
		let nextEvent = this._eventQ.peek();
		do {
			// Keep popping the event queue until the next event has a different tag.
			// 持续从事件队列取出事件，直到下一个事件的标签不同。
			while (nextEvent?.tag.isSimultaneousWith(this._currentTag) ?? false) {
				const trigger = nextEvent?.trigger;
				this._eventQ.pop();
				Log.debug(this, () => `Popped off the event queue: ${trigger}`);
				// Handle timers.
				// 处理定时器。
				if (trigger instanceof Timer) {
					if (!trigger.period.isZero()) {
						Log.debug(this, () => `Rescheduling timer ${trigger}`);

						this.__runtime.schedule(new TaggedEvent(trigger, this._currentTag.getLaterTag(trigger.period), null));
					}
				}

				// Load reactions onto the reaction queue.
				// 将反应加入反应队列。
				if (nextEvent != null) {
					trigger?.update(nextEvent);
				}

				// Look at the next event on the queue.
				// 查看队列中的下一个事件。
				nextEvent = this._eventQ.peek();
			}

			// // End of this execution step. Perform cleanup.
			// while (this._reactorsToRemove.length > 0) {
			//   // const r = this._reactorsToRemove.pop();
			//   // FIXME: doing this for the entire model at the end of execution
			//   // could be a pretty significant performance hit, so we probably
			//   // don't want to do this
			//   // r?._unplug() FIXME: visibility
			// }

			// Peek at the event queue to see whether we can process the next event
			// or should give control back to the JS event loop.
			// 查看事件队列，判断是否可以继续处理下一个事件，或应将控制权交还给 JS 事件循环。
			nextEvent = this._eventQ.peek();
		} while (nextEvent != null && this._currentTag.isSimultaneousWith(nextEvent.tag));
	}

	/**
	 * Handle the next events on the event queue.
	 * ----
	 * Wait until physical time matches or exceeds the time of the least tag on
	 * the event queue. After this wait, load the reactions triggered by all
	 * events with the least tag onto the reaction queue and start executing
	 * reactions in topological order. Each reaction may produce outputs, which,
	 * in turn, may load additional reactions onto the reaction queue. Once done
	 * executing reactions for the current tag, see if the next tag has the same
	 * time (but a different microstep) and repeat the steps above until the
	 * next tag has both a different time and microstep. In this case, set an
	 * alarm to be woken up at the next time. Note that our timer implementation
	 * uses a zero-delay timer to unravel the stack while preventing I/O from
	 * taking place if computation is lagging behind physical time. Only once
	 * computation has caught up, full control is given back to the JS event
	 * loop. This prevents the system from being overwhelmed with external
	 * stimuli.
	 * 处理事件队列中的后续事件。
	 * 等待物理时间达到或超过事件队列中最小标签对应的时间。等待结束后，将该最小标签下所有事件触发的反应加入反应队列，并按拓扑顺序开始执行。
	 * 每个反应都可能产生输出，进而将更多反应加入反应队列。当前标签下的反应执行完毕后，检查下一个标签是否时间相同但微步不同；若是，则重复上述步骤，
	 * 直到下一个标签的时间和微步均不同。此时设置闹钟，在下一个时间唤醒运行时。
	 * 定时器实现使用零延迟计时器展开调用栈；当计算落后于物理时间时，这可以阻止 I/O 发生。只有计算追上后，才将控制权完全交还给 JS 事件循环，避免系统被外部刺激压垮。
	 */
	private _next(): void {
		let nextEvent = this._eventQ.peek();
		if (nextEvent != null || !this._isDone) {
			if (nextEvent != null && this._isDone) {
				// We're trying to advance a tag to the next event.
				// 正在尝试将标签推进到下一个事件。

				// Check whether the next event can be handled, or not quite yet.
				// A holdup can occur in a federated execution.
				// 检查是否可以处理下一个事件；联邦执行中可能需要暂缓处理。
				if (!this._canProceed(nextEvent)) {
					// If this happens, then a TAG from the RTI will trigger the
					// next invocation of _next.
					// 发生暂缓时，RTI 发来的 TAG 将触发下一次调用 `_next`。
					return;
				}
				// If it is too early to handle the next event, set a timer for it
				// (unless the "fast" option is enabled), and give back control to
				// the JS event loop.
				// 若尚未到处理下一个事件的时间，则为其设置定时器（除非启用了 `fast`），并将控制权交还给 JS 事件循环。
				if (getCurrentPhysicalTime().isEarlierThan(nextEvent.tag.time) && !this._fast) {
					this._setAlarmOrYield(nextEvent.tag);
					return;
				}

				// Advance logical time.
				// 推进逻辑时间。
				this._advanceTime(nextEvent.tag);

				// Start time step.
				// 开始新的时间步。
				this._startTimeStep();
			}
			// Start processing events.
			// 开始处理事件。
			this._popEvents();

			// React to all the events loaded onto the reaction queue.
			// 响应加入反应队列的所有事件。
			this._isDone = this._react();
			if (!this._isDone) {
				return;
			}
			nextEvent = this._eventQ.peek();

			// Done handling events.
			// _iterationComplete() sends a LTC (Logical Tag Complete) message when federated.
			// Make sure that a federate sends LTC only after actually handling an event.
			// 联邦执行时，`_iterationComplete()` 会发送 LTC（Logical Tag Complete，逻辑标签完成）消息。
			// 确保联邦参与者只有在实际处理完事件后才发送 LTC。
			this._iterationComplete();
		}

		// Once we've reached here, either we're done processing events and the
		// next event is at a future time, or there are no more events in the
		// queue.
		// 到达此处时，要么事件已处理完且下一个事件位于未来，要么队列中已没有事件。
		if (this._endOfExecution != null && this._currentTag.isSimultaneousWith(this._endOfExecution)) {
			// An end of execution has been specified; a shutdown event must
			// have been scheduled, and all shutdown events must have been
			// consumed because the next tag is
			// 已指定执行结束时间，因此必定已安排对应的关闭事件；下一个标签到达时，所有关闭事件均应已处理完毕。
			this._finish();
		} else {
			if (nextEvent != null) {
				Log.globalLogger.debug("Event queue not empty.");
				this._setAlarmOrYield(nextEvent.tag);
			} else {
				// The queue is empty, and no end of execution has been specified.
				// 队列为空，且未指定执行结束时间。
				if (this._keepAlive) {
					// Keep alive: snooze and wake up later.
					// 保持运行：暂停一段时间后再唤醒。
					Log.globalLogger.debug("Going to sleep.");
					this.snooze.asSchedulable(this._getKey(this.snooze)).schedule(this._advanceMessageInterval, this._currentTag);
				} else {
					// Don't keep alive: initiate shutdown.
					// 不保持运行：开始关闭流程。
					Log.globalLogger.debug("Initiating shutdown.");
					this._shutdown();
				}
			}
		}
	}

	/**
	 * Disable the alarm and clear possible immediate next.
	 * 禁用闹钟并清除可能待执行的即时调用。
	 */
	protected _cancelNext(): void {
		this._alarm.unset();
		if (this._immediateRef != null) {
			clearTimeout(this._immediateRef);
			this._immediateRef = undefined;
		}
		this._eventQ.empty();
	}

	/**
	 *
	 * @param tag
	 */
	protected _setAlarmOrYield(tag: Tag): void {
		Log.debug(this, () => {
			return `In setAlarmOrYield for tag: ${tag}`;
		});

		if (this._endOfExecution?.isSmallerThan(tag) ?? false) {
			// Ignore this request if the tag is later than the end of execution.
			// 若标签晚于执行结束时间，则忽略此请求。
			return;
		}

		const physicalTime = getCurrentPhysicalTime();
		const timeout = physicalTime.difference(tag.time);
		if (physicalTime.isEarlierThan(tag.time) && !this._fast) {
			// Set an alarm to be woken up when the event's tag matches physical
			// time.
			// 设置闹钟，使其在事件标签对应时间到达时唤醒运行时。
			this._alarm.set(
				function (this: App) {
					this._next();
				}.bind(this),
				timeout,
			);
		} else {
			// Either we're in "fast" mode, or we're lagging behind.
			// 当前处于 `fast` 模式，或逻辑执行已落后于物理时间。
			this._requestImmediateInvocationOfNext();
		}
	}

	/**
	 * Request an immediate invocation of `this._next()`.
	 * 请求立即调用 `this._next()`。
	 */
	protected _requestImmediateInvocationOfNext(): void {
		// Only schedule an immediate if none is already pending.
		// 仅在当前没有待执行的即时调用时才进行调度。
		if (this._immediateRef == null) {
			this._immediateRef = setTimeout(
				function (this: App) {
					this._immediateRef = undefined;
					this._next();
				}.bind(this),
				0,
			);
		}
	}

	/**
	 * Schedule a shutdown event at the current time if no such action has been taken yet.
	 * Clear the alarm, and set the end of execution to be the current tag.
	 * 若此前尚未安排关闭，则在当前时间安排关闭事件。清除闹钟，并将当前标签设为执行结束时间。
	 */
	protected _shutdown(): void {
		if (
			this.__runtime.isRunning() &&
			(this._endOfExecution === undefined || this._currentTag.time.isEarlierThan(this._endOfExecution.time))
		) {
			this._endOfExecution = this._currentTag.getMicroStepsLater(1); // FIXME: this could be a longer delay in distributed execution

			Log.debug(this, () => "Stop requested.");
			Log.debug(this, () => `Setting end of execution to: ${this._endOfExecution}`);

			this.schedulable(this.shutdown).schedule(0, null);
		} else {
			Log.globalLogger.debug("Ignoring App._shutdown() call after shutdown has already started.");
		}
	}

	/**
	 * Setter for _endOfExecution to be used used by the subclass, FederatedApp.
	 * 供子类 FederatedApp 使用的 `_endOfExecution` 设置器。
	 */
	protected _setEndOfExecution(stopTag: Tag): void {
		this._endOfExecution = stopTag;
		this.__runtime.schedule(new TaggedEvent(this.shutdown, this._endOfExecution, null));
	}

	/**
	 * Getter for _endOfExecution to be used used by the subclass, FederatedApp.
	 * 供子类 FederatedApp 使用的 `_endOfExecution` 获取器。
	 */
	protected _getEndOfExecution(): Tag | undefined {
		return this._endOfExecution;
	}

	/**
	 * Wrap up execution by logging information and reporting errors if applicable.
	 * 记录运行信息，并在适用时报告错误，以完成执行收尾。
	 */
	protected _finish(): void {
		if (this._done) {
			return;
		}
		this._done = true;
		this._cancelNext();
		Log.info(this, () => Log.hr);
		Log.info(this, () => `>>> End of execution at (logical) time: ${String(this.util.getCurrentLogicalTime())}`);
		Log.info(this, () => `>>> Elapsed physical time: ${String(this.util.getElapsedPhysicalTime())}`);
		Log.info(this, () => Log.hr);

		if (this._errored) {
			console.error(">>> Erroneous exit.");
			if (this._errorMessage != null) {
				console.error(`Reason: ${this._errorMessage}`);
			}
			this.failure();
		} else {
			this.success();
		}
	}

	/**
	 * Analyze the dependencies between reactions in this app.
	 *
	 * Assign priorities that encode the precedence relations between
	 * reactions. If there exist circular dependencies, throw an exception.
	 * This method should only be invoked prior to the start of execution,
	 * never during execution.
	 * 分析此应用中反应之间的依赖关系，并分配表示反应先后关系的优先级。若存在循环依赖，则抛出异常。
	 * 此方法只能在执行开始前调用，不能在执行期间调用。
	 */
	protected _analyzeDependencies(): void {
		Log.info(this, () => Log.hr);
		const initStart = getCurrentPhysicalTime();
		Log.globalLogger.info(">>> Initializing");

		Log.globalLogger.debug("Initiating startup sequence.");

		// Obtain the precedence graph, ensure it has no cycles,
		// and assign a priority to each reaction in the graph.
		// 获取先后关系图，确认其中无环，并为图中的每个反应分配优先级。
		const apg = this._getPrecedenceGraph();

		Log.debug(this, () => `Before collapse: ${apg.toString()}`);

		// 1. Collapse dependencies and weed out the ports.
		// 1. 折叠依赖关系并移除端口节点。
		const collapsed = new ReactionGraph(apg);

		// 2. Update priorities.
		// 2. 更新优先级。
		Log.debug(this, () => `After collapse: ${collapsed.toString()}`);

		if (collapsed.updatePriorities(true)) {
			Log.globalLogger.debug("No cycles.");
		} else {
			throw new Error("Cycle in reaction graph.");
		}

		Log.info(
			this,
			() => `>>> Spent ${String(getCurrentPhysicalTime().subtract(initStart))} checking the precedence graph.`,
		);
	}

	/**
	 * Set the logical start time of the execution according to the given time
	 * value. If an execution timeout is defined, also determine the end of
	 * execution is as the start time plus the execution timeout. This method
	 * also marks the app as "active" and initializes any timers that may have
	 * been created during the course of this app's instantiation.
	 * 根据给定时间值设置执行的逻辑起始时间。若定义了执行超时，结束时间也会设为起始时间加超时时长。
	 * 此方法还会将应用标记为“活动”，并初始化应用实例化期间创建的所有定时器。
	 * @param startTime The beginning of this app's execution. The end of
	 * execution is determined relative to this TimeValue is a timeout has
	 * been set.
	 */
	protected _determineStartAndEndOfExecution(startTime: TimeValue): void {
		// Let the start of the execution be the current physical time.
		// 将当前物理时间设为执行起始时间。
		this._startOfExecution = startTime;
		this._currentTag = new Tag(this._startOfExecution, 0);

		// Mark the app as active, now that the start time is known.
		// 起始时间已确定，将应用标记为活动状态。
		this._active = true;

		// Schedule all timers created during the instantiation of this app.
		// 调度应用实例化期间创建的所有定时器。
		this._timersToSchedule.forEach((timer) => {
			this.__runtime.initialize(timer);
		});

		if (this._executionTimeout != null) {
			this._endOfExecution = new Tag(this._startOfExecution.add(this._executionTimeout), 0);
			Log.debug(this, () => `Execution timeout: ${this._executionTimeout}`);

			// If there is a known end of execution, schedule a shutdown reaction to that effect.
			this.__runtime.schedule(new TaggedEvent(this.shutdown, this._endOfExecution, null));
		}
	}

	/**
	 * Load all reactions that were staged for immediate execution during this
	 * app's instantiation onto the reaction queue.
	 * 将应用实例化期间暂存为立即执行的所有反应加入反应队列。
	 */
	protected _loadStartupReactions(): void {
		this._reactionsAtStartup.forEach((r) => {
			this._reactionQ.push(r);
		});
	}

	/**
	 * Start executing reactions.
	 * 开始执行反应。
	 */
	protected _startExecuting(): void {
		Log.info(this, () => Log.hr);
		Log.info(this, () => Log.hr);

		Log.info(this, () => `>>> Start of execution: ${this._currentTag}`);
		Log.info(this, () => Log.hr);

		// Handle the reactions that were loaded onto the reaction queue.
		this._isDone = this._react();

		// Continue execution by processing the next event.
		this._next();
	}

	/**
	 * Start the app.
	 * 启动应用。
	 */
	public _start(): void {
		// First analyze the dependency graph to determine whether it is valid.
		// 首先分析依赖图，确认其有效。
		this._analyzeDependencies();

		// Then load any reactions that were staged during the instantiation of
		// any of the reactors.
		// 然后加载各反应器实例化期间暂存的反应。
		this._loadStartupReactions();

		// Use the current physical time to set the app's start of execution.
		// 使用当前物理时间设置应用的执行起始时间。
		this._determineStartAndEndOfExecution(getCurrentPhysicalTime());

		// Start the main event loop.
		// 启动主事件循环。
		this._startExecuting();
	}
}
