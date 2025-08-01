/**
 * JavaScript表达式编译器
 * 
 * 功能：
 * - 解析ES5 JavaScript表达式为AST
 * - 编译为高性能的指令序列
 * - 直接操作TypedArray数据结构
 * - 支持变量引用、运算符、函数调用
 */

// 注意：实际使用时需要安装 acorn
// npm install acorn @types/acorn

// 指令操作码
export enum OpCode {
  LOAD = 'LOAD',           // 从TypedArray加载值到寄存器
  STORE = 'STORE',         // 从寄存器存储值到TypedArray
  CONST = 'CONST',         // 加载常量到寄存器
  ADD = 'ADD',             // 加法运算
  SUB = 'SUB',             // 减法运算
  MUL = 'MUL',             // 乘法运算
  DIV = 'DIV',             // 除法运算
  MOD = 'MOD',             // 取模运算
  CALL_FUNC = 'CALL_FUNC', // 函数调用
  JUMP = 'JUMP',           // 跳转
  JUMP_IF = 'JUMP_IF',     // 条件跳转
  COMPARE = 'COMPARE',     // 比较运算
  AND = 'AND',             // 逻辑与
  OR = 'OR',               // 逻辑或
  NOT = 'NOT',             // 逻辑非
}

// 指令结构
export interface Instruction {
  op: OpCode;
  target?: number;    // 目标寄存器/属性索引
  source1?: number;   // 源寄存器1
  source2?: number;   // 源寄存器2
  value?: number;     // 常量值
  attrName?: string;  // 属性名
  funcName?: string;  // 函数名
}

// 编译上下文
interface CompileContext {
  instructions: Instruction[];
  registerCounter: number;
  attributeMap: Map<string, number>; // 属性名到索引的映射
  constants: number[];
}

/**
 * 模拟AST节点（实际使用时会用Acorn生成的真实AST）
 */
interface MockASTNode {
  type: string;
  operator?: string;
  left?: MockASTNode;
  right?: MockASTNode;
  name?: string;
  value?: number;
  callee?: MockASTNode;
  arguments?: MockASTNode[];
}

/**
 * JavaScript表达式编译器
 */
export class ExpressionCompiler {
  private context: CompileContext;
  private builtinFunctions: Map<string, (args: number[]) => number>;

  constructor(attributeMap: Map<string, number>) {
    this.context = {
      instructions: [],
      registerCounter: 0,
      attributeMap,
      constants: [],
    };

    // 注册内置函数
    this.builtinFunctions = new Map([
      ['min', (args) => Math.min(...args)],
      ['max', (args) => Math.max(...args)],
      ['floor', (args) => Math.floor(args[0])],
      ['ceil', (args) => Math.ceil(args[0])],
      ['round', (args) => Math.round(args[0])],
      ['abs', (args) => Math.abs(args[0])],
      ['sqrt', (args) => Math.sqrt(args[0])],
      ['pow', (args) => Math.pow(args[0], args[1])],
      // 游戏特定函数
      ['dynamicTotalValue', (args) => args[0]], // 示例：获取动态总值
    ]);
  }

  /**
   * 编译JavaScript表达式
   */
  compile(expression: string): Instruction[] {
    console.log(`🔧 编译表达式: ${expression}`);

    // 重置编译上下文
    this.context.instructions = [];
    this.context.registerCounter = 0;

    try {
      // 在真实实现中，这里会使用Acorn解析
      // const ast = parse(expression, { ecmaVersion: 5 });
      
      // 目前使用模拟AST进行演示
      const ast = this.parseExpressionMock(expression);
      
      // 编译AST为指令序列
      const resultReg = this.compileNode(ast);
      
      // 添加存储指令（如果需要）
      // this.context.instructions.push({
      //   op: OpCode.STORE,
      //   target: targetAttrIndex,
      //   source1: resultReg,
      // });

      console.log(`✅ 编译完成，生成 ${this.context.instructions.length} 条指令`);
      return this.context.instructions;

    } catch (error) {
      console.error(`❌ 表达式编译失败: ${expression}`, error);
      throw new Error(`表达式编译失败: ${error}`);
    }
  }

