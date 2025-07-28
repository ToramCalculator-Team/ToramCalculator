/**
 * 玩家数据类 - 完整实现
 *
 * 基于优化的响应式系统，完全兼容 old.worker.ts 的 CharacterData
 * 提供高性能的属性计算和依赖管理
 */

import { CharacterAttrEnum, MainWeaponAbiT, SubWeaponModifier } from "./utils";
import { ReactiveDataManager, type ModifierSource, type ComputeContext } from "./ReactiveSystem";
import { ATTRIBUTE_EXPRESSIONS } from "./attributeExpressions";
import { MainHandType, SubHandType } from "@db/schema/enums";
import type { CharacterWithRelations } from "@db/repositories/character";
import { PlayerWithRelations } from "@db/repositories/player";
import { WeaponWithRelations } from "@db/repositories/weapon";
import { defaultData } from "@db/defaultData";

// ============================== 玩家数据类 ==============================

export class PlayerData {
  private readonly reactiveManager: ReactiveDataManager;
  private readonly config: CharacterWithRelations;

  // 缓存的武器数据
  private weaponDataCache = {
    mainWeaponType: "None" as MainHandType,
    subWeaponType: "None" as SubHandType,
  };

  constructor(config: PlayerWithRelations) {
    this.config = { ...config.character };
    this.reactiveManager = new ReactiveDataManager();

    this.initializePlayerData();
    this.updateFromConfig(); // 🔥 先设置武器变量和系数
    this.setupComplexDependencies(); // 🔥 再创建计算函数
  }

