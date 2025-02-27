import { Simulator } from "~/repositories/simulator";
import { Character } from "~/repositories/character";
import { defaultConsumable } from "~/repositories/consumable";
import { defaultImage } from "~/repositories/image";
import { defaultMember, Member } from "~/repositories/member";
import { defaultMob } from "~/repositories/mob";
import { defaultWeaponEncAttributes } from "~/repositories/weaponEncAttrs";
import { Mob } from "~/repositories/mob";
import { defaultCustomPet } from "~/repositories/customPet";
import { defaultSkill, Skill } from "~/repositories/skill";
import { defaultStatistic } from "~/repositories/statistic";
import { skillSequenceList } from "~/routes/(app)/(functionPage)/simulator/(simulator)";
import { CharacterSkill } from "~/repositories/characterSkill";

const sszw: CharacterSkill = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: {
      "zh-CN": "神速掌握",
      "zh-TW": "",
      en: "",
      ja: ""
    },
    dataSources: "",
    element: "Normal",
    isPassive: false,
    effects: [{
      id: "",
      description: "",
      motionFixed: "13",
      motionModified: "48",
      chantingFixed: "0",
      chantingModified: "0",
      reservoirFixed: "0",
      reservoirModified: "0",
      startupFrames: "13",
      condition: "",
      cost: "100MP",
      details: [
        {
          id: "",
          name: "角色行动速度+10%",
          yieldType: "ImmediateEffect",
          yieldFormula: "self.am + 10",
          mutationTimingFormula: null,
          skillEffectId: null,
        },
        {
          id: "",
          name: "角色攻速+300",
          yieldType: "ImmediateEffect",
          mutationTimingFormula: null,
          yieldFormula: "self.aspd + 300",
          skillEffectId: null,
        },
      ],
      belongToskillId: "",
    }],
    statistic: defaultStatistic,
    treeName: "HalberdSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Reservoir",
    distanceResist: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null
  },
  isStarGem: false
}

const yqyq: CharacterSkill = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: {
      "zh-CN": "勇气源泉",
      "zh-TW": "",
      en: "",
      ja: ""
    },
    dataSources: "",
    element: "Normal",
    isPassive: false,
    effects: [{
      id: "",
      description: "",
      motionFixed: "23",
      motionModified: "148",
      chantingFixed: "0",
      chantingModified: "60",
      reservoirFixed: "0",
      reservoirModified: "0",
      startupFrames: "",
      condition: "",
      cost: "400MP",
      details: [
        {
          id: "",
          name: "角色最终伤害+20%",
          yieldType: "ImmediateEffect",
          yieldFormula: "self.final + 20",
          mutationTimingFormula: null,
          skillEffectId: null,
        },
        {
          id: "",
          name: "角色武器攻击+30%",
          yieldType: "ImmediateEffect",
          mutationTimingFormula: null,
          yieldFormula: "self.weaponAtk + 30%",
          skillEffectId: null,
        },
        {
          id: "",
          name: "角色命中-50%",
          yieldType: "ImmediateEffect",
          mutationTimingFormula: null,
          yieldFormula: "self.hit - 50%",
          skillEffectId: null,
        },
      ],
      belongToskillId: "",
    }],
    statistic: defaultStatistic,
    treeName: "SupportSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Chanting",
    distanceResist: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null
  },
  isStarGem: false
}
  
const mfp: CharacterSkill = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: {
      "zh-CN": "魔法炮",
      "zh-TW": "",
      en: "",
      ja: ""
    },
    dataSources: "",
    element: "Normal",
    isPassive: false,
    effects: [{
      id: "",
      description: "",
      motionFixed: "23",
      motionModified: "148",
      chantingFixed: "0",
      chantingModified: "60",
      reservoirFixed: "0",
      reservoirModified: "0",
      startupFrames: "",
      condition: "weapon.type = MagicTool",
      cost: "self.mfp ? 700MP : 0MP",
      details: [
        {
          id: "",
          name: "添加魔法炮层数计数器",
          yieldType: "ImmediateEffect",
          yieldFormula: "self.mfp = 0",
          mutationTimingFormula: null,
          skillEffectId: null,
        },
        {
          id: "",
          name: "魔法炮层数自动增长行为",
          yieldType: "PersistentEffect",
          mutationTimingFormula: "frame % 60 == 0 and frame > 0",
          yieldFormula: "self.mfp + ( self.mfp >= 100 ? 1/3 : 1 )",
          skillEffectId: null,
        },
      ],
      belongToskillId: "",
    }],
    statistic: defaultStatistic,
    treeName: "MagicSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Reservoir",
    distanceResist: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null
  },
  isStarGem: false
}

