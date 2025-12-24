import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import State from "~/lib/mistreevous/State";
import type { Member } from "../../Member";
import type{ RuntimeContext } from "../Agent/AgentContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";

export class BtManager<
TAttrKey extends string,
TStateEvent extends MemberEventType,
TStateContext extends MemberStateContext,
TRuntimeContext extends RuntimeContext,
> {
	skillBt: BehaviourTree | undefined = undefined;
	buffBts: Map<string, BehaviourTree> = new Map<string, BehaviourTree>();
	/** 当前技能注册的函数名称列表，用于清理 */
	private skillFunNames: string[] = [];

	constructor(private owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>) {}

  /**
   * 注册 Agent
   * @param agent 
   */
	registerAgent(agent: string): void {
		const runtimeContext = this.owner.runtimeContext;

		// 约定：agent 为形如 `class Agent { ... }` 的代码片段
		// 为了和 BtEditor 保持一致，这里仍然注入 BehaviourTree/State/owner 作为可选依赖
		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		let AgentClass: AgentCtor;
		try {
			const agentClassCreator = new Function(
				"BehaviourTree",
				"State",
				"owner",
				`return ${agent};`,
			) as unknown as (
				bt: typeof BehaviourTree,
				state: typeof State,
				owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>,
			) => AgentCtor;

			AgentClass = agentClassCreator(BehaviourTree, State, this.owner);
		} catch (error) {
			console.warn(
				`🎮 [${this.owner.name}] Agent 编译失败：${error instanceof Error ? error.message : String(error)}`,
			);
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

			// 避免覆盖 runtimeContext 自带字段（例如 owner/currentFrame/...）
			if (Object.hasOwn(runtimeContext, name)) {
				console.warn(
					`🎮 [${this.owner.name}] Agent 注册跳过：runtimeContext 已存在同名属性「${name}」`,
				);
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
				console.log(
					`🎮 [${this.owner.name}] 技能行为树已完成 (${state})，自动清理`,
				);
				this.skillBt = undefined;
				// 暂时不清理相关函数
				// this.unregisterSkillFunctions();
				this.owner.actor.send({ type: "技能执行完成" } as TStateEvent);
			} else {
				this.skillBt.step();
			}
		}

		// 更新 Buff 行为树
		this.buffBts.forEach((bt, id) => {
			const state = bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				console.log(
					`🎮 [${this.owner.name}] Buff 行为树 ${id} 已完成 (${state})，自动清理`,
				);
				this.buffBts.delete(id);
			} else {
				bt.step();
			}
		});
	}

	/**
	 * 注册技能行为树
	 * @param definition 行为树定义（MDSL 字符串或 JSON）
	 * @param functions 可选的函数定义对象，键为函数名，值为函数实现
	 * @returns 创建的行为树实例
	 */
	registerSkillBt(
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		// 清理之前注册的函数
		this.unregisterSkillFunctions();

		// 注册新的函数到 runtimeContext
		if (agent) {
			this.registerAgent(agent);
		}

		// 创建行为树实例
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
