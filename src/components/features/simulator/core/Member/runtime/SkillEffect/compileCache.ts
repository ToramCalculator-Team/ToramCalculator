import type { SkillEffectLogicV1 } from "../BehaviorTree/SkillEffectLogicType";
import { compileWorkspaceJsonToSkillEffectLogicV1 } from "./compileWorkspaceToSkillEffectLogicV1";

/**
 * 简单的哈希函数（用于缓存键）
 */
function hashWorkspaceJson(workspaceJson: any): string {
  const str = JSON.stringify(workspaceJson);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * 编译缓存
 */
const compileCache = new Map<string, { logic: SkillEffectLogicV1; errors: any[] }>();

/**
 * 编译 workspaceJson 为 SkillEffectLogicV1（带缓存）
 */
export function compileWorkspaceJsonWithCache(
  workspaceJson: any,
): { logic: SkillEffectLogicV1 | null; errors: any[]; cacheHit: boolean } {
  const cacheKey = hashWorkspaceJson(workspaceJson);
  const cached = compileCache.get(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  const result = compileWorkspaceJsonToSkillEffectLogicV1(workspaceJson);
  if (result.logic) {
    compileCache.set(cacheKey, result);
  }
  return { ...result, cacheHit: false };
}

/**
 * 清除编译缓存
 */
export function clearCompileCache(): void {
  compileCache.clear();
}

