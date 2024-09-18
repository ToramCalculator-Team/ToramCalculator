import { Accessor, createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import "sequential-workflow-designer/css/designer.css";
import "sequential-workflow-designer/css/designer-light.css";
import "sequential-workflow-designer/css/designer-dark.css";
import {
  BranchedStep,
  Definition,
  Properties,
  PropertyValue,
  SequentialStep,
  Step,
  StepsConfiguration,
  ToolboxConfiguration,
  ValidatorConfiguration,
} from "sequential-workflow-designer";
import Button from "../ui/button";
import Input from "../ui/input";
import * as Icon from "~/lib/icon";
import * as _ from "lodash-es";
import { wrapDefinition } from "./flowEditor/WrappedDefinition";
import { useRootEditor } from "./flowEditor/RootEditorWrapper";
import { useStepEditor } from "./flowEditor/StepEditorWrapper";
import { SequentialWorkflowDesigner } from "./flowEditor/SequentialWorkflowDesigner";
import { createId } from "@paralleldrive/cuid2";

interface MathStepProperties extends Record<string, PropertyValue> {
  var: string;
  val: number;
}
interface TextStepProperties extends Record<string, PropertyValue> {
  text: string;
}

interface CustomBaseStep<P extends Properties> extends Step {
  properties: P;
}
interface CustomBranchStep<P extends Properties> extends BranchedStep {
  properties: P;
  branches: {
    true: CustomStateMachineStep[];
    false: CustomStateMachineStep[];
  };
}
interface CustomSequentialStep<P extends Properties> extends SequentialStep {
  properties: P;
  sequence: CustomStateMachineStep[];
}

type CustomStateMachineStep =
  | CustomBaseStep<TextStepProperties>
  | CustomBaseStep<MathStepProperties>
  | CustomBranchStep<MathStepProperties>
  | CustomSequentialStep<MathStepProperties>;

class Steps {
  static createMathStep(type: string, name: string, varName: string, val: number) {
    return StateMachineSteps.createTaskStep(name, type, {
      var: varName,
      val,
    });
  }

  static createTextStep(message: string) {
    return StateMachineSteps.createTaskStep(message, "text", {
      text: message,
    });
  }

  static createIfStep(
    varName: string,
    val: number,
    name: string,
    trueSteps?: CustomStateMachineStep[],
    falseSteps?: CustomStateMachineStep[],
  ) {
    return StateMachineSteps.createIfStep(
      name,
      {
        var: varName,
        val,
      },
      trueSteps ?? [],
      falseSteps ?? [],
    );
  }

  static createLoopStep(varName: string, val: number, name: string, steps?: CustomStateMachineStep[]) {
    return StateMachineSteps.createLoopStep(
      name,
      {
        var: varName,
        val,
      },
      steps ?? [],
    );
  }
}

function isTextStep(step: CustomStateMachineStep): step is CustomBaseStep<TextStepProperties> {
  let condition: boolean = true && "text" in step.properties;
  condition = step.type === "text";
  return condition;
}
function isMathStep(step: CustomStateMachineStep): step is CustomBaseStep<MathStepProperties> {
  let condition: boolean = "val" in step.properties && "var" in step.properties;
  return condition;
}
function isIfStep(step: CustomStateMachineStep): step is CustomBranchStep<MathStepProperties> {
  let condition: boolean = "branches" in step && step.type === "if";
  return condition;
}
function isLoopStep(step: CustomStateMachineStep): step is CustomSequentialStep<MathStepProperties> {
  let condition: boolean = step.type === "loop";
  return condition;
}

class StateMachineSteps {
  static createIfStep<P extends Properties>(
    name: string,
    properties: P,
    trueSteps: CustomStateMachineStep[],
    falseSteps: CustomStateMachineStep[],
  ): CustomBranchStep<P> {
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

  static createLoopStep<P extends Properties>(
    name: string,
    properties: P,
    steps: CustomStateMachineStep[],
  ): CustomSequentialStep<P> {
    return {
      id: createId(),
      componentType: "container",
      type: "loop",
      name,
      sequence: steps ?? [],
      properties,
    };
  }

  static createTaskStep<P extends Properties>(name: string, type: string, properties: P): CustomBaseStep<P> {
    return {
      id: createId(),
      componentType: "task",
      type,
      name,
      properties,
    };
  }
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
    Steps.createTextStep("start!"),
    Steps.createLoopStep("index", 4, "Loop", [
      Steps.createMathStep("add", "x += 3", "x", 3),
      Steps.createMathStep("mul", "x *= 2", "x", 2),
      Steps.createIfStep("x", 50, "If x > 50", [Steps.createTextStep("yes!")], [Steps.createTextStep("no...")]),
    ]),
    Steps.createTextStep("the end"),
  ],
};

const [StateMachineStatus, setStateMachineStatus] = createSignal();

export default function FlowEditor() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  const toolboxConfiguration: Accessor<ToolboxConfiguration> = createMemo(() => ({
    groups: [
      {
        name: "技能模块",
        steps: [
          Steps.createMathStep("add", "Add", "x", 10),
          Steps.createMathStep("sub", "Subtract", "x", 10),
          Steps.createMathStep("mul", "Multiply", "x", 10),
          Steps.createMathStep("div", "Divide", "x", 10),
          Steps.createTextStep("Message!"),
        ],
      },
      {
        name: "逻辑模块",
        steps: [Steps.createIfStep("x", 10, "If"), Steps.createLoopStep("index", 3, "Loop")],
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

  const [definition, setDefinition] = createSignal(wrapDefinition(startDefinition));
  const [isToolboxCollapsed, setIsToolboxCollapsed] = createSignal(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = createSignal(false);
  const [selectedStepId, setSelectedStepId] = createSignal<string | null>(null);
  const [isFollowingSelectedStep, setIsFollowingSelectedStep] = createSignal(false);
  const [isReadonly, setIsReadonly] = createSignal(false);

  function RootEditor() {
    const { properties, setProperty, definition, isReadonly } = useRootEditor<WorkflowDefinition>();
    return (
      <div class="RootEditor">
        <h4>状态机信息</h4>
        <p>
          <label>速度(毫秒)</label>
          <Input
            onChange={(e) => setProperty("speed", parseInt(e.target.value))}
            value={properties.speed?.toString() ?? ""}
            readOnly={isReadonly}
            type="text"
          />
        </p>
      </div>
    );
  }

  function StepEditor() {
    const { type, componentType, name, setName, properties, setProperty, definition, isReadonly } =
      useStepEditor<CustomStateMachineStep>();
    return (
      <div class="StepEditor">
        <h4>{"Step " + type}</h4>
        <p>
          <label>名称</label>
          <Input
            onInput={(e) => setName(e.target.value)}
            value={properties.name?.toString()}
            readOnly={isReadonly}
            type="text"
          />
        </p>
        <For each={["var", "val", "text"]}>
          {(key) => (
            <Show when={properties[key] !== undefined}>
              <p>
                <label>{key}</label>
                <Input
                  onInput={(e) => setProperty(key, e.target.value)}
                  value={properties[key]?.toString()}
                  readOnly={isReadonly}
                  type="text"
                />
              </p>
            </Show>
          )}
        </For>
      </div>
    );
  }

  function toggleIsReadonlyClicked() {
    setIsReadonly(!isReadonly());
  }

  function moveViewportToFirstStepClicked() {
    const fistStep = definition().value.sequence[0];
    if (fistStep) {
      setSelectedStepId(fistStep.id);
    }
  }

  function reloadDefinitionClicked() {
    const newDefinition = _.cloneDeep(startDefinition);
    setSelectedStepId(null);
    setDefinition(wrapDefinition(newDefinition));
  }

  function yesOrNo(value: boolean) {
    return value ? "✅ Yes" : "⛔ No";
  }

  const [variables, setVariables] = createSignal("");
  const [consoles, setConsoles] = createSignal("");

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
    variables: string;

    constructor(definition: typeof startDefinition) {
      this.definition = definition;
      this.data = {};
      this.consoles = consoles();
      this.variables = variables();
      this.callstack = [
        {
          sequence: this.definition.sequence,
          index: 0,
          unwind: () => {},
        },
      ];
      this.isRunning = false;
    }

    createVariableIfNeeded(varName: string) {
      if (typeof this.data[varName] === "undefined") {
        this.data[varName] = 0;
      }
    }

    unwindStack() {
      this.callstack.pop();
    }

    executeIfStep(step: CustomBranchStep<MathStepProperties>) {
      const value = this.executeIf(step);
      this.callstack.push({
        sequence: value ? step.branches.true : step.branches.false,
        index: 0,
        unwind: this.unwindStack.bind(this),
      });
    }

    executeLoopStep(step: CustomSequentialStep<MathStepProperties>) {
      this.initLoopStep(step);
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

    executeStep<S extends CustomStateMachineStep>(step: S) {
      if (isTextStep(step)) {
        setConsoles(consoles() + "\r\n" + step.properties.text);
        return;
      }
      if (isMathStep(step)) {
        const varName = step.properties.var;
        const value = step.properties.val;
        this.createVariableIfNeeded(varName);
        switch (step.type) {
          case "add":
            this.data[varName] += value;
            break;
          case "sub":
            this.data[varName] -= value;
            break;
          case "mul":
            this.data[varName] *= value;
            break;
          case "div":
            this.data[varName] /= value;
            break;
        }
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

      // StateMachineHandler.beforeStepExecution(step, this.data);

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

      this.onStepExecuted(step);
      setTimeout(this.execute.bind(this), this.definition.properties.speed);
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

    executeIf(step: CustomBranchStep<MathStepProperties>) {
      var varName = step.properties.var;
      this.createVariableIfNeeded(varName);
      return this.data[varName] > step.properties.val;
    }

    initLoopStep(step: CustomSequentialStep<MathStepProperties>) {
      const varName = step.properties.var;
      this.createVariableIfNeeded(varName);
      this.data[varName] = step.properties.val;
    }

    canReplyLoopStep(step: CustomSequentialStep<MathStepProperties>) {
      const varName = step.properties.var;
      return --this.data[varName] > 0;
    }

    onStepExecuted(step: Step) {
      setVariables(JSON.stringify(this.data, null, 2) + "\r\n");
      setSelectedStepId(step.id);
    }

    onFinished() {
      setIsReadonly(false);
    }

    onInterrupted() {
      setIsReadonly(true);
    }
  }

  const sm = new StateMachine(startDefinition);

  onMount(() => {
    sm.start();
    // esc键监听
    const handleEscapeKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("esc");
        e.stopPropagation(); // 阻止事件继续冒泡
      }
    };

    document.addEventListener("keydown", handleEscapeKeyPress);
    return () => {
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
          class={`FlowEditor fixed left-0 top-0 z-50 flex h-dvh w-dvw scale-[105%] place-items-center bg-primary-color`}
          id="FlowEditor"
        >
          <div class="w-full self-stretch">
            <SequentialWorkflowDesigner
              definition={definition()}
              onDefinitionChange={setDefinition}
              stepsConfiguration={stepsConfiguration()}
              validatorConfiguration={validatorConfiguration()}
              toolboxConfiguration={toolboxConfiguration()}
              controlBar={true}
              contextMenu={true}
              rootEditor={() => <RootEditor />}
              stepEditor={() => <StepEditor />}
              undoStackSize={10}
              isReadonly={isReadonly()}
              selectedStepId={selectedStepId()}
              onSelectedStepIdChanged={setSelectedStepId}
              isToolboxCollapsed={isToolboxCollapsed()}
              onIsToolboxCollapsedChanged={setIsToolboxCollapsed}
              isEditorCollapsed={isEditorCollapsed()}
              onIsEditorCollapsedChanged={setIsEditorCollapsed}
              isFollowingSelectedStep={isFollowingSelectedStep()}
              onIsFollowingSelectedStepChanged={setIsFollowingSelectedStep}
              keyboard={true}
              theme={store.theme === "dark" ? "dark" : "light"}
            />
          </div>
          {/* <div class="basis-1/3">
            <ul class="w-full">
              <li>已选中的步骤ID: {selectedStepId()}</li>
              <li>是否只读: {yesOrNo(isReadonly())}</li>
              <li>定义是否有效: {definition().isValid === undefined ? "?" : yesOrNo(!!definition().isValid)}</li>
            </ul>

            <div class="w-full">
              <Button onClick={() => sm.start()}>运行</Button>
              <Button onClick={reloadDefinitionClicked}>重置</Button>
              <Button onClick={() => setIsFollowingSelectedStep((value) => !value)}>切换镜头跟随状态</Button>
              <Button onClick={toggleIsReadonlyClicked}>切换只读状态</Button>
              <Button onClick={moveViewportToFirstStepClicked}>定位到第一步</Button>
              <h5>参数</h5>
              <textarea value={variables()} readOnly={true} cols={50} rows={10} />
              <h5>日志</h5>
              <textarea value={consoles()} readOnly={true} cols={50} rows={10} />
            </div>
          </div> */}
        </Motion.div>
      </Show>
    </Presence>
  );
}
