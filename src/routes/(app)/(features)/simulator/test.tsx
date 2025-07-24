import { Component, createSignal, createResource, Show, For, onCleanup } from "solid-js";
import { findCharacters, findCharacterWithRelations } from "@db/repositories/character";
import { createReactiveAttributeSystem } from "./eval.worker";

const TestPage: Component = () => {
  const [character, setCharacter] = createSignal<any>(null);
  const [attributeSystem, setAttributeSystem] = createSignal<any>(null);
  const [selectedAttr, setSelectedAttr] = createSignal<number>(0);
  const [attrValue, setAttrValue] = createSignal<number>(0);
  const [allAttributes, setAllAttributes] = createSignal<Record<number, number>>({});
  const [characterId, setCharacterId] = createSignal<string>("");
  const [availableCharacters, {}] = createResource(async () => {
    const characters = await findCharacters();
    return characters;
  });

  // 组件卸载时清理系统
  onCleanup(() => {
    const system = attributeSystem();
    if (system) {
      system.cleanup();
    }
  });

  // 加载角色数据
  const loadCharacter = async () => {
    if (!characterId()) {
      alert("请先选择角色ID");
      return;
    }
    
    try {
      // 清理之前的系统
      const currentSystem = attributeSystem();
      if (currentSystem) {
        currentSystem.cleanup();
      }
      
      const charData = await findCharacterWithRelations(characterId());
      if (!charData) {
        alert(`未找到ID为 ${characterId()} 的角色数据`);
        return;
      }
      
      setCharacter(charData);
      
      // 使用工厂函数创建响应式属性系统
      const system = createReactiveAttributeSystem(charData);
      setAttributeSystem(system);
      
      // 更新所有属性显示
      updateAllAttributes();
    } catch (error) {
      console.error("加载角色数据失败:", error);
      alert(`加载角色数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 更新所有属性显示
  const updateAllAttributes = () => {
    const system = attributeSystem();
    if (system) {
      setAllAttributes(system.getAllAttributes());
    }
  };

  // 修改属性
  const modifyAttribute = () => {
    const system = attributeSystem();
    if (system) {
      system.setPlayerAttr(selectedAttr(), attrValue());
      updateAllAttributes();
    }
  };

  // 获取属性名称
  const getAttrName = (attr: number): string => {
    const attrNames: Record<number, string> = {
      0: "等级",
      1: "力量",
      2: "智力", 
      3: "耐力",
      4: "敏捷",
      5: "灵巧",
      6: "幸运",
      7: "技巧",
      8: "异抗",
      9: "暴击",
      10: "最大MP",
      11: "MP",
      12: "仇恨值",
      13: "武器射程",
      14: "HP自然回复",
      15: "MP自然回复",
      16: "MP攻击回复",
      17: "物理攻击",
      18: "魔法攻击",
      19: "武器攻击",
      20: "拔刀攻击",
      21: "物理贯穿",
      22: "魔法贯穿",
      23: "暴击率",
      24: "暴击伤害",
      25: "魔法暴击转化率",
      26: "魔法爆伤转化率",
      27: "魔法暴击率",
      28: "魔法暴击伤害",
      29: "近距离威力",
      30: "远距离威力",
      31: "对无属性增强",
      32: "对光属性增强",
      33: "对暗属性增强",
      34: "对水属性增强",
      35: "对火属性增强",
      36: "对地属性增强",
      37: "对风属性增强",
      38: "总伤害",
      39: "最终伤害",
      40: "稳定率",
      41: "魔法稳定率",
      42: "命中",
      43: "物理追击",
      44: "魔法追击",
      45: "看穿",
      46: "破防",
      47: "反弹伤害",
      48: "绝对命中",
      49: "物理攻击提升（力量）",
      50: "物理攻击提升（智力）",
      51: "物理攻击提升（耐力）",
      52: "物理攻击提升（敏捷）",
      53: "物理攻击提升（灵巧）",
      54: "魔法攻击提升（力量）",
      55: "魔法攻击提升（智力）",
      56: "魔法攻击提升（耐力）",
      57: "魔法攻击提升（敏捷）",
      58: "魔法攻击提升（灵巧）",
      59: "物理攻击下降（力量）",
      60: "物理攻击下降（智力）",
      61: "物理攻击下降（耐力）",
      62: "物理攻击下降（敏捷）",
      63: "物理攻击下降（灵巧）",
      64: "魔法攻击下降（力量）",
      65: "魔法攻击下降（智力）",
      66: "魔法攻击下降（耐力）",
      67: "魔法攻击下降（敏捷）",
      68: "魔法攻击下降（灵巧）",
      69: "最大HP",
      70: "当前HP",
      71: "身体装备防御",
      72: "物理防御",
      73: "魔法防御",
      74: "物理抗性",
      75: "魔法抗性",
      76: "无属性抗性",
      77: "光属性抗性",
      78: "暗属性抗性",
      79: "水属性抗性",
      80: "火属性抗性",
      81: "地属性抗性",
      82: "风属性抗性",
      83: "回避",
      84: "异常抗性",
      85: "格挡力",
      86: "格挡回复",
      87: "闪躲回复",
      88: "物理屏障",
      89: "魔法屏障",
      90: "百分比瓶屏障",
      91: "屏障回复速度",
      92: "地面伤害减轻",
      93: "陨石伤害减轻",
      94: "范围伤害减轻",
      95: "敌方周围伤害减轻",
      96: "贴地伤害减轻",
      97: "子弹伤害减轻",
      98: "直线伤害减轻",
      99: "冲撞伤害减轻",
      100: "绝对回避",
      101: "攻击速度",
      102: "行动速度",
      103: "动作缩减",
      104: "咏唱速度",
      105: "咏唱缩减",
      106: "掉宝率",
      107: "复活时间",
      108: "封印胆怯",
      109: "封印翻覆",
      110: "封印昏厥",
      111: "无敌急救",
      112: "经验加成",
      113: "宠物经验",
      114: "道具冷却",
      115: "反作用伤害",
      116: "晶石粉末掉落",
      117: "主武器魔法攻击转换率",
      118: "主武器物理攻击转换率",
      119: "主武器基础值",
      120: "主武器攻击",
      121: "副武器基础值",
      122: "副武器攻击",
      123: "防具基础值"
    };
    return attrNames[attr] || `属性${attr}`;
  };

  return (
    <div class="min-h-screen bg-gray-100 p-8 overflow-y-auto">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-800 mb-8">响应式属性系统测试</h1>
        
        {/* 角色选择 */}
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">角色选择</h2>
          <div class="flex gap-4 items-end">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">选择角色</label>
                              <select 
                  value={characterId()} 
                  onChange={(e) => setCharacterId(e.target.value)}
                  class="border border-gray-300 rounded px-3 py-2"
                >
                <option value="">请选择角色</option>
                <For each={availableCharacters()}>
                  {(char) => (
                    <option value={char.id}>{char.name} (ID: {char.id})</option>
                  )}
                </For>
              </select>
            </div>
            <button 
              onClick={loadCharacter}
              disabled={!characterId()}
              class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
            >
              加载角色数据
            </button>
          </div>
          
          <Show when={character()}>
            <div class="mt-4 p-4 bg-gray-50 rounded">
              <p><strong>角色ID:</strong> {character()?.id}</p>
              <p><strong>角色名:</strong> {character()?.name}</p>
              <p><strong>等级:</strong> {character()?.lv}</p>
              <p><strong>武器类型:</strong> {character()?.weapon?.template?.type}</p>
              <p><strong>武器名称:</strong> {character()?.weapon?.template?.name}</p>
              <p><strong>副武器类型:</strong> {character()?.subWeapon?.template?.type}</p>
              <p><strong>防具名称:</strong> {character()?.armor?.template?.name}</p>
            </div>
          </Show>
        </div>

        <Show when={attributeSystem()}>
          {/* 属性修改 */}
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">属性修改</h2>
            <div class="flex gap-4 items-end">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">选择基础属性</label>
                <select 
                  value={selectedAttr()} 
                  onChange={(e) => setSelectedAttr(Number(e.target.value))}
                  class="border border-gray-300 rounded px-3 py-2"
                >
                  <option value={0}>等级</option>
                  <option value={1}>力量</option>
                  <option value={2}>智力</option>
                  <option value={3}>耐力</option>
                  <option value={4}>敏捷</option>
                  <option value={5}>灵巧</option>
                  <option value={6}>幸运</option>
                  <option value={7}>技巧</option>
                  <option value={8}>异抗</option>
                  <option value={9}>暴击</option>
                  <option value={119}>主武器基础值</option>
                  <option value={121}>副武器基础值</option>
                  <option value={123}>防具基础值</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">新值</label>
                <input 
                  type="number" 
                  value={attrValue()} 
                  onChange={(e) => setAttrValue(Number(e.target.value))}
                  class="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <button 
                onClick={modifyAttribute}
                class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                修改属性
              </button>
            </div>
          </div>

          {/* 属性值显示 */}
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">属性值</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <For each={Object.entries(allAttributes())}>
                {([attr, value]) => (
                  <div class="p-3 bg-gray-50 rounded border">
                    <div class="font-medium text-gray-800">{getAttrName(Number(attr))}</div>
                    <div class="text-lg font-bold text-blue-600">{value}</div>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* 属性依赖关系 */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">属性依赖关系</h2>
            <Show when={attributeSystem()?.getAttributeDependencyInfo()}>
              <For each={attributeSystem()?.getAttributeDependencyInfo()}>
                {(dependency) => (
                  <div class="mb-4 p-4 bg-gray-50 rounded border">
                    <div class="font-medium text-gray-800 mb-2">
                      {getAttrName(dependency.target)}
                    </div>
                    <div class="text-sm text-gray-600 mb-2">
                      {dependency.description}
                    </div>
                    <div class="text-sm text-gray-500">
                      依赖: {dependency.dependencies.map((dep: number) => getAttrName(dep)).join(", ")}
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default TestPage; 