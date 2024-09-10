import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";
import { character as Character } from "~/../db/schema";
import { defaultSelectModifiersList, SelectModifiersList, SelectModifiersListSchema } from "./modifiers_list";
import { defaultSelectSkill, SelectSkill, SelectSkillSchema } from "./skill";
import { defaultSelectMainWeapon, SelectMainWeapon, SelectMainWeaponSchema } from "./main_weapon";
import { defaultSelectSubWeapon, SelectSubWeapon, SelectSubWeaponSchema } from "./sub_weapon";
import { defaultSelectBodyArmor, SelectBodyArmor, SelectBodyArmorSchema } from "./body_armor";
import { defaultSelectAdditionalEquipment, SelectAdditionalEquipment, SelectAdditionalEquipmentSchema } from "./additional_equipment";
import { defaultSelectSpecialEquipment, SelectSpecialEquipment, SelectSpecialEquipmentSchema } from "./special_equipment";
import { defaultSelectPet, SelectPet, SelectPetSchema } from "./pet";
import { defaultSelectConsumable, SelectConsumable, SelectConsumableSchema } from "./consumable";
import { SelectCombo, SelectComboSchema } from "./combo";

// TS
export type SelectCharacter = InferSelectModel<typeof Character> & {
  mainWeapon: SelectMainWeapon;
  subWeapon: SelectSubWeapon;
  bodyArmor: SelectBodyArmor;
  additionalEquipment: SelectAdditionalEquipment;
  specialEquipment: SelectSpecialEquipment;
  fashion: SelectModifiersList;
  cuisine: SelectModifiersList;
  pet: SelectPet;
  skillList: SelectSkill[];
  consumableList: SelectConsumable[];
  combos: SelectCombo[];
  modifiersList: SelectModifiersList;
  statistics: SelectStatistics;
}

export const SelectCharacterSchema = createSelectSchema(Character).extend({
  mainWeapon: SelectMainWeaponSchema,
  subWeapon: SelectSubWeaponSchema,
  bodyArmor: SelectBodyArmorSchema,
  additionalEquipment: SelectAdditionalEquipmentSchema,
  specialEquipment: SelectSpecialEquipmentSchema,
  fashion: SelectModifiersListSchema,
  cuisine: SelectModifiersListSchema,
  pet: SelectPetSchema,
  skillList: SelectSkillSchema.array(),
  consumableList: SelectConsumableSchema.array(),
  combos: SelectComboSchema.array(),
  modifiersList: SelectModifiersListSchema,
  statistics: SelectStatisticsSchema,
});

export const defaultSelectCharacter: SelectCharacter = {
  id: "",
  imageId: "",
  characterType: "Tank",
  name: "",
  lv: 0,
  baseStr: 0,
  baseInt: 0,
  baseVit: 0,
  baseAgi: 0,
  baseDex: 0,
  specialAbiType: "NULL",
  specialAbiValue: 0,
  mainWeapon: defaultSelectMainWeapon,
  mainWeaponId: "",
  subWeapon: defaultSelectSubWeapon,
  subWeaponId: "",
  bodyArmor: defaultSelectBodyArmor,
  bodyArmorId: "",
  additionalEquipment: defaultSelectAdditionalEquipment,
  additionalEquipmentId: "",
  specialEquipment: defaultSelectSpecialEquipment,
  specialEquipmentId: "",
  fashion: defaultSelectModifiersList,
  fashionModifiersListId: "", 
  cuisine: defaultSelectModifiersList,
  CuisineModifiersListId: "",
  consumableList: [defaultSelectConsumable],
  skillList: [defaultSelectSkill],
  combos: [],
  pet: defaultSelectPet,
  petId: defaultSelectPet.id,
  modifiersList: defaultSelectModifiersList,
  modifiersListId: defaultSelectModifiersList.id,
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};
