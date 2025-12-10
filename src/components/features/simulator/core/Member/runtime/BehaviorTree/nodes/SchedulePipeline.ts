import { createId } from "@paralleldrive/cuid2";
import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContext } from "../../StateMachine/types";

/**
 * 延迟调度管线到事件队列
 */
export class SchedulePipeline extends Node {
  declare args: {
    readonly pipelineName: string;
    readonly delayFrames?: number;
    readonly params?: Record<string, unknown>;
    readonly source?: string;
  };

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner?.engine?.getEventQueue) {
      this.error("SchedulePipeline: 缺少 engine.getEventQueue()");
      return "failure";
    }

    const queue = owner.engine.getEventQueue();
    const { pipelineName, delayFrames = 0, params, source } = this.args;
    if (!pipelineName) {
      this.error("SchedulePipeline: pipelineName is required");
      return "failure";
    }

    const executeFrame = owner.currentFrame + Math.max(1, Number(delayFrames) || 0);
    queue.insert({
      id: createId(),
      type: "member_pipeline_event",
      executeFrame,
      insertFrame: owner.currentFrame,
      processed: false,
      payload: {
        targetMemberId: owner.id,
        pipelineName,
        params,
        skillId: (owner as any).currentSkill?.id ?? "unknown_skill",
        source: source ?? "bt_schedule_pipeline",
      },
    });

    return "success";
  }

  static override get descriptor(): NodeDef {
    return {
      name: "SchedulePipeline",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "向事件队列延迟调度管线",
      args: [
        { name: "pipelineName", type: "string", desc: "管线名称" },
        { name: "delayFrames", type: "int?", desc: "延迟帧数，默认1" },
        { name: "params", type: "json?", desc: "管线参数" },
        { name: "source", type: "string?", desc: "来源标识，可选" },
      ],
    };
  }
}

