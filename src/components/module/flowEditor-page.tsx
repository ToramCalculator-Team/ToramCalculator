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
  Designer,
  DesignerConfiguration,
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
import { useSequentialWorkflowDesignerController } from "./flowEditor/SequentialWorkflowDesignerController";

function uid() {
  return Math.ceil(Math.random() * 10 ** 16).toString(16);
}

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

class StateMachine {
  definition: typeof startDefinition;
  speed: number;
  handler: StateMachineHandler;
  data: { [key: string]: number };
  callstack: {
    sequence: CustomStateMachineStep[];
    index: number;
    unwind: () => void;
  }[];
  isRunning: boolean;
  isInterrupted = false;
  consoleArea: HTMLPreElement;
  variablesArea: HTMLPreElement;

  constructor(
    definition: typeof startDefinition,
    speed: number,
    { consoleArea, variablesArea }: { consoleArea: HTMLPreElement; variablesArea: HTMLPreElement },
    handler: StateMachineHandler,
  ) {
    this.definition = definition;
    this.speed = speed;
    this.handler = handler;
    this.data = {};
    this.consoleArea = consoleArea;
    this.variablesArea = variablesArea;
    this.callstack = [
      {
        sequence: this.definition.sequence,
        index: 0,
        unwind: () => {},
      },
    ];
    this.isRunning = false;
    console.log(_.cloneDeep(this.callstack));
  }

  executeStep<S extends CustomStateMachineStep>(consoleArea: HTMLPreElement, step: S) {
    StateMachineHandler.executeStep(consoleArea, step, this.data);
  }

  unwindStack() {
    this.callstack.pop();
  }

  executeIfStep(step: CustomBranchStep<MathStepProperties>) {
    const value = StateMachineHandler.executeIf(step, this.data);
    this.callstack.push({
      sequence: value ? step.branches.true : step.branches.false,
      index: 0,
      unwind: this.unwindStack.bind(this),
    });
  }

  executeLoopStep(step: CustomSequentialStep<MathStepProperties>) {
    StateMachineHandler.initLoopStep(step, this.data);
    const program = {
      sequence: step.sequence,
      index: 0,
      unwind: () => {
        if (StateMachineHandler.canReplyLoopStep(step, this.data)) {
          program.index = 0;
        } else {
          this.unwindStack();
        }
      },
    };
    this.callstack.push(program);
  }

  execute(designer: Designer) {
    if (this.isInterrupted) {
      StateMachineHandler.onInterrupted(designer);
      return;
    }

    const depth = this.callstack.length - 1;
    const program = this.callstack[depth];
    if (program.sequence.length === program.index) {
      if (depth > 0) {
        program.unwind();
        this.execute(designer);
      } else {
        this.isRunning = false;
        StateMachineHandler.onFinished(designer);
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
        this.executeStep(this.consoleArea, step);
        break;
    }

    StateMachineHandler.onStepExecuted(designer, this.variablesArea, step, this.data);
    setTimeout(this.execute.bind(this), this.speed);
  }

  start(designer: Designer) {
    if (this.isRunning) {
      throw new Error("Already running");
    }
    this.isRunning = true;
    this.callstack[0].index = 0;
    this.execute(designer);
  }

  interrupt() {
    if (!this.isRunning) {
      throw new Error("Not running");
    }
    this.isInterrupted = true;
  }
}

class StateMachineSteps {
  static createIfStep<P extends Properties, TS extends CustomStateMachineStep, FS extends CustomStateMachineStep>(
    name: string,
    properties: P,
    trueSteps: TS[],
    falseSteps: FS[],
  ): CustomBranchStep<P> {
    return {
      id: uid(),
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
      id: uid(),
      componentType: "container",
      type: "loop",
      name,
      sequence: steps ?? [],
      properties,
    };
  }

  static createTaskStep<P extends Properties>(name: string, type: string, properties: P): CustomBaseStep<P> {
    return {
      id: uid(),
      componentType: "task",
      type,
      name,
      properties,
    };
  }
}

class StateMachineHandler {
  static executeStep<S extends CustomStateMachineStep>(
    consoleArea: HTMLPreElement,
    step: S,
    data: { [key: string]: number },
  ) {
    if (isTextStep(step)) {
      consoleArea.innerText += step.properties.text + "\r\n";
      return;
    }
    if (isMathStep(step)) {
      const varName = step.properties.var;
      const value = step.properties.val;
      createVariableIfNeeded(varName, data);
      switch (step.type) {
        case "add":
          data[varName] += value;
          break;
        case "sub":
          data[varName] -= value;
          break;
        case "mul":
          data[varName] *= value;
          break;
        case "div":
          data[varName] /= value;
          break;
      }
    }
  }

