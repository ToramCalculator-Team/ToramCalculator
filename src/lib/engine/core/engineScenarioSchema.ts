import { z } from "zod/v4";
import {
	SimulatorSchema,
	TeamSchema,
	MemberSchema,
	PlayerSchema,
	CharacterSchema,
	PlayerWeaponSchema,
	PlayerArmorSchema,
	PlayerOptionSchema,
	PlayerSpecialSchema,
	CrystalSchema,
	WeaponSchema,
	ArmorSchema,
	OptionSchema,
	SpecialSchema,
	CharacterSkillSchema,
	SkillSchema,
	SkillVariantSchema,
	BehaviorTreeSchema,
	CharacterRegistletSchema,
	RegistletSchema,
	AvatarSchema,
	ConsumableSchema,
	ComboSchema,
	ComboStepSchema,
	MobSchema,
} from "@db/generated/zod/index";

/**
 * 引擎场景数据契约（性能优先的精确裁剪版）。
 *
 * 背景：原契约直接复用全展开的 SimulatorWithRelationsSchema，带入大量引擎不消费的
 * 分支（statistic、审计字段、玩家库存、mob.drops/images、wiki 反查等），导致配套查询
 * 生成 ~1.3MB SQL、Postgres 规划耗时 ~1.6s。
 *
 * 本 schema 依据「字段访问探针」实测结果裁剪（见 GameEngine.loadScenario 临时探针，427 条触达路径）：
 * - 从基础表 XxxSchema 出发（自带全部标量列：modifiers/cooking/actions 等），手工挂引擎需要的关系。
 * - 关键保留：装备 + crystals.modifiers（战前 DSL 通用递归 visit 消费）、
 *   skills→template→variants→behaviorTree（attributeSlots 语义消费）、registlets→template。
 * - 砍除：各级 statistic、审计字段、player 库存、partner/mercenary、mob.drops/images。
 * - 保守保留（测试数据为空、visit 通用递归可能消费 modifiers）：avatars / consumables / combos。
 */

// ---- 叶子层：装备 + 锻晶 ----
// 锻晶：基础 schema 已含 modifiers（visit 递归消费）；自引用 front/back 探针仅触达空数组 length，省略。
const EngineCrystalSchema = CrystalSchema;

// 装备 template（wiki 武器/防具等）：基础 schema 含 type/baseAbi/modifiers，env 映射与 visit 需要。
const EngineWeaponTemplateSchema = WeaponSchema.nullable();
const EngineArmorTemplateSchema = ArmorSchema.nullable();
const EngineOptionTemplateSchema = OptionSchema.nullable();
const EngineSpecialTemplateSchema = SpecialSchema.nullable();

const EnginePlayerWeaponSchema = PlayerWeaponSchema.extend({
	crystals: z.array(EngineCrystalSchema),
	template: EngineWeaponTemplateSchema,
}).nullable();

const EnginePlayerArmorSchema = PlayerArmorSchema.extend({
	crystals: z.array(EngineCrystalSchema),
	template: EngineArmorTemplateSchema,
}).nullable();

const EnginePlayerOptionSchema = PlayerOptionSchema.extend({
	crystals: z.array(EngineCrystalSchema),
	template: EngineOptionTemplateSchema,
}).nullable();

const EnginePlayerSpecialSchema = PlayerSpecialSchema.extend({
	crystals: z.array(EngineCrystalSchema),
	template: EngineSpecialTemplateSchema,
}).nullable();

// ---- 叶子层：技能（深到 behaviorTree） ----
// behaviorTree 自引用 owner 字段（探针经 visit 触达但值不被语义消费）省略，只保留 attributeSlots 等定义字段。
const EngineBehaviorTreeSchema = BehaviorTreeSchema.nullable();

const EngineSkillVariantSchema = SkillVariantSchema.extend({
	activeBehaviorTree: EngineBehaviorTreeSchema,
	passiveBehaviorTree: EngineBehaviorTreeSchema,
	registeredBehaviorTrees: z.array(BehaviorTreeSchema),
});

