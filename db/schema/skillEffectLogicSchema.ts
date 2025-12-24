import z from "zod/v4";

export const EffectTreeSchema = z.object({
  name: z.string(),
  definition: z.string(),
  agent: z.string(),
});
export type EffectTree = z.output<typeof EffectTreeSchema>;

export const SkillEffectLogicSchema = z.object({
  activeEffect: EffectTreeSchema,
  passiveEffects: z.array(EffectTreeSchema),
  buffs: z.array(EffectTreeSchema),
});
export type SkillEffectLogic = z.output<typeof SkillEffectLogicSchema>;
