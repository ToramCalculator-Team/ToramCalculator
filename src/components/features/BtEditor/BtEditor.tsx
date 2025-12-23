import { Component, createSignal, onMount, onCleanup } from "solid-js";
import {
  State,
  BehaviourTree,
  convertMDSLToJSON,
  validateDefinition,
  BehaviourTreeOptions,
  NodeDetails,
} from "~/lib/mistreevous";
import { ToastContainer, Card, ExamplesMenu, Icon, Divider } from "./components";
import { DefinitionTab } from "./components/DefinitionTab/DefinitionTab";
import { AgentTab } from "./components/AgentTab/AgentTab";
import { MainPanel, CanvasElements } from "./components/MainPanel/MainPanel";
import { DefinitionType, SidebarTab } from "./types/app";
import { Examples } from "./data/Examples";
import { toast } from "./stores/toastStore";
import { ConnectorVariant } from "./types/workflow";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";

export { DefinitionType, SidebarTab };

export type BtEditorProps = {
  initValues?: {
    definition: string;
    agent: string;
  };
  readOnly?: boolean;
  onSave: (mdsl: string, agent: string) => void;
};

/**
 * 行为树编辑器主组件
 * 提供完整的 MDSL/JSON 定义编辑、Agent 代码编辑、可视化展示和执行功能
 */
