import type { ActionResult, Agent, GlobalFunction } from "./Agent";
import type { RootNodeDefinition } from "./BehaviourTreeDefinition";

export type InvokerFunction = (args: any[]) => ActionResult | boolean;

/**
 * 单例，用于存储和查找已注册的函数和子树。
 */
export const Lookup = {
	/**
	 * 存储所有已注册函数的对象，以函数名作为键。
	 */
	registeredFunctions: {} as { [key: string]: GlobalFunction },
	/**
	 * 存储所有已注册子树根节点定义的对象，以树名作为键。
	 */
	registeredSubtrees: {} as { [key: string]: RootNodeDefinition },

	/**
	 * 获取指定名称的函数。
	 * @param name 函数名称。
	 * @returns 指定名称的函数。
	 */
	getFunc(name: string): GlobalFunction {
		return Lookup.registeredFunctions[name];
	},

	/**
	 * 设置指定名称的函数以供后续查找。
	 * @param name 函数名称。
	 * @param func 函数。
	 */
	setFunc(name: string, func: GlobalFunction): void {
		Lookup.registeredFunctions[name] = func;
	},

	/**
	 * 获取指定 agent 和函数名的函数调用器。
	 * 如果 agent 对象上存在指定名称的函数，则返回该函数；
	 * 否则检查已注册的函数中是否有匹配项。
	 * @param agent 行为树为其建模行为的 agent 实例。
	 * @param name 函数名称。
	 * @returns 指定 agent 和函数名的函数调用器。
	 */
	getFuncInvoker(agent: Agent, name: string): InvokerFunction | null {
		// 处理传递给 agent 或已注册函数的参数的函数。
		const processFunctionArguments = (args: any[]) =>
			args.map((arg) => {
				// 该参数可能是 agent 属性引用。如果是，应将其替换为所引用的 agent 属性的值。
				// agent 属性引用是一个对象，具有单个 "$" 属性，其值为表示 agent 属性名的字符串。
				if (typeof arg === "object" && arg !== null && Object.keys(arg).length === 1 && Object.hasOwn(arg, "$")) {
					// 从表示 agent 属性引用的对象中获取 agent 属性名。
					const agentPropertyName = arg.$;

					// agent 属性名必须是有效的字符串。
					if (typeof agentPropertyName !== "string" || agentPropertyName.length === 0) {
						throw new Error("Agent property reference must be a string?");
					}

					return agent[agentPropertyName];
				}

				// 参数可以原样传递给函数。
				return arg;
			});

		// 检查 agent 是否包含指定的函数。
		const agentFunction = agent[name];
		if (agentFunction && typeof agentFunction === "function") {
			return (args: any[]) => agentFunction.apply(agent, processFunctionArguments(args));
		}

		// agent 不包含指定的函数，但可能已在某个时刻注册过。
		if (Lookup.registeredFunctions[name] && typeof Lookup.registeredFunctions[name] === "function") {
			const registeredFunction = Lookup.registeredFunctions[name];
			return (args: any[]) => registeredFunction(agent, ...processFunctionArguments(args));
		}

		// 没有可调用的函数。
		return null;
	},

	/**
	 * 获取所有已注册的子树根节点定义。
	 */
	getSubtrees(): { [key: string]: RootNodeDefinition } {
		return Lookup.registeredSubtrees;
	},

	/**
	 * 设置指定名称的子树以供后续查找。
	 * @param name 子树名称。
	 * @param subtree 子树。
	 */
	setSubtree(name: string, subtree: RootNodeDefinition) {
		Lookup.registeredSubtrees[name] = subtree;
	},

	/**
	 * 移除已注册的函数或子树。
	 * @param name 已注册的函数或子树的名称。
	 */
	remove(name: string) {
		delete Lookup.registeredFunctions[name];
		delete Lookup.registeredSubtrees[name];
	},

	/**
	 * 移除所有已注册的函数和子树。
	 */
	empty() {
		Lookup.registeredFunctions = {};
		Lookup.registeredSubtrees = {};
	},
};
