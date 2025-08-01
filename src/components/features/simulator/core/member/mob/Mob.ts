/**
 * 怪物成员类
 *
 * 继承自Member基类，实现怪物特有的功能
 */

import {
  Member,
  TargetType,
  type MemberBaseStats,
  type MemberEvent,
  type MemberContext,
  MemberStateMachine,
  MemberEventType,
  MemberActor,
} from "../../Member";
import { setup, assign } from "xstate";
import type { MemberWithRelations } from "@db/repositories/member";
import { isMobMember } from "../../Member";
import type { MobWithRelations } from "@db/repositories/mob";
import { ComboWithRelations } from "@db/repositories/combo";
import { createActor } from "xstate";
import { MobAttrKeys, MobAttrDic, MobAttrType, MobAttrExpressionsMap } from "./MobData";
import { ModifierSource, AttributeExpression, ReactiveSystem } from "../ReactiveSystem";
import { MobFSMEventBridge } from "../../fsmBridge/MobBridge";
import type { EventQueue } from "../../EventQueue";

// ============================== 角色属性系统类型定义 ==============================

/**
 * Mob特有的事件类型
 * 扩展MemberEventType，包含Mob特有的状态机事件
 */
type MobEventType =
  | MemberEventType
  | { type: "cast_end"; data: { skillId: string } } // 前摇结束
  | { type: "controlled"; data: { skillId: string } } // 受到控制
  | { type: "move_command"; data: { position: { x: number; y: number } } } // 移动指令
  | { type: "charge_end"; data: { skillId: string } } // 蓄力结束
  | { type: "hp_zero"; data: { skillId: string } } // HP小于等于0
  | { type: "stop_move"; data: { skillId: string } } // 停止移动指令
  | { type: "control_end"; data: { skillId: string } } // 控制时间结束
  | { type: "revive_ready"; data: { skillId: string } } // 复活倒计时清零
  | { type: "skill_press"; data: { skillId: string } } // 按下技能
  | { type: "check_availability"; data: { skillId: string } } // 判断可用性
  | { type: "skill_animation_end"; data: { skillId: string } } // 技能动作结束
  | { type: "update"; timestamp: number }; // 更新事件（带时间戳）

// ============================== Mob类 ==============================

/**
 * 怪物成员类
 * 实现怪物特有的属性和行为
 */
export class Mob extends Member<MobAttrType> {
  // ==================== 怪物特有属性 ====================

  /** 怪物角色数据（包含所有装备、技能、连击等信息），仅在初始哈过程中使用 */
  private mob: MobWithRelations;

  // ==================== 怪物属性系统 ====================

