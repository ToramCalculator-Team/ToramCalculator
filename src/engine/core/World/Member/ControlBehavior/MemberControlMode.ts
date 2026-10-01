/**
 * 成员控制模式（ADR 0054）。
 *
 * 任一成员任一 Tick 只有一个有效输入源：
 * - controlled：外部控制器输入。
 * - ai：Member 持有的 AI 行为树输入。
 */
export type MemberControlMode = "controlled" | "ai";
