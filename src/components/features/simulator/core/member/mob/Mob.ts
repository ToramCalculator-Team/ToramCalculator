/**
 * 怪物成员类
 *
 * 继承自Member基类，实现怪物特有的功能：
 * 1. 基于怪物属性的详细计算
 * 2. AI行为系统集成
 * 3. 怪物特有的状态管理
 * 4. 基于MobMachine.ts的状态机逻辑
 */

import {
  AttrData,
  AttributeInfluence,
  Member,
  ModifiersData,
  TargetType,
  ValueType,
  type MemberBaseStats,
  type MemberEvent,
  type MemberContext,
  MemberStateMachine,
} from "../../Member";
import { setup, assign } from "xstate";
import type { MemberWithRelations } from "@db/repositories/member";
import { isMobMember } from "../../Member";
import type { MobWithRelations } from "@db/repositories/mob";
import { createActor } from "xstate";
import { MobFSMEventBridge } from "../../fsmBridge/MobBridge";
import type { EventQueue } from "../../EventQueue";

// ============================== 怪物属性系统类型定义 ==============================

/**
 * 怪物属性类型
 */
enum MobAttrEnum {
  // 基础属性
  LV, // 等级
  MAX_HP, // 最大HP
  HP, // 当前HP
  // 攻击属性
  PHYSICAL_ATK, // 物理攻击
  MAGICAL_ATK, // 魔法攻击
  CRITICAL_RATE, // 暴击率
  CRITICAL_DAMAGE, // 暴击伤害
  STABILITY, // 稳定率
  ACCURACY, // 命中
  // 防御属性
  PHYSICAL_DEF, // 物理防御
  MAGICAL_DEF, // 魔法防御
  PHYSICAL_RESISTANCE, // 物理抗性
  MAGICAL_RESISTANCE, // 魔法抗性
  NEUTRAL_RESISTANCE, // 无属性抗性
  LIGHT_RESISTANCE, // 光属性抗性
  DARK_RESISTANCE, // 暗属性抗性
  WATER_RESISTANCE, // 水属性抗性
  FIRE_RESISTANCE, // 火属性抗性
  EARTH_RESISTANCE, // 地属性抗性
  WIND_RESISTANCE, // 风属性抗性
  // 生存能力
  DODGE, // 回避
  AILMENT_RESISTANCE, // 异常抗性
  BASE_GUARD_POWER, // 基础格挡力
  GUARD_POWER, // 格挡力
  BASE_GUARD_RECHARGE, // 基础格挡回复
  GUARD_RECHARGE, // 格挡回复
  EVASION_RECHARGE, // 闪躲回复
  // 速度属性
  ASPD, // 攻击速度
  CSPD, // 咏唱速度
  MSPD, // 行动速度
  // 其他属性
  RADIUS, // 半径
  CAPTUREABLE, // 是否可捕获
  EXPERIENCE, // 经验值
  PARTS_EXPERIENCE, // 部位经验值
}
type MobAttrType = keyof typeof MobAttrEnum;

// ============================== Mob类 ==============================

/**
 * 怪物成员类
 * 实现怪物特有的属性和行为
 */
export class Mob extends Member {
  // ==================== 怪物特有属性 ====================

  /** 怪物数据（包含所有属性、技能、掉落等信息） */
  private mobData: MobWithRelations;

  // ==================== 怪物属性系统 ====================

  /** 怪物属性Map */
  private mobAttrMap: Map<MobAttrEnum, AttrData> = new Map();

