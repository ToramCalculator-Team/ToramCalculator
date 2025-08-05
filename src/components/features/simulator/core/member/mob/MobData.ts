/**
 * 玩家数据配置
 */
import { MobWithRelations } from "@db/repositories/mob";
import { MainHandType, SubHandType } from "@db/schema/enums";

/*
 * 命名说明：
 * XX基础值：指的是可被百分比加成和常数加成增幅的属性，比如基础智力（可被百分比智力加成和常数智力加成增幅）、
 *          基础武器攻击（可被百分比武器攻击加成和常数武器攻击加成增幅）
 *
 * 物理相关：physical → p
 * 魔法相关：magical → m
 * 攻击相关：attack → atk
 * 防御相关：defense → def
 * 抗性相关：resistance → res
 * 伤害相关：damage → dmg
 * 减轻相关：reduce → red
 * 增强相关：strongerAgainst → vs
 * 转换率相关：conversionRate → conv
 * 基础值相关：baseValue → base
 */

// ============================== 计算层类型 ==============================
// 类型枚举
export enum MobAttrEnum {
  // 基础属性
  lv, // 等级
  maxHp, // 最大HP
  currentHp, // 当前HP
  // 攻击属性
  pAtk, // 物理攻击
  mAtk, // 魔法攻击
  pCritRate, // 物理暴击率
  pCritDmg, // 物理暴击伤害
  pStab, // 物理稳定率
  accuracy, // 命中
  // 防御属性
  pDef, // 物理防御
  mDef, // 魔法防御
  pRes, // 物理抗性
  mRes, // 魔法抗性
  neutralRes, // 无属性抗性
  lightRes, // 光属性抗性
  darkRes, // 暗属性抗性
  waterRes, // 水属性抗性
  fireRes, // 火属性抗性
  earthRes, // 地属性抗性
  windRes, // 风属性抗性
  // 生存能力
  dodge, // 回避
  ailmentRes, // 异常抗性
  guardPower, // 格挡力
  guardRecharge, // 格挡回复
  evasionRecharge, // 闪躲回复
  // 速度属性
  aspd, // 攻击速度
  cspd, // 咏唱速度
  mspd, // 行动速度
  // 其他属性
  radius, // 半径
  captureable, // 是否可捕获
  experience, // 经验值
  partsExperience, // 部位经验值
}
// 字符串类型
export type MobAttrType = keyof typeof MobAttrEnum;
// 调试用的字典
export const MobAttrDic: Record<MobAttrType, string> = {
  lv: "lv",
  maxHp: "maxHp",
  currentHp: "currentHp",
  pAtk: "pAtk",
  mAtk: "mAtk",
  pCritRate: "pCritRate",
  pCritDmg: "pCritDmg",
  pStab: "pStab",
  accuracy: "accuracy",
  pDef: "pDef",
  mDef: "mDef",
  pRes: "pRes",
  mRes: "mRes",
  neutralRes: "",
  lightRes: "",
  darkRes: "",
  waterRes: "",
  fireRes: "",
  earthRes: "",
  windRes: "",
  dodge: "",
  ailmentRes: "",
  guardPower: "",
  guardRecharge: "",
  evasionRecharge: "",
  aspd: "",
  cspd: "",
  mspd: "",
  radius: "",
  captureable: "",
  experience: "",
  partsExperience: "",
};
// 字符串键列表
export const MobAttrKeys = Object.keys(MobAttrDic) as MobAttrType[];
// 与原属数据层的映射关系
export const MobAttrExpressionsMap = new Map<MobAttrType, { expression: string; isBase?: boolean }>([]);

export const MobAttrSchema = (mob: MobWithRelations) => ({
  // ============================== 基础信息 ==============================
  lv: {
    displayName: "等级",
    expression: `${mob.baseLv}`,
  },

  // ============================== 生命值 ==============================
  hp: {
    max: {
      displayName: "最大HP",
      expression: `${mob.maxhp}`,
    },
    current: {
      displayName: "当前HP",
      expression: "0",
    },
  },
});
