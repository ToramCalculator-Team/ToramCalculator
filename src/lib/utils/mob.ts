import { MobWithRelations, type Mob } from "@db/repositories/mob";
import { MobDifficultyFlag } from "@db/schema/enums";
import { mob } from "@db/generated/kysely/kysely";
/**
 * 
 * @param baseMob 零星状态下的数据
 * @param flag 怪物难度标识
 * @returns 
 */
export const generateBossDataByFlag = <T extends mob & unknown>(
  baseMob: T,
  flag: MobDifficultyFlag,
): T => {
  const rate: {
    lv: number;
    experience: number;
    maxhp: number;
    physicalDefense: number;
    magicalDefense: number;
    avoidance: number;
  } = {
      Easy: {
      lv: -10,
      experience: 0.1,
      maxhp: 0.1,
      physicalDefense: 0.1,
      magicalDefense: 0.1,
      avoidance: 0.1,
    },
      Normal: {
      lv: 0,
      experience: 1,
      maxhp: 1,
      physicalDefense: 1,
      magicalDefense: 1,
      avoidance: 1,
    },
      Hard: {
      lv: 10,
      experience: 2,
      maxhp: 2,
      physicalDefense: 2,
      magicalDefense: 2,
      avoidance: 2,
    },
      Lunatic: {
      lv: 20,
      experience: 5,
      maxhp: 5,
      physicalDefense: 4,
      magicalDefense: 4,
      avoidance: 4,
    },
      Ultimate: {
      lv: 40,
      experience: 10,
      maxhp: 10,
      physicalDefense: 6,
      magicalDefense: 6,
      avoidance: 6,
    },
  }[flag];

  const resultMob = {
    ...baseMob,
    baseLv: baseMob.baseLv + rate.lv,
    experience: baseMob.experience * rate.experience,
    maxhp: baseMob.maxhp * rate.maxhp,
    physicalDefense: baseMob.physicalDefense * rate.physicalDefense,
    magicalDefense: baseMob.magicalDefense * rate.magicalDefense,
    avoidance: baseMob.avoidance * rate.avoidance,
  };
  return resultMob;
};

/**
 * 通过基本列表生成包含其他星级定点boss属性的列表
 * @param baseMobList 基本列表
 * @param dictionary UI字典
 * @returns 新的列表
 */
export const generateAugmentedMobList = (baseMobList: MobWithRelations[]) => {
  const result: MobWithRelations[] = [];
  baseMobList.forEach((mob) => {
    // 表中记录的是1星状态下的定点王数据， 2 / 3 / 4 星的经验和HP为1星的 2 / 5 / 10 倍；物防、魔防、回避值为1星的 2 / 4 / 6 倍。
    if (mob.type !== "Boss") {
      result.push(mob);
    } else {
      result.push(
        generateBossDataByFlag(mob, "Easy"),
        generateBossDataByFlag(mob, "Normal"),
        generateBossDataByFlag(mob, "Hard"),
        generateBossDataByFlag(mob, "Lunatic"),
        generateBossDataByFlag(mob, "Ultimate"),
      );
    }
  });
  return result;
};
