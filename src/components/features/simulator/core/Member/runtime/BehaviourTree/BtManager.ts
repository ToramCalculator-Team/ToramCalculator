import { createLogger } from "~/lib/Logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { Member } from "../../Member";
import type { CommonRuntimeContext } from "../Agent/CommonRuntimeContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";

const log = createLogger("BtManager");

type BtEntry<TRuntimeContext extends CommonRuntimeContext & Record<string, unknown>> = {
	bt: BehaviourTree;
	board: TRuntimeContext & Record<string, unknown>;
};

export class BtManager<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntimeContext extends CommonRuntimeContext & Record<string, unknown> = CommonRuntimeContext & Record<string, unknown>,
> {
	/** 主动效果行为树（不可并行，通常包括角色动画） */
	private activeEffectEntry: BtEntry<TRuntimeContext> | undefined = undefined;

	/** 可并行执行的行为树（如 buff / 常驻效果 / 召唤物 AI 等） */
	private parallelEntries: Map<string, BtEntry<TRuntimeContext>> = new Map();

	constructor(private owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>) {
	}

	/**
	 * 为指定 effect 创建独立 board（继承 runtimeContext），并把 agent 注入到 board 上。
	 *
	 * 注意：runtimeContext 在注册 agent 之前已经包含了所有引擎属性（如 owner、currentFrame、position 等）。
	 * 如果用户自定义的 agent 中有同名属性，会被忽略，引擎属性优先（保持与旧实现一致）。
	 * 这样设计是为了：
	 * 1. 编辑器测试时允许用户定义同名变量进行测试
	 * 2. 实际运行时使用引擎提供的权威属性，确保一致性
	 *
	 * @param agent Agent 类定义代码（形如 `class Agent { ... }`）
	 */
	private buildBoard(agent?: string): BtEntry<TRuntimeContext>["board"] {
		const runtimeContext = this.owner.runtimeContext;
		const board = Object.create(runtimeContext) as BtEntry<TRuntimeContext>["board"];

		// 约定：agent 为形如 `class Agent { ... }` 的代码片段
		// 为了和 BtEditor 保持一致，这里仍然注入 BehaviourTree/State/owner 作为可选依赖
		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		if (!agent) {
			return board;
		}

		let AgentClass: AgentCtor;
		try {
			const agentClassCreator = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as unknown as (
				bt: typeof BehaviourTree,
				state: typeof State,
				owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>,
			) => AgentCtor;

			AgentClass = agentClassCreator(BehaviourTree, State, this.owner);
		} catch (error) {
			log.warn(`🎮 [${this.owner.name}] Agent 编译失败：${error instanceof Error ? error.message : String(error)}`);
			return board;
		}

		let instance: AgentInstance;
		try {
			instance = new AgentClass();
		} catch (error) {
		log.warn(
			`🎮 [${this.owner.name}] Agent 初始化失败：${error instanceof Error ? error.message : String(error)}`,
		);
			return board;
		}

		const registerProperty = (name: string, descriptor: PropertyDescriptor): void => {
			if (!name || name === "constructor") return;

			// 引擎属性优先：runtimeContext 在注册 agent 之前已经包含了所有引擎属性
			// 检查方式：
			// 1. 检查对象自身是否有该属性（Object.hasOwn）
			// 2. 检查属性描述符是否存在（即使值为 undefined，描述符也可能存在）
			// 3. 检查属性是否可写（如果属性已存在但不可写，说明是引擎定义的只读属性）
			const hasOwn = Object.hasOwn(runtimeContext, name);
			const existingDescriptor = Object.getOwnPropertyDescriptor(runtimeContext, name);

			// 如果属性已存在，不应该注册用户定义
			// 注意：即使属性值为 undefined，只要属性描述符存在，就说明属性已经被定义
			if (hasOwn || existingDescriptor) {
				log.warn(`🎮 [${this.owner.name}] Agent 注册跳过：用户定义「${name}」与内置成员重名，已忽略（内置优先）`);
				return;
			}

			Object.defineProperty(board, name, {
				...descriptor,
				// 确保可清理（delete）
				configurable: true,
			});
		};

		// 1) 注入实例字段（class field / 构造函数内赋值）
		for (const key of Object.getOwnPropertyNames(instance)) {
			const descriptor = Object.getOwnPropertyDescriptor(instance, key);
			if (!descriptor) continue;
			registerProperty(key, descriptor);
		}

		// 2) 注入原型方法 / getter / setter（供行为树调用或供 $xxx 引用取值）
		const proto = AgentClass.prototype as unknown as object;
		for (const key of Object.getOwnPropertyNames(proto)) {
			if (key === "constructor") continue;
			const descriptor = Object.getOwnPropertyDescriptor(proto, key);
			if (!descriptor) continue;
			registerProperty(key, descriptor);
		}

		return board;
	}

	tickAll(): void {
		// 更新主动效果行为树（短期，不可并行）
		if (this.activeEffectEntry) {
			const state = this.activeEffectEntry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.activeEffectEntry = undefined;
				log.debug(`🎮 [${this.owner.name}] 主动效果行为树已完成 (${state})，自动清理`);
				this.owner.actor.send({ type: "技能执行完成" } as TStateEvent);
			} else {
				this.activeEffectEntry.bt.step();
			}
		}

		// 更新可并行行为树（buff 等）
		this.parallelEntries.forEach((entry, name) => {
			const state = entry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				log.debug(`🎮 [${this.owner.name}] 并行行为树 ${name} 已完成 (${state})，自动清理`);
				this.parallelEntries.delete(name);
			} else {
				entry.bt.step();
			}
		});
	}

	/**
	 * 注册主动效果行为树（不可并行）
	 *
	 * 注册顺序：
	 * 1. runtimeContext 已经包含了所有引擎属性（owner、currentFrame、position 等）
	 * 2. 为本次 effect 创建独立 board，并注册自定义 agent（如果提供）
	 * 3. 如果 agent 中有与引擎属性同名的属性，会被忽略并提示
	 *
	 * @param definition 行为树定义（MDSL 字符串或 JSON）
	 * @param agent 可选的 Agent 类定义代码（用户自定义的方法/getter/setter）
	 * @returns 创建的行为树实例
	 */
	registerActiveEffectBt(
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const board = this.buildBoard(agent?.trim());
		const bt = new BehaviourTree(definition, board);
		this.activeEffectEntry = { bt, board };
		return bt;
	}

	/**
	 * 注册可并行行为树（buff 等）
	 *
	 * @param name        并行行为树实例名称（用于后续查找/移除/hasBuff）
	 * @param definition  行为树定义（MDSL 或 JSON）
	 * @param agent       可选的 Agent 类定义（用于该并行树的自定义动作/状态）
	 */
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const board = this.buildBoard(agent?.trim());
		const bt = new BehaviourTree(definition, board);
		this.parallelEntries.set(name, { bt, board });
		return bt;
	}

	/** 注销主动效果行为树 */
	unregisterActiveEffectBt(): void {
		this.activeEffectEntry = undefined;
	}

	unregisterParallelBt(name: string): void {
		this.parallelEntries.delete(name);
	}

	getParallelBt(name: string): BehaviourTree | undefined {
		return this.parallelEntries.get(name)?.bt;
	}

	getActiveEffectBt(): BehaviourTree | undefined {
		return this.activeEffectEntry?.bt;
	}

	hasBuff(name: string): boolean {
		return this.parallelEntries.has(name);
	}

	clear(): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
	}
}