  /**
   * 初始化玩家特定的属性和计算函数
   */
  private initializePlayerData(): void {
    // 🔥 获取 MathScope 以便同时设置到响应式系统和表达式系统
    const mathScope = this.reactiveManager.getMathScope();

    // 设置等级 - 使用枚举名称作为变量名
    this.reactiveManager.setBaseValue(CharacterAttrEnum.LV.toString(), this.config.lv);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.LV], this.config.lv);

    // 设置基础能力值 - 使用枚举名称作为变量名
    this.reactiveManager.setBaseValue(CharacterAttrEnum.STR.toString(), this.config.str);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.STR], this.config.str);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.INT.toString(), this.config.int);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.INT], this.config.int);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.VIT.toString(), this.config.vit);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.VIT], this.config.vit);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.AGI.toString(), this.config.agi);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.AGI], this.config.agi);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.DEX.toString(), this.config.dex);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.DEX], this.config.dex);

    // 设置性格属性 - 使用枚举名称作为变量名
    const personalityValue = this.config.personalityValue || 0;
    const lukValue = this.config.personalityType === "Luk" ? personalityValue : 0;
    const tecValue = this.config.personalityType === "Tec" ? personalityValue : 0;
    const menValue = this.config.personalityType === "Men" ? personalityValue : 0;
    const criValue = this.config.personalityType === "Cri" ? personalityValue : 0;
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.LUK.toString(), lukValue);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.LUK], lukValue);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.TEC.toString(), tecValue);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.TEC], tecValue);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.MEN.toString(), menValue);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.MEN], menValue);
    
    this.reactiveManager.setBaseValue(CharacterAttrEnum.CRI.toString(), criValue);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.CRI], criValue);

    // 设置武器类型
    this.weaponDataCache.mainWeaponType = (this.config.weapon.type as MainHandType) || "None";
    this.weaponDataCache.subWeaponType = (this.config.subWeapon.type as SubHandType) || "None";
  }

  /**
   * 设置属性依赖关系和计算函数 - 从 ATTRIBUTE_EXPRESSIONS 动态生成
   */
  private setupComplexDependencies(): void {
    // 遍历所有表达式定义，为非基础属性创建计算函数
    for (const [attr, expression] of ATTRIBUTE_EXPRESSIONS) {
      if (!expression.isBase) {
        // 🔥 使用新的表达式解析方法自动构建依赖关系
        this.reactiveManager.addDependenciesFromExpression(attr.toString(), expression.expression);
        
        this.reactiveManager.addAttribute(attr.toString(), {
          updateFunction: (scope) => {
            // 🔥 直接使用 ReactiveDataManager 的 MathScope，确保所有数据在同一个 scope 中
            const mathScope = this.reactiveManager.getMathScope();
            
            // 将当前计算时的实时 scope 值设置到 MathScope
            // 需要将数字属性名映射为有意义的名称供表达式使用
            for (const [key, value] of scope.entries()) {
              const enumValue = parseInt(key);
              if (!isNaN(enumValue)) {
                // 将数字枚举映射为枚举名称
                const enumName = CharacterAttrEnum[enumValue];
                if (enumName) {
                  mathScope.setVariable(enumName, value);
                  console.log(`📊 设置变量 ${enumName} = ${value}`);
                }
              } else {
                // 保持原有的变量名（如武器配置数据）
                mathScope.setVariable(key, value);
                console.log(`📊 设置配置变量 ${key} = ${value}`);
              }
            }
            
            // 使用 MathScope 计算表达式
            try {
              return mathScope.evaluate(expression.expression);
            } catch (error) {
              console.warn(`Failed to evaluate expression: ${expression.expression}`, error);
              return 0;
            }
          },
        });
      }
    }
  }

  /**
   * 从配置更新所有相关属性
   */
  private updateFromConfig(): void {
    // 设置武器相关变量到 MathScope
    const mathScope = this.reactiveManager.getMathScope();
    
    // 🔥 首先设置基础属性值到 MathScope（使用枚举名称作为变量名）
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.LV], this.config.lv);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.STR], this.config.str);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.INT], this.config.int);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.VIT], this.config.vit);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.AGI], this.config.agi);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.DEX], this.config.dex);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.LUK], this.config.personalityType === "Luk" ? (this.config.personalityValue || 0) : 0);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.TEC], this.config.personalityType === "Tec" ? (this.config.personalityValue || 0) : 0);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.MEN], this.config.personalityType === "Men" ? (this.config.personalityValue || 0) : 0);
    mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.CRI], this.config.personalityType === "Cri" ? (this.config.personalityValue || 0) : 0);
    
    // 武器基础数据
    mathScope.setVariable("WEAPON_BASE_ATK", this.config.weapon.baseAbi || 0);
    mathScope.setVariable("WEAPON_REFINEMENT", this.config.weapon.refinement || 0);
    mathScope.setVariable("WEAPON_STABILITY", this.config.weapon.stability || 0);
    
    // 副武器数据
    mathScope.setVariable("SUBWEAPON_BASE_ATK", 0); // 暂时设为0
    mathScope.setVariable("SUBWEAPON_REFINEMENT", 0); // 暂时设为0
    
    // 武器系数数据
    const weaponData = MainWeaponAbiT[this.weaponDataCache.mainWeaponType] || MainWeaponAbiT["OneHandSword"];
    mathScope.setVariable("WEAPON_BASE_ASPD", weaponData.baseAspd);
    mathScope.setVariable("WEAPON_PATK_COEFF", weaponData.patkC);
    mathScope.setVariable("WEAPON_MATK_COEFF", weaponData.matkC);
    
    // 属性转换系数
    mathScope.setVariable("WEAPON_STR_PATK_COEFF", weaponData.abi_Attr_Convert.str.pAtkC);
    mathScope.setVariable("WEAPON_INT_PATK_COEFF", weaponData.abi_Attr_Convert.int.pAtkC);
    mathScope.setVariable("WEAPON_AGI_PATK_COEFF", weaponData.abi_Attr_Convert.agi.pAtkC);
    mathScope.setVariable("WEAPON_DEX_PATK_COEFF", weaponData.abi_Attr_Convert.dex.pAtkC);
    
    mathScope.setVariable("WEAPON_STR_MATK_COEFF", weaponData.abi_Attr_Convert.str.mAtkC);
    mathScope.setVariable("WEAPON_INT_MATK_COEFF", weaponData.abi_Attr_Convert.int.mAtkC);
    mathScope.setVariable("WEAPON_AGI_MATK_COEFF", weaponData.abi_Attr_Convert.agi.mAtkC);
    mathScope.setVariable("WEAPON_DEX_MATK_COEFF", weaponData.abi_Attr_Convert.dex.mAtkC);
    
    mathScope.setVariable("WEAPON_STR_ASPD_COEFF", weaponData.abi_Attr_Convert.str.aspdC);
    mathScope.setVariable("WEAPON_INT_ASPD_COEFF", weaponData.abi_Attr_Convert.int.aspdC);
    mathScope.setVariable("WEAPON_AGI_ASPD_COEFF", weaponData.abi_Attr_Convert.agi.aspdC);
    mathScope.setVariable("WEAPON_DEX_ASPD_COEFF", weaponData.abi_Attr_Convert.dex.aspdC);
    
    mathScope.setVariable("WEAPON_STR_STABILITY_COEFF", weaponData.abi_Attr_Convert.str.pStabC);
    
    // 副武器修正
    const subWeaponData = SubWeaponModifier[this.weaponDataCache.subWeaponType] || SubWeaponModifier["None"];
    mathScope.setVariable("SUBWEAPON_ASPD_MODIFIER", subWeaponData.aspdM * 100);
    
    // 暴击相关系数（暂时设为默认值）
    mathScope.setVariable("WEAPON_CRITICAL_RATE_COEFF", 0.2);
    mathScope.setVariable("WEAPON_CRITICAL_DAMAGE_COEFF", 2.0);

    // 标记所有基础属性为脏值，触发重新计算
    this.reactiveManager.markDirty(CharacterAttrEnum.LV.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.STR.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.INT.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.VIT.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.AGI.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.DEX.toString());
  }

  // ============================== 公开接口 ==============================

  /**
   * 获取属性值
   */
  getValue(attr: CharacterAttrEnum): number {
    return this.reactiveManager.getValue(attr.toString());
  }

  /**
   * 批量获取属性值
   */
  getValues(attrs: CharacterAttrEnum[]): Record<string, number> {
    const attrNames = attrs.map((attr) => attr.toString());
    return this.reactiveManager.getValues(attrNames);
  }

  /**
   * 设置基础属性值
   */
  setBaseValue(attr: CharacterAttrEnum, value: number): void {
    this.reactiveManager.setBaseValue(attr.toString(), value);

    // 🔥 同步更新 MathScope 中的基础属性值
    const mathScope = this.reactiveManager.getMathScope();
    
    // 同步更新配置和 MathScope（使用枚举名称作为变量名）
    switch (attr) {
      case CharacterAttrEnum.LV:
        this.config.lv = value;
        mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.LV], value);
        break;
      case CharacterAttrEnum.STR:
        this.config.str = value;
        mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.STR], value);
        break;
      case CharacterAttrEnum.INT:
        this.config.int = value;
        mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.INT], value);
        break;
      case CharacterAttrEnum.VIT:
        this.config.vit = value;
        mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.VIT], value);
        break;
      case CharacterAttrEnum.AGI:
        this.config.agi = value;
        mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.AGI], value);
        break;
      case CharacterAttrEnum.DEX:
        this.config.dex = value;
        mathScope.setVariable(CharacterAttrEnum[CharacterAttrEnum.DEX], value);
        break;
    }
  }

  /**
   * 添加修饰器
   */
  addModifier(
    attr: CharacterAttrEnum,
    type: "staticFixed" | "staticPercentage" | "dynamicFixed" | "dynamicPercentage",
    value: number,
    source: ModifierSource,
  ): void {
    this.reactiveManager.addModifier(attr.toString(), type, value, source);
  }

  /**
   * 移除修饰器
   */
  removeModifier(attr: CharacterAttrEnum, sourceId: string): void {
    this.reactiveManager.removeModifier(attr.toString(), sourceId);
  }

  /**
   * 移除所有来自特定来源的修饰器
   */
  removeAllModifiersFromSource(sourceId: string): void {
    // 遍历所有属性，移除指定来源的修饰器
    for (const attrEnum in CharacterAttrEnum) {
      if (isNaN(Number(attrEnum))) continue;
      this.reactiveManager.removeModifier(attrEnum, sourceId);
    }
  }

  /**
   * 更新武器配置
   */
  updateWeapon(weaponType: "main" | "sub", weaponData: WeaponWithRelations): void {
    if (weaponType === "main") {
      this.config.weapon = {
        ...defaultData.player_weapon,
        crystalList: [],
      };
      this.weaponDataCache.mainWeaponType = weaponData.type as MainHandType;
    } else {
      this.config.subWeapon = {
        ...defaultData.player_weapon,
        crystalList: [],
      };
      this.weaponDataCache.subWeaponType = weaponData.type as SubHandType;
    }

    // 标记武器相关属性为脏值
    this.reactiveManager.markDirty(CharacterAttrEnum.MAINWEAPON_ATK.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.SUBWEAPON_ATK.toString());
    this.reactiveManager.markDirty(CharacterAttrEnum.WEAPON_ATK.toString());
  }

  /**
   * 获取MathJS作用域（用于复杂表达式计算）
   */
  getMathScope() {
    return this.reactiveManager.getMathScope();
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return this.reactiveManager.getStats();
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats(): void {
    this.reactiveManager.resetStats();
  }

  /**
   * 获取属性详细信息（调试用）
   */
  getAttributeInfo(attr: CharacterAttrEnum) {
    return this.reactiveManager.getAttributeInfo(attr.toString());
  }

  /**
   * 导出为与old.worker.ts兼容的格式
   */
  toCompatibleFormat(): Record<string, any> {
    // 获取所有属性值
    const allValues: Record<string, any> = {};

    for (const attrName in CharacterAttrEnum) {
      if (isNaN(Number(attrName))) continue;

      const attrEnum = Number(attrName);
      const value = this.getValue(attrEnum);
      allValues[CharacterAttrEnum[attrEnum]] = value;
    }

    return {
      lv: this.config.lv,
      mainWeapon: this.config.weapon,
      subWeapon: this.config.subWeapon,
      bodyArmor: this.config.armor,
      ...allValues,

      // 兼容性方法
      dynamicTotalValue: (attrName: string) => {
        const attrEnum = CharacterAttrEnum[attrName as keyof typeof CharacterAttrEnum];
        return typeof attrEnum === "number" ? this.getValue(attrEnum) : 0;
      },
    };
  }

  /**
   * 从CharacterWithRelations创建PlayerData实例
   * 这是一个工厂方法，用于从数据库的角色数据创建响应式的PlayerData实例
   *
   * 注意：此方法主要用于将数据库中的角色数据转换为性能测试所需的PlayerData格式
   * 当前为简化版本，仅处理基础属性，武器和装备部分待数据结构确定后完善
   */
  static fromCharacterWithRelations(character: CharacterWithRelations): PlayerData {
    const config: PlayerWithRelations = {
      ...defaultData.player,
      character: {
        lv: character.lv,
        personalityType: character.personalityType as any,
        personalityValue: character.personalityValue || 0,
        str: character.str,
        int: character.int,
        vit: character.vit,
        agi: character.agi,
        dex: character.dex,
        id: "",
        name: "",
        weaponId: "",
        subWeaponId: "",
        armorId: "",
        optEquipId: "",
        speEquipId: "",
        cooking: [],
        modifiers: [],
        partnerSkillAId: null,
        partnerSkillAType: "Passive",
        partnerSkillBId: null,
        partnerSkillBType: "Passive",
        masterId: "",
        details: null,
        statisticId: "",
        combos: [],
        skills: [],
        weapon: {
          ...defaultData.player_weapon,
          crystalList: [],
        },
        subWeapon: {
          ...defaultData.player_weapon,
          crystalList: [],
        },
        armor: {
          ...defaultData.player_armor,
          crystalList: [],
        },
        optEquip: {
          ...defaultData.player_option,
          crystalList: [],
        },
        speEquip: {
          ...defaultData.player_special,
          crystalList: [],
        },
        statistic: {
          ...defaultData.statistic,
          updatedAt: new Date(),
          createdAt: new Date(),
          usageTimestamps: [],
          viewTimestamps: [],
        },
      },

      // TODO: 武器和装备数据映射需要根据实际数据库结构调整
      // mainWeapon: character.weapon ? {...} : undefined,
      // subWeapon: character.subWeapon ? {...} : undefined,
      // bodyArmor: character.armor ? {...} : undefined,
    };

    return new PlayerData(config);
  }
}
