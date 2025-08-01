/**
 * 响应式系统验证测试
 * 用于确保数据的响应性和一致性
 */

import { Player } from "../core/member/player/Player";
import { findMemberWithRelations, type MemberWithRelations } from "@db/repositories/member";

// ============================== 验证工具 ==============================

interface ReactivityTestResult {
  testName: string;
  passed: boolean;
  expected: number;
  actual: number;
  timestamp: number;
  details?: string;
}

class ReactivityValidator {
  private testResults: ReactivityTestResult[] = [];

  /**
   * 验证单个属性值
   */
  validateValue(
    testName: string, 
    actual: number, 
    expected: number, 
    tolerance: number = 0.001
  ): ReactivityTestResult {
    const passed = Math.abs(actual - expected) <= tolerance;
    const result: ReactivityTestResult = {
      testName,
      passed,
      expected,
      actual,
      timestamp: performance.now(),
      details: passed ? undefined : `差异: ${Math.abs(actual - expected)}, 容差: ${tolerance}`
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`✅ ${testName}: ${actual} (期望: ${expected})`);
    } else {
      console.error(`❌ ${testName}: ${actual} (期望: ${expected}) - ${result.details}`);
    }
    
    return result;
  }

  /**
   * 验证依赖关系响应
   */
  validateDependency(
    testName: string,
    beforeValue: number,
    afterValue: number,
    expectedChange: number,
    tolerance: number = 0.001
  ): ReactivityTestResult {
    const actualChange = afterValue - beforeValue;
    const passed = Math.abs(actualChange - expectedChange) <= tolerance;
    
    const result: ReactivityTestResult = {
      testName,
      passed,
      expected: expectedChange,
      actual: actualChange,
      timestamp: performance.now(),
      details: passed ? undefined : `变化差异: ${Math.abs(actualChange - expectedChange)}, 容差: ${tolerance}`
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`✅ ${testName}: 变化 ${actualChange} (期望变化: ${expectedChange})`);
    } else {
      console.error(`❌ ${testName}: 变化 ${actualChange} (期望变化: ${expectedChange}) - ${result.details}`);
    }
    
    return result;
  }

  /**
   * 获取测试总结
   */
  getSummary() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const failedTests = this.testResults.filter(r => !r.passed);
    
    return {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? (passed / total * 100).toFixed(1) : '0',
      failedTests
    };
  }

  /**
   * 重置测试结果
   */
  reset(): void {
    this.testResults = [];
  }
}

// ============================== 测试用例 ==============================

/**
 * 测试基础属性响应性
 */
export async function testBasicReactivity(): Promise<void> {
  console.log("🧪 开始基础响应性测试...");
  
  await withMemberData((data) => {
    const player = new Player(data);
    const validator = new ReactivityValidator();
    
    // 1. 测试基础属性设置和读取
    console.log("\n📊 测试基础属性设置...");
    player.getReactiveDataManager().setValue("str", 100);
    player.getReactiveDataManager().setValue("vit", 50);
    
    const str = player.getAttributeValue("str");
    const vit = player.getAttributeValue("vit");
    
    validator.validateValue("基础属性str设置", str, 100);
    validator.validateValue("基础属性vit设置", vit, 50);
    
    // 2. 测试计算属性响应性
    console.log("\n🔄 测试计算属性响应性...");
    const lv = player.getAttributeValue("lv");
    const tec = player.getAttributeValue("tec");
    
    // 根据游戏公式计算期望值
    const expectedMaxHp = Math.floor(93 + lv * (127 / 17 + vit / 3));
    const expectedMaxMp = Math.floor(99 + lv + player.getAttributeValue("int") / 10 + tec);
    
    const actualMaxHp = player.getAttributeValue("maxHp");
    const actualMaxMp = player.getAttributeValue("maxMp");
    
    validator.validateValue("maxHp计算", actualMaxHp, expectedMaxHp);
    validator.validateValue("maxMp计算", actualMaxMp, expectedMaxMp);
    
    // 3. 输出结果
    const summary = validator.getSummary();
    console.log(`\n📈 基础响应性测试完成: ${summary.passed}/${summary.total} 通过 (${summary.passRate}%)`);
    
    if (summary.failedTests.length > 0) {
      console.log("❌ 失败的测试:");
      summary.failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
    }
  });
}

/**
 * 测试依赖链响应性
 */