export const BtEditor: Component<BtEditorProps> = (props) => {
  // ==================== 状态管理 ====================
  // 布局 ID：用于标识当前加载的示例
  const [layoutId, setLayoutId] = createSignal<string | null>(null);

  // 行为树定义内容（MDSL 或 JSON 格式）
  const [definition, setDefinition] = createSignal<string>(props.initValues?.definition ?? "");

  // 定义类型：None、MDSL 或 JSON
  const [definitionType, setDefinitionType] = createSignal<DefinitionType>(DefinitionType.None);

  // Agent 类定义代码
  const [agent, setAgent] = createSignal<string>(props.initValues?.agent ?? "class Agent {}");

  // Agent 代码错误信息
  const [agentExceptionMessage, setAgentExceptionMessage] = createSignal<string>("");

  // 行为树实例
  const [behaviourTree, setBehaviourTree] = createSignal<BehaviourTree | null>(null);

  // 行为树定义错误信息
  const [behaviourTreeExceptionMessage, setBehaviourTreeExceptionMessage] = createSignal<string>("");

  // 行为树播放定时器 ID
  const [behaviourTreePlayInterval, setBehaviourTreePlayInterval] = createSignal<number | null>(null);

  // 画布元素：节点和连接线数据
  const [canvasElements, setCanvasElements] = createSignal<CanvasElements>({
    nodes: [],
    edges: [],
  });

  // 侧边栏是否只读：当行为树正在播放时，侧边栏变为只读
  const isSidebarReadOnly = () => !!behaviourTreePlayInterval();

  // ==================== 工具函数 ====================

  /**
   * 检测定义内容的类型（MDSL 或 JSON）
   * @param def 定义内容字符串
   * @returns 定义类型：None、MDSL 或 JSON
   */
  const getDefinitionType = (def: string): DefinitionType => {
    if (!def) {
      return DefinitionType.None;
    }

    // 尝试解析为 MDSL
    try {
      convertMDSLToJSON(def);
      return DefinitionType.MDSL;
    } catch {
      // 不是 MDSL，继续尝试 JSON
    }

    // 尝试解析为 JSON
    try {
      JSON.parse(def);
      return DefinitionType.JSON;
    } catch {
      // 既不是 MDSL 也不是 JSON
    }

    return DefinitionType.None;
  };

  /**
   * 根据 Agent 类定义创建 Agent 实例
   * @param boardClassDefinition Agent 类定义代码字符串
   * @returns Agent 实例
   */
  const createBoardInstance = (boardClassDefinition: string): any => {
    // 使用 Function 构造函数动态创建 Agent 类
    const boardClassCreator = new Function(
      "BehaviourTree",
      "State",
      "getStringValue",
      "getNumberValue",
      "getBooleanValue",
      "showErrorToast",
      "showInfoToast",
      `return ${boardClassDefinition};`,
    );

    // 提供给 Agent 的辅助函数
    const getStringValue = (message: string) => window.prompt(message);
    const getNumberValue = (message: string) => parseFloat(window.prompt(message) as string);
    const getBooleanValue = (message: string) => window.confirm(`${message}. (Ok=true Cancel=false)`);
    const showErrorToast = (message: string) => toast.error(message);
    const showInfoToast = (message: string) => toast.info(message);

    // 创建 Agent 类
    const boardClass = boardClassCreator(
      BehaviourTree,
      State,
      getStringValue,
      getNumberValue,
      getBooleanValue,
      showErrorToast,
      showInfoToast,
    );

    // 实例化 Agent
    const boardInstance = new boardClass();

    return boardInstance;
  };

  /**
   * 创建行为树实例
   * @param def 行为树定义（MDSL 或 JSON 格式）
   * @param boardClassDefinition Agent 类定义代码
   * @returns 行为树实例，创建失败返回 null
   */
  const createTreeInstance = (def: string, boardClassDefinition: string): BehaviourTree | null => {
    // 创建 Agent 实例
    const board = createBoardInstance(boardClassDefinition);

    // 配置行为树选项
    // 注意：我们每 60fps 调用一次 step()，所以 delta 设置为 1000 / 60 毫秒
    const options: BehaviourTreeOptions = {
      getDeltaTime: () => 1 / 60,
    };

    // 创建并返回行为树实例
    const tree = new BehaviourTree(def, board, options);

    return tree;
  };

  /**
   * 将行为树节点详情转换为画布元素（节点和连接线）
   * @param rootNodeDetails 根节点详情
   * @returns 画布元素数据
   */
  const createCanvasElements = (rootNodeDetails: NodeDetails): CanvasElements => {
    const result: CanvasElements = { nodes: [], edges: [] };

    /**
     * 递归处理节点详情，转换为画布节点和连接线
     * @param node 当前节点详情
     * @param parentId 父节点 ID（可选，用于创建连接线）
     */
    const processNodeDetails = (node: NodeDetails, parentId?: string) => {
      // 添加节点到结果中
      result.nodes.push({
        id: node.id,
        caption: node.name,
        state: node.state,
        type: node.type,
        args: node.args ?? [],
        whileGuard: node.while,
        untilGuard: node.until,
        entryCallback: node.entry,
        stepCallback: node.step,
        exitCallback: node.exit,
        variant: "default",
      } as any);

      // 如果有父节点，创建连接线
      if (parentId) {
        // 根据节点状态确定连接线样式
        let variant: ConnectorVariant;
        switch (node.state) {
          case State.RUNNING:
            variant = "active"; // 运行中：蓝色虚线
            break;
          case State.SUCCEEDED:
            variant = "succeeded"; // 成功：绿色
            break;
          case State.FAILED:
            variant = "failed"; // 失败：红色
            break;
          default:
            variant = "default"; // 默认：灰色
        }

        // 添加连接线
        result.edges.push({
          id: `${parentId}_${node.id}`,
          from: parentId,
          to: node.id,
          variant,
        });
      }

      // 递归处理子节点
      (node.children ?? []).forEach((child) => processNodeDetails(child, node.id));
    };

    // 从根节点开始处理
    processNodeDetails(rootNodeDetails);

    return result;
  };

  // ==================== 事件处理函数 ====================

  /**
   * 处理定义内容变化
   * 验证定义、创建行为树实例、更新画布元素
   * @param def 新的定义内容（MDSL 或 JSON）
   * @param agentDef 可选的 Agent 定义（如果提供，会使用此定义而不是当前 agent）
   */
  const onDefinitionChange = (def: string, agentDef?: string): void => {
    let tree = null;
    let exceptionMessage = "";
    let elements: CanvasElements = { nodes: [], edges: [] };

    // 检测定义类型
    const defType = getDefinitionType(def);

    // 验证定义是否有效
    const validationResult = validateDefinition(defType === DefinitionType.JSON ? JSON.parse(def) : def);

    if (validationResult.succeeded) {
      try {
        // 创建行为树实例
        tree = createTreeInstance(defType === DefinitionType.JSON ? JSON.parse(def) : def, agentDef ?? agent());

        // 根据行为树生成画布元素（节点和连接线）
        elements = createCanvasElements(tree!.getTreeNodeDetails());
      } catch (error) {
        // 创建行为树实例失败
        exceptionMessage = `${error}`;
      }
    } else {
      // 定义验证失败
      exceptionMessage = validationResult.errorMessage!;
    }

    // 更新所有相关状态
    setDefinition(def);
    setDefinitionType(defType);
    setBehaviourTreeExceptionMessage(exceptionMessage);
    setCanvasElements(elements);
    setBehaviourTree(tree);
  };

  /**
   * 处理 Agent 类定义变化
   * 验证 Agent 代码、尝试重新创建行为树实例
   * @param agentClassDefinition 新的 Agent 类定义代码
   */
  const onAgentChange = (agentClassDefinition: string): void => {
    let boardExceptionMessage = "";

    // 尝试创建 Agent 实例以验证代码是否正确
    try {
      createBoardInstance(agentClassDefinition);
    } catch (error) {
      boardExceptionMessage = `${(error as any).message}`;
    }

    // 如果 Agent 代码有效，尝试用新的 Agent 重新创建行为树
    let tree = null;
    try {
      tree = createTreeInstance(definition(), agentClassDefinition);
    } catch {}

    // 更新状态
    setAgent(agentClassDefinition);
    setAgentExceptionMessage(boardExceptionMessage);
    setBehaviourTree(tree);
  };

  /**
   * MDSL 插入处理函数
   * 当用户从 example 菜单选择时，将对应的 MDSL 和 Agent 插入到编辑器
   * @param mdsl MDSL 定义内容
   * @param agent Agent 类定义代码
   */
  const handleMDSLInsert = (mdsl: string, agent: string): void => {
    // 同时更新 agent 和 definition
    onAgentChange(agent);
    onDefinitionChange(mdsl, agent);
  };

  /**
   * 处理播放按钮点击
   * 开始执行行为树，每 100ms 执行一步，直到行为树完成
   */
  const onPlayButtonPressed = (): void => {
    const tree = behaviourTree();

    // 如果没有行为树实例，无法播放
    if (!tree) {
      return;
    }

    // 重置行为树到初始状态
    tree.reset();

    // 清除已有的定时器（如果存在）
    const existingInterval = behaviourTreePlayInterval();
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 缓存上一次的状态签名，用于比较是否有变化
    // 这样可以避免在状态未变化时创建新对象，减少不必要的重新渲染
    let lastStateSignature: string = "";

    /**
     * 生成节点状态签名
     * 签名格式：节点ID:状态[子节点签名,子节点签名]
     * 用于快速比较行为树状态是否发生变化
     */
    const getNodesStateSignature = (node: NodeDetails): string => {
      const stateStr = `${node.id}:${node.state}`;
      const childrenStr = (node.children ?? []).map((child) => getNodesStateSignature(child)).join(",");
      return childrenStr ? `${stateStr}[${childrenStr}]` : stateStr;
    };

    // 创建定时器，每 100ms 执行一次行为树步骤
    const playInterval = setInterval(() => {
      // 执行行为树的一步
      try {
        tree.step();
      } catch (exception: any) {
        // 执行出错，停止播放
        clearInterval(playInterval);
        setBehaviourTreePlayInterval(null);

        // 重置行为树
        tree.reset();

        // 通过 toast 通知用户错误信息
        toast.error(exception.toString());
      }

      // 如果行为树已经完成（不再运行），停止定时器
      if (!tree.isRunning()) {
        clearInterval(playInterval);
        setBehaviourTreePlayInterval(null);
      }

      // 获取当前所有节点的状态签名
      const currentSignature = getNodesStateSignature(tree.getTreeNodeDetails());

      // 只有当状态真正变化时才更新 canvasElements
      // 这样可以避免在状态未变化时创建新对象，减少不必要的重新渲染
      // 特别是在 wait 节点等待期间，状态不会变化，就不需要更新
      if (currentSignature !== lastStateSignature) {
        setCanvasElements(createCanvasElements(tree.getTreeNodeDetails()));
        lastStateSignature = currentSignature;
      }
    }, 100);

    setBehaviourTreePlayInterval(playInterval as unknown as number);
  };

  /**
   * 处理停止按钮点击
   * 停止行为树执行，重置行为树，更新画布元素
   */
  const onStopButtonPressed = (): void => {
    const tree = behaviourTree();
    const interval = behaviourTreePlayInterval();

    // 重置行为树
    tree?.reset();

    // 清除定时器
    if (interval) {
      clearInterval(interval);
    }

    // 更新状态
    setBehaviourTreePlayInterval(null);
    // 更新画布元素为重置后的状态
    setCanvasElements(tree ? createCanvasElements(tree.getTreeNodeDetails()) : { nodes: [], edges: [] });
  };

  // ==================== 生命周期钩子 ====================

  /**
   * 组件卸载时清理定时器
   * 防止内存泄漏
   */
  onCleanup(() => {
    const interval = behaviourTreePlayInterval();
    if (interval) {
      clearInterval(interval);
    }
  });

  onMount(() => {
    if (props.initValues) {
      onDefinitionChange(props.initValues.definition, props.initValues.agent);
    }
  });

  return (
    <div id="BtEditor" class="BtEditor bg-primary-color flex h-full w-full flex-col-reverse landscape:lg:flex-col overflow-hidden">
      <div class={`Functions border-b border-dividing-color relative flex landscape:lg:h-full min-h-[50px] w-full items-center justify-between ${props.readOnly ? "basis-full" : "basis-3/5"}`}>
        <div class="Canvas hidden h-full w-full flex-1 landscape:lg:block">
          <MainPanel
            layoutId={layoutId()}
            elements={canvasElements()}
            showPlayButton={!!behaviourTree() && !behaviourTreePlayInterval()}
            showReplayButton={!!behaviourTreePlayInterval()}
            showStopButton={!!behaviourTreePlayInterval()}
            onPlayButtonClick={onPlayButtonPressed}
            onReplayButtonClick={onPlayButtonPressed}
            onStopButtonClick={onStopButtonPressed}
          />
          <ToastContainer />
        </div>
        <div class={`Left ${props.readOnly ? "hidden" : ""} landscape:lg:shadow-card shadow-area-color bg-primary-color landscape:lg:absolute top-2 left-2 flex items-center gap-1 rounded`}>
          <Button level="quaternary" onClick={() => props.onSave(definition(), agent())} class="p-1">
            <Icons.Outline.Save />
          </Button>
          <ExamplesMenu onMDSLInsert={handleMDSLInsert} />
        </div>
        <div class={`Right ${props.readOnly ? "hidden" : ""} landscape:lg:shadow-card shadow-area-color bg-primary-color landscape:lg:absolute top-2 right-2 flex items-center gap-1 rounded`}>
          <Button level="quaternary" class="p-1">
            <Icons.Outline.Close />
          </Button>
        </div>
      </div>
      <div
        class={`Editor ${props.readOnly ? "hidden" : ""} landscape:lg:shadow-card shadow-dividing-color flex h-full w-full flex-col overflow-hidden landscape:flex-row landscape:lg:basis-2/5 ${
          isSidebarReadOnly() ? "pointer-events-none opacity-70" : ""
        }`}
      >
        <DefinitionTab
          definition={definition()}
          definitionType={definitionType()}
          onChange={onDefinitionChange}
          errorMessage={behaviourTreeExceptionMessage()}
          readOnly={isSidebarReadOnly()}
        />
        <div class="Line bg-dividing-color h-px w-full landscape:h-full landscape:w-px"></div>
        <AgentTab
          value={agent()}
          onChange={onAgentChange}
          errorMessage={agentExceptionMessage()}
          readOnly={isSidebarReadOnly()}
        />
      </div>
    </div>
  );
};