  /** 技能冷却状态Map */
  private skillCooldowns: Map<string, { cooldown: number; currentCooldown: number }> = new Map();

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param memberData 成员数据
   * @param externalEventQueue 外部事件队列（可选）
   * @param initialState 初始状态
   */
  constructor(
    memberData: MemberWithRelations,
    externalEventQueue?: EventQueue,
    initialState: {
      position?: { x: number; y: number };
      currentHp?: number;
      currentMp?: number;
    } = {},
  ) {
    // 验证成员类型
    if (!isMobMember(memberData)) {
      throw new Error("Mob类只能用于怪物类型的成员");
    }

    // 创建Mob特有的FSM事件桥
    const mobFSMBridge = new MobFSMEventBridge();

    // 创建响应式配置
    const reactiveConfig = {
      attrKeys: MobAttrKeys,
      attrExpressions: MobAttrExpressionsMap,
    };

    // 调用父类构造函数，注入FSM事件桥
    super(memberData, mobFSMBridge, reactiveConfig, externalEventQueue, initialState);

    // 设置角色数据
    this.mob = memberData.mob;
    if (!this.mob) {
      throw new Error("怪物角色数据缺失");
    }

    // 初始化怪物数据（响应式系统已由基类初始化）
    this.initializeMobData();

    console.log(`🎮 已创建怪物: ${memberData.name}，data:`, this);
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化怪物数据
   */
  private initializeMobData(): void {
    this.reactiveDataManager.setBaseValues({
      lv: 0,
      captureable: 0,
      experience: 0,
      partsExperience: 0,
      radius: 0,
      dodge: 0,
      maxHp: 0,
      currentHp: 0,
      pAtk: 0,
      mAtk: 0,
      pCritRate: 0,
      pCritDmg: 0,
      pStab: 0,
      accuracy: 0,
      pDef: 0,
      mDef: 0,
      pRes: 0,
      mRes: 0,
      neutralRes: 0,
      lightRes: 0,
      darkRes: 0,
      waterRes: 0,
      fireRes: 0,
      earthRes: 0,
      windRes: 0,
      ailmentRes: 0,
      guardPower: 0,
      guardRecharge: 0,
      evasionRecharge: 0,
      aspd: 0,
      cspd: 0,
      mspd: 0
    });
    // 解析怪物配置中的修饰器（暂时注释掉，直到实现相应方法）
    // this.reactiveDataManager.parseModifiersFromMob(this.mob, "怪物配置");

    console.log("✅ 怪物数据初始化完成");
  }

  /**
   * 获取怪物属性
   * 直接从响应式系统获取计算结果
   */
  getStats(): Record<MobAttrType, number> {
    return this.reactiveDataManager.getValues(MobAttrKeys);
  }

  // ==================== 基类抽象方法实现 ====================
  /**
   * 获取怪物默认属性值
   * 可以覆盖基类的通用属性默认值
   */
  protected getDefaultAttrValues(): Record<string, number> {
    return {
      // 怪物特有的默认值
      lv: 1,
      captureable: 0,
      experience: 0,
      partsExperience: 0,
      radius: 1,
      dodge: 10,
      pCritRate: 5,
      pCritDmg: 150,
      pStab: 75,
      accuracy: 80,
      ailmentRes: 0,
      guardPower: 0,
      guardRecharge: 0,
      evasionRecharge: 0,
      cspd: 100,
      // 可以覆盖基类的通用属性
      maxHp: 1500,  // 怪物血量比基类默认值更高
      currentHp: 1500,
      maxMp: 50,    // 怪物通常 MP 较低
      currentMp: 50,
      pAtk: 120,    // 怪物攻击力
      mAtk: 80,     // 怪物魔攻较低
      pDef: 60,     // 怪物防御
      mDef: 40,     // 怪物魔防较低
      mspd: 80,     // 怪物移动速度较慢
    };
  }

  /**
   * 转换表达式格式以适配 ReactiveDataManager
   * 将 MobAttrEnum 键转换为 MobAttrType 键
   */
  private convertExpressionsToManagerFormat(): Map<MobAttrType, AttributeExpression<MobAttrType>> {
    const convertedExpressions = new Map<MobAttrType, AttributeExpression<MobAttrType>>();

    for (const [attrName, expressionData] of MobAttrExpressionsMap) {
      convertedExpressions.set(attrName, {
        expression: expressionData.expression,
        isBase: expressionData.isBase,
      });
    }

    return convertedExpressions;
  }

  // ==================== 公共接口 ====================

  /**
   * 获取角色数据
   */
  getMob(): MobWithRelations {
    return this.mob;
  }

  /**
   * 检查技能是否可用
   */
  isSkillAvailable(skillId: string): boolean {
    const cooldownInfo = this.skillCooldowns.get(skillId);
    if (!cooldownInfo) return false;

    return cooldownInfo.currentCooldown <= 0 && this.isActive();
  }

  /**
   * 使用技能
   *
   * @param skillId 技能ID
   * @param targetId 目标ID
   */
  useSkill(skillId: string): boolean {
    if (!this.isSkillAvailable(skillId)) {
      console.warn(`🎮 [${this.getName()}] 技能不可用: ${skillId}`);
      return false;
    }

    // 设置技能冷却
    const cooldownInfo = this.skillCooldowns.get(skillId);
    if (cooldownInfo) {
      cooldownInfo.currentCooldown = cooldownInfo.cooldown;
    }

    // 调用父类的useSkill方法
    super.useSkill(skillId);

    console.log(`🎮 [${this.getName()}] 使用技能: ${skillId}`);
    return true;
  }

  /**
   * 获取属性值
   *
   * @param attrName 属性名称
   * @returns 属性值
   */
  getAttributeValue(attrName: MobAttrType): number {
    return this.reactiveDataManager.getValue(attrName);
  }

  /**
   * 设置属性值
   *
   * @param attrName 属性名称
   * @param targetType 目标类型
   * @param value 属性值
   * @param origin 来源
   */
  setAttributeValue(attrName: MobAttrType, targetType: TargetType, value: number, origin: string): void {
    const source: ModifierSource = {
      id: origin,
      name: origin,
      type: "system",
    };

    switch (targetType) {
      case TargetType.baseValue:
        this.reactiveDataManager.setBaseValue(attrName, {
          value,
          source,
        });
        break;
      case TargetType.staticConstant:
        this.reactiveDataManager.addModifier(attrName, "staticFixed", value, source);
        break;
      case TargetType.staticPercentage:
        this.reactiveDataManager.addModifier(attrName, "staticPercentage", value, source);
        break;
      case TargetType.dynamicConstant:
        this.reactiveDataManager.addModifier(attrName, "dynamicFixed", value, source);
        break;
      case TargetType.dynamicPercentage:
        this.reactiveDataManager.addModifier(attrName, "dynamicPercentage", value, source);
        break;
    }
    console.log(`🎮 [${this.getName()}] 更新属性: ${attrName} = ${value} 来源: ${origin}`);
  }

  /**
   * 获取所有属性值
   *
   * @returns 属性值快照
   */
  getAllAttributeValues(): Readonly<Record<string, number>> {
    return this.reactiveDataManager.getValues(MobAttrKeys);
  }

  /**
   * 添加属性修饰符
   *
   * @param attrName 属性名称
   * @param type 修饰符类型
   * @param value 修饰符值
   * @param source 来源信息
   */
  addAttributeModifier(
    attrName: MobAttrType,
    type: "staticFixed" | "staticPercentage" | "dynamicFixed" | "dynamicPercentage",
    value: number,
    source: ModifierSource,
  ): void {
    this.reactiveDataManager.addModifier(attrName, type, value, source);
    console.log(`🎮 [${this.getName()}] 添加修饰符: ${attrName} ${type} +${value} (来源: ${source.name})`);
  }

  /**
   * 获取响应式数据管理器（供状态机使用）
   */
  getReactiveDataManager(): ReactiveSystem<MobAttrType> {
    return this.reactiveDataManager;
  }

  // ==================== 受保护的方法 ====================

  /**
   * 创建Mob专用状态机
   * 基于MobMachine.ts设计，实现Mob特有的状态管理
   */
  protected createStateMachine(initialState: {
    position?: { x: number; y: number };
    currentHp?: number;
    currentMp?: number;
  }): MemberStateMachine {
    const machineId = `Mob_${this.id}`;

    return setup({
      types: {
        context: {} as MemberContext,
        events: {} as MobEventType,
        output: {} as MemberContext,
      },
      actions: {
        // 根据怪物配置初始化状态
        initializeMobState: assign({
          stats: ({ context }) => this.getStats(),
          isAlive: true,
          isActive: true,
          statusEffects: [],
          eventQueue: [],
          lastUpdateTimestamp: 0,
          extraData: {},
          position: ({ context }) => context.position,
        }),

        // 技能相关事件
        onSkillStart: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 技能开始事件`);
          this.onSkillStart(event as MemberEvent);
        },

        onCastStart: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 前摇开始事件`);
        },

        onCastEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 前摇结束事件`);
        },

        onSkillEffect: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 技能效果事件`);
        },

        onSkillAnimationEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 技能动画结束事件`);
          this.onSkillEnd(event as MemberEvent);
        },

        onChargeStart: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 开始蓄力事件`);
        },

        onChargeEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`👹 [${context.memberData.name}] 蓄力结束事件`);
        },

        // 处理死亡
        handleDeath: assign({
          isAlive: false,
          isActive: false,
        }),

        // 记录事件
        logEvent: ({ context, event }: { context: MemberContext; event: any }) => {
          //   console.log(`👹 [${context.memberData.name}] 事件: ${event.type}`, (event as any).data || "");
        },
      },
      guards: {
        // 检查是否有后续连击步骤
        hasNextCombo: ({ context, event }: { context: MemberContext; event: any }) => {
          // 检查是否有后续连击步骤
          return false; // 暂时返回false，可以根据实际逻辑调整
        },

        // 检查当前技能是否有蓄力动作
        hasChargeAction: ({ context, event }: { context: MemberContext; event: any }) => {
          // 检查当前技能是否有蓄力动作
          return false; // 暂时返回false，可以根据实际逻辑调整
        },

        // 检查当前技能没有蓄力动作
        hasNoChargeAction: ({ context, event }: { context: MemberContext; event: any }) => {
          // 检查当前技能没有蓄力动作
          return true; // 暂时返回true，可以根据实际逻辑调整
        },

        // 检查技能是否可用（冷却、MP等）
        isSkillAvailable: ({ context, event }: { context: MemberContext; event: any }) => {
          // 检查技能是否可用（冷却、MP等）
          return this.isActive();
        },

        // 技能不可用，输出警告
        skillNotAvailable: ({ context, event }: { context: MemberContext; event: any }) => {
          console.warn(`👹 [${context.memberData.name}] 技能不可用`);
          return true;
        },

        // 检查怪物是否死亡
        isDead: ({ context }: { context: MemberContext<MobAttrType> }) => (context.stats.currentHp || 0) <= 0,

        // 检查怪物是否存活
        isAlive: ({ context }: { context: MemberContext<MobAttrType> }) => (context.stats.currentHp || 0) > 0,
      },
    }).createMachine({
      id: machineId,
      context: {
        memberData: this.memberData,
        stats: {} as Record<MobAttrType, number>, // 使用空的Record作为初始值
        isAlive: true,
        isActive: true,
        statusEffects: [],
        eventQueue: [],
        lastUpdateTimestamp: 0,
        extraData: {},
        position: initialState.position || { x: 0, y: 0 },
      },
      initial: "alive",
      entry: {
        type: "initializeMobState",
      },
      states: {
        alive: {
          initial: "operational",
          on: {
            hp_zero: {
              target: "dead",
              actions: ["handleDeath", "logEvent"],
            },
            damage: {
              actions: ["logEvent"],
            },
            heal: {
              actions: ["logEvent"],
            },
            move: {
              actions: ["logEvent"],
            },
            skill_start: {
              actions: ["logEvent"],
            },
            skill_end: {
              actions: ["logEvent"],
            },
            status_effect: {
              actions: ["logEvent"],
            },
            update: {
              actions: ["logEvent"],
            },
            custom: {
              actions: ["logEvent"],
            },
          },
          description: "怪物存活状态，此时可操作且可影响上下文",
          states: {
            operational: {
              initial: "idle",
              on: {
                controlled: {
                  target: "control_abnormal",
                },
              },
              description: "可响应AI操作",
              states: {
                idle: {
                  on: {
                    move_command: {
                      target: "moving",
                    },
                    skill_press: {
                      target: "skill_casting",
                    },
                  },
                },
                moving: {
                  on: {
                    stop_move: {
                      target: "idle",
                    },
                  },
                },
                skill_casting: {
                  initial: "skill_init",
                  states: {
                    skill_init: {
                      on: {
                        check_availability: [
                          {
                            target: "pre_cast",
                            guard: "isSkillAvailable",
                          },
                          {
                            target: `#${machineId}.alive.operational.idle`,
                            guard: "skillNotAvailable",
                          },
                        ],
                      },
                      entry: {
                        type: "onSkillStart",
                      },
                    },
                    pre_cast: {
                      on: {
                        cast_end: [
                          {
                            target: "charge",
                            guard: "hasChargeAction",
                          },
                          {
                            target: "skill_effect",
                            guard: "hasNoChargeAction",
                          },
                        ],
                      },
                      entry: {
                        type: "onCastStart",
                      },
                      exit: {
                        type: "onCastEnd",
                      },
                    },
                    skill_effect: {
                      on: {
                        skill_animation_end: [
                          {
                            target: "skill_init",
                            guard: "hasNextCombo",
                          },
                          {
                            target: `#${machineId}.alive.operational.idle`,
                          },
                        ],
                      },
                      entry: {
                        type: "onSkillEffect",
                      },
                      exit: {
                        type: "onSkillAnimationEnd",
                      },
                    },
                    charge: {
                      on: {
                        charge_end: {
                          target: "skill_effect",
                        },
                      },
                      entry: {
                        type: "onChargeStart",
                      },
                      exit: {
                        type: "onChargeEnd",
                      },
                    },
                  },
                },
              },
            },
            control_abnormal: {
              on: {
                control_end: {
                  target: `#${machineId}.alive.operational.idle`,
                },
              },
            },
          },
        },
        dead: {
          description: "不可操作，中断当前行为，且移出上下文",
        },
      },
    });
  }

  /**
   * 处理怪物特定事件
   * 实现抽象方法，处理怪物特有的事件
   */
  protected handleSpecificEvent(event: MemberEvent): void {
    switch (event.type) {
      case "skill_start":
        this.onSkillStart(event);
        break;
      case "skill_end":
        this.onSkillEnd(event);
        break;
      case "damage":
        this.handleDamage(event);
        break;
      case "heal":
        this.handleHeal(event);
        break;
      default:
        // 默认事件处理逻辑
        console.log(`🎮 [${this.getName()}] 处理特定事件: ${event.type}`);
        break;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 处理伤害事件
   */
  private handleDamage(event: MemberEvent): void {
    const damage = event.data?.damage || 0;
    const damageType = event.data?.damageType || "physical";

    console.log(`🎮 [${this.getName()}] 受到${damageType}伤害: ${damage}`);
  }

  /**
   * 处理治疗事件
   */
  private handleHeal(event: MemberEvent): void {
    const heal = event.data?.heal || 0;

    console.log(`🎮 [${this.getName()}] 受到治疗: ${heal}`);
  }

  /**
   * 更新怪物特有状态
   */
  private updateMobState(currentTimestamp: number): void {
    // 怪物特有状态更新逻辑
    // 例如：自动回复、状态效果处理等
  }

  /**
   * 将属性Map转换为基础属性
   * Mob的简化实现，直接通过MobAttrEnum数值映射
   */
  // convertMapToStats 方法已移除，现在直接使用响应式系统
}

// ============================== 导出 ==============================

export default Mob;
