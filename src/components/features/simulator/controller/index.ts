/**
 * 简化的控制器模块入口文件
 * 
 * 只保留核心功能：
 * - 简化的控制器
 * - 简化的通信层
 * - UI组件
 */

// 简化的控制器
export {
  Controller,
  controller,
} from "./controller";

// 简化的通信层
export {
  ControllerCommunication,
  controllerCommunication,
} from "./communication";

// UI组件
export {
  StatusBar,
  ControlPanel,
  MemberSelect,
  MemberStatus,
  SkillPanel,
  ActionPanel,
  GameViewArea,
} from "./components";
