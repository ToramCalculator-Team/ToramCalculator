import { Accessor, createEffect, createMemo, createSignal, JSX, on, onMount, useContext } from "solid-js";
import { setLocale, inject, Theme, Themes, serialization, WorkspaceSvg, svgResize, BlocklyOptions } from "blockly/core";
import * as Zh from "blockly/msg/zh-hans";
import * as En from "blockly/msg/en";
import * as Ja from "blockly/msg/ja";
import * as ZhTw from "blockly/msg/zh-hant";
import "blockly/blocks";
import { SchemaBlockGenerator } from "./blocks/attrBlocks";
import "./blocks/mistreevousBlocks"; // 注册 mistreevous 参数积木
import "./blocks/mistreevousBTBlocks"; // 注册 BT 节点积木
import "./blocks/functionCallBlocks"; // 注册函数调用块生成器
import "./blocks/procedureBlocksPatch"; // 限制函数体 STACK 输入，禁止 BT 节点
import { functionCallBlockManager } from "./blocks/functionCallBlocks";
import { store } from "~/store";
import { MediaContext } from "~/lib/contexts/Media";
import { MemberType } from "@db/schema/enums";
import { PlayerAttrNestedSchema } from "../simulator/core/Member/types/Player/PlayerAttrSchema";
import { MobAttrNestedSchema } from "../simulator/core/Member/types/Mob/MobAttrSchema";
import { MemberBaseNestedSchema } from "../simulator/core/Member/MemberBaseSchema";
import defaultData from "~/components/features/logicEditor/defaultData.json";
import { toobox } from "./toolBoxConfig";
import { javascriptGenerator } from "blockly/javascript";
import { mdslGenerator } from "./generators/mdslGenerator";
import { functionRegisterGenerator } from "./generators/functionRegisterGenerator";

interface LogicEditorProps extends JSX.InputHTMLAttributes<HTMLDivElement> {
  data: unknown;
  /** 逻辑执行者的类型（Player 或 Mob） */
  memberType: MemberType;
  setData: (data: unknown) => void;
  state: unknown;
  setCode: (code: string) => void;
  /** MDSL definition 文本 */
  setMdslDefinition?: (mdsl: string) => void;
  /** 自定义函数集文本 */
  setFunctions?: (functions: string) => void;
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

        // 注册预置函数调用块（fn_*）
        functionCallBlockManager.registerBuiltinFunctionCallBlocks();

        const toolbox = {
          kind: "categoryToolbox",
          contents: [
            ...toobox.contents,
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
                // 目标属性读取积木
                {
                  type: "target_attribute_get",
                  kind: "block",
                },
              ],
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

        // 初次同步自定义函数调用块（fn_*）
        functionCallBlockManager.syncCustomFunctionCallBlocks(workerSpace);

        // 注册 PROCEDURE_DEFS 回调：
        // - 展示“函数定义”相关块
        // - 同时在该分类中展示“自定义函数调用（MDSL_CALL）”块（fn_<name>），用于接到 bt_action/bt_condition
        // 注意：回调应返回 FlyoutItemInfoArray（数组），而不是 {kind, contents} 对象
        (workerSpace as any).registerToolboxCategoryCallback("PROCEDURE_DEFS", (workspace: any) => {
          // 每次打开 flyout 时同步一次，保证新建/改名/改参后能出现对应调用块
          functionCallBlockManager.syncCustomFunctionCallBlocks(workspace);

          const customCallBlocks = functionCallBlockManager.buildCustomFunctionToolboxContents();

          return [
            { type: "procedures_defnoreturn", kind: "block" as const },
            { type: "procedures_defreturn", kind: "block" as const },
            { type: "procedures_ifreturn", kind: "block" as const },
            ...(customCallBlocks.length > 0
              ? [
                  { kind: "label" as const, text: "自定义函数调用" },
                  ...customCallBlocks,
                ]
              : []),
          ];
        });

        // 注册 BUILTIN_FUNCTIONS 回调：只返回内置函数调用块（fn_<name>）
        // 注意：回调应返回 FlyoutItemInfoArray（数组），而不是 {kind, contents} 对象
        (workerSpace as any).registerToolboxCategoryCallback("BUILTIN_FUNCTIONS", () => {
          return functionCallBlockManager.buildBuiltinFunctionToolboxContents();
        });

        // 用于防抖的定时器
        let syncTimeout: ReturnType<typeof setTimeout> | null = null;

        workerSpace.addChangeListener((e: any) => {
          // 检测 procedure 相关变化，同步自定义函数调用块
          const isProcedureBlock =
            e.blockId &&
            (workerSpace.getBlockById(e.blockId)?.type === "procedures_defnoreturn" ||
              workerSpace.getBlockById(e.blockId)?.type === "procedures_defreturn");

          // 检测 procedure 相关事件类型
          const isProcedureEvent =
            e.type === "create" ||
            e.type === "delete" ||
            (e.type === "change" && isProcedureBlock) ||
            e.type === "finished_loading";

          if (isProcedureEvent || isProcedureBlock) {
            // 防抖：延迟同步，避免频繁更新
            if (syncTimeout) clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
              functionCallBlockManager.syncCustomFunctionCallBlocks(workerSpace);
              // 刷新 toolbox（如果 Blockly 支持）
              try {
                (workerSpace as any).refreshToolbox?.();
              } catch {
                // 忽略
              }
            }, 100);
          }

          const saved = serialization.workspaces.save(workerSpace);
          const code = javascriptGenerator.workspaceToCode(workerSpace);

          // 生成 MDSL definition
          const mdsl = mdslGenerator.workspaceToCode(workerSpace);
          props.setMdslDefinition?.(mdsl);

          // 生成自定义函数集
          const functions = functionRegisterGenerator.workspaceToCode(workerSpace);
          props.setFunctions?.(functions);

          props.setData(saved);
          props.setCode(code);
        });
        workerSpace.scrollCenter();
      },
    ),
  );

  return <div id="blocklyDiv" ref={setRef} class={props.class ? ` ` + " " + props.class : `h-full min-h-24 w-full`} />;
}
