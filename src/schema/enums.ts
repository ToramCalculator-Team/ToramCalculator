import { PgEnum } from "drizzle-orm/pg-core";
import {
  BodyArmorType,
  CharacterType,
  ComboType,
  CrystalType,
  DurationType,
  Element,
  MainWeaponType,
  MonsterType,
  SkillExtraActionType,
  SkillTreeName,
  SkillType,
  SpecialAbiType,
  SubWeaponType,
  UserRole,
  YieldType,
} from "~/../drizzle/schema";
export type EnumValues<T extends PgEnum<any>> = T["enumValues"] extends Array<infer U> ? U : never;

export namespace $Enums {
  export type Element = EnumValues<typeof Element>;
  export type UserRole = EnumValues<typeof UserRole>;
  export type MonsterType = EnumValues<typeof MonsterType>;
  export type SpecialAbiType = EnumValues<typeof SpecialAbiType>;
  export type CrystalType = EnumValues<typeof CrystalType>;
  export type MainWeaponType = EnumValues<typeof MainWeaponType>;
  export type SubWeaponType = EnumValues<typeof SubWeaponType>;
  export type BodyArmorType = EnumValues<typeof BodyArmorType>;
  export type SkillTreeName = EnumValues<typeof SkillTreeName>;
  export type SkillType = EnumValues<typeof SkillType>;
  export type SkillExtraActionType = EnumValues<typeof SkillExtraActionType>;
  export type YieldType = EnumValues<typeof YieldType>;
  export type DurationType = EnumValues<typeof DurationType>;
  export type ComboType = EnumValues<typeof ComboType>;
  export type CharacterType = EnumValues<typeof CharacterType>;
}
