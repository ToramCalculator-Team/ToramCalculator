/**
 * 控制器模块入口文件
 *
 * 导出多控制器架构的核心组件：
 * - 引擎生命周期控制器
 * - 成员控制器
 * - UI组件
 */

// 成员控制器
export { MemberController } from "./MemberController";

// UI组件
export {
	ControlPanel,
	MemberSelect,
} from "./components";

// 成员控制器UI组件
export { AddMemberControllerButton } from "./AddMemberControllerButton";
export { MemberControllerPanel } from "./MemberControllerPanel";
