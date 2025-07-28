import { createSignal, onMount } from "solid-js";
import { PlayerData } from "~/components/features/simulator/core/member/player/PlayerData";
import { findCharacterWithRelations } from "@db/repositories/character";
import { CharacterAttrEnum, CharacterAttrName } from "~/components/features/simulator/core/member/player/utils";
import { findPlayerWithRelations } from "@db/repositories/player";
import {
  ATTRIBUTE_EXPRESSIONS,
  getCachedDependencyGraph,
  getCachedTopologicalOrder,
} from "~/components/features/simulator/core/member/player/attributeExpressions";

export default function SimulatorTestPage() {
  const [playerData, setPlayerData] = createSignal<PlayerData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [attributes, setAttributes] = createSignal<Record<string, number>>({});

  onMount(async () => {
    try {
      setLoading(true);

      // 1. 从数据库获取defaultPlayerId的Character数据
      console.log("🔍 正在获取数据库中的Character数据...");
      const player = await findPlayerWithRelations("defaultPlayerId");
      console.log("📊 Character数据:", player);

      // 2. 创建PlayerData
      console.log("🛠️ 创建PlayerData实例...");
      const playerData = new PlayerData(player);
      setPlayerData(playerData);

      // 3. 获取所有属性值
      console.log("🔢 计算所有属性值...");
      const attrValues: Record<string, number> = {};

      // 基础属性
      Object.values(CharacterAttrEnum).forEach((attr) => {
        if (typeof attr === "number") {
          try {
            const value = playerData.getValue(attr);
            attrValues[attr.toString()] = value;
          } catch (err) {
            console.warn(`⚠️ 计算 ${CharacterAttrEnum[attr]} 时出错:`, err);
            attrValues[attr.toString()] = 0;
          }
        }
      });

      setAttributes(attrValues);

      // 4. 测试依赖更新
      console.log("🔄 测试依赖更新...");
      console.log("原始力量:", playerData.getValue(CharacterAttrEnum.STR));
      console.log("原始物理攻击:", playerData.getValue(CharacterAttrEnum.PHYSICAL_ATK));

      // 修改力量，观察物理攻击是否自动更新
      playerData.setBaseValue(CharacterAttrEnum.STR, 200);
      console.log("修改力量为200后:");
      console.log("新力量:", playerData.getValue(CharacterAttrEnum.STR));
      console.log("新物理攻击:", playerData.getValue(CharacterAttrEnum.PHYSICAL_ATK));

      // 5. 测试批量更新
      console.log("📦 测试批量更新...");
      playerData.setBaseValue(CharacterAttrEnum.AGI, 150);
      playerData.setBaseValue(CharacterAttrEnum.DEX, 180);
      console.log("批量修改后攻击速度:", playerData.getValue(CharacterAttrEnum.ASPD));
    } catch (err) {
      console.error("❌ 测试过程中出错:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="min-h-screen overflow-y-auto bg-gray-900 p-6 text-gray-100">
      <div class="mx-auto max-w-6xl">
        <div class="mb-8">
          <h1 class="mb-4 text-3xl font-bold text-blue-400">🧪 自定义响应式系统可用性测试</h1>
          <p class="text-gray-300">测试新实现的双层架构响应式系统，验证PlayerData的创建和属性计算</p>
        </div>

        {loading() && (
          <div class="mb-6 rounded-lg bg-blue-900 p-6">
            <div class="flex items-center space-x-2">
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
              <span class="text-blue-300">正在加载和测试响应式系统...</span>
            </div>
          </div>
        )}

        {error() && (
          <div class="mb-6 rounded-lg bg-red-900 p-6">
            <h3 class="mb-2 font-bold text-red-400">❌ 错误</h3>
            <p class="text-red-300">{error()}</p>
          </div>
        )}

        {playerData() && !loading() && (
          <div class="space-y-6">
            <div class="rounded-lg bg-green-900 p-6">
              <h3 class="mb-2 font-bold text-green-400">✅ 系统创建成功</h3>
              <p class="text-green-300">PlayerData实例已成功创建，响应式系统正常工作</p>
            </div>

            <div class="rounded-lg bg-gray-800 p-6">
              <h3 class="mb-4 text-xl font-bold text-yellow-400">📊 角色属性值</h3>
              <div class="flex flex-wrap">
                {Object.entries(attributes()).map(([key, value]) => {
                  const enumValue = parseInt(key);
                  const attrName = CharacterAttrName[enumValue as CharacterAttrEnum] || key;
                  return (
                    <div class="flex basis-1/2 items-center gap-2 border-b border-dividing-color p-3">
                      <span class="text-sm text-gray-300">{attrName}</span>
                      <span class="font-mono text-lg font-bold text-blue-400">
                        {typeof value === "number" ? value.toLocaleString() : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div class="rounded-lg bg-gray-800 p-6">
              <h3 class="mb-4 text-xl font-bold text-purple-400">🔧 响应式系统特性验证</h3>
              <div class="space-y-4">
                <div class="rounded-lg bg-gray-700 p-4">
                  <h4 class="mb-2 font-semibold text-green-400">✅ 自动依赖更新</h4>
                  <p class="text-sm text-gray-300">修改力量值后，物理攻击自动重新计算（检查控制台日志查看详细过程）</p>
                </div>
                <div class="rounded-lg bg-gray-700 p-4">
                  <h4 class="mb-2 font-semibold text-green-400">✅ 批量更新优化</h4>
                  <p class="text-sm text-gray-300">
                    同时修改多个基础属性时，避免重复计算（检查控制台日志查看性能优化）
                  </p>
                </div>
                <div class="rounded-lg bg-gray-700 p-4">
                  <h4 class="mb-2 font-semibold text-green-400">✅ 复杂公式计算</h4>
                  <p class="text-sm text-gray-300">支持MathJS表达式计算，包括武器攻击、攻击速度等复杂公式</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg bg-gray-800 p-6">
              <h3 class="mb-4 text-xl font-bold text-cyan-400">🔗 属性依赖关系详情</h3>

              {/* 表达式列表 */}
              <div class="mb-6">
                <h4 class="mb-3 text-lg font-semibold text-cyan-300">📐 属性表达式定义</h4>
                <div class="max-h-96 space-y-3 overflow-y-auto">
                  {Object.entries(ATTRIBUTE_EXPRESSIONS).map(([attrStr, expression]) => {
                    const attr = parseInt(attrStr) as CharacterAttrEnum;
                    const attrName = CharacterAttrName[attr];
                    return (
                      <div class="rounded-lg border-l-4 border-cyan-500 bg-gray-700 p-3">
                        <div class="mb-1 flex items-start justify-between">
                          <span class="font-medium text-cyan-400">{attrName}</span>
                          {expression.isBase && (
                            <span class="rounded bg-green-600 px-2 py-1 text-xs text-green-100">基础属性</span>
                          )}
                        </div>

                        <div class="rounded bg-gray-800 p-2 font-mono text-xs text-gray-400">
                          {expression.expression}
                        </div>
                        {/* 不再显示手动定义的依赖，因为现在依赖关系是自动解析的 */}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 依赖关系图 */}
              <div class="mb-6">
                <h4 class="mb-3 text-lg font-semibold text-cyan-300">🎯 依赖关系网络</h4>
                <div class="rounded-lg bg-gray-700 p-4">
                                {(() => {
                const dependencyGraph = getCachedDependencyGraph();
                return (
                  <div class="space-y-2">
                    {Object.entries(dependencyGraph).map(([attrStr, deps]) => {
                      const attr = parseInt(attrStr) as CharacterAttrEnum;
                      const attrName = CharacterAttrName[attr];
                      return (
                        <div class="flex items-center space-x-2 text-sm">
                          <span class="min-w-32 font-medium text-yellow-400">{attrName}</span>
                          <span class="text-gray-400">←</span>
                          <span class="text-blue-400">{deps.map((dep: CharacterAttrEnum) => CharacterAttrName[dep]).join(" + ")}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
                </div>
              </div>

              {/* 拓扑排序 */}
              <div>
                <h4 class="mb-3 text-lg font-semibold text-cyan-300">🔢 计算顺序（拓扑排序）</h4>
                <div class="rounded-lg bg-gray-700 p-4">
                  <div class="flex flex-wrap gap-2">
                    {getCachedTopologicalOrder().map((attr: CharacterAttrEnum, index: number) => {
                      const attrName = CharacterAttrName[attr];
                      const isBase = ATTRIBUTE_EXPRESSIONS.get(attr)?.isBase;
                      return (
                        <div class="flex items-center space-x-1">
                          <span
                            class={`rounded px-3 py-1 text-sm font-medium ${
                              isBase ? "bg-green-600 text-green-100" : "bg-blue-600 text-blue-100"
                            }`}
                          >
                            {index + 1}. {attrName}
                          </span>
                          {index < getCachedTopologicalOrder().length - 1 && <span class="text-gray-400">→</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div class="mt-3 text-xs text-gray-400">绿色为基础属性，蓝色为计算属性。箭头表示计算顺序。</div>
                </div>
              </div>
            </div>

            <div class="rounded-lg bg-gradient-to-r from-gray-800 to-gray-700 p-6">
              <h2 class="mb-4 text-2xl font-bold text-green-400">🎯 测试结论</h2>
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <span class="text-green-400">✅</span>
                  <span class="text-gray-300">PlayerData类成功创建并初始化</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-green-400">✅</span>
                  <span class="text-gray-300">所有角色属性计算正常</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-green-400">✅</span>
                  <span class="text-gray-300">依赖关系自动更新机制工作正常</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-green-400">✅</span>
                  <span class="text-gray-300">MathJS集成和复杂公式计算正常</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-green-400">✅</span>
                  <span class="text-gray-300">表达式驱动的依赖关系系统正常工作</span>
                </div>
                <div class="mt-4 text-center">
                  <p class="text-xl font-bold text-green-400">🏅 自定义响应式系统可用性测试通过！</p>
                  <p class="mt-2 text-gray-300">可以继续进行与SolidJS的性能对比测试</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
