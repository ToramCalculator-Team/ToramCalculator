/**
 * 玩家成员类
 *
 * 继承自Member基类，实现玩家特有的功能：
 * 1. 基于角色属性的详细计算
 * 2. 技能系统集成
 * 3. 装备加成计算
 * 4. 玩家特有的状态管理
 */

import {
  AttributeInfluence,
  Member,
  TargetType,
  ValueType,
  type MemberBaseStats,
  type MemberEvent,
  type MemberContext,
  MemberStateMachine,
  MemberEventType,
  MemberActor,
} from "../../Member";
import { setup, assign } from "xstate";
import type { MemberWithRelations } from "@db/repositories/member";
import { isPlayerMember } from "../../Member";
import type { CharacterWithRelations } from "@db/repositories/character";
import type { CharacterSkillWithRelations } from "@db/repositories/characterSkill";
import type { PlayerWithRelations } from "@db/repositories/player";

import type { MainHandType } from "@db/schema/enums";
import { ComboWithRelations } from "@db/repositories/combo";
import { createActor } from "xstate";
import { PlayerAttrKeys, PlayerAttrDic, PlayerAttrType } from "./PlayerData";
import { ReactiveDataManager, ModifierSource, AttributeExpression } from "../ReactiveSystem";
import { PlayerAttrExpressionsMap } from "./PlayerData";

// ============================== 角色属性系统类型定义 ==============================

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
 */
type PlayerEventType =
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

// ============================== Player类 ==============================

/**
 * 玩家成员类
 * 实现玩家特有的属性和行为
 */
export class Player extends Member {
  // 重写actor属性类型以支持Player特有的事件
  protected actor: MemberActor;
  // ==================== 玩家特有属性 ====================

  /** 玩家角色数据（包含所有装备、技能、连击等信息），仅在初始哈过程中使用 */
  private character: CharacterWithRelations;

  // ==================== 玩家属性系统 ====================

  /** 玩家响应式数据管理器 */
  private reactiveDataManager: ReactiveDataManager<PlayerAttrType>;

