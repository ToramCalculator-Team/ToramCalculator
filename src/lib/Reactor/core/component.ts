import type { Reactor, Runtime } from "./reactor";

/**
 * Base class for named objects embedded in a hierarchy of reactors. Each
 * component can only be owned by a single reactor instance. All members of
 * this class are prefixed with an underscore to avoid name collisions with
 * ports, actions, timers, or reactor instances that may be part of the
 * interface of a `Reactor`, which extends this class.
 *
 * 反应器层级中具名对象的基类。每个组件只能由一个反应器实例持有。
 * 本类的成员统一使用下划线前缀，以避免与 `Reactor` 接口中的端口、动作、
 * 定时器或反应器实例发生名称冲突。
 *
 * @author Marten Lohstroh (marten@berkeley.edu)
 */
export abstract class Component {
	public static pathSeparator = ".";

	/**
	 * A symbol that identifies this component, and it also used to selectively
	 * grant access to its privileged functions.
	 * 标识此组件的符号，同时用于有选择地授予对特权函数的访问权限。
	 */
	protected _key = Symbol("Unique component identifier");

	/**
	 * The container of this component. Each component is contained by a
	 * reactor. Only instances of `App`, which denote top-level reactors,
	 * are self-contained.
	 * 此组件所属的容器。每个组件都包含在一个反应器中，只有表示顶层反应器的
	 * `App` 实例是自包含的。
	 */
	private readonly _container: Reactor;

	/**
	 * Create a new component and register it with the given container.
	 * 创建组件并将其注册到指定容器。
	 * @param container The reactor that will contain the new component,
	 * `null` if this is an instance of `App`, in which case the component
	 * will be designated as its own container.
	 *
	 * Note that each subclass implementation needs to call the method
	 * `_linkToRuntimeObject` immediately after calling this super
	 * constructor in order to establish a link with the runtime object.
	 * 注意，每个子类实现都必须在调用此父类构造函数后立即调用 `_linkToRuntimeObject`，以建立与运行时对象的连接。
	 * @param alias An optional alias for the component.
	 */
	constructor(container: Reactor | null) {
		if (container !== null) {
			// Register.
			container._register(this, this._key);
			// And set the container.
			this._container = container;
		} else {
			// App passes null and is its own container.
			this._container = this as unknown as Reactor;
		}
	}

	private _isRoot(): boolean {
		return (this._container as unknown as Component) === this;
	}

	/**
	 * Store a reference to the given runtime object as a private class member.
	 * 将给定运行时对象的引用保存为类的私有成员。
	 * @param runtime
	 */
	public abstract _receiveRuntimeObject(runtime: Runtime): void;

	/**
	 * Request the container to pass down its runtime object to this component.
	 * This function is to be called once and only once upon the construction
	 * of an object that subclasses `Component`. If it is called more than once
	 * a runtime error results.
	 * 请求容器将其运行时对象传递给此组件。继承 `Component` 的对象在构造时必须且只能调用此函数一次；重复调用会导致运行时错误。
	 */
	protected _linkToRuntimeObject(): void {
		this._getContainer()._requestRuntimeObject(this);
	}

	/**
	 * Report whether this component has been registered with its container or not.
	 * In principle, all components should have a container, but at the time of
	 * their construction there is a brief period where they are not. This is the
	 * only moment that a component is allowed register with its container.
	 * 报告此组件是否已注册到容器。原则上所有组件都应有容器，但构造过程中会短暂处于尚未注册的状态；组件只能在这一时刻注册到容器。
	 */
	public _isRegistered(): boolean {
		return this._getContainer() !== undefined;
	}

	/**
	 * Confirm whether or not this component is contained by the given reactor.
	 * 确认此组件是否由给定反应器直接包含。
	 * @param reactor The presumptive container of this component.
	 */
	public _isContainedBy(reactor: Reactor): boolean {
		if (this._isRoot()) return false;
		else if (this._container === reactor) return true;

		return false;
	}