  /** AI行为状态 */
  private aiState: {
    currentTarget: string | null;
    lastActionTime: number;
    actionCooldown: number;
    patrolPoints: Array<{ x: number; y: number }>;
    currentPatrolIndex: number;
  } = {
    currentTarget: null,
    lastActionTime: 0,
    actionCooldown: 1000, // 1秒冷却
    patrolPoints: [],
    currentPatrolIndex: 0,
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param memberData 成员数据
   * @param externalEventQueue 外部事件队列
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

    // 调用父类构造函数，注入FSM事件桥
    super(memberData, mobFSMBridge, externalEventQueue, initialState);

    // 设置怪物数据
    this.mobData = memberData.mob;
    if (!this.mobData) {
      throw new Error("怪物数据缺失");
    }

    // 初始化怪物属性Map
    this.initializeMobAttrMap(memberData);

    // 重新初始化状态机（此时mobAttrMap已经准备好）
    this.actor = createActor(this.createStateMachine(initialState));
    this.actor.start();

    console.log(`👹 已创建怪物: ${memberData.name}`);
  }

  // ==================== 公共接口 ====================

  /**
   * 获取怪物数据
   */
  getMobData(): MobWithRelations {
    return this.mobData;
  }

  /**
   * 获取怪物属性Map中的属性值
   *
   * @param attrName 属性名称
   * @returns 属性值
   */
  getMobAttr(attrName: MobAttrEnum): number {
    const attr = this.mobAttrMap.get(attrName);
    if (!attr) throw new Error(`属性不存在: ${attrName}`);
    return Member.dynamicTotalValue(attr);
  }

  /**
   * 设置怪物属性Map中的属性值
   *
   * @param attrName 属性名称
   * @param value 属性值
   */
  setMobAttr(attrName: MobAttrEnum, targetType: TargetType, value: number, origin: string): void {
    const attr = this.mobAttrMap.get(attrName);
    if (attr) {
      switch (targetType) {
        case TargetType.baseValue:
          attr.baseValue = value;
          break;
        case TargetType.staticConstant:
          attr.modifiers.static.fixed.push({ value, origin });
          break;
        case TargetType.staticPercentage:
          attr.modifiers.static.percentage.push({ value, origin });
          break;
        case TargetType.dynamicConstant:
          attr.modifiers.dynamic.fixed.push({ value, origin });
          break;
        case TargetType.dynamicPercentage:
          attr.modifiers.dynamic.percentage.push({ value, origin });
          break;
      }
      console.log(`👹 [${this.getName()}] 更新属性: ${attrName} = ${value} 来源: ${origin}`);
    } else {
      throw new Error(`属性不存在: ${attrName}`);
    }
  }

  /**
   * 获取怪物属性Map的快照
   *
   * @returns 属性Map快照
   */
  getMobAttrSnapshot(): Readonly<Record<string, Readonly<AttrData>>> {
    const snapshot: Record<string, AttrData> = {};

    for (const [attrName, attr] of this.mobAttrMap.entries()) {
      // 使用结构化克隆确保真正的深拷贝
      snapshot[attrName] = structuredClone(attr);
    }

    // 返回只读视图，防止意外修改
    return Object.freeze(
      Object.fromEntries(Object.entries(snapshot).map(([key, value]) => [key, Object.freeze(value)])),
    ) as Readonly<Record<string, Readonly<AttrData>>>;
  }

  /**
   * 设置AI目标
   */
  setAITarget(targetId: string | null): void {
    this.aiState.currentTarget = targetId;
    console.log(`👹 [${this.getName()}] AI目标设置: ${targetId || "无"}`);
  }

  /**
   * 获取AI目标
   */
  getAITarget(): string | null {
    return this.aiState.currentTarget;
  }

  /**
   * 设置巡逻点
   */
  setPatrolPoints(points: Array<{ x: number; y: number }>): void {
    this.aiState.patrolPoints = points;
    this.aiState.currentPatrolIndex = 0;
    console.log(`👹 [${this.getName()}] 设置巡逻点: ${points.length}个`);
  }

