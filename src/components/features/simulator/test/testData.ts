import { Simulator } from "@db/repositories/simulator";
import { Mob } from "@db/repositories/mob";
import { CharacterSkillWithRelations } from "@db/repositories/characterSkill";
import { defaultData } from "@db/defaultData";
import { Member } from "@db/repositories/member";

const sszw: CharacterSkillWithRelations = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: "神速掌握",
    dataSources: "",
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
      details: "",
      belongToskillId: "",
      elementLogic: "",
      castingRange: 0,
      effectiveRange: 0,
      logic: [
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
      ]
    }],
    statistic: defaultData.statistic,
    treeType: "HalberdSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Reservoir",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null,
    distanceType: "None",
    targetType: "None"
  },
  isStarGem: false,
  characterId: ""
}

const yqyq: CharacterSkillWithRelations = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: "勇气源泉",
    dataSources: "",
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
      details: "",
      belongToskillId: "",
      elementLogic: "",
      castingRange: 0,
      effectiveRange: 0,
      logic: [
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
      ]
    }],
    statistic: defaultData.statistic,
    treeType: "SupportSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Chanting",
    distanceType: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null,
    targetType: "None"
  },
  isStarGem: false,
  characterId: ""
}
  
const mfp: CharacterSkillWithRelations = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: "魔法炮",
    dataSources: "",
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
      details: "",
      belongToskillId: "",
      elementLogic: "",
      castingRange: 0,
      effectiveRange: 0,
      logic: [
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
      ]
    }],
    statistic: defaultData.statistic,
    treeType: "MagicSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Reservoir",
    distanceType: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null,
    targetType: "None"
  },
  isStarGem: false,
  characterId: ""
}

const cjb: CharacterSkillWithRelations = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: "法术/冲击波",
    dataSources: "",
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
      details: "",
      belongToskillId: "",
      elementLogic: "",
      castingRange: 0,
      effectiveRange: 0,
      logic: [
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
      ]
    }],
    statistic: defaultData.statistic,
    treeType: "MagicSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Chanting",
    distanceType: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null,
    targetType: "None"
  },
  isStarGem: false,
  characterId: ""
}

const bn: CharacterSkillWithRelations = {
  id: "",
  lv: 10,
  templateId: "",
  template: {
    id: "",
    name: "法术/爆能",
    dataSources: "",
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
      details: "",
      belongToskillId: "",
      elementLogic: "",
      castingRange: 0,
      effectiveRange: 0,
      logic: [
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
      ]
    }],
    statistic: defaultData.statistic,
    treeType: "MagicSkill",
    posX: 0,
    posY: 0,
    tier: 0,
    chargingType: "Chanting",
    distanceType: "None",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null,
    targetType: "None"
  },
  isStarGem: false,
  characterId: ""
}

export const test: {
  test: {
    id: string;
    name: string | null;
    gems: string[];
    members: { playerId: string | null; mercenaryId: string | null; mobId: string | null; mobDifficultyFlag: string }[];
  };
  member: Member["MainForm"];
  Mob: Mob["MainForm"];
  simulator: Simulator["MainForm"];
  skillSequence1: CharacterSkillWithRelations[];
  skillSequence2: CharacterSkillWithRelations[];
} = {
  member: {
    id: "",
    playerId: null,
    partnerId: null,
    mercenaryId: null,
    mobId: null,
    mobDifficultyFlag: "Hard",
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
        personalityType: "None",
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
              type: "WeaponCrystal",
              modifiers: [
                "mAtk + 5%",
                "mPie + 20",
                "cspd - 15%",
              ],
              itemId: "",
              backs: [],
              fronts: [],
              id: "",
              details: null,
              dataSources: "",
              statisticId: "",
              updatedByAccountId: null,
              createdByAccountId: null,
              itemType: "Weapon"
            },
            {
              name: "死灵妖兔II",
              type: "WeaponCrystal",
              modifiers: [
                "mAtk + 7%",
                "cspd + 14%",
                "maxHp - 15%",
                "am + 3",
              ],
              itemId: "",
              backs: [],
              fronts: [],
              id: "",
              details: null,
              dataSources: "",
              statisticId: "",
              updatedByAccountId: null,
              createdByAccountId: null,
              itemType: "Weapon"
            },
          ],
          masterId: "",
          extraAbi: 194,
          templateId: null,
          enchantmentAttributesId: null,
          template: {
            modifiers: [],
            type: "Magictool",
            baseAbi: 0,
            stability: 0,
            itemId: "",
            colorA: 0,
            colorB: 0,
            colorC: 0,
            defaultCrystals: [],
            elementType: "Normal"
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
            modifiers: [
              "aspd + 300",
            ],
            type: "NinjutsuScroll",
            baseAbi: 0,
            stability: 0,
            itemId: "",
            colorA: 0,
            colorB: 0,
            colorC: 0,
            defaultCrystals: [],
            elementType: "Normal"
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
              type: "ArmorCrystal",
              modifiers: [
                "mAtk + 5%",
                "mPie + 10",
                "cspd + 20%",
                "maxMp - 300",
              ],
              itemId: "",
              backs: [],
              fronts: [],
              id: "",
              details: null,
              statisticId: "",
              itemType: "Weapon",
              dataSources: "",
              updatedByAccountId: null,
              createdByAccountId: null
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
            baseAbi: 0
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
        optEquip: {
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
            baseAbi: 0
          }
        },
        optEquipId: "",
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
            baseAbi: 0
          }
        },
        speEquipId: "",
        combos: [],
        details: "",
        statistic: defaultData.statistic,
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
    name: "岩龙菲尔岑 四星",
    type: "Boss",
    baseLv: 251,
    experience: 0,
    initialElement: "Earth",
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
    normalDefExp: 0,
    physicDefExp: 0,
    magicDefExp: 0,
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
  },
  skillSequence1: [sszw,sszw,
      mfp,
      yqyq,
      cjb,
      bn
    ],
  skillSequence2: [sszw,sszw,
    mfp,
    yqyq,
    cjb,
    bn
  ],
  simulator: {
    id: "defaultSimulator",
    name: "defaultSimulator",
    details: "",
    statisticId: "",
    updatedByAccountId: null,
    createdByAccountId: null,
    statistic: defaultData.statistic,
    campA: [],
    campB: []
  },
};

test.simulator.campA = [
  {
    id: "testMobId",
    name: null,
    gems: [],
    campA: [],
    campB: []
  },
];

test.simulator.campB = [
  {
    ...defaultData.team,
    members: [
      
    ]
  }
];
