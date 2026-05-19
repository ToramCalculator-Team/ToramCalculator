import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import { State } from "~/lib/mistreevous/State";
import type { BtContext, MemberBtEnv } from "../Agent/BtContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";

export type BtContextFactoryWarning = {
	code:
		| "agent.compile.failed"
		| "agent.initialize.failed"
		| "agent.member.conflict"
		| "binding.member.conflict";
	message: string;
	memberName: string;
	slotName?: string;
};

export type CreateBtContextOptions<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> = {
	owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>;
	btBindings?: Record<string, unknown>;
	agent?: string;
	onWarning?: (warning: BtContextFactoryWarning) => void;
};

export type CreatedBtContext<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
> = {
	context: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>;
	warnings: BtContextFactoryWarning[];
};

/**
 * 构造 BT 私有上下文。
 *
 * 设计说明：编辑器预览和引擎运行时必须共享同一套槽合并规则，否则 authoring 结果无法代表真实执行语义。
 *
 * 可访问槽：
 * 1. member.runtime 只读 getter（BT 直接消费 $currentTimeMs / $currentSkill / $targetId 等）。
 * 2. owner 句柄（BT 专用 env，用于动作内通过 `this.owner` 访问成员能力）。
 * 3. BT bindings（action/condition invokers）。
 * 4. user agent 实例字段/方法（若有，且不覆盖前述槽）。
 *
 * runtime 字段保持扁平命名，getter 每次读取 owner.runtime 的当前值；FSM 是 runtime 的唯一写入方，BT 仅读取。
 */
export function createBtContext<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime = MemberSharedRuntime,
>(
	options: CreateBtContextOptions<TAttrKey, TStateEvent, TStateContext, TRuntime>,
): CreatedBtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> {
	const { owner, btBindings = {}, agent, onWarning } = options;
	const warnings: BtContextFactoryWarning[] = [];
	const runtime = owner.runtime as unknown as Record<string, unknown>;
	const btContext = {} as BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>;

	const warn = (warning: Omit<BtContextFactoryWarning, "memberName">): void => {
		const next = { ...warning, memberName: owner.name };
		warnings.push(next);
		onWarning?.(next);
	};

	defineRuntimeReadSlots(owner, btContext, runtime);

	Object.defineProperty(btContext, "runtime", {
		get: () => owner.runtime,
		enumerable: false,
		configurable: false,
	});

	Object.defineProperty(btContext, "owner", {
		get: () => owner,
		enumerable: false,
		configurable: false,
	});

	defineBtBindings(owner, btContext, btBindings, warn);
	defineAgentMembers(owner, btContext, agent?.trim(), warn);

	return { context: btContext, warnings };
}

/**
 * 把 runtime 字段投影成 BT context 上的只读槽。
 * 目的：保留 `$currentTimeMs` 这类扁平引用，同时阻止 BT 写出 shadow runtime 值。
 */
function defineRuntimeReadSlots<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime,
>(
	owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
	btContext: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>,
	runtime: Record<string, unknown>,
): void {
	for (const key of Object.keys(runtime)) {
		Object.defineProperty(btContext, key, {
			get: () => (owner.runtime as unknown as Record<string, unknown>)[key],
			set: () => {
				throw new Error(`[${owner.name}] BT runtime field is read-only: ${key}`);
			},
			enumerable: false,
			configurable: false,
		});
	}
}

function defineBtBindings<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime,
>(
	owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
	btContext: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>,
	btBindings: Record<string, unknown>,
	warn: (warning: Omit<BtContextFactoryWarning, "memberName">) => void,
): void {
	for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(btBindings))) {
		if (Object.hasOwn(btContext, name) || !!Object.getOwnPropertyDescriptor(btContext, name)) {
			warn({
				code: "binding.member.conflict",
				slotName: name,
				message: `[${owner.name}] skipped BT binding "${name}" because the slot already exists`,
			});
			continue;
		}
		Object.defineProperty(btContext, name, {
			...descriptor,
			configurable: true,
		});
	}
}

function defineAgentMembers<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime,
>(
	owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
	btContext: BtContext<TAttrKey, TStateEvent, TStateContext, TRuntime> & Record<string, unknown>,
	agent: string | undefined,
	warn: (warning: Omit<BtContextFactoryWarning, "memberName">) => void,
): void {
	type AgentInstance = Record<string, unknown>;
	type AgentCtor = new () => AgentInstance;

	if (!agent) return;

	let AgentClass: AgentCtor;
	try {
		const agentClassCreator = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as unknown as (
			bt: typeof BehaviourTree,
			state: typeof State,
			owner: MemberBtEnv<TAttrKey, TStateEvent, TStateContext, TRuntime>,
		) => AgentCtor;

		AgentClass = agentClassCreator(BehaviourTree, State, owner);
	} catch (error) {
		warn({
			code: "agent.compile.failed",
			message: `[${owner.name}] failed to compile BT agent: ${error instanceof Error ? error.message : String(error)}`,
		});
		return;
	}

	let instance: AgentInstance;
	try {
		instance = new AgentClass();
	} catch (error) {
		warn({
			code: "agent.initialize.failed",
			message: `[${owner.name}] failed to initialize BT agent: ${error instanceof Error ? error.message : String(error)}`,
		});
		return;
	}

	const registerProperty = (name: string, descriptor: PropertyDescriptor): void => {
		if (!name || name === "constructor") return;

		const runtimeSlotExists =
			Object.hasOwn(owner.runtime as unknown as Record<string, unknown>, name) ||
			!!Object.getOwnPropertyDescriptor(owner.runtime as unknown as Record<string, unknown>, name);
		const btSlotExists = Object.hasOwn(btContext, name) || !!Object.getOwnPropertyDescriptor(btContext, name);

		if (runtimeSlotExists || btSlotExists) {
			warn({
				code: "agent.member.conflict",
				slotName: name,
				message: `[${owner.name}] skipped BT agent member "${name}" because the slot already exists`,
			});
			return;
		}

		Object.defineProperty(btContext, name, {
			...descriptor,
			configurable: true,
		});
	};

	for (const key of Object.getOwnPropertyNames(instance)) {
		const descriptor = Object.getOwnPropertyDescriptor(instance, key);
		if (descriptor) {
			registerProperty(key, descriptor);
		}
	}

	const proto = AgentClass.prototype as object;
	for (const key of Object.getOwnPropertyNames(proto)) {
		if (key === "constructor") continue;
		const descriptor = Object.getOwnPropertyDescriptor(proto, key);
		if (descriptor) {
			registerProperty(key, descriptor);
		}
	}
}
