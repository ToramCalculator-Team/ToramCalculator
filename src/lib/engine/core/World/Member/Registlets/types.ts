/**
 * 雷吉斯托环 (registlet) 相关共享类型。
 *
 * 术语区分：
 * - **registlet（雷吉斯托环）**：游戏里装备性质的常驻效果来源，数据存 `registlet` 表。
 * - **passive skill（被动技能）**：技能树中的被动类型，数据存 `skill` 表 (`isPassive=true`)。
 * - **buff**：技能释放或事件触发时挂载的临时效果。
 *
 * 三者都是"常驻/挂载式效果"，但来源与生命周期不同。本目录 (`Registlets/`) **只处理 registlet**；
 * 未来"被动技能"需要同类挂载能力时，可新建 `Passives/` 目录并复用 overlay / 订阅机制。
 */

import type { Member } from "../Member";
import type { MemberEventType, MemberStateContext } from "../runtime/StateMachine/types";
import type { MemberSharedRuntime } from "../runtime/types";

/** 泛化的 Member 类型别名（跨具体子类使用的通用入口）。 */
export type AnyMember = Member<string, MemberEventType, MemberStateContext, MemberSharedRuntime>;
