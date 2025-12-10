import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContext } from "../../StateMachine/types";
import { createId } from "@paralleldrive/cuid2";

/**
 * 延迟调度函数（特例 __skill_finish__ 走 dispatchMemberEvent）
 */
export class ScheduleFunction extends Node {
  declare args: {
    readonly functionName: string;
    readonly delayFrames?: number;
    readonly params?: Record<string, unknown>;
    readonly source?: string;
  };

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    const { functionName, delayFrames = 0, params, source } = this.args;
    if (!functionName) {
      this.error("ScheduleFunction: functionName is required");
      return "failure";
    }

    // 特殊保留名：__skill_finish__
    if (functionName === "__skill_finish__") {
      const status = (params as any)?.status === "failure" ? "failure" : "success";
      owner.engine.dispatchMemberEvent(
        owner.id,
        "技能执行完成",
        { status },
        Math.max(0, Number(delayFrames) || 0),
        (owner as any).currentSkill?.id ?? "unknown_skill",
        { source: source ?? "bt_schedule_function" },
      );
      return "success";
    }

    if (!owner?.engine?.getEventQueue) {
      this.error("ScheduleFunction: 缺少 engine.getEventQueue()");
      return "failure";
    }

    const queue = owner.engine.getEventQueue();
    const executeFrame = owner.currentFrame + Math.max(1, Number(delayFrames) || 0);
    queue.insert({
      id: createId(),
      type: "member_pipeline_event",
      executeFrame,
      insertFrame: owner.currentFrame,
      processed: false,
      payload: {
        targetMemberId: owner.id,
        pipelineName: functionName,
        params,
        skillId: (owner as any).currentSkill?.id ?? "unknown_skill",
        source: source ?? "bt_schedule_function",
      },
    });

    return "success";
  }

  static override get descriptor(): NodeDef {
    return {
      name: "ScheduleFunction",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "延迟调度函数/管线（__skill_finish__ 走技能完成事件）",
      args: [
        { name: "functionName", type: "string", desc: "函数名或管线名" },
        { name: "delayFrames", type: "int?", desc: "延迟帧数，默认1" },
        { name: "params", type: "json?", desc: "参数，可选" },
        { name: "source", type: "string?", desc: "来源标识" },
      ],
    };
  }
}

