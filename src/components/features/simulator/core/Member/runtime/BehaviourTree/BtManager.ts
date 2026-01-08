import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { Member } from "../../Member";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";

export class BtManager<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntimeContext extends Record<string, unknown> = Record<string, unknown>,
> {
	skillBt: BehaviourTree | undefined = undefined;
	buffBts: Map<string, BehaviourTree> = new Map<string, BehaviourTree>();
	/** 当前技能注册的函数名称列表，用于清理 */
	private skillFunNames: string[] = [];

	constructor(private owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>) {
	}

	/**
	 * 注册 Agent
	 *
	 * 注意：runtimeContext 在注册 agent 之前已经包含了所有引擎属性（如 owner、currentFrame、position 等）。
	 * 如果用户自定义的 agent 中有同名属性，会被忽略，引擎属性优先。
	 * 这样设计是为了：
	 * 1. 编辑器测试时允许用户定义同名变量进行测试
	 * 2. 实际运行时使用引擎提供的权威属性，确保一致性
	 *
	 * @param agent Agent 类定义代码（形如 `class Agent { ... }`）
	 */
	registerAgent(agent: string): void {
		const runtimeContext = this.owner.runtimeContext;

		// 约定：agent 为形如 `class Agent { ... }` 的代码片段
		// 为了和 BtEditor 保持一致，这里仍然注入 BehaviourTree/State/owner 作为可选依赖
		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		let AgentClass: AgentCtor;
		try {
			const agentClassCreator = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as unknown as (
				bt: typeof BehaviourTree,
				state: typeof State,
				owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>,
			) => AgentCtor;

			AgentClass = agentClassCreator(BehaviourTree, State, this.owner);
		} catch (error) {
			console.warn(`🎮 [${this.owner.name}] Agent 编译失败：${error instanceof Error ? error.message : String(error)}`);
			return;
		}

		let instance: AgentInstance;
		try {
			instance = new AgentClass();
		} catch (error) {
			console.warn(
				`🎮 [${this.owner.name}] Agent 初始化失败：${error instanceof Error ? error.message : String(error)}`,
			);
			return;
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
				console.warn(`🎮 [${this.owner.name}] Agent 注册跳过：用户定义「${name}」与内置成员重名，已忽略（内置优先）`);
				return;
			}

			Object.defineProperty(runtimeContext, name, {
				...descriptor,
				// 确保可清理（delete）
				configurable: true,
			});

			this.skillFunNames.push(name);
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
	}

	tickAll(): void {
		// 更新技能行为树
		if (this.skillBt) {
			// 如果技能行为树已完成（SUCCEEDED 或 FAILED），自动清理
			const state = this.skillBt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.skillBt = undefined;
				// 暂时不清理相关函数
				this.unregisterSkillFunctions();
				console.log(`🎮 [${this.owner.name}] 技能行为树已完成 (${state})，自动清理`);
				console.log("当前上下文", this.owner.runtimeContext);
				this.owner.actor.send({ type: "技能执行完成" } as TStateEvent);
			} else {
				this.skillBt.step();
			}
		}

		// 更新 Buff 行为树
		this.buffBts.forEach((bt, id) => {
			const state = bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				console.log(`🎮 [${this.owner.name}] Buff 行为树 ${id} 已完成 (${state})，自动清理`);
				this.buffBts.delete(id);
			} else {
				bt.step();
			}
		});
	}

	/**
	 * 注册技能行为树
	 *
	 * 注册顺序：
	 * 1. runtimeContext 已经包含了所有引擎属性（owner、currentFrame、position 等）
	 * 2. 然后注册技能自定义的 agent（如果提供）
	 * 3. 如果 agent 中有与引擎属性同名的属性，会被忽略并提示
	 *
	 * @param definition 行为树定义（MDSL 字符串或 JSON）
	 * @param agent 可选的 Agent 类定义代码（用户自定义的方法/getter/setter）
	 * @returns 创建的行为树实例
	 */
	registerSkillBt(
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		// 清理之前注册的函数
		this.unregisterSkillFunctions();

		// 注册技能自定义的 agent 到 runtimeContext
		// 注意：runtimeContext 已经包含了引擎属性，同名属性会被忽略
		if (agent) {
			this.registerAgent(agent.trim());
		}

		// 创建行为树实例（使用包含引擎属性和技能自定义属性的 runtimeContext）
		this.skillBt = new BehaviourTree(definition, this.owner.runtimeContext);
		return this.skillBt;
	}

	registerBuffBt(
		id: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
	): BehaviourTree | undefined {
		const bt = new BehaviourTree(definition, this.owner.runtimeContext);
		this.buffBts.set(id, bt);
		return bt;
	}

	/**
	 * 清理技能注册的函数
	 */
	private unregisterSkillFunctions(): void {
		const runtimeContext = this.owner.runtimeContext;
		for (const name of this.skillFunNames) {
			delete (runtimeContext as Record<string, unknown>)[name];
		}
		this.skillFunNames = [];
	}

	unregisterSkillBt(): void {
		// 清理注册的函数
		this.unregisterSkillFunctions();
		this.skillBt = undefined;
	}

	unregisterBuffBt(id: string): void {
		this.buffBts.delete(id);
	}

	getBuffBt(id: string): BehaviourTree | undefined {
		return this.buffBts.get(id);
	}

	getSkillBt(): BehaviourTree | undefined {
		return this.skillBt;
	}

	hasBuff(id: string): boolean {
		return this.buffBts.has(id);
	}

	clear(): void {
		this.skillBt = undefined;
		this.buffBts.clear();
	}
}
