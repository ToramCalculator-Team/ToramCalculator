import { DB } from "@db/generated/kysely/kysely";
import { findUserWithRelations } from "./user";
import { findAccountWithRelations } from "./account";
import { findPostWithRelations } from "./post";
import { findWorldWithRelations } from "./world";
import { findAddressWithRelations } from "./address";
import { findActivityWithRelations } from "./activity";
import { findZoneWithRelations } from "./zone";
import { findImageWithRelations } from "./image";
import { findStatisticWithRelations } from "./statistic";
import { findMobWithRelations } from "./mob";
import { findItemWithRelations } from "./item";
import { findMaterialWithRelations } from "./material";
import { findConsumableWithRelations } from "./consumable";
import { findCrystalWithRelations } from "./crystal";
import { findWeaponWithRelations } from "./weapon";
import { findArmorWithRelations } from "./armor";
import { findOptionWithRelations } from "./option";
import { findSpecialWithRelations } from "./special";
import { findRecipeWithRelations } from "./recipe";
import { findRecipeIngredientWithRelations } from "./recipe_ingredient";
import { findDropItemWithRelations } from "./drop_item";
import { findNpcWithRelations } from "./npc";
import { findTaskWithRelations } from "./task";
import { findTaskKillRequirementWithRelations } from "./task_kill_requirement";
import { findTaskCollectRequireWithRelations } from "./task_collect_require";
import { findTaskRewardWithRelations } from "./task_reward";
import { findSkillWithRelations } from "./skill";
import { findSkillEffectWithRelations } from "./skill_effect";
import { findPlayerWithRelations } from "./player";
import { findPlayerWeaponWithRelations } from "./player_weapon";
import { findPlayerArmorWithRelations } from "./player_armor";
import { findPlayerOptionWithRelations } from "./player_option";
import { findPlayerSpecialWithRelations } from "./player_special";
import { findPlayerPetWithRelations } from "./player_pet";
import { findAvatarWithRelations } from "./avatar";
import { findCharacterWithRelations } from "./character";
import { findCharacterSkillWithRelations } from "./character_skill";
import { findComboWithRelations } from "./combo";
import { findComboStepWithRelations } from "./combo_step";
import { findMercenaryWithRelations } from "./mercenary";
import { findSimulatorWithRelations } from "./simulator";
import { findTeamWithRelations } from "./team";
import { findMemberWithRelations } from "./member";

export const relationsDataFinder: Record<keyof DB, any> = {
  user: findUserWithRelations,
  account: findAccountWithRelations,
  session: null,
  verification_token: null,
  post: findPostWithRelations,
  account_create_data: null,
  account_update_data: null,
  world: findWorldWithRelations,
  address: findAddressWithRelations,
  activity: findActivityWithRelations,
  zone: findZoneWithRelations,
  image: findImageWithRelations,
  statistic: findStatisticWithRelations,
  mob: findMobWithRelations,
  item: findItemWithRelations,
  material: findMaterialWithRelations,
  consumable: findConsumableWithRelations,
  crystal: findCrystalWithRelations,
  weapon: findWeaponWithRelations,
  armor: findArmorWithRelations,
  option: findOptionWithRelations,
  special: findSpecialWithRelations,
  recipe: findRecipeWithRelations,
  recipe_ingredient: findRecipeIngredientWithRelations,
  drop_item: findDropItemWithRelations,
  npc: findNpcWithRelations,
  task: findTaskWithRelations,
  task_kill_requirement: findTaskKillRequirementWithRelations,
  task_collect_require: findTaskCollectRequireWithRelations,
  task_reward: findTaskRewardWithRelations,
  skill: findSkillWithRelations,
  skill_effect: findSkillEffectWithRelations,
  player: findPlayerWithRelations,
  player_weapon: findPlayerWeaponWithRelations,
  player_armor: findPlayerArmorWithRelations,
  player_option: findPlayerOptionWithRelations,
  player_special: findPlayerSpecialWithRelations,
  player_pet: findPlayerPetWithRelations,
  avatar: findAvatarWithRelations,
  character: findCharacterWithRelations,
  character_skill: findCharacterSkillWithRelations,
  combo: findComboWithRelations,
  combo_step: findComboStepWithRelations,
  mercenary: findMercenaryWithRelations,
  simulator: findSimulatorWithRelations,
  team: findTeamWithRelations,
  member: findMemberWithRelations
};
