import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  onMount,
  useContext,
} from "solid-js";
import {
  setLocale,
  inject,
  Theme,
  Themes,
  serialization,
  WorkspaceSvg,
  svgResize,
} from "blockly/core";
import * as Zh from "blockly/msg/zh-hans";
import * as En from "blockly/msg/en";
import * as Ja from "blockly/msg/ja";
import * as ZhTw from "blockly/msg/zh-hant";
import { javascriptGenerator } from "blockly/javascript";
import "blockly/blocks";
import { SchemaBlockGenerator } from "./gameAttributeBlocks";
import {
  PipelineBlockGenerator,
  StageBlockGenerator,
  buildPlayerPipelineMetas,
  buildPlayerStageMetas,
  makePipelineBlockId,
  makeStageBlockId,
  createSchedulePipelineBlock,
} from "./pipelineBlocks";
import { store } from "~/store";
import { MediaContext } from "~/lib/contexts/Media";
import { MemberType } from "@db/schema/enums";
import { PlayerAttrNestedSchema } from "../simulator/core/Member/types/Player/PlayerAttrSchema";
import { MobAttrNestedSchema } from "../simulator/core/Member/types/Mob/MobAttrSchema";
import { MemberBaseNestedSchema } from "../simulator/core/Member/MemberBaseSchema";

// class CustomCategory extends ToolboxCategory {
//   /**
//    * Constructor for a custom category.
//    * @override
//    */
//   constructor(categoryDef, toolbox, opt_parent) {
//     super(categoryDef, toolbox, opt_parent);
//   }
// }

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

  // ---------- 根据 memberType 生成对应的 schema ----------
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

  // ---------- 基于当前管线与阶段定义生成相关积木（组件挂载期间只执行一次） ----------
  const pipelineMetasRaw = buildPlayerPipelineMetas();
  const pipelineMetas = Array.from(new Map(pipelineMetasRaw.map((m) => [m.name, m])).values());
  // 注册管线调用积木
  const _pipelineBlockGenerator = new PipelineBlockGenerator(pipelineMetas);

  const stageMetasRaw = buildPlayerStageMetas();
  const stageMetas = Array.from(new Map(stageMetasRaw.map((m) => [m.name, m])).values());
  // 注册阶段调用积木
  const _stageBlockGenerator = new StageBlockGenerator(stageMetas);
  // 注册 schedulePipeline 积木
  const schedulePipelineBlockId = createSchedulePipelineBlock();

  // 使用内置方法进行初始居中（不做额外偏差计算）
  const centerInitialView = (ws: WorkspaceSvg) => {
    if (!ws) return;
    try {
      const blocks = ws.getTopBlocks(false);
      svgResize(ws);
      if (blocks && blocks.length > 0) {
        ws.centerOnBlock(blocks[0].id);
        return;
      }
      if (typeof ws.scrollCenter === "function") {
        ws.scrollCenter();
      }
    } catch {
      // ignore
    }
  };

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
        family:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
        weight: "500",
        size: 12,
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

  onMount(() => {
  });

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
            {
              kind: "category",
              name: "阶段模板",
              categorystyle: "math_category",
              contents: pipelineMetas
                .filter((m) => m.category === "skill")
                .map((m) => ({
                  type: makePipelineBlockId(m.name),
                  kind: "block" as const,
                })),
            },
            {
              kind: "category",
              name: "基础节点",
              categorystyle: "logic_category",
              contents: [
                ...stageMetas.map((m) => ({
                  type: makeStageBlockId(m.name),
                  kind: "block" as const,
                })),
                {
                  type: schedulePipelineBlockId,
                  kind: "block" as const,
                },
              ],
            },
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
        const injectionOptions: any = {
          horizontalLayout: media.orientation === "portrait",
          // renderer: "geras",
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
        // 初始化 Schema 积木生成器
        // 创建积木生成器并注册积木（使用从 memberType/memberData 计算出的 schema）
        const schemaBlockGenerator = new SchemaBlockGenerator(selfSchema(), targetSchema);
        // console.log("✅ Schema 积木已生成:", schemaBlockGenerator.getBlockIds());
        
        let workerSpace = inject(div, injectionOptions);
        const data = props.data;
        serialization.workspaces.load(data ?? {}, workerSpace);
        workerSpace.addChangeListener(() => {
          props.setCode?.(javascriptGenerator.workspaceToCode(workerSpace))
          props.setData(serialization.workspaces.save(workerSpace));
        });
        
        // registry.register(registry.Type.TOOLBOX_ITEM, ToolboxCategory.registrationName, CustomCategory, true);

        // 使用内置方法进行初始居中（双 rAF 确保度量稳定）
        requestAnimationFrame(() => requestAnimationFrame(() => centerInitialView(workerSpace)));
      },
    ),
  );

  return <div id="blocklyDiv" ref={setRef} class={props.class ? ` ` + " " + props.class : `h-full w-full min-h-24`} />;
}
