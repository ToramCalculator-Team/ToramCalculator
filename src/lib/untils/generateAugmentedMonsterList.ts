import { SelectMonster } from "~/schema/monster";
import { dictionary } from "~/locales/dictionaries/type";

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
        {
          ...monster,
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[1],
        },
        {
          ...monster,
          id: monster.id + "**",
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[2],
          baseLv: monster.baseLv !== null ? monster.baseLv + 10 : 0,
          experience: monster.experience !== null ? monster.experience * 2 : 0,
          maxhp: monster.maxhp !== null ? monster.maxhp * 2 : 0,
          physicalDefense: monster.physicalDefense !== null ? monster.physicalDefense * 2 : 0,
          magicalDefense: monster.magicalDefense !== null ? monster.magicalDefense * 2 : 0,
        },
        {
          ...monster,
          id: monster.id + "***",
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[3],
          baseLv: monster.baseLv !== null ? monster.baseLv + 20 : 0,
          experience: monster.experience !== null ? monster.experience * 5 : 0,
          maxhp: monster.maxhp !== null ? monster.maxhp * 5 : 0,
          physicalDefense: monster.physicalDefense !== null ? monster.physicalDefense * 4 : 0,
          magicalDefense: monster.magicalDefense !== null ? monster.magicalDefense * 4 : 0,
          avoidance: monster.avoidance !== null ? monster.avoidance * 4 : 0,
        },
        {
          ...monster,
          id: monster.id + "****",
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[4],
          baseLv: monster.baseLv !== null ? monster.baseLv + 40 : 0,
          experience: monster.experience !== null ? monster.experience * 10 : 0,
          maxhp: monster.maxhp !== null ? monster.maxhp * 10 : 0,
          physicalDefense: monster.physicalDefense !== null ? monster.physicalDefense * 6 : 0,
          magicalDefense: monster.magicalDefense !== null ? monster.magicalDefense * 6 : 0,
          avoidance: monster.avoidance !== null ? monster.avoidance * 6 : 0,
        },
      );
    }
  });
  return result;
};