const cjb: CharacterSkill = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: {
      "zh-CN": "法术/冲击波",
      "zh-TW": "",
      en: "",
      ja: ""
    },
    dataSources: "",
    element: "Normal",
    isPassive: false,
    effects: [{
      id: "",
      description: "",
      motionFixed: "23",
      motionModified: "148",
      chantingFixed: "0",
      chantingModified: "max(0,min((2 - (self.lv - 1) * 0.25),(1 - (self.lv - 5) * 0.5)))",
      reservoirFixed: "0",
      reservoirModified: "0",
      startupFrames: "",
      condition: "weapon.type = MagicTool",
      cost: "self.mfp ? 700MP : 0MP",
      details: [
        {
          id: "",
          name: "Damage",
          yieldType: "ImmediateEffect",
          yieldFormula: "m.hp - (s.vMatk + 200) * 5",
          mutationTimingFormula: null,
          skillEffectId: null,
        },
        {
          id: "",
          name: "MP Cost half",
          yieldType: "PersistentEffect",
          yieldFormula: "",
          skillEffectId: null,
          mutationTimingFormula: "false",
        },
      ],
      belongToskillId: "",
    }],
    statistic: defaultStatistic,
    treeName: "MagicSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Chanting",
    distanceResist: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null
  },
  isStarGem: false
}

const bn: CharacterSkill = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: {
      "zh-CN": "法术/爆能",
      "zh-TW": "",
      en: "",
      ja: ""
    },
    dataSources: "",
    element: "Normal",
    isPassive: false,
    effects: [{
      id: "",
      description: "",
      motionFixed: "23",
      motionModified: "148",
      chantingFixed: "0",
      chantingModified: "8",
      reservoirFixed: "0",
      reservoirModified: "0",
      startupFrames: "",
      condition: "weapon.type = MagicTool",
      cost: "self.mfp ? 700MP : 0MP",
      details: [
        {
          id: "",
          name: "Damage",
          yieldType: "ImmediateEffect",
          yieldFormula: "m.hp - (s.vMatk + 200) * 5",
          mutationTimingFormula: null,
          skillEffectId: null,
        },
        {
          id: "",
          name: "MP Cost half",
          yieldType: "PersistentEffect",
          yieldFormula: "",
          skillEffectId: null,
          mutationTimingFormula: "false",
        },
      ],
      belongToskillId: "",
    }],
    statistic: defaultStatistic,
    treeName: "MagicSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Chanting",
    distanceResist: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null
  },
  isStarGem: false
}