export async function testDependencyChainReactivity(): Promise<void> {
  console.log("🔗 开始依赖链响应性测试...");
  
  await withMemberData((data) => {
    const player = new Player(data);
    const validator = new ReactivityValidator();
    const reactiveManager = player.getReactiveDataManager();
    
    // 1. 记录初始状态
    console.log("\n📊 记录初始状态...");
    const initialStr = player.getAttributeValue("str");
    const initialVit = player.getAttributeValue("vit");
    const initialMaxHp = player.getAttributeValue("maxHp");
    const initialPAtk = player.getAttributeValue("pAtk");
    
    console.log(`初始值 - str: ${initialStr}, vit: ${initialVit}, maxHp: ${initialMaxHp}, pAtk: ${initialPAtk}`);
    
    // 调试：显示依赖图
    const dependencyGraph = reactiveManager.getDependencyGraphInfo();
    console.log("🔗 依赖图信息:", dependencyGraph);
    
    // 2. 修改str，测试pAtk的响应
    console.log("\n🔄 测试str -> pAtk依赖链...");
    
    // 调试：检查依赖关系
    const debugInfo = reactiveManager.getDebugInfo();
    console.log("🔍 str依赖信息:", {
      str: debugInfo.str,
      pAtk: debugInfo.pAtk
    });
    
    const strIncrease = 20;
    reactiveManager.setValue("str", initialStr + strIncrease);
    
    const newStr = player.getAttributeValue("str");
    const newPAtk = player.getAttributeValue("pAtk");
    
    // 调试：修改后检查依赖信息
    const debugInfoAfter = reactiveManager.getDebugInfo();
    console.log("🔍 修改str后的依赖信息:", {
      str: debugInfoAfter.str,
      pAtk: debugInfoAfter.pAtk
    });
    
    // 根据公式计算期望的pAtk变化: pAtk = lv + weaponAtk * 1 + str * 2 + ...
    const expectedPAtkIncrease = strIncrease * 2; // str系数为2
    
    validator.validateValue("str修改后的值", newStr, initialStr + strIncrease);
    validator.validateDependency("str -> pAtk依赖", initialPAtk, newPAtk, expectedPAtkIncrease);
    
    // 3. 修改vit，测试maxHp的响应
    console.log("\n🔄 测试vit -> maxHp依赖链...");
    const vitIncrease = 15;
    reactiveManager.setValue("vit", initialVit + vitIncrease);
    
    const newVit = player.getAttributeValue("vit");
    const newMaxHp = player.getAttributeValue("maxHp");
    
    // 根据公式计算期望的maxHp变化: maxHp = floor(93 + lv * (127/17 + vit/3))
    const lv = player.getAttributeValue("lv");
    const expectedMaxHpIncrease = Math.floor(lv * vitIncrease / 3);
    
    validator.validateValue("vit修改后的值", newVit, initialVit + vitIncrease);
    validator.validateDependency("vit -> maxHp依赖", initialMaxHp, newMaxHp, expectedMaxHpIncrease);
    
    // 4. 输出结果
    const summary = validator.getSummary();
    console.log(`\n📈 依赖链响应性测试完成: ${summary.passed}/${summary.total} 通过 (${summary.passRate}%)`);
    
    if (summary.failedTests.length > 0) {
      console.log("❌ 失败的测试:");
      summary.failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
    }
  });
}

/**
 * 测试批量修改的响应性
 */
export async function testBatchReactivity(): Promise<void> {
  console.log("📦 开始批量响应性测试...");
  
  await withMemberData((data) => {
    const player = new Player(data);
    const validator = new ReactivityValidator();
    const reactiveManager = player.getReactiveDataManager();
    
    // 1. 记录初始状态
    const initialValues = {
      str: player.getAttributeValue("str"),
      int: player.getAttributeValue("int"),
      vit: player.getAttributeValue("vit"),
      pAtk: player.getAttributeValue("pAtk"),
      mAtk: player.getAttributeValue("mAtk"),
      maxHp: player.getAttributeValue("maxHp"),
      maxMp: player.getAttributeValue("maxMp")
    };
    
    console.log("\n📊 记录初始值:", initialValues);
    
    // 2. 批量修改基础属性
    console.log("\n🔄 批量修改基础属性...");
    const changes = {
      str: 25,
      int: 30, 
      vit: 20
    };
    
    // 使用单独设置（避免类型问题）
    reactiveManager.setValue("str", initialValues.str + changes.str);
    reactiveManager.setValue("int", initialValues.int + changes.int);
    reactiveManager.setValue("vit", initialValues.vit + changes.vit);
    
    // 3. 验证所有属性都正确更新
    const newValues = {
      str: player.getAttributeValue("str"),
      int: player.getAttributeValue("int"),
      vit: player.getAttributeValue("vit"),
      pAtk: player.getAttributeValue("pAtk"),
      mAtk: player.getAttributeValue("mAtk"),
      maxHp: player.getAttributeValue("maxHp"),
      maxMp: player.getAttributeValue("maxMp")
    };
    
    console.log("📊 更新后的值:", newValues);
    
    // 验证基础属性
    validator.validateValue("批量str设置", newValues.str, initialValues.str + changes.str);
    validator.validateValue("批量int设置", newValues.int, initialValues.int + changes.int);
    validator.validateValue("批量vit设置", newValues.vit, initialValues.vit + changes.vit);
    
    // 验证计算属性的响应
    const lv = player.getAttributeValue("lv");
    const tec = player.getAttributeValue("tec");
    const weaponAtk = player.getAttributeValue("weaponAtk");
    
    // 计算期望值（获取dex值）
    const dex = player.getAttributeValue("dex");
    const expectedPAtk = lv + weaponAtk * 1 + newValues.str * 2 + newValues.int * 0 + 0 + dex * 2;
    const expectedMAtk = lv + weaponAtk * 0 + newValues.str * 0 + newValues.int * 3 + 0 + 0;
    const expectedMaxHp = Math.floor(93 + lv * (127 / 17 + newValues.vit / 3));
    const expectedMaxMp = Math.floor(99 + lv + newValues.int / 10 + tec);
    
    validator.validateValue("批量更新后pAtk", newValues.pAtk, expectedPAtk, 1); // 允许1的误差
    validator.validateValue("批量更新后mAtk", newValues.mAtk, expectedMAtk, 1);
    validator.validateValue("批量更新后maxHp", newValues.maxHp, expectedMaxHp);
    validator.validateValue("批量更新后maxMp", newValues.maxMp, expectedMaxMp);
    
    // 4. 输出结果
    const summary = validator.getSummary();
    console.log(`\n📈 批量响应性测试完成: ${summary.passed}/${summary.total} 通过 (${summary.passRate}%)`);
    
    if (summary.failedTests.length > 0) {
      console.log("❌ 失败的测试:");
      summary.failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
    }
  });
}

