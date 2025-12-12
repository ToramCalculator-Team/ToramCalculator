import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { Action } from "../../Action/type";
import type { MemberStateContext } from "../../StateMachine/types";

const execStage = (
  actionName: string,
  actionPool: Record<string, Action<any, any, any>>,
  owner: MemberStateContext,
  input: any,
) => {
  const action = actionPool[actionName];
  if (!action) {
    throw new Error(`动作不存在: ${actionName}`);
  }

  const [inputSchema, outputSchema, impl] = action;
  let actionInput = input ?? {};

  if (inputSchema) {
    const parsed = (inputSchema as any).safeParse(actionInput);
    if (!parsed.success) {
      throw new Error(`[${actionName}] 输入验证失败: ${parsed.error.message}`);
    }
    actionInput = parsed.data;
  }

  let actionOut = impl ? impl(owner as any, actionInput) : actionInput;

  if (outputSchema) {
    const parsed = (outputSchema as any).safeParse(actionOut);
    if (!parsed.success) {
      throw new Error(`[${actionName}] 输出验证失败: ${parsed.error.message}`);
    }
    actionOut = parsed.data;
    Object.assign(owner, actionOut);
  } else if (actionOut && typeof actionOut === "object") {
    Object.assign(owner, actionOut);
  }

  return actionOut;
};

/**
 * 直接执行单个 Action
 */
export class RunStage extends Node {
  declare args: {
    readonly actionName: string;
    readonly params?: Record<string, unknown>;
  };

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner as TContext & { actionManager?: { actionPool?: Record<string, Action<any, any, any>> } };
    const actionPool = owner.actionManager?.actionPool;
    if (!actionPool) {
      this.error("RunStage: 缺少 owner.actionManager.actionPool");
      return "failure";
    }

    const { params } = this.args;
    const { actionName } = this.args;
    if (!actionName) {
      this.error("RunStage: actionName is required");
      return "failure";
    }

    try {
      const result = execStage(actionName, actionPool as any, owner, params ?? {});
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
      desc: "执行单个 Action（兼容旧名：Stage）",
      args: [
        { name: "actionName", type: "string", desc: "动作名（actionPool key）" },
        { name: "params", type: "json?", desc: "输入参数，可选" },
      ],
    };
  }
}

