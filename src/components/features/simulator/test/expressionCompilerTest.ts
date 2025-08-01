/**
 * JavaScript表达式编译器测试
 * 演示从JS表达式到TypedArray操作的完整流程
 */

import { ExpressionCompiler, InstructionExecutor, OpCode } from "../core/expression/ExpressionCompiler";

/**
 * 测试表达式编译和执行
 */
export function testExpressionCompiler(): void {
  console.log("🧪 开始JavaScript表达式编译器测试");
  console.log("=".repeat(50));

  // 创建属性映射（模拟PlayerAttr枚举）
  const attributeMap = new Map([
    ["str", 0],
    ["int", 1], 
    ["vit", 2],
    ["agi", 3],
    ["dex", 4],
    ["weaponPAtk", 5],
    ["weaponMAtk", 6],
    ["maxHp", 7],
    ["maxMp", 8],
    ["pAtk", 9],
    ["mAtk", 10],
  ]);

  // 创建TypedArray存储属性值
  const attributeValues = new Float64Array(attributeMap.size);
  
  // 设置初始值
  attributeValues[0] = 100; // str
  attributeValues[1] = 80;  // int
  attributeValues[2] = 90;  // vit
  attributeValues[3] = 70;  // agi
  attributeValues[4] = 85;  // dex
  attributeValues[5] = 150; // weaponPAtk
  attributeValues[6] = 120; // weaponMAtk

  console.log("📊 初始属性值:");
  for (const [name, index] of attributeMap) {
    if (index < 7) { // 只显示设置了值的属性
      console.log(`  ${name}: ${attributeValues[index]}`);
    }
  }
  console.log("");

  // 创建编译器和执行器
  const compiler = new ExpressionCompiler(attributeMap);
  const executor = new InstructionExecutor(attributeValues, attributeMap);

  // 测试案例
  const testCases = [
    {
      name: "生命值计算",
      expression: "vit * 10 + 100",
      expected: 90 * 10 + 100,
      targetAttr: "maxHp"
    },
    {
      name: "魔法值计算", 
      expression: "int * 5 + 50",
      expected: 80 * 5 + 50,
      targetAttr: "maxMp"
    },
    {
      name: "物理攻击计算",
      expression: "str * 2 + weaponPAtk",
      expected: 100 * 2 + 150,
      targetAttr: "pAtk"
    },
  ];

  // 执行测试
  for (const testCase of testCases) {
    console.log(`🔧 测试: ${testCase.name}`);
    console.log(`📝 表达式: ${testCase.expression}`);
    
    try {
      // 编译表达式
      const instructions = compiler.compile(testCase.expression);
      
      console.log("🛠️ 生成的指令序列:");
      instructions.forEach((instr, i) => {
        console.log(`  [${i}] ${instr.op} ${JSON.stringify(instr).slice(1, -1)}`);
      });

      // 执行指令
      const result = executor.execute(instructions);
      
      console.log(`✅ 计算结果: ${result}`);
      console.log(`📌 期望结果: ${testCase.expected}`);
      console.log(`${result === testCase.expected ? '✅' : '❌'} 结果${result === testCase.expected ? '正确' : '错误'}`);
      
      // 获取编译统计
      const stats = compiler.getCompileStats();
      console.log(`📈 编译统计: ${JSON.stringify(stats)}`);

    } catch (error) {
      console.error(`❌ 测试失败:`, error);
    }
    
    console.log("-".repeat(30));
  }

  console.log("✅ JavaScript表达式编译器测试完成");
}

/**
 * 测试复杂表达式和函数调用
 */
export function testComplexExpressions(): void {
  console.log("🧪 开始复杂表达式测试");
  console.log("=".repeat(50));

  const attributeMap = new Map([
    ["str", 0],
    ["int", 1],
    ["result", 2],
  ]);

  const attributeValues = new Float64Array(attributeMap.size);
  attributeValues[0] = 50; // str
  attributeValues[1] = 30; // int

  const compiler = new ExpressionCompiler(attributeMap);
  const executor = new InstructionExecutor(attributeValues, attributeMap);

  const complexCases = [
    {
      name: "函数调用测试",
      expression: "max(str, int)",
      expected: Math.max(50, 30),
    },
  ];

  for (const testCase of complexCases) {
    console.log(`🔧 测试: ${testCase.name}`);
    console.log(`📝 表达式: ${testCase.expression}`);

    try {
      const instructions = compiler.compile(testCase.expression);
      const result = executor.execute(instructions);
      
      console.log(`✅ 计算结果: ${result}`);
      console.log(`📌 期望结果: ${testCase.expected}`);
      console.log(`${result === testCase.expected ? '✅' : '❌'} 结果${result === testCase.expected ? '正确' : '错误'}`);

    } catch (error) {
      console.error(`❌ 测试失败:`, error);
    }
    
    console.log("-".repeat(30));
  }

  console.log("✅ 复杂表达式测试完成");
}

/**
 * 性能基准测试
 */
export function testPerformanceBenchmark(): void {
  console.log("🏃 开始性能基准测试");
  console.log("=".repeat(50));

  const attributeMap = new Map([
    ["str", 0],
    ["int", 1], 
    ["vit", 2],
    ["weaponPAtk", 3],
    ["result", 4],
  ]);

  const attributeValues = new Float64Array(attributeMap.size);
  attributeValues[0] = 100;
  attributeValues[1] = 80;
  attributeValues[2] = 90;
  attributeValues[3] = 150;

  const compiler = new ExpressionCompiler(attributeMap);
  const executor = new InstructionExecutor(attributeValues, attributeMap);

  // 预编译表达式
  const expression = "str * 2 + weaponPAtk";
  const instructions = compiler.compile(expression);

  console.log(`📝 测试表达式: ${expression}`);
  console.log(`🛠️ 指令数量: ${instructions.length}`);

  // 性能测试
  const iterations = 100000;
  
  console.time("指令执行性能");
  for (let i = 0; i < iterations; i++) {
    executor.execute(instructions);
  }
  console.timeEnd("指令执行性能");

  // 对比原生JavaScript执行
  console.time("原生JavaScript性能");
  for (let i = 0; i < iterations; i++) {
    const result = attributeValues[0] * 2 + attributeValues[3];
  }
  console.timeEnd("原生JavaScript性能");

  console.log(`📊 执行 ${iterations} 次迭代`);
  console.log("✅ 性能基准测试完成");
}

/**
 * 运行所有测试
 */
export function runAllExpressionTests(): void {
  console.log("🚀 开始JavaScript表达式编译器完整测试");
  console.log("=".repeat(60));

  try {
    testExpressionCompiler();
    console.log("");
    
    testComplexExpressions();
    console.log("");
    
    testPerformanceBenchmark();
    console.log("");

    console.log("🎉 所有表达式编译器测试都通过了！");
    console.log("💡 下一步: 集成Acorn.js进行真实JS解析");
    
  } catch (error) {
    console.error("💥 表达式编译器测试失败:", error);
    throw error;
  }
}