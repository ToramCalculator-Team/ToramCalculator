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
	SimulatorSchema,
	SkillSchema,
	SkillVariantSchema,
	SpecialSchema,
	TeamSchema,
	WeaponSchema,
} from "@db/generated/zod/index";
import { z } from "zod/v4";

const SimulatorCrystalSchema = CrystalSchema;

const SimulatorPlayerWeaponSchema = PlayerWeaponSchema.extend({
	crystals: z.array(SimulatorCrystalSchema),
	template: WeaponSchema.nullable(),
}).nullable();

const SimulatorPlayerArmorSchema = PlayerArmorSchema.extend({
	crystals: z.array(SimulatorCrystalSchema),
	template: ArmorSchema.nullable(),
}).nullable();

const SimulatorPlayerOptionSchema = PlayerOptionSchema.extend({
	crystals: z.array(SimulatorCrystalSchema),
	template: OptionSchema.nullable(),
}).nullable();

const SimulatorPlayerSpecialSchema = PlayerSpecialSchema.extend({
	crystals: z.array(SimulatorCrystalSchema),
	template: SpecialSchema.nullable(),
}).nullable();

const SimulatorSkillVariantSchema = SkillVariantSchema.extend({
	activeBehaviorTree: BehaviorTreeSchema.nullable(),
	passiveBehaviorTree: BehaviorTreeSchema.nullable(),
	registeredBehaviorTrees: z.array(BehaviorTreeSchema),
});

const SimulatorCharacterSkillSchema = CharacterSkillSchema.extend({
	template: SkillSchema.extend({ variants: z.array(SimulatorSkillVariantSchema) }),
});

const SimulatorCharacterSchema = CharacterSchema.extend({
	weapon: SimulatorPlayerWeaponSchema,
	subWeapon: SimulatorPlayerWeaponSchema,
	armor: SimulatorPlayerArmorSchema,
	option: SimulatorPlayerOptionSchema,
	special: SimulatorPlayerSpecialSchema,
	skills: z.array(SimulatorCharacterSkillSchema),
	registlets: z.array(CharacterRegistletSchema.extend({ template: RegistletSchema.nullable() })),
	avatars: z.array(AvatarSchema),
	consumables: z.array(ConsumableSchema),
	combos: z.array(ComboSchema.extend({ content: z.array(ComboStepSchema) })),
});

export const SimulationDesignMemberSchema = MemberSchema.extend({
	character: SimulatorCharacterSchema.nullable(),
	mob: MobSchema.nullable(),
});

const SimulationDesignTeamSchema = TeamSchema.extend({
	members: z.array(SimulationDesignMemberSchema),
});

/** SimulatorSession 持有的完整本地业务设计，是 DesignCopy 的唯一输入形状。 */
export const SimulationDesignSchema = SimulatorSchema.extend({
	teams: z.array(SimulationDesignTeamSchema),
	analysisSourceMembers: z.array(z.object({ id: z.string() })),
	analysisTargetMembers: z.array(z.object({ id: z.string() })),
});

export type SimulationDesign = z.output<typeof SimulationDesignSchema>;
export type SimulationDesignMember = z.output<typeof SimulationDesignMemberSchema>;
export type SimulatorCharacter = z.output<typeof SimulatorCharacterSchema>;
