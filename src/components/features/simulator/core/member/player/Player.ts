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

// ============================== 角色属性系统类型定义 ==============================

/**
 * 玩家属性类型
 */
enum PlayerAttrEnum {
  LV, // 等级
  // 能力值
  STR, // 力量
  INT, // 智力
  VIT, // 耐力
  AGI, // 敏捷
  DEX, // 灵巧
  LUK, // 幸运
  TEC, // 技巧
  MEN, // 异抗
  CRI, // 暴击
  // 基础属性
  MAX_MP, // 最大MP
  MP, // MP
  AGGRO, // 仇恨值
  WEAPON_RANGE, // 武器射程
  HP_REGEN, // HP自然回复
  MP_REGEN, // MP自然回复
  MP_ATK_REGEN, // MP攻击回复
  // 单次伤害增幅
  PHYSICAL_ATK, // 物理攻击
  MAGICAL_ATK, // 魔法攻击
  WEAPON_ATK, // 武器攻击
  UNSHEATHE_ATK, // 拔刀攻击
  PHYSICAL_PIERCE, // 物理贯穿
  MAGICAL_PIERCE, // 魔法贯穿
  PHYSICAL_CRITICAL_RATE, // 暴击率
  PHYSICAL_CRITICAL_DAMAGE, // 暴击伤害
  MAGICAL_CRT_CONVERSION_RATE, // 魔法暴击转化率
  MAGICAL_CRT_DAMAGE_CONVERSION_RATE, // 魔法爆伤转化率
  MAGICAL_CRITICAL_RATE, // 魔法暴击率
  MAGICAL_CRITICAL_DAMAGE, // 魔法暴击伤害
  SHORT_RANGE_DAMAGE, // 近距离威力
  LONG_RANGE_DAMAGE, // 远距离威力
  STRONGER_AGAINST_NETURAL, // 对无属性增强
  STRONGER_AGAINST_Light, // 对光属性增强
  STRONGER_AGAINST_Dark, // 对暗属性增强
  STRONGER_AGAINST_Water, // 对水属性增强
  STRONGER_AGAINST_Fire, // 对火属性增强
  STRONGER_AGAINST_Earth, // 对地属性增强
  STRONGER_AGAINST_Wind, // 对风属性增强
  TOTAL_DAMAGE, // 总伤害
  FINAL_DAMAGE, // 最终伤害
  PHYSICAL_STABILITY, // 稳定率
  MAGIC_STABILITY, // 魔法稳定率
  ACCURACY, // 命中
  ADDITIONAL_PHYSICS, // 物理追击
  ADDITIONAL_MAGIC, // 魔法追击
  ANTICIPATE, // 看穿
  GUARD_BREAK, // 破防
  REFLECT, // 反弹伤害
  ABSOLUTA_ACCURACY, // 绝对命中
  ATK_UP_STR, // 物理攻击提升（力量）
  ATK_UP_INT, // 物理攻击提升（智力）
  ATK_UP_VIT, // 物理攻击提升（耐力）
  ATK_UP_AGI, // 物理攻击提升（敏捷）
  ATK_UP_DEX, // 物理攻击提升（灵巧）
  MATK_UP_STR, // 魔法攻击提升（力量）
  MATK_UP_INT, // 魔法攻击提升（智力）
  MATK_UP_VIT, // 魔法攻击提升（耐力）
  MATK_UP_AGI, // 魔法攻击提升（敏捷）
  MATK_UP_DEX, // 魔法攻击提升（灵巧）
  ATK_DOWN_STR, // 物理攻击下降（力量）
  ATK_DOWN_INT, // 物理攻击下降（智力）
  ATK_DOWN_VIT, // 物理攻击下降（耐力）
  ATK_DOWN_AGI, // 物理攻击下降（敏捷）
  ATK_DOWN_DEX, // 物理攻击下降（灵巧）
  MATK_DOWN_STR, // 魔法攻击下降（力量）
  MATK_DOWN_INT, // 魔法攻击下降（智力）
  MATK_DOWN_VIT, // 魔法攻击下降（耐力）
  MATK_DOWN_AGI, // 魔法攻击下降（敏捷）
  MATK_DOWN_DEX, // 魔法攻击下降（灵巧）
  // 生存能力加成
  MAX_HP, // 最大HP
  HP, // 当前HP
  BODYARMOR_DEF, // 身体装备防御
  PHYSICAL_DEF, // 物理防御
  MAGICAL_DEF, // 魔法防御
  PHYSICAL_RESISTANCE, // 物理抗性
  MAGICAL_RESISTANCE, // 魔法抗性
  NEUTRAL_RESISTANCE, // 无属性抗性
  Light_RESISTANCE, // 光属性抗性
  Dark_RESISTANCE, // 暗属性抗性
  Water_RESISTANCE, // 水属性抗性
  Fire_RESISTANCE, // 火属性抗性
  Earth_RESISTANCE, // 地属性抗性
  Wind_RESISTANCE, // 风属性抗性
  DODGE, // 回避
  AILMENT_RESISTANCE, // 异常抗性
  GUARD_POWER, // 格挡力
  GUARD_RECHANGE, // 格挡回复
  EVASION_RECHARGE, // 闪躲回复
  PHYSICAL_BARRIER, // 物理屏障
  MAGICAL_BARRIER, // 魔法屏障
  FRACTIONAL_BARRIER, // 百分比瓶屏障
  BARRIER_COOLDOWN, // 屏障回复速度
  REDUCE_DMG_FLOOR, // 地面伤害减轻（地刺）
  REDUCE_DMG_METEOR, // 陨石伤害减轻（天火）
  REDUCE_DMG_PLAYER_EPICENTER, // 范围伤害减轻（以玩家为中心的范围伤害）
  REDUCE_DMG_FOE_EPICENTER, // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  REDUCE_DMG_BOWLING, // 贴地伤害减轻（剑气、风刃）
  REDUCE_DMG_BULLET, // 子弹伤害减轻（各种球）
  REDUCE_DMG_STRAIGHT_LINE, // 直线伤害减轻（激光）
  REDUCE_DMG_CHARGE, // 冲撞伤害减轻（怪物的位移技能）
  ABSOLUTE_DODGE, // 绝对回避
  // 速度加成
  ASPD, // 攻击速度
  MSPD, // 行动速度
  MSRD, // 动作缩减
  CSPD, // 咏唱速度
  CSRD, // 咏唱缩减
  // 其他加成
  DROP_RATE, // 掉宝率
  REVIVE_TIME, // 复活时间
  FLINCH_UNAVAILABLE, // 封印胆怯
  TUMBLE_UNAVAILABLE, // 封印翻覆
  STUN_UNAVAILABLE, // 封印昏厥
  INVINCIBLE_AID, // 无敌急救
  EXP_RATE, // 经验加成
  PET_EXP, // 宠物经验
  ITEM_COOLDOWN, // 道具冷却
  RECOIL_DAMAGE, // 反作用伤害
  GEM_POWDER_DROP, // 晶石粉末掉落
  // 中间数值
  WEAPON_MATK_CONVERSION_RATE, // 主武器魔法攻击转换率
  WEAPON_ATK_CONVERSION_RATE, // 主武器物理攻击转换率
  MAINWEAPON_BASE_VALUE, // 主武器基础值
  MAINWEAPON_ATK, // 主武器攻击
  SUBWEAPON_BASE_VALUE, // 副武器基础值
  SUBWEAPON_ATK, // 副武器攻击
  BODYARMOR_BASE_VALUE, // 防具基础值
}
type PlayerAttrType = keyof typeof PlayerAttrEnum;

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
 */
