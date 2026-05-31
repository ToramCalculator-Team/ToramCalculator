import type { ActionResult, Agent, GlobalFunction } from "./Agent";
import { resolveAgentProperty } from "./AgentPropertyReference";
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
	 */
	getFuncInvoker(agent: Agent, name: string, resolveProperty?: (path: string) => unknown): InvokerFunction | null {
		const resolveArg = (arg: unknown): unknown => {
			if (Array.isArray(arg)) return arg.map(resolveArg);
			if (typeof arg === "object" && arg !== null) {
				const keys = Object.keys(arg);
				if (keys.length === 1 && keys[0] === "$") {
					const path = (arg as { $: string }).$;
					if (typeof path !== "string" || path.length === 0) {
						throw new Error("Agent property reference must be a non-empty string");
					}
					const value = resolveAgentProperty(agent, path);
					if (value !== undefined) return value;
					if (resolveProperty) return resolveProperty(path);
					return undefined;
				}
				const result: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(arg)) {
					result[k] = resolveArg(v);
				}
				return result;
			}
			return arg;
		};
		const processFunctionArguments = (args: any[]) => args.map(resolveArg);

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
