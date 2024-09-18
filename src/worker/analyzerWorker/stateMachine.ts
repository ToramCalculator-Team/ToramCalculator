import type { Step, PropertyValue, Definition, BranchedStep, SequentialStep } from "sequential-workflow-designer";
import { createId } from "@paralleldrive/cuid2";
import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import * as _ from "lodash-es";

// 随机种子设置
const randomSeed: null | string = null;

// 验证 `all` 是否为有效的 FactoryFunctionMap 对象
if (!all) {
  throw new Error("all is undefined. Make sure you are importing it correctly.");
}

const math = create(all, {
  epsilon: 1e-12,
  matrix: "Matrix",
  number: "number",
  precision: 64,
  predictable: false,
  randomSeed: randomSeed,
});

// math函数计算上下文
const scope = new Map();
// 自定义计算函数
const cEvaluate = (formula: string) => {
  const result = math.evaluate(formula, scope);
  self.postMessage({ formula, scope, result });
  return result;
};

// 运算数据类型定义
interface TextStepProperties extends Record<string, PropertyValue> {
  message: string;
}
interface MathStepProperties extends Record<string, PropertyValue> {
  formula: string;
}
interface BranchesStepProperties extends Record<string, PropertyValue> {
  condition: string;
}
interface LoopStepProperties extends Record<string, PropertyValue> {
  condition: string;
}

// 步骤属性定义
interface CustomTextStep extends Step {
  properties: TextStepProperties;
}
interface CustomMathStep extends Step {
  properties: MathStepProperties;
}
interface CustomBranchStep extends BranchedStep {
  properties: BranchesStepProperties;
  branches: {
    [branchName: string]: CustomStateMachineStep[];
  };
}
interface CustomSequentialStep extends SequentialStep {
  properties: LoopStepProperties;
  sequence: CustomStateMachineStep[];
}

type CustomStateMachineStep = Step | CustomMathStep | CustomBranchStep | CustomSequentialStep;

class StateMachineSteps {
  static createIfStep(
    name: string,
    properties: BranchesStepProperties,
    trueSteps: CustomStateMachineStep[],
    falseSteps: CustomStateMachineStep[],
  ): CustomBranchStep {
    return {
      id: createId(),
      componentType: "switch",
      type: "if",
      name,
      branches: {
        true: trueSteps || [],
        false: falseSteps || [],
      },
      properties,
    };
  }

  static createLoopStep(
    name: string,
    properties: LoopStepProperties,
    steps: CustomStateMachineStep[],
  ): CustomSequentialStep {
    return {
      id: createId(),
      componentType: "container",
      type: "loop",
      name,
      sequence: steps ?? [],
      properties,
    };
  }

  static createTaskStep(name: string, type: string, properties: MathStepProperties | TextStepProperties): Step {
    return {
      id: createId(),
      componentType: "task",
      type,
      name,
      properties,
    };
  }
}

class Steps {
  static createMathStep(name: string, formula: string) {
    return StateMachineSteps.createTaskStep(name, "calculation", {
      formula,
    });
  }

  static createTextStep(message: string) {
    return StateMachineSteps.createTaskStep(message, "message", {
      message: message,
    });
  }

  static createIfStep(
    name: string,
    condition: string,
    trueSteps?: CustomStateMachineStep[],
    falseSteps?: CustomStateMachineStep[],
  ) {
    return StateMachineSteps.createIfStep(
      name,
      {
        condition,
      },
      trueSteps ?? [],
      falseSteps ?? [],
    );
  }

  static createLoopStep(name: string, condition: string, steps?: CustomStateMachineStep[]) {
    return StateMachineSteps.createLoopStep(
      name,
      {
        condition,
      },
      steps ?? [],
    );
  }
}

function isTextStep(step: CustomStateMachineStep): step is CustomTextStep {
  let condition: boolean = "message" in step.properties;
  condition = step.type === "message";
  return condition;
}
function isMathStep(step: CustomStateMachineStep): step is CustomMathStep {
  let condition: boolean = "formula" in step.properties;
  return condition;
}
function isIfStep(step: CustomStateMachineStep): step is CustomBranchStep {
  let condition: boolean = "branches" in step && step.type === "if";
  return condition;
}
function isLoopStep(step: CustomStateMachineStep): step is CustomSequentialStep {
  let condition: boolean = step.type === "loop";
  return condition;
}

