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
import { PlayerAttrSchema } from "./PlayerData";
import { ModifierSource, ReactiveSystem, ExtractAttrPaths, ModifierType } from "../ReactiveSystem";

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
class Player extends Member<PlayerAttrType> {
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
    const playerSchema = PlayerAttrSchema(character);

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
    // 设置基础值，使用DSL路径作为键名
    this.reactiveDataManager.addModifier(
        "lv",
        ModifierType.BASE_VALUE,
        this.character.lv,
        {
            id: "player_base",
            name: "player_base",
            type: "system",
        }
    );

    // 解析角色配置中的修饰器
    function findAllModifiersWithPath(obj: any, path: string[] = []): void {
      if (typeof obj !== "object" || obj === null) return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];

        if (key === "modifiers" && Array.isArray(value) && value.every((v) => typeof v === "string")) {
          const fullPath = currentPath.join(".");
          console.log(`📌 从${path.join(".")}中找到修饰符: ${fullPath}`);
          for (const mod of value) {
            // console.log(` - ${mod}`);
            // TODO: 添加修饰符
          }
        } else if (typeof value === "object") {
          findAllModifiersWithPath(value, currentPath);
        }
      }
    }

    findAllModifiersWithPath(this.character);

    // 示例：可以根据角色数据添加各种修饰符
    // this.addModifier("str", "staticFixed", character.equipmentBonus?.str || 0, source);

    console.log("✅ 玩家数据初始化完成");
  }

  /**
   * 获取玩家属性
   * 直接从响应式系统获取计算结果
   */
  getStats(): Record<PlayerAttrType, number> {
    return this.reactiveDataManager.getValues(Object.keys(this.attrSchema) as PlayerAttrType[]);
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
  addAttributeModifier(attrName: PlayerAttrType, type: ModifierType, value: number, source: ModifierSource): void {
    this.reactiveDataManager.addModifier(attrName, type, value, source);
    console.log(`🎮 [${this.getName()}] 添加修饰符: ${attrName} ${type} +${value} (来源: ${source.name})`);
  }

  /**
   * 移除属性修饰符
   *
   * @param attrName 属性名称
   * @param type 修饰符类型
   * @param sourceId 来源ID
   */
  removeAttributeModifier(attrName: PlayerAttrType, type: ModifierType, sourceId: string): void {
    this.reactiveDataManager.removeModifier(attrName, type, sourceId);
    console.log(`🎮 [${this.getName()}] 移除修饰符: ${attrName} (来源: ${sourceId})`);
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
          try {
            const data = (event as any)?.data || {};
            const skillId = data?.skillId;
            const currentFrame = this.engine.getFrameLoop().getFrameNumber();
            const executor = this.engine.getFrameLoop().getEventExecutor();

            // 扣除 MP（默认 1600，可表达式）
            let mpCost = 1600;
            if (typeof data?.mpCost === "number") mpCost = data.mpCost;
            if (typeof data?.mpCostExpr === "string" && data.mpCostExpr.trim()) {
              const res = executor.executeExpression(data.mpCostExpr, {
                currentFrame,
                caster: this,
                skill: { id: skillId },
              } as any);
              if (res.success && Number.isFinite(res.value)) mpCost = Math.max(0, Math.round(res.value));
            }
            const currentMp = this.getAttributeValue("mp.current");
            const newMp = Math.max(0, (typeof currentMp === "number" ? currentMp : 0) - mpCost);
            this.engine.getEventQueue().insert({
              id: `mp_cost_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              executeFrame: currentFrame,
              priority: "high",
              type: "custom",
              payload: { action: "modify_attribute", targetMemberId: this.id, attribute: "mp.current", value: newMp },
            });

            // 计算前摇帧数（默认 100，可表达式）
            let preCastFrames = 100;
            if (typeof data?.preCastFrames === "number") preCastFrames = Math.max(0, Math.round(data.preCastFrames));
            if (typeof data?.preCastExpr === "string" && data.preCastExpr.trim()) {
              const res = executor.executeExpression(data.preCastExpr, {
                currentFrame,
                caster: this,
                skill: { id: skillId },
              } as any);
              if (res.success && Number.isFinite(res.value)) preCastFrames = Math.max(0, Math.round(res.value));
            }

            // 调度前摇结束
            this.engine.getEventQueue().insert({
              id: `fsm_cast_end_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              executeFrame: currentFrame + preCastFrames,
              priority: "high",
              type: "member_fsm_event",
              payload: { targetMemberId: this.id, fsmEventType: "cast_end", data: { skillId } },
              source: "player_fsm",
              actionId: skillId ? `skill_${skillId}` : undefined,
            });
          } catch {}
        },

        onCastEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 前摇结束事件`);
        },

        onSkillEffect: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 技能效果事件`);
          try {
            const data = (event as any)?.data || {};
            const skillId = data?.skillId;
            const currentFrame = this.engine.getFrameLoop().getFrameNumber();
            // 交给引擎执行技能效果；处理器完成后自行追加动画结束的 FSM 事件
            this.engine.getEventQueue().insert({
              id: `skill_effect_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              executeFrame: currentFrame,
              priority: "high",
              type: "skill_effect",
              payload: {
                memberId: this.id,
                skillId,
                animationFrames:
                  typeof data?.animationFrames === "number" ? Math.max(0, Math.round(data.animationFrames)) : undefined,
                animationExpr: typeof data?.animationExpr === "string" ? data.animationExpr : undefined,
              },
              source: "player_fsm",
              actionId: skillId ? `skill_${skillId}` : undefined,
            });
          } catch {}
        },

        onSkillAnimationEnd: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 技能动画结束事件`);
          this.handleSkillEnd(event as MemberEvent);
        },

        onChargeStart: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 开始蓄力事件`);
          try {
            const data = (event as any)?.data || {};
            const skillId = data?.skillId;
            const currentFrame = this.engine.getFrameLoop().getFrameNumber();
            const executor = this.engine.getFrameLoop().getEventExecutor();

            let chargeFrames = 100;
            if (typeof data?.chargeFrames === "number") chargeFrames = Math.max(0, Math.round(data.chargeFrames));
            if (typeof data?.chargeExpr === "string" && data.chargeExpr.trim()) {
              const res = executor.executeExpression(data.chargeExpr, {
                currentFrame,
                caster: this,
                skill: { id: skillId },
              } as any);
              if (res.success && Number.isFinite(res.value)) chargeFrames = Math.max(0, Math.round(res.value));
            }

            this.engine.getEventQueue().insert({
              id: `fsm_charge_end_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              executeFrame: currentFrame + chargeFrames,
              priority: "high",
              type: "member_fsm_event",
              payload: {
                targetMemberId: this.id,
                fsmEventType: "charge_end",
                data: { skillId },
              },
              source: "player_fsm",
              actionId: skillId ? `skill_${skillId}` : undefined,
            });
          } catch {}
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
            this.addModifier("hp.max", ModifierType.BASE_VALUE, this.getAttributeValue("hp.max"), {
              id: "revive",
              name: "系统重置",
              type: "system",
            });
            this.addModifier("mp.max", ModifierType.BASE_VALUE, this.getAttributeValue("mp.max"), {
              id: "revive",
              name: "系统重置",
              type: "system",
            });
            return this.reactiveDataManager.getValues(Object.keys(this.attrSchema) as PlayerAttrType[]);
          },
          isAlive: true,
          isActive: true,
          statusEffects: [],
        }),

        // 记录事件
        logEvent: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 [${context.memberData.name}] 的logEvent事件: ${event.type}`, (event as any).data || "");
        },

        // 处理自定义事件（精简架构：FSM转换事件到EventQueue，保持统一执行）
        processCustomEvent: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🔄 [${context.memberData.name}] FSM转换自定义事件到执行队列:`, event.data);

          try {
            // FSM负责事件转换，不直接执行业务逻辑
            const gameEvent = {
              id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
              type: "custom" as const,
              priority: "normal" as const,
              executeFrame: this.engine.getFrameLoop().getFrameNumber() + 1, // 下一帧执行
              payload: {
                targetMemberId: this.id,
                memberType: this.type,
                action: event.data.action || "execute",
                scriptCode: event.data.scriptCode,
                attribute: event.data.attribute,
                value: event.data.value,
                sourceEvent: "fsm_custom",
                timestamp: Date.now(),
                ...event.data,
              },
              source: "player_fsm",
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
          console.log(`🎮 检查[${context.memberData.name}] 是否有后续连击步骤`);
          // 检查是否有后续连击步骤
          // 可以根据实际连击逻辑实现
          return false; // 暂时返回false，可以根据实际逻辑调整
        },

        // 检查当前技能是否有蓄力动作（正向 guard）
        hasChargeAction: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 检查[${context.memberData.name}] 技能是否有蓄力动作`);
          // TODO: 基于技能模板判断是否需要蓄力
          return false; // 先保留占位实现
        },

        // 技能可用性检查（汇总冷却/资源/状态）
        isSkillAvailable: ({ context, event }: { context: MemberContext; event: any }) => {
          console.log(`🎮 检查[${context.memberData.name}] 技能是否可用`);
          // TODO: 汇总沉默/冷却/MP/HP等检查
          return this.isActive();
        },

        // 检查玩家是否死亡
        isDead: ({ context }: { context: MemberContext }) => {
          const isDead = this.getAttributeValue("hp.current") <= 0;
          console.log(`🎮 检查[${context.memberData.name}] 是否死亡: ${isDead}`);
          return isDead;
        },

        // 检查玩家是否存活
        isAlive: ({ context }: { context: MemberContext }) => {
          const isAlive = this.getAttributeValue("hp.current") > 0;
          console.log(`🎮 检查[${context.memberData.name}] 是否存活: ${isAlive}`);
          return isAlive;
        },
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
                    move_command: { target: "moving" },
                    skill_press: [
                      {
                        guard: "isSkillAvailable",
                        target: "skill_casting.pre_cast",
                        actions: ["onSkillStart"],
                      },
                      {
                        target: `#${machineId}.alive.operational.idle`,
                        actions: ["logEvent"],
                      },
                    ],
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
                        skill_press: [
                          {
                            target: "pre_cast",
                            guard: "isSkillAvailable",
                            actions: ["onSkillStart"],
                          },
                          // 默认分支：不可用时回到 idle，并提示
                          {
                            target: `#${machineId}.alive.operational.idle`,
                            actions: ["logEvent"],
                          },
                        ],
                      },
                    },
                    pre_cast: {
                      on: {
                        cast_end: [
                          {
                            target: "charge",
                            guard: "hasChargeAction",
                          },
                          // 默认分支：无蓄力则直接进入效果
                          {
                            target: "skill_effect",
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
