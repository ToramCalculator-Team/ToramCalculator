--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.3

-- Started on 2025-03-19 18:11:37

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 901 (class 1247 OID 16386)
-- Name: address_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.address_type AS ENUM (
    'Normal',
    'Limited'
);


ALTER TYPE public.address_type OWNER TO postgres;

--
-- TOC entry 904 (class 1247 OID 16392)
-- Name: avatar_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.avatar_type AS ENUM (
    'Decoration',
    'Top',
    'Bottom'
);


ALTER TYPE public.avatar_type OWNER TO postgres;

--
-- TOC entry 1168 (class 1247 OID 17846)
-- Name: character_partnerSkillAType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."character_partnerSkillAType" AS ENUM (
    'Passive',
    'Active'
);


ALTER TYPE public."character_partnerSkillAType" OWNER TO postgres;

--
-- TOC entry 1171 (class 1247 OID 17852)
-- Name: character_partnerSkillBType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."character_partnerSkillBType" AS ENUM (
    'Passive',
    'Active'
);


ALTER TYPE public."character_partnerSkillBType" OWNER TO postgres;

--
-- TOC entry 907 (class 1247 OID 16400)
-- Name: character_personalityType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."character_personalityType" AS ENUM (
    'None',
    'Luk',
    'Cri',
    'Tec',
    'Men'
);


ALTER TYPE public."character_personalityType" OWNER TO postgres;

--
-- TOC entry 910 (class 1247 OID 16412)
-- Name: combo_step_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.combo_step_type AS ENUM (
    'None',
    'Start',
    'Rengeki',
    'ThirdEye',
    'Filling',
    'Quick',
    'HardHit',
    'Tenacity',
    'Invincible',
    'BloodSucking',
    'Tough',
    'AMomentaryWalk',
    'Reflection',
    'Illusion',
    'Max'
);


ALTER TYPE public.combo_step_type OWNER TO postgres;

--
-- TOC entry 913 (class 1247 OID 16444)
-- Name: consumable_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.consumable_type AS ENUM (
    'MaxHp',
    'MaxMp',
    'pAtk',
    'mAtk',
    'Aspd',
    'Cspd',
    'Hit',
    'Flee',
    'EleStro',
    'EleRes',
    'pRes',
    'mRes'
);


ALTER TYPE public.consumable_type OWNER TO postgres;

--
-- TOC entry 916 (class 1247 OID 16470)
-- Name: crystal_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.crystal_type AS ENUM (
    'NormalCrystal',
    'WeaponCrystal',
    'ArmorCrystal',
    'OptEquipCrystal',
    'SpecialCrystal'
);


ALTER TYPE public.crystal_type OWNER TO postgres;

--
-- TOC entry 919 (class 1247 OID 16482)
-- Name: drop_item_relatedPartType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."drop_item_relatedPartType" AS ENUM (
    'A',
    'B',
    'C'
);


ALTER TYPE public."drop_item_relatedPartType" OWNER TO postgres;

--
-- TOC entry 922 (class 1247 OID 16490)
-- Name: item_tableType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."item_tableType" AS ENUM (
    'weapon',
    'armor',
    'option',
    'special',
    'crystal',
    'consumable',
    'material'
);


ALTER TYPE public."item_tableType" OWNER TO postgres;

--
-- TOC entry 925 (class 1247 OID 16506)
-- Name: material_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.material_type AS ENUM (
    'Metal',
    'Cloth',
    'Beast',
    'Wood',
    'Drug',
    'Magic'
);


ALTER TYPE public.material_type OWNER TO postgres;

--
-- TOC entry 928 (class 1247 OID 16520)
-- Name: member_mobDifficultyFlag; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."member_mobDifficultyFlag" AS ENUM (
    'Easy',
    'Normal',
    'Hard',
    'Lunatic',
    'Ultimate'
);


ALTER TYPE public."member_mobDifficultyFlag" OWNER TO postgres;

--
-- TOC entry 1174 (class 1247 OID 17858)
-- Name: mercenary_skillAType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."mercenary_skillAType" AS ENUM (
    'Passive',
    'Active'
);


ALTER TYPE public."mercenary_skillAType" OWNER TO postgres;

--
-- TOC entry 1177 (class 1247 OID 17864)
-- Name: mercenary_skillBType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."mercenary_skillBType" AS ENUM (
    'Passive',
    'Active'
);


ALTER TYPE public."mercenary_skillBType" OWNER TO postgres;

--
-- TOC entry 931 (class 1247 OID 16532)
-- Name: mercenary_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mercenary_type AS ENUM (
    'Tank',
    'Dps'
);


ALTER TYPE public.mercenary_type OWNER TO postgres;

--
-- TOC entry 934 (class 1247 OID 16538)
-- Name: mob_initialElement; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."mob_initialElement" AS ENUM (
    'Normal',
    'Light',
    'Dark',
    'Water',
    'Fire',
    'Earth',
    'Wind'
);


ALTER TYPE public."mob_initialElement" OWNER TO postgres;

--
-- TOC entry 937 (class 1247 OID 16554)
-- Name: mob_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mob_type AS ENUM (
    'Mob',
    'MiniBoss',
    'Boss'
);


ALTER TYPE public.mob_type OWNER TO postgres;

--
-- TOC entry 940 (class 1247 OID 16562)
-- Name: player_armor_ability; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.player_armor_ability AS ENUM (
    'Normal',
    'Light',
    'Heavy'
);


ALTER TYPE public.player_armor_ability OWNER TO postgres;

--
-- TOC entry 943 (class 1247 OID 16570)
-- Name: player_pet_personaType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."player_pet_personaType" AS ENUM (
    'Fervent',
    'Intelligent',
    'Mild',
    'Swift',
    'Justice',
    'Devoted',
    'Impulsive',
    'Calm',
    'Sly',
    'Timid',
    'Brave',
    'Active',
    'Sturdy',
    'Steady',
    'Max'
);


ALTER TYPE public."player_pet_personaType" OWNER TO postgres;

--
-- TOC entry 946 (class 1247 OID 16602)
-- Name: player_pet_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.player_pet_type AS ENUM (
    'AllTrades',
    'PhysicalAttack',
    'MagicAttack',
    'PhysicalDefense',
    'MagicDefensem',
    'Avoidance',
    'Hit',
    'SkillsEnhancement',
    'Genius'
);


ALTER TYPE public.player_pet_type OWNER TO postgres;

--
-- TOC entry 1165 (class 1247 OID 17826)
-- Name: player_pet_weaponType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."player_pet_weaponType" AS ENUM (
    'OneHandSword',
    'TwoHandSword',
    'Bow',
    'Bowgun',
    'Rod',
    'Magictool',
    'Knuckle',
    'Halberd',
    'Katana'
);


ALTER TYPE public."player_pet_weaponType" OWNER TO postgres;

--
-- TOC entry 949 (class 1247 OID 16622)
-- Name: recipe_ingredient_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.recipe_ingredient_type AS ENUM (
    'gold',
    'item'
);


ALTER TYPE public.recipe_ingredient_type OWNER TO postgres;

--
-- TOC entry 952 (class 1247 OID 16628)
-- Name: reward_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reward_type AS ENUM (
    'Exp',
    'Money',
    'Item'
);


ALTER TYPE public.reward_type OWNER TO postgres;

--
-- TOC entry 955 (class 1247 OID 16636)
-- Name: skill_chargingType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."skill_chargingType" AS ENUM (
    'Chanting',
    'Reservoir'
);


ALTER TYPE public."skill_chargingType" OWNER TO postgres;

--
-- TOC entry 958 (class 1247 OID 16642)
-- Name: skill_distanceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."skill_distanceType" AS ENUM (
    'None',
    'Long',
    'Short',
    'Both'
);


ALTER TYPE public."skill_distanceType" OWNER TO postgres;

--
-- TOC entry 961 (class 1247 OID 16652)
-- Name: skill_targetType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."skill_targetType" AS ENUM (
    'None',
    'Self',
    'Player',
    'Enemy'
);


ALTER TYPE public."skill_targetType" OWNER TO postgres;

--
-- TOC entry 964 (class 1247 OID 16662)
-- Name: skill_treeType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."skill_treeType" AS ENUM (
    'BladeSkill',
    'ShootSkill',
    'MagicSkill',
    'MarshallSkill',
    'DualSwordSkill',
    'HalberdSkill',
    'MononofuSkill',
    'CrusherSkill',
    'FeatheringSkill',
    'GuardSkill',
    'ShieldSkill',
    'KnifeSkill',
    'KnightSkill',
    'HunterSkill',
    'PriestSkill',
    'AssassinSkill',
    'WizardSkill',
    'SupportSkill',
    'BattleSkill',
    'SurvivalSkill',
    'SmithSkill',
    'AlchemySkill',
    'TamerSkill',
    'DarkPowerSkill',
    'MagicBladeSkill',
    'DancerSkill',
    'MinstrelSkill',
    'BareHandSkill',
    'NinjaSkill',
    'PartisanSkill',
    'LuckSkill',
    'MerchantSkill',
    'PetSkill'
);


ALTER TYPE public."skill_treeType" OWNER TO postgres;

--
-- TOC entry 967 (class 1247 OID 16730)
-- Name: task_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_type AS ENUM (
    'Collect',
    'Defeat',
    'Both',
    'Other'
);


ALTER TYPE public.task_type OWNER TO postgres;

--
-- TOC entry 970 (class 1247 OID 16740)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'Admin',
    'User'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 973 (class 1247 OID 16746)
-- Name: weapon_elementType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."weapon_elementType" AS ENUM (
    'Normal',
    'Light',
    'Dark',
    'Water',
    'Fire',
    'Earth',
    'Wind'
);


ALTER TYPE public."weapon_elementType" OWNER TO postgres;

--
-- TOC entry 976 (class 1247 OID 16762)
-- Name: weapon_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.weapon_type AS ENUM (
    'OneHandSword',
    'TwoHandSword',
    'Bow',
    'Bowgun',
    'Rod',
    'Magictool',
    'Knuckle',
    'Halberd',
    'Katana',
    'Arrow',
    'ShortSword',
    'NinjutsuScroll',
    'Shield'
);


ALTER TYPE public.weapon_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 16789)
-- Name: _BackRelation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_BackRelation" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_BackRelation" OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 16794)
-- Name: _FrontRelation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_FrontRelation" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_FrontRelation" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16799)
-- Name: _armorTocrystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_armorTocrystal" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_armorTocrystal" OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16804)
-- Name: _avatarTocharacter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_avatarTocharacter" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_avatarTocharacter" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16809)
-- Name: _campA; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_campA" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_campA" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16814)
-- Name: _campB; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_campB" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_campB" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16819)
-- Name: _characterToconsumable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterToconsumable" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterToconsumable" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16824)
-- Name: _crystalTooption; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTooption" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTooption" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16829)
-- Name: _crystalToplayer_armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalToplayer_armor" (
    "A" text NOT NULL,
    "B" text NOT NULL
);

ALTER TABLE ONLY public."_crystalToplayer_armor" REPLICA IDENTITY FULL;


ALTER TABLE public."_crystalToplayer_armor" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16834)
-- Name: _crystalToplayer_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalToplayer_option" (
    "A" text NOT NULL,
    "B" text NOT NULL
);

ALTER TABLE ONLY public."_crystalToplayer_option" REPLICA IDENTITY FULL;


ALTER TABLE public."_crystalToplayer_option" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16839)
-- Name: _crystalToplayer_special; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalToplayer_special" (
    "A" text NOT NULL,
    "B" text NOT NULL
);

ALTER TABLE ONLY public."_crystalToplayer_special" REPLICA IDENTITY FULL;


ALTER TABLE public."_crystalToplayer_special" OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16844)
-- Name: _crystalToplayer_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalToplayer_weapon" (
    "A" text NOT NULL,
    "B" text NOT NULL
);

ALTER TABLE ONLY public."_crystalToplayer_weapon" REPLICA IDENTITY FULL;


ALTER TABLE public."_crystalToplayer_weapon" OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16849)
-- Name: _crystalTospecial; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTospecial" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTospecial" OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16854)
-- Name: _crystalToweapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalToweapon" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalToweapon" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16859)
-- Name: _mobTozone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_mobTozone" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_mobTozone" OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16864)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16871)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    id text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    "userId" text NOT NULL
);

ALTER TABLE ONLY public.account REPLICA IDENTITY FULL;


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16876)
-- Name: account_create_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_create_data (
    "accountId" text NOT NULL
);

ALTER TABLE ONLY public.account_create_data REPLICA IDENTITY FULL;


ALTER TABLE public.account_create_data OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16881)
-- Name: account_update_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_update_data (
    "accountId" text NOT NULL
);

ALTER TABLE ONLY public.account_update_data REPLICA IDENTITY FULL;


ALTER TABLE public.account_update_data OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16886)
-- Name: activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.activity OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16891)
-- Name: address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address (
    id text NOT NULL,
    name text NOT NULL,
    type public.address_type NOT NULL,
    "posX" integer NOT NULL,
    "posY" integer NOT NULL,
    "worldId" text NOT NULL
);


ALTER TABLE public.address OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16896)
-- Name: armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.armor (
    name text NOT NULL,
    "baseDef" integer NOT NULL,
    modifiers text[],
    "colorA" integer NOT NULL,
    "colorB" integer NOT NULL,
    "colorC" integer NOT NULL,
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL
);