  /**
   * 编译AST节点
   */
  private compileNode(node: MockASTNode): number {
    switch (node.type) {
      case 'BinaryExpression':
        return this.compileBinaryExpression(node);
      
      case 'Identifier':
        return this.compileIdentifier(node);
      
      case 'Literal':
        return this.compileLiteral(node);
      
      case 'CallExpression':
        return this.compileCallExpression(node);
      
      default:
        throw new Error(`不支持的AST节点类型: ${node.type}`);
    }
  }

  /**
   * 编译二元表达式
   */
  private compileBinaryExpression(node: MockASTNode): number {
    const leftReg = this.compileNode(node.left!);
    const rightReg = this.compileNode(node.right!);
    const resultReg = this.allocateRegister();

    let opCode: OpCode;
    switch (node.operator) {
      case '+': opCode = OpCode.ADD; break;
      case '-': opCode = OpCode.SUB; break;
      case '*': opCode = OpCode.MUL; break;
      case '/': opCode = OpCode.DIV; break;
      case '%': opCode = OpCode.MOD; break;
      default:
        throw new Error(`不支持的操作符: ${node.operator}`);
    }

    this.context.instructions.push({
      op: opCode,
      target: resultReg,
      source1: leftReg,
      source2: rightReg,
    });

    return resultReg;
  }

  /**
   * 编译标识符（变量引用）
   */
  private compileIdentifier(node: MockASTNode): number {
    const attrIndex = this.context.attributeMap.get(node.name!);
    if (attrIndex === undefined) {
      throw new Error(`未知的属性: ${node.name}`);
    }

    const resultReg = this.allocateRegister();
    this.context.instructions.push({
      op: OpCode.LOAD,
      target: resultReg,
      attrName: node.name,
    });

    return resultReg;
  }

  /**
   * 编译字面量（常量）
   */
  private compileLiteral(node: MockASTNode): number {
    const resultReg = this.allocateRegister();
    this.context.instructions.push({
      op: OpCode.CONST,
      target: resultReg,
      value: node.value,
    });

    return resultReg;
  }

  /**
   * 编译函数调用
   */
  private compileCallExpression(node: MockASTNode): number {
    const funcName = node.callee!.name!;
    
    // 编译参数
    const argRegs: number[] = [];
    for (const arg of node.arguments || []) {
      argRegs.push(this.compileNode(arg));
    }

    const resultReg = this.allocateRegister();
    this.context.instructions.push({
      op: OpCode.CALL_FUNC,
      target: resultReg,
      funcName,
      source1: argRegs.length > 0 ? argRegs[0] : undefined,
      source2: argRegs.length > 1 ? argRegs[1] : undefined,
    });

    return resultReg;
  }

  /**
   * 分配新的寄存器
   */
  private allocateRegister(): number {
    return this.context.registerCounter++;
  }

  /**
   * 模拟表达式解析（演示用）
   * 真实实现会使用Acorn
   */
  private parseExpressionMock(expression: string): MockASTNode {
    // 这是一个简化的演示解析器
    // 实际中会使用: parse(expression, { ecmaVersion: 5 })
    
    // 示例：解析 "str * 2 + weaponPAtk"
    if (expression === "str * 2 + weaponPAtk") {
      return {
        type: 'BinaryExpression',
        operator: '+',
        left: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'Identifier', name: 'str' },
          right: { type: 'Literal', value: 2 },
        },
        right: { type: 'Identifier', name: 'weaponPAtk' },
      };
    }

    // 示例：解析 "vit * 10 + 100"
    if (expression === "vit * 10 + 100") {
      return {
        type: 'BinaryExpression',
        operator: '+',
        left: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'Identifier', name: 'vit' },
          right: { type: 'Literal', value: 10 },
        },
        right: { type: 'Literal', value: 100 },
      };
    }

    // 示例：解析函数调用 "max(str, int)"
    if (expression === "max(str, int)") {
      return {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'max' },
        arguments: [
          { type: 'Identifier', name: 'str' },
          { type: 'Identifier', name: 'int' },
        ],
      };
    }

    throw new Error(`无法解析表达式: ${expression}`);
  }

  /**
   * 获取编译统计信息
   */
  getCompileStats() {
    return {
      instructionCount: this.context.instructions.length,
      registerCount: this.context.registerCounter,
      constantCount: this.context.constants.length,
    };
  }
}

