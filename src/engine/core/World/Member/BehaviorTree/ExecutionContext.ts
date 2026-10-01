import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import { State } from "~/lib/mistreevous/State";
import { ModifierType } from "../runtime/AttributeContainer/AttributeContainer";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";

export type ExecutionContextWarning = {
	code: "agent.compile.failed" | "agent.initialize.failed" | "agent.member.conflict" | "binding.member.conflict";
	message: string;
	memberName: string;
	slotName?: string;
};

export type CreateExecutionContextOptions<TContext extends MemberSharedRuntime = MemberSharedRuntime> = {
	baseContext: TContext;
	memberName: string;
	bindings?: Record<string, unknown>;
	localContext?: Record<string, unknown>;
	agent?: string;
	agentOwner?: unknown;
	onWarning?: (warning: ExecutionContextWarning) => void;
};

export type CreateExecutionContextResult<TContext extends MemberSharedRuntime = MemberSharedRuntime> = {
	context: TContext & Record<string, unknown>;
	warnings: ExecutionContextWarning[];
};

/**
 * 创建一棵行为树的独立执行上下文。
 *
 * 上下文以共享 runtime 为原型，随后按 localContext、bindings、agent 的顺序补充成员。
 * runtime 和每棵行为树的临时成员保持隔离，避免 agent 或 BT binding 写回可 checkpoint 数据。
 */
export function createExecutionContext<TContext extends MemberSharedRuntime>(
	options: CreateExecutionContextOptions<TContext>,
): CreateExecutionContextResult<TContext> {
	const { baseContext, memberName, bindings = {}, localContext, agent, agentOwner, onWarning } = options;
	const warnings: ExecutionContextWarning[] = [];
	const context = Object.create(baseContext) as TContext & Record<string, unknown>;
	const warn = (warning: Omit<ExecutionContextWarning, "memberName">): void => {
		const next = { ...warning, memberName };
		warnings.push(next);
		onWarning?.(next);
	};

	if (localContext) {
		for (const [name, value] of Object.entries(localContext)) {
			Object.defineProperty(context, name, {
				value,
				writable: true,
				enumerable: true,
				configurable: true,
			});
		}
	}

	for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(bindings))) {
		if (name in context) {
			warn({
				code: "binding.member.conflict",
				slotName: name,
				message: `[${memberName}] skipped BT binding "${name}" — slot already exists`,
			});
			continue;
		}
		Object.defineProperty(context, name, { ...descriptor, configurable: true });
	}

	mergeAgentMembers(context, memberName, agent?.trim(), agentOwner, warn);
	return { context, warnings };
}

function mergeAgentMembers(
	context: Record<string, unknown>,
	memberName: string,
	agent: string | undefined,
	agentOwner: unknown,
	warn: (warning: Omit<ExecutionContextWarning, "memberName">) => void,
): void {
	if (!agent) return;

	type AgentInstance = Record<string, unknown>;
	type AgentCtor = new () => AgentInstance;

	let AgentClass: AgentCtor;
	try {
		const factory = new Function("BehaviourTree", "State", "ModifierType", "owner", `return ${agent};`) as (
			bt: typeof BehaviourTree,
			state: typeof State,
			modType: typeof ModifierType,
			owner: unknown,
		) => AgentCtor;
		AgentClass = factory(BehaviourTree, State, ModifierType, agentOwner);
	} catch (error) {
		warn({
			code: "agent.compile.failed",
			message: `[${memberName}] failed to compile agent: ${error instanceof Error ? error.message : String(error)}`,
		});
		return;
	}

	let instance: AgentInstance;
	try {
		instance = new AgentClass();
	} catch (error) {
		warn({
			code: "agent.initialize.failed",
			message: `[${memberName}] failed to init agent: ${error instanceof Error ? error.message : String(error)}`,
		});
		return;
	}

	const register = (name: string, descriptor: PropertyDescriptor): void => {
		if (!name || name === "constructor") return;
		if (name in context) {
			warn({
				code: "agent.member.conflict",
				slotName: name,
				message: `[${memberName}] skipped agent member "${name}" — slot exists`,
			});
			return;
		}
		Object.defineProperty(context, name, { ...descriptor, configurable: true });
	};

	for (const key of Object.getOwnPropertyNames(instance)) {
		const descriptor = Object.getOwnPropertyDescriptor(instance, key);
		if (descriptor) register(key, descriptor);
	}
	const prototype = AgentClass.prototype as object;
	for (const key of Object.getOwnPropertyNames(prototype)) {
		if (key === "constructor") continue;
		const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
		if (descriptor) register(key, descriptor);
	}
}
