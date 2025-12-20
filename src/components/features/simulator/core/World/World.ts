import type { MemberManager } from "../Member/MemberManager";
import { AreaManager } from "./AreaManager";
import { SpaceManager } from "./SpaceManager";

/**
 * World/Scene 容器：聚合成员/区域/空间系统 + Intent/Resolver
 */
export class World {
  constructor(
    public readonly memberManager: MemberManager,
    public readonly spaceManager: SpaceManager,
    public readonly areaManager: AreaManager,
  ) {}

  /**
   * 每帧 tick：成员 → 区域 → 统一执行 Intent
   */
  tick(frame: number): void {
    // console.log(`🌍 [World] tick: ${frame}`);
    const members = this.memberManager.getAllMembers();
    for (const member of members) {
      member.tick(frame);
    }

    // 区域更新（当前占位实现）
    this.areaManager.tick(frame);
  }
}