type PlayerEventType = MemberEventType
  | { type: "cast_end", data: { skillId: string } } // 前摇结束
  | { type: "controlled", data: { skillId: string } } // 受到控制
  | { type: "move_command", data: { position: { x: number; y: number } } } // 移动指令
  | { type: "charge_end", data: { skillId: string } } // 蓄力结束
  | { type: "hp_zero", data: { skillId: string } } // HP小于等于0
  | { type: "stop_move", data: { skillId: string } } // 停止移动指令
  | { type: "control_end", data: { skillId: string } } // 控制时间结束
  | { type: "revive_ready", data: { skillId: string } } // 复活倒计时清零
  | { type: "skill_press", data: { skillId: string } } // 按下技能
  | { type: "check_availability", data: { skillId: string } } // 判断可用性
  | { type: "skill_animation_end", data: { skillId: string } } // 技能动作结束
  | { type: "update"; timestamp: number }; // 更新事件（带时间戳）

/**
 * 武器能力转换表类型
 */
interface WeaponAbiConvert {
  weaAtk_Patk_Convert: number;
  weaAtk_Matk_Convert: number;
  abi_Attr_Convert: {
    str: { pAtkC: number; mAtkC: number; pStabC: number; aspdC: number };
    int: { pAtkC: number; mAtkC: number; pStabC: number; aspdC: number };
    agi: { pAtkC: number; mAtkC: number; pStabC: number; aspdC: number };
    dex: { pAtkC: number; mAtkC: number; pStabC: number; aspdC: number };
  };
}

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

  /** 玩家属性Map */
  private playerAttrMap: Map<PlayerAttrEnum, AttrData> = new Map();

  /** 技能冷却状态Map */
  private skillCooldowns: Map<string, { cooldown: number; currentCooldown: number }> = new Map();

  /** 武器能力转换表 */
  private static readonly MainWeaponAbiT: Record<
    MainHandType,
    {
      baseHit: number;
      baseAspd: number;
      weaAtk_Matk_Convert: number;
      weaAtk_Patk_Convert: number;
      abi_Attr_Convert: Record<
        "str" | "int" | "agi" | "dex",
        { pAtkC: number; mAtkC: number; aspdC: number; pStabC: number }
      >;
    }
  > = {
    OneHandSword: {
      baseHit: 0.25,
      baseAspd: 100,
      abi_Attr_Convert: {
        str: {
          pAtkC: 2,
          pStabC: 0.025,
          aspdC: 0.2,
          mAtkC: 0,
        },
        int: {
          mAtkC: 3,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 4.2,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 2,
          pStabC: 0.075,
          mAtkC: 0,
          aspdC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    Katana: {
      baseHit: 0.3,
      baseAspd: 200,
      abi_Attr_Convert: {
        str: {
          pAtkC: 1.5,
          pStabC: 0.075,
          aspdC: 0.3,
          mAtkC: 0,
        },
        int: {
          mAtkC: 1.5,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 3.9,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 2.5,
          pStabC: 0.025,
          mAtkC: 0,
          aspdC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    TwoHandSword: {
      baseHit: 0.15,
      baseAspd: 50,
      abi_Attr_Convert: {
        str: {
          pAtkC: 3,
          aspdC: 0.2,
          mAtkC: 0,
          pStabC: 0,
        },
        int: {
          mAtkC: 3,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 2.2,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 1,
          pStabC: 0.1,
          mAtkC: 0,
          aspdC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    Bow: {
      baseHit: 0.1,
      baseAspd: 75,
      abi_Attr_Convert: {
        str: {
          pAtkC: 1,
          pStabC: 0.05,
          mAtkC: 0,
          aspdC: 0,
        },
        int: {
          mAtkC: 3,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 3.1,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 3,
          pStabC: 0.05,
          aspdC: 0.2,
          mAtkC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    Bowgun: {
      baseHit: 0.05,
      baseAspd: 100,
      abi_Attr_Convert: {
        str: {
          pStabC: 0.05,
          pAtkC: 0,
          mAtkC: 0,
          aspdC: 0,
        },
        int: {
          mAtkC: 3,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 2.2,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 4,
          aspdC: 0.2,
          mAtkC: 0,
          pStabC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    Rod: {
      baseHit: 0.3,
      baseAspd: 60,
      abi_Attr_Convert: {
        str: {
          pAtkC: 3,
          pStabC: 0.05,
          mAtkC: 0,
          aspdC: 0,
        },
        int: {
          mAtkC: 4,
          pAtkC: 1,
          aspdC: 0.2,
          pStabC: 0,
        },
        agi: {
          aspdC: 1.8,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          aspdC: 0.2,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
      },
      weaAtk_Matk_Convert: 1,
      weaAtk_Patk_Convert: 1,
    },
    Magictool: {
      baseHit: 0.1,
      baseAspd: 90,
      abi_Attr_Convert: {
        str: {
          pAtkC: 0,
          mAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        int: {
          mAtkC: 4,
          pAtkC: 2,
          aspdC: 0.2,
          pStabC: 0,
        },
        agi: {
          pAtkC: 2,
          aspdC: 4,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pStabC: 0.1,
          pAtkC: 0,
          mAtkC: 1,
          aspdC: 0,
        },
      },
      weaAtk_Matk_Convert: 1,
      weaAtk_Patk_Convert: 1,
    },
    Knuckle: {
      baseHit: 0.1,
      baseAspd: 120,
      abi_Attr_Convert: {
        str: {
          aspdC: 0.1,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        int: {
          mAtkC: 4,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          pAtkC: 2,
          aspdC: 4.6,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 0.5,
          pStabC: 0.025,
          mAtkC: 0,
          aspdC: 0.1,
        },
      },
      weaAtk_Matk_Convert: 0.5,
      weaAtk_Patk_Convert: 1,
    },
    Halberd: {
      baseHit: 0.25,
      baseAspd: 20,
      abi_Attr_Convert: {
        str: {
          pAtkC: 2.5,
          pStabC: 0.05,
          aspdC: 0.2,
          mAtkC: 0,
        },
        int: {
          mAtkC: 2,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 3.5,
          pAtkC: 1.5,
          mAtkC: 1,
          pStabC: 0,
        },
        dex: {
          pStabC: 0.05,
          pAtkC: 0,
          mAtkC: 0,
          aspdC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    None: {
      baseHit: 50,
      baseAspd: 1000,
      abi_Attr_Convert: {
        str: {
          pAtkC: 1,
          mAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        int: {
          mAtkC: 3,
          pAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
        agi: {
          aspdC: 9.6,
          pAtkC: 0,
          mAtkC: 0,
          pStabC: 0,
        },
        dex: {
          pAtkC: 0,
          mAtkC: 0,
          aspdC: 0,
          pStabC: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
  };

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

    // 初始化玩家属性Map
    this.initializePlayerAttrMap(memberData);

    // 重新初始化状态机（此时playerAttrMap已经准备好）
    this.actor = createActor(this.createStateMachine(initialState));
    this.actor.start();

    console.log(`🎮 已创建玩家: ${memberData.name}，data:`, this);
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
   * 获取玩家属性Map中的属性值
   *
   * @param attrName 属性名称
   * @returns 属性值
   */
  getPlayerAttr(attrName: PlayerAttrEnum): number {
    const attr = this.playerAttrMap.get(attrName);
    if (!attr) throw new Error(`属性不存在: ${attrName}`);
    return Member.dynamicTotalValue(attr);
  }

  /**
   * 设置玩家属性Map中的属性值
   *
   * @param attrName 属性名称
   * @param value 属性值
   */
  setPlayerAttr(attrName: PlayerAttrEnum, targetType: TargetType, value: number, origin: string): void {
    const attr = this.playerAttrMap.get(attrName);
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
      console.log(`🎮 [${this.getName()}] 更新属性: ${attrName} = ${value} 来源: ${origin}`);
    } else {
      throw new Error(`属性不存在: ${attrName}`);
    }
  }

  // 需要提升到Member中
  /**
   * 获取玩家属性Map的快照
   *
   * @returns 属性Map快照
   */
  getPlayerAttrSnapshot(): Readonly<Record<string, Readonly<AttrData>>> {
    const snapshot: Record<string, AttrData> = {};

    for (const [attrName, attr] of this.playerAttrMap.entries()) {
      // 使用结构化克隆确保真正的深拷贝
      snapshot[attrName] = structuredClone(attr);
    }

    // 返回只读视图，防止意外修改
    return Object.freeze(
      Object.fromEntries(Object.entries(snapshot).map(([key, value]) => [key, Object.freeze(value)])),
    ) as Readonly<Record<string, Readonly<AttrData>>>;
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
          stats: ({ context }) => this.playerAttrMap,
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
            this.setPlayerAttr(
              PlayerAttrEnum.HP,
              TargetType.baseValue,
              this.getPlayerAttr(PlayerAttrEnum.MAX_HP),
              "revive",
            );
            this.setPlayerAttr(
              PlayerAttrEnum.MP,
              TargetType.baseValue,
              this.getPlayerAttr(PlayerAttrEnum.MAX_MP),
              "revive",
            );
            return this.playerAttrMap;
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
        isDead: ({ context }: { context: MemberContext }) =>
          Member.dynamicTotalValue(context.stats.get(PlayerAttrEnum.HP)) <= 0,

        // 检查玩家是否存活
        isAlive: ({ context }: { context: MemberContext }) =>
          Member.dynamicTotalValue(context.stats.get(PlayerAttrEnum.HP)) > 0,
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
    const physicalAtk = this.character.str * 1.0 + this.character.lv;
    const magicalAtk = this.character.int * 1.0 + this.character.lv;

    // 计算防御力（简化计算）
    const physicalDef = this.character.armor?.baseAbi || 0;
    const magicalDef = this.character.armor?.baseAbi || 0;

    // 计算速度（简化计算）
    const aspd = 1000 + this.character.agi * 0.5;
    const mspd = 1000;

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
   * 初始化玩家属性Map
   *
   * @param memberData 成员数据
   */
  private initializePlayerAttrMap(memberData: MemberWithRelations): void {
    if (!isPlayerMember(memberData)) return;

    const character = memberData.player.character;
    if (!character) return;

    // 获取武器类型
    const weaponType = character.weapon.template.type;
    const weaponAbiT = Player.MainWeaponAbiT[weaponType as MainHandType];

    // 辅助函数：获取属性值
    const d = (attrName: PlayerAttrEnum): number => {
      const attr = this.playerAttrMap.get(attrName);
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
    for (const attrType of Object.values(PlayerAttrEnum)) {
      if (typeof attrType === "number") {
        this.playerAttrMap.set(attrType, {
          type: ValueType.user,
          name: PlayerAttrEnum[attrType],
          baseValue: this.getBaseValueFromCharacter(attrType, character),
          modifiers: DefaultModifiersData,
          influences: this.getInfluencesForAttr(attrType, weaponAbiT, d),
        });
      }
    }

    console.log(`🎮 [${this.getName()}] 初始化玩家属性Map完成，共${this.playerAttrMap.size}个属性`);
  }

  /**
   * 从角色数据获取基础值
   */
  private getBaseValueFromCharacter(attrType: PlayerAttrEnum, character: CharacterWithRelations): number {
    switch (attrType) {
      case PlayerAttrEnum.STR:
        return character.str;
      case PlayerAttrEnum.INT:
        return character.int;
      case PlayerAttrEnum.VIT:
        return character.vit;
      case PlayerAttrEnum.AGI:
        return character.agi;
      case PlayerAttrEnum.DEX:
        return character.dex;
      case PlayerAttrEnum.LUK:
        return character.personalityType === "Luk" ? character.personalityValue : 0;
      case PlayerAttrEnum.TEC:
        return character.personalityType === "Tec" ? character.personalityValue : 0;
      case PlayerAttrEnum.MEN:
        return character.personalityType === "Men" ? character.personalityValue : 0;
      case PlayerAttrEnum.CRI:
        return character.personalityType === "Cri" ? character.personalityValue : 0;
      case PlayerAttrEnum.LV:
        return character.lv;
      default:
        return 0;
    }
  }

  /**
   * 获取属性的影响关系
   */
  private getInfluencesForAttr(
    attrType: PlayerAttrEnum,
    weaponAbiT: WeaponAbiConvert,
    d: (attrName: PlayerAttrEnum) => number,
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
  protected convertMapToStats(statsMap: Map<Number, AttrData>): MemberBaseStats {
    const currentState = this.getCurrentState();
    const position = currentState?.context?.position || { x: 0, y: 0 };

    const baseStats: MemberBaseStats = {
      maxHp: 1000,
      currentHp: 1000,
      maxMp: 100,
      currentMp: 100,
      physicalAtk: 100,
      magicalAtk: 100,
      physicalDef: 50,
      magicalDef: 50,
      aspd: 1.0,
      mspd: 100,
      position,
    };

    // 直接通过PlayerAttrEnum数值映射
    const maxHp = statsMap.get(PlayerAttrEnum.MAX_HP); // MAX_HP
    const currentHp = statsMap.get(PlayerAttrEnum.HP); // HP
    const maxMp = statsMap.get(PlayerAttrEnum.MAX_MP); // MAX_MP
    const currentMp = statsMap.get(PlayerAttrEnum.MP); // MP
    const physicalAtk = statsMap.get(PlayerAttrEnum.PHYSICAL_ATK); // PHYSICAL_ATK
    const magicalAtk = statsMap.get(PlayerAttrEnum.MAGICAL_ATK); // MAGICAL_ATK
    const physicalDef = statsMap.get(PlayerAttrEnum.PHYSICAL_DEF); // PHYSICAL_DEF
    const magicalDef = statsMap.get(PlayerAttrEnum.MAGICAL_DEF); // MAGICAL_DEF
    const aspd = statsMap.get(PlayerAttrEnum.ASPD); // ASPD
    const mspd = statsMap.get(PlayerAttrEnum.MSPD); // MSPD

    if (maxHp) baseStats.maxHp = Member.dynamicTotalValue(maxHp);
    if (currentHp) baseStats.currentHp = Member.dynamicTotalValue(currentHp);
    if (maxMp) baseStats.maxMp = Member.dynamicTotalValue(maxMp);
    if (currentMp) baseStats.currentMp = Member.dynamicTotalValue(currentMp);
    if (physicalAtk) baseStats.physicalAtk = Member.dynamicTotalValue(physicalAtk);
    if (magicalAtk) baseStats.magicalAtk = Member.dynamicTotalValue(magicalAtk);
    if (physicalDef) baseStats.physicalDef = Member.dynamicTotalValue(physicalDef);
    if (magicalDef) baseStats.magicalDef = Member.dynamicTotalValue(magicalDef);
    if (aspd) baseStats.aspd = Member.dynamicTotalValue(aspd);
    if (mspd) baseStats.mspd = Member.dynamicTotalValue(mspd);

    return baseStats;
  }
}

// ============================== 导出 ==============================

export default Player;
