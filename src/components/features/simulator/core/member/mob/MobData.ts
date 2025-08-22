/**
 * 玩家数据配置
 */
import { MobWithRelations } from "@db/repositories/mob";
import { ConvertToNestedSchema, ConvertToNestedSchemaDic, ConvertToSchema } from "../../dataSys/SchemaTypes";
import { MemberBaseStructure } from "../MemberBaseSchema";

// ============================== 基础结构定义 ==============================

/**
 * 成员基础结构定义
 *
 * 这个接口定义了成员的基本属性结构，使用null作为占位符
 * 通过类型推导可以自动生成Schema、NestedSchema或NestedSchemaDic类型
 */
export interface MobDataStructure extends MemberBaseStructure {
};

/**
 * 将基础结构转换为NestedSchema类型
 *
 * 递归地将null值转换为SchemaAttribute，需要提供属性工厂类型
 */
export type MobDataNestedSchema = ConvertToNestedSchema<MobDataStructure>;

/**
 * 将基础结构转换为NestedSchemaDic类型
 *
 * 递归地将null值转换为多语言对象，需要提供多语言工厂类型
 */
export type MobDataNestedSchemaDic = ConvertToNestedSchemaDic<MobDataStructure>;

export const MobAttrSchema = (mob: MobWithRelations): MobDataNestedSchema => ({
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
      expression: "hp.max",
    },
  },
  mp: {
    max: {
      displayName: "最大MP",
      expression: `0`,
    },
    current: {
      displayName: "当前MP",
      expression: "mp.max",
    },
  },
  atk: {
    p: {
      displayName: "物理攻击",
      expression: `0`,
    },
    m: {
      displayName: "魔法攻击",
      expression: `0`,
    },
  },
  def: {
    p: {
      displayName: "物理防御",
      expression: `${mob.physicalDefense}`,
    },
    m: {
      displayName: "魔法防御",
      expression: `${mob.magicalDefense}`,
    },
  },
  c: {
    rate: {
      p: {
        displayName: "物理暴击率",
        expression: `${0}`,
      },
      m: {
        displayName: "魔法暴击率",
        expression: `${0}`,
      },
    },
    dmg: {
      p: {
        displayName: "物理暴击伤害",
        expression: `${0}`,
      },
      m: {
        displayName: "魔法暴击伤害",
        expression: `${0}`,
      },
    },
  },
  stab: {
    p: {
      displayName: "物理稳定率",
      expression: `${0}`,
    },
    m: {
      displayName: "魔法稳定",
      expression: `${0}`,
    },
  },
  red: {
    p: {
      displayName: "物理抗性",
      expression: `${0}`,
    },
    m: {
      displayName: "魔法抗性",
      expression: `${0}`,
    },
    rate: {
      displayName: "百分比伤害抗性",
      expression: `${0}`,
    },
    water: {
      displayName: "水属性伤害",
      expression: `${0}`,
    },
    fire: {
      displayName: "火属性伤害",
      expression: `${0}`,
    },
    earth: {
      displayName: "地属性伤害",
      expression: `${0}`,
    },
    wind: {
      displayName: "风属性伤害",
      expression: `${0}`,
    },
    light: {
      displayName: "光属性伤害",
      expression: `${0}`,
    },
    dark: {
      displayName: "暗属性伤害",
      expression: `${0}`,
    },
    normal: {
      displayName: "无属性伤害",
      expression: `${0}`,
    },
  },
  accuracy: {
    displayName: "命中",
    expression: `${0}`,
  },
  avoid: {
    displayName: "回避",
    expression: `${0}`,
  },
  guardRate: {
    displayName: "格挡率",
    expression: `${0}`,
  },
  dodgeRate: {
    displayName: "闪躲率",
    expression: `${0}`,
  },
});
