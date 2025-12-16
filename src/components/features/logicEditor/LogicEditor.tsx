import { Accessor, createEffect, createMemo, createSignal, JSX, on, onMount, useContext } from "solid-js";
import { setLocale, inject, Theme, Themes, serialization, WorkspaceSvg, svgResize, BlocklyOptions } from "blockly/core";
import * as Zh from "blockly/msg/zh-hans";
import * as En from "blockly/msg/en";
import * as Ja from "blockly/msg/ja";
import * as ZhTw from "blockly/msg/zh-hant";
import "blockly/blocks";
import { SchemaBlockGenerator } from "./blocks/gameAttributeBlocks";
import { collectCustomPipelines, type CustomPipelineMeta } from "./blocks";
import { buildPlayerPipelineMetas, buildPlayerStageMetas } from "./metaSources/player";
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
      .filter((cp) => typeof cp?.name === "string" && Array.isArray(cp?.actions))
      .map((cp) => ({
        name: cp.name as string,
        actions: cp.actions as string[],
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
  // 用于追踪 pipeline_definition 重命名（blockId -> pipelineName）
  let lastPipelineNameByDefId: Record<string, string> = {};

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
            ...blocksRegistry.buildToolboxCategories(),
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
        
        // 确保存在唯一的 bt_root（系统自动管理）
        const existingRoots = workerSpace.getBlocksByType("bt_root", false);
        if (existingRoots.length === 0) {
          // 创建 bt_root 块
          const rootBlock = workerSpace.newBlock("bt_root");
          rootBlock.initSvg();
          rootBlock.render();
          rootBlock.moveBy(20, 20);
        } else if (existingRoots.length > 1) {
          // 如果存在多个，只保留第一个，删除其他的
          for (let i = 1; i < existingRoots.length; i++) {
            existingRoots[i].dispose();
          }
        }

        // 兜底：若用户/旧数据导致 action_<name> 被吸附到 bt_ 节点下，给出警告并自动断开
        const sanitizeIllegalConnections = () => {
          const all = workerSpace.getAllBlocks(false);
          for (const b of all) {
            if (!b?.type) continue;
            if (!String(b.type).startsWith("action_")) continue;
            const parent = b.getParent();
            if (parent && String(parent.type).startsWith("bt_")) {
              console.warn(
                `[LogicEditor] action 块不允许放入行为树内，已自动断开。action=${b.type}, parent=${parent.type}`,
              );
              // unplug(true) 会把它从连接中拔出并保持坐标
              b.unplug(true);
            }
          }
        };
        sanitizeIllegalConnections();

        // 初始化：建立 pipeline_definition 的 blockId -> name 映射
        {
          const custom0 = collectCustomPipelines(workerSpace);
          const m: Record<string, string> = {};
          for (const cp of custom0) {
            if (cp.sourceBlockId && cp.name) m[cp.sourceBlockId] = cp.name;
          }
          lastPipelineNameByDefId = m;
          blocksRegistry.updateCustomPipelines(custom0);
        }
        
        workerSpace.addChangeListener(() => {
          sanitizeIllegalConnections();
          // 仅保存 workspaceJson，不再生成 JS 代码
          const saved = serialization.workspaces.save(workerSpace);
          const custom = collectCustomPipelines(workerSpace);

          // 先更新 registry，保证 dropdown 的 options 已含最新管线名
          blocksRegistry.updateCustomPipelines(custom);

          // 若 pipeline_definition 被重命名，则同步更新 bt_runPipelineSync 的选择值（old -> new）
          const currentMap: Record<string, string> = {};
          for (const cp of custom) {
            if (cp.sourceBlockId && cp.name) currentMap[cp.sourceBlockId] = cp.name;
          }
          for (const [defId, newName] of Object.entries(currentMap)) {
            const oldName = lastPipelineNameByDefId[defId];
            if (oldName && oldName !== newName) {
              const all = workerSpace.getAllBlocks(false);
              for (const b of all) {
                if (b?.type === "bt_runPipelineSync") {
                  const v = b.getFieldValue("pipeline");
                  if (v === oldName) {
                    b.setFieldValue(newName, "pipeline");
                  }
                }
              }
            }
          }
          lastPipelineNameByDefId = currentMap;

          saved.customPipelines = custom;
          props.setData(saved);
        });
        workerSpace.scrollCenter();
      },
    ),
  );

  return <div id="blocklyDiv" ref={setRef} class={props.class ? ` ` + " " + props.class : `h-full min-h-24 w-full`} />;
}
