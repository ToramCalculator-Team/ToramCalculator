import type { Reaction } from "./reaction";
import type { Reactor, Runtime } from "./reactor";
import type { Tag } from "./time";
import type { TriggerManager } from "./trigger";
import { Trigger } from "./trigger";
import type { Absent, MultiReadWrite, Read, ReadWrite, Variable } from "./types";
import { Log } from "./util";

export abstract class Port<T> extends Trigger {
	protected receivers = new Set<WritablePort<T>>();

	protected runtime!: Runtime;

	constructor(container: Reactor) {
		super(container);
		this._linkToRuntimeObject();
	}

	/** The tag associated with this port's value, or undefined is there is none.
	 * 与此端口的值关联的标签；若无标签则为 undefined。
	 */
	protected tag: Tag | undefined;

	/** The current value associated with this port.
	 * 与此端口关联的当前值。
	 */
	protected value: T | Absent;

	public _receiveRuntimeObject(runtime: Runtime): void {
		if (this.runtime == null) {
			this.runtime = runtime;
		} else {
			throw new Error(`Can only establish link to runtime once. Name: ${this._getFullyQualifiedName()}`);
		}
	}

	/**
	 * Returns true if the connected port's value has been set; false otherwise.
	 * 若已设置所连接端口的值，则返回 true；否则返回 false。
	 */
	public isPresent(): boolean {
		Log.debug(this, () => "In isPresent()...");
		Log.debug(this, () => `value: ${this.value?.toString()}`);
		Log.debug(this, () => `tag: ${this.tag}`);
		Log.debug(this, () => `time: ${this.runtime.util.getCurrentLogicalTime()}`);

		if (
			this.value !== undefined &&
			this.tag !== undefined &&
			this.tag.isSimultaneousWith(this.runtime.util.getCurrentTag())
		) {
			return true;
		} else {
			return false;
		}
	}
}

export class ConnectablePort<T> implements Read<T> {
	public get = (): Absent => undefined;
	public getPort = (): IOPort<T> => this.port;

	constructor(public port: IOPort<T>) {}
}

/**
 * Abstract class for a writable port. It is intended as a wrapper for a
 * regular port. In addition to a get method, it also has a set method and
 * a method for retrieving the port that it wraps.
 * We have this abstract class so that we can do `instanceof` checks.
 * 可写端口的抽象包装类。除 `get` 外，还提供 `set` 和获取所包装端口的方法。
 * 定义为抽象类以支持 `instanceof` 检查。
 */
export abstract class WritablePort<T> implements ReadWrite<T> {
	abstract get(): T | undefined;
	abstract set(value: T): void;
	abstract getPort(): IOPort<T>;
}

export abstract class WritableMultiPort<T> implements MultiReadWrite<T> {
	abstract get(index: number): T | undefined;
	abstract set(index: number, value: T): void;
	abstract width(): number;
	abstract values(): Array<T | Absent>;
	abstract getPorts(): Array<IOPort<T>>;
}

/**
 * Interface for a writable multi port, intended as a wrapper for a multi port.
 * 可写多端口的接口，用作多端口的包装器。
 */
interface IOPortManager<T> extends TriggerManager {
	// See https://github.com/lf-lang/reactor-ts/issues/184
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	addReceiver(port: WritablePort<T>): void;
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	delReceiver(port: WritablePort<T>): void;
}

export abstract class IOPort<T> extends Port<T> {
	readonly _isIOPort = true;

	/**
	 * Return the value set to this port. Return `Absent` if the connected
	 * output did not have its value set at the current logical time.
	 * 返回设置到此端口的值。若当前逻辑时间内连接的输出端口未设置值，则返回 `Absent`。
	 */
	public get(): T | Absent {
		if (this.isPresent()) {
			return this.value;
		} else {
			return undefined;
		}
	}

	public asConnectable(): ConnectablePort<T> {
		return new ConnectablePort(this);
	}

	/**
	 * Only the holder of the key may obtain a writable port.
	 * 只有持有密钥的对象才能获取可写端口。
	 * @param key
	 */
	public asWritable(key: symbol | undefined): WritablePort<T> {
		if (this._key === key) {
			return this.writer;
		}
		throw Error(`Referenced port is out of scope: ${this._getFullyQualifiedName()}`); // FIXME: adjust messages for other methods as well
		// FIXME: we could potentially do this for reads/triggers as well just for scope rule enforcement
	}

	/**
	 *
	 * @param container Reference to the container of this port
	 * (or the container thereof).
	 */
	public getManager(key: symbol | undefined): IOPortManager<T> {
		if (this._key === key) {
			return this.manager;
		}
		throw Error("Unable to grant access to manager.");
	}

	/**
	 * Inner class instance to gain access to Write<T> interface.
	 * 用于访问 `Write<T>` 接口的内部类实例。
	 */
	protected writer = new (class extends WritablePort<T> {
		constructor(private readonly port: IOPort<T>) {
			super();
		}

		public set(value: T): void {
			this.port.value = value;
			this.port.tag = this.port.runtime.util.getCurrentTag();
			// Set values in downstream receivers.
			// 为下游接收端设置值。
			this.port.receivers.forEach((p) => {
				p.set(value);
			});
			// Stage triggered reactions for execution.
			// 将被触发的反应加入待执行队列。
			this.port.reactions.forEach((r) => {
				this.port.runtime.stage(r);
			});
		}

		public get(): T | Absent {
			return this.port.get();
		}

		public getPort(): IOPort<T> {
			return this.port;
		}

		public toString(): string {
			return this.port.toString();
		}
	})(this);

	/**
	 * Inner class instance to let the container configure this port.
	 * 供容器配置此端口的内部类实例。
	 */
	protected manager: IOPortManager<T> = new (class implements IOPortManager<T> {
		constructor(private readonly port: IOPort<T>) {}

		getContainer(): Reactor {
			return this.port._getContainer();
		}

		/**
		 * Add the given port to the list of receivers. If the connection was
		 * established at runtime and the upstream port already has a value,
		 * immediately propagate the value to the newly connected receiver.
		 * 将指定端口加入接收者列表。若连接在运行时建立且上游端口已有值，则立即将该值传递给新接入的接收者。
		 * @param port A newly connected downstream port.
		 */
		addReceiver(port: WritablePort<T>): void {
			this.port.receivers.add(port);
			if (this.port.runtime.isRunning()) {
				const val = this.port.get();
				if (val !== undefined) {
					port.set(val);
				}
			}
		}

		delReceiver(port: WritablePort<T>): void {
			this.port.receivers.delete(port);
		}

		addReaction(reaction: Reaction<Variable[]>): void {
			this.port.reactions.add(reaction);
		}

		delReaction(reaction: Reaction<Variable[]>): void {
			this.port.reactions.delete(reaction);
		}
	})(this);

	toString(): string {
		return this._getFullyQualifiedName();
	}
}

export class OutPort<T> extends IOPort<T> {}

export class InPort<T> extends IOPort<T> {}
