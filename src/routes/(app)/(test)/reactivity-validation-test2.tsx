import { createSignal, onMount, onCleanup, For } from "solid-js";
import { findMemberWithRelations } from "@db/repositories/member";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { EnhancedSimulatorPool } from "~/components/features/simulator/SimulatorPool";
import {
  PlayerAttrEnum,
  PlayerAttrDic,
  PlayerAttrKeys,
  PlayerAttrType,
} from "~/components/features/simulator/core/member/player/PlayerData";
import type { MemberSerializeData } from "~/components/features/simulator/core/Member";
import { Button } from "~/components/controls/button";
import { Select, SelectOption } from "~/components/controls/select";
import { Card } from "~/components/containers/card";

export default function ReactivityValidationTestPage() {
  const [simulatorPool, setSimulatorPool] = createSignal<EnhancedSimulatorPool | null>(null);
  const [members, setMembers] = createSignal<MemberSerializeData[]>([]);
  const [currentMember, setCurrentMember] = createSignal<MemberSerializeData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [dependencyInfoDisplay, setDependencyInfoDisplay] = createSignal(false);
  const [attributes, setAttributes] = createSignal<Record<string, number>>({});
  const [dirtyAttributes, setDirtyAttributes] = createSignal<Set<string>>(new Set());
  const [changeHistory, setChangeHistory] = createSignal<
    Array<{
      timestamp: number;
      action: string;
      targetAttr: string;
      oldValue?: number;
      newValue?: number;
      affectedAttrs: string[];
    }>
  >([]);

  // 更新属性显示（从Worker获取成员数据）
  const updateAttributes = async () => {
    const pool = simulatorPool();
    if (!pool) return;

    try {
      const memberData = await pool.getMembers();
      setMembers(memberData);
      
      // 找到当前测试的成员
      const testMember = memberData.find(m => m.type === 'Player');
      if (testMember) {
        setCurrentMember(testMember);
        
        // 更新属性显示
        const attrValues: Record<string, number> = {};
        for (const attr of PlayerAttrKeys) {
          attrValues[attr] = testMember.state.context.stats[attr] || 0;
        }
        setAttributes(attrValues);
      }
    } catch (err) {
      console.error('获取成员数据失败:', err);
    }
  };

  // 检查脏属性（暂时模拟，因为无法直接访问Worker内部状态）
  const checkDirtyAttributes = () => {
    // 在Worker环境中，我们无法直接访问ReactiveSystem的内部状态
    // 这里暂时模拟脏标记检查
    const dirtySet = new Set<string>();
    setDirtyAttributes(dirtySet);
  };

  // 修改属性并记录变化（通过Worker）
  const modifyAttribute = async (attrName: PlayerAttrType, newValue: number) => {
    const pool = simulatorPool();
    const member = currentMember();
    if (!pool || !member) return;

    const oldValue = attributes()[attrName] || 0;

    try {
      // 通过IntentMessage发送属性修改指令
      const result = await pool.sendIntent({
        id: `test_modify_${Date.now()}`,
        type: 'custom',
        targetMemberId: member.id,
        timestamp: Date.now(),
        data: {
          action: 'modify_attribute',
          attribute: attrName,
          value: newValue,
          scriptCode: `
            // 安全的属性修改脚本
            caster.setAttributeValue('${attrName}', 'baseValue', ${newValue}, 'test');
            return { success: true, oldValue: ${oldValue}, newValue: ${newValue} };
          `
        }
      });

      if (result.success) {
        // 更新本地显示
        setTimeout(async () => {
          await updateAttributes();
          
          // 记录变化历史
          setChangeHistory((prev) => [
            {
              timestamp: Date.now(),
              action: "🛡️ 安全修改属性",
              targetAttr: attrName,
              oldValue,
              newValue,
              affectedAttrs: [], // Worker中无法直接获取依赖信息
            },
            ...prev.slice(0, 19),
          ]);
        }, 100);
      } else {
        console.error('属性修改失败:', result.error);
      }
    } catch (err) {
      console.error('发送修改指令失败:', err);
    }
  };

  // 批量修改属性（通过Worker）
  const batchModifyAttributes = async (modifications: Array<{ attr: PlayerAttrType; value: number }>) => {
    const pool = simulatorPool();
    const member = currentMember();
    if (!pool || !member) return;

    try {
      // 构建批量修改脚本
      const scriptCode = `
        // 安全的批量属性修改脚本
        const results = [];
        ${modifications.map(({ attr, value }) => `
        results.push({
          attr: '${attr}',
          oldValue: caster.getAttributeValue('${attr}'),
          newValue: ${value}
        });
        caster.setAttributeValue('${attr}', 'baseValue', ${value}, 'batch-test');
        `).join('')}
        return { success: true, results };
      `;

      const result = await pool.sendIntent({
        id: `test_batch_${Date.now()}`,
        type: 'custom',
        targetMemberId: member.id,
        timestamp: Date.now(),
        data: {
          action: 'batch_modify_attributes',
          modifications,
          scriptCode
        }
      });

      if (result.success) {
        setTimeout(async () => {
          await updateAttributes();
          
          setChangeHistory((prev) => [
            {
              timestamp: Date.now(),
              action: "🛡️ 安全批量修改",
              targetAttr: modifications.map((m) => m.attr).join(", "),
              oldValue: undefined,
              newValue: undefined,
              affectedAttrs: [],
            },
            ...prev.slice(0, 19),
          ]);
        }, 100);
      }
    } catch (err) {
      console.error('批量修改失败:', err);
    }
  };

  // 获取依赖关系信息（模拟）
  const getDependencyInfo = () => {
    // 在Worker环境中无法直接访问依赖图信息
    // 返回一个模拟的依赖关系
    return {
      str: ['pAtk', 'maxHp'],
      int: ['mAtk', 'maxMp'],
      vit: ['maxHp', 'pDef'],
      agi: ['aspd', 'pDef'],
      dex: ['pAtk', 'accuracy']
    };
  };

  onMount(async () => {
    try {
      setLoading(true);

      // 创建SimulatorPool实例
      const pool = new EnhancedSimulatorPool();
      setSimulatorPool(pool);

      // 获取测试数据
      const memberData = await findMemberWithRelations("defaultMember1Id");
      const simulatorData = await findSimulatorWithRelations("defaultSimulatorId");
      
      // 如果没有找到模拟器数据，创建一个简单的测试配置
      const testSimulatorData = simulatorData || {
        campA: [{
          id: "testTeamA",
          name: "测试队伍A", 
          members: [memberData]
        }],
        campB: [{
          id: "testTeamB", 
          name: "测试队伍B",
          members: []
        }]
      };

      // 启动模拟器
      console.log('🛡️ 启动安全的Worker模拟器...');
      const startResult = await pool.startSimulation(testSimulatorData);
      
      if (startResult.success) {
        console.log('✅ 安全模拟器启动成功');
        
        // 获取初始成员数据
        await updateAttributes();
        checkDirtyAttributes();

        // 定期更新数据
        const interval = setInterval(async () => {
          await updateAttributes();
          checkDirtyAttributes();
        }, 1000);

        onCleanup(() => {
          clearInterval(interval);
          pool.shutdown();
        });
      } else {
        throw new Error(`模拟器启动失败: ${startResult.error}`);
      }
    } catch (err) {
      console.error("❌ 安全测试初始化失败:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  // 创建属性选项
  const attributeOptions = (): SelectOption[] => {
    return PlayerAttrKeys.map((attr) => ({
      label: PlayerAttrDic[attr] || attr,
      value: attr,
    }));
  };

  return (
    <div class="flex h-full flex-col gap-6 p-6">
      {/* 页面标题 */}
      <div>
        <h1 class="mb-2 text-3xl font-bold">🛡️ 安全沙盒响应式系统测试</h1>
        <p class="text-accent-color text-lg">通过Worker沙盒安全地测试属性变化和JS片段执行</p>
      </div>

      {/* 加载状态 */}
      {loading() && (
        <div class="bg-area-color border-dividing-color mb-6 rounded-lg border p-6">
          <div class="flex items-center space-x-3">
            <div class="border-primary-color h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
            <span class="text-accent-color">正在初始化安全沙盒和Worker线程池...</span>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error() && (
        <div class="mb-6 rounded-lg border border-red-600 bg-red-900/20 p-6">
          <h3 class="mb-2 font-bold text-red-400">❌ 初始化失败</h3>
          <p class="text-red-300">{error()}</p>
        </div>
      )}

      {/* 主要内容 */}
      {currentMember() && !loading() && (
        <div class="flex h-full flex-1 gap-4 overflow-y-hidden">
          {/* 左侧：监控和控制 */}
          <div class="flex h-full basis-1/3 flex-col gap-3">
            {/* 变化历史 */}
            <div class="bg-area-color border-dividing-color h-full rounded-lg border p-6">
              <div class="mb-3 flex flex-wrap gap-3">
                <Select
                  value=""
                  setValue={(value) => {
                    if (value) {
                      const currentValue = attributes()[value as PlayerAttrType] || 0;
                      modifyAttribute(value as PlayerAttrType, currentValue + 10);
                    }
                  }}
                  options={attributeOptions()}
                  placeholder="选择属性"
                  class="w-48"
                />
              </div>
              <h2 class="mb-4 text-xl font-semibold">📊 变化历史</h2>
              {/* 单个属性修改 */}
              <div class="mb-6">
                <h3 class="text-accent-color mb-3 text-lg font-medium">单个属性修改</h3>
              </div>
              <div class="max-h-60 space-y-3 overflow-y-auto">
                <For each={changeHistory()}>
                  {(record) => (
                    <div class="bg-background-color border-dividing-color rounded border p-4">
                      <div class="mb-2 flex items-start justify-between">
                        <span class="font-medium">{record.action}</span>
                        <span class="text-accent-color text-sm">{new Date(record.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div class="text-main-text-color mb-2 text-sm">
                        目标: {record.targetAttr}
                        {record.oldValue !== undefined && record.newValue !== undefined && (
                          <span class="text-accent-color ml-2">
                            ({record.oldValue} → {record.newValue})
                          </span>
                        )}
                      </div>
                      {record.affectedAttrs.length > 0 && (
                        <div class="text-sm">
                          <span class="text-yellow-500">影响属性:</span>
                          <span class="text-accent-color ml-1">{record.affectedAttrs.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* 右侧：数据展示 */}
          <div class="flex h-full basis-2/3 flex-col gap-3">
            {/* 当前属性值 */}
            <div class="bg-area-color border-dividing-color h-full rounded-lg border p-6">
              <div
                class="grid h-full flex-1 grid-cols-2 gap-3 overflow-y-auto"
                onClick={() => setDependencyInfoDisplay(!dependencyInfoDisplay())}
              >
                <For each={Object.entries(attributes())}>
                  {([key, value]) => {
                    const attrName = PlayerAttrDic[key as PlayerAttrType] || key;
                    const isDirty = dirtyAttributes().has(key);
                    return (
                      <div
                        class={`rounded border p-3 ${isDirty ? "border-red-600 bg-red-900/20" : "bg-background-color border-dividing-color"}`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="text-main-text-color font-medium">{attrName}</span>
                          <span class={`font-mono font-bold ${isDirty ? "text-red-400" : "text-green-500"}`}>
                            {typeof value === "number" ? value.toLocaleString() : String(value)}
                          </span>
                        </div>
                        {isDirty && <div class="mt-1 text-xs text-red-400">🚨 脏标记</div>}
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* 依赖关系信息 */}
            <Card title="🔗 依赖关系" index={0} total={1} display={dependencyInfoDisplay()}>
              <div class="flex flex-col gap-2" onClick={() => setDependencyInfoDisplay(false)}>
                <For each={Object.entries(getDependencyInfo()!)}>
                  {([attr, dependents]) => (
                    <div class="bg-background-color border-dividing-color rounded border p-3">
                      <div class="mb-1 font-medium">{PlayerAttrDic[attr as PlayerAttrType] || attr}</div>
                      <div class="text-accent-color text-xs">
                        影响: {dependents.map((d) => PlayerAttrDic[d as PlayerAttrType] || d).join(", ") || "无"}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