ALTER TABLE ONLY public.armor REPLICA IDENTITY FULL;


ALTER TABLE public.armor OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16901)
-- Name: avatar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avatar (
    id text NOT NULL,
    name text NOT NULL,
    type public.avatar_type NOT NULL,
    modifiers text[],
    "playerId" text NOT NULL
);

ALTER TABLE ONLY public.avatar REPLICA IDENTITY FULL;


ALTER TABLE public.avatar OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16906)
-- Name: character; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."character" (
    id text NOT NULL,
    name text NOT NULL,
    lv integer NOT NULL,
    str integer NOT NULL,
    "int" integer NOT NULL,
    vit integer NOT NULL,
    agi integer NOT NULL,
    dex integer NOT NULL,
    "personalityType" public."character_personalityType" NOT NULL,
    "personalityValue" integer NOT NULL,
    "weaponId" text NOT NULL,
    "subWeaponId" text NOT NULL,
    "armorId" text NOT NULL,
    "optEquipId" text NOT NULL,
    "speEquipId" text NOT NULL,
    cooking text[],
    modifiers text[],
    "partnerSkillAId" text NOT NULL,
    "partnerSkillBId" text NOT NULL,
    "masterId" text NOT NULL,
    details text NOT NULL,
    "statisticId" text NOT NULL,
    "partnerSkillAType" public."character_partnerSkillAType" NOT NULL,
    "partnerSkillBType" public."character_partnerSkillBType" NOT NULL
);

ALTER TABLE ONLY public."character" REPLICA IDENTITY FULL;


ALTER TABLE public."character" OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16911)
-- Name: character_skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.character_skill (
    id text NOT NULL,
    lv integer NOT NULL,
    "isStarGem" boolean NOT NULL,
    "templateId" text NOT NULL,
    "characterId" text NOT NULL
);

ALTER TABLE ONLY public.character_skill REPLICA IDENTITY FULL;


ALTER TABLE public.character_skill OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16916)
-- Name: combo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.combo (
    id text NOT NULL,
    disable boolean NOT NULL,
    name text NOT NULL,
    "characterId" text NOT NULL
);

ALTER TABLE ONLY public.combo REPLICA IDENTITY FULL;


ALTER TABLE public.combo OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16921)
-- Name: combo_step; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.combo_step (
    id text NOT NULL,
    "characterSkillId" text NOT NULL,
    "comboId" text NOT NULL,
    type public.combo_step_type NOT NULL
);


ALTER TABLE public.combo_step OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16926)
-- Name: consumable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumable (
    name text NOT NULL,
    type public.consumable_type NOT NULL,
    "effectDuration" integer NOT NULL,
    effects text[],
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL
);

ALTER TABLE ONLY public.consumable REPLICA IDENTITY FULL;


ALTER TABLE public.consumable OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16931)
-- Name: crystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crystal (
    name text NOT NULL,
    type public.crystal_type NOT NULL,
    modifiers text[],
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL
);

ALTER TABLE ONLY public.crystal REPLICA IDENTITY FULL;


ALTER TABLE public.crystal OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16936)
-- Name: drop_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drop_item (
    id text NOT NULL,
    "itemId" text NOT NULL,
    probability integer NOT NULL,
    "relatedPartType" public."drop_item_relatedPartType" NOT NULL,
    "relatedPartInfo" text NOT NULL,
    "breakRewardType" text NOT NULL,
    "dropById" text NOT NULL
);


ALTER TABLE public.drop_item OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16941)
-- Name: image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image (
    id text NOT NULL,
    "dataUrl" text NOT NULL,
    "npcId" text,
    "weaponId" text,
    "armorId" text,
    "optEquipId" text,
    "mobId" text
);

ALTER TABLE ONLY public.image REPLICA IDENTITY FULL;


ALTER TABLE public.image OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16946)
-- Name: item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item (
    id text NOT NULL,
    "tableType" public."item_tableType" NOT NULL,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);

ALTER TABLE ONLY public.item REPLICA IDENTITY FULL;


ALTER TABLE public.item OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16951)
-- Name: material; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material (
    name text NOT NULL,
    type public.material_type NOT NULL,
    "ptValue" integer NOT NULL,
    price integer NOT NULL,
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL
);


ALTER TABLE public.material OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16956)
-- Name: member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.member (
    id text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    "playerId" text,
    "partnerId" text,
    "mercenaryId" text,
    "mobId" text,
    "mobDifficultyFlag" public."member_mobDifficultyFlag" NOT NULL,
    "teamId" text NOT NULL
);

ALTER TABLE ONLY public.member REPLICA IDENTITY FULL;


ALTER TABLE public.member OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16961)
-- Name: mercenary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mercenary (
    type public.mercenary_type NOT NULL,
    "templateId" text NOT NULL,
    "skillAId" text NOT NULL,
    "skillBId" text NOT NULL,
    "skillAType" public."mercenary_skillAType" NOT NULL,
    "skillBType" public."mercenary_skillBType" NOT NULL
);

ALTER TABLE ONLY public.mercenary REPLICA IDENTITY FULL;


ALTER TABLE public.mercenary OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16966)
-- Name: mob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mob (
    id text NOT NULL,
    name text NOT NULL,
    type public.mob_type NOT NULL,
    captureable boolean NOT NULL,
    "baseLv" integer NOT NULL,
    experience integer NOT NULL,
    "partsExperience" integer NOT NULL,
    "initialElement" public."mob_initialElement" NOT NULL,
    radius integer NOT NULL,
    maxhp integer NOT NULL,
    "physicalDefense" integer NOT NULL,
    "physicalResistance" integer NOT NULL,
    "magicalDefense" integer NOT NULL,
    "magicalResistance" integer NOT NULL,
    "criticalResistance" integer NOT NULL,
    avoidance integer NOT NULL,
    dodge integer NOT NULL,
    block integer NOT NULL,
    "normalAttackResistanceModifier" integer NOT NULL,
    "physicalAttackResistanceModifier" integer NOT NULL,
    "magicalAttackResistanceModifier" integer NOT NULL,
    actions jsonb NOT NULL,
    details text NOT NULL,
    "dataSources" text NOT NULL,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);

ALTER TABLE ONLY public.mob REPLICA IDENTITY FULL;


ALTER TABLE public.mob OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16971)
-- Name: npc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.npc (
    id text NOT NULL,
    name text NOT NULL,
    "zoneId" text NOT NULL
);


ALTER TABLE public.npc OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16976)
-- Name: option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.option (
    name text NOT NULL,
    "baseDef" integer NOT NULL,
    modifiers text[],
    "colorA" integer NOT NULL,
    "colorB" integer NOT NULL,
    "colorC" integer NOT NULL,
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL
);

ALTER TABLE ONLY public.option REPLICA IDENTITY FULL;


ALTER TABLE public.option OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 16981)
-- Name: player; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player (
    id text NOT NULL,
    name text NOT NULL,
    "useIn" text NOT NULL,
    actions jsonb NOT NULL,
    "accountId" text NOT NULL
);

ALTER TABLE ONLY public.player REPLICA IDENTITY FULL;


ALTER TABLE public.player OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 16986)
-- Name: player_armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_armor (
    id text NOT NULL,
    name text NOT NULL,
    def integer NOT NULL,
    ability public.player_armor_ability NOT NULL,
    "templateId" text,
    refinement integer NOT NULL,
    modifiers text[],
    "masterId" text NOT NULL
);

ALTER TABLE ONLY public.player_armor REPLICA IDENTITY FULL;


ALTER TABLE public.player_armor OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 16991)
-- Name: player_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_option (
    id text NOT NULL,
    name text NOT NULL,
    "templateId" text NOT NULL,
    refinement integer NOT NULL,
    "masterId" text NOT NULL,
    "extraAbi" integer NOT NULL
);

ALTER TABLE ONLY public.player_option REPLICA IDENTITY FULL;


ALTER TABLE public.player_option OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 16996)
-- Name: player_pet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_pet (
    id text NOT NULL,
    "templateId" text NOT NULL,
    name text NOT NULL,
    "pStr" integer NOT NULL,
    "pInt" integer NOT NULL,
    "pVit" integer NOT NULL,
    "pAgi" integer NOT NULL,
    "pDex" integer NOT NULL,
    str integer NOT NULL,
    "int" integer NOT NULL,
    vit integer NOT NULL,
    agi integer NOT NULL,
    dex integer NOT NULL,
    "weaponAtk" integer NOT NULL,
    generation integer NOT NULL,
    "maxLv" integer NOT NULL,
    "masterId" text NOT NULL,
    "personaType" public."player_pet_personaType" NOT NULL,
    type public.player_pet_type NOT NULL,
    "weaponType" public."player_pet_weaponType" NOT NULL
);

ALTER TABLE ONLY public.player_pet REPLICA IDENTITY FULL;


ALTER TABLE public.player_pet OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 17001)
-- Name: player_special; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_special (
    id text NOT NULL,
    name text NOT NULL,
    "templateId" text NOT NULL,
    "masterId" text NOT NULL,
    "extraAbi" integer NOT NULL
);

ALTER TABLE ONLY public.player_special REPLICA IDENTITY FULL;


ALTER TABLE public.player_special OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17006)
-- Name: player_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_weapon (
    id text NOT NULL,
    name text NOT NULL,
    "baseAbi" integer NOT NULL,
    stability integer NOT NULL,
    "extraAbi" integer NOT NULL,
    "templateId" text,
    refinement integer NOT NULL,
    modifiers text[],
    "masterId" text NOT NULL
);

ALTER TABLE ONLY public.player_weapon REPLICA IDENTITY FULL;


ALTER TABLE public.player_weapon OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 17011)
-- Name: post; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text NOT NULL
);


ALTER TABLE public.post OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 17016)
-- Name: recipe; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe (
    id text NOT NULL,
    "activityId" text,
    "itemId" text NOT NULL
);


ALTER TABLE public.recipe OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 17021)
-- Name: recipe_ingredient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_ingredient (
    id text NOT NULL,
    count integer NOT NULL,
    "itemId" text,
    "recipeId" text NOT NULL,
    type public.recipe_ingredient_type NOT NULL
);


ALTER TABLE public.recipe_ingredient OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 17026)
-- Name: reward; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reward (
    id text NOT NULL,
    type public.reward_type NOT NULL,
    value integer NOT NULL,
    probability integer NOT NULL,
    "itemId" text,
    "taskId" text NOT NULL
);


ALTER TABLE public.reward OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 17031)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "accountId" text NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 17036)
-- Name: simulator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.simulator (
    id text NOT NULL,
    name text NOT NULL,
    details text,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);

ALTER TABLE ONLY public.simulator REPLICA IDENTITY FULL;


ALTER TABLE public.simulator OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 17041)
-- Name: skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill (
    id text NOT NULL,
    "posX" integer NOT NULL,
    "posY" integer NOT NULL,
    tier integer NOT NULL,
    name text NOT NULL,
    "isPassive" boolean NOT NULL,
    "chargingType" public."skill_chargingType" NOT NULL,
    "distanceType" public."skill_distanceType" NOT NULL,
    "targetType" public."skill_targetType" NOT NULL,
    details text NOT NULL,
    "dataSources" text NOT NULL,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text,
    "treeType" public."skill_treeType" NOT NULL
);

ALTER TABLE ONLY public.skill REPLICA IDENTITY FULL;


ALTER TABLE public.skill OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 17046)
-- Name: skill_effect; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_effect (
    id text NOT NULL,
    condition text NOT NULL,
    "elementLogic" text NOT NULL,
    "castingRange" integer NOT NULL,
    "effectiveRange" integer NOT NULL,
    "motionFixed" text NOT NULL,
    "motionModified" text NOT NULL,
    "chantingFixed" text NOT NULL,
    "chantingModified" text NOT NULL,
    "reservoirFixed" text NOT NULL,
    "reservoirModified" text NOT NULL,
    "startupFrames" text NOT NULL,
    cost text NOT NULL,
    description text NOT NULL,
    logic jsonb NOT NULL,
    details text NOT NULL,
    "belongToskillId" text NOT NULL
);

ALTER TABLE ONLY public.skill_effect REPLICA IDENTITY FULL;


ALTER TABLE public.skill_effect OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 17051)
-- Name: special; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.special (
    name text NOT NULL,
    "baseDef" integer NOT NULL,
    modifiers text[],
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL
);

ALTER TABLE ONLY public.special REPLICA IDENTITY FULL;


ALTER TABLE public.special OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 17056)
-- Name: statistic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statistic (
    id text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "usageTimestamps" timestamp(3) without time zone[],
    "viewTimestamps" timestamp(3) without time zone[]
);

ALTER TABLE ONLY public.statistic REPLICA IDENTITY FULL;


ALTER TABLE public.statistic OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 17061)
-- Name: task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task (
    id text NOT NULL,
    lv integer NOT NULL,
    name text NOT NULL,
    type public.task_type NOT NULL,
    description text NOT NULL,
    "npcId" text NOT NULL
);


ALTER TABLE public.task OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 17066)
-- Name: task_collect_require; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_collect_require (
    id text NOT NULL,
    count integer NOT NULL,
    "itemId" text NOT NULL,
    "taskId" text NOT NULL
);


