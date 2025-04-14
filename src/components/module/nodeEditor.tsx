import { createEffect, createMemo, createSignal, JSX, on, onCleanup, onMount, useContext } from "solid-js";
import { setLocale, inject, Theme, Themes, ToolboxCategory, registry, serialization, WorkspaceSvg } from "blockly/core";
import * as Zh from "blockly/msg/zh-hans";
import * as En from "blockly/msg/en";
import * as Ja from "blockly/msg/ja";
import * as ZhTw from "blockly/msg/zh-hant";
import { javascriptGenerator } from "blockly/javascript";
import "blockly/blocks";
import { store } from "~/store";
import { MediaContext } from "~/contexts/Media";

// class CustomCategory extends ToolboxCategory {
//   /**
//    * Constructor for a custom category.
//    * @override
//    */
//   constructor(categoryDef, toolbox, opt_parent) {
//     super(categoryDef, toolbox, opt_parent);
//   }
// }

interface NodeEditorProps extends JSX.InputHTMLAttributes<HTMLDivElement> {
  data: unknown;
  setData: (data: unknown) => void;
  state: unknown;
}

export default function NodeEditor(props: NodeEditorProps) {
  const media = useContext(MediaContext);
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [code, setCode] = createSignal("");
  const [workerSpaceState, setWorkerSpaceState] = createSignal<Record<string, any>>({});
  const [workerSpace, setWorkerSpace] = createSignal<WorkspaceSvg>();

  const { default: _d, ...location } = {
    "zh-CN": Zh,
    "zh-TW": ZhTw,
    ja: Ja,
    en: En,
  }[store.settings.language];

  onMount(() => {
    // debugger
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
              name: "Logic",
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
              name: "Loops",
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
              name: "Math",
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
              name: "Text",
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
                // {
                //   type: "text_append",
                //   kind: "block",
                //   fields: {
                //     name: "item",
                //   },
                //   inputs: {
                //     TEXT: {
                //       shadow: {
                //         type: "text",
                //         fields: {
                //           TEXT: "",
                //         },
                //       },
                //     },
                //   },
                // },
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
                {
                  type: "text_indexOf",
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
                            name: "text",
                          },
                        },
                      },
                    },
                    FIND: {
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
                  type: "text_charAt",
                  kind: "block",
                  fields: {
                    WHERE: "FROM_START",
                  },
                  inputs: {
                    VALUE: {
                      block: {
                        type: "variables_get",
                        fields: {
                          VAR: {
                            name: "text",
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: "text_getSubstring",
                  kind: "block",
                  fields: {
                    WHERE1: "FROM_START",
                    WHERE2: "FROM_START",
                  },
                  inputs: {
                    STRING: {
                      block: {
                        type: "variables_get",
                        fields: {
                          VAR: {
                            name: "text",
                          },
                        },
                      },
                    },
                  },
                },
                {
                  type: "text_changeCase",
                  kind: "block",
                  fields: {
                    CASE: "UPPERCASE",
                  },
                  inputs: {
                    TEXT: {
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
                  type: "text_trim",
                  kind: "block",
                  fields: {
                    MODE: "BOTH",
                  },
                  inputs: {
                    TEXT: {
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
                  type: "text_count",
                  kind: "block",
                  inputs: {
                    SUB: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                    TEXT: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                  },
                },
                {
                  type: "text_replace",
                  kind: "block",
                  inputs: {
                    FROM: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                    TO: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                    TEXT: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                  },
                },
                {
                  type: "text_reverse",
                  kind: "block",
                  inputs: {
                    TEXT: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "",
                        },
                      },
                    },
                  },
                },
                {
                  type: "text_print",
                  kind: "block",
                  inputs: {
                    TEXT: {
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
                  type: "text_prompt_ext",
                  kind: "block",
                  fields: {
                    TYPE: "TEXT",
                  },
                  inputs: {
                    TEXT: {
                      shadow: {
                        type: "text",
                        fields: {
                          TEXT: "abc",
                        },
                      },
                    },
                  },
                },
              ],
            },
            {
              kind: "category",
              name: "Lists",
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
              name: "Variables",
              custom: "VARIABLE",
              categorystyle: "variable_category",
            },
            {
              kind: "category",
              name: "Functions",
              custom: "PROCEDURE",
              categorystyle: "procedure_category",
            },
          ],
        };
        setLocale(location);
        let workerSpace = inject(div, {
          horizontalLayout: media.orientation === "portrait",
          // renderer: "geras",
          toolboxPosition: media.orientation === "landscape" ? "start" : "end",
          theme: Theme.defineTheme("dark", {
            base: Themes.Zelos,
            componentStyles: {
              workspaceBackgroundColour: "#1e1e1e",
              toolboxBackgroundColour: "#000",
              toolboxForegroundColour: "#fff",
              flyoutBackgroundColour: "#252526",
              flyoutForegroundColour: "#ccc",
              flyoutOpacity: 1,
              scrollbarColour: "#797979",
              insertionMarkerColour: "#fff",
              insertionMarkerOpacity: 0.3,
              scrollbarOpacity: 0.4,
              cursorColour: "#d0d0d0",
            },
            name: "dark",
          }),
          toolbox,
          grid: {
            spacing: 25,
            length: 3,
            colour: "#ccc",
            snap: true,
          },
        });
        const data = props.data;
        serialization.workspaces.load(data ?? {}, workerSpace);
        workerSpace.addChangeListener(() => setCode(javascriptGenerator.workspaceToCode(workerSpace)));
        // registry.register(registry.Type.TOOLBOX_ITEM, ToolboxCategory.registrationName, CustomCategory, true);

        // 当代码发生变化时
        createEffect((prevCode) => {
          const curCode = code();
          if (curCode !== prevCode) {
            // console.log(curCode);
            props.setData(serialization.workspaces.save(workerSpace));
            // console.log(JSON.stringify(serialization.workspaces.save(workerSpace)));
          }
          return curCode;
        }, "");
      },
    ),
  );

  return <div id="blocklyDiv" ref={setRef} class={props.class ? ` ` + " " + props.class : `h-full w-full`} />;
}
