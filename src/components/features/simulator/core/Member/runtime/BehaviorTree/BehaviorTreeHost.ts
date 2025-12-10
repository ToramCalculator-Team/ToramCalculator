import { Tree } from "~/lib/behavior3/tree";
import { MemberBehaviorTreeRuntime } from "./MemberBehaviorTreeRuntime";
import type { MemberStateContext } from "../StateMachine/types";
import type { TreeData } from "~/lib/behavior3/tree";

export type BehaviorTreeKind = "skill" | "buff" | "ai";

export interface BehaviorTreeInstance {
  id: string;
  name: string;
  kind: BehaviorTreeKind;
  tree: Tree<MemberBehaviorTreeRuntime<MemberStateContext>, MemberStateContext>;
}

export class BehaviorTreeHost {
  private readonly runtime: MemberBehaviorTreeRuntime<MemberStateContext>;
  private readonly instances = new Map<string, BehaviorTreeInstance>();

  constructor(private readonly owner: MemberStateContext) {
    // 共享 runtime，内部已绑定 owner 与 engine 编译器
    this.runtime = new MemberBehaviorTreeRuntime(owner);
    // 确保共享黑板存在
    if (!(owner as any).skillState) (owner as any).skillState = {};
    if (!(owner as any).buffState) (owner as any).buffState = {};
    if (!(owner as any).blackboard) (owner as any).blackboard = {};
  }

  /**
   * 挂载一棵行为树实例
   */
  addTree(definition: TreeData, kind: BehaviorTreeKind, id?: string): BehaviorTreeInstance {
    const treeName = definition.name || "behavior_tree";
    const treeId = id ?? `${kind}:${treeName}:${Date.now()}`;

    // 先加载定义，再创建 Tree（Tree 构造会按 name 从 runtime 读取 root）
    void this.runtime.loadTree(definition);
    const tree = new Tree(this.runtime, this.owner, treeName);

    const instance: BehaviorTreeInstance = { id: treeId, name: treeName, kind, tree };
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
    for (const [, inst] of this.instances) {
      inst.tree.tick();
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

