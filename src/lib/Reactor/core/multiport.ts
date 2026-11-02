import { Component } from "./component";
import { InPort, type IOPort, OutPort, WritableMultiPort, type WritablePort } from "./port";
import type { Reaction } from "./reaction";
import type { Reactor, Runtime } from "./reactor";
import type { TriggerManager } from "./trigger";
import { Trigger } from "./trigger";
import type { Absent, MultiRead, Variable } from "./types";

/**
 * A trigger that represents a multiport. All of channels of a multiport can be read.
 * To obtain a writable version, see @link{Reactor.allWritable()}.
 * 表示多端口的触发器。多端口的所有通道都可读取；若要获取可写版本，请参阅 `Reactor.allWritable()`。
 *
 * @author Marten Lohstroh <marten@berkeley.edu>
 * @author Hokeun Kim <hokeun@berkeley.edu>
 */
export abstract class MultiPort<T> extends Trigger implements MultiRead<T> {
	readonly _isMultiPort = true;

	/**
	 * Return all channels of this multiport.
	 * 返回此多端口的所有通道。
	 */
	abstract channels(): Array<IOPort<T>>;

	/**
	 * Return the channel identified by the given index.
	 * 返回指定索引对应的通道。
	 * @param index the index of the requested channel
	 */
	abstract channel(index: number): IOPort<T>;

	/**
	 * The channels of this multiport.
	 * 此多端口包含的通道。
	 */
	protected _channels: Array<IOPort<T>>;

	/** @inheritdoc */
	private readonly _width: number;

	/**
	 * Given an array of ports (channels), return an array holding the ports'
	 * current values.
	 * 根据端口（通道）数组，返回包含各端口当前值的数组。
	 * @param ports the ports to return the values of
	 * @returns the current values of the given ports
	 */
	public static values<T>(ports: Array<IOPort<T>>): Array<T | Absent> {
		const values = new Array<T | Absent>(ports.length);
		for (let i = 0; i < values.length; i++) {
			values[i] = ports[i].get();
		}
		return values;
	}

	/**
	 * Construct a new multiport.
	 * 创建一个新的多端口。
	 * @param container the reactor that will contain the new instance
	 * @param width the number of channels of newly created instance
	 */
	constructor(
		private readonly container: Reactor,
		width: number,
	) {
		super(container);
		this._channels = new Array<IOPort<T>>(width);
		this._width = width;
	}

	/**
	 * Obtain a writable version of this port, provided that the caller holds the required key.
	 * 调用方持有所需密钥时，获取此端口的可写版本。
	 * @param key
	 */
	public asWritable(key: symbol | undefined): WritableMultiPort<T> {
		if (this._key === key) {
			return this.writer;
		}
		throw Error(`Referenced port is out of scope: ${this._getFullyQualifiedName()}`);
	}

	/** @inheritdoc */
	public get(index: number): T | undefined {
		return this._channels[index].get();
	}

	/** @inheritdoc */
	getManager(key: symbol | undefined): TriggerManager {
		if (this._key === key) {
			return this.manager;
		}
		throw Error("Unable to grant access to manager.");
	}

	/**
	 * Return whether this multiport has any channels that are present.
	 * 返回此多端口是否有通道在当前逻辑时间存在。
	 * @returns true if there are any present channels
	 */
	isPresent(): boolean {
		return this.channels().some((channel) => channel.isPresent());
	}

	/**
	 * Return the number of channels of this multiport.
	 * 返回此多端口的通道数。
	 * @returns the number of channels
	 */
	public width(): number {
		return this._width;
	}

	/**
	 * Return an array of which the elements represent the current value of
	 * each channel, which may either be present or absent (i.e., undefined).
	 * 返回一个数组，其元素分别表示各通道的当前值；值可以存在，也可以缺失（即 `undefined`）。
	 * @returns an array of values
	 */
	public values(): Array<T | Absent> {
		return MultiPort.values(this._channels);
	}

