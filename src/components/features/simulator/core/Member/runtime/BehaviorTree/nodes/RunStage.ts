import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { PipelineStage } from "../../Action/type";
import type { MemberStateContext } from "../../StateMachine/types";

const execStage = (
  stageName: string,
  stagePool: Record<string, PipelineStage<any, any, any>>,
  owner: MemberStateContext,
  input: any,
) => {
  const stage = stagePool[stageName];
  if (!stage) {
    throw new Error(`阶段不存在: ${stageName}`);
  }

  const [inputSchema, outputSchema, impl] = stage;
  let stageInput = input ?? {};

  if (inputSchema) {
    const parsed = (inputSchema as any).safeParse(stageInput);
    if (!parsed.success) {
      throw new Error(`[${stageName}] 输入验证失败: ${parsed.error.message}`);
    }
    stageInput = parsed.data;
  }

  let stageOut = impl ? impl(owner as any, stageInput) : stageInput;

  if (outputSchema) {
    const parsed = (outputSchema as any).safeParse(stageOut);
    if (!parsed.success) {
      throw new Error(`[${stageName}] 输出验证失败: ${parsed.error.message}`);
    }
    stageOut = parsed.data;
    Object.assign(owner, stageOut);
  } else if (stageOut && typeof stageOut === "object") {
    Object.assign(owner, stageOut);
  }

  return stageOut;
};

/**
 * 直接执行单个 Stage
 */
export class RunStage extends Node {
  declare args: {
    readonly stageName: string;
    readonly params?: Record<string, unknown>;
  };

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner as TContext & {
      pipelineManager?: { stagePool: Record<string, PipelineStage<any, any, any>> };
    };

    if (!owner.pipelineManager?.stagePool) {
      this.error("RunStage: 缺少 pipelineManager.stagePool");
      return "failure";
    }

    const { stageName, params } = this.args;
    if (!stageName) {
      this.error("RunStage: stageName is required");
      return "failure";
    }

    try {
      const result = execStage(stageName, owner.pipelineManager.stagePool as any, owner, params ?? {});
      if (result && typeof result === "object") {
        for (const [k, v] of Object.entries(result)) {
          tree.blackboard.set(k, v);
        }
      }
      return "success";
    } catch (error) {
      this.error(`RunStage failed: ${error instanceof Error ? error.message : String(error)}`);
      return "failure";
    }
  }

  static override get descriptor(): NodeDef {
    return {
      name: "RunStage",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "执行单个 Stage",
      args: [
        { name: "stageName", type: "string", desc: "阶段名（stagePool key）" },
        { name: "params", type: "json?", desc: "输入参数，可选" },
      ],
    };
  }
}

