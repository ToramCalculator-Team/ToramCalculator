import type { Context } from "~/lib/behavior3/context";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContextBase } from "../MemberStateContext";

/**
 * RunPipeline 节点（通用）
 * 调用成员管线定义中定义的管线
 * 
 * 适用于所有成员类型（Player、Mob等）
 */
export class RunPipeline extends Node {
  declare args: {
    readonly pipelineName: string;
    readonly params?: Record<string, unknown>;
  };

  override onTick<TContext extends MemberStateContextBase>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner) {
      this.error("RunPipeline: owner (MemberStateContextBase) is required");
      return "failure";
    }

    const { pipelineName, params } = this.args;
    if (!pipelineName) {
      this.error("RunPipeline: pipelineName is required");
      return "failure";
    }

    try {
      console.log(`🌳 [RunPipeline] 调用管线: ${pipelineName}`);
      
      // 调用管线管理器执行管线
      const result = owner.pipelineManager.run(pipelineName as any, owner, params || {});

      // 将结果写入 blackboard，供后续节点使用
      // result 包含 { ctx, stageOutputs }
      // 将 stageOutputs 合并到 blackboard
      if (result.stageOutputs) {
        for (const [stageName, stageOutput] of Object.entries(result.stageOutputs)) {
          if (stageOutput && typeof stageOutput === "object") {
            // 将阶段输出的每个字段写入 blackboard
            for (const [key, value] of Object.entries(stageOutput)) {
              tree.blackboard.set(key, value);
            }
          } else {
            tree.blackboard.set(stageName, stageOutput);
          }
        }
      }

      // 更新 context（因为管线可能修改了 context）
      Object.assign(owner, result.ctx);

      // console.log(`✅ [RunPipeline] 管线执行成功: ${pipelineName}`);
      return "success";
    } catch (error) {
      console.error(`❌ [RunPipeline] 管线执行失败: ${pipelineName}`, error);
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
      desc: "调用成员管线",
      args: [
        {
          name: "pipelineName",
          type: "string",
          desc: "管线名称（如 'skill.cost.calculate'）",
        },
        {
          name: "params",
          type: "json?",
          desc: "管线输入参数（可选）",
        },
      ],
      output: ["管线执行结果（自动写入 blackboard）"],
      doc: `
        + 调用成员管线定义中定义的管线
        + 管线执行结果会自动写入 blackboard，供后续节点使用
        + 如果管线执行失败，返回 failure
      `,
    };
  }
}

