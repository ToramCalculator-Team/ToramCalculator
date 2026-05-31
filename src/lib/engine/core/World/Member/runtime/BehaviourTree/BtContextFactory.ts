import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import { State } from "~/lib/mistreevous/State";
import type { MemberFSMEvent } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import type { BtContext, MemberBtManagerEnv } from "./BtManagerEnv";

export type BtContextFactoryWarning = {
	code: "agent.compile.failed" | "agent.initialize.failed" | "agent.member.conflict" | "binding.member.conflict";
	message: string;
	memberName: string;
	slotName?: string;
};

export type CreateBtContextOptions<
	TFSMEvent extends MemberFSMEvent,
	TExtraAttrKey extends string = string,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
> = {
	env: MemberBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>;
	btBindings?: Record<string, unknown>;
	agent?: string;
	onWarning?: (warning: BtContextFactoryWarning) => void;
};

export type CreateBtContextResult<
	TExtraAttrKey extends string = string,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
> = {
	context: TContext;
	warnings: BtContextFactoryWarning[];
};

/**
 * 构造 BT 上下文。
 *
 * 做三件事：
 * 1. 以 env.getContext() 取得的 runtime 为基础。
 * 2. 合并 btBindings（action/condition invokers），带冲突检测。
 * 3. 编译 user agent class 并合并实例成员，带冲突检测。
 *
 * 不再做 getter 代理 —— runtime 本身就是 BT 的 this。
 */
export function createBtContext<
	TFSMEvent extends MemberFSMEvent,
	TExtraAttrKey extends string,
	TContext extends MemberSharedRuntime<TExtraAttrKey>,
>(
	options: CreateBtContextOptions<TFSMEvent, TExtraAttrKey, TContext>,
): CreateBtContextResult<TExtraAttrKey, TContext> {
	const { env, btBindings = {}, agent, onWarning } = options;
	const warnings: BtContextFactoryWarning[] = [];
	const btContext = env.getContext();

	const warn = (w: Omit<BtContextFactoryWarning, "memberName">): void => {
		const next = { ...w, memberName: env.name };
		warnings.push(next);
		onWarning?.(next);
	};

	mergeBtBindings(btContext, btBindings, env.name, warn);
	mergeAgentMembers(btContext, env, agent?.trim(), warn);

	return { context: btContext, warnings };
}

/**
 * 把 btBindings 合并到 btContext 上。已存在的 key 跳过并 warn。
 */
function mergeBtBindings<TExtraAttrKey extends string>(
	btContext: BtContext<TExtraAttrKey>,
	btBindings: Record<string, unknown>,
	memberName: string,
	warn: (w: Omit<BtContextFactoryWarning, "memberName">) => void,
): void {
	for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(btBindings))) {
		if (name in btContext) {
			warn({
				code: "binding.member.conflict",
				slotName: name,
				message: `[${memberName}] skipped BT binding "${name}" — slot already exists`,
			});
			continue;
		}
		Object.defineProperty(btContext, name, { ...descriptor, configurable: true });
	}
}

/**
 * 编译 user agent class，实例化后把成员合并到 btContext。
 * 已存在的 key 跳过并 warn。
 */
function mergeAgentMembers<
	TFSMEvent extends MemberFSMEvent,
	TExtraAttrKey extends string,
	TContext extends MemberSharedRuntime<TExtraAttrKey>,
>(
	btContext: BtContext<TExtraAttrKey>,
	owner: MemberBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>,
	agent: string | undefined,
	warn: (w: Omit<BtContextFactoryWarning, "memberName">) => void,
): void {
	if (!agent) return;

	type AgentInstance = Record<string, unknown>;
	type AgentCtor = new () => AgentInstance;

	let AgentClass: AgentCtor;
	try {
		const factory = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as (
			bt: typeof BehaviourTree,
			state: typeof State,
			env: MemberBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>,
		) => AgentCtor;
		AgentClass = factory(BehaviourTree, State, owner);
	} catch (error) {
		warn({
			code: "agent.compile.failed",
			message: `[${owner.name}] failed to compile agent: ${error instanceof Error ? error.message : String(error)}`,
		});
		return;
	}

	let instance: AgentInstance;
	try {
		instance = new AgentClass();
	} catch (error) {
		warn({
			code: "agent.initialize.failed",
			message: `[${owner.name}] failed to init agent: ${error instanceof Error ? error.message : String(error)}`,
		});
		return;
	}

	const register = (name: string, desc: PropertyDescriptor): void => {
		if (!name || name === "constructor") return;
		if (name in btContext) {
			warn({
				code: "agent.member.conflict",
				slotName: name,
				message: `[${owner.name}] skipped agent member "${name}" — slot exists`,
			});
			return;
		}
		Object.defineProperty(btContext, name, { ...desc, configurable: true });
	};

	for (const key of Object.getOwnPropertyNames(instance)) {
		const desc = Object.getOwnPropertyDescriptor(instance, key);
		if (desc) register(key, desc);
	}
	const proto = AgentClass.prototype as object;
	for (const key of Object.getOwnPropertyNames(proto)) {
		if (key === "constructor") continue;
		const desc = Object.getOwnPropertyDescriptor(proto, key);
		if (desc) register(key, desc);
	}
}
