import { Accessor, createEffect, createMemo, createSignal, JSX, on, onMount, useContext } from "solid-js";
import { setLocale, inject, Theme, Themes, serialization, WorkspaceSvg, svgResize, BlocklyOptions } from "blockly/core";
import * as Zh from "blockly/msg/zh-hans";
import * as En from "blockly/msg/en";
import * as Ja from "blockly/msg/ja";
import * as ZhTw from "blockly/msg/zh-hant";
import { javascriptGenerator } from "blockly/javascript";
import "blockly/blocks";
import { SchemaBlockGenerator } from "./gameAttributeBlocks";
import { buildPlayerPipelineMetas, buildPlayerStageMetas, collectCustomPipelines, type CustomPipelineMeta } from "./blocks";
import { createBlocksRegistry } from "./blocksRegistry";
import { store } from "~/store";
import { MediaContext } from "~/lib/contexts/Media";
import { MemberType } from "@db/schema/enums";
import { PlayerAttrNestedSchema } from "../simulator/core/Member/types/Player/PlayerAttrSchema";
import { MobAttrNestedSchema } from "../simulator/core/Member/types/Mob/MobAttrSchema";
import { MemberBaseNestedSchema } from "../simulator/core/Member/MemberBaseSchema";
import defaultData from "~/components/features/logicEditor/defaultData.json";

interface LogicEditorProps extends JSX.InputHTMLAttributes<HTMLDivElement> {
  data: unknown;
  /** 逻辑执行者的类型（Player 或 Mob） */
  memberType: MemberType;
  setData: (data: unknown) => void;
  code?: Accessor<string>;
  setCode?: (code: string) => void;
  state: unknown;
  // 仅展示模式：禁用所有编辑能力（无工具箱、不可拖拽/连线/删除）
  readOnly?: boolean;
}

