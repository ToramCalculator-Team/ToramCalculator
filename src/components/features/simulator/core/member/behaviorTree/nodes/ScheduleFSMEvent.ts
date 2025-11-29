import type { Context } from "~/lib/behavior3/context";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContext } from "../MemberStateContext";
import { createId } from "@paralleldrive/cuid2";

/**
 * ScheduleFSMEvent 节点（通用）
 * 向事件队列插入 member_fsm_event，触发状态机事件
 * 
 * 适用于所有成员类型（Player、Mob等）
 */
export class ScheduleFSMEvent extends Node {
  declare args: {
    readonly eventType: string;
    readonly delayFrames?: number;
    readonly payload?: Record<string, unknown>;
  };

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner) {
      this.error("ScheduleFSMEvent: owner (MemberStateContext) is required");
      return "failure";
    }

    const { eventType, delayFrames = 0, payload = {} } = this.args;
    if (!eventType) {
      this.error("ScheduleFSMEvent: eventType is required");
      return "failure";
    }

    try {
      // 计算目标帧
      const targetFrame = owner.currentFrame + delayFrames;

      // 向事件队列插入 member_fsm_event
      owner.engine.getEventQueue().insert({
        id: createId(),
        type: "member_fsm_event",
        executeFrame: targetFrame,
        priority: "high",
        payload: {
          targetMemberId: owner.id,
          fsmEventType: eventType,
          ...payload,
        },
      });

      return "success";
    } catch (error) {
      this.error(
        `ScheduleFSMEvent failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "failure";
    }
  }

  static override get descriptor(): NodeDef {
    return {
      name: "ScheduleFSMEvent",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "调度状态机事件",
      args: [
        {
          name: "eventType",
          type: "string",
          desc: "状态机事件类型（如 '收到前摇结束通知'）",
        },
        {
          name: "delayFrames",
          type: "int?",
          desc: "延迟帧数（默认 0，立即触发）",
        },
        {
          name: "payload",
          type: "json?",
          desc: "额外的事件数据（可选）",
        },
      ],
      doc: `
        + 向事件队列插入 member_fsm_event，在指定帧触发状态机事件
        + delayFrames 为 0 时，事件会在下一帧处理
        + 事件会发送到 owner 的状态机
      `,
    };
  }
}