  /**
   * 执行AI行为
   */
  executeAIBehavior(currentTimestamp: number): void {
    if (currentTimestamp - this.aiState.lastActionTime < this.aiState.actionCooldown) {
      return; // 还在冷却中
    }

    // 简单的AI逻辑：如果有目标就攻击，否则巡逻
    if (this.aiState.currentTarget) {
      this.executeAttackBehavior();
    } else {
      this.executePatrolBehavior();
    }

    this.aiState.lastActionTime = currentTimestamp;
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
        events: {} as
          | { type: "cast_end" } // 前摇结束
          | { type: "controlled" } // 受到控制
          | { type: "move_command" } // 移动指令
          | { type: "charge_end" } // 蓄力结束
          | { type: "hp_zero" } // HP小于等于0
          | { type: "stop_move" } // 停止移动指令
          | { type: "control_end" } // 控制时间结束
          | { type: "skill_press" } // 按下技能
          | { type: "check_availability" } // 判断可用性
          | { type: "skill_animation_end" } // 技能动作结束
          | { type: "spawn" }
          | { type: "death" }
          | { type: "damage"; data: { damage: number; damageType: string; sourceId?: string } }
          | { type: "heal"; data: { heal: number; sourceId?: string } }
          | { type: "skill_start"; data: { skillId: string; targetId?: string } }
          | { type: "skill_end" }
          | { type: "move"; data: { position: { x: number; y: number } } }
          | { type: "status_effect"; data: { effect: string; duration: number } }
          | { type: "update"; timestamp: number }
          | { type: "custom"; data: Record<string, any> },
      },
      actions: {
        // 根据怪物配置初始化状态
        initializeMobState: assign({
          stats: ({ context }) => this.mobAttrMap,
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
          this.handleSkillStart(event as MemberEvent);
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
          this.handleSkillEnd(event as MemberEvent);
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
        isDead: ({ context }: { context: MemberContext }) => Member.dynamicTotalValue(context.stats.get(MobAttrEnum.HP)) <= 0,

        // 检查怪物是否存活
        isAlive: ({ context }: { context: MemberContext }) => Member.dynamicTotalValue(context.stats.get(MobAttrEnum.HP)) > 0,
      },
    }).createMachine({
      id: machineId,
      context: {
        memberData: this.memberData,
        stats: new Map(), // 使用空的Map作为初始值
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
   * 计算怪物基础属性
   * 实现抽象方法，计算怪物特有的属性
   */
  protected calculateBaseStats(
    memberData: MemberWithRelations,
    initialState: { currentHp?: number; currentMp?: number; position?: { x: number; y: number } },
  ): MemberBaseStats {
    if (!isMobMember(memberData)) {
      throw new Error("成员数据不是怪物类型");
    }

    const mob = memberData.mob;

    // 基于怪物数据计算基础属性
    const maxHp = mob.maxhp;
    const maxMp = 0; // 怪物通常没有MP

    // 计算攻击力（基于怪物等级和类型）
    const physicalAtk = mob.baseLv * 10; // 简化计算
    const magicalAtk = mob.baseLv * 5; // 简化计算

    // 计算防御力
    const physicalDef = mob.physicalDefense;
    const magicalDef = mob.magicalDefense;

    // 计算速度（简化计算）
    const aspd = 1000; // 基础攻击速度
    const mspd = 1000; // 基础移动速度

    return {
      maxHp,
      currentHp: initialState.currentHp ?? maxHp,
      maxMp,
      currentMp: initialState.currentMp ?? maxMp,
      physicalAtk,
      magicalAtk,
      physicalDef,
      magicalDef,
      aspd,
      mspd,
      position: initialState.position || { x: 0, y: 0 },
    };
  }

  /**
   * 将属性Map转换为基础属性
   * Mob的简化实现，直接通过MobAttrEnum数值映射
   */
  protected convertMapToStats(statsMap: Map<Number, AttrData>): MemberBaseStats {
    const currentState = this.getCurrentState();
    const position = currentState?.context?.position || { x: 0, y: 0 };

    const baseStats: MemberBaseStats = {
      maxHp: 1000,
      currentHp: 1000,
      maxMp: 0, // 怪物通常没有MP
      currentMp: 0,
      physicalAtk: 100,
      magicalAtk: 100,
      physicalDef: 50,
      magicalDef: 50,
      aspd: 1.0,
      mspd: 100,
      position,
    };

    // 直接通过MobAttrEnum数值映射
    const maxHp = statsMap.get(1); // MAX_HP
    const currentHp = statsMap.get(2); // HP
    const physicalAtk = statsMap.get(3); // PHYSICAL_ATK
    const magicalAtk = statsMap.get(4); // MAGICAL_ATK
    const physicalDef = statsMap.get(9); // PHYSICAL_DEF
    const magicalDef = statsMap.get(10); // MAGICAL_DEF
    const aspd = statsMap.get(27); // ASPD
    const mspd = statsMap.get(29); // MSPD

    if (maxHp) baseStats.maxHp = Member.dynamicTotalValue(maxHp);
    if (currentHp) baseStats.currentHp = Member.dynamicTotalValue(currentHp);
    if (physicalAtk) baseStats.physicalAtk = Member.dynamicTotalValue(physicalAtk);
    if (magicalAtk) baseStats.magicalAtk = Member.dynamicTotalValue(magicalAtk);
    if (physicalDef) baseStats.physicalDef = Member.dynamicTotalValue(physicalDef);
    if (magicalDef) baseStats.magicalDef = Member.dynamicTotalValue(magicalDef);
    if (aspd) baseStats.aspd = Member.dynamicTotalValue(aspd);
    if (mspd) baseStats.mspd = Member.dynamicTotalValue(mspd);

    return baseStats;
  }

  /**
   * 处理怪物特定事件
   * 实现抽象方法，处理怪物特有的事件
   */
  protected handleSpecificEvent(event: MemberEvent): void {
    switch (event.type) {
      case "skill_start":
        this.handleSkillStart(event);
        break;
      case "skill_end":
        this.handleSkillEnd(event);
        break;
      case "damage":
        this.handleDamage(event);
        break;
      case "heal":
        this.handleHeal(event);
        break;
      default:
        // 默认事件处理逻辑
        console.log(`👹 [${this.getName()}] 处理特定事件: ${event.type}`);
        break;
    }
  }

  /**
   * 更新回调
   * 重写父类方法，添加怪物特有的更新逻辑
   */
  protected onUpdate(currentTimestamp: number): void {
    // 执行AI行为
    this.executeAIBehavior(currentTimestamp);

    // 更新怪物特有状态
    this.updateMobState(currentTimestamp);
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化怪物属性Map
   *
   * @param memberData 成员数据
   */
  private initializeMobAttrMap(memberData: MemberWithRelations): void {
    if (!isMobMember(memberData)) return;

    const mob = memberData.mob;
    if (!mob) return;

    // 辅助函数：获取属性值
    const d = (attrName: MobAttrEnum): number => {
      const attr = this.mobAttrMap.get(attrName);
      if (!attr) throw new Error(`属性${attrName}不存在`);
      return Member.dynamicTotalValue(attr);
    };

    // 默认修饰符数据
    const DefaultModifiersData: ModifiersData = {
      static: {
        fixed: [],
        percentage: [],
      },
      dynamic: {
        fixed: [],
        percentage: [],
      },
    };

    // 定义基础属性（基于枚举）
    for (const attrType of Object.values(MobAttrEnum)) {
      if (typeof attrType === "number") {
        this.mobAttrMap.set(attrType, {
          type: ValueType.user,
          name: MobAttrEnum[attrType],
          baseValue: this.getBaseValueFromMob(attrType, mob),
          modifiers: DefaultModifiersData,
          influences: this.getInfluencesForAttr(attrType, d),
        });
      }
    }

    console.log(`👹 [${this.getName()}] 初始化怪物属性Map完成，共${this.mobAttrMap.size}个属性`);
  }

  /**
   * 从怪物数据获取基础值
   */
  private getBaseValueFromMob(attrType: MobAttrEnum, mob: MobWithRelations): number {
    switch (attrType) {
      case MobAttrEnum.LV:
        return mob.baseLv;
      case MobAttrEnum.MAX_HP:
        return mob.maxhp;
      case MobAttrEnum.HP:
        return mob.maxhp;
      case MobAttrEnum.PHYSICAL_ATK:
        return mob.baseLv * 10; // 简化计算
      case MobAttrEnum.MAGICAL_ATK:
        return mob.baseLv * 5; // 简化计算
      case MobAttrEnum.PHYSICAL_DEF:
        return mob.physicalDefense;
      case MobAttrEnum.MAGICAL_DEF:
        return mob.magicalDefense;
      case MobAttrEnum.PHYSICAL_RESISTANCE:
        return mob.physicalResistance;
      case MobAttrEnum.MAGICAL_RESISTANCE:
        return mob.magicalResistance;
      case MobAttrEnum.DODGE:
        return mob.dodge;
      case MobAttrEnum.RADIUS:
        return mob.radius;
      case MobAttrEnum.CAPTUREABLE:
        return mob.captureable ? 1 : 0;
      case MobAttrEnum.EXPERIENCE:
        return mob.experience;
      case MobAttrEnum.PARTS_EXPERIENCE:
        return mob.partsExperience;
      default:
        return 0;
    }
  }

  /**
   * 获取属性的影响关系
   */
  private getInfluencesForAttr(
    attrType: MobAttrEnum,
    d: (attrName: MobAttrEnum) => number,
  ): AttributeInfluence[] {
    // 这里可以根据需要定义影响关系
    // 暂时返回空数组
    return [];
  }

  /**
   * 处理技能开始事件
   */
  private handleSkillStart(event: MemberEvent): void {
    const skillId = event.data?.skillId;
    if (skillId) {
      console.log(`👹 [${this.getName()}] 技能开始: ${skillId}`);
    }
  }

  /**
   * 处理技能结束事件
   */
  private handleSkillEnd(event: MemberEvent): void {
    console.log(`👹 [${this.getName()}] 技能结束`);
  }

  /**
   * 处理伤害事件
   */
  private handleDamage(event: MemberEvent): void {
    const damage = event.data?.damage || 0;
    const damageType = event.data?.damageType || "physical";

    console.log(`👹 [${this.getName()}] 受到${damageType}伤害: ${damage}`);
  }

  /**
   * 处理治疗事件
   */
  private handleHeal(event: MemberEvent): void {
    const heal = event.data?.heal || 0;

    console.log(`👹 [${this.getName()}] 受到治疗: ${heal}`);
  }

  /**
   * 执行攻击行为
   */
  private executeAttackBehavior(): void {
    // 简单的攻击逻辑
    console.log(`👹 [${this.getName()}] 执行攻击行为，目标: ${this.aiState.currentTarget}`);
    
    // 这里可以添加更复杂的攻击逻辑
    // 例如：选择技能、计算伤害、应用效果等
  }

  /**
   * 执行巡逻行为
   */
  private executePatrolBehavior(): void {
    if (this.aiState.patrolPoints.length === 0) {
      return; // 没有巡逻点
    }

    const currentPoint = this.aiState.patrolPoints[this.aiState.currentPatrolIndex];
    console.log(`👹 [${this.getName()}] 巡逻到点: (${currentPoint.x}, ${currentPoint.y})`);

    // 移动到下一个巡逻点
    this.aiState.currentPatrolIndex = (this.aiState.currentPatrolIndex + 1) % this.aiState.patrolPoints.length;
  }

  /**
   * 更新怪物特有状态
   */
  private updateMobState(currentTimestamp: number): void {
    // 怪物特有状态更新逻辑
    // 例如：自动回复、状态效果处理等
  }
}

// ============================== 导出 ==============================

export default Mob; 