/**
 * 测试数据一致性
 */
export async function testDataConsistency(): Promise<void> {
  console.log("🔒 开始数据一致性测试...");
  
  await withMemberData((data) => {
    const player = new Player(data);
    const validator = new ReactivityValidator();
    const reactiveManager = player.getReactiveDataManager();
    
    // 1. 多次读取同一属性，确保结果一致
    console.log("\n📊 测试读取一致性...");
    const attr = "maxHp";
    const values: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      values.push(player.getAttributeValue(attr));
    }
    
    const allSame = values.every(v => v === values[0]);
    validator.validateValue("多次读取一致性", allSame ? 1 : 0, 1);
    
    if (!allSame) {
      console.log("❌ 多次读取结果不一致:", values);
    }
    
    // 2. 修改后立即读取，确保是新值
    console.log("\n🔄 测试修改后立即读取...");
    const oldVit = player.getAttributeValue("vit");
    const oldMaxHp = player.getAttributeValue("maxHp");
    
    reactiveManager.setValue("vit", oldVit + 10);
    
    // 立即读取，应该是新值
    const newVit = player.getAttributeValue("vit");
    const newMaxHp = player.getAttributeValue("maxHp");
    
    validator.validateValue("修改后立即读取vit", newVit, oldVit + 10);
    
    // maxHp应该已经更新
    const vitChangedMaxHp = newMaxHp !== oldMaxHp;
    validator.validateValue("依赖属性立即更新", vitChangedMaxHp ? 1 : 0, 1);
    
    // 3. 批量获取与单独获取的一致性
    console.log("\n📦 测试批量获取一致性...");
    const singleValues = {
      str: player.getAttributeValue("str"),
      int: player.getAttributeValue("int"),
      vit: player.getAttributeValue("vit"),
      maxHp: player.getAttributeValue("maxHp"),
      maxMp: player.getAttributeValue("maxMp")
    };
    
    const batchValues = player.getAllAttributeValues();
    
    let batchConsistent = true;
    for (const [key, singleValue] of Object.entries(singleValues)) {
      if (batchValues[key] !== singleValue) {
        batchConsistent = false;
        console.log(`❌ 批量获取不一致: ${key} 单独=${singleValue}, 批量=${batchValues[key]}`);
      }
    }
    
    validator.validateValue("批量获取一致性", batchConsistent ? 1 : 0, 1);
    
    // 4. 输出结果
    const summary = validator.getSummary();
    console.log(`\n📈 数据一致性测试完成: ${summary.passed}/${summary.total} 通过 (${summary.passRate}%)`);
    
    if (summary.failedTests.length > 0) {
      console.log("❌ 失败的测试:");
      summary.failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
    }
  });
}

/**
 * 运行全部响应性验证测试
 */
export async function runAllReactivityTests(): Promise<void> {
  console.log("🧪🧪🧪 开始全面响应性验证测试 🧪🧪🧪");
  console.log("=".repeat(60));
  
  const startTime = performance.now();
  
  try {
    await testBasicReactivity();
    console.log("\n" + "=".repeat(60));
    
    await testDependencyChainReactivity();
    console.log("\n" + "=".repeat(60));
    
    await testBatchReactivity();
    console.log("\n" + "=".repeat(60));
    
    await testDataConsistency();
    console.log("\n" + "=".repeat(60));
    
    const endTime = performance.now();
    console.log(`\n🎉 全部响应性验证测试完成，总耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
  } catch (error) {
    console.error("❌ 响应性验证测试过程中出现错误:", error);
  }
}

// ============================== 工具函数 ==============================

async function withMemberData<T>(testFn: (data: MemberWithRelations) => T): Promise<T | null> {
  try {
    const data = await findMemberWithRelations("defaultMember1Id");
    return testFn(data);
  } catch (error) {
    console.error("❌ 获取成员数据失败:", error);
    return null;
  }
}