  static executeIf(step: CustomBranchStep<MathStepProperties>, data: { [key: string]: number }) {
    var varName = step.properties.var;
    createVariableIfNeeded(varName, data);
    return data[varName] > step.properties.val;
  }

  static initLoopStep(step: CustomSequentialStep<MathStepProperties>, data: { [key: string]: number }) {
    const varName = step.properties.var;
    createVariableIfNeeded(varName, data);
    data[varName] = step.properties.val;
  }

  static canReplyLoopStep(step: CustomSequentialStep<MathStepProperties>, data: { [key: string]: number }) {
    const varName = step.properties["var"];
    return --data[varName] >= 0;
  }

  static onStepExecuted(
    designer: Designer,
    variablesArea: HTMLPreElement,
    step: Step,
    data: { [key: string]: number },
  ) {
    variablesArea.innerText = JSON.stringify(data, null, 2) + "\r\n";
    designer.selectStepById(step.id);
    designer.moveViewportToStep(step.id);
  }

  static onFinished(designer: Designer) {
    designer.setIsReadonly(false);
  }

  static onInterrupted(designer: Designer) {
    designer.setIsReadonly(false);
  }
}

function createVariableIfNeeded(varName: string, data: { [key: string]: number }) {
  if (typeof data[varName] === "undefined") {
    data[varName] = 0;
  }
}

interface WorkflowDefinition extends Definition {
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

export default function FlowEditor() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  const controller = useSequentialWorkflowDesignerController();
	const [definition, setDefinition] = createSignal(wrapDefinition(startDefinition));
  const [isVisible, setIsVisible] = createSignal(true);
	const [isToolboxCollapsed, setIsToolboxCollapsed] = createSignal(false);
	const [isEditorCollapsed, setIsEditorCollapsed] = createSignal(false);
	const [selectedStepId, setSelectedStepId] = createSignal<string | null>(null);
	const [isReadonly, setIsReadonly] = createSignal(false);
	const [moveViewportToStep, setMoveViewportToStep] = createSignal<string | null>(null);
	const definitionJson = JSON.stringify(definition(), null, 2);
  const toolboxConfiguration: Accessor<ToolboxConfiguration> = createMemo(() => ({
    groups: [
      {
        name: "Tasks",
        steps: [
          Steps.createMathStep("add", "Add", "x", 10),
          Steps.createMathStep("sub", "Subtract", "x", 10),
          Steps.createMathStep("mul", "Multiply", "x", 10),
          Steps.createMathStep("div", "Divide", "x", 10),
          Steps.createTextStep("Message!"),
        ],
      },
      {
        name: "Logic",
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

  function RootEditor() {
    const { properties, setProperty, definition, isReadonly } = useRootEditor<WorkflowDefinition>();
    onMount(() => {
      console.log("RootEditor", properties, setProperty, definition, isReadonly);
    })
    return (
      <div class="RootEditor">
        <h4>状态机信息</h4>
        <p>
          <label>速度(毫秒)</label>
          <Input
            onInput={(e) => setProperty("speed", e.target.value)}
            value={properties.speed?.toString() ?? ""}
            readOnly={isReadonly}
            type="text"
          />
        </p>
      </div>
    );
  }

  function StepEditor() {
    const { type, componentType, name, setName, properties, setProperty, definition, isReadonly } = useStepEditor<CustomStateMachineStep>();
    onMount(() => {
      console.log("StepEditor", type, componentType, name, setName, properties, setProperty, definition, isReadonly);
    })
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

  onMount(() => {
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

  debugger;

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
          <div class="h-full w-full">
            <SequentialWorkflowDesigner
              definition={definition()}
              onDefinitionChange={setDefinition}
              stepsConfiguration={stepsConfiguration()}
              validatorConfiguration={validatorConfiguration()}
              toolboxConfiguration={toolboxConfiguration()}
              controlBar={true}
              contextMenu={true}
              rootEditor={<RootEditor />}
              stepEditor={<StepEditor />}
            ></SequentialWorkflowDesigner>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
