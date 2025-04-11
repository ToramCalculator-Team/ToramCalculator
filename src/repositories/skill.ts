import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, skill } from "~/../db/kysely/kyesely";
import { insertStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createSkillEffect, SkillEffect, skillEffectSubRelations } from "./skillEffect";
import { ConvertToAllDetail, ConvertToAllString, DataType } from "./untils";
import { getDictionary, Locale } from "~/locales/i18n";

export interface Skill extends DataType<skill> {
  MainTable: Awaited<ReturnType<typeof findSkills>>[number];
  MainForm: skill;
}

export function skillSubRelations(eb: ExpressionBuilder<DB, "skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "skill.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("skill_effect")
        .whereRef("skill_effect.belongToskillId", "=", "skill.id")
        .selectAll("skill_effect")
        .select((subEb) => skillEffectSubRelations(subEb, subEb.val(id))),
    ).as("effects"),
  ];
}

export async function findSkillById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("id", "=", id)
    .selectAll("skill")
    .select((eb) => skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSkills() {
  const db = await getDB();
  return await db.selectFrom("skill").selectAll("skill").execute();
}

export async function updateSkill(id: string, updateWith: Skill["Update"]) {
  const db = await getDB();
  return await db.updateTable("skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertSkill(trx: Transaction<DB>, newSkill: Skill["Insert"]) {
  const statistic = await insertStatistic(trx);
  const skill = await trx
    .insertInto("skill")
    .values({
      ...newSkill,
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return skill;
}

export async function createSkill(newSkill: { skill: Skill["Insert"]; skillEffects: SkillEffect["Insert"][] }) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const skill = await insertSkill(trx, newSkill.skill);
    const skillEffects = await Promise.all(
      newSkill.skillEffects.map((skillEffect) => createSkillEffect({ ...skillEffect, belongToskillId: skill.id })),
    );
    return skill;
  });
}

export async function deleteSkill(id: string) {
  const db = await getDB();
  return await db.deleteFrom("skill").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkill: Skill["Select"] = {
  id: "",
  name: "",
  treeType: "MagicSkill",
  posX: 0,
  posY: 0,
  tier: 0,
  chargingType: "Chanting",
  distanceType: "Both",
  targetType: "Enemy",
  isPassive: false,
  dataSources: "",
  details: "",
  updatedByAccountId: "",
  createdByAccountId: "",
  statisticId: "",
};

export const SkillDic = (locale: Locale): ConvertToAllDetail<Skill["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: {
          key: "技能",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        id: {
          key: "ID",
          tableFieldDescription: "这是技能的数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是技能的数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        name: {
          key: "名称",
          tableFieldDescription: "技能名称，通常和游戏内一致，通常...",
          formFieldDescription: "技能名称，请填写和游戏内一致的翻译。你也不想大伙看到你写的东西之后一脸懵逼是吧。",
        },
        treeType: {
          key: "所属技能树",
          tableFieldDescription: "技能的最顶层分类，比如魔法技能、黑暗之力、辅助技能、好战分子等",
          formFieldDescription: "技能的最顶层分类，比如魔法技能、黑暗之力、辅助技能、好战分子等",
        },
        posX: {
          key: "水平坐标",
          tableFieldDescription: "在技能树中的位置，最左侧的一列定义为第0列",
          formFieldDescription: "在技能树中的位置，最左侧的一列定义为第0列",
        },
        posY: {
          key: "垂直坐标",
          tableFieldDescription: "在技能树中的位置，第0列中最上面的那个技能位置定义为第0行",
          formFieldDescription: "在技能树中的位置，第0列中最上面的那个技能位置定义为第0行",
        },
        tier: {
          key: "位阶",
          tableFieldDescription: "主要用于计算佣兵技能释放间隔",
          formFieldDescription: "主要用于计算佣兵技能释放间隔",
        },
        targetType: {
          key: "目标类型",
          tableFieldDescription: `不需要选择目标即可释放的为${getDictionary(locale).enums.skill.targetType.Self}，能以${getDictionary(locale).enums.skill.targetType.Player}为目标的技能即为${getDictionary(locale).enums.skill.targetType.Player}。`,
          formFieldDescription: `不需要选择目标即可释放的为${getDictionary(locale).enums.skill.targetType.Self}，能以${getDictionary(locale).enums.skill.targetType.Player}为目标的技能即为${getDictionary(locale).enums.skill.targetType.Player}。`,
        },
        chargingType: {
          key: "施法动作类型",
          tableFieldDescription: `不受咏唱影响的都为${getDictionary(locale).enums.skill.chargingType.Reservoir}。`,
          formFieldDescription: `不受咏唱影响的都为${getDictionary(locale).enums.skill.chargingType.Reservoir}。`,
        },
        distanceType: {
          key: "距离威力类型",
          tableFieldDescription: "表示此技能受这些类型的距离威力影响",
          formFieldDescription: "表示此技能受这些类型的距离威力影响",
        },
        isPassive: {
          key: "是被动技能吗",
          tableFieldDescription: "学习后就一直生效的技能即为被动技能",
          formFieldDescription: "学习后就一直生效的技能即为被动技能",
        },
        details: {
          key: "额外说明",
          tableFieldDescription: "编辑者想额外描述的东西",
          formFieldDescription: "其他的你想告诉阅读者的东西",
        },
        dataSources: {
          key: "数据来源",
          tableFieldDescription: "此数据的实际测量者或者组织",
          formFieldDescription: "此数据的实际测量者或者组织",
        },
        statisticId: {
          key: "统计信息ID",
          tableFieldDescription: "这是统计信息字段数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription:
            "这是统计信息字段数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "这是更新者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是更新者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        createdByAccountId: {
          key: "创建者ID",
          tableFieldDescription: "这是创建者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是创建者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
      };
    case "zh-TW":
      return {
        selfName: {
          key: "技能",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        id: {
          key: "ID",
          tableFieldDescription: "這是技能的資料庫ID，一般來說，你應該不可能看到這個。",
          formFieldDescription: "這是技能的資料庫ID，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        name: {
          key: "名稱",
          tableFieldDescription: "技能名稱，通常和遊戲內一致。",
          formFieldDescription: "技能名稱，請填寫和遊戲內一致的翻譯。你也不想大家看到你寫的東西之後一臉茫然吧。",
        },
        treeType: {
          key: "所屬技能樹",
          tableFieldDescription: "技能的最頂層分類，比如魔法技能、黑暗之力、輔助技能、好戰分子等。",
          formFieldDescription: "技能的最頂層分類，比如魔法技能、黑暗之力、輔助技能、好戰分子等。",
        },
        posX: {
          key: "水平座標",
          tableFieldDescription: "在技能樹中的位置，最左側的一列定義為第0列。",
          formFieldDescription: "在技能樹中的位置，最左側的一列定義為第0列。",
        },
        posY: {
          key: "垂直座標",
          tableFieldDescription: "在技能樹中的位置，第0列中最上面的那個技能位置定義為第0行。",
          formFieldDescription: "在技能樹中的位置，第0列中最上面的那個技能位置定義為第0行。",
        },
        tier: {
          key: "位階",
          tableFieldDescription: "主要用於計算傭兵技能釋放間隔。",
          formFieldDescription: "主要用於計算傭兵技能釋放間隔。",
        },
        targetType: {
          key: "目標類型",
          tableFieldDescription: `不需要選擇目標即可釋放的為${getDictionary(locale).enums.skill.targetType.Self}，能以${getDictionary(locale).enums.skill.targetType.Player}為目標的技能即為${getDictionary(locale).enums.skill.targetType.Player}。`,
          formFieldDescription: `不需要選擇目標即可釋放的為${getDictionary(locale).enums.skill.targetType.Self}，能以${getDictionary(locale).enums.skill.targetType.Player}為目標的技能即為${getDictionary(locale).enums.skill.targetType.Player}。`,
        },
        chargingType: {
          key: "施法動作類型",
          tableFieldDescription: `不受詠唱影響的都為${getDictionary(locale).enums.skill.chargingType.Reservoir}。`,
          formFieldDescription: `不受詠唱影響的都為${getDictionary(locale).enums.skill.chargingType.Reservoir}。`,
        },
        distanceType: {
          key: "距離威力類型",
          tableFieldDescription: "表示此技能受這些類型的距離威力影響。",
          formFieldDescription: "表示此技能受這些類型的距離威力影響。",
        },
        isPassive: {
          key: "是被動技能嗎",
          tableFieldDescription: "學習後就一直生效的技能即為被動技能。",
          formFieldDescription: "學習後就一直生效的技能即為被動技能。",
        },
        details: {
          key: "額外說明",
          tableFieldDescription: "編輯者想額外描述的東西。",
          formFieldDescription: "其他的你想告訴閱讀者的東西。",
        },
        dataSources: {
          key: "資料來源",
          tableFieldDescription: "此數據的實際測量者或者組織。",
          formFieldDescription: "此數據的實際測量者或者組織。",
        },
        statisticId: {
          key: "統計資訊ID",
          tableFieldDescription: "這是統計資訊欄位資料庫ID，一般來說，你應該不可能看到這個。",
          formFieldDescription:
            "這是統計資訊欄位資料庫ID，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "這是更新者資料庫ID，一般來說，你應該不可能看到這個。",
          formFieldDescription: "這是更新者資料庫ID，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        createdByAccountId: {
          key: "創建者ID",
          tableFieldDescription: "這是創建者資料庫ID，一般來說，你應該不可能看到這個。",
          formFieldDescription: "這是創建者資料庫ID，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
      };
    case "en":
      return {
        selfName: {
          key: "Skill",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        id: {
          key: "ID",
          tableFieldDescription: "This is the database ID of the skill. Generally, you should not see this.",
          formFieldDescription:
            "This is the database ID of the skill. If you are asked to input this somewhere, please report it to the developers. This is an abnormal situation.",
        },
        name: {
          key: "Name",
          tableFieldDescription: "The name of the skill, usually consistent with the in-game name.",
          formFieldDescription:
            "The name of the skill. Please fill in the translation that matches the in-game name. You don't want others to be confused by what you write, right?",
        },
        treeType: {
          key: "Skill Tree Type",
          tableFieldDescription:
            "The top-level classification of the skill, such as Magic Skills, Dark Power, Support Skills, Warmonger, etc.",
          formFieldDescription:
            "The top-level classification of the skill, such as Magic Skills, Dark Power, Support Skills, Warmonger, etc.",
        },
        posX: {
          key: "Horizontal Position",
          tableFieldDescription:
            "The position of the skill in the skill tree. The leftmost column is defined as column 0.",
          formFieldDescription:
            "The position of the skill in the skill tree. The leftmost column is defined as column 0.",
        },
        posY: {
          key: "Vertical Position",
          tableFieldDescription:
            "The position of the skill in the skill tree. The topmost skill in column 0 is defined as row 0.",
          formFieldDescription:
            "The position of the skill in the skill tree. The topmost skill in column 0 is defined as row 0.",
        },
        tier: {
          key: "Tier",
          tableFieldDescription: "Primarily used to calculate the cooldown interval for mercenary skills.",
          formFieldDescription: "Primarily used to calculate the cooldown interval for mercenary skills.",
        },
        targetType: {
          key: "Target Type",
          tableFieldDescription: `Skills that do not require selecting a target to cast are ${getDictionary(locale).enums.skill.targetType.Self}, and skills that can target ${getDictionary(locale).enums.skill.targetType.Player} are ${getDictionary(locale).enums.skill.targetType.Player}.`,
          formFieldDescription: `Skills that do not require selecting a target to cast are ${getDictionary(locale).enums.skill.targetType.Self}, and skills that can target ${getDictionary(locale).enums.skill.targetType.Player} are ${getDictionary(locale).enums.skill.targetType.Player}.`,
        },
        chargingType: {
          key: "Casting Action Type",
          tableFieldDescription: `Skills unaffected by chanting are ${getDictionary(locale).enums.skill.chargingType.Reservoir}.`,
          formFieldDescription: `Skills unaffected by chanting are ${getDictionary(locale).enums.skill.chargingType.Reservoir}.`,
        },
        distanceType: {
          key: "Distance Power Type",
          tableFieldDescription:
            "Indicates that this skill is affected by these types of distance-based power effects.",
          formFieldDescription: "Indicates that this skill is affected by these types of distance-based power effects.",
        },
        isPassive: {
          key: "Is Passive Skill",
          tableFieldDescription: "Skills that take effect immediately after learning are passive skills.",
          formFieldDescription: "Skills that take effect immediately after learning are passive skills.",
        },
        details: {
          key: "Additional Notes",
          tableFieldDescription: "Extra information the editor wants to describe.",
          formFieldDescription: "Other things you want to tell the readers.",
        },
        dataSources: {
          key: "Data Source",
          tableFieldDescription: "The actual measurer or organization of this data.",
          formFieldDescription: "The actual measurer or organization of this data.",
        },
        statisticId: {
          key: "Statistic ID",
          tableFieldDescription: "This is the database ID of the statistic field. Generally, you should not see this.",
          formFieldDescription:
            "This is the database ID of the statistic field. If you are asked to input this somewhere, please report it to the developers. This is an abnormal situation.",
        },
        updatedByAccountId: {
          key: "Updated By Account ID",
          tableFieldDescription: "This is the database ID of the updater. Generally, you should not see this.",
          formFieldDescription:
            "This is the database ID of the updater. If you are asked to input this somewhere, please report it to the developers. This is an abnormal situation.",
        },
        createdByAccountId: {
          key: "Created By Account ID",
          tableFieldDescription: "This is the database ID of the creator. Generally, you should not see this.",
          formFieldDescription:
            "This is the database ID of the creator. If you are asked to input this somewhere, please report it to the developers. This is an abnormal situation.",
        },
      };
    case "ja":
      return {
        selfName: {
          key: "スキル",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        id: {
          key: "ID",
          tableFieldDescription: "これはスキルのデータベースIDです。一般的に、これを見ることはできません。",
          formFieldDescription:
            "これはスキルのデータベースIDです。もし入力を求められたら、開発者に報告してください。これは異常な状況です。",
        },
        name: {
          key: "名前",
          tableFieldDescription: "スキル名で、通常はゲーム内と一致しています。",
          formFieldDescription:
            "スキル名を入力してください。翻訳がゲーム内と一致するようにしてください。混乱を招きたくないですよね。",
        },
        treeType: {
          key: "スキルツリー分類",
          tableFieldDescription:
            "スキルの最上位分類で、例えば魔法スキル、ダークパワー、サポートスキル、好戦分子などがあります。",
          formFieldDescription:
            "スキルの最上位分類で、例えば魔法スキル、ダークパワー、サポートスキル、好戦分子などがあります。",
        },
        posX: {
          key: "横座標",
          tableFieldDescription: "スキルツリー内の位置で、最も左の列は第0列として定義されています。",
          formFieldDescription: "スキルツリー内の位置で、最も左の列は第0列として定義されています。",
        },
        posY: {
          key: "縦座標",
          tableFieldDescription: "スキルツリー内の位置で、第0列の一番上のスキル位置は第0行として定義されています。",
          formFieldDescription: "スキルツリー内の位置で、第0列の一番上のスキル位置は第0行として定義されています。",
        },
        tier: {
          key: "ティア",
          tableFieldDescription: "主に傭兵スキルの使用間隔を計算するために使用されます。",
          formFieldDescription: "主に傭兵スキルの使用間隔を計算するために使用されます。",
        },
        targetType: {
          key: "対象タイプ",
          tableFieldDescription: `ターゲットを選択せずに使用できるスキルは${getDictionary(locale).enums.skill.targetType.Self}、${getDictionary(locale).enums.skill.targetType.Player}を対象とするスキルは${getDictionary(locale).enums.skill.targetType.Player}です。`,
          formFieldDescription: `ターゲットを選択せずに使用できるスキルは${getDictionary(locale).enums.skill.targetType.Self}、${getDictionary(locale).enums.skill.targetType.Player}を対象とするスキルは${getDictionary(locale).enums.skill.targetType.Player}です。`,
        },
        chargingType: {
          key: "詠唱アクションタイプ",
          tableFieldDescription: `詠唱の影響を受けないスキルはすべて${getDictionary(locale).enums.skill.chargingType.Reservoir}です。`,
          formFieldDescription: `詠唱の影響を受けないスキルはすべて${getDictionary(locale).enums.skill.chargingType.Reservoir}です。`,
        },
        distanceType: {
          key: "距離威力タイプ",
          tableFieldDescription: "このスキルはこれらの距離に基づく威力効果の影響を受けます。",
          formFieldDescription: "このスキルはこれらの距離に基づく威力効果の影響を受けます。",
        },
        isPassive: {
          key: "パッシブスキルですか",
          tableFieldDescription: "習得後に自動的に効果が継続するスキルはパッシブスキルです。",
          formFieldDescription: "習得後に自動的に効果が継続するスキルはパッシブスキルです。",
        },
        details: {
          key: "追加説明",
          tableFieldDescription: "編集者が追加で記述したい情報。",
          formFieldDescription: "他の読者に伝えたい情報があれば記載してください。",
        },
        dataSources: {
          key: "データソース",
          tableFieldDescription: "このデータの実際の測定者または組織。",
          formFieldDescription: "このデータの実際の測定者または組織。",
        },
        statisticId: {
          key: "統計情報ID",
          tableFieldDescription: "これは統計情報フィールドのデータベースIDです。一般的に、これを見ることはありません。",
          formFieldDescription:
            "これは統計情報フィールドのデータベースIDです。もし入力を求められたら、開発者に報告してください。これは異常な状況です。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "これは更新者のデータベースIDです。一般的に、これを見ることはありません。",
          formFieldDescription:
            "これは更新者のデータベースIDです。もし入力を求められたら、開発者に報告してください。これは異常な状況です。",
        },
        createdByAccountId: {
          key: "作成者ID",
          tableFieldDescription: "これは作成者のデータベースIDです。一般的に、これを見ることはありません。",
          formFieldDescription:
            "これは作成者のデータベースIDです。もし入力を求められたら、開発者に報告してください。これは異常な状況です。",
        },
      };
  }
};
