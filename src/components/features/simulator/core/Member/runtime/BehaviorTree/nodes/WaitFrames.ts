import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { ActionContext } from "../../Action/ActionContext";

/**
 * WaitFrames
 *
 * 从 owner(ActionContext) 的字段读取帧数并等待。
 * 这是为“模拟器 BT 跨帧推进”做的 KISS 方案：不依赖事件系统，仅依赖稳定的帧号推进。
 */
export class WaitFrames extends Node {
  declare args: {
    /** 从 owner 读取的字段名，如 "currentSkillActionFrames" */
    readonly field: string;
    /** 最小等待帧数（默认 1） */
    readonly min?: number;
  };

  override onTick<TContext extends ActionContext>(tree: Tree<Context, TContext>, status: Status): Status {
    const cached = tree.resume<number>(this);
    if (typeof cached === "number") {
      return tree.context.time >= cached ? "success" : "running";
    }

    const owner = tree.owner as any;
    const field = this.args.field;
    const raw = owner?.[field];
    const min = Math.max(0, Math.floor(this.args.min ?? 1));
    const frames = Math.max(min, Math.floor(typeof raw === "number" ? raw : 0));

    return tree.yield(this, tree.context.time + frames);
  }

  static override get descriptor(): NodeDef {
    return {
      name: "WaitFrames",
      type: "Action",
      children: 0,
      status: ["success", "running"],
      desc: "按 owner 字段等待指定帧数（不依赖事件）",
      args: [
        { name: "field", type: "string", desc: "owner 字段名（如 currentSkillActionFrames）" },
        { name: "min", type: "int?", desc: "最小等待帧数（默认 1）" },
      ],
    };
  }
}