	/**
	 * Inner class instance to let the container configure this port.
	 */
	protected manager = new (class implements TriggerManager {
		/** @inheritdoc */
		constructor(private readonly port: MultiPort<T>) {}

		/** @inheritdoc */
		getContainer(): Reactor {
			return this.port.getContainer();
		}

		/** @inheritdoc */
		addReaction(reaction: Reaction<Variable[]>): void {
			this.port.channels().forEach((channel) => {
				channel.getManager(this.getContainer()._getKey(channel)).addReaction(reaction);
			});
		}

		/** @inheritdoc */
		delReaction(reaction: Reaction<Variable[]>): void {
			this.port.channels().forEach((channel) => {
				channel.getManager(this.port._key).delReaction(reaction);
			});
		}
	})(this);

	/**
	 * Unimplemented method (multiports require not access to the runtime object).
	 * 未实现的方法（多端口不需要访问运行时对象）。
	 */
	public _receiveRuntimeObject(runtime: Runtime): void {
		throw new Error(
			"Multiports do not request to be linked to the" + " runtime object, hence this method shall not be invoked.",
		);
	}

	/**
	 * Inner class instance to gain access to MultiWrite<T> interface.
	 */
	protected writer = new (class extends WritableMultiPort<T> {
		getPorts(): Array<IOPort<T>> {
			return this.port._channels;
		}

		/**
			 * Storage for obtained writers.
		 * 已获取写入器的存储区。
		 */
		private readonly cache: Array<WritablePort<T>>;

		/** @inheritdoc */
		constructor(private readonly port: MultiPort<T>) {
			super();
			this.cache = [];
		}

		/** @inheritdoc */
		public get(index: number): T | undefined {
			return this.port._channels[index].get();
		}

		/** @inheritdoc */
		public set(index: number, value: T): void {
			let writableChannel = this.cache[index];
			if (writableChannel === undefined) {
				writableChannel = this.port.getContainer().writable(this.port._channels[index]);
				this.cache[index] = writableChannel;
			}
			writableChannel.set(value);
		}

		/** @inheritdoc */
		public width(): number {
			return this.port.width();
		}

		/** @inheritdoc */
		public values(): Array<T | Absent> {
			return this.port.values();
		}
	})(this);

	public toString(): string {
		return `${this.container.toString()}.${Component.keyOfMatchingEntry(this, this.container)}`;
	}
}

/**
 * A trigger that represents an input port that is also multiport.
 * 表示多输入端口的触发器。
 *
 * @author Marten Lohstroh <marten@berkeley.edu>
 * @author Hokeun Kim <hokeun@berkeley.edu>
 */
export class InMultiPort<T> extends MultiPort<T> {
	/** @inheritdoc */
	public channel(index: number): InPort<T> {
		return this._channels[index];
	}

	/** @inheritdoc */
	public channels(): Array<InPort<T>> {
		return this._channels;
	}

	/** @inheritdoc */
	constructor(container: Reactor, width: number) {
		super(container, width);
		for (let i = 0; i < width; i++) {
			this._channels[i] = new InPort<T>(container);
		}
	}
}

/**
 * A trigger that represents an output port that is also multiport.
 * 表示多输出端口的触发器。
 *
 * @author Marten Lohstroh <marten@berkeley.edu>
 * @author Hokeun Kim <hokeun@berkeley.edu>
 */
export class OutMultiPort<T> extends MultiPort<T> {
	/** @inheritdoc */
	constructor(container: Reactor, width: number) {
		super(container, width);
		for (let i = 0; i < width; i++) {
			this._channels[i] = new OutPort<T>(container);
		}
	}

	/** @inheritdoc */
	public channel(index: number): OutPort<T> {
		return this._channels[index];
	}

	/** @inheritdoc */
	public channels(): Array<OutPort<T>> {
		return this._channels;
	}

	/** @inheritdoc */
	public values(): Array<T | Absent> {
		return MultiPort.values(this._channels);
	}
}