/**
 * 指令执行器
 */
export class InstructionExecutor {
  private registers: Float64Array;
  private attributeValues: Float64Array;
  private attributeMap: Map<string, number>;
  private builtinFunctions: Map<string, (args: number[]) => number>;

  constructor(
    attributeValues: Float64Array,
    attributeMap: Map<string, number>,
    maxRegisters: number = 32
  ) {
    this.registers = new Float64Array(maxRegisters);
    this.attributeValues = attributeValues;
    this.attributeMap = attributeMap;

    // 注册内置函数
    this.builtinFunctions = new Map([
      ['min', (args) => Math.min(...args)],
      ['max', (args) => Math.max(...args)],
      ['floor', (args) => Math.floor(args[0])],
      ['ceil', (args) => Math.ceil(args[0])],
      ['round', (args) => Math.round(args[0])],
      ['abs', (args) => Math.abs(args[0])],
      ['sqrt', (args) => Math.sqrt(args[0])],
      ['pow', (args) => Math.pow(args[0], args[1])],
    ]);
  }

  /**
   * 执行指令序列
   */
  execute(instructions: Instruction[]): number {
    for (const instruction of instructions) {
      this.executeInstruction(instruction);
    }

    // 返回最后一个寄存器的值（通常是表达式结果）
    return this.registers[instructions.length > 0 ? instructions[instructions.length - 1].target || 0 : 0];
  }

  /**
   * 执行单条指令
   */
  private executeInstruction(instruction: Instruction): void {
    switch (instruction.op) {
      case OpCode.LOAD:
        this.executeLoad(instruction);
        break;
      case OpCode.STORE:
        this.executeStore(instruction);
        break;
      case OpCode.CONST:
        this.executeConst(instruction);
        break;
      case OpCode.ADD:
        this.executeAdd(instruction);
        break;
      case OpCode.SUB:
        this.executeSub(instruction);
        break;
      case OpCode.MUL:
        this.executeMul(instruction);
        break;
      case OpCode.DIV:
        this.executeDiv(instruction);
        break;
      case OpCode.CALL_FUNC:
        this.executeCallFunc(instruction);
        break;
      default:
        throw new Error(`不支持的指令: ${instruction.op}`);
    }
  }

  private executeLoad(instruction: Instruction): void {
    const attrIndex = this.attributeMap.get(instruction.attrName!);
    if (attrIndex !== undefined) {
      this.registers[instruction.target!] = this.attributeValues[attrIndex];
    }
  }

  private executeStore(instruction: Instruction): void {
    const attrIndex = this.attributeMap.get(instruction.attrName!);
    if (attrIndex !== undefined) {
      this.attributeValues[attrIndex] = this.registers[instruction.source1!];
    }
  }

  private executeConst(instruction: Instruction): void {
    this.registers[instruction.target!] = instruction.value!;
  }

  private executeAdd(instruction: Instruction): void {
    this.registers[instruction.target!] = 
      this.registers[instruction.source1!] + this.registers[instruction.source2!];
  }

  private executeSub(instruction: Instruction): void {
    this.registers[instruction.target!] = 
      this.registers[instruction.source1!] - this.registers[instruction.source2!];
  }

  private executeMul(instruction: Instruction): void {
    this.registers[instruction.target!] = 
      this.registers[instruction.source1!] * this.registers[instruction.source2!];
  }

  private executeDiv(instruction: Instruction): void {
    this.registers[instruction.target!] = 
      this.registers[instruction.source1!] / this.registers[instruction.source2!];
  }

  private executeCallFunc(instruction: Instruction): void {
    const func = this.builtinFunctions.get(instruction.funcName!);
    if (func) {
      const args: number[] = [];
      if (instruction.source1 !== undefined) {
        args.push(this.registers[instruction.source1]);
      }
      if (instruction.source2 !== undefined) {
        args.push(this.registers[instruction.source2]);
      }
      this.registers[instruction.target!] = func(args);
    } else {
      throw new Error(`未知函数: ${instruction.funcName}`);
    }
  }
}