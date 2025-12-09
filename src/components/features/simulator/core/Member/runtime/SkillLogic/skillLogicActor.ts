import { fromCallback } from "xstate";
import { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import type { MemberStateContext } from "../StateMachine/types";
import { runSkillLogic } from "./skillLogicExecutor";

type SkillLogicStatus = "success" | "failure" | "interrupted";

/**
 * SkillLogicActor 输入
 */
export interface SkillLogicActorInput {
  /** 技能效果（可能包含自定义逻辑） */
  skillEffect: SkillEffectWithRelations | null;
  /** 状态机上下文（owner） */
  owner: MemberStateContext;
}

/**
 * SkillLogicActor 接收的事件类型
 */
export type SkillLogicActorEvent =
  | { type: "TICK" }
  | { type: "FSM_EVENT"; fsmEventType: string };

/**
 * SkillLogicActor 发送给父状态机的事件类型
 */
export type SkillLogicActorDoneEvent = {
  type: "技能逻辑执行完成";
  output: SkillLogicActorOutput;
};

/**
 * SkillLogicActor 输出
 */
export type SkillLogicActorOutput = {
  status: SkillLogicStatus;
};

/**
 * SkillLogicActor
 *
 * 专用于技能 JS 片段执行（成员 AI 的行为树逻辑在其它文件中）
 */
export const skillLogicActor = fromCallback(({ input, sendBack, receive }: {
  input: SkillLogicActorInput;
  sendBack: (event: SkillLogicActorDoneEvent) => void;
  receive: (callback: (event: SkillLogicActorEvent) => void) => void;
}) => {
  console.log(`🧩 [${input.owner.name}] 初始化 SkillLogicActor`);

  const effectiveSkillEffect = input.skillEffect;

  const execResult = runSkillLogic({
    owner: input.owner,
    logic: effectiveSkillEffect?.logic,
    skillId: effectiveSkillEffect?.id ?? null,
  });

  const status: SkillLogicStatus = execResult.status === "success" ? "success" : "failure";
  sendBack({ type: "技能逻辑执行完成", output: { status } });

  // 兼容接口：保留事件监听但不推进 tick
  receive((event) => {
    if (event.type === "TICK") {
      return;
    } else if (event.type === "FSM_EVENT") {
      console.log(`🔁 [${input.owner.name}] SkillLogicActor 收到 FSM_EVENT: ${event.fsmEventType}`);
    }
  });

  return () => {
    console.log(`🧹 [${input.owner.name}] 清理 SkillLogicActor`);
  };
});


