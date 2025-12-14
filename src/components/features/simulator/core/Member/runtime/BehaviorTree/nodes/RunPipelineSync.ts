import type { Context } from "~/lib/behavior3/context";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { ActionContext } from "../../Action/ActionContext";

/**
 * RunPipelineSync 节点（同步执行）
 * 直接调用成员动作组（actionGroup），立即执行并写回结果到 owner context
 * 
 * 适用于需要同 tick 内获取计算结果的场景：
 * - skill.cost.calculate
 * - skill.motion.calculate
 * - buff.check（查询类）
 * 
 * 与 RunPipeline（Intent 模式）的区别：
 * - RunPipelineSync：同步执行，结果立即写回 owner，同 tick 可见
 * - RunPipeline：产出 Intent，由 Resolver 统一执行，跨帧可见
 */
export class RunPipelineSync extends Node {
  declare args: {
    /** 动作组名称 */
    readonly actionGroupName: string;
    readonly params?: Record<string, unknown>;
  };

  override onTick<TContext extends ActionContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner) {
      this.error("RunPipelineSync: owner (ActionContext) is required");
      return "failure";
    }

    const { params } = this.args;
    const { actionGroupName } = this.args;
    if (!actionGroupName) {
      this.error("RunPipelineSync: actionGroupName is required");
      return "failure";
    }

    const pipelineManager = owner.pipelineManager;
    if (!pipelineManager) {
      this.error("RunPipelineSync: owner.pipelineManager is required");
      return "failure";
    }

    try {
      // 直接同步执行管线
      const result = pipelineManager.run(actionGroupName, owner as any, params ?? {});

      // 将返回的 ctx 合并回 owner（这样表达式就能读到计算结果）
      if (result.ctx && typeof result.ctx === "object") {
        Object.assign(owner, result.ctx);
      }

      // 可选：将 actionOutputs 写入 blackboard，便于表达式访问
      if (result.actionOutputs && typeof result.actionOutputs === "object") {
        const outputKey = `__pipelineOutputs.${actionGroupName}`;
        tree.blackboard.set(outputKey, result.actionOutputs);
      }

      return "success";
    } catch (error) {
      console.error(`❌ [RunPipelineSync] 执行失败: ${actionGroupName}`, error);
      this.error(`RunPipelineSync failed: ${error instanceof Error ? error.message : String(error)}`);
      return "failure";
    }
  }

  static override get descriptor(): NodeDef {
    return {
      name: "RunPipelineSync",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "同步执行成员动作组（立即执行并写回结果）",
      args: [
        {
          name: "actionGroupName",
          type: "string",
          desc: "动作组名称（如 'skill.cost.calculate'）",
        },
        {
          name: "params",
          type: "json?",
          desc: "动作组输入参数（可选）",
        },
      ],
      output: ["动作组执行结果（自动写入 owner context 和 blackboard）"],
      doc: `
        + 同步执行成员动作组（ActionGroup），结果立即写回 owner context
        + 适用于计算/查询类管线，需要同 tick 内获取结果的场景
        + 与 RunPipeline（Intent 模式）的区别：同步执行 vs 异步 Intent
      `,
    };
  }
}