ALTER TABLE public.task_collect_require OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 17071)
-- Name: task_kill_requirement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_kill_requirement (
    id text NOT NULL,
    "mobId" text NOT NULL,
    count integer NOT NULL,
    "taskId" text NOT NULL
);


ALTER TABLE public.task_kill_requirement OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 17076)
-- Name: team; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team (
    id text NOT NULL,
    name text,
    gems text[]
);

ALTER TABLE ONLY public.team REPLICA IDENTITY FULL;


ALTER TABLE public.team OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 17081)
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    role public.user_role NOT NULL
);

ALTER TABLE ONLY public."user" REPLICA IDENTITY FULL;


ALTER TABLE public."user" OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 17086)
-- Name: weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weapon (
    name text NOT NULL,
    "baseAbi" integer NOT NULL,
    stability integer NOT NULL,
    modifiers text[],
    "colorA" integer NOT NULL,
    "colorB" integer NOT NULL,
    "colorC" integer NOT NULL,
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "itemId" text NOT NULL,
    type public.weapon_type NOT NULL,
    "elementType" public."weapon_elementType" NOT NULL
);

ALTER TABLE ONLY public.weapon REPLICA IDENTITY FULL;


ALTER TABLE public.weapon OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 17091)
-- Name: world; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.world (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.world OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 17096)
-- Name: zone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zone (
    id text NOT NULL,
    name text NOT NULL,
    "linkZone" text[],
    "rewardNodes" integer,
    "activityId" text,
    "addressId" text NOT NULL
);


ALTER TABLE public.zone OWNER TO postgres;

--
-- TOC entry 4018 (class 0 OID 16789)
-- Dependencies: 215
-- Data for Name: _BackRelation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_BackRelation" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4019 (class 0 OID 16794)
-- Dependencies: 216
-- Data for Name: _FrontRelation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_FrontRelation" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4020 (class 0 OID 16799)
-- Dependencies: 217
-- Data for Name: _armorTocrystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_armorTocrystal" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4021 (class 0 OID 16804)
-- Dependencies: 218
-- Data for Name: _avatarTocharacter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_avatarTocharacter" ("A", "B") FROM stdin;
defaultAvatarTopId	defaultCharacterId
defaultAvatarBottomId	defaultCharacterId
defaultAvatarDecorationId	defaultCharacterId
\.


--
-- TOC entry 4022 (class 0 OID 16809)
-- Dependencies: 219
-- Data for Name: _campA; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_campA" ("A", "B") FROM stdin;
defaultSimulatorId	defaultTeamAId
\.


--
-- TOC entry 4023 (class 0 OID 16814)
-- Dependencies: 220
-- Data for Name: _campB; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_campB" ("A", "B") FROM stdin;
defaultSimulatorId	defaultTeamBId
\.


--
-- TOC entry 4024 (class 0 OID 16819)
-- Dependencies: 221
-- Data for Name: _characterToconsumable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterToconsumable" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4025 (class 0 OID 16824)
-- Dependencies: 222
-- Data for Name: _crystalTooption; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTooption" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4026 (class 0 OID 16829)
-- Dependencies: 223
-- Data for Name: _crystalToplayer_armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalToplayer_armor" ("A", "B") FROM stdin;
defaultIteamArmorCrystalAId	defaultPlayerArmorId
defaultItemArmorCrystalBId	defaultPlayerArmorId
\.


--
-- TOC entry 4027 (class 0 OID 16834)
-- Dependencies: 224
-- Data for Name: _crystalToplayer_option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalToplayer_option" ("A", "B") FROM stdin;
defaultIteamOptEquipCrystalBId	defaultPlayerOptEquipId
defaultItemOptEquipCrystalAId	defaultPlayerOptEquipId
\.


--
-- TOC entry 4028 (class 0 OID 16839)
-- Dependencies: 225
-- Data for Name: _crystalToplayer_special; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalToplayer_special" ("A", "B") FROM stdin;
defaultItemSpeEquipCrystalAId	defaultPlayerSpeEquipId
defaultItemSpeEquipCrystalBId	defaultPlayerSpeEquipId
\.


--
-- TOC entry 4029 (class 0 OID 16844)
-- Dependencies: 226
-- Data for Name: _crystalToplayer_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalToplayer_weapon" ("A", "B") FROM stdin;
defaultItemWeaponCrystalAId	defaultPlayerWeaponId
defaultItemWeaponCrystalBId	defaultPlayerWeaponId
\.


--
-- TOC entry 4030 (class 0 OID 16849)
-- Dependencies: 227
-- Data for Name: _crystalTospecial; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTospecial" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4031 (class 0 OID 16854)
-- Dependencies: 228
-- Data for Name: _crystalToweapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalToweapon" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4032 (class 0 OID 16859)
-- Dependencies: 229
-- Data for Name: _mobTozone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_mobTozone" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4033 (class 0 OID 16864)
-- Dependencies: 230
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- TOC entry 4034 (class 0 OID 16871)
-- Dependencies: 231
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (id, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state, "userId") FROM stdin;
cluhz95c5000078elg5r46i83	qq	591519722	\N	\N	\N	\N	\N	\N	\N	cluhz95c5000078elg5r46831
\.


--
-- TOC entry 4035 (class 0 OID 16876)
-- Dependencies: 232
-- Data for Name: account_create_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_create_data ("accountId") FROM stdin;
cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 4036 (class 0 OID 16881)
-- Dependencies: 233
-- Data for Name: account_update_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_update_data ("accountId") FROM stdin;
cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 4037 (class 0 OID 16886)
-- Dependencies: 234
-- Data for Name: activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity (id, name) FROM stdin;
\.


--
-- TOC entry 4038 (class 0 OID 16891)
-- Dependencies: 235
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address (id, name, type, "posX", "posY", "worldId") FROM stdin;
\.


--
-- TOC entry 4039 (class 0 OID 16896)
-- Dependencies: 236
-- Data for Name: armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.armor (name, "baseDef", modifiers, "colorA", "colorB", "colorC", "dataSources", details, "itemId") FROM stdin;
defaultArmor	10	{}	0	0	0			defaultItemArmorId
\.


--
-- TOC entry 4040 (class 0 OID 16901)
-- Dependencies: 237
-- Data for Name: avatar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.avatar (id, name, type, modifiers, "playerId") FROM stdin;
defaultAvatarTopId	defaultAvatarTop	Top	{"str + 2%","mPie + 9%"}	defaultPlayerId
defaultAvatarBottomId	defaultAvaterBottom	Bottom	{"mPie + 7%","distanceDamageBouns.short + 2%"}	defaultPlayerId
defaultAvatarDecorationId	defaultAvatarDecoration	Decoration	{"dodge + 6","mPie + 7%"}	defaultPlayerId
\.


--
-- TOC entry 4041 (class 0 OID 16906)
-- Dependencies: 238
-- Data for Name: character; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."character" (id, name, lv, str, "int", vit, agi, dex, "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optEquipId", "speEquipId", cooking, modifiers, "partnerSkillAId", "partnerSkillBId", "masterId", details, "statisticId", "partnerSkillAType", "partnerSkillBType") FROM stdin;
defaultCharacterId	defaultCharacter	280	465	0	0	0	247	None	0	defaultPlayerWeaponId	defaultPlayerSubWeaponId	defaultPlayerArmorId	defaultPlayerOptEquipId	defaultPlayerSpeEquipId	{}	{}			defaultPlayerId		defaultCharacterStatisticId	Passive	Passive
\.


--
-- TOC entry 4042 (class 0 OID 16911)
-- Dependencies: 239
-- Data for Name: character_skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.character_skill (id, lv, "isStarGem", "templateId", "characterId") FROM stdin;
\.


--
-- TOC entry 4043 (class 0 OID 16916)
-- Dependencies: 240
-- Data for Name: combo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.combo (id, disable, name, "characterId") FROM stdin;
\.


--
-- TOC entry 4044 (class 0 OID 16921)
-- Dependencies: 241
-- Data for Name: combo_step; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.combo_step (id, "characterSkillId", "comboId", type) FROM stdin;
\.


--
-- TOC entry 4045 (class 0 OID 16926)
-- Dependencies: 242
-- Data for Name: consumable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consumable (name, type, "effectDuration", effects, "dataSources", details, "itemId") FROM stdin;
\.


--
-- TOC entry 4046 (class 0 OID 16931)
-- Dependencies: 243
-- Data for Name: crystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crystal (name, type, modifiers, "dataSources", details, "itemId") FROM stdin;
defaultOptEquipCrystalBId	OptEquipCrystal	{"distanceDamageBouns.short + 10%","maxHp + 30%","cr + 50%","maxMp - 100","armor.type == \\"Light\\" && pPie - 10%"}			defaultIteamOptEquipCrystalBId
defaultOptEquipCrystalAId	OptEquipCrystal	{"distanceDamageBonus.short + 12%","distanceDamageBonus.long + 6%","accuracy + 10%","aspd - 900","mainWeapon.type == \\"Migictool\\" && mspd + 5%","subWeapon.type == \\"Ninjutsuscroll\\" && pPie + 10%"}			defaultItemOptEquipCrystalAId
defaultSpeEquipCrystalAId	SpecialCrystal	{"mAtk + 9%","cspd + 9%","anticipate + 9%","mainWeapon.typ == \\"Rod\\" && aggro - 9%","subWeapon.type == \\"Shield\\" && aggro + 9%"}			defaultItemSpeEquipCrystalAId
defaultWeaponCrystalAId	WeaponCrystal	{"mAtk + 8%","mPie + 20%","cspd - 16%"}			defaultItemWeaponCrystalAId
defaultSpeEquipCrystalBId\tSpeCrystal\t{"dictanceDamageBouns.short + 9%","accuracy + 5%","maxMp + 200","maxHp - 300","cr - 7"}\t\t\tdefaultItemSpeCrystalBId	NormalCrystal	{"dictanceDamageBouns.short + 9%","accuracy + 5%","maxMp + 200","maxHp - 300","cr - 7"}			defaultItemSpeEquipCrystalBId
defaultWeaponCrystalBId	WeaponCrystal	{"mAtk + 10%","mPie + 7%","aggro - 11%","mDef - 30%"}			defaultItemWeaponCrystalBId
defaultArmorCrystalAId	ArmorCrystal	{"mAtk + 10%","int + 6%","cspd + 40%","ampr + 10%"}			defaultIteamArmorCrystalAId
defaultArmorCrystalBId	ArmorCrystal	{"pStabilitiy + 11%","str + 6%","vit + 6%","armor.type == \\"Light\\" && distanceDamageBouns.short + 11%","armor.type == \\"Light\\" && pStability - 5%","armor.type == \\"Heavy\\" && distanceDamageBouns.long + 11%","armor.type == \\"Heavy\\" && pStability - 5%"}			defaultItemArmorCrystalBId
\.


--
-- TOC entry 4047 (class 0 OID 16936)
-- Dependencies: 244
-- Data for Name: drop_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drop_item (id, "itemId", probability, "relatedPartType", "relatedPartInfo", "breakRewardType", "dropById") FROM stdin;
\.


--
-- TOC entry 4048 (class 0 OID 16941)
-- Dependencies: 245
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image (id, "dataUrl", "npcId", "weaponId", "armorId", "optEquipId", "mobId") FROM stdin;
\.


