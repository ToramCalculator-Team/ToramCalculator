import type { Context } from "~/lib/behavior3/context";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { ActionContext } from "../../Action/ActionContext";
import { createId } from "@paralleldrive/cuid2";

/**
 * ScheduleFSMEvent 节点（通用）
 * 向事件队列插入跨帧 member_fsm_event，触发状态机事件
 * 
 * 适用于所有成员类型（Player、Mob等）
 */
export class ScheduleFSMEvent extends Node {
  declare args: {
    readonly eventType: string;
    readonly delayFrames?: number;
    readonly payload?: Record<string, unknown>;
  };

  override onTick<TContext extends ActionContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner) {
      this.error("ScheduleFSMEvent: owner (ActionContext) is required");
      return "failure";
    }

    const { eventType, delayFrames = 0, payload = {} } = this.args;
    if (!eventType) {
      this.error("ScheduleFSMEvent: eventType is required");
      return "failure";
    }

    try {
      if (!owner.intentBuffer) {
        this.error("ScheduleFSMEvent: owner.intentBuffer is required to push Intent");
        return "failure";
      }

      // 计算目标帧（如需跨帧，可在 Resolver/上层做延迟处理；当前仅记录 frame）
      const targetFrame = owner.currentFrame + delayFrames;

      owner.intentBuffer.push({
        type: "sendFsmEvent",
        source: this.name,
        actorId: owner.id,
        targetId: owner.id,
        frame: targetFrame,
        event: { type: eventType, ...(payload ?? {}) },
      } as any);

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