  /** 技能冷却状态Map */
  private skillCooldowns: Map<string, { cooldown: number; currentCooldown: number }> = new Map();

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param memberData 成员数据
   * @param initialState 初始状态
   */
  constructor(
    memberData: MemberWithRelations,
    initialState: {
      position?: { x: number; y: number };
      currentHp?: number;
      currentMp?: number;
    } = {},
  ) {
    // 验证成员类型
    if (!isPlayerMember(memberData)) {
      throw new Error("Player类只能用于玩家类型的成员");
    }

    // 调用父类构造函数
    super(memberData, initialState);

    // 设置角色数据
    this.character = memberData.player.character;
    if (!this.character) {
      throw new Error("玩家角色数据缺失");
    }
    
    // 初始化响应式数据管理器（传入表达式，单一事实来源）
    this.reactiveDataManager = new ReactiveDataManager<PlayerAttrType>(
      PlayerAttrKeys,
      this.convertExpressionsToManagerFormat(),
    );

    // 初始化玩家数据
    this.initializePlayerData();

    // 重新初始化状态机（此时reactiveDataManager已经准备好）
    this.actor = createActor(this.createStateMachine(initialState));
    this.actor.start();

    console.log(`🎮 已创建玩家: ${memberData.name}，data:`, this);
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化玩家数据
   */
  private initializePlayerData(): void {
    this.reactiveDataManager.setBaseValues({
      lv: this.character.lv,
      str: this.character.str,
      int: this.character.int,
      vit: this.character.vit,
      agi: this.character.agi,
      dex: this.character.dex,
      luk: this.character.personalityType === "Luk" ? this.character.personalityValue : 0,
      tec: this.character.personalityType === "Tec" ? this.character.personalityValue : 0,
      men: this.character.personalityType === "Men" ? this.character.personalityValue : 0,
      cri: this.character.personalityType === "Cri" ? this.character.personalityValue : 0,
      maxHp: this.character.vit * 10 + 100,
      maxMp: this.character.int * 5 + 50,
      mainWeaponBaseAtk: this.character.weapon.baseAbi,
      mainWeaponAtk: this.character.weapon.baseAbi,
      aggroRate: 0,
      weaponRange: 0,
      hpRegen: 0,
      mpRegen: 0,
      mpAtkRegen: 0,
      pAtk: 0,
      mAtk: 0,
      weaponAtk: 0,
      unsheatheAtk: 0,
      pPierce: 0,
      mPierce: 0,
      pCritRate: 0,
      pCritDmg: 0,
      mCritConvRate: 0,
      mCritDmgConvRate: 0,
      mCritRate: 0,
      mCritDmg: 0,
      shortRangeDmg: 0,
      longRangeDmg: 0,
      vsNeutral: 0,
      vsLight: 0,
      vsDark: 0,
      vsWater: 0,
      vsFire: 0,
      vsEarth: 0,
      vsWind: 0,
      totalDmg: 0,
      finalDmg: 0,
      pStab: 0,
      mStab: 0,
      accuracy: 0,
      pChase: 0,
      mChase: 0,
      anticipate: 0,
      guardBreak: 0,
      reflect: 0,
      absoluteAccuracy: 0,
      pAtkUpStr: 0,
      pAtkUpInt: 0,
      pAtkUpVit: 0,
      pAtkUpAgi: 0,
      pAtkUpDex: 0,
      mAtkUpStr: 0,
      mAtkUpInt: 0,
      mAtkUpVit: 0,
      mAtkUpAgi: 0,
      mAtkUpDex: 0,
      pAtkDownStr: 0,
      pAtkDownInt: 0,
      pAtkDownVit: 0,
      pAtkDownAgi: 0,
      pAtkDownDex: 0,
      mAtkDownStr: 0,
      mAtkDownInt: 0,
      mAtkDownVit: 0,
      mAtkDownAgi: 0,
      mAtkDownDex: 0,
      bodyArmorDef: 0,
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
      dodge: 0,
      ailmentRes: 0,
      guardPower: 0,
      guardRecharge: 0,
      evasionRecharge: 0,
      pBarrier: 0,
      mBarrier: 0,
      fractionalBarrier: 0,
      barrierCooldown: 0,
      redDmgFloor: 0,
      redDmgMeteor: 0,
      redDmgPlayerEpicenter: 0,
      redDmgFoeEpicenter: 0,
      redDmgBowling: 0,
      redDmgBullet: 0,
      redDmgStraightLine: 0,
      redDmgCharge: 0,
      absoluteDodge: 0,
      aspd: 0,
      mspd: 0,
      msrd: 0,
      cspd: 0,
      csr: 0,
      dropRate: 0,
      reviveTime: 0,
      flinchUnavailable: 0,
      tumbleUnavailable: 0,
      stunUnavailable: 0,
      invincibleAid: 0,
      expRate: 0,
      petExp: 0,
      itemCooldown: 0,
      recoilDmg: 0,
      gemPowderDrop: 0,
      weaponMAtkConv: 0,
      weaponPAtkConv: 0,
      subWeaponBaseAtk: 0,
      subWeaponAtk: 0,
      bodyArmorBaseDef: 0,
    });
    // 解析角色配置中的修饰器
    this.reactiveDataManager.parseModifiersFromCharacter(this.character, "角色配置");

    console.log("✅ 玩家数据初始化完成");
  }

  /**
   * 转换表达式格式以适配 ReactiveDataManager
   * 将 PlayerAttrEnum 键转换为 PlayerAttrType 键
   */
  private convertExpressionsToManagerFormat(): Map<PlayerAttrType, AttributeExpression<PlayerAttrType>> {
    const convertedExpressions = new Map<PlayerAttrType, AttributeExpression<PlayerAttrType>>();

    for (const [attrName, expressionData] of PlayerAttrExpressionsMap) {
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
  getCharacter(): CharacterWithRelations {
    return this.character;
  }

  /**
   * 获取技能列表
   */
  getSkills(): CharacterSkillWithRelations[] {
    return this.character.skills;
  }

  /**
   * 获取指定技能
   */
  getSkill(skillId: string): CharacterSkillWithRelations | undefined {
    return this.character.skills.find((skill) => skill.templateId === skillId);
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
   * 获取连击列表
   */
  getCombos(): ComboWithRelations[] {
    return this.character.combos;
  }

  /**
   * 获取玩家属性值
   *
   * @param attrName 属性名称
   * @returns 属性值
   */
  getPlayerAttr(attrName: PlayerAttrType): number {
    return this.reactiveDataManager.getValue(attrName);
  }

  /**
   * 设置玩家属性值
   *
   * @param attrName 属性名称
   * @param targetType 目标类型
   * @param value 属性值
   * @param origin 来源
   */
  setPlayerAttr(attrName: PlayerAttrType, targetType: TargetType, value: number, origin: string): void {
    const source: ModifierSource = {
      id: origin,
      name: origin,
      type: "system",
    };

    switch (targetType) {
      case TargetType.baseValue:
        this.reactiveDataManager.setBaseValue(attrName, value);
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
   * 获取玩家属性快照
   *
   * @returns 属性快照
   */
  getPlayerAttrSnapshot(): Readonly<Record<string, number>> {
    return this.reactiveDataManager.getValues(PlayerAttrKeys);
  }

  /**
   * 获取响应式数据管理器（供状态机使用）
   */
  getReactiveDataManager(): ReactiveDataManager<PlayerAttrType> {
    return this.reactiveDataManager;
  }

  /**
   * 执行连击
   *
   * @param comboId 连击ID
   */
  executeCombo(comboId: string): boolean {
    const combo = this.character.combos.find((combo) => combo.id === comboId);
    if (!combo) {
      console.warn(`🎮 [${this.getName()}] 连击不存在: ${comboId}`);
      return false;
    }

    for (const step of combo.steps) {
      this.useSkill(step.characterSkillId);
      console.log(`🎮 [${this.getName()}] 连击步骤: ${step.characterSkillId}, 类型: ${step.type}`);
    }

    console.log(`🎮 [${this.getName()}] 开始连击: ${comboId}`);
    return true;
  }

  // ==================== 受保护的方法 ====================

  /**
   * 创建Player专用状态机
   * 基于PlayerMachine.ts设计，实现Player特有的状态管理
   */
  protected createStateMachine(initialState: {
    position?: { x: number; y: number };
    currentHp?: number;
    currentMp?: number;
  }): MemberStateMachine {
    const machineId = `Player_${this.id}`;

    return setup({
      types: {
        context: {} as MemberContext,
        events: {} as PlayerEventType,
        output: {} as MemberContext,
      },
      actions: {
        // 根据角色配置初始化玩家状态
        initializePlayerState: assign({
          stats: ({ context }) => this.reactiveDataManager.getValues(PlayerAttrKeys),
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
          console.log(`🎮 [${context.memberData.name}] 技能开始事件`);
          this.handleSkillStart(event as MemberEvent);
        },

        onCastStart: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 前摇开始事件`);
        },

        onCastEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 前摇结束事件`);
        },

        onSkillEffect: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 技能效果事件`);
        },

        onSkillAnimationEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 技能动画结束事件`);
          this.handleSkillEnd(event as MemberEvent);
        },

        onChargeStart: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 开始蓄力事件`);
        },

        onChargeEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 蓄力结束事件`);
        },

        // 处理死亡
        handleDeath: assign({
          isAlive: false,
          isActive: false,
        }),

        // 重置HP/MP并清除状态效果
        resetHpMpAndStatus: assign({
          stats: ({ context }) => {
            // 重置HP/MP到初始值
            this.setPlayerAttr("maxHp", TargetType.baseValue, this.getPlayerAttr("maxHp"), "revive");
            this.setPlayerAttr("maxMp", TargetType.baseValue, this.getPlayerAttr("maxMp"), "revive");
            return this.reactiveDataManager.getValues(PlayerAttrKeys);
          },
          isAlive: true,
          isActive: true,
          statusEffects: [],
        }),

        // 记录事件
        logEvent: ({ context, event }: { context: MemberContext; event: any }) => {
          // console.log(`🎮 [${context.memberData.name}] 事件: ${event.type}`, (event as any).data || "");
        },
      },
      guards: {
        // 检查是否有后续连击步骤
        hasNextCombo: ({ context, event }: { context: MemberContext; event: any }) => {
          // 检查是否有后续连击步骤
          // 可以根据实际连击逻辑实现
          return false; // 暂时返回false，可以根据实际逻辑调整
        },

        // 检查当前技能是否有蓄力动作
        hasChargeAction: ({ context, event }: { context: MemberContext; event: any }) => {
          // 检查当前技能是否有蓄力动作
          // 可以根据技能配置确定
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
          console.warn(`🎮 [${context.memberData.name}] 技能不可用`);
          return true;
        },

        // 检查玩家是否死亡
        isDead: ({ context }: { context: MemberContext }) => this.getPlayerAttr("maxHp") <= 0,

        // 检查玩家是否存活
        isAlive: ({ context }: { context: MemberContext }) => this.getPlayerAttr("maxHp") > 0,
      },
    }).createMachine({
      id: machineId,
      context: {
        memberData: this.memberData,
        stats: {}, // 使用空的Record作为初始值
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
        type: "initializePlayerState",
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
          description: "玩家存活状态，此时可操作且可影响上下文",
          states: {
            operational: {
              initial: "idle",
              on: {
                controlled: {
                  target: "control_abnormal",
                },
              },
              description: "可响应输入操作",
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
          on: {
            revive_ready: {
              target: `#${machineId}.alive.operational`,
              actions: {
                type: "resetHpMpAndStatus",
              },
            },
          },
          description: "不可操作，中断当前行为，且移出上下文",
        },
      },
    });
  }

  /**
   * 计算玩家基础属性
   * 实现抽象方法，计算玩家特有的属性
   */
  protected calculateBaseStats(
    memberData: MemberWithRelations,
    initialState: { currentHp?: number; currentMp?: number; position?: { x: number; y: number } },
  ): MemberBaseStats {
    // 基于角色数据计算基础属性
    const maxHp = (this.character.vit * this.character.lv) / 3;
    const maxMp = this.character.int * 0.1;

    // 计算攻击力（简化计算）
    const pAtk = this.character.str * 1.0 + this.character.lv;
    const mAtk = this.character.int * 1.0 + this.character.lv;

    // 计算防御力（简化计算）
    const pDef = this.character.armor?.baseAbi || 0;
    const mDef = this.character.armor?.baseAbi || 0;

    // 计算速度（简化计算）
    const aspd = 1000 + this.character.agi * 0.5;
    const mspd = 1000;

    return {
      maxHp,
      currentHp: initialState.currentHp ?? maxHp,
      maxMp,
      currentMp: initialState.currentMp ?? maxMp,
      pAtk,
      mAtk,
      pDef,
      mDef,
      aspd,
      mspd,
      position: initialState.position || { x: 0, y: 0 },
    };
  }

  /**
   * 处理玩家特定事件
   * 实现抽象方法，处理玩家特有的事件
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
        console.log(`🎮 [${this.getName()}] 处理特定事件: ${event.type}`);
        break;
    }
  }

  /**
   * 更新回调
   * 重写父类方法，添加玩家特有的更新逻辑
   */
  protected onUpdate(currentTimestamp: number): void {
    // 更新技能冷却
    this.updateSkillCooldowns();

    // 更新连击状态
    this.updateComboState();

    // 更新玩家特有状态
    this.updatePlayerState(currentTimestamp);
  }

  // ==================== 私有方法 ====================

  /**
   * 处理技能开始事件
   */
  private handleSkillStart(event: MemberEvent): void {
    const skillId = event.data?.skillId;
    if (skillId) {
      console.log(`🎮 [${this.getName()}] 技能开始: ${skillId}`);
    }
  }

  /**
   * 处理技能结束事件
   */
  private handleSkillEnd(event: MemberEvent): void {
    console.log(`🎮 [${this.getName()}] 技能结束`);
  }

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
   * 更新技能冷却
   */
  private updateSkillCooldowns(): void {
    for (const skill of this.character.skills || []) {
      const cooldownInfo = this.skillCooldowns.get(skill.id);
      if (cooldownInfo && cooldownInfo.currentCooldown > 0) {
        cooldownInfo.currentCooldown = Math.max(0, cooldownInfo.currentCooldown - 1);
      }
    }
  }

  /**
   * 更新连击状态
   */
  private updateComboState(): void {
    // 连击状态更新逻辑
    // 这里可以添加连击超时、连击重置等逻辑
  }

  /**
   * 更新玩家特有状态
   */
  private updatePlayerState(currentTimestamp: number): void {
    // 玩家特有状态更新逻辑
    // 例如：自动回复、状态效果处理等
  }

  /**
   * 将属性Map转换为基础属性
   * Player的简化实现，直接通过PlayerAttrEnum数值映射
   */
  // convertMapToStats 方法已移除，现在直接使用响应式系统
}

// ============================== 导出 ==============================

export default Player;
