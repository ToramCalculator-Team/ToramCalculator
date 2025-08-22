/**
 * 成员管理模块
 * 
 * 功能：
 * - 成员选择和状态管理
 * - 技能释放逻辑
 * - 移动和动作控制
 * - 键盘输入处理
 */

import { sendIntent } from "./simulation";

// ============================== 成员管理类型 ==============================

export interface MemberActionOptions {
  selectedMemberId: string | null;
}

// ============================== 技能和动作逻辑 ==============================

/**
 * 施放技能
 */
export function castSkill(selectedEngineMemberId: string | null, skillId: string): void {
  if (!selectedEngineMemberId) {
    console.log("⚠️ 请先选择成员");
    return;
  }

  sendIntent({
    type: "使用技能",
    targetMemberId: selectedEngineMemberId,
    data: { skillId },
  });
}

/**
 * 移动命令
 */
export function move(selectedEngineMemberId: string | null, x: number, y: number): void {
  if (!selectedEngineMemberId) {
    console.log("⚠️ 请先选择成员");
    return;
  }

  sendIntent({
    type: "move_command",
    targetMemberId: selectedEngineMemberId,
    data: { position: { x, y } },
  });
}

/**
 * 停止动作
 */
export function stopAction(selectedEngineMemberId: string | null): void {
  if (!selectedEngineMemberId) {
    console.log("⚠️ 请先选择成员");
    return;
  }

  sendIntent({
    type: "stop_move",
    targetMemberId: selectedEngineMemberId,
    data: {},
  });
}

// ============================== 键盘输入管理 ==============================

export interface AxisInput {
  x: number;
  y: number;
}

/**
 * 创建键盘输入管理器
 */
export function createKeyboardInputManager() {
  const activeKeys = new Set<string>();
  let lastAxis = { x: 0, y: 0 };
  let lastSentNonZero = false;

  const onKeyDown = (e: KeyboardEvent) => {
    activeKeys.add(e.key.toLowerCase());
  };

  const onKeyUp = (e: KeyboardEvent) => {
    activeKeys.delete(e.key.toLowerCase());
  };

  const calculateAxis = (): AxisInput => {
    const axis = {
      x: (activeKeys.has("d") ? 1 : 0) + (activeKeys.has("a") ? -1 : 0),
      y: (activeKeys.has("w") ? 1 : 0) + (activeKeys.has("s") ? -1 : 0),
    };
    
    const norm = Math.hypot(axis.x, axis.y);
    if (norm > 0) {
      axis.x /= norm;
      axis.y /= norm;
    }
    
    return axis;
  };

  const processInput = (selectedMemberId: string | null) => {
    const axis = calculateAxis();
    const norm = Math.hypot(axis.x, axis.y);
    const changed = axis.x !== lastAxis.x || axis.y !== lastAxis.y;

    if (selectedMemberId && changed) {
      // 非零：发送自定义意图 axis_move；零向量：发送 stop_move
      if (norm > 0) {
        sendIntent({
          type: "custom",
          targetMemberId: selectedMemberId,
          data: { kind: "axis_move", axis },
        });
        lastSentNonZero = true;
      } else if (lastSentNonZero) {
        sendIntent({ 
          type: "stop_move", 
          targetMemberId: selectedMemberId, 
          data: {} 
        });
        lastSentNonZero = false;
      }
      lastAxis = axis;
    }
  };

  const startListening = () => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  };

  const stopListening = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };

  return {
    startListening,
    stopListening,
    processInput,
    calculateAxis,
  };
}

// ============================== 成员状态管理 ==============================

/**
 * 成员选择状态管理
 */
export interface MemberSelectionState {
  selectedEngineMemberId: string | null;
  selectedMemberFsm: string | null;
}

/**
 * 创建成员选择管理器
 */
export function createMemberSelectionManager() {
  let currentSelection: MemberSelectionState = {
    selectedEngineMemberId: null,
    selectedMemberFsm: null,
  };

  const setSelectedMember = (memberId: string | null) => {
    currentSelection.selectedEngineMemberId = memberId;
  };

  const setSelectedMemberFsm = (fsmState: string | null) => {
    currentSelection.selectedMemberFsm = fsmState;
  };

  const getSelectedMember = () => currentSelection.selectedEngineMemberId;
  const getSelectedMemberFsm = () => currentSelection.selectedMemberFsm;

  return {
    setSelectedMember,
    setSelectedMemberFsm,
    getSelectedMember,
    getSelectedMemberFsm,
    get state() {
      return { ...currentSelection };
    },
  };
}