--
-- TOC entry 4049 (class 0 OID 16946)
-- Dependencies: 246
-- Data for Name: item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.item (id, "tableType", "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
defaultItemOptEquipCrystalAId	crystal	defaultItemOptEquipCrystalAStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemConsumableId	consumable	defaultItemConsumableStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemArmorId	armor	defaultIteamArmorStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemArmorCrystalBId	crystal	defaultItemArmorCrystalBStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultIteamOptEquipId	option	defaultIteamOptEquiStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultIteamOptEquipCrystalBId	crystal	defaultItemOptEquipCrystalBStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultIteamArmorCrystalAId	crystal	defaultItemArmorCrystalAStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemWeaponId	weapon	defaultItemWeaponStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemSpeEquipCrystalBId	crystal	defaultItemSpeEquipCrystalBStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemMaterialMetalId	material	defaultItemMaterialMetalStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemSpeEquipCrystalAId	crystal	defaultItemSpeEquipCrystalAStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemSpeEquipId	special	defaultItemSpeEquipStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemSubWeaponId	weapon	defaultItemSubWeaponStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemWeaponCrystalAId	crystal	defaultItemWeaponCrystalAStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
defaultItemWeaponCrystalBId	crystal	defaultItemWeaponCrystalBStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 4050 (class 0 OID 16951)
-- Dependencies: 247
-- Data for Name: material; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.material (name, type, "ptValue", price, "dataSources", details, "itemId") FROM stdin;
\.


--
-- TOC entry 4051 (class 0 OID 16956)
-- Dependencies: 248
-- Data for Name: member; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.member (id, name, "order", "playerId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "teamId") FROM stdin;
defaultMember1Id	defaultMember1	0	defaultPlayerId	\N	\N	\N	Easy	defaultTeamAId
defaultMember2Id	defaultMember2	0	\N	\N	\N	clui55nha000111myotjx9ia0	Easy	defaultTeamBId
\.


--
-- TOC entry 4052 (class 0 OID 16961)
-- Dependencies: 249
-- Data for Name: mercenary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mercenary (type, "templateId", "skillAId", "skillBId", "skillAType", "skillBType") FROM stdin;
\.


--
-- TOC entry 4053 (class 0 OID 16966)
-- Dependencies: 250
-- Data for Name: mob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mob (id, name, type, captureable, "baseLv", experience, "partsExperience", "initialElement", radius, maxhp, "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", avoidance, dodge, block, "normalAttackResistanceModifier", "physicalAttackResistanceModifier", "magicalAttackResistanceModifier", actions, details, "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
clv6we81i001nwv1ftd6jymzi	奥克拉辛	Boss	f	226	21100	0	Dark	1	0	987	30	987	30	30	338	0	0	0	5	5	{}	部位被破坏时，降低抗性与防御	fengli	15	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wik7s001pwv1fkf2t5c6z	犰尔达	Boss	f	229	25000	0	Earth	1	5500000	1717	39	1717	39	40	343	0	30	0	1	5	{}	部位被破坏时，降低抗性与防御	fengli	14	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vznrs001hwv1f78z595uu	兵龙达鲁巴	Boss	f	217	16700	0	Earth	1	0	596	8	705	8	40	487	5	35	0	5	10	{}	部位被破坏时，格挡率会降低。	fengli	17	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xawyo001vwv1fcicqcor2	欺龙米缪加	Boss	f	238	22600	0	Earth	1	0	2620	9	2620	9	35	357	0	5	0	10	15	{}	部位被破坏后，防御力降低。	fengli	11	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ydapf0029wv1fz5zss4fd	尉龙鲁迪斯	Boss	f	259	24600	0	Earth	1	0	647	10	906	10	35	388	0	10	0	5	5	{}	部位受到破坏时，解除昏厥免疫	fengli	4	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vraf5001dwv1f0mm86k44	岩龙菲尔岑	Boss	f	211	15150	0	Earth	1	3171000	1055	8	739	8	20	316	2	8	0	10	20	{}	被破坏部位后防御力会降低，并能释放更多种类的技能	fengli	3	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6x7ebl001twv1fnhnoc8ln	灼龙伊戈涅乌斯	Boss	f	235	20800	0	Fire	1	0	823	9	823	9	20	350	1	1	0	15	20	{}	血量降低至50%以后，抗性增加，并在一段时间免疫控制。	fengli	12	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6w6zqu001jwv1fq5r6q9dv	炎龙布兰玛	Boss	f	220	16700	0	Fire	1	5600000	880	8	880	8	30	412	7	0	0	10	15	{}	血量越低，抗性与防御越低	fengli	1	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv93ha6000fu048qq11zx9y	伊科诺斯	Boss	f	108	4200	0	Earth	1	0	162	10	140	10	0	162	0	10	0	0	0	{}	血量每下降33%，防御能力会发生变化	fengli	63	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wmh4w001rwv1f8aa3u6vh	护卫魔像	Boss	f	232	38000	0	Normal	1	0	1160	25	1160	25	20	418	0	25	0	0	0	{}	血量低于50%以后切换形态；红色形态的回血期间受到麻痹会被打断。	fengli	13	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6uxjlm000xwv1fb3g0tjv4	薇芮娜·超柯尔连生体	Boss	f	195	57000	0	Fire	1	0	819	7	585	7	5	438	6	0	0	1	5	{}	经验值包括柱子。一阶段受到翻覆后获得高额减伤；三阶段受到翻覆后会在自身脚下释放漩涡。	fengli	24	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vjtv30019wv1fcyunhqls	雷丽莎	Boss	f	210	26200	0	Dark	1	0	420	8	630	8	30	630	5	5	0	1	10	{}	第二阶段血量降低至50%以下后，暴击抗性提高至500	fengli	20	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6uoufi000twv1fal4xlw5j	魔晶鹫	Boss	f	190	27200	0	Dark	1	0	523	7	618	7	15	428	10	5	0	5	5	{}	第二阶段属性会变为风属性	fengli	28	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvgvr59000pu048jlo772t4	热带梦貘	Boss	f	120	7800	0	Normal	1	7813000	144	4	168	4	0	360	5	5	0	25	40	{}	睡着了会回血	fengli	57	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xdtcv001xwv1ft4jvd8r1	丝岩比尔	Boss	f	241	24400	0	Fire	1	0	361	9	723	9	55	541	0	0	0	0	0	{}	生命值高于50%时，免疫胆怯	fengli	10	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6tmq9x000hwv1fu7b0bmsr	库斯特	Boss	f	178	18200	0	Earth	1	0	534	7	534	7	25	267	5	5	0	5	5	{}	生命值每降低33%切换一阶段。每次切换阶段会进行召唤，可用控制打断。	fengli	33	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vo2mo001bwv1f0vxczx5u	晶玛体	Boss	f	208	14080	0	Fire	1	0	728	16	728	16	20	468	3	3	0	5	10	{}	每降低25%最大生命值，会进入一段时间的高抗性状态，受到：昏厥、麻痹、着火会解除该状态。	fengli	19	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y70u50025wv1fqyhsjcz9	多米纳雷多尔	Boss	f	253	32500	0	Dark	1	0	1265	50	1265	50	30	450	5	20	0	1	15	{}	每失去一个球，双抗降低10%，并降低闪躲率和格挡率	fengli	6	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v4ws60011wv1f5ztq57so	恶灵巨蛛	Boss	f	196	11600	0	Dark	1	0	511	7	392	7	0	353	4	4	0	20	20	{}	最后阶段飞天开始向后位移时可以被控制。	fengli	25	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvi2py9001lu048nvjh3joe	漂漂妈	Boss	f	151	12400	0	Water	1	0	226	6	271	6	0	226	5	0	0	15	20	{}	无	fengli	101	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5luln000b11my87rwbzsk	米诺陶诺斯	Boss	f	32	420	0	Wind	1	0	48	1	48	1	0	48	4	0	0	5	5	{}	无	fengli	100	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5v02h000f11myc5ylpafa	迪赛尔蛮龙	Boss	f	40	560	0	Earth	1	0	20	1	20	1	0	75	0	9	0	15	15	{}	无	fengli	99	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui66v15000j11myurfawvy9	遗迹魔像	Boss	f	45	660	0	Earth	1	0	106	1	106	1	0	14	0	50	0	15	15	{}	无	fengli	98	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui69tqk000l11mygtkum8iv	弗雷帝亚	Boss	f	49	1480	0	Wind	1	0	24	1	24	1	0	292	10	0	0	10	5	{}	无	fengli	97	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6d9hj000n11mydvgshlcp	焰狼沃格	Boss	f	50	1500	0	Fire	1	0	100	2	100	2	0	56	30	0	0	25	50	{}	无	fengli	96	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6iio3000p11my11qq7s9z	亚思托	Boss	f	50	760	0	Water	1	0	50	1	150	1	0	112	15	0	0	25	1	{}	无	fengli	95	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6r7n8000r11myjtveczlw	黏液怪	Boss	f	52	1400	0	Water	1	0	78	12	78	12	0	0	0	50	0	5	5	{}	无	fengli	94	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui589ck000311my0p5bgm0o	出土魔像	Boss	f	16	90	0	Normal	1	3150	12	0	12	0	0	12	0	10	0	15	15	{}	无	fengli	93	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7cvao001111myok0n3ps3	獠牙王	Boss	f	62	3000	0	Normal	1	0	62	2	62	2	0	279	4	8	0	10	10	{}	无	fengli	92	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui74bi7000t11my1qhbbgjc	马维兹	Boss	f	55	1290	0	Water	1	0	165	7	165	7	0	41	3	30	0	10	5	{}	无	fengli	91	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluozah5r0000ijciwqr8rbg2	上古女帝	Boss	f	64	3120	0	Light	1	0	32	52	32	52	0	48	1	8	0	10	10	{}	无	fengli	86	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5a9ql000511my8n0qi7kh	幽灵兵甲	Boss	f	20	240	0	Dark	1	8544	26	0	50	0	0	30	0	0	0	30	10	{}	无	fengli	85	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5oygi000d11mympx04zbv	哥布林老大	Boss	f	40	560	0	Fire	1	0	40	0	40	0	0	75	0	9	0	10	5	{}	无	fengli	84	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5ckiy000711my8nvvvsoc	诡谲的结晶	Boss	f	24	255	0	Dark	1	0	0	0	0	0	0	0	0	4	0	5	15	{}	无	fengli	83	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7972v000x11mygbn4skgm	狂暴龙	Boss	f	60	960	0	Earth	1	0	60	2	60	2	0	45	0	0	0	1	1	{}	无	fengli	82	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui765bp000v11myatj0el9t	甘瑞夫	Boss	f	58	1150	0	Earth	1	0	232	1	58	1	0	43	0	23	0	25	1	{}	无	fengli	81	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusd5unt000011x4y11ayyhe	哥布林大哥	Boss	f	70	2400	0	Fire	1	0	140	1	210	1	0	157	4	0	0	10	20	{}	无	fengli	80	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdj1sy000311x4kncp7jb3	奴雷德斯	Boss	f	76	5360	0	Dark	1	0	152	23	152	23	0	57	0	13	0	2	3	{}	无	fengli	77	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdojrh000511x43obnruzj	葛瓦	Boss	f	82	5000	0	Normal	1	0	41	3	41	3	0	246	5	5	0	10	10	{}	无	fengli	75	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdr2hb000611x4c0fujm0s	魔形机壳	Boss	f	85	7900	0	Dark	1	0	255	3	255	3	0	64	0	5	0	1	1	{}	无	fengli	74	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdtmw9000711x4k88rg3j7	虚假黑骑士	Boss	f	88	6600	0	Dark	1	0	176	23	176	23	0	231	12	2	0	30	30	{}	无	fengli	73	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdwmh4000811x43ejfjs8y	魔晶兽	Boss	f	91	6300	0	Dark	1	0	274	3	320	3	0	136	0	25	0	30	35	{}	无	fengli	72	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluse9wij000a11x4unrim046	黑暗骑士因扎尼奥	Boss	f	94	5500	0	Water	1	4890000	212	3	188	3	0	176	3	10	0	35	15	{}	无	fengli	71	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8eh550003u048e76ibdxs	佐尔班	Boss	f	95	3900	0	Wind	1	2440000	196	3	392	3	0	588	6	0	0	1	1	{}	无	fengli	69	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8ijit0005u048knmhxyp9	薄暮巨龙	Boss	f	100	8000	0	Normal	1	0	180	4	260	4	0	255	6	12	0	20	30	{}	无	fengli	68	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8pnax0007u048t9c16ckd	红晶魔蛛	Boss	f	100	4400	0	Earth	1	0	140	4	110	4	0	300	5	10	0	20	15	{}	无	fengli	67	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluqevnyg0009pzxgc2vnj27i	蒙面战士	Boss	f	67	4300	0	Fire	1	0	134	2	134	2	0	200	4	4	0	25	25	{}	无	fengli	66	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8t0860009u048a24icquk	嗜人蝎狮	Boss	f	100	14400	0	Normal	1	0	220	4	242	4	0	248	3	9	0	20	40	{}	无	fengli	65	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8uzts000bu048su2ccp8x	魔晶炮手	Boss	f	103	7610	0	Normal	1	0	216	4	247	4	0	123	1	20	0	40	50	{}	无	fengli	64	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv90elr000du048hics57c5	战将复制体	Boss	f	106	8700	0	Fire	1	7800000	371	20	392	15	0	238	0	20	0	35	35	{}	无	fengli	62	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv969jf000hu048anlwmncr	格雷西亚复制体	Boss	f	109	8150	0	Fire	1	0	164	35	218	35	0	302	5	5	0	35	40	{}	无	fengli	61	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvahldr000lu048n8tnj407	机甲狮将	Boss	f	115	6250	0	Earth	1	0	161	4	138	4	0	275	10	5	0	0	0	{}	无	fengli	60	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvgo77p000nu048109v4tal	约克	Boss	f	118	6800	0	Normal	1	0	295	4	118	4	0	275	10	5	0	40	0	{}	无	fengli	59	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv98k6v000ju048zq3nfgym	合成魔兽	Boss	f	112	6000	0	Fire	1	0	179	4	158	4	0	185	5	5	0	30	15	{}	无	fengli	58	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh0ial000ru048060ee4vn	半魔像暴君	Boss	f	121	8400	0	Normal	1	0	61	4	61	4	0	543	6	10	0	10	10	{}	无	fengli	56	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh2f6u000tu0488nxl4vy8	龙兽半魔像	Boss	f	124	12240	0	Normal	1	0	248	15	372	15	0	186	2	20	0	50	50	{}	无	fengli	55	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh7gh1000xu0487ukrqnob	扎哈克半魔像	Boss	f	130	6000	0	Light	1	0	1000	5	1000	5	0	0	5	10	0	2	1	{}	无	fengli	54	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh4hnn000vu048647dpkg4	妖精兽拉瓦达	Boss	f	127	6000	0	Light	1	0	381	15	445	15	0	228	2	7	0	30	40	{}	无	fengli	53	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvha2u2000zu04891jyz3wc	重装魔偶·蓝	Boss	f	133	6200	0	Wind	1	0	399	80	0	80	0	299	0	0	0	5	5	{}	无	fengli	52	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhbmid0011u048wsgycyt1	重装魔偶·黄	Boss	f	133	6200	0	Wind	1	0	399	55	0	55	0	299	0	0	0	5	5	{}	无	fengli	51	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhcvnx0013u048kumee5cx	重装魔偶·红	Boss	f	133	6200	0	Normal	1	0	399	30	0	30	0	299	0	0	0	5	5	{}	无	fengli	50	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhfck00015u048idz8xt7f	怪穆尔	Boss	f	136	8100	0	Earth	1	0	204	5	204	5	25	204	5	15	0	1	2	{}	无	fengli	49	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhh45f0017u048xpsrfz4d	终极半魔像	Boss	f	139	10500	0	Normal	1	0	417	10	417	10	15	208	0	9	0	30	15	{}	无	fengli	48	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhlw78001bu0484mat8wmw	剑型曼特恩	Boss	f	143	11000	0	Wind	1	0	400	15	500	15	0	428	0	0	0	5	5	{}	无	fengli	47	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhnyrp001du0482l4o8sdg	香菇咪	Boss	f	145	7300	0	Water	1	0	261	5	290	5	0	434	11	0	0	20	25	{}	无	fengli	46	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhplet001fu048asp0pkgn	结晶泰坦	Boss	f	148	9300	0	Dark	1	0	592	25	448	25	0	111	0	9	0	30	25	{}	无	fengli	45	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhk34o0019u0488ip7hlko	奥恩拉夫	Boss	f	142	8700	0	Light	1	9500000	107	5	710	5	30	692	15	5	0	1	1	{}	无	fengli	44	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhx0r9001hu048vx81qiei	薇芮娜·柯尔连生体	Boss	f	150	30000	0	Fire	1	0	300	6	200	6	0	75	0	7	0	10	5	{}	无	fengli	43	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhzf33001ju048wrkhjt2r	柱状·柯尔连生体	Boss	f	145	9300	0	Dark	1	0	290	5	290	5	0	109	0	7	0	5	20	{}	无	fengli	42	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ka17y0001wv1fy5sj57bv	齐尔布兹	Boss	f	154	11100	0	Light	1	1600000	539	6	462	6	10	116	10	10	0	20	20	{}	无	fengli	41	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kgpjy0003wv1f2yl2xszc	马尔杜拉	Boss	f	157	8100	0	Light	1	0	157	6	393	6	10	470	15	1	0	5	5	{}	无	fengli	40	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kuovw0005wv1fex3b30tk	泽雷萨乌迦	Boss	f	160	15300	0	Light	1	0	320	6	320	6	25	240	10	10	0	10	20	{}	无	fengli	39	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kyheu0007wv1f5wpb3zv4	皮多大王	Boss	f	163	12000	0	Water	1	0	789	15	244	15	10	122	5	20	0	30	30	{}	无	fengli	38	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6nykby000dwv1f0psvbizc	魔蚀皮鲁兹	Boss	f	172	0	0	Fire	1	0	602	26	498	26	20	258	1	0	0	20	5	{}	无	fengli	35	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6th6cu000fwv1fje7s1gmj	结晶兽	Boss	f	175	20200	0	Dark	1	0	437	7	437	7	10	655	2	0	0	5	5	{}	无	fengli	34	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ttfvh000jwv1fczqjwzxb	扎菲洛加	Boss	f	181	20270	0	Dark	1	3800000	315	7	315	7	20	135	0	10	0	5	10	{}	无	fengli	31	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6usbws000vwv1f8l91l44n	皮斯泰乌鱼	Boss	f	193	11300	0	Water	1	0	386	7	482	7	0	433	8	0	0	10	15	{}	无	fengli	27	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v144a000zwv1frhv71fxi	王座柯尔连生体	Boss	f	190	0	0	Normal	1	0	665	7	475	7	25	285	0	6	0	5	20	{}	无	fengli	26	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y9m8z0027wv1fu3g36iei	萨波	Boss	f	256	22100	0	Water	1	0	896	10	640	10	30	576	10	5	0	5	10	{}	无	fengli	5	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ubaz1000pwv1fgzxpbjxd	魔人库维扎	Boss	f	185	40500	0	Dark	1	0	925	7	925	7	25	415	5	0	0	5	5	{}	无	fengli	2	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdaqt3000111x4pvyfke02	石柱魔像	Boss	f	70	3600	0	Earth	1	0	140	2	140	2	0	11	0	30	0	25	25	{}	掉落的盾牌挺好看的	fengli	79	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui643uc000h11mywjwinn7i	毛咕噜	Boss	f	43	620	0	Wind	1	0	0	1	0	1	0	64	12	0	0	100	5	{}	掉的帽子挺好看的	fengli	88	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wboec001lwv1ftpa30r93	威琉魔	Boss	f	223	20600	0	Normal	1	0	892	8	892	8	25	334	0	30	5	5	10	{}	按距离变色，紫色抗性增加	fengli	16	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vcla70015wv1f003qb6ks	塔利结晶兽	Boss	f	202	13420	0	Wind	1	0	606	8	606	8	20	303	10	1	0	5	25	{}	开局释放天火和风刃完毕前，暴击抗性为100	fengli	22	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5gbc3000911my2wys3fo7	森林巨狼	Boss	f	30	300	0	Wind	1	0	30	0	30	0	0	45	0	6	0	20	10	{}	巨大的狼	fengli	90	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xkuou001zwv1fvj8ksq3a	恶龙法奇诺	Boss	f	244	25870	0	Dark	1	6100000	488	9	854	9	40	367	0	5	0	1	1	{}	小怪存在时，限制伤害，无法被昏厥、翻覆	fengli	9	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdm1jk000411x4v1xuk3ay	翡翠鸟	Boss	f	79	8400	0	Wind	1	0	158	3	198	3	0	177	0	50	0	40	40	{}	受控后一段时间内闪躲率提升	fengli	76	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y2u4t0023wv1f6o35glva	乐龙雷多尔基	Boss	f	250	28900	0	Normal	1	7000000	500	10	875	10	35	375	0	0	0	3	5	{}	受到翻覆后会反击（即使翻覆由boss自身的技能施加）	fengli	7	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdg36i000211x4tyfrqovq	草龙耶弗	Boss	f	74	5040	0	Earth	1	0	146	2	219	2	0	87	0	30	0	100	100	{}	受到的单次伤害过高时会提高自身抗性，可以对其施加麻痹等异常接触	fengli	78	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv7thfi000764bckwgsirxk	地狱三头犬	Boss	f	97	9220	0	Dark	1	0	146	3	146	3	0	255	6	12	0	20	30	{}	受到控制后会改变自身属性	fengli	70	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6um51d000rwv1f4aqjbn5m	伏地蛇	Boss	f	187	24760	0	Dark	1	0	467	7	467	7	25	336	0	0	0	5	5	{}	受到单次伤害超过一定值以后会改变自身属性，提高暴击抗性并限制自身受到的伤害额度。60%血以上时变属为火属性；60%以下变为无属性。	fengli	29	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vgjhg0017wv1fkdtn4tb8	移儡原生质体	Boss	f	205	14460	0	Normal	1	0	922	8	307	8	100	307	0	25	0	1	1	{}	受到冰冻后，暴击抗性降低为零；生命值降低至75%以下时，属性变为风属性	fengli	21	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v9cog0013wv1f6vymc7ea	黑影	Boss	f	199	12500	0	Dark	1	0	398	7	597	7	10	298	4	4	0	10	10	{}	受到伤害累计超过一定值后属性变更为火属性。	fengli	23	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vuo5d001fwv1fg5wuac1z	卒龙灾比欧	Boss	f	214	16200	0	Normal	1	0	642	8	535	8	20	642	10	0	0	10	5	{}	单次伤害超过50万会召唤小怪。	fengli	18	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6l4vfl0009wv1f55hypfwe	暗龙费因斯坦	Boss	f	166	14000	0	Dark	1	0	246	6	249	6	0	25	1	1	0	1	10	{}	半血后获得高额暴击抗性，受到控制后可解除一段时间	fengli	36	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6l98a5000bwv1fn2zs6knp	修斯古巨兽	Boss	f	169	13300	0	Earth	1	0	422	6	263	6	0	253	4	0	0	5	20	{}	半血后增加对物理、魔法伤害的暴击抗性	fengli	37	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui55nha000111myotjx9ia0	科隆老大	Boss	f	10	30	0	Earth	1	1000	7	0	7	0	0	11	0	0	0	10	10	{}	劳大	fengli	87	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xtcs70021wv1fnuz01uwx	伽拉木瓦	Boss	f	247	26400	0	Wind	1	6260000	494	9	988	9	35	444	10	0	0	10	5	{}	仇恨目标距离太远时，会转移到地图右侧，并暂时无敌。	fengli	8	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6u8d9t000nwv1fjbmbyohh	佛拉布喇·远	Boss	f	184	19190	0	Normal	1	5150000	184	7	736	21	0	552	21	0	0	100	100	{}	仇恨值目标在7m外时的状态	fengli	30	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6u40id000lwv1fw2chusr7	佛拉布喇·近	Boss	f	184	19190	0	Normal	1	5150000	552	21	184	7	0	276	0	14	0	100	100	{}	仇恨值目标7m内时的状态	fengli	32	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7ar0n000z11my9mm10x0r	恶魔之门	Boss	f	60	1440	0	Dark	1	0	180	2	180	2	0	0	0	0	0	1	1	{}	不会动	fengli	89	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 4054 (class 0 OID 16971)
-- Dependencies: 251
-- Data for Name: npc; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.npc (id, name, "zoneId") FROM stdin;
\.


--
-- TOC entry 4055 (class 0 OID 16976)
-- Dependencies: 252
-- Data for Name: option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.option (name, "baseDef", modifiers, "colorA", "colorB", "colorC", "dataSources", details, "itemId") FROM stdin;
defaultOptEquipId	0	{"maxMp + 300","cspd + 400","mPie + 20%"}	0	0	0			defaultIteamOptEquipId
\.


--
-- TOC entry 4056 (class 0 OID 16981)
-- Dependencies: 253
-- Data for Name: player; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player (id, name, "useIn", actions, "accountId") FROM stdin;
defaultPlayerId	defaultPlayer	defaultCharacterId	{}	cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 4057 (class 0 OID 16986)
-- Dependencies: 254
-- Data for Name: player_armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_armor (id, name, def, ability, "templateId", refinement, modifiers, "masterId") FROM stdin;
defaultPlayerArmorId	defaultPlayerArmor	10	Light	defaultItemArmorId	0	{}	defaultPlayerId
\.


--
-- TOC entry 4058 (class 0 OID 16991)
-- Dependencies: 255
-- Data for Name: player_option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_option (id, name, "templateId", refinement, "masterId", "extraAbi") FROM stdin;
defaultPlayerOptEquipId	defaultPlayerOptEquip	defaultIteamOptEquipId	15	defaultPlayerId	0
\.


--
-- TOC entry 4059 (class 0 OID 16996)
-- Dependencies: 256
-- Data for Name: player_pet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_pet (id, "templateId", name, "pStr", "pInt", "pVit", "pAgi", "pDex", str, "int", vit, agi, dex, "weaponAtk", generation, "maxLv", "masterId", "personaType", type, "weaponType") FROM stdin;
\.


--
-- TOC entry 4060 (class 0 OID 17001)
-- Dependencies: 257
-- Data for Name: player_special; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_special (id, name, "templateId", "masterId", "extraAbi") FROM stdin;
defaultPlayerSpeEquipId	defaultPlayerSpeEquip	defaultItemSpeEquipId	defaultPlayerId	0
\.


--
-- TOC entry 4061 (class 0 OID 17006)
-- Dependencies: 258
-- Data for Name: player_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_weapon (id, name, "baseAbi", stability, "extraAbi", "templateId", refinement, modifiers, "masterId") FROM stdin;
defaultPlayerSubWeaponId	defaultPlayerSubWeapon	0	0	0	defaultItemSubWeaponId	0	{}	defaultPlayerId
defaultPlayerWeaponId	defaultPlayerWeapon	0	0	10	defaultItemWeaponId	15	{}	defaultPlayerId
\.


--
-- TOC entry 4062 (class 0 OID 17011)
-- Dependencies: 259
-- Data for Name: post; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post (id, name, "createdAt", "updatedAt", "createdById") FROM stdin;
\.


--
-- TOC entry 4063 (class 0 OID 17016)
-- Dependencies: 260
-- Data for Name: recipe; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe (id, "activityId", "itemId") FROM stdin;
\.


--
-- TOC entry 4064 (class 0 OID 17021)
-- Dependencies: 261
-- Data for Name: recipe_ingredient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe_ingredient (id, count, "itemId", "recipeId", type) FROM stdin;
\.


--
-- TOC entry 4065 (class 0 OID 17026)
-- Dependencies: 262
-- Data for Name: reward; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reward (id, type, value, probability, "itemId", "taskId") FROM stdin;
\.


--
-- TOC entry 4066 (class 0 OID 17031)
-- Dependencies: 263
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (id, "sessionToken", expires, "accountId") FROM stdin;
\.


--
-- TOC entry 4067 (class 0 OID 17036)
-- Dependencies: 264
-- Data for Name: simulator; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.simulator (id, name, details, "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
defaultSimulatorId	defaultSimulator	\N	defaultSimulatorStatisticId	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 4068 (class 0 OID 17041)
-- Dependencies: 265
-- Data for Name: skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill (id, "posX", "posY", tier, name, "isPassive", "chargingType", "distanceType", "targetType", details, "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId", "treeType") FROM stdin;
\.


--
-- TOC entry 4069 (class 0 OID 17046)
-- Dependencies: 266
-- Data for Name: skill_effect; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill_effect (id, condition, "elementLogic", "castingRange", "effectiveRange", "motionFixed", "motionModified", "chantingFixed", "chantingModified", "reservoirFixed", "reservoirModified", "startupFrames", cost, description, logic, details, "belongToskillId") FROM stdin;
\.


--
-- TOC entry 4070 (class 0 OID 17051)
-- Dependencies: 267
-- Data for Name: special; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.special (name, "baseDef", modifiers, "dataSources", details, "itemId") FROM stdin;
defaultSpeEquip	10	{"mPie + 10%","maxMp + 300"}			defaultItemSpeEquipId
\.


--
-- TOC entry 4071 (class 0 OID 17056)
-- Dependencies: 268
-- Data for Name: statistic; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statistic (id, "updatedAt", "createdAt", "usageTimestamps", "viewTimestamps") FROM stdin;
1	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
2	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
3	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
4	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
5	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
6	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
7	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
8	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
9	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
10	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
11	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
12	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
13	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
14	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
15	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
16	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
17	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
18	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
19	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
20	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
21	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
22	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
23	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
24	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
25	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
26	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
27	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
28	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
29	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
30	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
31	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
32	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
33	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
34	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
35	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
36	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
37	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
38	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
39	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
40	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
41	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
42	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
43	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
44	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
45	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
46	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
47	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
48	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
49	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
50	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
51	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
52	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
53	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
54	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
55	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
56	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
57	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
58	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
59	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
60	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
61	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
62	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
63	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
64	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
65	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
66	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
67	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
68	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
69	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
70	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
71	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
72	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
73	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
74	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
75	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
76	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
77	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
78	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
79	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
80	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
81	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
82	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
83	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
84	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
85	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
86	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
87	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
88	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
89	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
90	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
91	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
92	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
93	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
94	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
95	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
96	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
97	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
98	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
99	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
100	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
101	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
defaultSimulatorStatisticId	2025-03-18 10:39:08.466	1970-01-01 00:00:00	{}	{}
defaultItemSubWeaponStatisticId	2025-03-18 11:02:11.838	1970-01-01 00:00:00	{}	{}
defaultItemSpeEquipStatisticId	2025-03-18 11:02:33.705	1970-01-01 00:00:00	{}	{}
defaultCharacterStatisticId	2025-03-18 11:02:39.386	1970-01-01 00:00:00	{}	{}
defaultIteamOptEquiStatisticId	2025-03-18 11:03:40.348	1970-01-01 00:00:00	{}	{}
defaultItemOptEquipCrystalBStatisticId	2025-03-18 11:04:03.221	1970-01-01 00:00:00	{}	{}
defaultItemSpeEquipCrystalAStatisticId	2025-03-18 11:04:09.278	1970-01-01 00:00:00	{}	{}
defaultItemWeaponCrystalAStatisticId	2025-03-18 11:04:14.006	1970-01-01 00:00:00	{}	{}
defaultItemWeaponCrystalBStatisticId	2025-03-18 11:04:19.815	1970-01-01 00:00:00	{}	{}
defaultItemWeaponStatisticId	2025-03-18 11:04:25.832	1970-01-01 00:00:00	{}	{}
defaultItemSpeEquipCrystalBStatisticId	2025-03-18 11:04:31.985	1970-01-01 00:00:00	{}	{}
defaultItemArmorCrystalAStatisticId	2025-03-18 11:04:37.337	1970-01-01 00:00:00	{}	{}
defaultItemArmorCrystalBStatisticId	2025-03-18 11:04:42.423	1970-01-01 00:00:00	{}	{}
defaultSkillStatisticId	2025-03-18 11:04:47.904	1970-01-01 00:00:00	{}	{}
defaultMobStatisticId	2025-03-18 11:04:50.224	1970-01-01 00:00:00	{}	{}
defaultItemMaterialMetalStatisticId	2025-03-18 11:05:13.268	1970-01-01 00:00:00	{}	{}
defaultItemOptEquipCrystalAStatisticId	2025-03-18 11:06:16.186	1970-01-01 00:00:00	{}	{}
defaultIteamArmorStatisticId	2025-03-18 11:29:34.807	1970-01-01 00:00:00	{}	{}
defaultItemConsumableStatisticId	2025-03-18 11:29:44.14	1970-01-01 00:00:00	{}	{}
\.


--
-- TOC entry 4072 (class 0 OID 17061)
-- Dependencies: 269
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task (id, lv, name, type, description, "npcId") FROM stdin;
\.


--
-- TOC entry 4073 (class 0 OID 17066)
-- Dependencies: 270
-- Data for Name: task_collect_require; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_collect_require (id, count, "itemId", "taskId") FROM stdin;
\.


--
-- TOC entry 4074 (class 0 OID 17071)
-- Dependencies: 271
-- Data for Name: task_kill_requirement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_kill_requirement (id, "mobId", count, "taskId") FROM stdin;
\.


--
-- TOC entry 4075 (class 0 OID 17076)
-- Dependencies: 272
-- Data for Name: team; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team (id, name, gems) FROM stdin;
defaultTeamAId	defaultTeamA	{}
defaultTeamBId	defaultTeamB	{}
\.


--
-- TOC entry 4076 (class 0 OID 17081)
-- Dependencies: 273
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, email, "emailVerified", image, role) FROM stdin;
cluhz95c5000078elg5r46831	KiaClouth	clouthber@gmail.com	2024-04-28 03:57:29.629	\N	User
clwu10qok00056vladmyfmmrb	大尾巴猪	\N	\N	http://thirdqq.qlogo.cn/ek_qqapp/AQKK7RCI3eMNSh6ssAiaxqmX3ls8icMO7lQZog5gkyOLhzR42o6SyF6bMgBz1QECxRVOSoxodF/40	User
cluj6sptk0000e10ge9wetfz8	KiaClouth	591519722@qq.com	2024-04-11 07:47:29.523	\N	User
clujlndnd0000zkw9d9qfsmgz	KiaClouth	mayunlong16@foxmail.com	2024-04-07 10:46:23.639	\N	User
\.


--
-- TOC entry 4077 (class 0 OID 17086)
-- Dependencies: 274
-- Data for Name: weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weapon (name, "baseAbi", stability, modifiers, "colorA", "colorB", "colorC", "dataSources", details, "itemId", type, "elementType") FROM stdin;
defaultSubWeaponId	0	0	{"cspd + 250"}	0	0	0			defaultItemSubWeaponId	NinjutsuScroll	Normal
defaultWeaponId	462	70	{"element = light","stro.normal + 25%","pAtk + 6%","mAtk + 12%","cr + 60","anticipate + 60%","pRes + 30%","mRes + 30%","ailmentResistance + 15%","weaponRange - 3"}	0	0	0			defaultItemWeaponId	Bowgun	Normal
\.


--
-- TOC entry 4078 (class 0 OID 17091)
-- Dependencies: 275
-- Data for Name: world; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.world (id, name) FROM stdin;
\.


--
-- TOC entry 4079 (class 0 OID 17096)
-- Dependencies: 276
-- Data for Name: zone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zone (id, name, "linkZone", "rewardNodes", "activityId", "addressId") FROM stdin;
\.


--
-- TOC entry 3585 (class 2606 OID 17102)
-- Name: _BackRelation _BackRelation_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_BackRelation"
    ADD CONSTRAINT "_BackRelation_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3588 (class 2606 OID 17104)
-- Name: _FrontRelation _FrontRelation_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_FrontRelation"
    ADD CONSTRAINT "_FrontRelation_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3591 (class 2606 OID 17106)
-- Name: _armorTocrystal _armorTocrystal_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorTocrystal"
    ADD CONSTRAINT "_armorTocrystal_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3594 (class 2606 OID 17108)
-- Name: _avatarTocharacter _avatarTocharacter_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_avatarTocharacter"
    ADD CONSTRAINT "_avatarTocharacter_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3597 (class 2606 OID 17110)
-- Name: _campA _campA_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_campA"
    ADD CONSTRAINT "_campA_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3600 (class 2606 OID 17112)
-- Name: _campB _campB_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_campB"
    ADD CONSTRAINT "_campB_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3603 (class 2606 OID 17114)
-- Name: _characterToconsumable _characterToconsumable_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3606 (class 2606 OID 17116)
-- Name: _crystalTooption _crystalTooption_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTooption"
    ADD CONSTRAINT "_crystalTooption_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3609 (class 2606 OID 17118)
-- Name: _crystalToplayer_armor _crystalToplayer_armor_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_armor"
    ADD CONSTRAINT "_crystalToplayer_armor_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3612 (class 2606 OID 17120)
-- Name: _crystalToplayer_option _crystalToplayer_option_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_option"
    ADD CONSTRAINT "_crystalToplayer_option_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3615 (class 2606 OID 17122)
-- Name: _crystalToplayer_special _crystalToplayer_special_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_special"
    ADD CONSTRAINT "_crystalToplayer_special_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3618 (class 2606 OID 17124)
-- Name: _crystalToplayer_weapon _crystalToplayer_weapon_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_weapon"
    ADD CONSTRAINT "_crystalToplayer_weapon_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3621 (class 2606 OID 17126)
-- Name: _crystalTospecial _crystalTospecial_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial"
    ADD CONSTRAINT "_crystalTospecial_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3624 (class 2606 OID 17128)
-- Name: _crystalToweapon _crystalToweapon_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToweapon"
    ADD CONSTRAINT "_crystalToweapon_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3627 (class 2606 OID 17130)
-- Name: _mobTozone _mobTozone_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_mobTozone"
    ADD CONSTRAINT "_mobTozone_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3630 (class 2606 OID 17132)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3635 (class 2606 OID 17134)
-- Name: account_create_data account_create_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_create_data
    ADD CONSTRAINT account_create_data_pkey PRIMARY KEY ("accountId");


--
-- TOC entry 3632 (class 2606 OID 17136)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- TOC entry 3637 (class 2606 OID 17138)
-- Name: account_update_data account_update_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_update_data
    ADD CONSTRAINT account_update_data_pkey PRIMARY KEY ("accountId");


--
-- TOC entry 3639 (class 2606 OID 17140)
-- Name: activity activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- TOC entry 3641 (class 2606 OID 17142)
-- Name: address address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_pkey PRIMARY KEY (id);


--
-- TOC entry 3643 (class 2606 OID 17144)
-- Name: armor armor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor
    ADD CONSTRAINT armor_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3645 (class 2606 OID 17146)
-- Name: avatar avatar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar
    ADD CONSTRAINT avatar_pkey PRIMARY KEY (id);


--
-- TOC entry 3647 (class 2606 OID 17148)
-- Name: character character_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT character_pkey PRIMARY KEY (id);


--
-- TOC entry 3650 (class 2606 OID 17150)
-- Name: character_skill character_skill_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.character_skill
    ADD CONSTRAINT character_skill_pkey PRIMARY KEY (id);


--
-- TOC entry 3652 (class 2606 OID 17152)
-- Name: combo combo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT combo_pkey PRIMARY KEY (id);


--
-- TOC entry 3654 (class 2606 OID 17154)
-- Name: combo_step combo_step_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo_step
    ADD CONSTRAINT combo_step_pkey PRIMARY KEY (id);


--
-- TOC entry 3656 (class 2606 OID 17156)
-- Name: consumable consumable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT consumable_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3658 (class 2606 OID 17158)
-- Name: crystal crystal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT crystal_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3660 (class 2606 OID 17160)
-- Name: drop_item drop_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drop_item
    ADD CONSTRAINT drop_item_pkey PRIMARY KEY (id);


--
-- TOC entry 3662 (class 2606 OID 17162)
-- Name: image image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_pkey PRIMARY KEY (id);


--
-- TOC entry 3664 (class 2606 OID 17164)
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- TOC entry 3667 (class 2606 OID 17166)
-- Name: material material_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3669 (class 2606 OID 17168)
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- TOC entry 3671 (class 2606 OID 17170)
-- Name: mercenary mercenary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mercenary
    ADD CONSTRAINT mercenary_pkey PRIMARY KEY ("templateId");


--
-- TOC entry 3673 (class 2606 OID 17172)
-- Name: mob mob_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT mob_pkey PRIMARY KEY (id);


--
-- TOC entry 3676 (class 2606 OID 17174)
-- Name: npc npc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.npc
    ADD CONSTRAINT npc_pkey PRIMARY KEY (id);


--
-- TOC entry 3678 (class 2606 OID 17176)
-- Name: option option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.option
    ADD CONSTRAINT option_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3682 (class 2606 OID 17178)
-- Name: player_armor player_armor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_armor
    ADD CONSTRAINT player_armor_pkey PRIMARY KEY (id);


--
-- TOC entry 3684 (class 2606 OID 17180)
-- Name: player_option player_option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_option
    ADD CONSTRAINT player_option_pkey PRIMARY KEY (id);


--
-- TOC entry 3686 (class 2606 OID 17182)
-- Name: player_pet player_pet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_pet
    ADD CONSTRAINT player_pet_pkey PRIMARY KEY (id);


--
-- TOC entry 3680 (class 2606 OID 17184)
-- Name: player player_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT player_pkey PRIMARY KEY (id);


--
-- TOC entry 3688 (class 2606 OID 17186)
-- Name: player_special player_special_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_special
    ADD CONSTRAINT player_special_pkey PRIMARY KEY (id);


--
-- TOC entry 3690 (class 2606 OID 17188)
-- Name: player_weapon player_weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_weapon
    ADD CONSTRAINT player_weapon_pkey PRIMARY KEY (id);


--
-- TOC entry 3693 (class 2606 OID 17190)
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- TOC entry 3698 (class 2606 OID 17192)
-- Name: recipe_ingredient recipe_ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT recipe_ingredient_pkey PRIMARY KEY (id);


--
-- TOC entry 3696 (class 2606 OID 17194)
-- Name: recipe recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_pkey PRIMARY KEY (id);


--
-- TOC entry 3700 (class 2606 OID 17196)
-- Name: reward reward_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward
    ADD CONSTRAINT reward_pkey PRIMARY KEY (id);


--
-- TOC entry 3702 (class 2606 OID 17198)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- TOC entry 3705 (class 2606 OID 17200)
-- Name: simulator simulator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT simulator_pkey PRIMARY KEY (id);


--
-- TOC entry 3711 (class 2606 OID 17202)
-- Name: skill_effect skill_effect_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_effect
    ADD CONSTRAINT skill_effect_pkey PRIMARY KEY (id);


--
-- TOC entry 3708 (class 2606 OID 17204)
-- Name: skill skill_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT skill_pkey PRIMARY KEY (id);


--
-- TOC entry 3713 (class 2606 OID 17206)
-- Name: special special_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special
    ADD CONSTRAINT special_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3715 (class 2606 OID 17208)
-- Name: statistic statistic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistic
    ADD CONSTRAINT statistic_pkey PRIMARY KEY (id);


--
-- TOC entry 3719 (class 2606 OID 17210)
-- Name: task_collect_require task_collect_require_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_collect_require
    ADD CONSTRAINT task_collect_require_pkey PRIMARY KEY (id);


--
-- TOC entry 3721 (class 2606 OID 17212)
-- Name: task_kill_requirement task_kill_requirement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_kill_requirement
    ADD CONSTRAINT task_kill_requirement_pkey PRIMARY KEY (id);


--
-- TOC entry 3717 (class 2606 OID 17214)
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- TOC entry 3723 (class 2606 OID 17216)
-- Name: team team_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY (id);


--
-- TOC entry 3726 (class 2606 OID 17218)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 3728 (class 2606 OID 17220)
-- Name: weapon weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon
    ADD CONSTRAINT weapon_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3730 (class 2606 OID 17222)
-- Name: world world_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.world
    ADD CONSTRAINT world_pkey PRIMARY KEY (id);


--
-- TOC entry 3732 (class 2606 OID 17224)
-- Name: zone zone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT zone_pkey PRIMARY KEY (id);


--
-- TOC entry 3586 (class 1259 OID 17225)
-- Name: _BackRelation_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_BackRelation_B_index" ON public."_BackRelation" USING btree ("B");


--
-- TOC entry 3589 (class 1259 OID 17226)
-- Name: _FrontRelation_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_FrontRelation_B_index" ON public."_FrontRelation" USING btree ("B");


--
-- TOC entry 3592 (class 1259 OID 17227)
-- Name: _armorTocrystal_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_armorTocrystal_B_index" ON public."_armorTocrystal" USING btree ("B");


--
-- TOC entry 3595 (class 1259 OID 17228)
-- Name: _avatarTocharacter_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_avatarTocharacter_B_index" ON public."_avatarTocharacter" USING btree ("B");


--
-- TOC entry 3598 (class 1259 OID 17229)
-- Name: _campA_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_campA_B_index" ON public."_campA" USING btree ("B");


--
-- TOC entry 3601 (class 1259 OID 17230)
-- Name: _campB_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_campB_B_index" ON public."_campB" USING btree ("B");


--
-- TOC entry 3604 (class 1259 OID 17231)
-- Name: _characterToconsumable_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterToconsumable_B_index" ON public."_characterToconsumable" USING btree ("B");


--
-- TOC entry 3607 (class 1259 OID 17232)
-- Name: _crystalTooption_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTooption_B_index" ON public."_crystalTooption" USING btree ("B");


--
-- TOC entry 3610 (class 1259 OID 17233)
-- Name: _crystalToplayer_armor_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalToplayer_armor_B_index" ON public."_crystalToplayer_armor" USING btree ("B");


--
-- TOC entry 3613 (class 1259 OID 17234)
-- Name: _crystalToplayer_option_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalToplayer_option_B_index" ON public."_crystalToplayer_option" USING btree ("B");


--
-- TOC entry 3616 (class 1259 OID 17235)
-- Name: _crystalToplayer_special_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalToplayer_special_B_index" ON public."_crystalToplayer_special" USING btree ("B");


--
-- TOC entry 3619 (class 1259 OID 17236)
-- Name: _crystalToplayer_weapon_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalToplayer_weapon_B_index" ON public."_crystalToplayer_weapon" USING btree ("B");


--
-- TOC entry 3622 (class 1259 OID 17237)
-- Name: _crystalTospecial_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTospecial_B_index" ON public."_crystalTospecial" USING btree ("B");


--
-- TOC entry 3625 (class 1259 OID 17238)
-- Name: _crystalToweapon_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalToweapon_B_index" ON public."_crystalToweapon" USING btree ("B");


--
-- TOC entry 3628 (class 1259 OID 17239)
-- Name: _mobTozone_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_mobTozone_B_index" ON public."_mobTozone" USING btree ("B");


--
-- TOC entry 3633 (class 1259 OID 17240)
-- Name: account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON public.account USING btree (provider, "providerAccountId");


--
-- TOC entry 3648 (class 1259 OID 17241)
-- Name: character_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_statisticId_key" ON public."character" USING btree ("statisticId");


--
-- TOC entry 3665 (class 1259 OID 17242)
-- Name: item_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "item_statisticId_key" ON public.item USING btree ("statisticId");


--
-- TOC entry 3674 (class 1259 OID 17243)
-- Name: mob_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "mob_statisticId_key" ON public.mob USING btree ("statisticId");


--
-- TOC entry 3691 (class 1259 OID 17244)
-- Name: post_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX post_name_idx ON public.post USING btree (name);


--
-- TOC entry 3694 (class 1259 OID 17245)
-- Name: recipe_itemId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "recipe_itemId_key" ON public.recipe USING btree ("itemId");


--
-- TOC entry 3703 (class 1259 OID 17246)
-- Name: session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "session_sessionToken_key" ON public.session USING btree ("sessionToken");


--
-- TOC entry 3706 (class 1259 OID 17247)
-- Name: simulator_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "simulator_statisticId_key" ON public.simulator USING btree ("statisticId");


--
-- TOC entry 3709 (class 1259 OID 17248)
-- Name: skill_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "skill_statisticId_key" ON public.skill USING btree ("statisticId");


--
-- TOC entry 3724 (class 1259 OID 17249)
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- TOC entry 3733 (class 2606 OID 17250)
-- Name: _BackRelation _BackRelation_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_BackRelation"
    ADD CONSTRAINT "_BackRelation_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3734 (class 2606 OID 17255)
-- Name: _BackRelation _BackRelation_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_BackRelation"
    ADD CONSTRAINT "_BackRelation_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3735 (class 2606 OID 17260)
-- Name: _FrontRelation _FrontRelation_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_FrontRelation"
    ADD CONSTRAINT "_FrontRelation_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3736 (class 2606 OID 17265)
-- Name: _FrontRelation _FrontRelation_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_FrontRelation"
    ADD CONSTRAINT "_FrontRelation_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3737 (class 2606 OID 17270)
-- Name: _armorTocrystal _armorTocrystal_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorTocrystal"
    ADD CONSTRAINT "_armorTocrystal_A_fkey" FOREIGN KEY ("A") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3738 (class 2606 OID 17275)
-- Name: _armorTocrystal _armorTocrystal_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorTocrystal"
    ADD CONSTRAINT "_armorTocrystal_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3739 (class 2606 OID 17280)
-- Name: _avatarTocharacter _avatarTocharacter_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_avatarTocharacter"
    ADD CONSTRAINT "_avatarTocharacter_A_fkey" FOREIGN KEY ("A") REFERENCES public.avatar(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3740 (class 2606 OID 17285)
-- Name: _avatarTocharacter _avatarTocharacter_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_avatarTocharacter"
    ADD CONSTRAINT "_avatarTocharacter_B_fkey" FOREIGN KEY ("B") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3741 (class 2606 OID 17290)
-- Name: _campA _campA_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_campA"
    ADD CONSTRAINT "_campA_A_fkey" FOREIGN KEY ("A") REFERENCES public.simulator(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3742 (class 2606 OID 17295)
-- Name: _campA _campA_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_campA"
    ADD CONSTRAINT "_campA_B_fkey" FOREIGN KEY ("B") REFERENCES public.team(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3743 (class 2606 OID 17300)
-- Name: _campB _campB_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_campB"
    ADD CONSTRAINT "_campB_A_fkey" FOREIGN KEY ("A") REFERENCES public.simulator(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3744 (class 2606 OID 17305)
-- Name: _campB _campB_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_campB"
    ADD CONSTRAINT "_campB_B_fkey" FOREIGN KEY ("B") REFERENCES public.team(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3745 (class 2606 OID 17310)
-- Name: _characterToconsumable _characterToconsumable_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3746 (class 2606 OID 17315)
-- Name: _characterToconsumable _characterToconsumable_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_B_fkey" FOREIGN KEY ("B") REFERENCES public.consumable("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3747 (class 2606 OID 17320)
-- Name: _crystalTooption _crystalTooption_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTooption"
    ADD CONSTRAINT "_crystalTooption_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3748 (class 2606 OID 17325)
-- Name: _crystalTooption _crystalTooption_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTooption"
    ADD CONSTRAINT "_crystalTooption_B_fkey" FOREIGN KEY ("B") REFERENCES public.option("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3749 (class 2606 OID 17330)
-- Name: _crystalToplayer_armor _crystalToplayer_armor_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_armor"
    ADD CONSTRAINT "_crystalToplayer_armor_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3750 (class 2606 OID 17335)
-- Name: _crystalToplayer_armor _crystalToplayer_armor_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_armor"
    ADD CONSTRAINT "_crystalToplayer_armor_B_fkey" FOREIGN KEY ("B") REFERENCES public.player_armor(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3751 (class 2606 OID 17340)
-- Name: _crystalToplayer_option _crystalToplayer_option_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_option"
    ADD CONSTRAINT "_crystalToplayer_option_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3752 (class 2606 OID 17345)
-- Name: _crystalToplayer_option _crystalToplayer_option_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_option"
    ADD CONSTRAINT "_crystalToplayer_option_B_fkey" FOREIGN KEY ("B") REFERENCES public.player_option(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3753 (class 2606 OID 17350)
-- Name: _crystalToplayer_special _crystalToplayer_special_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_special"
    ADD CONSTRAINT "_crystalToplayer_special_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3754 (class 2606 OID 17355)
-- Name: _crystalToplayer_special _crystalToplayer_special_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_special"
    ADD CONSTRAINT "_crystalToplayer_special_B_fkey" FOREIGN KEY ("B") REFERENCES public.player_special(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3755 (class 2606 OID 17360)
-- Name: _crystalToplayer_weapon _crystalToplayer_weapon_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_weapon"
    ADD CONSTRAINT "_crystalToplayer_weapon_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3756 (class 2606 OID 17365)
-- Name: _crystalToplayer_weapon _crystalToplayer_weapon_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToplayer_weapon"
    ADD CONSTRAINT "_crystalToplayer_weapon_B_fkey" FOREIGN KEY ("B") REFERENCES public.player_weapon(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3757 (class 2606 OID 17370)
-- Name: _crystalTospecial _crystalTospecial_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial"
    ADD CONSTRAINT "_crystalTospecial_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3758 (class 2606 OID 17375)
-- Name: _crystalTospecial _crystalTospecial_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial"
    ADD CONSTRAINT "_crystalTospecial_B_fkey" FOREIGN KEY ("B") REFERENCES public.special("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3759 (class 2606 OID 17380)
-- Name: _crystalToweapon _crystalToweapon_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToweapon"
    ADD CONSTRAINT "_crystalToweapon_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3760 (class 2606 OID 17385)
-- Name: _crystalToweapon _crystalToweapon_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToweapon"
    ADD CONSTRAINT "_crystalToweapon_B_fkey" FOREIGN KEY ("B") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3761 (class 2606 OID 17390)
-- Name: _mobTozone _mobTozone_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_mobTozone"
    ADD CONSTRAINT "_mobTozone_A_fkey" FOREIGN KEY ("A") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3762 (class 2606 OID 17395)
-- Name: _mobTozone _mobTozone_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_mobTozone"
    ADD CONSTRAINT "_mobTozone_B_fkey" FOREIGN KEY ("B") REFERENCES public.zone(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3764 (class 2606 OID 17400)
-- Name: account_create_data account_create_data_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_create_data
    ADD CONSTRAINT "account_create_data_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3765 (class 2606 OID 17405)
-- Name: account_update_data account_update_data_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_update_data
    ADD CONSTRAINT "account_update_data_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3763 (class 2606 OID 17410)
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3766 (class 2606 OID 17415)
-- Name: address address_worldId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "address_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES public.world(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3767 (class 2606 OID 17420)
-- Name: armor armor_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor
    ADD CONSTRAINT "armor_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3768 (class 2606 OID 17425)
-- Name: avatar avatar_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar
    ADD CONSTRAINT "avatar_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3769 (class 2606 OID 17430)
-- Name: character character_armorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_armorId_fkey" FOREIGN KEY ("armorId") REFERENCES public.player_armor(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3770 (class 2606 OID 17435)
-- Name: character character_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3771 (class 2606 OID 17440)
-- Name: character character_optEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_optEquipId_fkey" FOREIGN KEY ("optEquipId") REFERENCES public.player_option(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3776 (class 2606 OID 17445)
-- Name: character_skill character_skill_characterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.character_skill
    ADD CONSTRAINT "character_skill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3777 (class 2606 OID 17450)
-- Name: character_skill character_skill_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.character_skill
    ADD CONSTRAINT "character_skill_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3772 (class 2606 OID 17455)
-- Name: character character_speEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_speEquipId_fkey" FOREIGN KEY ("speEquipId") REFERENCES public.player_special(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3773 (class 2606 OID 17460)
-- Name: character character_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3774 (class 2606 OID 17465)
-- Name: character character_subWeaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_subWeaponId_fkey" FOREIGN KEY ("subWeaponId") REFERENCES public.player_weapon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3775 (class 2606 OID 17470)
-- Name: character character_weaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES public.player_weapon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3778 (class 2606 OID 17475)
-- Name: combo combo_characterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT "combo_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3779 (class 2606 OID 17480)
-- Name: combo_step combo_step_characterSkillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo_step
    ADD CONSTRAINT "combo_step_characterSkillId_fkey" FOREIGN KEY ("characterSkillId") REFERENCES public.character_skill(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3780 (class 2606 OID 17485)
-- Name: combo_step combo_step_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo_step
    ADD CONSTRAINT "combo_step_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public.combo(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3781 (class 2606 OID 17490)
-- Name: consumable consumable_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT "consumable_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3782 (class 2606 OID 17495)
-- Name: crystal crystal_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT "crystal_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3783 (class 2606 OID 17500)
-- Name: drop_item drop_item_dropById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drop_item
    ADD CONSTRAINT "drop_item_dropById_fkey" FOREIGN KEY ("dropById") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3784 (class 2606 OID 17505)
-- Name: drop_item drop_item_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drop_item
    ADD CONSTRAINT "drop_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3785 (class 2606 OID 17510)
-- Name: image image_armorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_armorId_fkey" FOREIGN KEY ("armorId") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3786 (class 2606 OID 17515)
-- Name: image image_mobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3787 (class 2606 OID 17520)
-- Name: image image_npcId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES public.npc(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3788 (class 2606 OID 17525)
-- Name: image image_optEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_optEquipId_fkey" FOREIGN KEY ("optEquipId") REFERENCES public.option("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3789 (class 2606 OID 17530)
-- Name: image image_weaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3790 (class 2606 OID 17535)
-- Name: item item_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3791 (class 2606 OID 17540)
-- Name: item item_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3792 (class 2606 OID 17545)
-- Name: item item_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3793 (class 2606 OID 17550)
-- Name: material material_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT "material_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3794 (class 2606 OID 17555)
-- Name: member member_mercenaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_mercenaryId_fkey" FOREIGN KEY ("mercenaryId") REFERENCES public.mercenary("templateId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3795 (class 2606 OID 17560)
-- Name: member member_mobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3796 (class 2606 OID 17565)
-- Name: member member_partnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES public.mercenary("templateId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3797 (class 2606 OID 17570)
-- Name: member member_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3798 (class 2606 OID 17575)
-- Name: member member_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.team(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3799 (class 2606 OID 17580)
-- Name: mercenary mercenary_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mercenary
    ADD CONSTRAINT "mercenary_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3800 (class 2606 OID 17585)
-- Name: mob mob_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3801 (class 2606 OID 17590)
-- Name: mob mob_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3802 (class 2606 OID 17595)
-- Name: mob mob_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3803 (class 2606 OID 17600)
-- Name: npc npc_zoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.npc
    ADD CONSTRAINT "npc_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public.zone(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3804 (class 2606 OID 17605)
-- Name: option option_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.option
    ADD CONSTRAINT "option_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3805 (class 2606 OID 17610)
-- Name: player player_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT "player_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3806 (class 2606 OID 17615)
-- Name: player_armor player_armor_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_armor
    ADD CONSTRAINT "player_armor_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3807 (class 2606 OID 17620)
-- Name: player_armor player_armor_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_armor
    ADD CONSTRAINT "player_armor_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3808 (class 2606 OID 17625)
-- Name: player_option player_option_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_option
    ADD CONSTRAINT "player_option_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3809 (class 2606 OID 17630)
-- Name: player_option player_option_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_option
    ADD CONSTRAINT "player_option_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.option("itemId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3810 (class 2606 OID 17635)
-- Name: player_pet player_pet_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_pet
    ADD CONSTRAINT "player_pet_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3811 (class 2606 OID 17640)
-- Name: player_pet player_pet_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_pet
    ADD CONSTRAINT "player_pet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3812 (class 2606 OID 17645)
-- Name: player_special player_special_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_special
    ADD CONSTRAINT "player_special_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3813 (class 2606 OID 17650)
-- Name: player_special player_special_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_special
    ADD CONSTRAINT "player_special_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.special("itemId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3814 (class 2606 OID 17655)
-- Name: player_weapon player_weapon_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_weapon
    ADD CONSTRAINT "player_weapon_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3815 (class 2606 OID 17660)
-- Name: player_weapon player_weapon_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_weapon
    ADD CONSTRAINT "player_weapon_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3816 (class 2606 OID 17665)
-- Name: post post_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT "post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3817 (class 2606 OID 17670)
-- Name: recipe recipe_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.activity(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3819 (class 2606 OID 17675)
-- Name: recipe_ingredient recipe_ingredient_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "recipe_ingredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3820 (class 2606 OID 17680)
-- Name: recipe_ingredient recipe_ingredient_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "recipe_ingredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.recipe(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3818 (class 2606 OID 17685)
-- Name: recipe recipe_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3821 (class 2606 OID 17690)
-- Name: reward reward_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward
    ADD CONSTRAINT "reward_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3822 (class 2606 OID 17695)
-- Name: reward reward_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward
    ADD CONSTRAINT "reward_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3823 (class 2606 OID 17700)
-- Name: session session_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3824 (class 2606 OID 17705)
-- Name: simulator simulator_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT "simulator_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3825 (class 2606 OID 17710)
-- Name: simulator simulator_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT "simulator_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3826 (class 2606 OID 17715)
-- Name: simulator simulator_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT "simulator_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3827 (class 2606 OID 17720)
-- Name: skill skill_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3830 (class 2606 OID 17725)
-- Name: skill_effect skill_effect_belongToskillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_effect
    ADD CONSTRAINT "skill_effect_belongToskillId_fkey" FOREIGN KEY ("belongToskillId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3828 (class 2606 OID 17730)
-- Name: skill skill_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3829 (class 2606 OID 17735)
-- Name: skill skill_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3831 (class 2606 OID 17740)
-- Name: special special_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special
    ADD CONSTRAINT "special_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3833 (class 2606 OID 17745)
-- Name: task_collect_require task_collect_require_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_collect_require
    ADD CONSTRAINT "task_collect_require_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3834 (class 2606 OID 17750)
-- Name: task_collect_require task_collect_require_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_collect_require
    ADD CONSTRAINT "task_collect_require_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3835 (class 2606 OID 17755)
-- Name: task_kill_requirement task_kill_requirement_mobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_kill_requirement
    ADD CONSTRAINT "task_kill_requirement_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3836 (class 2606 OID 17760)
-- Name: task_kill_requirement task_kill_requirement_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_kill_requirement
    ADD CONSTRAINT "task_kill_requirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3832 (class 2606 OID 17765)
-- Name: task task_npcId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT "task_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES public.npc(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3837 (class 2606 OID 17770)
-- Name: weapon weapon_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon
    ADD CONSTRAINT "weapon_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3838 (class 2606 OID 17775)
-- Name: zone zone_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT "zone_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.activity(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3839 (class 2606 OID 17780)
-- Name: zone zone_addressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT "zone_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES public.address(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3983 (class 6104 OID 16384)
-- Name: electric_publication_default; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION electric_publication_default WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION electric_publication_default OWNER TO postgres;

--
-- TOC entry 4008 (class 6106 OID 17816)
-- Name: electric_publication_default _crystalToplayer_armor; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."_crystalToplayer_armor";


--
-- TOC entry 4009 (class 6106 OID 17817)
-- Name: electric_publication_default _crystalToplayer_option; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."_crystalToplayer_option";


--
-- TOC entry 4010 (class 6106 OID 17818)
-- Name: electric_publication_default _crystalToplayer_special; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."_crystalToplayer_special";


--
-- TOC entry 4006 (class 6106 OID 17814)
-- Name: electric_publication_default _crystalToplayer_weapon; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."_crystalToplayer_weapon";


--
-- TOC entry 3985 (class 6106 OID 17792)
-- Name: electric_publication_default account; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.account;


--
-- TOC entry 3984 (class 6106 OID 17791)
-- Name: electric_publication_default account_create_data; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.account_create_data;


--
-- TOC entry 3986 (class 6106 OID 17793)
-- Name: electric_publication_default account_update_data; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.account_update_data;


--
-- TOC entry 3992 (class 6106 OID 17799)
-- Name: electric_publication_default armor; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.armor;


--
-- TOC entry 3993 (class 6106 OID 17800)
-- Name: electric_publication_default avatar; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.avatar;


--
-- TOC entry 4017 (class 6106 OID 17869)
-- Name: electric_publication_default character; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."character";


--
-- TOC entry 4014 (class 6106 OID 17822)
-- Name: electric_publication_default character_skill; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.character_skill;


--
-- TOC entry 4012 (class 6106 OID 17820)
-- Name: electric_publication_default combo; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.combo;


--
-- TOC entry 4015 (class 6106 OID 17823)
-- Name: electric_publication_default consumable; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.consumable;


--
-- TOC entry 3996 (class 6106 OID 17803)
-- Name: electric_publication_default crystal; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.crystal;


--
-- TOC entry 4007 (class 6106 OID 17815)
-- Name: electric_publication_default image; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.image;


--
-- TOC entry 3990 (class 6106 OID 17797)
-- Name: electric_publication_default item; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.item;


--
-- TOC entry 4002 (class 6106 OID 17809)
-- Name: electric_publication_default member; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.member;


--
-- TOC entry 4016 (class 6106 OID 17824)
-- Name: electric_publication_default mercenary; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.mercenary;


--
-- TOC entry 3988 (class 6106 OID 17795)
-- Name: electric_publication_default mob; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.mob;


--
-- TOC entry 3994 (class 6106 OID 17801)
-- Name: electric_publication_default option; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.option;


--
-- TOC entry 3987 (class 6106 OID 17794)
-- Name: electric_publication_default player; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.player;


--
-- TOC entry 3998 (class 6106 OID 17805)
-- Name: electric_publication_default player_armor; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.player_armor;


--
-- TOC entry 3999 (class 6106 OID 17806)
-- Name: electric_publication_default player_option; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.player_option;


--
-- TOC entry 4000 (class 6106 OID 17807)
-- Name: electric_publication_default player_pet; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.player_pet;


--
-- TOC entry 4001 (class 6106 OID 17808)
-- Name: electric_publication_default player_special; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.player_special;


--
-- TOC entry 3997 (class 6106 OID 17804)
-- Name: electric_publication_default player_weapon; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.player_weapon;


--
-- TOC entry 4004 (class 6106 OID 17812)
-- Name: electric_publication_default simulator; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.simulator;


--
-- TOC entry 4011 (class 6106 OID 17819)
-- Name: electric_publication_default skill; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.skill;


--
-- TOC entry 4013 (class 6106 OID 17821)
-- Name: electric_publication_default skill_effect; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.skill_effect;


--
-- TOC entry 3995 (class 6106 OID 17802)
-- Name: electric_publication_default special; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.special;


--
-- TOC entry 3989 (class 6106 OID 17796)
-- Name: electric_publication_default statistic; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.statistic;


--
-- TOC entry 4003 (class 6106 OID 17810)
-- Name: electric_publication_default team; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.team;


--
-- TOC entry 4005 (class 6106 OID 17813)
-- Name: electric_publication_default user; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."user";


--
-- TOC entry 3991 (class 6106 OID 17798)
-- Name: electric_publication_default weapon; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.weapon;


-- Completed on 2025-03-19 18:11:37

--
-- PostgreSQL database dump complete
--