const EngineSkillTemplateSchema = SkillSchema.extend({
	variants: z.array(EngineSkillVariantSchema),
});

const EngineCharacterSkillSchema = CharacterSkillSchema.extend({
	template: EngineSkillTemplateSchema,
});

// ---- 叶子层：托环 ----
// template 可空：引擎 resolveRegistletTemplate 优先用内置表 BUILT_IN_REGISTLETS_BY_ID，
// 内置命中时根本不读 DB template；只有非内置托环才回退读此 wiki 行。故 join 可能为 null。
const EngineCharacterRegistletSchema = CharacterRegistletSchema.extend({
	template: RegistletSchema.nullable(),
});

// ---- 保守保留：avatars / consumables / combos ----
const EngineComboSchema = ComboSchema.extend({
	content: z.array(ComboStepSchema),
});

// ---- character：基础 schema 含 lv/str/.../modifiers/cooking/actions 标量 ----
const EngineCharacterSchema = CharacterSchema.extend({
	weapon: EnginePlayerWeaponSchema,
	subWeapon: EnginePlayerWeaponSchema,
	armor: EnginePlayerArmorSchema,
	option: EnginePlayerOptionSchema,
	special: EnginePlayerSpecialSchema,
	skills: z.array(EngineCharacterSkillSchema),
	registlets: z.array(EngineCharacterRegistletSchema),
	avatars: z.array(AvatarSchema),
	consumables: z.array(ConsumableSchema),
	combos: z.array(EngineComboSchema),
});

// ---- player：只需 useIn + characters，库存(pets/weapons/...)不取 ----
const EnginePlayerSchema = PlayerSchema.extend({
	characters: z.array(EngineCharacterSchema),
}).nullable();

// ---- mob：探针仅触达 baseLv/maxhp/physicalDefense/magicalDefense/actions，基础 schema 已含 ----
const EngineMobSchema = MobSchema.nullable();

// ---- member：按 type 取 player 或 mob；partner/mercenary 未实现，不取 ----
const EngineMemberSchema = MemberSchema.extend({
	player: EnginePlayerSchema,
	mob: EngineMobSchema,
});

const EngineTeamSchema = TeamSchema.extend({
	members: z.array(EngineMemberSchema),
});

export const EngineSimulatorSchema = SimulatorSchema.extend({
	campA: z.array(EngineTeamSchema),
	campB: z.array(EngineTeamSchema),
});

export type EngineSimulator = z.output<typeof EngineSimulatorSchema>;

// ---- 引擎内部各层类型（替换 XxxWithRelations 注解用）----
// 经 .nullable() 包裹的层导出非空版本，供 null 检查后的引擎代码使用。
export type EngineTeam = z.output<typeof EngineTeamSchema>;
export type EngineMember = z.output<typeof EngineMemberSchema>;
export type EnginePlayer = NonNullable<z.output<typeof EnginePlayerSchema>>;
export type EngineMob = NonNullable<z.output<typeof EngineMobSchema>>;
export type EngineCharacter = z.output<typeof EngineCharacterSchema>;
export type EngineCharacterSkill = z.output<typeof EngineCharacterSkillSchema>;
export type EngineSkillVariant = z.output<typeof EngineSkillVariantSchema>;
export type EngineCharacterRegistlet = z.output<typeof EngineCharacterRegistletSchema>;
export type EnginePlayerWeapon = NonNullable<z.output<typeof EnginePlayerWeaponSchema>>;
export type EnginePlayerArmor = NonNullable<z.output<typeof EnginePlayerArmorSchema>>;
export type EnginePlayerOption = NonNullable<z.output<typeof EnginePlayerOptionSchema>>;
export type EnginePlayerSpecial = NonNullable<z.output<typeof EnginePlayerSpecialSchema>>;