class StateMachine {
  definition: typeof startDefinition;
  data: { [key: string]: number };
  callstack: {
    sequence: CustomStateMachineStep[];
    index: number;
    unwind: () => void;
  }[];
  isRunning: boolean;
  isInterrupted = false;
  consoles: string;

  constructor(definition: typeof startDefinition) {
    this.definition = definition;
    this.data = {};
    this.consoles = "Consoles:";
    this.callstack = [
      {
        sequence: this.definition.sequence,
        index: 0,
        unwind: () => {},
      },
    ];
    this.isRunning = false;
  }

  unwindStack() {
    this.callstack.pop();
  }

  executeIfStep(step: CustomBranchStep) {
    const value = this.executeIf(step);
    this.callstack.push({
      sequence: value ? step.branches.true : step.branches.false,
      index: 0,
      unwind: this.unwindStack.bind(this),
    });
  }

  executeLoopStep(step: CustomSequentialStep) {
    const program = {
      sequence: step.sequence,
      index: 0,
      unwind: () => {
        if (this.canReplyLoopStep(step)) {
          program.index = 0;
        } else {
          this.unwindStack();
        }
      },
    };
    this.callstack.push(program);
  }

  executeStep(step: CustomStateMachineStep) {
    if (isTextStep(step)) {
      this.consoles += "\r\n" + step.properties.message;
      return;
    }
    if (isMathStep(step)) {
      const formula = step.properties.formula;
      cEvaluate(formula);
    }
  }

  execute() {
    if (this.isInterrupted) {
      this.onInterrupted();
      return;
    }

    const depth = this.callstack.length - 1;
    const program = this.callstack[depth];
    if (program.sequence.length === program.index) {
      if (depth > 0) {
        program.unwind();
        this.execute();
      } else {
        this.isRunning = false;
        this.onFinished();
      }
      return;
    }

    const step = program.sequence[program.index];
    program.index++;

    switch (step.type) {
      case "if":
        isIfStep(step) && this.executeIfStep(step);
        break;
      case "loop":
        isLoopStep(step) && this.executeLoopStep(step);
        break;
      default:
        this.executeStep(step);
        break;
    }

    this.execute.bind(this)
    // setTimeout(this.execute.bind(this), this.definition.properties.speed);
    this.afterStepExecution(step);
  }

  start() {
    if (this.isRunning) {
      throw new Error("Already running");
    }
    this.isRunning = true;
    this.callstack[0].index = 0;
    this.execute();
  }

  interrupt() {
    if (!this.isRunning) {
      throw new Error("Not running");
    }
    this.isInterrupted = true;
  }

  executeIf(step: CustomBranchStep) {
    return cEvaluate(step.properties.condition) === true;
  }

  canReplyLoopStep(step: CustomSequentialStep) {
    return cEvaluate(step.properties.condition) === true;
  }

  afterStepExecution(step: Step) {}

  onFinished() {}

  onInterrupted() {}
}

interface WorkflowDefinition extends Definition {
  properties: {
    speed: number;
  };
  sequence: CustomStateMachineStep[];
}

const startDefinition: WorkflowDefinition = {
  properties: {
    speed: 300,
  },
  sequence: [
    Steps.createTextStep("开始!"),
    Steps.createMathStep("定义", "a = 1"),
    Steps.createMathStep("定义", "b = 2"),
    Steps.createLoopStep("循环", "a < 20", [
      Steps.createMathStep("自增", "a = a + 2"),
      Steps.createMathStep("自减", "a = a + b - 1"),
      Steps.createIfStep("如果x大于50", "a < 10", [Steps.createTextStep("yes!")], [Steps.createTextStep("no...")]),
    ]),
    Steps.createTextStep("结束"),
  ],
};

export const defaultSM = new StateMachine(startDefinition);
