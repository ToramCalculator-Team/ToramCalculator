import { DB } from "@db/generated/kysely/kyesely";
import { findAccountWithRelations } from "./account";
import { findActivityWithRelations } from "./activity";
import { findAddressWithRelations } from "./address";
import { findCharacterWithRelations } from "./character";
import { findConsumableWithRelations } from "./consumable";
import { findItemWithRelations } from "./item";
import { findMemberWithRelations } from "./member";
import { findMercenaryWithRelations } from "./mercenary";
import { findCrystalWithRelations } from "./crystal";
import { findMaterialWithRelations } from "./material";
import { findComboWithRelations } from "./combo";
import { findSkillWithRelations } from "./skill";

export const relationsDataFinder: Record<keyof DB, any> ={
    _armorTocrystal: null,
    _avatarTocharacter: null,
    _backRelation: null,
    _campA: null,
    _campB: null,
    _characterToconsumable: null,
    _crystalTooption: null,
    _crystalToplayer_armor: null,
    _crystalToplayer_option: null,
    _crystalToplayer_special: null,
    _crystalToplayer_weapon: null,
    _crystalTospecial: null,
    _crystalToweapon: null,
    _frontRelation: null,
    _linkZones: null,
    _mobTozone: null,
    account: findAccountWithRelations,
    account_create_data: null,
    account_update_data: null,
    activity: findActivityWithRelations,
    address: findAddressWithRelations,
    armor: null,
    avatar: null,
    character: findCharacterWithRelations,
    character_skill: null,
    combo: findComboWithRelations,
    combo_step: null,
    consumable: findConsumableWithRelations,
    crystal: findCrystalWithRelations,
    drop_item: null,
    image: null,
    item: findItemWithRelations,
    material: findMaterialWithRelations,
    member: findMemberWithRelations,
    mercenary: findMercenaryWithRelations,
    mob: null,
    npc: null,
    option: null,
    player: null,
    player_armor: null,
    player_option: null,
    player_pet: null,
    player_special: null,
    player_weapon: null,
    post: null,
    recipe: null,
    recipe_ingredient: null,
    session: null,
    simulator: null,
    skill: findSkillWithRelations,
    skill_effect: null,
    special: null,
    statistic: null,
    task: null,
    task_collect_require: null,
    task_kill_requirement: null,
    task_reward: null,
    team: null,
    user: null,
    verification_token: null,
    weapon: null,
    world: null,
    zone: null
}