import type { Context } from "~/lib/behavior3/context";
import { Blackboard } from "~/lib/behavior3/blackboard";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { ActionContext } from "../../Action/ActionContext";

/**
 * RunPipeline 节点（通用）
 * 调用成员动作组（actionGroup）定义
 * 
 * 适用于所有成员类型（Player、Mob等）
 */
export class RunPipeline extends Node {
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
      this.error("RunPipeline: owner (ActionContext) is required");
      return "failure";
    }

    const { params } = this.args;
    const { actionGroupName } = this.args;
    if (!actionGroupName) {
      this.error("RunPipeline: actionGroupName is required");
      return "failure";
    }

    try {
      if (!owner.intentBuffer) {
        this.error("RunPipeline: owner.intentBuffer is required to push Intent");
        return "failure";
      }
      /**
       * 重要：RunPipeline 当前是“产出 Intent，由 Resolver 在本帧末尾统一执行”的模型。
       * 这意味着同一个 BT tick 内，后续节点（如 Check）看不到本次管线计算结果。
       *
       * 因此这里做一次“让出一帧”的 gate：
       * - 第一次 tick：push Intent，并返回 running（暂停）
       * - 下一帧 tick：返回 success，让 BT 继续往下跑（此时 Resolver 已执行过管线）
       */
      const scheduledKey = Blackboard.makePrivateVar(this, `RUN_PIPELINE_SCHEDULED:${actionGroupName}`);
      if (!tree.blackboard.get<boolean>(scheduledKey)) {
        tree.blackboard.set(scheduledKey, true);
        owner.intentBuffer.push({
          type: "runPipeline",
          source: this.name,
          actorId: owner.id,
          pipeline: actionGroupName,
          params: params ?? {},
        });
        return "running";
      }

      // 清理 gate，允许下一次进入时再次调度
      tree.blackboard.set(scheduledKey, undefined);
      return "success";
    } catch (error) {
      console.error(`❌ [RunPipeline] push Intent 失败: ${actionGroupName}`, error);
      this.error(`RunPipeline failed: ${error instanceof Error ? error.message : String(error)}`);
      return "failure";
    }
  }

  static override get descriptor(): NodeDef {
    return {
      name: "RunPipeline",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "调用成员动作组（兼容旧名：管线）",
      args: [
        {
          name: "actionGroupName",
          type: "string",
          desc: "动作组名称（如 '技能.消耗.计算'）",
        },
        {
          name: "params",
          type: "json?",
          desc: "动作组输入参数（可选）",
        },
      ],
      output: ["动作组执行结果（自动写入 blackboard）"],
      doc: `
        + 调用成员动作组（ActionGroup）定义
        + 执行结果会自动写入 blackboard，供后续节点使用
      `,
    };
  }
}

