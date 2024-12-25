import { Mob } from "~/repositories/mob";
import { dictionary } from "~/locales/dictionaries/type";

type Star = 0 | 1 | 2 | 3 | 4;

export const generateMobByStar = (
  baseMob: Mob,
  star: Star,
  generateName?: boolean,
  dictionary?: dictionary,
): Mob => {
  const resultMob = {
    ...baseMob,
    name: baseMob.name + (generateName ? " " + dictionary?.ui.mob.mobDegreeOfDifficulty[star] : ""),
    baseLv: baseMob.baseLv + [-10, 0, 10, 20, 40][star],
    experience: baseMob.experience * [0.1, 1, 2, 5, 10][star],
    maxhp: baseMob.maxhp * [0.1, 1, 2, 5, 10][star],
    physicalDefense: baseMob.physicalDefense * [0.1, 1, 2, 4, 6][star],
    magicalDefense: baseMob.magicalDefense * [0.1, 1, 2, 4, 6][star],
    avoidance: baseMob.avoidance * [0.1, 1, 2, 4, 6][star],
  } satisfies Mob;
  return resultMob;
};

/**
 * 通过基本列表生成包含其他星级定点boss属性的列表
 * @param baseMobList 基本列表
 * @param dictionary UI字典
 * @returns 新的列表
 */
export const generateAugmentedMobList = (baseMobList: Mob[], dictionary: dictionary) => {
  const result: Mob[] = [];
  baseMobList.forEach((mob) => {
    // 表中记录的是1星状态下的定点王数据， 2 / 3 / 4 星的经验和HP为1星的 2 / 5 / 10 倍；物防、魔防、回避值为1星的 2 / 4 / 6 倍。
    if (mob.mobType !== "Boss") {
      result.push(mob);
    } else {
      result.push(
        generateMobByStar(mob, 0, true, dictionary),
        generateMobByStar(mob, 1, true, dictionary),
        generateMobByStar(mob, 2, true, dictionary),
        generateMobByStar(mob, 3, true, dictionary),
        generateMobByStar(mob, 4, true, dictionary),
      );
    }
  });
  return result;
};
