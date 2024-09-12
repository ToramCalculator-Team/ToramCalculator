import { createEffect, createSignal, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import "sequential-workflow-designer/css/designer.css";
import "sequential-workflow-designer/css/designer-light.css";
import "sequential-workflow-designer/css/designer-dark.css";
import { Designer } from "sequential-workflow-designer";
import Button from "../ui/button";
import Input from "../ui/input";

export default function FlowEditor() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));
  let placeholder: HTMLDivElement;
  let designer;

  function uid() {
    return Math.ceil(Math.random() * 10 ** 16).toString(16);
  }

  class Steps {
    static createMathStep(type, name, varName, val) {
      return StateMachineSteps.createTaskStep(name, type, {
        var: varName,
        val,
      });
    }

    static createTextStep(message) {
      return StateMachineSteps.createTaskStep(message, "text", {
        text: message,
      });
    }

    static createIfStep(varName, val, name, trueSteps, falseSteps) {
      return StateMachineSteps.createIfStep(
        name,
        {
          var: varName,
          val,
        },
        trueSteps,
        falseSteps,
      );
    }

    static createLoopStep(varName, val, name, steps) {
      return StateMachineSteps.createLoopStep(
        name,
        {
          var: varName,
          val,
        },
        steps,
      );
    }
  }

  class StateMachine {
    isInterrupted = false;

    constructor(definition, speed, handler) {
      this.definition = definition;
      this.speed = speed;
      this.handler = handler;
      this.data = {};
      this.callstack = [
        {
          sequence: this.definition.sequence,
          index: 0,
          unwind: null,
        },
      ];
      this.isRunning = false;
    }

    executeStep(step) {
      this.handler.executeStep(step, this.data);
    }

    unwindStack() {
      this.callstack.pop();
    }

    executeIfStep(step) {
      const value = this.handler.executeIf(step, this.data);
      const branchName = value ? "true" : "false";

      this.callstack.push({
        sequence: step.branches[branchName],
        index: 0,
        unwind: this.unwindStack.bind(this),
      });
    }

    executeLoopStep(step) {
      this.handler.initLoopStep(step, this.data);

      const program = {
        sequence: step.sequence,
        index: 0,
        unwind: () => {
          if (this.handler.canReplyLoopStep(step, this.data)) {
            program.index = 0;
          } else {
            this.unwindStack();
          }
        },
      };
      this.callstack.push(program);
    }

    execute() {
      if (this.isInterrupted) {
        this.handler.onInterrupted();
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
          this.handler?.onFinished(this.data);
        }
        return;
      }

      const step = program.sequence[program.index];
      program.index++;

      if (this.handler.beforeStepExecution) {
        this.handler.beforeStepExecution(step, this.data);
      }

      switch (step.type) {
        case "if":
          this.executeIfStep(step);
          break;
        case "loop":
          this.executeLoopStep(step);
          break;
        default:
          this.executeStep(step);
          break;
      }

      if (this.handler.onStepExecuted) {
        this.handler.onStepExecuted(step, this.data);
      }
      setTimeout(this.execute.bind(this), this.speed);
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
  }

  class StateMachineSteps {
    static createIfStep(name, properties, trueSteps, falseSteps) {
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

    static createLoopStep(name, properties, steps) {
      return {
        id: uid(),
        componentType: "container",
        type: "loop",
        name,
        sequence: steps || [],
        properties,
      };
    }

    static createTaskStep(name, type, properties) {
      return {
        id: uid(),
        componentType: "task",
        type,
        name,
        properties,
      };
    }
  }

  function createVariableIfNeeded(varName, data) {
    if (typeof data[varName] === "undefined") {
      data[varName] = 0;
    }
  }

  function onRunClicked(designer) {
    console.log(designer);
    if (designer.isReadonly()) {
      return;
    }
    if (!designer.isValid()) {
      window.alert("The definition is invalid");
      return;
    }

    designer.setIsReadonly(true);

    const definition = designer.getDefinition();
    const sm = new StateMachine(definition, definition.properties["speed"], {
      executeStep: (step, data) => {
        if (step.type === "text") {
          document.getElementById("console").innerText += step.properties["text"] + "\r\n";
          return;
        }

        const varName = step.properties["var"];
        const value = step.properties["val"];
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
      },

      executeIf: (step, data) => {
        var varName = step.properties["var"];
        createVariableIfNeeded(varName, data);
        return data[varName] > step.properties["val"];
      },

      initLoopStep: (step, data) => {
        const varName = step.properties["var"];
        createVariableIfNeeded(varName, data);
        data[varName] = step.properties["val"];
      },

      canReplyLoopStep: (step, data) => {
        const varName = step.properties["var"];
        return --data[varName] >= 0;
      },

      onStepExecuted: (step, data) => {
        document.getElementById("variables").innerText = JSON.stringify(data, null, 2) + "\r\n";
        designer.selectStepById(step.id);
        designer.moveViewportToStep(step.id);
      },

      onFinished: () => {
        designer.setIsReadonly(false);
      },
    });
    sm.start();
  }

  function appendTitle(parent, text) {
    const title = document.createElement("h4");
    title.innerText = text;
    parent.appendChild(title);
  }

  function appendTextField(
    parent: HTMLDivElement,
    label: string,
    isReadonly: boolean,
    startValue: string,
    set: (value: string) => void,
  ) {
    const field = (
      <p>
        <label>{label}</label>
        <Input
          onInput={(e) => set((e.target as HTMLInputElement).value)}
          value={startValue}
          readOnly={isReadonly}
          type="text"
        />
      </p>
    );
    parent.appendChild(field);
  }

  function rootEditorProvider(definition, editorContext, isReadonly) {
    const container = document.createElement("span");
    appendTitle(container, "State machine config");
    appendTextField(container, "Speed (ms)", isReadonly, definition.properties["speed"], (v) => {
      definition.properties["speed"] = parseInt(v, 10);
      editorContext.notifyPropertiesChanged();
    });
    return container;
  }

  function stepEditorProvider(step, editorContext, _definition, isReadonly) {
    const container = document.createElement("div");
    appendTitle(container, "Step " + step.type);

    appendTextField(container, "Name", isReadonly, step.name, (v) => {
      step.name = v;
      editorContext.notifyNameChanged();
    });
    if (step.properties["var"] !== undefined) {
      appendTextField(container, "Variable", isReadonly, step.properties["var"], (v) => {
        step.properties["var"] = v;
        editorContext.notifyPropertiesChanged();
      });
    }
    if (step.properties["val"]) {
      appendTextField(container, "Value", isReadonly, step.properties["val"], (v) => {
        step.properties["val"] = parseInt(v, 10);
        editorContext.notifyPropertiesChanged();
      });
    }
    if (step.properties["text"]) {
      appendTextField(container, "Text", isReadonly, step.properties["text"], (v) => {
        step.properties["text"] = v;
        editorContext.notifyPropertiesChanged();
      });
    }
    return container;
  }

  const configuration = {
    undoStackSize: 5,

    toolbox: {
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
    },

    steps: {
      iconUrlProvider: (componentType, type) => {
        const supportedIcons = ["if", "loop", "text"];
        const fileName = supportedIcons.includes(type) ? type : "task";
        return `./assets/icon-${fileName}.svg`;
      },
    },

    validator: {
      step: (step) => {
        return Object.keys(step.properties).every((n) => !!step.properties[n]);
      },
      root: (definition) => {
        return definition.properties["speed"] > 0;
      },
    },

    editors: {
      rootEditorProvider,
      stepEditorProvider,
    },

    controlBar: true,
  };

  const Definition = {
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

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  onMount(() => {
    designer = Designer.create(placeholder, Definition, configuration);
    designer.onDefinitionChanged.subscribe((newDefinition) => {
      // ...
    });

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
          <div ref={placeholder!} class="h-full w-full"></div>
          <div id="result" class="flex basis-1/4 flex-col">
            <p>
              <Button id="run" onClick={() => onRunClicked(designer)}>
                Run 🚀
              </Button>
            </p>

            <h5>Variables</h5>

            <pre id="variables"></pre>

            <h5>Console</h5>

            <pre id="console"></pre>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
