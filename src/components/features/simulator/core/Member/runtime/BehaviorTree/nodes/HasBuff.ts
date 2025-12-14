import type { Context } from "~/lib/behavior3/context";
import { Node, NodeDef, Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { ActionContext } from "../../Action/ActionContext";

/**
 * HasBuff 节点（同步查询）
 * 检查 owner 是否拥有指定 Buff，结果写入 blackboard
 * 
 * 适用于需要同 tick 内判断 Buff 存在性的场景
 * 比走完整的 buff.check pipeline 更轻量、更直观
 */
export class HasBuff extends Node {
  declare args: {
    /** Buff ID */
    readonly buffId: string;
    /** 写入 blackboard 的变量名（默认：buffExists） */
    readonly outputVar?: string;
  };

  override onTick<TContext extends ActionContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner;
    if (!owner) {
      this.error("HasBuff: owner (ActionContext) is required");
      return "failure";
    }

    const { buffId, outputVar = "buffExists" } = this.args;
    if (!buffId) {
      this.error("HasBuff: buffId is required");
      return "failure";
    }

    const buffManager = owner.buffManager;
    if (!buffManager) {
      this.error("HasBuff: owner.buffManager is required");
      return "failure";
    }

    try {
      // 同步查询 Buff 是否存在
      const hasBuff = buffManager.hasBuff(buffId);

      // 写入 blackboard，供后续 Check 节点使用
      tree.blackboard.set(outputVar, hasBuff);

      // 可选：同时写入 owner context，便于表达式直接访问
      (owner as any)[outputVar] = hasBuff;

      return "success";
    } catch (error) {
      console.error(`❌ [HasBuff] 查询失败: ${buffId}`, error);
      this.error(`HasBuff failed: ${error instanceof Error ? error.message : String(error)}`);
      return "failure";
    }
  }

  static override get descriptor(): NodeDef {
    return {
      name: "HasBuff",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "检查 Buff 是否存在（同步查询）",
      args: [
        {
          name: "buffId",
          type: "string",
          desc: "Buff ID（如 'magic_cannon_charge'）",
        },
        {
          name: "outputVar",
          type: "string?",
          desc: "写入 blackboard 的变量名（默认：buffExists）",
        },
      ],
      output: ["buffExists（或指定的 outputVar）"],
      doc: `
        + 同步查询 owner 是否拥有指定 Buff
        + 结果写入 blackboard 和 owner context，供后续 Check 节点使用
        + 比走完整的 buff.check pipeline 更轻量、更直观
      `,
    };
  }
}

