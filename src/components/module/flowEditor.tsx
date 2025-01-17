import { Accessor, createEffect, createMemo, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import {
  BranchedStep,
  Definition,
  Designer,
  PropertyValue,
  RootEditorContext,
  SequentialStep,
  Step,
  StepEditorContext,
  StepsConfiguration,
  ToolboxConfiguration,
  ValidatorConfiguration,
} from "sequential-workflow-designer";
import Button from "../controls/button";
import Input, { InputComponentType } from "../controls/input";
import * as Icon from "~/components/icon";
import { wrapDefinition } from "./flowEditor/WrappedDefinition";
import { RootEditorWrapperContext, useRootEditor } from "./flowEditor/RootEditorWrapper";
import { StepEditorWrapperContext, useStepEditor } from "./flowEditor/StepEditorWrapper";
import { createId } from "@paralleldrive/cuid2";
import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import * as _ from "lodash-es";
import { set } from "zod";
import { render } from "solid-js/web";

const externalEditorClassName = "sqd-editor-solid";

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
  console.log({ formula, scope, result });
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

export type CustomStateMachineStep = Step | CustomMathStep | CustomBranchStep | CustomSequentialStep;

export class StateMachineSteps {
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

class Steps {
  static createMathStep(name: string, formula: string) {
    return StateMachineSteps.createTaskStep(name + formula, "calculation", {
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
      name + condition,
      {
        condition,
      },
      trueSteps ?? [],
      falseSteps ?? [],
    );
  }

  static createLoopStep(name: string, condition: string, steps?: CustomStateMachineStep[]) {
    return StateMachineSteps.createLoopStep(
      name + condition,
      {
        condition,
      },
      steps ?? [],
    );
  }
}

interface WorkflowDefinition extends Definition {
  properties: {
    speed: number;
  };
  sequence: CustomStateMachineStep[];
}

interface FlowEditorProps {
  sequence?: CustomStateMachineStep[];
  setSequence: (sequence: CustomStateMachineStep[]) => void;
  display: boolean;
  setDisplay: (display: boolean) => void;
}

export default function FlowEditor(props: FlowEditorProps) {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  const [mounted, setMounted] = createSignal(false);
  const [placeholder, setPlaceholder] = createSignal<HTMLElement | null>(null);
  const [isToolboxCollapsed, setIsToolboxCollapsed] = createSignal(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = createSignal(false);
  const [isReadonly, setIsReadonly] = createSignal(false);
  const [selectedStepId, setSelectedStepId] = createSignal<string | null>(null);
  const [isFollowingSelectedStep, setIsFollowingSelectedStep] = createSignal(true);

  // function forwardDefinition() {
  //   if (designer()) {
  //     const wd = wrapDefinition(designer()!.getDefinition(), designer()!.isValid());
  //     setDefinition(wd);
  //   }
  // }

  const SettingPageContentModule = (
    moduleName: string,
    labelName: string,
    content: {
      title: string;
      description: string;
      children: JSX.Element;
      type?: InputComponentType;
    }[],
  ) => (
    <div class={`Module ${moduleName} flex flex-col gap-1 lg:gap-2 lg:px-3`}>
      <h2 class="ModuleTitle py-2 text-xl font-bold lg:px-2">{labelName}</h2>
      <div class="LabelGroup flex flex-col gap-2">
        <For each={content}>
          {({ title, description, children }) => (
            <Input title={title} description={description}>
              {children}
            </Input>
          )}
        </For>
      </div>
    </div>
  );

  const Divider = () => <div class="Divider h-[1px] w-full flex-none bg-dividing-color"></div>;

  function rootEditorProvider(def: WorkflowDefinition, context: RootEditorContext, isReadonly: boolean) {
    const container = document.createElement("div");
    container.className = externalEditorClassName;
    render(
      () => (
        <RootEditorWrapperContext definition={def} context={context} isReadonly={isReadonly}>
          <div class="List flex h-full flex-1 flex-col gap-6 rounded">
            {SettingPageContentModule("Language", dictionary().ui.settings.language.title, [
              {
                title: dictionary().ui.settings.language.selectedLanguage.title,
                description: dictionary().ui.settings.language.selectedLanguage.description,
                children: (
                  <input
                    name="speed"
                    onChange={(e) => {
                      def.properties.speed = parseInt(e.target.value);
                      context.notifyPropertiesChanged();
                    }}
                    value={def.properties.speed?.toString() ?? ""}
                    readOnly={isReadonly}
                    type="text"
                  />
                ),
              },
            ])}
            <Divider />
          </div>
        </RootEditorWrapperContext>
      ),
      container,
    );
    return container;
  }

  function stepEditorProvider(
    step: CustomStateMachineStep,
    context: StepEditorContext,
    def: Definition,
    isReadonly: boolean,
  ) {
    const container = document.createElement("div");
    container.className = externalEditorClassName;
    render(
      () => (
        <StepEditorWrapperContext step={step} definition={def} context={context} isReadonly={isReadonly}>
          <div class="StepEditor">
            <h4>{"Step " + step.type}</h4>
            <p>
              <label>
                名称
                <input
                  name="name"
                  onInput={(e) => {
                    step.name = e.target.value;
                    context.notifyNameChanged();
                  }}
                  value={step.name?.toString()}
                  readOnly={isReadonly}
                  type="text"
                />
              </label>
            </p>
            <For each={["formula", "condition", "message"]}>
              {(key) => (
                <Show when={step.properties[key] !== undefined}>
                  <p>
                    <label>
                      {key}
                      <input
                        name={key}
                        onInput={(e) => {
                          step.properties[key] = e.target.value;
                          context.notifyPropertiesChanged();
                        }}
                        value={step.properties[key]?.toString()}
                        readOnly={isReadonly}
                        type="text"
                      />
                    </label>
                  </p>
                </Show>
              )}
            </For>
          </div>
        </StepEditorWrapperContext>
      ),
      container,
    );

    return container;
  }

  const toolboxConfiguration: Accessor<ToolboxConfiguration> = createMemo(() => ({
    groups: [
      {
        name: "数学模块",
        steps: [Steps.createMathStep("自定义公式", ""), Steps.createTextStep("消息模块")],
      },
      {
        name: "逻辑模块",
        steps: [Steps.createIfStep("If", ""), Steps.createLoopStep("Loop", "")],
      },
    ],
  }));
  const stepsConfiguration: Accessor<StepsConfiguration> = createMemo(() => ({
    /* ... */
  }));
  const validatorConfiguration: Accessor<ValidatorConfiguration> = createMemo(() => ({
    step: (step) => {
      return Object.keys(step.properties).every((n) => !!step.properties[n]);
    },
    root: (definition) => {
      return (definition.properties["speed"] as number) > 0;
    },
  }));

  class StateMachine<TDefinition extends Definition> {
    definition: TDefinition;
    data: { [key: string]: number };
    callstack: {
      sequence: CustomStateMachineStep[];
      index: number;
      unwind: () => void;
    }[];
    isRunning: boolean;
    isInterrupted = false;
    consoles: string;

    constructor(definition: TDefinition) {
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

      // this.execute.bind(this);
      setTimeout(this.execute.bind(this), this.definition.properties.speed as number);
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

    afterStepExecution(step: Step) {
      setSelectedStepId(step.id);
      designer()?.selectStepById(step.id);
      isFollowingSelectedStep() && designer()?.moveViewportToStep(step.id);
    }

    onFinished() {}

    onInterrupted() {}
  }

  let SM: StateMachine<WorkflowDefinition> | null = null;

  const startDefinition = createMemo<WorkflowDefinition>(() => {
    console.log("startDefinition memo");
    return {
      properties: {
        speed: 300,
      },
      sequence: _.cloneDeep(props.sequence) ?? [
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
  });

  const [designer, setDesigner] = createSignal<Designer<WorkflowDefinition> | null>(null);

  // const designer = createMemo<Designer<WorkflowDefinition> | null>(() => {
  //   console.log("designer memo");
  //   if (document.getElementById("sqd-placeholder")) {
  //     return Designer.create(placeholder()!, startDefinition(), {
  //       theme: "light",
  //       undoStackSize: 10,
  //       toolbox: toolboxConfiguration()
  //         ? {
  //             ...toolboxConfiguration(),
  //             isCollapsed: isToolboxCollapsed(),
  //           }
  //         : false,
  //       steps: stepsConfiguration(),
  //       validator: validatorConfiguration(),
  //       controlBar: true,
  //       contextMenu: true,
  //       keyboard: true,
  //       // preferenceStorage:,
  //       editors: {
  //         isCollapsed: isEditorCollapsed(),
  //         rootEditorProvider,
  //         stepEditorProvider,
  //       },
  //       customActionHandler: () => {},
  //       // extensions,
  //       // i18n,
  //       isReadonly: isReadonly(),
  //     });
  //   } else {
  //     return null;
  //   }
  // });

  // 由于不清楚subscribe内部执行逻辑，暂时保留其源生用法，作为Designer属性变化的副作用
  // createEffect用于实时更新Designer属性

  // designer()?.onReady.subscribe(forwardDefinition);

  // createEffect(() => {
  //   definition().value &&
  //     definition().value !== designer()?.getDefinition() &&
  //     designer()?.replaceDefinition(definition().value);
  // });

  // createEffect(() => {
  //   selectedStepId() && designer()?.selectStepById(selectedStepId()!);
  //   isFollowingSelectedStep() && selectedStepId() && designer()?.moveViewportToStep(selectedStepId()!);
  // });

  // createEffect(() => {
  //   isToolboxCollapsed() && designer()?.setIsToolboxCollapsed(isToolboxCollapsed());
  // });

  // createEffect(() => {
  //   isEditorCollapsed() && designer()?.setIsEditorCollapsed(isEditorCollapsed());
  // });

  // createEffect(() => {
  //   isReadonly() && designer()?.setIsReadonly(isReadonly());
  // });

  // createEffect(() => {
  //   isFollowingSelectedStep() && selectedStepId() && designer()?.moveViewportToStep(selectedStepId()!);
  // });

  createEffect(() => {
    designer()?.onDefinitionChanged.subscribe(() => {
      const sequence = designer()?.getDefinition().sequence;
      if (mounted() && sequence) {
        console.log("sequence 发生变化，更新序列");
        props.setSequence(sequence);
      } else {
        console.log("sequence 未发生变化，不作处理");
      }
    });
    designer()?.onSelectedStepIdChanged.subscribe((stepId) => {});
    designer()?.onIsToolboxCollapsedChanged.subscribe((isCollapsed) => {});
    designer()?.onIsEditorCollapsedChanged.subscribe((isCollapsed) => {});
    if (designer()) {
      SM = new StateMachine(designer()!.getDefinition());
    }
  });

  onMount(() => {
    console.log("FlowEditor onMount");

    setDesigner(
      Designer.create(placeholder()!, startDefinition(), {
        theme: "light",
        undoStackSize: 10,
        toolbox: toolboxConfiguration()
          ? {
              ...toolboxConfiguration(),
              isCollapsed: isToolboxCollapsed(),
            }
          : false,
        steps: stepsConfiguration(),
        validator: validatorConfiguration(),
        controlBar: true,
        contextMenu: true,
        keyboard: true,
        // preferenceStorage:,
        editors: {
          isCollapsed: isEditorCollapsed(),
          rootEditorProvider,
          stepEditorProvider,
        },
        customActionHandler: () => {},
        // extensions,
        // i18n,
        isReadonly: isReadonly(),
      }),
    );

    // esc键监听
    const handleEscapeKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("esc");
        e.stopPropagation(); // 阻止事件继续冒泡
      }
    };

    document.addEventListener("keydown", handleEscapeKeyPress);
    return () => {
      if (designer()) {
        designer()!.destroy();
      }
      document.addEventListener("keydown", handleEscapeKeyPress);
    };
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={true}>
        <Motion.div
          animate={{ transform: "scale(1)", opacity: [0, 1] }}
          exit={{ transform: "scale(1.05)", opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`FlowEditorBox fixed left-0 top-0 z-50 flex h-full w-full scale-[105%] flex-col bg-primary-color-90 opacity-0`}
          id="FlowEditor"
        >
          <div ref={setPlaceholder} id="sqd-placeholder" class="FlowEditor h-full w-full"></div>
          <div class="FunctionArea flex w-full gap-2 border-t-2 border-accent-color p-3">
            <Button
              level="primary"
              disabled={designer()?.isReadonly()}
              icon={<Icon.Line.Gamepad />}
              onClick={() => {
                SM?.start();
                designer()?.setIsReadonly(true);
              }}
            >
              测试运行
            </Button>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
