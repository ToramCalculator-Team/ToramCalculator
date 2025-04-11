import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, mob } from "~/../db/kysely/kyesely";
import { statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { getDictionary, Locale } from "~/locales/i18n";
import { ConvertToAllDetail, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface Mob extends DataType<mob> {
  MainTable: Awaited<ReturnType<typeof findMobs>>[number];
  MainForm: mob;
}

export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_mobTozone")
        .innerJoin("zone", "_mobTozone.B", "zone.id")
        .where("_mobTozone.A", "=", id)
        .select("zone.name"),
    ).as("belongToZones"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("item", "item.id", "drop_item.itemId")
        .where("drop_item.dropById", "=", id)
        .selectAll("item"),
    ).as("dropItems"),
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "mob.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
  ];
}

export async function findMobById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMobsLike(searchString: string) {
  const db = await getDB();
  const results = await db.selectFrom("mob").where("name", "like", `%${searchString}%`).selectAll().execute();
  return results;
}

export async function findMobs() {
  const db = await getDB();
  const result = await db.selectFrom("mob").selectAll("mob").execute();
  return result;
}

export async function updateMob(id: string, updateWith: Mob["Update"]) {
  const db = await getDB();
  return await db.updateTable("mob").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMob(trx: Transaction<DB>, newMob: Mob["Insert"]) {
  const statistic = await trx
    .insertInto("statistic")
    .values({
      id: createId(),
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  const mob = await trx
    .insertInto("mob")
    .values({
      ...newMob,
      id: createId(),
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return mob;
}

export async function deleteMob(id: string) {
  const db = await getDB();
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMob: Mob["Select"] = {
  id: "",
  name: "",
  type: "Boss",
  captureable: false,
  actions: [],
  baseLv: 0,
  experience: 0,
  radius: 0,
  maxhp: 0,
  physicalDefense: 0,
  physicalResistance: 0,
  magicalDefense: 0,
  magicalResistance: 0,
  criticalResistance: 0,
  avoidance: 0,
  dodge: 0,
  block: 0,
  normalAttackResistanceModifier: 0,
  physicalAttackResistanceModifier: 0,
  magicalAttackResistanceModifier: 0,
  partsExperience: 0,
  initialElement: "Normal",
  details: "",
  dataSources: "",
  statisticId: "",
  updatedByAccountId: "",
  createdByAccountId: "",
};

// Dictionary
export const MobDic = (locale: Locale): ConvertToAllDetail<Mob["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: {
          key: "怪物",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "名称",
          tableFieldDescription: "怪物名称，通常和游戏内一致，通常...",
          formFieldDescription: "怪物名称，请填写和游戏内一致的翻译。你也不想大伙看到你写的东西之后一脸懵逼是吧。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "这是怪物的数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是怪物的数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        type: {
          key: "怪物类型",
          tableFieldDescription:
            "目前支持的类型只有这些，虽然实际上解包可以看到有很多种，但是对于咱这个应用没啥用，因此忽略了很多种类。",
          formFieldDescription:
            "目前支持的类型只有这些，虽然实际上解包可以看到有很多种，但是对于咱这个应用没啥用，因此忽略了很多种类。",
        },
        captureable: {
          key: "是否可捕获",
          tableFieldDescription: `这个属性只对${getDictionary(locale).enums.mob.type.Boss}和${getDictionary(locale).enums.mob.type.MiniBoss}以外的怪物有效，能抓的甘瑞夫和糖明凰目前被视为特殊怪物。`,
          formFieldDescription: `如果不是${getDictionary(locale).enums.mob.type.Mob}类型的怪物，请选择不可捕获。`,
        },
        actions: {
          key: "行为",
          cardFieldDescription: "怪物的行为描述，模拟器运行的时候会根据其中的逻辑模拟怪物行动",
          tableFieldDescription: "怪物的行为描述，如果你看到这句话，请反馈给开发人员，这不是正常的情况",
          formFieldDescription:
            "怪物的行为描述，模拟器运行的时候会根据其中的逻辑模拟怪物行动。写这个要很大的精力哦，加油加油~",
        },
        baseLv: {
          key: "基础等级",
          tableFieldDescription: `对于${getDictionary(locale).enums.mob.type.Boss}来说，这个值是${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}难度下的等级数值。其他类型的怪物由于没有难度标识，这个值就是实际等级`,
          formFieldDescription: `如果怪物类型是${getDictionary(locale).enums.mob.type.Boss},请填写你在选择${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}难度时它的等级。其他类型的怪物直接填写实际等级即可。`,
        },
        experience: {
          key: "经验",
          tableFieldDescription: `对于${getDictionary(locale).enums.mob.type.Boss}来说，这个值是${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}难度下的经验值。其他类型的怪物由于没有难度标识，这个值就是其际经验值`,
          formFieldDescription: `如果怪物类型是${getDictionary(locale).enums.mob.type.Boss},请填写你在选择${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}难度时它的经验值。其他类型的怪物直接填写实际经验值即可。`,
        },
        initialElement: {
          key: "元素属性",
          tableFieldDescription:
            "这是初始属性，怪物在战斗时可能会改变其属性，详细情况将取决于怪物行为中的描述，要查看怪物行为，请点击具体怪物",
          formFieldDescription: "这里填写怪物的初始属性即可，有关属性变化的描述请在怪物行为中编辑",
        },
        radius: {
          key: "半径",
          tableFieldDescription: "怪物的模型尺寸，主要是用来计算技能是否命中",
          formFieldDescription:
            "怪物的模型尺寸，主要是用来计算技能是否命中,从远处按下圣拳之裁后，技能发动瞬间屏幕上显示的距离-1就可以测出这个值。",
        },
        maxhp: {
          key: "最大生命值",
          tableFieldDescription: "不会有人不知道这个属性是什么意思吧，不会吧",
          formFieldDescription: `对于${getDictionary(locale).enums.mob.type.Boss}来说，这个值是${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}难度下显示的数值。其他类型的怪物由于没有难度标识，这个值可能需要估测`,
        },
        physicalDefense: {
          key: "物理防御",
          tableFieldDescription: "与物理贯穿相作用的属性",
          formFieldDescription: "与物理贯穿相作用的属性",
        },
        physicalResistance: {
          key: "物理抗性",
          tableFieldDescription: "对怪物来说，这可能是他们最实用的物理伤害减免区间，而且玩家只能靠技能常数来应对",
          formFieldDescription: "对怪物来说，这可能是他们最实用的物理伤害减免区间，而且玩家只能靠技能常数来应对",
        },
        magicalDefense: {
          key: "魔法防御",
          tableFieldDescription: "与魔法贯穿相作用的属性",
          formFieldDescription: "与魔法贯穿相作用的属性",
        },
        magicalResistance: {
          key: "魔法抗性",
          tableFieldDescription: "对怪物来说，这可能是他们最实用的魔法伤害减免区间，而且玩家只能靠技能常数来应对",
          formFieldDescription: "对怪物来说，这可能是他们最实用的魔法伤害减免区间，而且玩家只能靠技能常数来应对",
        },
        criticalResistance: {
          key: "暴击抗性",
          tableFieldDescription: "对于魔法伤害来说，其暴击率为（物理暴击率*法术暴击转化率）-此值",
          formFieldDescription: "对于魔法伤害来说，其暴击率为（物理暴击率*法术暴击转化率）-此值",
        },
        avoidance: {
          key: "回避",
          tableFieldDescription: "与命中值相作用后用于判断物理伤害是否命中",
          formFieldDescription: "与命中值相作用后用于判断物理伤害是否命中",
        },
        dodge: {
          key: "闪躲率",
          tableFieldDescription: "受到攻击时，会根据此值判断是否被击中",
          formFieldDescription: "受到攻击时，会根据此值判断是否被击中",
        },
        block: {
          key: "格挡率",
          tableFieldDescription: "受到攻击时，会根据此值判断是否格挡",
          formFieldDescription: "受到攻击时，会根据此值判断是否格挡",
        },
        normalAttackResistanceModifier: {
          key: "一般伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，一般惯性的变化值",
          formFieldDescription: "每次受到伤害时，一般惯性的变化值",
        },
        physicalAttackResistanceModifier: {
          key: "物理伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，物理惯性的变化值",
          formFieldDescription: "每次受到伤害时，物理惯性的变化值",
        },
        magicalAttackResistanceModifier: {
          key: "魔法伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，魔法惯性的变化值",
          formFieldDescription: "每次受到伤害时，魔法惯性的变化值",
        },
        partsExperience: {
          key: "部位经验",
          tableFieldDescription: `只有${getDictionary(locale).enums.mob.type.Boss}会有这个值，当某个部位被破坏时，讨伐后的总经验会额外增加此值`,
          formFieldDescription: `只有${getDictionary(locale).enums.mob.type.Boss}会有这个值，当某个部位被破坏时，讨伐后的总经验会额外增加此值`,
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
          tableFieldDescription: "这是怪物的统计信息字段数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription:
            "这是怪物的统计信息字段数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "这是怪物的更新者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription:
            "这是怪物的更新者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        createdByAccountId: {
          key: "创建者ID",
          tableFieldDescription: "这是怪物的创建者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription:
            "这是怪物的创建者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
      };
    case "zh-TW":
      return {
        selfName: {
          key: "怪物",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "名稱",
          tableFieldDescription: "怪物名稱，通常和遊戲內一致，通常...",
          formFieldDescription: "怪物名稱，請填寫和遊戲內一致的翻譯。你也不想大家看到你寫的東西之後一臉懵逼是吧。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "這是怪物的資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription: "這是怪物的資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        type: {
          key: "怪物類型",
          tableFieldDescription:
            "目前支援的類型只有這些，雖然實際上解包可以看到有很多種，但是對於咱這個應用沒啥用，因此忽略了很多種類。",
          formFieldDescription:
            "目前支援的類型只有這些，雖然實際上解包可以看到有很多種，但是對於咱這個應用沒啥用，因此忽略了很多種類。",
        },
        captureable: {
          key: "是否可捕獲",
          tableFieldDescription: `這個屬性只對${getDictionary(locale).enums.mob.type.Boss}和${getDictionary(locale).enums.mob.type.MiniBoss}以外的怪物有效，能抓的甘瑞夫和糖明凰目前被視為特殊怪物。`,
          formFieldDescription: `如果不是${getDictionary(locale).enums.mob.type.Mob}類型的怪物，請選擇不可捕獲。`,
        },
        actions: {
          key: "行為",
          cardFieldDescription: "怪物的行為描述，模擬器運行的時候會根據其中的邏輯模擬怪物行動",
          tableFieldDescription: "怪物的行為描述，如果你看到這句話，請回饋給開發人員，這不是正常的情況",
          formFieldDescription:
            "怪物的行為描述，模擬器運行的時候會根據其中的邏輯模擬怪物行動。寫這個要很大的精力哦，加油加油~",
        },
        baseLv: {
          key: "基礎等級",
          tableFieldDescription: `對於${getDictionary(locale).enums.mob.type.Boss}來說，這個值是${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難度下的等級數值。其他類型的怪物由於沒有難度標識，這個值就是實際等級`,
          formFieldDescription: `如果怪物類型是${getDictionary(locale).enums.mob.type.Boss}，請填寫你在選擇${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難度時它的等級。其他類型的怪物直接填寫實際等級即可。`,
        },
        experience: {
          key: "經驗",
          tableFieldDescription: `對於${getDictionary(locale).enums.mob.type.Boss}來說，這個值是${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難度下的經驗值。其他類型的怪物由於沒有難度標識，這個值就是其際經驗值`,
          formFieldDescription: `如果怪物類型是${getDictionary(locale).enums.mob.type.Boss}，請填寫你在選擇${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難度時它的經驗值。其他類型的怪物直接填寫實際經驗值即可。`,
        },
        initialElement: {
          key: "元素屬性",
          tableFieldDescription:
            "這是初始屬性，怪物在戰鬥時可能會改變其屬性，詳細情況將取決於怪物行為中的描述，要查看怪物行為，請點擊具體怪物",
          formFieldDescription: "這裡填寫怪物的初始屬性即可，有關屬性變化的描述請在怪物行為中編輯",
        },
        radius: {
          key: "半徑",
          tableFieldDescription: "怪物的模型尺寸，主要是用來計算技能是否命中",
          formFieldDescription:
            "怪物的模型尺寸，主要是用來計算技能是否命中，從遠處按下聖拳之裁後，技能發動瞬間螢幕上顯示的距離-1就可以測出這個值。",
        },
        maxhp: {
          key: "最大生命值",
          tableFieldDescription: "不會有人不知道這個屬性是什麼意思吧，不會吧",
          formFieldDescription: `對於${getDictionary(locale).enums.mob.type.Boss}來說，這個值是${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難度下顯示的數值。其他類型的怪物由於沒有難度標識，這個值可能需要估測`,
        },
        physicalDefense: {
          key: "物理防禦",
          tableFieldDescription: "與物理貫穿相作用的屬性",
          formFieldDescription: "與物理貫穿相作用的屬性",
        },
        physicalResistance: {
          key: "物理抗性",
          tableFieldDescription: "對怪物來說，這可能是他們最實用的物理傷害減免區間，而且玩家只能靠技能常數來應對",
          formFieldDescription: "對怪物來說，這可能是他們最實用的物理傷害減免區間，而且玩家只能靠技能常數來應對",
        },
        magicalDefense: {
          key: "魔法防禦",
          tableFieldDescription: "與魔法貫穿相作用的屬性",
          formFieldDescription: "與魔法貫穿相作用的屬性",
        },
        magicalResistance: {
          key: "魔法抗性",
          tableFieldDescription: "對怪物來說，這可能是他們最實用的魔法傷害減免區間，而且玩家只能靠技能常數來應對",
          formFieldDescription: "對怪物來說，這可能是他們最實用的魔法傷害減免區間，而且玩家只能靠技能常數來應對",
        },
        criticalResistance: {
          key: "暴擊抗性",
          tableFieldDescription: "對於魔法傷害來說，其暴擊率為（物理暴擊率*法術暴擊轉化率）-此值",
          formFieldDescription: "對於魔法傷害來說，其暴擊率為（物理暴擊率*法術暴擊轉化率）-此值",
        },
        avoidance: {
          key: "迴避",
          tableFieldDescription: "與命中值相作用後用於判斷物理傷害是否命中",
          formFieldDescription: "與命中值相作用後用於判斷物理傷害是否命中",
        },
        dodge: {
          key: "閃躲率",
          tableFieldDescription: "受到攻擊時，會根據此值判斷是否被擊中",
          formFieldDescription: "受到攻擊時，會根據此值判斷是否被擊中",
        },
        block: {
          key: "格擋率",
          tableFieldDescription: "受到攻擊時，會根據此值判斷是否格擋",
          formFieldDescription: "受到攻擊時，會根據此值判斷是否格擋",
        },
        normalAttackResistanceModifier: {
          key: "一般傷害慣性變動率",
          tableFieldDescription: "每次受到傷害時，一般慣性的變化值",
          formFieldDescription: "每次受到傷害時，一般慣性的變化值",
        },
        physicalAttackResistanceModifier: {
          key: "物理傷害慣性變動率",
          tableFieldDescription: "每次受到傷害時，物理慣性的變化值",
          formFieldDescription: "每次受到傷害時，物理慣性的變化值",
        },
        magicalAttackResistanceModifier: {
          key: "魔法傷害慣性變動率",
          tableFieldDescription: "每次受到傷害時，魔法慣性的變化值",
          formFieldDescription: "每次受到傷害時，魔法慣性的變化值",
        },
        partsExperience: {
          key: "部位經驗",
          tableFieldDescription: `只有${getDictionary(locale).enums.mob.type.Boss}會有這個值，當某個部位被破壞時，討伐後的總經驗會額外增加此值`,
          formFieldDescription: `只有${getDictionary(locale).enums.mob.type.Boss}會有這個值，當某個部位被破壞時，討伐後的總經驗會額外增加此值`,
        },
        details: {
          key: "額外說明",
          tableFieldDescription: "編輯者想額外描述的東西",
          formFieldDescription: "其他的你想告訴閱讀者的東西",
        },
        dataSources: {
          key: "數據來源",
          tableFieldDescription: "此數據的實際測量者或者組織",
          formFieldDescription: "此數據的實際測量者或者組織",
        },
        statisticId: {
          key: "統計信息ID",
          tableFieldDescription: "這是怪物的統計信息欄位資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription:
            "這是怪物的統計信息欄位資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "這是怪物的更新者資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription:
            "這是怪物的更新者資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        createdByAccountId: {
          key: "創建者ID",
          tableFieldDescription: "這是怪物的創建者資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription:
            "這是怪物的創建者資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
      };
    case "en":
      return {
        selfName: {
          key: "Monster",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "Name",
          tableFieldDescription: "The monster's name, usually consistent with the in-game name.",
          formFieldDescription:
            "Please enter the monster's name as it appears in the game. You don't want others to be confused by your entry, right?",
        },
        id: {
          key: "ID",
          tableFieldDescription: "This is the monster's database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        type: {
          key: "Monster Type",
          tableFieldDescription:
            "Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
          formFieldDescription:
            "Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
        },
        captureable: {
          key: "Capturable",
          tableFieldDescription: `This attribute is only valid for monsters other than ${getDictionary(locale).enums.mob.type.Boss} and ${getDictionary(locale).enums.mob.type.MiniBoss}. Special monsters like Ganrif and Tangming Phoenix are considered exceptions.`,
          formFieldDescription: `If the monster type is not ${getDictionary(locale).enums.mob.type.Mob}, select 'Not Capturable'.`,
        },
        actions: {
          key: "Actions",
          cardFieldDescription:
            "Monster behavior description. The simulator will simulate actions based on this logic.",
          tableFieldDescription:
            "Monster behavior description. If you see this message, please report it to the developers. This is not normal.",
          formFieldDescription:
            "Monster behavior description. The simulator will simulate actions based on this logic. Writing this requires a lot of effort. Keep it up!",
        },
        baseLv: {
          key: "Base Level",
          tableFieldDescription: `For ${getDictionary(locale).enums.mob.type.Boss}, this value represents the level at ${getDictionary(locale).enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this is the actual level.`,
          formFieldDescription: `If the monster type is ${getDictionary(locale).enums.mob.type.Boss}, enter the level at ${getDictionary(locale).enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters, enter the actual level.`,
        },
        experience: {
          key: "Experience",
          tableFieldDescription: `For ${getDictionary(locale).enums.mob.type.Boss}, this value represents the experience at ${getDictionary(locale).enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this is the actual experience.`,
          formFieldDescription: `If the monster type is ${getDictionary(locale).enums.mob.type.Boss}, enter the experience at ${getDictionary(locale).enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters, enter the actual experience.`,
        },
        initialElement: {
          key: "Element Attribute",
          tableFieldDescription:
            "This is the initial element. Monsters may change their attributes during battle. Refer to the behavior description for details.",
          formFieldDescription:
            "Enter the monster's initial element here. Attribute changes should be described in the behavior section.",
        },
        radius: {
          key: "Radius",
          tableFieldDescription: "The monster's model size, mainly used to calculate whether skills hit.",
          formFieldDescription:
            "The monster's model size, mainly used to calculate whether skills hit. Subtract 1 from the distance displayed on the screen after casting Holy Fist.",
        },
        maxhp: {
          key: "Max HP",
          tableFieldDescription: "No one doesn't know what this means, right? Right?",
          formFieldDescription: `For ${getDictionary(locale).enums.mob.type.Boss}, this value represents the HP at ${getDictionary(locale).enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this value may need to be estimated.`,
        },
        physicalDefense: {
          key: "Physical Defense",
          tableFieldDescription: "Interacts with physical penetration.",
          formFieldDescription: "Interacts with physical penetration.",
        },
        physicalResistance: {
          key: "Physical Resistance",
          tableFieldDescription:
            "This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
          formFieldDescription:
            "This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
        },
        magicalDefense: {
          key: "Magical Defense",
          tableFieldDescription: "Interacts with magical penetration.",
          formFieldDescription: "Interacts with magical penetration.",
        },
        magicalResistance: {
          key: "Magical Resistance",
          tableFieldDescription:
            "This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
          formFieldDescription:
            "This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
        },
        criticalResistance: {
          key: "Critical Resistance",
          tableFieldDescription:
            "For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
          formFieldDescription:
            "For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
        },
        avoidance: {
          key: "Avoidance",
          tableFieldDescription: "Interacts with accuracy to determine whether physical attacks hit.",
          formFieldDescription: "Interacts with accuracy to determine whether physical attacks hit.",
        },
        dodge: {
          key: "Dodge Rate",
          tableFieldDescription: "When attacked, this value determines whether the attack hits.",
          formFieldDescription: "When attacked, this value determines whether the attack hits.",
        },
        block: {
          key: "Block Rate",
          tableFieldDescription: "When attacked, this value determines whether the attack is blocked.",
          formFieldDescription: "When attacked, this value determines whether the attack is blocked.",
        },
        normalAttackResistanceModifier: {
          key: "Normal Damage Inertia Modifier",
          tableFieldDescription: "The change in normal inertia each time damage is taken.",
          formFieldDescription: "The change in normal inertia each time damage is taken.",
        },
        physicalAttackResistanceModifier: {
          key: "Physical Damage Inertia Modifier",
          tableFieldDescription: "The change in physical inertia each time damage is taken.",
          formFieldDescription: "The change in physical inertia each time damage is taken.",
        },
        magicalAttackResistanceModifier: {
          key: "Magical Damage Inertia Modifier",
          tableFieldDescription: "The change in magical inertia each time damage is taken.",
          formFieldDescription: "The change in magical inertia each time damage is taken.",
        },
        partsExperience: {
          key: "Parts Experience",
          tableFieldDescription: `Only ${getDictionary(locale).enums.mob.type.Boss} has this value. When a part is destroyed, total experience gained increases by this amount.`,
          formFieldDescription: `Only ${getDictionary(locale).enums.mob.type.Boss} has this value. When a part is destroyed, total experience gained increases by this amount.`,
        },
        details: {
          key: "Additional Notes",
          tableFieldDescription: "Anything the editor wants to add.",
          formFieldDescription: "Other things you want to tell readers.",
        },
        dataSources: {
          key: "Data Sources",
          tableFieldDescription: "The person or organization that measured this data.",
          formFieldDescription: "The person or organization that measured this data.",
        },
        statisticId: {
          key: "Statistic ID",
          tableFieldDescription: "This is the monster's statistics database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's statistics database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        updatedByAccountId: {
          key: "Updated By Account ID",
          tableFieldDescription: "This is the monster's updater database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's updater database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        createdByAccountId: {
          key: "Created By Account ID",
          tableFieldDescription: "This is the monster's creator database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's creator database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
      };
    case "ja":
      return {
        selfName: {
          key: "モンスター",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "名前",
          tableFieldDescription: "モンスターの名前は、通常ゲーム内と一致します。",
          formFieldDescription: "モンスターの名前をゲーム内と同じように記載してください。みんなが混乱しないようにね。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "これはモンスターのデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターのデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        type: {
          key: "モンスタータイプ",
          tableFieldDescription:
            "現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
          formFieldDescription:
            "現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
        },
        captureable: {
          key: "捕獲可能",
          tableFieldDescription: `${getDictionary(locale).enums.mob.type.Boss}および${getDictionary(locale).enums.mob.type.MiniBoss}以外のモンスターにのみ有効です。捕獲可能なガンリフや糖明凰は特別扱いされています。`,
          formFieldDescription: `${getDictionary(locale).enums.mob.type.Mob}タイプでない場合は「不可」を選択してください。`,
        },
        actions: {
          key: "行動",
          cardFieldDescription: "モンスターの行動説明。シミュレーターはこのロジックに基づいて行動を模倣します。",
          tableFieldDescription:
            "モンスターの行動説明。このメッセージを見た場合は開発者に報告してください。これは異常な状況です。",
          formFieldDescription:
            "モンスターの行動説明。シミュレーターはこのロジックに基づいて行動を模倣します。書くのは大変だけど頑張ってね！",
        },
        baseLv: {
          key: "基本レベル",
          tableFieldDescription: `${getDictionary(locale).enums.mob.type.Boss}の場合、この値は${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難易度でのレベルです。他のタイプのモンスターには難易度がないため、これが実際のレベルです。`,
          formFieldDescription: `モンスタータイプが${getDictionary(locale).enums.mob.type.Boss}の場合、${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難易度でのレベルを入力してください。他のタイプのモンスターは実際のレベルを入力してください。`,
        },
        experience: {
          key: "経験値",
          tableFieldDescription: `${getDictionary(locale).enums.mob.type.Boss}の場合、この値は${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難易度での経験値です。他のタイプのモンスターには難易度がないため、これが実際の経験値です。`,
          formFieldDescription: `モンスタータイプが${getDictionary(locale).enums.mob.type.Boss}の場合、${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難易度での経験値を入力してください。他のタイプのモンスターは実際の経験値を入力してください。`,
        },
        initialElement: {
          key: "属性",
          tableFieldDescription:
            "これは初期属性です。戦闘中に属性が変わる場合があります。詳細は行動説明を参照してください。",
          formFieldDescription:
            "ここにモンスターの初期属性を記載してください。属性変更に関する説明は行動セクションで編集してください。",
        },
        radius: {
          key: "半径",
          tableFieldDescription: "モンスターのモデルサイズで、スキルが命中するかどうかを計算するために使用されます。",
          formFieldDescription:
            "モンスターのモデルサイズで、スキルが命中するかどうかを計算するために使用されます。遠距離から聖拳を発動した際に画面上に表示される距離-1で測定できます。",
        },
        maxhp: {
          key: "最大HP",
          tableFieldDescription: "この属性の意味がわからない人はいないよね？いないよね？",
          formFieldDescription: `${getDictionary(locale).enums.mob.type.Boss}の場合、この値は${getDictionary(locale).enums.member.mobDifficultyFlag.Easy}難易度でのHPです。他のタイプのモンスターには難易度がないため、この値は推測が必要かもしれません。`,
        },
        physicalDefense: {
          key: "物理防御",
          tableFieldDescription: "物理貫通と相互作用する属性です。",
          formFieldDescription: "物理貫通と相互作用する属性です。",
        },
        physicalResistance: {
          key: "物理耐性",
          tableFieldDescription:
            "モンスターにとって最も実用的な物理ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
          formFieldDescription:
            "モンスターにとって最も実用的な物理ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
        },
        magicalDefense: {
          key: "魔法防御",
          tableFieldDescription: "魔法貫通と相互作用する属性です。",
          formFieldDescription: "魔法貫通と相互作用する属性です。",
        },
        magicalResistance: {
          key: "魔法耐性",
          tableFieldDescription:
            "モンスターにとって最も実用的な魔法ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
          formFieldDescription:
            "モンスターにとって最も実用的な魔法ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
        },
        criticalResistance: {
          key: "クリティカル耐性",
          tableFieldDescription:
            "魔法ダメージの場合、クリティカル率は（物理クリティカル率×魔法クリティカル変換率）- この値です。",
          formFieldDescription:
            "魔法ダメージの場合、クリティカル率は（物理クリティカル率×魔法クリティカル変換率）- この値です。",
        },
        avoidance: {
          key: "回避",
          tableFieldDescription: "命中値と相互作用して、物理攻撃が命中するかどうかを判断します。",
          formFieldDescription: "命中値と相互作用して、物理攻撃が命中するかどうかを判断します。",
        },
        dodge: {
          key: "回避率",
          tableFieldDescription: "攻撃を受けた際に、この値に基づいて命中するかどうかを判断します。",
          formFieldDescription: "攻撃を受けた際に、この値に基づいて命中するかどうかを判断します。",
        },
        block: {
          key: "ブロック率",
          tableFieldDescription: "攻撃を受けた際に、この値に基づいてブロックするかどうかを判断します。",
          formFieldDescription: "攻撃を受けた際に、この値に基づいてブロックするかどうかを判断します。",
        },
        normalAttackResistanceModifier: {
          key: "通常ダメージ慣性変動率",
          tableFieldDescription: "ダメージを受けるたびに、通常慣性の変動値です。",
          formFieldDescription: "ダメージを受けるたびに、通常慣性の変動値です。",
        },
        physicalAttackResistanceModifier: {
          key: "物理ダメージ慣性変動率",
          tableFieldDescription: "ダメージを受けるたびに、物理慣性の変動値です。",
          formFieldDescription: "ダメージを受けるたびに、物理慣性の変動値です。",
        },
        magicalAttackResistanceModifier: {
          key: "魔法ダメージ慣性変動率",
          tableFieldDescription: "ダメージを受けるたびに、魔法慣性の変動値です。",
          formFieldDescription: "ダメージを受けるたびに、魔法慣性の変動値です。",
        },
        partsExperience: {
          key: "部位経験値",
          tableFieldDescription: `${getDictionary(locale).enums.mob.type.Boss}のみこの値を持ちます。部位を破壊すると、討伐後の総経験値がこの値分追加されます。`,
          formFieldDescription: `${getDictionary(locale).enums.mob.type.Boss}のみこの値を持ちます。部位を破壊すると、討伐後の総経験値がこの値分追加されます。`,
        },
        details: {
          key: "備考",
          tableFieldDescription: "編集者が追加で説明したい事項です。",
          formFieldDescription: "読者に伝えたいその他の情報です。",
        },
        dataSources: {
          key: "データソース",
          tableFieldDescription: "このデータを測定した人または組織です。",
          formFieldDescription: "このデータを測定した人または組織です。",
        },
        statisticId: {
          key: "統計情報ID",
          tableFieldDescription: "これはモンスターの統計情報のデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターの統計情報のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "これはモンスターの更新者のデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターの更新者のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        createdByAccountId: {
          key: "作成者ID",
          tableFieldDescription: "これはモンスターの作成者のデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターの作成者のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
      };
  }
};
