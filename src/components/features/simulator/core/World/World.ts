import type Resolver from "../IntentSystem/Resolver";
import type IntentBuffer from "../IntentSystem/IntentBuffer";
import type { MemberManager } from "../Member/MemberManager";
import type AreaManager from "./AreaManager";
import type SpaceManager from "./SpaceManager";

/**
 * World/Scene 容器：聚合成员/区域/空间系统 + Intent/Resolver
 */
export class World {
  constructor(
    public readonly memberManager: MemberManager,
    public readonly spaceManager: SpaceManager,
    public readonly areaManager: AreaManager,
    public readonly intentBuffer: IntentBuffer,
    public readonly resolver: Resolver,
  ) {}

  /**
   * 每帧 tick：成员 → 区域 → 统一执行 Intent
   */
  tick(frame: number): void {
    const members = this.memberManager.getAllMembers();
    for (const member of members) {
      const maybeTick = (member as any)?.tick;
      // 将 intentBuffer 注入 owner（MemberStateContext）以供 BT 节点使用
      if ((member as any)?.actor?.getSnapshot) {
        const snapshot = (member as any).actor.getSnapshot();
        const ctx = (snapshot as any)?.context;
        if (ctx && typeof ctx === "object") {
          (ctx as any).intentBuffer = this.intentBuffer;
        }
      }
      if (typeof maybeTick === "function") {
        maybeTick.call(member, frame, this.intentBuffer);
      }
    }

    // 区域更新（当前占位实现）
    const maybeAreaTick = (this.areaManager as any)?.tick;
    if (typeof maybeAreaTick === "function") {
      maybeAreaTick.call(this.areaManager, frame, this.intentBuffer);
    }

    // 统一执行 Intent
    this.resolver.commit(this.intentBuffer.drain(), this);
  }
}

export default World;

