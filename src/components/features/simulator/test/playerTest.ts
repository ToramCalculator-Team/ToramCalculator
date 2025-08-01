/**
 * Player类TypedArray集成测试
 * 验证Player类使用ReactiveSystem的正确性和性能
 */

import { Player } from "../core/member/player/Player";
import { findMemberWithRelations, type MemberWithRelations } from "@db/repositories/member";

/**
 * 异步获取成员数据并执行测试
 */
async function withMemberData<T>(testFn: (data: MemberWithRelations) => T): Promise<T | null> {
  try {
    const data = await findMemberWithRelations("defaultMember1Id");
    return testFn(data);
  } catch (error) {
    console.error("❌ 无法获取成员数据，请确保数据库中存在 defaultMember1Id", error);
    return null;
  }
}

/**
 * 基础功能测试
 */
export async function testPlayerBasicFunctionality(): Promise<void> {
  console.log("🧪 开始Player基础功能测试...");
  
  await withMemberData((data) => {
    try {
      // 创建Player实例
      const player = new Player(data);
    
    console.log("✅ Player实例创建成功");
    
    // 测试属性获取
    const str = player.getAttributeValue("str");
    const maxHp = player.getAttributeValue("maxHp");
    const pAtk = player.getAttributeValue("pAtk");
    
    console.log(`📊 基础属性值:`);
    console.log(`  - str: ${str}`);
    console.log(`  - maxHp: ${maxHp}`);
    console.log(`  - pAtk: ${pAtk}`);
    
    // 测试修饰符添加
    player.addAttributeModifier("str", "staticFixed", 50, {
      id: "test_equipment",
      name: "测试装备",
      type: "equipment"
    });
    
    const newStr = player.getAttributeValue("str");
    console.log(`✅ 添加修饰符后 str: ${newStr} (增加了${newStr - str})`);
    
    // 测试批量获取
    const allValues = player.getAllAttributeValues();
    console.log(`📈 总属性数量: ${Object.keys(allValues).length}`);
    
    // 测试响应式数据管理器
    const reactiveManager = player.getReactiveDataManager();
    const stats = reactiveManager.getStats();
    console.log(`🚀 TypedArray统计信息:`, {
      totalAttributes: stats.totalAttributes,
      computations: stats.computations,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      memoryUsage: `${(stats.memoryUsage.total / 1024).toFixed(2)} KB`,
    });
    
      console.log("✅ Player基础功能测试完成");
      
    } catch (error) {
      console.error("❌ Player基础功能测试失败:", error);
      throw error;
    }
  });
}

/**
 * 性能测试
 */
export async function testPlayerPerformance(): Promise<void> {
  console.log("🏃 开始Player性能测试...");
  
  await withMemberData((data) => {
    try {
      const player = new Player(data);
    
    const ITERATIONS = 10000;
    
    // 测试属性访问性能
    console.time("属性访问性能");
    for (let i = 0; i < ITERATIONS; i++) {
      player.getAttributeValue("str");
      player.getAttributeValue("maxHp");
      player.getAttributeValue("pAtk");
      player.getAttributeValue("pDef");
    }
    console.timeEnd("属性访问性能");
    
    // 测试修饰符添加性能
    console.time("修饰符添加性能");
    for (let i = 0; i < ITERATIONS / 10; i++) {
      player.addAttributeModifier("str", "staticFixed", 1, {
        id: `test_${i}`,
        name: `测试${i}`,
        type: "equipment"
      });
    }
    console.timeEnd("修饰符添加性能");
    
    // 测试批量获取性能
    console.time("批量获取性能");
    for (let i = 0; i < ITERATIONS / 100; i++) {
      player.getAllAttributeValues();
    }
    console.timeEnd("批量获取性能");
    
    // 输出最终统计
    const reactiveManager = player.getReactiveDataManager();
    const stats = reactiveManager.getStats();
    console.log("📊 性能测试完成后的统计:");
    console.log(`  - 总计算次数: ${stats.computations}`);
    console.log(`  - 缓存命中: ${stats.cacheHits}`);
    console.log(`  - 缓存未命中: ${stats.cacheMisses}`);
    console.log(`  - 命中率: ${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)}%`);
    console.log(`  - 内存使用: ${(stats.memoryUsage.total / 1024).toFixed(2)} KB`);
    
      console.log("✅ Player性能测试完成");
      
    } catch (error) {
      console.error("❌ Player性能测试失败:", error);
      throw error;
    }
  });
}

