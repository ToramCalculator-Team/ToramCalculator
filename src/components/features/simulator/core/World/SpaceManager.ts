/**
 * SpaceManager
 * 最小化空间查询占位实现，后续可替换为网格/八叉树等索引
 */
export class SpaceManager {
  // 预留成员/区域的注册与索引，当前为占位实现

  queryCircle<T = unknown>(_center: { x: number; y: number; z: number }, _radius: number): {
    members: T[];
    areas: T[];
  } {
    return { members: [], areas: [] };
  }
}

