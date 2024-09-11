import * as math from "mathjs";
import { type computeInput, type computeOutput, type tSkill, dynamicTotalValue, type FrameData } from "./worker";
import { ObjectRenderer } from "./objectRender";
import { SelectMonster } from "~/schema/monster";
import { defaultSelectCharacter, SelectCharacter } from "~/schema/character";
import { defaultSelectStatistics } from "~/schema/statistics";
import { defaultSelectModifiersList } from "~/schema/modifiers_list";
import { defaultSelectConsumable } from "~/schema/consumable";
import { defaultSelectSkill } from "~/schema/skill";
import { defaultSelectPet } from "~/schema/pet";
import { createEffect, createSignal, JSX, onMount, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { generateAugmentedMonsterList } from "~/lib/untils/generateAugmentedMonsterList";
import Button from "~/components/ui/button";
import Dialog from "~/components/ui/dialog";

export type skillSequenceList = {
  name: string;
  data: tSkill[];
};

export default function AnalyzerIndexClient() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  const calculatorWorker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  // 状态管理参数
  const monsterList = store.monsterPage.monsterList;
  const setMonsterList = (value: SelectMonster[]) => setStore("monsterPage", "monsterList", value);
  const characterList = store.characterPage.characterList;
  const setCharacterList = (value: SelectCharacter[]) => setStore("characterPage", "characterList", value);
  const monster = store.monster;
  const setMonster = (value: SelectMonster) => setStore("monster", value);
  const character = store.character;
  const setCharacter = (value: SelectCharacter) => setStore("character", value);

  const [dialogState, setDialogState] = createSignal(false);
  const [computeResult, setComputeResult] = createSignal<JSX.Element | null>(null);
  const [dialogFrameData, setDialogFrameData] = createSignal<FrameData | null>(null);
  const [dialogMeberIndex, setDialogMeberIndex] = createSignal<number>(0);
  const [defaultMonsterList] = createSignal(store.monsterPage.monsterList);

  const test = {
    character: {
      id: "",
      characterType: "Tank",
      name: "测试机体",
      lv: 265,
      baseStr: 1,
      baseInt: 440,
      baseVit: 1,
      baseAgi: 1,
      baseDex: 247,
      specialAbiType: "NULL",
      specialAbiValue: 0,
      mainWeapon: {
        id: "",
        name: "暴击残酷之翼",
        mainWeaponType: "MAGIC_DEVICE",
        baseAtk: 194,
        refinement: 15,
        stability: 70,
        element: "LIGHT",
        crystal: [
          {
            id: "",
            name: "寄生甲兽",
            crystalType: "WEAPONCRYSTAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "寄生甲兽",
              modifiers: [
                {
                  id: "",
                  formula: "mAtk + 5%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "mPie + 20",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "cspd - 15%",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
          {
            id: "",
            name: "死灵妖兔II",
            crystalType: "WEAPONCRYSTAL",
            front: 1,
            modifiersList: {
              id: "",
              name: "死灵妖兔II",
              modifiers: [
                {
                  id: "",
                  formula: "mAtk + 7%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "cspd + 14%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "maxHp - 15%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "am + 3",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
        ],
        modifiersList: {
          id: "",
          name: "暴击残酷之翼属性",
          modifiers: [
            {
              id: "",
              formula: "mAtk + 6%",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "pCr + 25",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "pCd + 21",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "stro.DARK + 21",
              belongToModifiersListId: "",
            },
          ],
        },
        modifiersListId: "",
        createdAt: new Date(),
        createdByUserId: "",
        updatedAt: new Date(),
        updatedByUserId: "",
        extraDetails: "",
        dataSources: "",
        statistics: defaultSelectStatistics,
        statisticsId: "",
      },
      mainWeaponId: "",
      subWeapon: {
        id: "",
        name: "忍术卷轴·风遁术",
        subWeaponType: "NO_WEAPON",
        baseAtk: 0,
        refinement: 0,
        stability: 0,
        element: "NO_ELEMENT",
        modifiersList: {
          id: "",
          name: "忍术卷轴·风遁术属性",
          modifiers: [
            {
              id: "",
              formula: "aspd + 300",
              belongToModifiersListId: "",
            },
          ],
        },
        modifiersListId: "",
        createdAt: new Date(),
        createdByUserId: "",
        updatedAt: new Date(),
        updatedByUserId: "",
        extraDetails: "",
        dataSources: "",
        statistics: defaultSelectStatistics,
        statisticsId: "",
      },
      subWeaponId: "",
      bodyArmor: {
        id: "",
        name: "冒险者服装",
        bodyArmorType: "NORMAL",
        refinement: 0,
        baseDef: 0,
        crystal: [
          {
            id: "",
            name: "铁之女帝",
            crystalType: "GENERAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "铁之女帝",
              modifiers: [
                {
                  id: "",
                  formula: "mAtk + 5%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "mPie + 10",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "cspd + 20%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "maxMp - 300",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
          {
            id: "",
            name: "约尔拉兹",
            crystalType: "GENERAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "约尔拉兹",
              modifiers: [
                {
                  id: "",
                  formula: "mAtk + 7%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "int + 3%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "cspd + 35%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "ampr + 10%",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
        ],
        modifiersList: {
          id: "",
          name: "冒险者服装属性",
          modifiers: [
            {
              id: "",
              formula: "pCr + 25",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "pCd + 10%",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "pCd + 21",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "stro.DARK + 21",
              belongToModifiersListId: "",
            },
          ],
        },
        modifiersListId: "",
        createdAt: new Date(),
        createdByUserId: "",
        updatedAt: new Date(),
        updatedByUserId: "",
        extraDetails: "",
        dataSources: "",
        statistics: defaultSelectStatistics,
        statisticsId: "",
      },
      bodyArmorId: "",
      additionalEquipment: {
        id: "",
        name: "饼干腰翼",
        refinement: 0,
        crystal: [
          {
            id: "",
            name: "深谋的青影",
            crystalType: "GENERAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "深谋的青影",
              modifiers: [
                {
                  id: "",
                  formula: "nDis + 8%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "fDis + 8%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "maxMp - 150",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "uAtk + 8%",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
          {
            id: "",
            name: "蜜爱丽",
            crystalType: "GENERAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "蜜爱丽属性",
              modifiers: [
                {
                  id: "",
                  formula: "",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
        ],
        modifiersList: {
          id: "",
          name: "饼干腰翼属性",
          modifiers: [
            {
              id: "",
              formula: "fDis + 10%",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "dex + 5%",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "mPie + isMAGIC_DEVICE(mainWeapon) ?  25 : 0",
              belongToModifiersListId: "",
            },
          ],
        },
        modifiersListId: "",
        createdAt: new Date(),
        createdByUserId: "",
        updatedAt: new Date(),
        updatedByUserId: "",
        extraDetails: "",
        dataSources: "",
        statistics: defaultSelectStatistics,
        statisticsId: "",
      },
      additionalEquipmentId: "",
      specialEquipment: {
        id: "",
        name: "读星提灯",
        crystal: [
          {
            id: "",
            name: "星之魔导士",
            crystalType: "GENERAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "星之魔导士",
              modifiers: [
                {
                  id: "",
                  formula: "mAtk + 9%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "cspd + 9%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "anticipate + 9%",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
          {
            id: "",
            name: "塔图罗基特",
            crystalType: "GENERAL",
            front: 0,
            modifiersList: {
              id: "",
              name: "塔图罗基特属性",
              modifiers: [
                {
                  id: "",
                  formula: "pAtk + 6%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "mAtk + 6%",
                  belongToModifiersListId: "",
                },
                {
                  id: "",
                  formula: "am + 2",
                  belongToModifiersListId: "",
                },
              ],
            },
            modifiersListId: "",
            createdAt: new Date(),
            createdByUserId: "",
            updatedAt: new Date(),
            updatedByUserId: "",
            extraDetails: "",
            dataSources: "",
            statistics: defaultSelectStatistics,
            statisticsId: "",
          },
        ],
        modifiersList: {
          id: "",
          name: "读星提灯属性",
          modifiers: [
            {
              id: "",
              formula: "mPie + 10",
              belongToModifiersListId: "",
            },
            {
              id: "",
              formula: "maxMp + 300",
              belongToModifiersListId: "",
            },
          ],
        },
        modifiersListId: "",
        createdAt: new Date(),
        createdByUserId: "",
        updatedAt: new Date(),
        updatedByUserId: "",
        extraDetails: "",
        dataSources: "",
        statistics: defaultSelectStatistics,
        statisticsId: "",
      },
      specialEquipmentId: "",
      fashion: defaultSelectModifiersList,
      fashionModifiersListId: "",
      cuisine: defaultSelectModifiersList,
      CuisineModifiersListId: "",
      consumableList: [defaultSelectConsumable],
      skillList: [defaultSelectSkill],
      combos: [],
      pet: defaultSelectPet,
      petId: defaultSelectPet.id,
      modifiersList: defaultSelectModifiersList,
      modifiersListId: defaultSelectModifiersList.id,
      createdAt: new Date(),
      createdByUserId: "",
      updatedAt: new Date(),
      updatedByUserId: "",
      extraDetails: "",
      statistics: defaultSelectStatistics,
      statisticsId: "",
      imageId: "",
    } satisfies SelectCharacter,
    monster: {
      id: "",
      imageId: "",
      name: "岩龙菲尔岑 四星",
      monsterType: "COMMON_BOSS",
      baseLv: 251,
      experience: 0,
      address: "",
      element: "EARTH",
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
      difficultyOfTank: 5,
      difficultyOfMelee: 5,
      difficultyOfRanged: 5,
      possibilityOfRunningAround: 0,
      dataSources: "",
      createdAt: new Date(),
      createdByUserId: "",
      updatedAt: new Date(),
      updatedByUserId: "",
      extraDetails: "",
      statistics: defaultSelectStatistics,
      statisticsId: "",
    } satisfies SelectMonster,
    skillSequence1: {
      name: "skillSequence1",
      data: [
        {
          id: "",
          state: "PUBLIC",
          skillTreeName: "MAGIC",
          name: "神速掌握",
          skillDescription: "",
          level: 10,
          weaponElementDependencyType: "TRUE",
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "13",
            actionModifiableDurationFormula: "48",
            skillExtraActionType: "None",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "0",
            skillStartupFramesFormula: "13",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "100",
                skillEffectId: null,
              },
            ],
            skillYield: [
              {
                id: "",
                name: "角色行动速度+10%",
                yieldType: "ImmediateEffect",
                yieldFormula: "p.am + 10",
                mutationTimingFormula: null,
                skillEffectId: null,
              },
              {
                id: "",
                name: "角色攻速+300",
                yieldType: "ImmediateEffect",
                mutationTimingFormula: null,
                yieldFormula: "p.aspd + 300",
                skillEffectId: null,
              },
            ],
          },
        },
        {
          id: "",
          state: "PUBLIC",
          skillTreeName: "MAGIC",
          name: "神速掌握",
          skillDescription: "",
          level: 10,
          weaponElementDependencyType: "TRUE",
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "13",
            actionModifiableDurationFormula: "48",
            skillExtraActionType: "None",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "0",
            skillStartupFramesFormula: "13",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "100",
                skillEffectId: null,
              },
            ],
            skillYield: [
              {
                id: "",
                name: "角色行动速度+10%",
                yieldType: "ImmediateEffect",
                yieldFormula: "p.am + 10",
                mutationTimingFormula: null,
                skillEffectId: null,
              },
              {
                id: "",
                name: "角色攻速+300",
                yieldType: "ImmediateEffect",
                mutationTimingFormula: null,
                yieldFormula: "p.aspd + 300",
                skillEffectId: null,
              },
            ],
          },
        },
        {
          id: "",
          state: "PUBLIC",
          skillTreeName: "MAGIC",
          name: "神速掌握",
          skillDescription: "",
          level: 10,
          weaponElementDependencyType: "TRUE",
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "13",
            actionModifiableDurationFormula: "48",
            skillExtraActionType: "None",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "0",
            skillStartupFramesFormula: "13",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "100",
                skillEffectId: null,
              },
            ],
            skillYield: [
              {
                id: "",
                name: "角色行动速度+10%",
                yieldType: "ImmediateEffect",
                yieldFormula: "p.am + 10",
                mutationTimingFormula: null,
                skillEffectId: null,
              },
              {
                id: "",
                name: "角色攻速+300",
                yieldType: "ImmediateEffect",
                mutationTimingFormula: null,
                yieldFormula: "p.aspd + 300",
                skillEffectId: null,
              },
            ],
          },
        },
        {
          id: "",
          state: "PUBLIC",
          skillTreeName: "MAGIC",
          name: "魔法炮充填",
          skillDescription: "",
          level: 10,
          weaponElementDependencyType: "TRUE",
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "13",
            actionModifiableDurationFormula: "48",
            skillExtraActionType: "Chanting",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "0",
            skillStartupFramesFormula: "0",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "0",
                skillEffectId: null,
              },
            ],
            skillYield: [
              {
                id: "",
                name: "添加魔法炮层数计数器",
                yieldType: "ImmediateEffect",
                yieldFormula: "p.mfp = 0",
                mutationTimingFormula: null,
                skillEffectId: null,
              },
              {
                id: "",
                name: "魔法炮层数自动增长行为",
                yieldType: "PersistentEffect",
                mutationTimingFormula: "frame % 60 == 0 and frame > 0",
                yieldFormula: "p.mfp + ( p.mfp >= 100 ? 1/3 : 1 )",
                skillEffectId: null,
              },
            ],
          },
        },
        {
          id: "",
          state: "PUBLIC",
          skillTreeName: "MAGIC",
          name: "勇气源泉",
          skillDescription: "",
          level: 10,
          weaponElementDependencyType: "TRUE",
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "23",
            actionModifiableDurationFormula: "148",
            skillExtraActionType: "Chanting",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "1",
            skillStartupFramesFormula: "",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "400",
                skillEffectId: null,
              },
            ],
            skillYield: [
              {
                id: "",
                name: "角色最终伤害+20%",
                yieldType: "ImmediateEffect",
                yieldFormula: "p.final + 20",
                mutationTimingFormula: null,
                skillEffectId: null,
              },
              {
                id: "",
                name: "角色武器攻击+30%",
                yieldType: "ImmediateEffect",
                mutationTimingFormula: null,
                yieldFormula: "p.weaponAtk + 30%",
                skillEffectId: null,
              },
              {
                id: "",
                name: "角色命中-50%",
                yieldType: "ImmediateEffect",
                mutationTimingFormula: null,
                yieldFormula: "p.hit - 50%",
                skillEffectId: null,
              },
            ],
          },
        },
        {
          id: "",
          state: "PUBLIC",
          skillTreeName: "MAGIC",
          name: "冲击波",
          skillDescription: "",
          level: 7,
          weaponElementDependencyType: "TRUE",
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "13",
            actionModifiableDurationFormula: "48",
            skillExtraActionType: "Chanting",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "max(0,min((2 - (p.lv - 1) * 0.25),(1 - (p.lv - 5) * 0.5)))",
            skillStartupFramesFormula: "0",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "p.mp = p.mp - 200",
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
          element: "NO_ELEMENT",
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
            description: null,
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "p.mp = p.mp - 500",
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
    } satisfies skillSequenceList,
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
          element: "NO_ELEMENT",
          skillType: "ACTIVE_SKILL",
          skillEffect: {
            id: "",
            description: null,
            actionBaseDurationFormula: "13",
            actionModifiableDurationFormula: "48",
            skillExtraActionType: "Chanting",
            chargingBaseDurationFormula: "0",
            chargingModifiableDurationFormula: "0",
            chantingBaseDurationFormula: "0",
            chantingModifiableDurationFormula: "max(0,min((2 - (p.lv - 1) * 0.25),(1 - (p.lv - 5) * 0.5)))",
            skillStartupFramesFormula: "0",
            belongToskillId: "",
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "p.mp = p.mp - 200",
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
          element: "NO_ELEMENT",
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
            description: null,
            skillCost: [
              {
                id: "",
                name: "MP Cost",
                costFormula: "p.mp = p.mp - 500",
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
    } satisfies skillSequenceList,
  };
  const [team, setTeam] = createSignal<computeInput["arg"]["team"]>([
    {
      config: test.character,
      actionQueue: test.skillSequence1.data,
    },
    {
      config: test.character,
      actionQueue: test.skillSequence2.data,
    },
  ]);

  function stringToColor(str: string): string {
    // 预定义的颜色数组
    const colors: string[] = [];
    // 生成 14 个颜色值
    for (let i = 0; i < 15; i++) {
      const hue = math.floor((i * (360 / 15)) % 360); // 色相值，从蓝色开始逐渐增加
      const saturation = "60%"; // 饱和度设置为 100%
      const lightness = "50%"; // 亮度设置为 50%

      // 将 HSL 颜色值转换为 CSS 格式的字符串
      const color = `hsl(${hue}, ${saturation}, ${lightness})`;

      colors.push(color);
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash += str.charCodeAt(i);
    }

    // 将散列值映射到颜色数组的索引范围内
    const index = hash % colors.length;

    // 返回对应索引的颜色值
    return colors[index]!;
  }

  function generateResultDom(frameData: FrameData[]) {
    const result = frameData;
    const lastFrameData = result.at(-1);
    const RemainingHp = lastFrameData ? dynamicTotalValue(lastFrameData.monsterData.hp) : 0;
    const totalDamge = (lastFrameData?.monsterData.hp.baseValue ?? 0) - RemainingHp;
    const totalDuration = result.length / 60;
    const dps = totalDamge / totalDuration;
    return (
      <>
        <div class="Result my-10 flex flex-col gap-4 lg:flex-row lg:items-end">
          <div class="DPS flex flex-col gap-2">
            <span class="Key py-2 text-sm">DPS</span>
            <span class="Value border-y-[1px] border-brand-color-1st p-4 text-6xl lg:border-none lg:p-0 lg:text-8xl lg:text-accent-color">
              {math.floor(math.abs(dps))}
            </span>
          </div>
          <div class="OtherData flex flex-1 gap-2">
            <div class="Duration flex flex-1 flex-col gap-1 rounded bg-transition-color-8 lg:p-4">
              <span class="Key p-1 text-sm text-accent-color-70">总耗时</span>
              <span class="Value p-1 text-xl lg:text-2xl lg:text-accent-color">
                {math.floor(math.abs(totalDuration))} 秒
              </span>
            </div>
            <div class="Duration flex flex-1 flex-col gap-1 rounded bg-transition-color-8 lg:p-4">
              <span class="Key p-1 text-sm text-accent-color-70">总伤害</span>
              <span class="Value p-1 text-xl lg:text-2xl lg:text-accent-color">
                {math.floor(math.abs(totalDamge) / 10000)} 万
              </span>
            </div>
            <div class="Duration flex flex-1 flex-col gap-1 rounded bg-transition-color-8 lg:p-4">
              <span class="Key p-1 text-sm text-accent-color-70">怪物剩余HP</span>
              <span class="Value p-1 text-xl lg:text-2xl lg:text-accent-color">
                {math.floor(math.abs(RemainingHp) / 10000)}万
              </span>
            </div>
          </div>
        </div>
        <div class="TimeLine flex flex-col gap-4">
          <div class="Title border-b-2 border-brand-color-1st p-2">
            <span class="Key p-1">时间轴</span>
          </div>
          <div class="Content flex flex-1 flex-wrap gap-y-4 shadow-transition-color-20 drop-shadow-2xl">
            {result.map((frameData, frame) => {
              return (
                <div class={`FrameData${frame} flex flex-col justify-around gap-1`}>
                  {frameData.teamState.map((member, memberIndex) => {
                    const color = stringToColor(member?.skillData.name ?? "");
                    return frame === 0 ? (
                      <button class="MemberName p-1 text-sm">{member?.name}</button>
                    ) : (
                      <button
                        class={`MemberData group relative h-4 px-[1px]`}
                        style={{
                          "background-color": member ? color : "transparent",
                        }}
                        onClick={() => {
                          console.log("点击了队员：", member?.name, "的第：", frame, "帧");
                          if (member) {
                            setDialogFrameData(frameData);
                            setDialogState(true);
                          }
                        }}
                      >
                        {member ? (
                          <div class="absolute -left-4 bottom-14 z-10 hidden w-fit min-w-[300px] flex-col gap-2 rounded bg-primary-color p-2 text-left shadow-2xl shadow-transition-color-20 backdrop-blur-xl lg:group-hover:z-20 lg:group-hover:flex">
                            <div class="FrameAttr flex flex-col gap-1 bg-transition-color-8 p-1">
                              <span class="Title font-bold">队员: {member?.name}</span>
                              <span class="Content">
                                第 {math.floor(frame / 60)} 秒的第 {frame % 60} 帧
                                <br />
                              </span>

                              <span class="Content">
                                技能 {(member?.actionIndex ?? 0) + 1} {member?.skillData.name} 的第：
                                {member?.actionFrameIndex} / {member?.skillData.skillDuration} 帧
                                <br />
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  onMount(() => {
    console.log("--ComboAnalyze Client Render");
    setMonsterList(generateAugmentedMonsterList(defaultMonsterList(), dictionary()));
    setCharacterList([defaultSelectCharacter, defaultSelectCharacter]);
    setMonster(test.monster);
    setCharacter(test.character);

    calculatorWorker.onmessage = (e: MessageEvent<computeOutput>) => {
      const { type, computeResult } = e.data;
      switch (type) {
        case "progress":
          {
            const result = computeResult as string;
            setComputeResult(<div class="Result my-10 flex items-end">{result}</div>);
          }
          break;
        case "success":
          {
            setComputeResult(generateResultDom(computeResult as FrameData[]));
          }
          break;
        case "error":
          {
            setComputeResult(<div class="Result my-10 flex items-end">发生错误</div>);
          }
          break;
        default:
          break;
      }
    };

    calculatorWorker.onerror = (error) => {
      console.error("Worker error:", error);
    };

    return () => {
      console.log("--ComboAnalyze Client Unmount");
      if (calculatorWorker) {
        calculatorWorker.terminate();
      }
    };
  });

  const startCompute = () => {
    setComputeResult(null);
    const workerMessage: computeInput = JSON.parse(
      JSON.stringify({
        type: "start",
        arg: {
          dictionary: dictionary(),
          team: team(),
          monster: monster,
        },
      }),
    );
    calculatorWorker.postMessage(workerMessage);
  };

  return (
    <>
      <div class="Title sticky left-0 mt-3 flex flex-col gap-9 py-5 p-3 lg:pt-12">
        <div class="Row flex flex-col items-center justify-between gap-10 lg:flex-row lg:justify-start lg:gap-4">
          <h1 class="Text text-left text-3xl lg:bg-transparent lg:text-4xl">{dictionary().ui.analyze.pageTitle}</h1>
          <div class="Control flex flex-1 gap-2">
            <input
              type="search"
              placeholder={dictionary().ui.searchPlaceholder}
              class="w-full flex-1 rounded-sm border-transition-color-20 bg-transition-color-8 px-3 py-2 backdrop-blur-xl placeholder:text-accent-color-50 hover:border-accent-color-70 hover:bg-transition-color-8 focus:border-accent-color-70 focus:outline-none lg:flex-1 lg:rounded-none lg:border-b-1.5 lg:bg-transparent lg:px-5 lg:font-normal"
            />
          </div>
        </div>
        <div class="Discription my-3 hidden rounded-sm bg-transition-color-8 p-3 lg:block">
          {dictionary().ui.analyze.description}
        </div>
        <div></div>
      </div>
      <div class="Content flex flex-col gap-4 p-3">
        <div class="MonsterConfig flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="Title flex gap-4">
            <span class="Key">怪物：</span>
            <span class="MonsterName font-bold">{monster.name}</span>
          </div>
          {/* <LongSearchBox dictionary={dictionary} monsterList={monsterList} setMonster={setMonster} /> */}
        </div>
        <div class="TeamConfig flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="Title flex flex-col gap-4">队伍配置：</div>
          <div class="Content flex flex-col">
            {team().map((member, index) => {
              return (
                <div class="Member flex flex-col gap-4 border-b border-transition-color-20 p-4 lg:flex-row lg:items-center">
                  <div class="CharacterConfig flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div class="Title flex gap-4">
                      <span class="Key">角色：</span>
                      <span class="CharacterName font-bold">{member.config.name}</span>
                    </div>
                  </div>
                  <div class="SkillSequence flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div class="Title">流程：</div>
                    <div class="Content flex flex-wrap gap-2">
                      {member.actionQueue.map((skill, index) => {
                        return (
                          <Button size="sm">
                            {skill.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button size="sm" level="primary" onClick={startCompute}>
          开始计算
        </Button>
        {computeResult()}
      </div>

      <Dialog state={dialogState()} setState={setDialogState}>
        <div class="Content flex w-full flex-col overflow-y-auto p-2 lg:p-4">
          <div class="Title flex items-center gap-6">
            {/* <div class="h-[2px] flex-1 bg-accent-color"></div> */}
            <span class="text-lg font-bold lg:text-2xl">当前帧属性</span>
            <div class="h-[2px] flex-1 bg-accent-color"></div>
          </div>
          <div class="Content flex flex-col gap-4 overflow-y-auto">
            <div class="FrameAttr mt-4 flex flex-col gap-1 bg-transition-color-8 p-2 lg:flex-row">
              <span class="Content">
                帧信息： {math.floor((dialogFrameData()?.frame ?? 0) / 60)} 秒的第{" "}
                {(dialogFrameData()?.frame ?? 0) % 60} 帧
              </span>
            </div>
            <div class="CharacterData flex flex-col gap-1">
              <div class="Title sticky top-0 z-10 flex items-center gap-6 bg-primary-color pt-4">
                <span class="Title text-base font-bold lg:text-xl">Character</span>
                <div class="h-[1px] flex-1 bg-brand-color-1st"></div>
              </div>
              <div class="Content flex flex-wrap outline-[1px] lg:gap-1">
                <div class="Tab flex flex-wrap gap-1">
                  {dialogFrameData()?.teamState.map((member, memberIndex) => {
                    return (
                      <Button onClick={() => setDialogMeberIndex(memberIndex)} size="sm">
                        {member?.name}
                      </Button>
                    );
                  })}
                </div>
                {dialogFrameData()?.teamState.map((member, memberIndex) => {
                  return (
                    <ObjectRenderer
                      data={member?.characterData}
                      dictionary={dictionary()}
                      display={dialogMeberIndex() === memberIndex}
                    />
                  );
                })}
                <div class="Title flex items-center gap-6 bg-primary-color pt-4">
                  <span class="Title text-base font-bold">Skill</span>
                  <div class="h-[1px] flex-1 bg-brand-color-1st"></div>
                </div>
                {dialogFrameData()?.teamState.map((member, memberIndex) => {
                  return (
                    <ObjectRenderer
                      data={member?.skillData}
                      dictionary={dictionary()}
                      display={dialogMeberIndex() === memberIndex}
                    />
                  );
                })}
              </div>
            </div>
            <div class="MonsterData flex flex-col gap-1">
              <div class="Title sticky top-0 z-10 flex items-center gap-6 bg-primary-color pt-4">
                <span class="Title text-base font-bold lg:text-xl">Monster</span>
                <div class="h-[1px] flex-1 bg-brand-color-1st"></div>
              </div>
              <div class="Content flex flex-wrap outline-[1px] lg:gap-1">
                {dialogFrameData() ? (
                  <ObjectRenderer dictionary={dictionary()} data={dialogFrameData()?.monsterData} display />
                ) : null}
              </div>
            </div>
          </div>
          <div class="FunctionArea flex flex-col justify-end gap-4 bg-primary-color">
            <div class="h-[1px] flex-none bg-brand-color-1st"></div>
            <div class="btnGroup flex gap-2">
              <Button
                onClick={() => {
                  setDialogState(false);
                }}
              >
                {dictionary().ui.actions.close} [Esc]
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