	/**
	 * Confirm whether or not this component is contained by the container of
	 * the given reactor.
	 * 确认此组件是否由给定反应器的容器包含。
	 * @param reactor The container presumptive container of the container of
	 * this component.
	 */
	public _isContainedByContainerOf(reactor: Reactor): boolean {
		if (this._isRoot()) return false;
		else if (this._container._isContainedBy(reactor)) return true;

		return false;
	}

	/**
	 * Return a string that identifies this component.
	 * The name is a path constructed as `[App]/[..]/[Container]/[This]`.
	 * 返回标识此组件的字符串。名称采用 `[App]/[..]/[Container]/[This]` 路径形式。
	 * 返回用于标识此组件的字符串。名称是由 `[App]/[..]/[Container]/[This]`
	 * 构成的路径。
	 */
	_getFullyQualifiedName(): string {
		if (!this._isRoot()) {
			return this._container._getFullyQualifiedName() + Component.pathSeparator + this._getName();
		} else {
			return this._getName();
		}
	}

	/**
	 * Given a component and its container (the global object if the component
	 * is an `App`), return the key of the entry that matches the component.
	 * 给定组件及其容器（若组件是 `App`，则容器为全局对象），返回与该组件匹配的条目键。
	 * @param component a component of which the object is assumed to be its
	 * container
	 * @param object the assumed container of the component
	 * @returns the key of the entry that matches the component
	 */
	public static keyOfMatchingEntry(component: Component, object: object): string {
		for (const [key, value] of Object.entries(object)) {
			if (value === component) {
				return `${key}`;
			}
		}
		return "";
	}

	/**
	 * Given a port and its containing reactor, return the key of the entry that matches
	 * a multiport found in the reactor that matches the port.
	 * 给定端口及其所属反应器，返回该反应器中与此端口匹配的多端口条目键。
	 * @param port a port that is assumed to be a constituent of a multiport declared on
	 * the given reactor
	 * @param reactor a reactor that is assumed to have a multiport of which one of the
	 * constituents is the given port
	 * @returns an identifier for the port based on its location in a matching multiport
	 */
	public static keyOfMatchingMultiport(port: Component, reactor: Reactor): string {
		for (const [key, value] of Object.entries(reactor)) {
			if (value != null && (value as { _isMultiPort?: boolean })._isMultiPort === true) {
				const channels = (value as unknown as { channels: () => Component[] }).channels();
				for (let i = 0; i < channels.length; i++) {
					if (channels[i] === port) {
						return `${key}[${i}]`;
					}
				}
			}
		}
		return "";
	}

	public static keyOfMatchingBank(member: Component, reactor: Reactor): string {
		for (const [key, value] of Object.entries(reactor)) {
			if (value != null && (value as { _isBank?: boolean })._isBank === true) {
				const members = (value as unknown as { all: () => Component[] }).all();
				for (let i = 0; i < members.length; i++) {
					if (members[i] === member) {
						return `${key}[${i}]`;
					}
				}
			}
		}
		return "";
	}

	/**
	 * Return a string that identifies this component within its container.
	 * If no such string was found, return the name of the constructor.
	 * 返回此组件在容器中的标识字符串。若未找到对应字符串，则返回构造函数名称。
	 */
	public _getName(): string {
		let name: string = "";

		if (this._isRoot()) {
			name = (this as unknown as { _name?: string })._name ?? "";
		} else {
			name = Component.keyOfMatchingEntry(this, this._container);
		}

		if (name === "" && (this as { _isIOPort?: boolean })._isIOPort === true) {
			name = Component.keyOfMatchingMultiport(this, this._container);
		}

		if (name === "" && (this as { _isReactor?: boolean })._isReactor === true) {
			name = Component.keyOfMatchingBank(this, this._container);
		}

		if (name !== "") {
			return name;
		} else {
			return this.constructor.name;
		}
	}

	/**
	 * Return the container of this component.
	 * 返回此组件所属的容器。
	 */
	protected _getContainer(): Reactor {
		return this._container;
	}
}
