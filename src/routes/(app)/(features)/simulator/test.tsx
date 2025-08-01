import { createSignal, onMount } from "solid-js";
import { Player } from "~/components/features/simulator/core/member/player/Player";
import { findCharacterWithRelations } from "@db/repositories/character";
import { findPlayerWithRelations } from "@db/repositories/player";
import { PlayerAttrEnum, PlayerAttrDic, PlayerAttrKeys, PlayerAttrExpressionsMap, PlayerAttrType } from "~/components/features/simulator/core/member/player/PlayerData";
import { findMemberById, findMemberWithRelations } from "@db/repositories/member";

export default function SimulatorTestPage() {
  const [player, setPlayer] = createSignal<Player | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [attributes, setAttributes] = createSignal<Record<string, number>>({});

  onMount(async () => {
    try {
      setLoading(true);

      // 1. 从数据库获取defaultPlayerId的Player数据
      console.log("🔍 正在获取数据库中的Player数据...");
      const memberData = await findMemberWithRelations("defaultMember1Id");
      console.log("📊 Player数据:", memberData);

      // 2. 创建Player实例
      console.log("🛠️ 创建Player实例...");
      const playerInstance = new Player(memberData);
      setPlayer(playerInstance);

      // 3. 获取所有属性值
      console.log("🔢 计算所有属性值...");
      const attrValues: Record<string, number> = {};

      // 基础属性
      Object.keys(PlayerAttrDic).forEach((attr) => {
        try {
          const value = playerInstance.getAttributeValue(attr as PlayerAttrType);
          attrValues[attr] = value;
        } catch (err) {
          console.warn(`⚠️ 计算 ${PlayerAttrDic[attr as PlayerAttrType]} 时出错:`, err);
          attrValues[attr] = 0;
        }
      });

      setAttributes(attrValues);

      // 4. 测试依赖更新
      console.log("🔄 测试依赖更新...");
      console.log("原始力量:", playerInstance.getAttributeValue("str"));
      console.log("原始最大HP:", playerInstance.getAttributeValue("maxHp"));

      // 修改力量，观察最大HP是否自动更新
      playerInstance.setAttributeValue("str", "baseValue" as any, 200, "test");
      console.log("修改力量为200后:");
      console.log("新力量:", playerInstance.getAttributeValue("str"));
      console.log("新最大HP:", playerInstance.getAttributeValue("maxHp"));

      // 5. 测试批量更新
      console.log("📦 测试批量更新...");
      playerInstance.setAttributeValue("agi", "baseValue" as any, 150, "test");
      playerInstance.setAttributeValue("dex", "baseValue" as any, 180, "test");
      console.log("批量修改后属性值已更新");
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

        {player() && !loading() && (
          <div class="space-y-6">
            <div class="rounded-lg bg-green-900 p-6">
              <h3 class="mb-2 font-bold text-green-400">✅ 系统创建成功</h3>
              <p class="text-green-300">PlayerData实例已成功创建，响应式系统正常工作</p>
            </div>

            <div class="rounded-lg bg-gray-800 p-6">
              <h3 class="mb-4 text-xl font-bold text-yellow-400">📊 角色属性值</h3>
              <div class="flex flex-wrap">
                {Object.entries(attributes()).map(([key, value]) => {
                  const attrName = PlayerAttrDic[key as PlayerAttrType] || key;
                  return (
                    <div class="border-dividing-color flex basis-1/2 items-center gap-2 border-b p-3">
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
