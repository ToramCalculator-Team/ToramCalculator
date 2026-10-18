import {
	ArmorSchema,
	AvatarSchema,
	BehaviorTreeSchema,
	CharacterRegistletSchema,
	CharacterSchema,
	CharacterSkillSchema,
	ComboSchema,
	ComboStepSchema,
	ConsumableSchema,
	CrystalSchema,
	MemberSchema,
	MobSchema,
	OptionSchema,
	PlayerArmorSchema,
	PlayerOptionSchema,
	PlayerSpecialSchema,
	PlayerWeaponSchema,
	RegistletSchema,
	SkillSchema,
	SkillVariantSchema,
	SpecialSchema,
	TeamSchema,
	WeaponSchema,
} from "@db/generated/zod/index";
import { MemberBTSchema } from "@db/schema/jsons";
import { z } from "zod/v4";

/**
 * 世界场景数据契约（性能优先的精确裁剪版）。
 */

// ---- 叶子层：装备 + 锻晶 ----
// 锻晶：基础 schema 已含 modifiers（visit 递归消费）；自引用 front/back 探针仅触达空数组 length，省略。
const WorldCrystalSchema = CrystalSchema;

// 装备 template（wiki 武器/防具等）：基础 schema 含 type/baseAbi/modifiers，env 映射与 visit 需要。
const WorldWeaponTemplateSchema = WeaponSchema.nullable();
const WorldArmorTemplateSchema = ArmorSchema.nullable();
const WorldOptionTemplateSchema = OptionSchema.nullable();
const WorldSpecialTemplateSchema = SpecialSchema.nullable();

const WorldPlayerWeaponSchema = PlayerWeaponSchema.extend({
	crystals: z.array(WorldCrystalSchema),
	template: WorldWeaponTemplateSchema,
}).nullable();

const WorldPlayerArmorSchema = PlayerArmorSchema.extend({
	crystals: z.array(WorldCrystalSchema),
	template: WorldArmorTemplateSchema,
}).nullable();

const WorldPlayerOptionSchema = PlayerOptionSchema.extend({
	crystals: z.array(WorldCrystalSchema),
	template: WorldOptionTemplateSchema,
}).nullable();

const WorldPlayerSpecialSchema = PlayerSpecialSchema.extend({
	crystals: z.array(WorldCrystalSchema),
	template: WorldSpecialTemplateSchema,
}).nullable();

// ---- 叶子层：技能（深到 behaviorTree） ----
// behaviorTree 自引用 owner 字段（探针经 visit 触达但值不被语义消费）省略，只保留 attributeSlots 等定义字段。
const WorldBehaviorTreeSchema = BehaviorTreeSchema.nullable();

const WorldSkillVariantSchema = SkillVariantSchema.extend({
	activeBehaviorTree: WorldBehaviorTreeSchema,
	passiveBehaviorTree: WorldBehaviorTreeSchema,
	registeredBehaviorTrees: z.array(BehaviorTreeSchema),
});

const WorldSkillTemplateSchema = SkillSchema.extend({
	variants: z.array(WorldSkillVariantSchema),
});

const WorldCharacterSkillSchema = CharacterSkillSchema.extend({
	template: WorldSkillTemplateSchema,
});

// ---- 叶子层：托环 ----
// template 可空：引擎 resolveRegistletTemplate 优先用内置表 BUILT_IN_REGISTLETS_BY_ID，
// 内置命中时根本不读 DB template；只有非内置托环才回退读此 wiki 行。故 join 可能为 null。
const WorldCharacterRegistletSchema = CharacterRegistletSchema.extend({
	template: RegistletSchema.nullable(),
});

// ---- 保守保留：avatars / consumables / combos ----
const WorldComboSchema = ComboSchema.extend({
	content: z.array(ComboStepSchema),
});

// ---- character：基础 schema 含 lv/str/.../modifiers/cooking 标量 ----
const WorldCharacterSchema = CharacterSchema.extend({
	weapon: WorldPlayerWeaponSchema,
	subWeapon: WorldPlayerWeaponSchema,
	armor: WorldPlayerArmorSchema,
	option: WorldPlayerOptionSchema,
	special: WorldPlayerSpecialSchema,
	skills: z.array(WorldCharacterSkillSchema),
	registlets: z.array(WorldCharacterRegistletSchema),
	avatars: z.array(AvatarSchema),
	consumables: z.array(ConsumableSchema),
	combos: z.array(WorldComboSchema),
});

// ---- mob：探针仅触达 baseLv/maxhp/physicalDefense/magicalDefense/actions，基础 schema 已含 ----
const WorldMobSchema = MobSchema.nullable();

// ---- Engine 输入：Member 已由上层解析出唯一行为来源 ----
export const WorldMemberSchema = MemberSchema.extend({
	character: WorldCharacterSchema.nullable(),
	mob: WorldMobSchema,
	/** AI 行为源；为空表示成员由外部控制器驱动（ADR 0054）。 */
	resolvedBehavior: MemberBTSchema.nullable().default(null),
});

const WorldTeamSchema = TeamSchema.extend({
	members: z.array(WorldMemberSchema),
});

export const WorldScenarioSchema = z.object({
	randomSeed: z.number().int(),
	logicHz: z.number().positive(),
	primaryMemberId: z.string(),
	/** 场景装配时直接写入 Member 运行时状态，不生成控制输入或行动录制。 */
	initialTargetIds: z.record(z.string().min(1), z.string().min(1)).default({}),
	campA: z.array(WorldTeamSchema),
	campB: z.array(WorldTeamSchema),
});

export type WorldScenario = z.output<typeof WorldScenarioSchema>;

// ---- 引擎内部各层类型（替换 XxxWithRelations 注解用）----
// 经 .nullable() 包裹的层导出非空版本，供 null 检查后的引擎代码使用。
export type WorldTeam = z.output<typeof WorldTeamSchema>;
export type WorldMember = z.output<typeof WorldMemberSchema>;
export type WorldMob = NonNullable<z.output<typeof WorldMobSchema>>;
export type WorldCharacter = z.output<typeof WorldCharacterSchema>;
export type WorldCharacterSkill = z.output<typeof WorldCharacterSkillSchema>;
export type WorldSkillVariant = z.output<typeof WorldSkillVariantSchema>;
export type WorldCharacterRegistlet = z.output<typeof WorldCharacterRegistletSchema>;
export type WorldPlayerWeapon = NonNullable<z.output<typeof WorldPlayerWeaponSchema>>;
export type WorldPlayerArmor = NonNullable<z.output<typeof WorldPlayerArmorSchema>>;
export type WorldPlayerOption = NonNullable<z.output<typeof WorldPlayerOptionSchema>>;
export type WorldPlayerSpecial = NonNullable<z.output<typeof WorldPlayerSpecialSchema>>;