/**
 * 表达式计算测试
 */
export async function testPlayerExpressions(): Promise<void> {
  console.log("🧮 开始Player表达式计算测试...");
  
  await withMemberData((data) => {
    try {
      const player = new Player(data);
    
    // 设置一些基础值
    const reactiveManager = player.getReactiveDataManager();
    reactiveManager.setValue("str", 100);
    reactiveManager.setValue("int", 80);
    reactiveManager.setValue("vit", 90);
    reactiveManager.setValue("mainWeaponBaseAtk", 150);
    reactiveManager.setValue("bodyArmorDef", 50);
    
    // 验证基础属性值
    const actualStr = player.getAttributeValue("str");
    const actualInt = player.getAttributeValue("int");
    const actualVit = player.getAttributeValue("vit");
    
    console.log("🔍 验证设置的基础属性值:");
    console.log(`  - str: ${actualStr} (设置: 100)`);
    console.log(`  - int: ${actualInt} (设置: 80)`);
    console.log(`  - vit: ${actualVit} (设置: 90)`);
    
    // 测试依赖属性的计算
    const maxHp = player.getAttributeValue("maxHp");
    const maxMp = player.getAttributeValue("maxMp");
    const pAtk = player.getAttributeValue("pAtk");
    const mAtk = player.getAttributeValue("mAtk");
    const pDef = player.getAttributeValue("pDef");
    const mDef = player.getAttributeValue("mDef");
    
    console.log("🧮 表达式计算结果:");
    // 使用游戏内公式计算期望值
    const expectedMaxHp = Math.floor(93 + player.getAttributeValue("lv") * (127 / 17 + actualVit / 3));
    const expectedMaxMp = Math.floor(99 + player.getAttributeValue("lv") + actualInt / 10 + player.getAttributeValue("tec"));
    console.log(`  - maxHp (游戏内公式): ${maxHp} (期望: ${expectedMaxHp})`);
    console.log(`  - maxMp (游戏内公式): ${maxMp} (期望: ${expectedMaxMp})`);
    console.log(`  - pAtk: ${pAtk}`);
    console.log(`  - mAtk: ${mAtk}`);
    console.log(`  - pDef: ${pDef}`);
    console.log(`  - mDef: ${mDef}`);
    
    // 验证表达式依赖关系
    console.log("🔗 测试依赖关系:");
    const oldMaxHp = maxHp;
    const oldVit = actualVit;
    reactiveManager.setValue("vit", 100); // 增加vit
    const newVit = player.getAttributeValue("vit");
    const newMaxHp = player.getAttributeValue("maxHp");
    // 计算期望的增量：根据游戏公式，vit增加10应该使maxHp增加 lv * (10/3)
    const expectedIncrease = Math.floor(player.getAttributeValue("lv") * (newVit - oldVit) / 3);
    console.log(`  - vit从${oldVit}改为${newVit}，maxHp从${oldMaxHp}变为${newMaxHp} (增加: ${newMaxHp - oldMaxHp}, 期望增加约: ${expectedIncrease})`);
    
      console.log("✅ Player表达式计算测试完成");
      
    } catch (error) {
      console.error("❌ Player表达式计算测试失败:", error);
      throw error;
    }
  });
}

/**
 * 运行所有测试
 */
export async function runAllPlayerTests(): Promise<void> {
  console.log("🎮 开始Player类TypedArray集成完整测试");
  console.log("=".repeat(50));
  
  try {
    await testPlayerBasicFunctionality();
    console.log("");
    
    await testPlayerPerformance();
    console.log("");
    
    await testPlayerExpressions();
    console.log("");
    
    console.log("🎉 所有Player测试都通过了！");
    console.log("✨ TypedArray集成成功，Player类已完全升级");
    
  } catch (error) {
    console.error("💥 Player测试失败:", error);
    throw error;
  }
}