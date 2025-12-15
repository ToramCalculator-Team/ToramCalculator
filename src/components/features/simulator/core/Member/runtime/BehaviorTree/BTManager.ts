import { Tree } from "~/lib/behavior3/tree";
import { MemberBehaviorTreeRuntime } from "./BTRuntime";
import type { ActionContext } from "../Action/ActionContext";
import type { TreeData } from "~/lib/behavior3/tree";

export type BehaviorTreeKind = "skill" | "buff" | "ai";

export interface BehaviorTreeInstance<TActionContext extends ActionContext> {
  id: string;
  name: string;
  kind: BehaviorTreeKind;
  tree: Tree<MemberBehaviorTreeRuntime<TActionContext>, TActionContext>;
}

export class BTManger<TActionContext extends ActionContext> {
  private readonly runtime: MemberBehaviorTreeRuntime<TActionContext>;
  private readonly instances = new Map<string, BehaviorTreeInstance<TActionContext>>();

  constructor(private owner: TActionContext) {
    // 共享 runtime，内部已绑定 owner 与 engine 编译器
    this.runtime = new MemberBehaviorTreeRuntime(owner);
    // 确保共享黑板存在
    if (!owner.skillState) owner.skillState = {};
    if (!owner.buffState) owner.buffState = {};
    if (!owner.blackboard) owner.blackboard = {};
  }

  /**
   * 挂载一棵行为树实例
   */
  addTree(definition: TreeData, kind: BehaviorTreeKind, id?: string): BehaviorTreeInstance<TActionContext> {
    const treeName = definition.name || "behavior_tree";
    const treeId = id ?? `${kind}:${treeName}:${Date.now()}`;

    // 先加载定义，再创建 Tree（Tree 构造会按 name 从 runtime 读取 root）
    void this.runtime.loadTree(definition);
    const tree = new Tree(this.runtime, this.owner, treeName);

    const instance: BehaviorTreeInstance<TActionContext> = { id: treeId, name: treeName, kind, tree };
    this.instances.set(treeId, instance);
    return instance;
  }

  /**
   * 移除一棵行为树实例
   */
  removeTree(treeId: string) {
    const instance = this.instances.get(treeId);
    if (!instance) return;
    instance.tree.clear();
    this.instances.delete(treeId);
  }

  /**
   * 遍历并驱动所有激活的行为树
   */
  tickAll() {
    for (const [id, inst] of [...this.instances.entries()]) {
      // console.log(`🎮 [${this.owner.name}] 驱动行为树`, inst.name, inst.kind);
      const status = inst.tree.tick();
      // buff 行为树通常是“挂载时执行一次 + 长期 running（周期效果）”
      // 若已结束（success/failure/interrupted），自动回收实例，避免无意义 tick。
      if (status !== "running") {
        this.removeTree(id);
      }
    }
  }

  /**
   * 清理所有行为树
   */
  clear() {
    for (const id of [...this.instances.keys()]) {
      this.removeTree(id);
    }
  }
}
