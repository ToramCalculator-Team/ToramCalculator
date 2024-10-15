import { SelectMonster } from "~/repositories/monster";
import { dictionary } from "~/locales/dictionaries/type";

type Star = 0 | 1 | 2 | 3 | 4;

export const generateMonsterByStar = (
  baseMonster: SelectMonster,
  star: Star,
  generateName?: boolean,
  dictionary?: dictionary,
): SelectMonster => {
  const resultMonster = {
    ...baseMonster,
    name: baseMonster.name + (generateName ? " " + dictionary?.ui.monster.monsterDegreeOfDifficulty[star] : ""),
    baseLv: baseMonster.baseLv + [-10, 0, 10, 20, 40][star],
    experience: baseMonster.experience * [0.1, 1, 2, 5, 10][star],
    maxhp: baseMonster.maxhp * [0.1, 1, 2, 5, 10][star],
    physicalDefense: baseMonster.physicalDefense * [0.1, 1, 2, 4, 6][star],
    magicalDefense: baseMonster.magicalDefense * [0.1, 1, 2, 4, 6][star],
    avoidance: baseMonster.avoidance * [0.1, 1, 2, 4, 6][star],
  } satisfies SelectMonster;
  return resultMonster;
};

/**
 * 通过基本列表生成包含其他星级定点boss属性的列表
 * @param baseMonsterList 基本列表
 * @param dictionary UI字典
 * @returns 新的列表
 */
export const generateAugmentedMonsterList = (baseMonsterList: SelectMonster[], dictionary: dictionary) => {
  const result: SelectMonster[] = [];
  baseMonsterList.forEach((monster) => {
    // 表中记录的是1星状态下的定点王数据， 2 / 3 / 4 星的经验和HP为1星的 2 / 5 / 10 倍；物防、魔防、回避值为1星的 2 / 4 / 6 倍。
    if (monster.monsterType !== "COMMON_BOSS") {
      result.push(monster);
    } else {
      result.push(
        generateMonsterByStar(monster, 0, true, dictionary),
        generateMonsterByStar(monster, 1, true, dictionary),
        generateMonsterByStar(monster, 2, true, dictionary),
        generateMonsterByStar(monster, 3, true, dictionary),
        generateMonsterByStar(monster, 4, true, dictionary),
      );
    }
  });
  return result;
};
