import { type ZodType, z } from "zod/v4";
import type { Agent, GlobalFunction } from "~/lib/mistreevous/Agent";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { type CompleteState, State } from "~/lib/mistreevous/State";
import type { Member } from "../../Member";
import type { RuntimeContext } from "../Agent/RuntimeContext";
import { CommonActions } from "../Agent/GlobalActions";
import { CommonCondition } from "../Agent/CommonCondition";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";

export class BtManager<
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntimeContext extends RuntimeContext,
> {
	/** 全局函数注册只需要做一次（Lookup 是单例） */
	private static globalsRegistered = false;
	/** 运行时保留名称：用户 Agent 不允许覆盖（否则会抢占 Lookup.register 的函数） */
	private static readonly reservedFuncNames = new Set<string>([
		...Object.keys(CommonActions),
		...Object.keys(CommonCondition),
	]);

	skillBt: BehaviourTree | undefined = undefined;
	buffBts: Map<string, BehaviourTree> = new Map<string, BehaviourTree>();
	/** 当前技能注册的函数名称列表，用于清理 */
	private skillFunNames: string[] = [];

	constructor(private owner: Member<TAttrKey, TStateEvent, TStateContext, TRuntimeContext>) {
		this.ensureGlobalFunctionsRegistered();
	}

	/**
	 * 将 CommonActions / CommonCondition 注册到 mistreevous 的全局 Lookup。
	 *
	 * 为什么要这么做：
	 * - mistreevous 的动作/条件解析优先走 agent[name]，其次才走 Lookup.registeredFunctions
	 * - 因此“引擎内置动作”必须作为全局函数提供，且禁止用户 Agent 覆盖同名函数
	 *
	 * 注意：这里用 zod schema 做运行时参数校验，并把“位置参数”映射成 object 输入。
	 */
	private ensureGlobalFunctionsRegistered(): void {
		if (BtManager.globalsRegistered) return;

		const unwrapSchema = (schema: ZodType): ZodType => {
			// KISS：只处理常见 wrapper，保持与 BtEditor 校验逻辑一致
			let current: ZodType = schema;
			const asZodType = (t: z.core.$ZodType): ZodType => t as unknown as ZodType;
			while (true) {
				if (current instanceof z.ZodOptional) {
					current = asZodType(current.unwrap());
					continue;
				}
				if (current instanceof z.ZodNullable) {
					current = asZodType(current.unwrap());
					continue;
				}
				if (current instanceof z.ZodDefault) {
					current = asZodType(current.unwrap());
					continue;
				}
				if (current instanceof z.ZodPipe) {
					current = asZodType(current.in);
					continue;
				}
				break;
			}
			return current;
		};

		const getZodObjectShape = (schema: z.ZodObject): Record<string, ZodType> => {
			return schema.shape as unknown as Record<string, ZodType>;
		};

		const flattenSchemaLabels = (schema: ZodType, prefix = ""): string[] => {
			const unwrapped = unwrapSchema(schema);
			if (!(unwrapped instanceof z.ZodObject)) {
				return [prefix || "input"];
			}
			const shape = getZodObjectShape(unwrapped);
			const result: string[] = [];
			for (const [key, child] of Object.entries(shape)) {
				const label = prefix ? `${prefix}.${key}` : key;
				const childUnwrapped = unwrapSchema(child);
				if (childUnwrapped instanceof z.ZodObject) {
					result.push(...flattenSchemaLabels(childUnwrapped, label));
				} else {
					result.push(label);
				}
			}
			return result;
		};

		const buildInputObject = (schema: ZodType, args: unknown[]): unknown => {
			const labels = flattenSchemaLabels(schema);
			// 空对象 schema：允许 0 参数
			if (labels.length === 1 && labels[0] === "input") {
				return args[0];
			}
			const obj: Record<string, unknown> = {};
			for (let i = 0; i < labels.length; i++) {
				const label = labels[i];
				// label 可能是 a.b.c：创建嵌套对象
				const parts = label.split(".");
				let cursor: Record<string, unknown> = obj;
				for (let p = 0; p < parts.length; p++) {
					const k = parts[p];
					if (!k) continue;
					if (p === parts.length - 1) {
						cursor[k] = args[i];
					} else {
						const next = cursor[k];
						if (!next || typeof next !== "object") {
							cursor[k] = {};
						}
						cursor = cursor[k] as Record<string, unknown>;
					}
				}
			}
			return obj;
		};

		// 注册动作
		for (const [name, action] of Object.entries(CommonActions)) {
			const [inputSchema, impl] = action as readonly [ZodType, (ctx: RuntimeContext, input: unknown) => State];
			const globalFunc: GlobalFunction = (agent: Agent, ...args: unknown[]) => {
				const ctx = agent as RuntimeContext;
				const inputObj = buildInputObject(inputSchema, args);
				const parsed = (inputSchema as unknown as ZodType).safeParse(inputObj);
				if (!parsed.success) {
					throw new Error(`动作「${name}」参数不合法：${parsed.error.message}`);
				}
				const result = impl(ctx, parsed.data);
				// State.SUCCEEDED 和 State.FAILED 都是 CompleteState，符合 ActionResult
				return result as CompleteState;
			};
			BehaviourTree.register(name, globalFunc);
		}

		// 注册条件
		for (const [name, cond] of Object.entries(CommonCondition)) {
			const [inputSchema, impl] = cond as readonly [ZodType, (ctx: RuntimeContext, input: unknown) => boolean];
			const globalFunc: GlobalFunction = (agent: Agent, ...args: unknown[]) => {
				const ctx = agent as RuntimeContext;
				const inputObj = buildInputObject(inputSchema, args);
				const parsed = (inputSchema as unknown as ZodType).safeParse(inputObj);
				if (!parsed.success) {
					throw new Error(`条件「${name}」参数不合法：${parsed.error.message}`);
				}
				// 条件返回 boolean，符合 GlobalFunction 的返回类型
				return impl(ctx, parsed.data);
			};
			BehaviourTree.register(name, globalFunc);
		}

		BtManager.globalsRegistered = true;
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

			// 保留名称：禁止用户 Agent 覆盖内置动作/条件，否则会抢占 Lookup.register 的全局函数
			if (BtManager.reservedFuncNames.has(name)) {
				console.warn(
					`🎮 [${this.owner.name}] Agent 注册跳过：用户定义「${name}」与内置动作/条件重名，已忽略（内置优先）`,
				);
				return;
			}

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
				console.warn(`🎮 [${this.owner.name}] Agent 注册跳过：已忽略用户定义 「${name}」`);
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
