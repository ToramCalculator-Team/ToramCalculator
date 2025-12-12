import type { Context } from "~/lib/behavior3/context";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContext } from "../../StateMachine/types";

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

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner) {
      this.error("RunPipeline: owner (MemberStateContext) is required");
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
      owner.intentBuffer.push({
        type: "runPipeline",
        source: this.name,
        actorId: owner.id,
        pipeline: actionGroupName,
        params: params ?? {},
      });
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

