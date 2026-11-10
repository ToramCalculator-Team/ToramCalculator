import { Component } from "./component";
import type { TaggedEvent } from "./event";
import type { Reaction } from "./reaction";
import type { Reactor, Runtime } from "./reactor";
import type { Tag } from "./time";
import type { Absent, Variable } from "./types";

export interface TriggerManager {
	getContainer: () => Reactor;
	addReaction: (reaction: Reaction<Variable[]>) => void;
	delReaction: (reaction: Reaction<Variable[]>) => void;
}

/**
 * Abstract class for a trigger. A trigger may be an action, port, or timer.
 * 触发器的抽象基类。触发器可以是动作、端口或定时器。
 */
export abstract class Trigger extends Component {
	/**
	 * Reactions to trigger.
	 * 由此触发器触发的反应集合。
	 */
	protected reactions = new Set<Reaction<Variable[]>>();

	/**
	 * Request the manager of this trigger. The request will only be honored
	 * if the correct key is given. Each component has a unique symbol (a key)
	 * that is handed to the owner upon instantiation of the component. If the
	 * wrong key is supplied, return undefined.
	 * 请求获取此触发器的管理器。只有提供正确密钥时请求才会获准。每个组件都有唯一符号作为密钥，组件实例化时会将该密钥交给其所有者；若提供错误密钥，则返回 undefined。
	 * @param key The private key embedded in this trigger.
	 */
	abstract getManager(key: symbol | undefined): TriggerManager;

	/**
	 * Return whether or not this trigger is present.
	 * 返回此触发器当前是否存在。
	 */
	abstract isPresent(): boolean;

	public getContainer(): Reactor {
		return this._getContainer();
	}
}

/**
 * 定时调度触发器的抽象基类。
 */
export abstract class ScheduledTrigger<T> extends Trigger {
	protected value: T | Absent = undefined;

	protected tag: Tag | undefined;

	protected runtime!: Runtime;

	constructor(container: Reactor) {
		super(container);
		this._linkToRuntimeObject();
	}

	/**
	 * Update the current value of this timer in accordance with the given
	 * event, and trigger any reactions that list this timer as their trigger.
	 * 根据给定事件更新此调度触发器的当前值，并触发将其列为触发器的所有反应。
	 * @param e Timestamped event.
	 */
	public update(e: TaggedEvent<T>): void {
		if (!e.tag.isSimultaneousWith(this.runtime.util.getCurrentTag())) {
			throw new Error("Time of event does not match current logical time.");
		}
		if (e.trigger === this) {
			this.value = e.value;
			this.tag = e.tag;
			for (const r of this.reactions) {
				this.runtime.stage(r);
			}
		} else {
			throw new Error("Attempt to update action using incompatible event.");
		}
	}

	public getManager(key: symbol | undefined): TriggerManager {
		if (this._key === key) {
			return this.manager;
		}
		throw Error("Unable to grant access to manager.");
	}

	/**
	 * Returns true if this action was scheduled for the current
	 * logical time. This result is not affected by whether it
	 * has a value.
	 * 如果此动作已被调度到当前逻辑时间，则返回 true。结果不受动作是否携带值影响。
	 */
	public isPresent(): boolean {
		if (this.tag === undefined) {
			// This action has never been scheduled before.
			// 此动作此前从未被调度。
			return false;
		}
		if (this.tag.isSimultaneousWith(this.runtime.util.getCurrentTag())) {
			return true;
		} else {
			return false;
		}
	}

	protected manager = new (class implements TriggerManager {
		constructor(private readonly trigger: ScheduledTrigger<T>) {}

		getContainer(): Reactor {
			return this.trigger._getContainer();
		}

		addReaction(reaction: Reaction<Variable[]>): void {
			this.trigger.reactions.add(reaction);
		}

		delReaction(reaction: Reaction<Variable[]>): void {
			this.trigger.reactions.delete(reaction);
		}
	})(this);

	public _receiveRuntimeObject(runtime: Runtime): void {
		if (this.runtime == null) {
			this.runtime = runtime;
		} else {
			throw new Error("Can only establish link to runtime once.");
		}
	}
}

// FIXME(marten): move these to trigger.ts and let them extend trigger