export const test: {
  test: {
    id: string;
    name: string | null;
    gems: string[];
    members: { playerId: string | null; mercenaryId: string | null; mobId: string | null; mobDifficultyFlag: string }[];
  };
  member: Member;
  Mob: Mob;
  simulator: Simulator;
  skillSequence1: CharacterSkill[];
  skillSequence2: CharacterSkill[];
} = {
  member: {
    id: "",
    playerId: null,
    partnerId: null,
    mercenaryId: null,
    mobId: null,
    mobDifficultyFlag: "",
    player: {
      id: "",
      name: "",
      useIn: "",
      actions: undefined,
      accountId: "",
      character: {
        id: "",
        name: "测试机体",
        lv: 265,
        str: 1,
        int: 440,
        vit: 1,
        agi: 1,
        dex: 247,
        personalityType: "NOSPECIALABI",
        personalityValue: 0,
        weapon: {
          id: "",
          name: "暴击残酷之翼",
          type: "MAGIC_DEVICE",
          baseAbi: 194,
          refinement: 15,
          stability: 70,
          crystalList: [
            {
              name: "寄生甲兽",
              crystalType: "WEAPONCRYSTAL",
              modifiers: [
                "mAtk + 5%",
                "mPie + 20",
                "cspd - 15%",
              ],
              itemId: "",
            },
            {
              name: "死灵妖兔II",
              crystalType: "WEAPONCRYSTAL",
              modifiers: [
                "mAtk + 7%",
                "cspd + 14%",
                "maxHp - 15%",
                "am + 3",
              ],
              itemId: "",
            },
          ],
          masterId: "",
          extraAbi: 194,
          templateId: null,
          enchantmentAttributesId: null,
          template: {
            name: "",
            modifiers: [],
            type: "",
            baseAbi: 0,
            stability: 0,
            itemId: "",
            colorA: 0,
            colorB: 0,
            colorC: 0,
            element: null
          },
          enchantmentAttributes: {
            id: "",
            name: "",
            modifiers: [
              "mAtk + 6%",
              "pCr + 25",
              "pCd + 21",
              "stro.Dark + 21",
            ],
            details: null,
            statisticId: "",
            dataSources: null,
            updatedByAccountId: null,
            createdByAccountId: null
          }
        },
        weaponId: "",
        subWeapon: {
          id: "",
          name: "忍术卷轴·风遁术",
          masterId: "",
          type: "",
          baseAbi: 0,
          stability: 0,
          extraAbi: 0,
          templateId: null,
          refinement: 0,
          enchantmentAttributesId: null,
          crystalList: [],
          template: {
            name: "风遁术",
            modifiers: [
              "aspd + 300",
            ],
            type: "",
            baseAbi: 0,
            stability: 0,
            itemId: "",
            colorA: 0,
            colorB: 0,
            colorC: 0,
            element: null,
          },
          enchantmentAttributes: null,
        },
        subWeaponId: "",
        armor: {
          id: "",
          name: "冒险者服装",
          armorType: "NORMAL",
          refinement: 0,
          def: 0,
          crystalList: [
            {
              name: "铁之女帝",
              crystalType: "GENERAL",
              modifiers: [
                "mAtk + 5%",
                "mPie + 10",
                "cspd + 20%",
                "maxMp - 300",
              ],
              itemId: ""
            },
            {
              name: "约尔拉兹",
              crystalType: "GENERAL",
              modifiers: [
                "mAtk + 7%",
                "int + 3%",
                "cspd + 35%",
                "ampr + 10%",
              ],
              itemId: ""
            },
          ],
          masterId: "",
          templateId: "",
          enchantmentAttributesId: null,
          template: {
            name: "",
            modifiers: [],
            itemId: "",
            colorA: 0,
            colorB: 0,
            colorC: 0,
            baseDef: 0
          },
          enchantmentAttributes: {
            id: "",
            name: "",
            modifiers: [
              "pCr + 25",
              "pCd + 10%",
              "pCd + 21",
              "stro.Dark + 21",
            ],
            details: null,
            statisticId: "",
            dataSources: null,
            updatedByAccountId: null,
            createdByAccountId: null
          }
        },
        armorId: "",
        addEquip: {
          id: "",
          name: "饼干腰翼",
          refinement: 0,
          crystalList: [
            {
              name: "深谋的青影",
              crystalType: "GENERAL",
              modifiers: [
                "sDis + 8%",
                "lDis + 8%",
                "maxMp - 150",
                "uAtk + 8%",
              ],
              itemId: ""
            },
            {
              name: "蜜爱丽",
              crystalType: "GENERAL",
              modifiers: [
                "aspd + 400",
                "cspd + 400",
                "mPie + 20%",
              ],
              itemId: ""
            },
          ],
          masterId: "",
          templateId: "",
          def: 0,
          template: {
            name: "",
            modifiers: [
              "lDis + 10%",
              "dex + 5%",
              "mPie + isMAGIC_DEVICE(mainWeapon) ?  25 : 0",
            ],
            itemId: "",
            colorA: 0,
            colorB: 0,
            colorC: 0,
            baseDef: 0
          }
        },
        addEquipId: "",
        speEquip: {
          id: "",
          name: "读星提灯",
          crystalList: [
            {
              name: "星之魔导士",
              crystalType: "GENERAL",
              modifiers: [
                "mAtk + 9%",
                "cspd + 9%",
                "anticipate + 9%",
              ],
              itemId: ""
            },
            {
              name: "塔图罗基特",
              crystalType: "GENERAL",
              modifiers: [
                "pAtk + 6%",
                "mAtk + 6%",
                "am + 2",
              ],
              itemId: ""
            },
          ],
          masterId: "",
          templateId: "",
          refinement: 0,
          def: 0,
          template: {
            name: "",
            modifiers: [
              "mPie + 10",
              "maxMp + 300",
            ],
            itemId: "",
            baseDef: 0
          }
        },
        speEquipId: "",
        combos: [],
        details: "",
        statistic: defaultStatistic,
        statisticId: "",
        imageId: "",
        cooking: [],
        modifiers: [],
        partnerSkillA: "",
        partnerSkillAType: "",
        partnerSkillB: "",
        partnerSkillBType: "",
        masterId: ""
      },
    },
    mercenary: null,
    partner: null,
    mob: null,
  },
  Mob: {
    id: "",
    image: defaultImage,
    imageId: "",
    name: {
      "zh-CN": "岩龙菲尔岑 四星",
      "zh-TW": "",
      en: "",
      ja: "",
    },
    mobType: "Boss",
    baseLv: 251,
    experience: 0,
    element: "Earth",
    radius: 2,
    maxhp: 31710000,
    physicalDefense: 6330,
    physicalResistance: 8,
    magicalDefense: 4434,
    magicalResistance: 8,
    criticalResistance: 20,
    avoidance: 1896,
    dodge: 2,
    block: 8,
    normalAttackResistanceModifier: 0,
    physicalAttackResistanceModifier: 0,
    magicalAttackResistanceModifier: 0,
    dataSources: "",
    createdByAccountId: "",
    updatedByAccountId: "",
    details: "",
    actions: [
      {
        id: "systemStart",
        componentType: "task",
        type: "message",
        name: "开始!",
        properties: { message: "开始!" },
      },
      {
        id: "systemEnd",
        componentType: "task",
        type: "message",
        name: "结束",
        properties: { message: "结束" },
      },
    ],
    statisticId: "",
    captureable: false,
    partsExperience: 0,
    belongToZones: [],
    statistic: defaultStatistic,
  },
  skillSequence1: [sszw,sszw,
      mfp,
      yqyq,
      cjb,
      {
        id: "",
        skillTreeName: "MAGIC",
        name: "爆能",
        level: 10,
        weaponElementDependencyType: "TRUE",
        element: "Normal",
        skillType: "ACTIVE_SKILL",
        skillDescription: "",
        skillEffect: {
          id: "",
          actionBaseDurationFormula: "24",
          actionModifiableDurationFormula: "98",
          skillExtraActionType: "Chanting",
          chargingBaseDurationFormula: "0",
          chargingModifiableDurationFormula: "0",
          chantingBaseDurationFormula: "0",
          chantingModifiableDurationFormula: "8",
          skillStartupFramesFormula: "0",
          belongToskillId: "",
          description: "",
          skillCost: [
            {
              id: "",
              name: "MP Cost",
              costFormula: "self.mp = self.mp - 500",
              skillEffectId: null,
            },
          ],
          skillYield: [
            {
              id: "",
              yieldFormula: "1+1",
              name: "Damage",
              skillEffectId: null,
              yieldType: "ImmediateEffect",
              mutationTimingFormula: null,
            },
          ],
        },
      },
    ],
  skillSequence2: {
    name: "skillSequence2",
    data: [
      {
        id: "",
        state: "PUBLIC",
        skillTreeName: "MAGIC",
        name: "冲击波",
        skillDescription: "",
        level: 7,
        weaponElementDependencyType: "TRUE",
        element: "Normal",
        skillType: "ACTIVE_SKILL",
        skillEffect: {
          id: "",
          description: "",
          actionBaseDurationFormula: "13",
          actionModifiableDurationFormula: "48",
          skillExtraActionType: "Chanting",
          chargingBaseDurationFormula: "0",
          chargingModifiableDurationFormula: "0",
          chantingBaseDurationFormula: "0",
          chantingModifiableDurationFormula: "max(0,min((2 - (self.lv - 1) * 0.25),(1 - (self.lv - 5) * 0.5)))",
          skillStartupFramesFormula: "0",
          belongToskillId: "",
          skillCost: [
            {
              id: "",
              name: "MP Cost",
              costFormula: "self.mp = self.mp - 200",
              skillEffectId: null,
            },
          ],
          skillYield: [
            {
              id: "",
              name: "Damage",
              yieldType: "ImmediateEffect",
              yieldFormula: "m.hp - (s.vMatk + 200) * 5",
              mutationTimingFormula: null,
              skillEffectId: null,
            },
            // {
            //   id: "",
            //   name: "MP Cost half",
            //   yieldType: "PersistentEffect",
            //   yieldFormula: "",
            //   skillEffectId: null,
            //   mutationTimingFormula: "false",
            // },
          ],
        },
      },
      {
        id: "",
        state: "PUBLIC",
        skillTreeName: "MAGIC",
        name: "爆能",
        level: 10,
        weaponElementDependencyType: "TRUE",
        element: "Normal",
        skillType: "ACTIVE_SKILL",
        skillDescription: "",
        skillEffect: {
          id: "",
          actionBaseDurationFormula: "24",
          actionModifiableDurationFormula: "98",
          skillExtraActionType: "Chanting",
          chargingBaseDurationFormula: "0",
          chargingModifiableDurationFormula: "0",
          chantingBaseDurationFormula: "0",
          chantingModifiableDurationFormula: "8",
          skillStartupFramesFormula: "0",
          belongToskillId: "",
          description: "",
          skillCost: [
            {
              id: "",
              name: "MP Cost",
              costFormula: "self.mp = self.mp - 500",
              skillEffectId: null,
            },
          ],
          skillYield: [
            {
              id: "",
              yieldFormula: "1+1",
              name: "Damage",
              skillEffectId: null,
              yieldType: "ImmediateEffect",
              mutationTimingFormula: null,
            },
          ],
        },
      },
    ],
  },
  simulator: {
    id: "defaultSimulator",
    name: "defaultSimulator",
    mobs: [],
    team: [],
    extraDetails: "defaultExtraDetails",
    updatedAt: new Date(),
    updatedByAccountId: "",
    createdAt: new Date(),
    createdByAccountId: "",
    statistic: defaultStatistic,
    statisticId: "",
  },
};

test.simulator.team[0].members = [
  {
    id: "testMobId",
    Mob: test.Mob,
    MobId: test.Mob.id,
    star: 4,
    flow: "",
  },
];

test.simulator.team = [test.member];
