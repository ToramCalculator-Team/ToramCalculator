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

import type { MainHandType, SubHandType } from "@db/schema/enums";
import { ComboWithRelations } from "@db/repositories/combo";
import { PlayerAttrKeys, PlayerAttrSchema } from "./PlayerData";
import { ModifierSource, ReactiveSystem, ExtractAttrPaths } from "../ReactiveSystem";

import type GameEngine from "../../GameEngine";

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

type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchema>>;

/**
 * 玩家成员类
 * 实现玩家特有的属性和行为
 */
export class Player extends Member<PlayerAttrType> {
  // ==================== 玩家特有属性 ====================

  /** 玩家角色数据（包含所有装备、技能、连击等信息），仅在初始哈过程中使用 */
  private character: CharacterWithRelations;

  // ==================== 玩家属性系统 ====================

  /** 技能冷却状态Map */
  private skillCooldowns: Map<string, { cooldown: number; currentCooldown: number }> = new Map();

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param memberData 成员数据
   * @param engine 游戏引擎实例
   * @param initialState 初始状态
   */
  constructor(
    memberData: MemberWithRelations,
    engine: GameEngine,
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

    // 获取角色数据
    const character = memberData.player.character;
    if (!character) {
      throw new Error("玩家角色数据缺失");
    }

    // 创建响应式配置
    const playerSchema =  PlayerAttrSchema({
      mainWeaponType: character.weapon.type as MainHandType,
      subWeaponType: character.subWeapon.type as SubHandType,
    })

    // 调用父类构造函数，注入游戏引擎、FSM事件桥和响应式配置
    super(memberData, engine, playerSchema, initialState);

    // 设置角色数据
    this.character = character;

    // 初始化玩家数据（响应式系统已由基类初始化）
    this.initializePlayerData();

    console.log(`🎮 已创建玩家: ${memberData.name}`);
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化玩家数据
   */
  private initializePlayerData(): void {
    this.reactiveDataManager.setBaseValues({
      lv: this.character.lv,
      aggro: 0,
      physical: 0,
      magical: 0,
      unsheathe: 0,
      total: 0,
      final: 0,
      accuracy: 0,
      anticipate: 0,
      guardBreak: 0,
      reflect: 0,
      absolute: 0,
      abiStr: 0,
      abiInt: 0,
      abiVit: 0,
      abiAgi: 0,
      abiDex: 0,
      abiLuk: 0,
      abiTec: 0,
      abiMen: 0,
      abiCri: 0,
      hpMax: 0,
      hpCurrent: 0,
      hpRegen: 0,
      mpMax: 0,
      mpCurrent: 0,
      mpRegen: 0,
      mpAtkRegen: 0,
      equipWeaponMainRange: 0,
      equipWeaponMainStability: 0,
      equipWeaponMainBaseAtk: 0,
      equipWeaponMainType: 0,
      equipWeaponMainRef: 0,
      equipWeaponSubRange: 0,
      equipWeaponSubStability: 0,
      equipWeaponSubType: 0,
      equipWeaponSubRef: 0,
      equipWeaponAttackPhysical: 0,
      equipWeaponAttackMagical: 0,
      equipWeaponAttackTotal: 0,
      equipArmorType: 0,
      equipArmorRef: 0,
      equipArmorBaseAbi: 0,
      equipAdditionalRef: 0,
      equipAdditionalBaseAbi: 0,
      equipSpecialBaseAbi: 0,
      piercePhysical: 0,
      pierceMagical: 0,
      criticalPhysicalRate: 0,
      criticalPhysicalDamage: 0,
      criticalMagicalRate: 0,
      criticalMagicalDamage: 0,
      criticalMagicalConvRate: 0,
      criticalMagicalDmgConvRate: 0,
      rangeShort: 0,
      rangeLong: 0,
      elementNeutral: 0,
      elementLight: 0,
      elementDark: 0,
      elementWater: 0,
      elementFire: 0,
      elementEarth: 0,
      elementWind: 0,
      stabilityPhysical: 0,
      stabilityMagical: 0,
      pursuitPhysical: 0,
      pursuitMagical: 0
    });
    // 解析角色配置中的修饰器
    this.reactiveDataManager.parseModifiersFromCharacter(this.character, "角色配置");

    console.log("✅ 玩家数据初始化完成");
  }

  /**
   * 获取玩家属性
   * 直接从响应式系统获取计算结果
   */
  getStats(): Record<PlayerAttrType, number> {
    return this.reactiveDataManager.getValues(Object.keys(this.attrSchema) as PlayerAttrType[]);
  }

  // ==================== 基类抽象方法实现 ====================

  /**
   * 获取玩家属性键数组
   */

  /**
   * 获取玩家属性表达式映射
   */
  /**
   * 获取玩家默认属性值
   * 可以覆盖基类的通用属性默认值
   */
  protected getDefaultAttrValues(): Record<string, number> {
    return {
      // 玩家特有的默认值，可以覆盖基类
      lv: 1,
      str: 10,
      int: 10,
      vit: 10,
      agi: 10,
      dex: 10,
      // 可以覆盖基类的通用属性
      maxHp: 2000, // 玩家比基类默认值更高
      maxMp: 200, // 玩家比基类默认值更高
      pAtk: 150, // 玩家初始攻击力更高
      mAtk: 120, // 玩家初始魔攻更高
    };
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
   * 获取属性值
   *
   * @param attrName 属性名称
   * @returns 属性值
   */
  getAttributeValue(attrName: PlayerAttrType): number {
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
  setAttributeValue(attrName: PlayerAttrType, targetType: TargetType, value: number, origin: string): void {
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
    return this.reactiveDataManager.getValues(Object.keys(this.attrSchema) as PlayerAttrType[]);
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
    attrName: PlayerAttrType,
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
  getReactiveDataManager(): ReactiveSystem<PlayerAttrType> {
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
          stats: ({ context }) => this.reactiveDataManager.getValues(Object.keys(this.attrSchema) as PlayerAttrType[]),
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
            this.setAttributeValue("hpMax", TargetType.baseValue, this.getAttributeValue("hpMax"), "revive");
            this.setAttributeValue("mpMax", TargetType.baseValue, this.getAttributeValue("mpMax"), "revive");
            return this.reactiveDataManager.getValues(Object.keys(this.attrSchema) as PlayerAttrType[]);
          },
          isAlive: true,
          isActive: true,
          statusEffects: [],
        }),

        // 记录事件
        logEvent: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 事件: ${event.type}`, (event as any).data || "");
        },

        // 处理自定义事件（精简架构：FSM转换事件到EventQueue，保持统一执行）
        processCustomEvent: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🔄 [${context.memberData.name}] FSM转换自定义事件到执行队列:`, event.data);
          
          try {
            // FSM负责事件转换，不直接执行业务逻辑
            const gameEvent = {
              id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
              type: 'custom' as const,
              priority: 'normal' as const,
              executeFrame: this.engine.getFrameLoop().getFrameNumber() + 1, // 下一帧执行
              payload: {
                targetMemberId: this.id,
                memberType: this.type,
                action: event.data.action || 'execute',
                scriptCode: event.data.scriptCode,
                attribute: event.data.attribute,
                value: event.data.value,
                sourceEvent: 'fsm_custom',
                timestamp: Date.now(),
                ...event.data
              },
              source: 'player_fsm'
            };
            
            // 插入到事件队列，由EventExecutor统一处理
            this.engine.getEventQueue().insert(gameEvent);
            console.log(`✅ [${context.memberData.name}] 自定义事件已转换并加入执行队列`);
            
          } catch (error) {
            console.error(`❌ [${context.memberData.name}] FSM事件转换失败:`, error);
          }
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
        isDead: ({ context }: { context: MemberContext }) => this.getAttributeValue("hpMax") <= 0,

        // 检查玩家是否存活
        isAlive: ({ context }: { context: MemberContext }) => this.getAttributeValue("hpMax") > 0,
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
              actions: ["processCustomEvent", "logEvent"],
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
