import { RootNodeDefinition } from "mistreevous/dist/BehaviourTreeDefinition";
import { Member } from "../../Member";
import { BehaviourTree, State } from "mistreevous";
import type { AgentFunction } from "mistreevous/dist/Agent";

export class BtManager {
  skillBt: BehaviourTree | undefined = undefined;
  buffBts: Map<string, BehaviourTree> = new Map<string, BehaviourTree>();
  /** 当前技能注册的函数名称列表，用于清理 */
  private skillFunNames: string[] = [];

  constructor(private owner: Member<any, any, any, any>) {}

  tickAll(): void {
    // 更新技能行为树
    if (this.skillBt) {
      // 如果技能行为树已完成（SUCCEEDED 或 FAILED），自动清理
      const state = this.skillBt.getState();
      console.log(`🎮 [${this.owner.name}] 技能行为树状态: ${state}`);
      if (state === State.SUCCEEDED || state === State.FAILED) {
        console.log(`🎮 [${this.owner.name}] 技能行为树已完成 (${state})，自动清理`);
        this.skillBt = undefined;
        // 暂时不清理相关函数
        // this.unregisterSkillFunctions();
        this.owner.actor.send({ type: "技能执行完成" });
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
   * @param definition 行为树定义（MDSL 字符串或 JSON）
   * @param functions 可选的函数定义对象，键为函数名，值为函数实现
   * @returns 创建的行为树实例
   */
  registerSkillBt(
    definition: string | RootNodeDefinition | RootNodeDefinition[],
    functions?: Record<string, AgentFunction>,
  ): BehaviourTree | undefined {
    // 清理之前注册的函数
    this.unregisterSkillFunctions();

    // 注册新的函数到 runtimeContext
    if (functions) {
      this.skillFunNames = Object.keys(functions);
      const runtimeContext = this.owner.runtimeContext;
      for (const [name, func] of Object.entries(functions)) {
        // 将函数添加到 runtimeContext 上，这样行为树就可以找到它们
        (runtimeContext as any)[name] = func;
      }
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
      delete (runtimeContext as any)[name];
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
