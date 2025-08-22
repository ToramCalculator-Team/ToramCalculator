/**
 * 控制器模块入口文件
 * 
 * 统一导出所有模块的功能
 */

// 状态机模块
export {
  controllerMachine,
  handleEngineStateChange,
  handleEngineStatsFull,
  handleMemberStateUpdate,
  handleRenderCommand,
  type ControllerContext,
  type ControllerEvent,
  type EngineStateChangeEvent,
  type EngineStatsFullEvent,
  type MemberStateUpdateEvent,
  type RenderCommandEvent,
} from "./stateMachine";

// 模拟控制模块
export {
  startSimulation,
  stopSimulation,
  pauseSimulation,
  resumeSimulation,
  sendIntent,
  checkWorkerReady,
  getMembers,
  getMemberState,
  watchMember,
  unwatchMember,
} from "./simulation";

// 成员管理模块
export {
  castSkill,
  move,
  stopAction,
  createKeyboardInputManager,
  createMemberSelectionManager,
  type MemberActionOptions,
  type AxisInput,
  type MemberSelectionState,
} from "./members";

// UI组件模块
export {
  StatusBar,
  ControlPanel,
  MemberSelect,
  MemberStatus,
  SkillPanel,
  ActionPanel,
  GameViewArea,
} from "./components";