export function LogicEditor(props: LogicEditorProps) {
  const media = useContext(MediaContext);
  const [ref, setRef] = createSignal<HTMLDivElement>();

  // 1.角色属性积木
  const selfSchema = createMemo(() => {
    // 积木生成仅依赖静态属性结构，无需具体成员数据
    switch (props.memberType) {
      case "Player":
        return PlayerAttrNestedSchema;
      case "Mob":
        return MobAttrNestedSchema;
      default:
        return MemberBaseNestedSchema;
    }
  });
  // 目标属性统一使用基础 schema
  const targetSchema = MemberBaseNestedSchema;
  // 初始化 Schema 积木生成器
  const schemaBlockGenerator = new SchemaBlockGenerator(selfSchema(), targetSchema);

  // 2.管线/阶段元数据与积木注册集中入口
  const pipelineMetasRaw = buildPlayerPipelineMetas();
  const stageMetasRaw = buildPlayerStageMetas();
  const parseCustomPipelines = (): CustomPipelineMeta[] => {
    const data = props.data as any;
    const cps = data?.customPipelines;
    if (!Array.isArray(cps)) return [];
    return cps
      .filter((cp) => typeof cp?.name === "string" && Array.isArray(cp?.stages))
      .map((cp) => ({
        name: cp.name as string,
        stages: cp.stages as string[],
        category: cp.category ?? "custom",
        desc: cp.desc,
        displayName: cp.displayName,
      }));
  };
  const blocksRegistry = createBlocksRegistry({
    builtinPipelineMetas: pipelineMetasRaw,
    builtinStageMetas: stageMetasRaw,
    initialCustomPipelines: parseCustomPipelines(),
  });

  // 读取 Tailwind 类实际颜色，便于与系统主题一致
  const resolveColorFromClass = (
    container: HTMLElement,
    className: string,
    property: "background-color" | "color" = "background-color",
  ): string => {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.className = className;
    container.appendChild(probe);
    const color = getComputedStyle(probe).getPropertyValue(property) || "";
    container.removeChild(probe);
    return color || "";
  };

  const createToramTheme = (container: HTMLElement) => {
    // 基础配色从应用类名读取，若获取失败则回退
    const workspaceBg = resolveColorFromClass(container, "bg-area-color") || "#1e1e1e";
    const toolboxBg = resolveColorFromClass(container, "bg-accent-color") || "#161616";
    const toolboxFg = resolveColorFromClass(container, "text-primary-color", "color") || "#ffffff";
    const flyoutBg = resolveColorFromClass(container, "bg-primary-color") || "#202020";
    const flyoutFg = resolveColorFromClass(container, "text-primary-color", "color") || "#cccccc";
    const scrollbarColor = resolveColorFromClass(container, "bg-dividing-color") || "#7f7f7f";
    const cursorColor = resolveColorFromClass(container, "text-accent-color", "color") || "#d0d0d0";
    const brand1 = resolveColorFromClass(container, "bg-brand-color-1st") || "#16a34a";

    return Theme.defineTheme("toram", {
      base: Themes.Zelos,
      componentStyles: {
        workspaceBackgroundColour: workspaceBg,
        toolboxBackgroundColour: toolboxBg,
        toolboxForegroundColour: toolboxFg,
        flyoutBackgroundColour: flyoutBg,
        flyoutForegroundColour: flyoutFg,
        flyoutOpacity: 0.9,
        scrollbarColour: scrollbarColor,
        scrollbarOpacity: 0.5,
        insertionMarkerColour: brand1,
        insertionMarkerOpacity: 0.4,
        cursorColour: cursorColor,
      },
      fontStyle: {
        family: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
    "Noto Color Emoji", "Noto Color Emoji"`,
        weight: "400",
        size: 11,
      },
      name: "toram",
    });
  };

  const { default: _d, ...location } = {
    "zh-CN": Zh,
    "zh-TW": ZhTw,
    ja: Ja,
    en: En,
  }[store.settings.userInterface.language];

  createEffect(
    on(
      () => props.state,
      () => {
        const div = ref();
        if (!div || !document.body.contains(div)) return;
        const toolbox = {
          kind: "categoryToolbox",
          contents: [
            {
              kind: "category",
              name: "逻辑",
              categorystyle: "logic_category",
              contents: [
                {
                  type: "controls_if",
                  kind: "block",
                },
                {
                  type: "logic_compare",
                  kind: "block",
                  fields: {
                    OP: "EQ",
                  },
                },
                {
                  type: "logic_operation",
                  kind: "block",
                  fields: {
                    OP: "AND",
                  },
                },
                {
                  type: "logic_negate",
                  kind: "block",
                },
                {
                  type: "logic_boolean",
                  kind: "block",
                  fields: {
                    BOOL: "TRUE",
                  },
                },
                {
                  type: "logic_null",
                  kind: "block",
                  enabled: false,
                },
                {
                  type: "logic_ternary",
                  kind: "block",
                },
              ],
            },
            {
              kind: "category",
              name: "循环",
              categorystyle: "loop_category",
              contents: [
                {
                  type: "controls_repeat_ext",
                  kind: "block",
                  inputs: {
                    TIMES: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 10,
                        },
                      },
                    },
                  },
                },
                {
                  type: "controls_repeat",
                  kind: "block",
                  enabled: false,
                  fields: {
                    TIMES: 10,
                  },
                },
                {
                  type: "controls_whileUntil",
                  kind: "block",
                  fields: {
                    MODE: "WHILE",
                  },
                },
                {
                  type: "controls_for",
                  kind: "block",
                  fields: {
                    VAR: {
                      name: "i",
                    },
                  },
                  inputs: {
                    FROM: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                    TO: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 10,
                        },
                      },
                    },
                    BY: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                  },
                },
                {
                  type: "controls_forEach",
                  kind: "block",
                  fields: {
                    VAR: {
                      name: "j",
                    },
                  },
                },
                {
                  type: "controls_flow_statements",
                  kind: "block",
                  enabled: false,
                  fields: {
                    FLOW: "BREAK",
                  },
                },
              ],
            },
            {
              kind: "category",
              name: "数学",
              categorystyle: "math_category",
              contents: [
                {
                  type: "math_number",
                  kind: "block",
                  fields: {
                    NUM: 123,
                  },
                },
                {
                  type: "math_arithmetic",
                  kind: "block",
                  fields: {
                    OP: "ADD",
                  },
                  inputs: {
                    A: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                    B: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_single",
                  kind: "block",
                  fields: {
                    OP: "ROOT",
                  },
                  inputs: {
                    NUM: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 9,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_trig",
                  kind: "block",
                  fields: {
                    OP: "SIN",
                  },
                  inputs: {
                    NUM: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 45,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_constant",
                  kind: "block",
                  fields: {
                    CONSTANT: "PI",
                  },
                },
                {
                  type: "math_number_property",
                  kind: "block",
                  fields: {
                    PROPERTY: "EVEN",
                  },
                  inputs: {
                    NUMBER_TO_CHECK: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 0,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_round",
                  kind: "block",
                  fields: {
                    OP: "ROUND",
                  },
                  inputs: {
                    NUM: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 3.1,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_on_list",
                  kind: "block",
                  fields: {
                    OP: "SUM",
                  },
                },
                {
                  type: "math_modulo",
                  kind: "block",
                  inputs: {
                    DIVIDEND: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 64,
                        },
                      },
                    },
                    DIVISOR: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 10,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_constrain",
                  kind: "block",
                  inputs: {
                    VALUE: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 50,
                        },
                      },
                    },
                    LOW: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                    HIGH: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 100,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_random_int",
                  kind: "block",
                  inputs: {
                    FROM: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                    TO: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 100,
                        },
                      },
                    },
                  },
                },
                {
                  type: "math_random_float",
                  kind: "block",
                },
                {
                  type: "math_atan2",
                  kind: "block",
                  inputs: {
                    X: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                    Y: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 1,
                        },
                      },
                    },
                  },
                },
              ],
            },
            {
              kind: "category",
              name: "文本",
              categorystyle: "text_category",
              contents: [
                {
                  type: "text",
                  kind: "block",
                  fields: {
                    TEXT: "",
                  },
                },
                {
                  type: "text_join",
                  kind: "block",
                },
                {
                  type: "text_length",
                  kind: "block",
                  inputs: {
                    VALUE: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "abc",
                        },
                      },
                    },
                  },
                },
                {
                  type: "text_isEmpty",
                  kind: "block",
                  inputs: {
                    VALUE: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                  },
                },
              ],
            },
            {
              kind: "category",
              name: "列表",
              categorystyle: "list_category",
              contents: [
                {
                  type: "lists_create_with",
                  kind: "block",
                },
                {
                  type: "lists_create_with",
                  kind: "block",
                },
                {
                  type: "lists_repeat",
                  kind: "block",
                  inputs: {
                    NUM: {
                      shadow: {
                        type: "math_number",
                        fields: {
                          NUM: 5,
                        },
                      },
                    },
                  },
                },
                {
                  type: "lists_length",
                  kind: "block",
                },
                {
                  type: "lists_isEmpty",
                  kind: "block",
                },
                {
                  type: "lists_indexOf",
                  kind: "block",
                  fields: {
                    END: "FIRST",
                  },
                  inputs: {
                    VALUE: {
                      block: {
                        type: "variables_get",
                        fields: {
                          VAR: {
                            name: "list",
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: "lists_getIndex",
                  kind: "block",
                  fields: {
                    MODE: "GET",
                    WHERE: "FROM_START",
                  },
                  inputs: {
                    VALUE: {
                      block: {
                        type: "variables_get",
                        fields: {
                          VAR: {
                            name: "list",
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: "lists_setIndex",
                  kind: "block",
                  fields: {
                    MODE: "SET",
                    WHERE: "FROM_START",
                  },
                  inputs: {
                    LIST: {
                      block: {
                        type: "variables_get",
                        fields: {
                          VAR: {
                            name: "list",
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: "lists_getSublist",
                  kind: "block",
                  fields: {
                    WHERE1: "FROM_START",
                    WHERE2: "FROM_START",
                  },
                  inputs: {
                    LIST: {
                      block: {
                        type: "variables_get",
                        fields: {
                          VAR: {
                            name: "list",
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: "lists_split",
                  kind: "block",
                  fields: {
                    MODE: "SPLIT",
                  },
                  inputs: {
                    DELIM: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: ",",
                        },
                      },
                    },
                  },
                },
                {
                  type: "lists_sort",
                  kind: "block",
                  fields: {
                    TYPE: "NUMERIC",
                    DIRECTION: "1",
                  },
                },
                {
                  type: "lists_reverse",
                  kind: "block",
                },
              ],
            },
            ...blocksRegistry.buildEngineCategories(),
            {
              kind: "category",
              name: "成员属性",
              categorystyle: "variable_category",
              contents: [
                // 自身属性读取积木
                {
                  type: "self_attribute_get",
                  kind: "block",
                },
                // 自身属性百分比修改积木
                {
                  type: "self_attribute_percentage",
                  kind: "block",
                },
                // 自身属性固定值修改积木
                {
                  type: "self_attribute_fixed",
                  kind: "block",
                },
                // 目标属性读取积木
                {
                  type: "target_attribute_get",
                  kind: "block",
                },
                // 目标属性百分比修改积木
                {
                  type: "target_attribute_percentage",
                  kind: "block",
                },
                // 目标属性固定值修改积木
                {
                  type: "target_attribute_fixed",
                  kind: "block",
                },
              ],
            },
            {
              kind: "category",
              name: "自定义变量",
              custom: "VARIABLE",
              categorystyle: "variable_category",
            },
            {
              kind: "category",
              name: "函数",
              custom: "PROCEDURE",
              categorystyle: "procedure_category",
            },
          ],
        };
        setLocale(location);
        const isReadOnly = !!props.readOnly;
        const injectionOptions: BlocklyOptions = {
          horizontalLayout: media.orientation === "portrait",
          renderer: "Zelos",
          toolboxPosition: media.orientation === "landscape" ? "start" : "end",
          theme: createToramTheme(div),
          toolbox,
          readOnly: isReadOnly,

          move: {
            scrollbars: true,
            drag: true,
            // wheel: true,
          },
          grid: {
            spacing: 25,
            length: 3,
            colour: "#ccc",
            snap: true,
          },
        };

        const workerSpace = inject(div, injectionOptions);
        serialization.workspaces.load(props.data ?? defaultData, workerSpace);
        workerSpace.addChangeListener(() => {
          // 仅从 start_skill 入口生成代码；若无入口则回退全量
          javascriptGenerator.init(workerSpace);
          const startBlocks = workerSpace.getBlocksByType("start_skill", false);
          let codeBody = "";
          const parts: string[] = [];
          const emitCode = (blk: any) => {
            const gen = javascriptGenerator.blockToCode(blk);
            if (Array.isArray(gen)) {
              if (gen[0]) parts.push(gen[0]);
            } else if (gen) {
              parts.push(gen as string);
            }
          };

          if (startBlocks && startBlocks.length > 0) {
            startBlocks.forEach(emitCode);
            // 追加其他未挂载到 start_skill 的顶层语句块，避免遗漏
            const topBlocks = workerSpace
              .getTopBlocks(true)
              .filter((b) => b.type !== "start_skill" && !b.getParent());
            topBlocks.forEach(emitCode);
            codeBody = parts.join("\n");
          } else {
            codeBody = javascriptGenerator.workspaceToCode(workerSpace);
          }

          const code = javascriptGenerator.finish(codeBody);

          // 从生成的代码里提取 skill_config 片段（约定：/*skill_config*/({ ... });）
          let skillLogicConfig: any = null;
          const configMatch = code.match(/\/\*skill_config\*\/\s*\((\{[\s\S]*?\})\);/);
          if (configMatch && configMatch[1]) {
            try {
              skillLogicConfig = JSON.parse(configMatch[1]);
            } catch {
              // ignore
            }
          }

          const saved = serialization.workspaces.save(workerSpace) as any;
          const custom = collectCustomPipelines(workerSpace);
          blocksRegistry.updateCustomPipelines(custom);
          saved.customPipelines = custom;
          if (skillLogicConfig) saved.skillLogicConfig = skillLogicConfig;
          props.setCode?.(code);
          props.setData(saved);
        });
        workerSpace.scrollCenter();
      },
    ),
  );

  return <div id="blocklyDiv" ref={setRef} class={props.class ? ` ` + " " + props.class : `h-full min-h-24 w-full`} />;
}
