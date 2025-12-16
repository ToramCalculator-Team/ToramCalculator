import type { Workspace, WorkspaceSvg } from "blockly/core";
import { serialization } from "blockly/core";
import { SkillEffectLogicV1Schema, type SkillEffectLogicV1 } from "../BehaviorTree/SkillEffectLogicType";
import { collectCustomPipelines } from "../../../../../logicEditor/blocks/customPipelineBlocks";
import { decodeActionBlockId } from "../../../../../logicEditor/blocks/meta";
import type { NodeData } from "~/lib/behavior3/node";
import type { TreeData } from "~/lib/behavior3/tree";

// NodeData 在序列化时 tree 字段是可选的（由运行时注入）
type SerializedNodeData = Omit<NodeData, "tree" | "children"> & { tree?: TreeData; children: SerializedNodeData[] };

/**
 * 编译错误信息
 */
export interface CompileError {
  blockId?: string;
  blockType?: string;
  message: string;
  path?: string; // JSON path in the output
}

/**
 * 从 workspaceJson（序列化的 Blockly workspace）编译为 SkillEffectLogicV1
 * 这个版本可以在 worker 环境中使用，因为它不依赖 DOM
 */
export function compileWorkspaceJsonToSkillEffectLogicV1(
  workspaceJson: any,
): { logic: SkillEffectLogicV1 | null; errors: CompileError[] } {
  // 在 worker 环境中，我们需要创建一个虚拟的 workspace
  // 但由于 Blockly 的 workspace 需要 DOM，我们直接解析 JSON
  const errors: CompileError[] = [];

  if (!workspaceJson || !workspaceJson.blocks) {
    errors.push({
      message: `无效的 workspaceJson：缺少 blocks 字段`,
    });
    return { logic: null, errors };
  }

  // 解析 workspaceJson 中的 blocks
  const blocks = workspaceJson.blocks?.blocks || [];
  const blocksMap = new Map(blocks.map((b: any) => [b.id, b]));

  // 1. 收集 pipelines.overrides
  const overrides: Record<string, string[]> = {};
  const pipelineDefBlocks = blocks.filter((b: any) => b.type === "pipeline_definition");
  for (const block of pipelineDefBlocks) {
    const pipelineName = block.fields?.pipelineName?.trim();
    if (!pipelineName) {
      errors.push({
        blockId: block.id,
        blockType: "pipeline_definition",
        message: `管线定义缺少名称`,
      });
      continue;
    }

    const actions: string[] = [];
    let currentId = (block as any).inputs?.ACTIONS?.block;
    while (currentId) {
      const currentBlock = blocksMap.get(currentId);
      if (!currentBlock || typeof currentBlock !== "object") break;
      const actionName = decodeActionBlockId((currentBlock as any).type);
      if (actionName) {
        actions.push(actionName);
      }
      currentId = (currentBlock as any).next?.block;
    }
    overrides[pipelineName] = actions;
  }

  // 2. 收集 bt_root 并转换为 behavior3 TreeData
  const rootBlocks = blocks.filter((b: any) => b.type === "bt_root");
  if (rootBlocks.length === 0) {
    errors.push({
      message: `未找到 bt_root 节点，请确保存在唯一的行为树根节点`,
    });
    return { logic: null, errors };
  }
  if (rootBlocks.length > 1) {
    errors.push({
      message: `存在多个 bt_root 节点（期望唯一），将使用第一个`,
    });
  }

  const rootBlock = rootBlocks[0] as any;
  const treeName = rootBlock.fields?.name?.trim() || "skill_bt";
  const treeDesc = rootBlock.fields?.desc?.trim() || "";

  const rootChildId = rootBlock.inputs?.ROOT?.block;
  if (!rootChildId) {
    errors.push({
      blockId: rootBlock.id,
      blockType: "bt_root",
      message: `bt_root 缺少 root 子节点`,
    });
    return { logic: null, errors };
  }

  let nodeIdCounter = 1;
  const convertBlockToNode = (blockId: string, parentPath: string = ""): SerializedNodeData | null => {
    const block = blocksMap.get(blockId);
    if (!block || typeof block !== "object") return null;

    const blockType = (block as any).type;
    if (!blockType) return null;
    const currentPath = parentPath ? `${parentPath}.${blockId}` : blockId;

    // 根据 blockType 转换为 behavior3 节点
    switch (blockType) {
      case "bt_sequence": {
        const children: SerializedNodeData[] = [];
        let childId = (block as any).inputs?.CHILDREN?.block;
        while (childId) {
          const childNode = convertBlockToNode(childId, currentPath);
          if (childNode) {
            children.push(childNode);
          }
          const childBlock = blocksMap.get(childId);
          childId = (childBlock as any)?.next?.block;
        }
        return {
          id: String(nodeIdCounter++),
          name: "Sequence",
          desc: "",
          args: {},
          input: [],
          output: [],
          children,
        } as SerializedNodeData;
      }

      case "bt_switch": {
        const children: SerializedNodeData[] = [];
        let caseId = (block as any).inputs?.CASES?.block;
        while (caseId) {
          const caseBlock = blocksMap.get(caseId);
          if (caseBlock && (caseBlock as any).type === "bt_case") {
            const caseNode = convertBlockToNode(caseId, currentPath);
            if (caseNode) {
              children.push(caseNode);
            }
          }
          caseId = (caseBlock as any)?.next?.block;
        }
        return {
          id: String(nodeIdCounter++),
          name: "Switch",
          desc: "",
          args: {},
          input: [],
          output: [],
          children,
        };
      }

      case "bt_case": {
        // behavior3 Switch 约束：Case 必须有 2 个子节点：condition + action
        const children: SerializedNodeData[] = [];

        // 1) condition
        const condId = (block as any).inputs?.COND?.block;
        if (condId) {
          const condBlock = blocksMap.get(condId);
          const condValue = getValueFromBlockJson(condBlock);
          if (condValue !== null) {
            children.push({
              id: String(nodeIdCounter++),
              name: "Check",
              desc: "",
              args: { value: String(condValue) },
              input: [],
              output: [],
              children: [],
            } as SerializedNodeData);
          }
        }
        // 无条件 => 默认 true（用于 else）
        if (children.length === 0) {
          children.push({
            id: String(nodeIdCounter++),
            name: "Check",
            desc: "",
            args: { value: "true" },
            input: [],
            output: [],
            children: [],
          } as SerializedNodeData);
        }

        // 2) action（把 CHILDREN 串成一个 Sequence）
        const actionChildren: SerializedNodeData[] = [];
        let childId = (block as any).inputs?.CHILDREN?.block;
        while (childId) {
          const childNode = convertBlockToNode(childId, currentPath);
          if (childNode) actionChildren.push(childNode);
          const childBlock = blocksMap.get(childId);
          childId = (childBlock as any)?.next?.block;
        }
        const actionNode: SerializedNodeData =
          actionChildren.length === 1
            ? actionChildren[0]
            : ({
                id: String(nodeIdCounter++),
                name: "Sequence",
                desc: "",
                args: {},
                input: [],
                output: [],
                children: actionChildren,
              } as SerializedNodeData);

        children.push(actionNode);

        return {
          id: String(nodeIdCounter++),
          name: "Case",
          desc: "",
          args: {},
          input: [],
          output: [],
          children,
        } as SerializedNodeData;
      }

      case "bt_check": {
        const valueId = (block as any).inputs?.VALUE?.block;
        const value = valueId ? getValueFromBlockJson(blocksMap.get(valueId)) : null;
        if (value === null) {
          errors.push({
            blockId: (block as any).id,
            blockType: "bt_check",
            message: `Check 节点缺少表达式值`,
            path: currentPath,
          });
          return null;
        }
        return {
          id: String(nodeIdCounter++),
          name: "Check",
          desc: "",
          args: { value },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_runPipelineSync": {
        const pipelineName = (block as any).fields?.pipeline || "";
        if (!pipelineName) {
          errors.push({
            blockId: (block as any).id,
            blockType: "bt_runPipelineSync",
            message: `RunPipelineSync 节点缺少管线名`,
            path: currentPath,
          });
          return null;
        }
        return {
          id: String(nodeIdCounter++),
          name: "RunPipelineSync",
          desc: "",
          args: { actionGroupName: pipelineName },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_waitFrames": {
        const field = (block as any).fields?.field || "currentSkillActionFrames";
        const minId = (block as any).inputs?.MIN?.block;
        const min = minId ? getNumberFromBlockJson(blocksMap.get(minId)) : 1;
        return {
          id: String(nodeIdCounter++),
          name: "WaitFrames",
          desc: "",
          args: { field, min },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_hasBuff": {
        const buffId = (block as any).fields?.buffId || "";
        const outputVar = (block as any).fields?.outputVar || "buffExists";
        if (!buffId) {
          errors.push({
            blockId: (block as any).id,
            blockType: "bt_hasBuff",
            message: `HasBuff 节点缺少 buffId`,
            path: currentPath,
          });
          return null;
        }
        return {
          id: String(nodeIdCounter++),
          name: "HasBuff",
          desc: "",
          args: { buffId, outputVar },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_scheduleFsmEvent": {
        const eventType = (block as any).fields?.eventType || "";
        const delayId = (block as any).inputs?.DELAY?.block;
        const delay = delayId ? getNumberFromBlockJson(blocksMap.get(delayId)) : undefined;
        if (!eventType) {
          errors.push({
            blockId: (block as any).id,
            blockType: "bt_scheduleFsmEvent",
            message: `ScheduleFSMEvent 节点缺少事件类型`,
            path: currentPath,
          });
          return null;
        }
        const args: any = { eventType };
        if (delay !== undefined) {
          args.delayFrames = delay;
        }
        return {
          id: String(nodeIdCounter++),
          name: "ScheduleFSMEvent",
          desc: "",
          args,
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      default:
        errors.push({
          blockId: (block as any).id,
          blockType,
          message: `未知的 BT 节点类型: ${blockType}`,
          path: currentPath,
        });
        return null;
    }
  };

  const rootNode = convertBlockToNode(rootChildId);
  if (!rootNode) {
    return { logic: null, errors };
  }

  // 3. 组装 SkillEffectLogicV1
  const logic: SkillEffectLogicV1 = {
    schemaVersion: 1,
    pipelines: {
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    },
    trees: {
      skillBT: {
        name: treeName,
        desc: treeDesc,
        root: rootNode as any, // tree 字段由运行时注入
        group: [],
      },
    },
  };

  // 4. 校验
  const validationResult = SkillEffectLogicV1Schema.safeParse(logic);
  if (!validationResult.success) {
    for (const issue of validationResult.error.issues) {
      errors.push({
        message: `Schema 校验失败: ${issue.message}`,
        path: issue.path.join("."),
      });
    }
    return { logic: null, errors };
  }

  return { logic: validationResult.data, errors };
}

/**
 * 从 workspace 编译为 SkillEffectLogicV1（浏览器环境版本）
 */
export function compileWorkspaceToSkillEffectLogicV1(
  workspace: Workspace | WorkspaceSvg,
): { logic: SkillEffectLogicV1 | null; errors: CompileError[] } {
  const errors: CompileError[] = [];

  // 1. 收集 pipelines.overrides
  const pipelines = collectCustomPipelines(workspace);
  const overrides: Record<string, string[]> = {};
  for (const pipeline of pipelines) {
    if (!pipeline.name) {
      errors.push({
        message: `管线定义缺少名称`,
      });
      continue;
    }
    overrides[pipeline.name] = pipeline.actions || [];
  }

  // 2. 收集 bt_root 并转换为 behavior3 TreeData
  const rootBlocks = workspace.getBlocksByType("bt_root", false);
  if (rootBlocks.length === 0) {
    errors.push({
      message: `未找到 bt_root 节点，请确保存在唯一的行为树根节点`,
    });
    return { logic: null, errors };
  }
  if (rootBlocks.length > 1) {
    errors.push({
      message: `存在多个 bt_root 节点（期望唯一），将使用第一个`,
    });
  }

  const rootBlock = rootBlocks[0];
  const treeName = rootBlock.getFieldValue("name")?.trim() || "skill_bt";
  const treeDesc = rootBlock.getFieldValue("desc")?.trim() || "";

  // 转换 root 子节点为 behavior3 NodeData
  const rootChild = rootBlock.getInputTargetBlock("ROOT");
  if (!rootChild) {
    errors.push({
      blockId: rootBlock.id,
      blockType: "bt_root",
      message: `bt_root 缺少 root 子节点`,
    });
    return { logic: null, errors };
  }

  let nodeIdCounter = 1;
  const convertBlockToNode = (block: any, parentPath: string = ""): SerializedNodeData | null => {
    const blockType = block.type;
    const blockId = block.id;
    const currentPath = parentPath ? `${parentPath}.${blockId}` : blockId;

    // 根据 blockType 转换为 behavior3 节点
    switch (blockType) {
      case "bt_sequence": {
        const children: SerializedNodeData[] = [];
        let child = block.getInputTargetBlock("CHILDREN");
        while (child) {
          const childNode = convertBlockToNode(child, currentPath);
          if (childNode) {
            children.push(childNode);
          }
          child = child.getNextBlock();
        }
        return {
          id: String(nodeIdCounter++),
          name: "Sequence",
          desc: "",
          args: {},
          input: [],
          output: [],
          children,
        } as SerializedNodeData;
      }

      case "bt_switch": {
        const children: SerializedNodeData[] = [];
        let caseBlock = block.getInputTargetBlock("CASES");
        while (caseBlock) {
          if (caseBlock.type === "bt_case") {
            const caseNode = convertBlockToNode(caseBlock, currentPath);
            if (caseNode) {
              children.push(caseNode);
            }
          }
          caseBlock = caseBlock.getNextBlock();
        }
        return {
          id: String(nodeIdCounter++),
          name: "Switch",
          desc: "",
          args: {},
          input: [],
          output: [],
          children,
        };
      }

      case "bt_case": {
        // behavior3 Switch 约束：Case 必须有 2 个子节点：condition + action
        const children: SerializedNodeData[] = [];
        const condInput = block.getInputTargetBlock("COND");
        if (condInput) {
          // COND 应该是表达式字符串，需要包装为 Check 节点
          const condValue = getValueFromBlock(condInput);
          if (condValue !== null) {
            children.push({
              id: String(nodeIdCounter++),
              name: "Check",
              desc: "",
              args: { value: String(condValue) },
              input: [],
              output: [],
              children: [],
            } as SerializedNodeData);
          }
        }
        // 无条件 => 默认 true（用于 else）
        if (children.length === 0) {
          children.push({
            id: String(nodeIdCounter++),
            name: "Check",
            desc: "",
            args: { value: "true" },
            input: [],
            output: [],
            children: [],
          } as SerializedNodeData);
        }

        const actionChildren: SerializedNodeData[] = [];
        let child = block.getInputTargetBlock("CHILDREN");
        while (child) {
          const childNode = convertBlockToNode(child, currentPath);
          if (childNode) actionChildren.push(childNode);
          child = child.getNextBlock();
        }
        const actionNode: SerializedNodeData =
          actionChildren.length === 1
            ? actionChildren[0]
            : ({
                id: String(nodeIdCounter++),
                name: "Sequence",
                desc: "",
                args: {},
                input: [],
                output: [],
                children: actionChildren,
              } as SerializedNodeData);

        children.push(actionNode);

        return {
          id: String(nodeIdCounter++),
          name: "Case",
          desc: "",
          args: {},
          input: [],
          output: [],
          children,
        } as SerializedNodeData;
      }

      case "bt_check": {
        const valueInput = block.getInputTargetBlock("VALUE");
        const value = getValueFromBlock(valueInput);
        if (value === null) {
          errors.push({
            blockId,
            blockType: "bt_check",
            message: `Check 节点缺少表达式值`,
            path: currentPath,
          });
          return null;
        }
        return {
          id: String(nodeIdCounter++),
          name: "Check",
          desc: "",
          args: { value },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_runPipelineSync": {
        const pipelineName = block.getFieldValue("pipeline");
        if (!pipelineName) {
          errors.push({
            blockId,
            blockType: "bt_runPipelineSync",
            message: `RunPipelineSync 节点缺少管线名`,
            path: currentPath,
          });
          return null;
        }
        return {
          id: String(nodeIdCounter++),
          name: "RunPipelineSync",
          desc: "",
          args: { actionGroupName: pipelineName },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_waitFrames": {
        const field = block.getFieldValue("field") || "currentSkillActionFrames";
        const minInput = block.getInputTargetBlock("MIN");
        const min = minInput ? getNumberFromBlock(minInput) : 1;
        return {
          id: String(nodeIdCounter++),
          name: "WaitFrames",
          desc: "",
          args: { field, min },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_hasBuff": {
        const buffId = block.getFieldValue("buffId") || "";
        const outputVar = block.getFieldValue("outputVar") || "buffExists";
        if (!buffId) {
          errors.push({
            blockId,
            blockType: "bt_hasBuff",
            message: `HasBuff 节点缺少 buffId`,
            path: currentPath,
          });
          return null;
        }
        return {
          id: String(nodeIdCounter++),
          name: "HasBuff",
          desc: "",
          args: { buffId, outputVar },
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      case "bt_scheduleFsmEvent": {
        const eventType = block.getFieldValue("eventType") || "";
        const delayInput = block.getInputTargetBlock("DELAY");
        const delay = delayInput ? getNumberFromBlock(delayInput) : undefined;
        if (!eventType) {
          errors.push({
            blockId,
            blockType: "bt_scheduleFsmEvent",
            message: `ScheduleFSMEvent 节点缺少事件类型`,
            path: currentPath,
          });
          return null;
        }
        const args: any = { eventType };
        if (delay !== undefined) {
          args.delayFrames = delay;
        }
        return {
          id: String(nodeIdCounter++),
          name: "ScheduleFSMEvent",
          desc: "",
          args,
          input: [],
          output: [],
          children: [],
        } as SerializedNodeData;
      }

      default:
        errors.push({
          blockId,
          blockType,
          message: `未知的 BT 节点类型: ${blockType}`,
          path: currentPath,
        });
        return null;
    }
  };

  const rootNode = convertBlockToNode(rootChild);
  if (!rootNode) {
    return { logic: null, errors };
  }

  // 3. 组装 SkillEffectLogicV1
  const logic: SkillEffectLogicV1 = {
    schemaVersion: 1,
    pipelines: {
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    },
    trees: {
      skillBT: {
        name: treeName,
        desc: treeDesc,
        root: rootNode as any, // tree 字段由运行时注入
        group: [],
      },
    },
  };

  // 4. 校验
  const validationResult = SkillEffectLogicV1Schema.safeParse(logic);
  if (!validationResult.success) {
    for (const issue of validationResult.error.issues) {
      errors.push({
        message: `Schema 校验失败: ${issue.message}`,
        path: issue.path.join("."),
      });
    }
    return { logic: null, errors };
  }

  return { logic: validationResult.data, errors };
}

/**
 * 从 Blockly 块获取值（字符串或数字）- Workspace 版本
 */
function getValueFromBlock(block: any): string | number | null {
  if (!block) return null;
  // 我们自定义的表达式块
  if (block.type === "expr_string") {
    return block.getFieldValue("EXPR") || "";
  }
  if (block.type === "expr_hasBuff") {
    const buffId = block.getFieldValue("BUFF_ID") || "";
    return `self.buffManager.hasBuff(${JSON.stringify(buffId)})`;
  }
  // 如果是文本输入块
  if (block.type === "text") {
    return block.getFieldValue("TEXT") || "";
  }
  // 如果是数字块
  if (block.type === "math_number") {
    return parseFloat(block.getFieldValue("NUM") || "0");
  }
  // 其他情况，尝试获取字段值
  const fields = block.inputList?.flatMap((input: any) => input.fieldRow || []) || [];
  for (const field of fields) {
    if (field.name === "TEXT" || field.name === "NUM") {
      return field.getValue();
    }
  }
  return null;
}

/**
 * 从 Blockly 块获取数字值 - Workspace 版本
 */
function getNumberFromBlock(block: any): number {
  const value = getValueFromBlock(block);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * 从 Blockly 块 JSON 获取值（字符串或数字）- JSON 版本
 */
function getValueFromBlockJson(block: any): string | number | null {
  if (!block) return null;
  // 我们自定义的表达式块
  if (block.type === "expr_string") {
    return block.fields?.EXPR || "";
  }
  if (block.type === "expr_hasBuff") {
    const buffId = block.fields?.BUFF_ID || "";
    return `self.buffManager.hasBuff(${JSON.stringify(buffId)})`;
  }
  // 兼容：属性读取块（成员属性分组里已有）
  if (block.type === "self_attribute_get") {
    const path = block.fields?.ATTRIBUTE_PATH || "";
    return `self.statContainer.getValue(${JSON.stringify(path)})`;
  }
  if (block.type === "target_attribute_get") {
    const path = block.fields?.ATTRIBUTE_PATH || "";
    return `target.statContainer.getValue(${JSON.stringify(path)})`;
  }
  // 如果是文本输入块
  if (block.type === "text") {
    return block.fields?.TEXT || "";
  }
  // 如果是数字块
  if (block.type === "math_number") {
    return parseFloat(block.fields?.NUM || "0");
  }
  return null;
}

/**
 * 从 Blockly 块 JSON 获取数字值 - JSON 版本
 */
function getNumberFromBlockJson(block: any): number {
  const value = getValueFromBlockJson(block);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

