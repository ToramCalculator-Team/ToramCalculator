--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2024-11-01 11:58:26

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
-- TOC entry 884 (class 1247 OID 16390)
-- Name: BodyArmorType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BodyArmorType" AS ENUM (
    'NORMAL',
    'LIGHT',
    'HEAVY'
);


ALTER TYPE public."BodyArmorType" OWNER TO postgres;

--
-- TOC entry 887 (class 1247 OID 16398)
-- Name: CharacterType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CharacterType" AS ENUM (
    'Tank',
    'Mage',
    'Ranger',
    'Marksman'
);


ALTER TYPE public."CharacterType" OWNER TO postgres;

--
-- TOC entry 890 (class 1247 OID 16408)
-- Name: ComboType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ComboType" AS ENUM (
    'NULL'
);


ALTER TYPE public."ComboType" OWNER TO postgres;

--
-- TOC entry 893 (class 1247 OID 16412)
-- Name: CrystalType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CrystalType" AS ENUM (
    'GENERAL',
    'WEAPONCRYSTAL',
    'BODYCRYSTAL',
    'ADDITIONALCRYSTAL',
    'SPECIALCRYSTAL'
);


ALTER TYPE public."CrystalType" OWNER TO postgres;

--
-- TOC entry 896 (class 1247 OID 16424)
-- Name: DurationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DurationType" AS ENUM (
    'FRAME',
    'SKILL',
    'UNLIMITED'
);


ALTER TYPE public."DurationType" OWNER TO postgres;

--
-- TOC entry 899 (class 1247 OID 16432)
-- Name: Element; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Element" AS ENUM (
    'NO_ELEMENT',
    'LIGHT',
    'DARK',
    'WATER',
    'FIRE',
    'EARTH',
    'WIND'
);


ALTER TYPE public."Element" OWNER TO postgres;

--
-- TOC entry 902 (class 1247 OID 16448)
-- Name: MainWeaponType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MainWeaponType" AS ENUM (
    'NO_WEAPON',
    'ONE_HAND_SWORD',
    'TWO_HANDS_SWORD',
    'BOW',
    'BOWGUN',
    'STAFF',
    'MAGIC_DEVICE',
    'KNUCKLE',
    'HALBERD',
    'KATANA'
);


ALTER TYPE public."MainWeaponType" OWNER TO postgres;

--
-- TOC entry 905 (class 1247 OID 16470)
-- Name: ModifiersName; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ModifiersName" AS ENUM (
    'STR',
    'INT',
    'VIT',
    'AGI',
    'DEX',
    'MAX_MP',
    'AGGRO',
    'WEAPON_RANGE',
    'HP_REGEN',
    'MP_REGEN',
    'PHYSICAL_ATK',
    'MAGICAL_ATK',
    'WEAPON_ATK',
    'UNSHEATHE_ATK',
    'PHYSICAL_PIERCE',
    'MAGICAL_PIERCE',
    'CRITICAL_RATE',
    'CRITICAL_DAMAGE',
    'MAGIC_CRT_CONVERSION_RATE',
    'MAGIC_CRT_DAMAGE_CONVERSION_RATE',
    'SHORT_RANGE_DAMAGE',
    'LONG_RANGE_DAMAGE',
    'STRONGER_AGAINST_NETURAL',
    'STRONGER_AGAINST_LIGHT',
    'STRONGER_AGAINST_DARK',
    'STRONGER_AGAINST_WATER',
    'STRONGER_AGAINST_FIRE',
    'STRONGER_AGAINST_EARTH',
    'STRONGER_AGAINST_WIND',
    'STABILITY',
    'ACCURACY',
    'ADDITIONAL_PHYSICS',
    'ADDITIONAL_MAGIC',
    'ANTICIPATE',
    'GUARD_BREAK',
    'REFLECT',
    'ABSOLUTA_ACCURACY',
    'ATK_UP_STR',
    'ATK_UP_INT',
    'ATK_UP_VIT',
    'ATK_UP_AGI',
    'ATK_UP_DEX',
    'MATK_UP_STR',
    'MATK_UP_INT',
    'MATK_UP_VIT',
    'MATK_UP_AGI',
    'MATK_UP_DEX',
    'ATK_DOWN_STR',
    'ATK_DOWN_INT',
    'ATK_DOWN_VIT',
    'ATK_DOWN_AGI',
    'ATK_DOWN_DEX',
    'MATK_DOWN_STR',
    'MATK_DOWN_INT',
    'MATK_DOWN_VIT',
    'MATK_DOWN_AGI',
    'MATK_DOWN_DEX',
    'MAX_HP',
    'PHYSICAL_DEF',
    'MAGICAL_DEF',
    'PHYSICAL_RESISTANCE',
    'MAGICAL_RESISTANCE',
    'NEUTRAL_RESISTANCE',
    'LIGHT_RESISTANCE',
    'DARK_RESISTANCE',
    'WATER_RESISTANCE',
    'FIRE_RESISTANCE',
    'EARTH_RESISTANCE',
    'WIND_RESISTANCE',
    'DODGE',
    'AILMENT_RESISTANCE',
    'BASE_GUARD_POWER',
    'GUARD_POWER',
    'BASE_GUARD_RECHARGE',
    'GUARD_RECHANGE',
    'EVASION_RECHARGE',
    'PHYSICAL_BARRIER',
    'MAGICAL_BARRIER',
    'FRACTIONAL_BARRIER',
    'BARRIER_COOLDOWN',
    'REDUCE_DMG_FLOOR',
    'REDUCE_DMG_METEOR',
    'REDUCE_DMG_PLAYER_EPICENTER',
    'REDUCE_DMG_FOE_EPICENTER',
    'REDUCE_DMG_BOWLING',
    'REDUCE_DMG_BULLET',
    'REDUCE_DMG_STRAIGHT_LINE',
    'REDUCE_DMG_CHARGE',
    'ABSOLUTE_DODGE',
    'ASPD',
    'CSPD',
    'MSPD',
    'DROP_RATE',
    'REVIVE_TIME',
    'FLINCH_UNAVAILABLE',
    'TUMBLE_UNAVAILABLE',
    'STUN_UNAVAILABLE',
    'INVINCIBLE_AID',
    'EXP_RATE',
    'PET_EXP',
    'ITEM_COOLDOWN',
    'RECOIL_DAMAGE',
    'GEM_POWDER_DROP'
);


ALTER TYPE public."ModifiersName" OWNER TO postgres;

--
-- TOC entry 908 (class 1247 OID 16678)
-- Name: MonsterType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MonsterType" AS ENUM (
    'COMMON_MOBS',
    'COMMON_MINI_BOSS',
    'COMMON_BOSS',
    'EVENT_MOBS',
    'EVENT_MINI_BOSS',
    'EVENT_BOSS'
);


ALTER TYPE public."MonsterType" OWNER TO postgres;

--
-- TOC entry 911 (class 1247 OID 16692)
-- Name: SkillExtraActionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SkillExtraActionType" AS ENUM (
    'None',
    'Chanting',
    'Charging'
);


ALTER TYPE public."SkillExtraActionType" OWNER TO postgres;

--
-- TOC entry 914 (class 1247 OID 16700)
-- Name: SkillTreeName; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SkillTreeName" AS ENUM (
    'BLADE',
    'SHOT',
    'MAGIC',
    'MARTIAL',
    'DUALSWORD',
    'HALBERD',
    'MONONOFU',
    'CRUSHER',
    'SPRITE'
);


ALTER TYPE public."SkillTreeName" OWNER TO postgres;

--
-- TOC entry 917 (class 1247 OID 16720)
-- Name: SkillType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SkillType" AS ENUM (
    'ACTIVE_SKILL',
    'PASSIVE_SKILL'
);


ALTER TYPE public."SkillType" OWNER TO postgres;

--
-- TOC entry 920 (class 1247 OID 16726)
-- Name: SpecialAbiType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SpecialAbiType" AS ENUM (
    'NULL',
    'LUK',
    'CRI',
    'TEC',
    'MEN'
);


ALTER TYPE public."SpecialAbiType" OWNER TO postgres;

--
-- TOC entry 923 (class 1247 OID 16738)
-- Name: SubWeaponType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubWeaponType" AS ENUM (
    'NO_WEAPON',
    'ONE_HAND_SWORD',
    'MAGIC_DEVICE',
    'KNUCKLE',
    'KATANA',
    'ARROW',
    'DAGGER',
    'NINJUTSUSCROLL',
    'SHIELD'
);


ALTER TYPE public."SubWeaponType" OWNER TO postgres;

--
-- TOC entry 926 (class 1247 OID 16758)
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- TOC entry 929 (class 1247 OID 16764)
-- Name: YieldType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."YieldType" AS ENUM (
    'PersistentEffect',
    'ImmediateEffect'
);


ALTER TYPE public."YieldType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 16769)
-- Name: _additional_equipmentTocrystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_additional_equipmentTocrystal" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_additional_equipmentTocrystal" OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 16774)
-- Name: _analyzerTomember; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_analyzerTomember" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_analyzerTomember" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16779)
-- Name: _analyzerTomob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_analyzerTomob" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_analyzerTomob" OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16784)
-- Name: _body_armorTocrystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_body_armorTocrystal" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_body_armorTocrystal" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16789)
-- Name: _characterTocombo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterTocombo" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterTocombo" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16794)
-- Name: _characterToconsumable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterToconsumable" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterToconsumable" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16799)
-- Name: _characterToskill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterToskill" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterToskill" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16804)
-- Name: _crystalTomain_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTomain_weapon" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTomain_weapon" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16809)
-- Name: _crystalTospecial_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTospecial_equipment" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTospecial_equipment" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16814)
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
-- TOC entry 225 (class 1259 OID 16821)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    id text NOT NULL,
    type text NOT NULL,
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


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16826)
-- Name: additional_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.additional_equipment (
    id text NOT NULL,
    name text NOT NULL,
    refinement integer NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.additional_equipment REPLICA IDENTITY FULL;


ALTER TABLE public.additional_equipment OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16831)
-- Name: analyzer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analyzer (
    id text NOT NULL,
    name text NOT NULL,
    "extraDetails" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.analyzer REPLICA IDENTITY FULL;


ALTER TABLE public.analyzer OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16836)
-- Name: body_armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.body_armor (
    id text NOT NULL,
    name text NOT NULL,
    "bodyArmorType" public."BodyArmorType" NOT NULL,
    refinement integer NOT NULL,
    "baseDef" integer NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.body_armor REPLICA IDENTITY FULL;


ALTER TABLE public.body_armor OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16841)
-- Name: character; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."character" (
    id text NOT NULL,
    name text NOT NULL,
    "characterType" public."CharacterType" NOT NULL,
    lv integer NOT NULL,
    "baseStr" integer NOT NULL,
    "baseInt" integer NOT NULL,
    "baseVit" integer NOT NULL,
    "baseAgi" integer NOT NULL,
    "baseDex" integer NOT NULL,
    "specialAbiType" public."SpecialAbiType" NOT NULL,
    "specialAbiValue" integer NOT NULL,
    "mainWeaponId" text NOT NULL,
    "subWeaponId" text NOT NULL,
    "bodyArmorId" text NOT NULL,
    "additionalEquipmentId" text NOT NULL,
    "specialEquipmentId" text NOT NULL,
    "fashionModifierListId" text NOT NULL,
    "cuisineModifierListId" text NOT NULL,
    "petId" text NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "imageId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public."character" REPLICA IDENTITY FULL;


ALTER TABLE public."character" OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16846)
-- Name: combo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.combo (
    id text NOT NULL,
    name text NOT NULL,
    "createdByUserId" text
);


ALTER TABLE public.combo OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16851)
-- Name: combo_step; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.combo_step (
    id text NOT NULL,
    "order" integer NOT NULL,
    "comboType" public."ComboType" NOT NULL,
    "skillId" text NOT NULL,
    "comboId" text NOT NULL
);


ALTER TABLE public.combo_step OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16856)
-- Name: consumable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumable (
    id text NOT NULL,
    name text NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.consumable REPLICA IDENTITY FULL;


ALTER TABLE public.consumable OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16861)
-- Name: crystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crystal (
    id text NOT NULL,
    name text NOT NULL,
    "crystalType" public."CrystalType" NOT NULL,
    front integer NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text,
    "dataSources" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.crystal REPLICA IDENTITY FULL;


ALTER TABLE public.crystal OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16866)
-- Name: image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image (
    id text NOT NULL,
    "dataUrl" text NOT NULL,
    "main_weaponId" text,
    "sub_weaponId" text,
    "body_armorId" text,
    "additional_equipmentId" text,
    "special_equipmentId" text
);

ALTER TABLE ONLY public.image REPLICA IDENTITY FULL;


ALTER TABLE public.image OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16871)
-- Name: main_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.main_weapon (
    id text NOT NULL,
    name text NOT NULL,
    "mainWeaponType" public."MainWeaponType" NOT NULL,
    "baseAtk" integer NOT NULL,
    refinement integer NOT NULL,
    stability integer NOT NULL,
    element public."Element" NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.main_weapon REPLICA IDENTITY FULL;


ALTER TABLE public.main_weapon OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16876)
-- Name: member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.member (
    id text NOT NULL,
    "characterId" text NOT NULL,
    flow jsonb NOT NULL
);

ALTER TABLE ONLY public.member REPLICA IDENTITY FULL;


ALTER TABLE public.member OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16881)
-- Name: mob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mob (
    id text NOT NULL,
    "monsterId" text NOT NULL,
    star integer NOT NULL,
    flow text NOT NULL
);

ALTER TABLE ONLY public.mob REPLICA IDENTITY FULL;


ALTER TABLE public.mob OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16886)
-- Name: modifier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modifier (
    id text NOT NULL,
    formula text NOT NULL,
    "belongToModifierListId" text NOT NULL
);

ALTER TABLE ONLY public.modifier REPLICA IDENTITY FULL;


ALTER TABLE public.modifier OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16891)
-- Name: modifier_list; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modifier_list (
    id text NOT NULL,
    name text NOT NULL
);

ALTER TABLE ONLY public.modifier_list REPLICA IDENTITY FULL;


ALTER TABLE public.modifier_list OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16896)
-- Name: monster; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monster (
    id text NOT NULL,
    name text NOT NULL,
    "monsterType" public."MonsterType" NOT NULL,
    "baseLv" integer NOT NULL,
    experience integer NOT NULL,
    address text NOT NULL,
    element public."Element" NOT NULL,
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
    "difficultyOfTank" integer NOT NULL,
    "difficultyOfMelee" integer NOT NULL,
    "difficultyOfRanged" integer NOT NULL,
    "possibilityOfRunningAround" integer NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "imageId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.monster REPLICA IDENTITY FULL;


ALTER TABLE public.monster OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16901)
-- Name: pet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet (
    id text NOT NULL,
    name text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.pet REPLICA IDENTITY FULL;


ALTER TABLE public.pet OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16906)
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
-- TOC entry 243 (class 1259 OID 16911)
-- Name: process; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.process (
    id text NOT NULL
);


ALTER TABLE public.process OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16916)
-- Name: rate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rate (
    id text NOT NULL,
    rate integer NOT NULL,
    "userId" text NOT NULL,
    "statisticsId" text NOT NULL
);


ALTER TABLE public.rate OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16921)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16926)
-- Name: skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill (
    id text NOT NULL,
    "skillTreeName" public."SkillTreeName" NOT NULL,
    name text NOT NULL,
    "skillType" public."SkillType" NOT NULL,
    "weaponElementDependencyType" boolean NOT NULL,
    element public."Element" NOT NULL,
    "skillDescription" text,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.skill REPLICA IDENTITY FULL;


ALTER TABLE public.skill OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16931)
-- Name: skill_cost; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_cost (
    id text NOT NULL,
    name text,
    "costFormula" text NOT NULL,
    "skillEffectId" text
);


ALTER TABLE public.skill_cost OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16936)
-- Name: skill_effect; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_effect (
    id text NOT NULL,
    condition text NOT NULL,
    description text NOT NULL,
    "actionBaseDurationFormula" text NOT NULL,
    "actionModifiableDurationFormula" text NOT NULL,
    "skillExtraActionType" public."SkillExtraActionType" NOT NULL,
    "chantingBaseDurationFormula" text NOT NULL,
    "chantingModifiableDurationFormula" text NOT NULL,
    "chargingBaseDurationFormula" text NOT NULL,
    "chargingModifiableDurationFormula" text NOT NULL,
    "skillStartupFramesFormula" text NOT NULL,
    "belongToskillId" text NOT NULL
);


ALTER TABLE public.skill_effect OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16941)
-- Name: skill_yield; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_yield (
    id text NOT NULL,
    name text NOT NULL,
    "yieldType" public."YieldType" NOT NULL,
    "yieldFormula" text NOT NULL,
    "mutationTimingFormula" text,
    "skillEffectId" text
);


ALTER TABLE public.skill_yield OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16946)
-- Name: special_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.special_equipment (
    id text NOT NULL,
    name text NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.special_equipment REPLICA IDENTITY FULL;


ALTER TABLE public.special_equipment OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16951)
-- Name: statistics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statistics (
    id text NOT NULL,
    "monsterId" text,
    "crystalId" text,
    "mainWeaponId" text,
    "subWeaponId" text,
    "bodyArmorId" text,
    "additionalEquipmentId" text,
    "specialEquipmentId" text,
    "skillId" text,
    "petId" text,
    "consumableId" text,
    "characterId" text,
    "analyzerId" text
);

ALTER TABLE ONLY public.statistics REPLICA IDENTITY FULL;


ALTER TABLE public.statistics OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16956)
-- Name: step; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.step (
    id text NOT NULL,
    "order" integer NOT NULL,
    "skillId" text NOT NULL,
    "processId" text NOT NULL
);


ALTER TABLE public.step OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 16961)
-- Name: sub_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_weapon (
    id text NOT NULL,
    name text NOT NULL,
    "subWeaponType" public."SubWeaponType" NOT NULL,
    "baseAtk" integer NOT NULL,
    refinement integer NOT NULL,
    stability integer NOT NULL,
    element public."Element" NOT NULL,
    "modifierListId" text NOT NULL,
    "extraDetails" text NOT NULL,
    "dataSources" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "statisticsId" text NOT NULL,
    "updatedByUserId" text,
    "createdByUserId" text
);

ALTER TABLE ONLY public.sub_weapon REPLICA IDENTITY FULL;


ALTER TABLE public.sub_weapon OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 16966)
-- Name: usage_timestamp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_timestamp (
    "timestamp" timestamp(3) without time zone NOT NULL,
    "statisticsId" text
);


ALTER TABLE public.usage_timestamp OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 16971)
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "userRole" public."UserRole" NOT NULL
);

ALTER TABLE ONLY public."user" REPLICA IDENTITY FULL;


ALTER TABLE public."user" OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 16976)
-- Name: user_create_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_create_data (
    "userId" text NOT NULL
);

ALTER TABLE ONLY public.user_create_data REPLICA IDENTITY FULL;


ALTER TABLE public.user_create_data OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 16981)
-- Name: user_update_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_update_data (
    "userId" text NOT NULL
);

ALTER TABLE ONLY public.user_update_data REPLICA IDENTITY FULL;


ALTER TABLE public.user_update_data OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 16986)
-- Name: verification_token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_token (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verification_token OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 16991)
-- Name: view_timestamp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.view_timestamp (
    "timestamp" timestamp(3) without time zone NOT NULL,
    "statisticsId" text
);


ALTER TABLE public.view_timestamp OWNER TO postgres;

--
-- TOC entry 3841 (class 0 OID 16769)
-- Dependencies: 215
-- Data for Name: _additional_equipmentTocrystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_additional_equipmentTocrystal" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3842 (class 0 OID 16774)
-- Dependencies: 216
-- Data for Name: _analyzerTomember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_analyzerTomember" ("A", "B") FROM stdin;
testAnalyzerId	testMemberId
\.


--
-- TOC entry 3843 (class 0 OID 16779)
-- Dependencies: 217
-- Data for Name: _analyzerTomob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_analyzerTomob" ("A", "B") FROM stdin;
testAnalyzerId	testMobId
\.


--
-- TOC entry 3844 (class 0 OID 16784)
-- Dependencies: 218
-- Data for Name: _body_armorTocrystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_body_armorTocrystal" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3845 (class 0 OID 16789)
-- Dependencies: 219
-- Data for Name: _characterTocombo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterTocombo" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3846 (class 0 OID 16794)
-- Dependencies: 220
-- Data for Name: _characterToconsumable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterToconsumable" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3847 (class 0 OID 16799)
-- Dependencies: 221
-- Data for Name: _characterToskill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterToskill" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3848 (class 0 OID 16804)
-- Dependencies: 222
-- Data for Name: _crystalTomain_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTomain_weapon" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3849 (class 0 OID 16809)
-- Dependencies: 223
-- Data for Name: _crystalTospecial_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTospecial_equipment" ("A", "B") FROM stdin;
\.


--
-- TOC entry 3850 (class 0 OID 16814)
-- Dependencies: 224
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e1da1517-2da7-4d42-a15d-2ee10bd6780a	e64aca1872c64f8aa50464895a9bd41b27485870f2aadfb21d1ec41efbd52dfc	2024-10-18 06:14:40.917847+00	20241018061400_init	\N	\N	2024-10-18 06:14:40.502995+00	1
\.


--
-- TOC entry 3851 (class 0 OID 16821)
-- Dependencies: 225
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (id, type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state, "userId") FROM stdin;
\.


--
-- TOC entry 3852 (class 0 OID 16826)
-- Dependencies: 226
-- Data for Name: additional_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.additional_equipment (id, name, refinement, "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testTMNAddEquipment	测试-铁魔女头冠	0	TMNModifiersList	null	null	2024-10-13 07:50:01.014	1970-01-01 00:00:00	testTMNAddEquipment	\N	\N
\.


--
-- TOC entry 3853 (class 0 OID 16831)
-- Dependencies: 227
-- Data for Name: analyzer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analyzer (id, name, "extraDetails", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testAnalyzerId	测试分析器	\N	2024-11-01 03:16:37.312	1970-01-01 00:00:00	testAnalyzerStatistics	\N	\N
\.


--
-- TOC entry 3854 (class 0 OID 16836)
-- Dependencies: 228
-- Data for Name: body_armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.body_armor (id, name, "bodyArmorType", refinement, "baseDef", "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testBodyArmor	测试-轻化法师对属衣服	NORMAL	0	0	lightArmorModifiersList	null	null	2024-10-13 07:11:50.302	1970-01-01 00:00:00	testBodyArmorStatistics	\N	\N
\.


--
-- TOC entry 3855 (class 0 OID 16841)
-- Dependencies: 229
-- Data for Name: character; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."character" (id, name, "characterType", lv, "baseStr", "baseInt", "baseVit", "baseAgi", "baseDex", "specialAbiType", "specialAbiValue", "mainWeaponId", "subWeaponId", "bodyArmorId", "additionalEquipmentId", "specialEquipmentId", "fashionModifierListId", "cuisineModifierListId", "petId", "modifierListId", "extraDetails", "updatedAt", "createdAt", "statisticsId", "imageId", "updatedByUserId", "createdByUserId") FROM stdin;
testCharacterId	测试角色	Ranger	270	1	450	1	1	1	NULL	0	testMainWeaponMD	testSubWeapon	testBodyArmor	testTMNAddEquipment	testDXTDSpecialEquipment	testFashionModifiersList	testCuisineModifiersList	testPet	testCharacterModifiersList		2024-11-01 03:13:32.524	1970-01-01 00:00:00	testCharacterStatistics	system	\N	\N
\.


--
-- TOC entry 3856 (class 0 OID 16846)
-- Dependencies: 230
-- Data for Name: combo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.combo (id, name, "createdByUserId") FROM stdin;
\.


--
-- TOC entry 3857 (class 0 OID 16851)
-- Dependencies: 231
-- Data for Name: combo_step; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.combo_step (id, "order", "comboType", "skillId", "comboId") FROM stdin;
\.


--
-- TOC entry 3858 (class 0 OID 16856)
-- Dependencies: 232
-- Data for Name: consumable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consumable (id, name, "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
\.


--
-- TOC entry 3859 (class 0 OID 16861)
-- Dependencies: 233
-- Data for Name: crystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crystal (id, name, "crystalType", front, "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
Armasit	Armasit	GENERAL	0	ArmasitModifiersList	\N	\N	2024-10-13 07:13:23.231	1970-01-01 00:00:00	CrystalArmasitStatistics	\N	\N
\.


--
-- TOC entry 3860 (class 0 OID 16866)
-- Dependencies: 234
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image (id, "dataUrl", "main_weaponId", "sub_weaponId", "body_armorId", "additional_equipmentId", "special_equipmentId") FROM stdin;
system	""	\N	\N	\N	\N	\N
\.


--
-- TOC entry 3861 (class 0 OID 16871)
-- Dependencies: 235
-- Data for Name: main_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.main_weapon (id, name, "mainWeaponType", "baseAtk", refinement, stability, element, "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testMainWeaponMD	测试-属觉对属魔导	MAGIC_DEVICE	194	15	70	FIRE	fireMDModifierList	null	null	2024-10-13 07:04:58.642	1970-01-01 00:00:00	testMainWeaponMDStatistics	\N	\N
\.


--
-- TOC entry 3862 (class 0 OID 16876)
-- Dependencies: 236
-- Data for Name: member; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.member (id, "characterId", flow) FROM stdin;
testMemberId	testCharacterId	{}
\.


--
-- TOC entry 3863 (class 0 OID 16881)
-- Dependencies: 237
-- Data for Name: mob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mob (id, "monsterId", star, flow) FROM stdin;
testMobId	clv6tmq9x000hwv1fu7b0bmsr	4	
\.


--
-- TOC entry 3864 (class 0 OID 16886)
-- Dependencies: 238
-- Data for Name: modifier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modifier (id, formula, "belongToModifierListId") FROM stdin;
6	aspd + 250	windScrollModifiersList
1	element = FIRE	fireMDModifierList
3	mAtk + 6%	fireMDModifierList
2	stro.FIRE + 21%	fireMDModifierList
4	pCr + 25	fireMDModifierList
5	pCd + 21	fireMDModifierList
ArmasitModifier1	mAtk + 5%	ArmasitModifiersList
ArmasitModifier2	mPie + 20%	ArmasitModifiersList
ArmasitModifier3	cspd - 15%	ArmasitModifiersList
\.


--
-- TOC entry 3865 (class 0 OID 16891)
-- Dependencies: 239
-- Data for Name: modifier_list; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modifier_list (id, name) FROM stdin;
lightArmorModifiersList	轻化法师对属衣服附魔
windScrollModifiersList	风遁属性
fireMDModifierList	火属性主武器属觉附魔
ArmasitModifiersList	ArmasitModifiersList
TMNModifiersList	测试-铁魔女头冠属性
DXTDModifiersList	测试-读星提灯属性
testFashionModifiersList	测试-时装属性
testCuisineModifiersList	测试-料理属性
testCharacterModifiersList	测试-机体额外属性
\.


--
-- TOC entry 3866 (class 0 OID 16896)
-- Dependencies: 240
-- Data for Name: monster; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monster (id, name, "monsterType", "baseLv", experience, address, element, radius, maxhp, "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", avoidance, dodge, block, "normalAttackResistanceModifier", "physicalAttackResistanceModifier", "magicalAttackResistanceModifier", "difficultyOfTank", "difficultyOfMelee", "difficultyOfRanged", "possibilityOfRunningAround", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "imageId", "updatedByUserId", "createdByUserId") FROM stdin;
cluvi2py9001lu048nvjh3joe	漂漂妈	COMMON_BOSS	151	12400	忘却洞窟	WATER	1	0	226	6	271	6	0	226	5	0	0	15	20	5	5	5	0	无	fengli	2024-04-11 17:15:27.453	2024-04-19 16:58:08.654	101	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5luln000b11my87rwbzsk	米诺陶诺斯	COMMON_BOSS	32	420	废弃的寺院·封印之厅	WIND	1	0	48	1	48	1	0	48	4	0	0	5	5	0	0	0	0	无	fengli	2024-04-02 09:05:24.566	2024-04-28 03:48:20.696	100	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5v02h000f11myc5ylpafa	迪赛尔蛮龙	COMMON_BOSS	40	560	尼赛尔山·山顶	EARTH	1	0	20	1	20	1	0	75	0	9	0	15	15	0	0	0	0	无	fengli	2024-04-02 09:12:31.08	2024-04-28 03:48:20.696	99	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui66v15000j11myurfawvy9	遗迹魔像	COMMON_BOSS	45	660	左兹达遗迹·颠倒大厅	EARTH	1	0	106	1	106	1	0	14	0	50	0	15	15	0	0	0	0	无	fengli	2024-04-02 09:21:44.828	2024-04-28 03:48:20.696	98	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui69tqk000l11mygtkum8iv	弗雷帝亚	COMMON_BOSS	49	1480	混生地带	WIND	1	0	24	1	24	1	0	292	10	0	0	10	5	0	0	0	0	无	fengli	2024-04-02 09:24:03.159	2024-04-28 03:48:20.696	97	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6d9hj000n11mydvgshlcp	焰狼沃格	COMMON_BOSS	50	1500	焦热山峰·熔岩小径	FIRE	1	0	100	2	100	2	0	56	30	0	0	25	50	0	0	0	0	无	fengli	2024-04-02 09:26:43.213	2024-04-28 03:48:20.696	96	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6iio3000p11my11qq7s9z	亚思托	COMMON_BOSS	50	760	奥拉达古塔·瞭望台	WATER	1	0	50	1	150	1	0	112	15	0	0	25	1	0	0	0	0	无	fengli	2024-04-02 09:30:48.271	2024-04-28 03:48:20.696	95	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6r7n8000r11myjtveczlw	黏液怪	COMMON_BOSS	52	1400	卢泰斯巨穴·底部	WATER	1	0	78	12	78	12	0	0	0	50	0	5	5	0	0	0	0	无	fengli	2024-04-02 09:37:33.203	2024-04-28 03:48:20.696	94	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui589ck000311my0p5bgm0o	出土魔像	COMMON_BOSS	16	90	渊底的遗迹·最深处	NO_ELEMENT	1	3150	12	0	12	0	0	12	0	10	0	15	15	0	0	0	0	无	fengli	2024-04-03 04:11:55.193	2024-04-28 03:48:20.696	93	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7cvao001111myok0n3ps3	獠牙王	COMMON_BOSS	62	3000	萨哈姆地下洞穴·最深处	NO_ELEMENT	1	0	62	2	62	2	0	279	4	8	0	10	10	0	0	0	0	无	fengli	2024-04-03 07:01:07.627	2024-04-28 03:48:20.696	92	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui74bi7000t11my1qhbbgjc	马维兹	COMMON_BOSS	55	1290	新月鬼殿·内室	WATER	1	0	165	7	165	7	0	41	3	30	0	10	5	0	0	0	0	无	fengli	2024-04-03 07:02:58.826	2024-04-28 03:48:20.696	91	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5gbc3000911my2wys3fo7	森林巨狼	COMMON_BOSS	30	300	迈巴罗森林·深处	WIND	1	0	30	0	30	0	0	45	0	6	0	20	10	0	0	0	0	巨大的狼	fengli	2024-04-03 07:13:07.241	2024-04-28 03:48:20.696	90	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7ar0n000z11my9mm10x0r	恶魔之门	COMMON_BOSS	60	1440	萨哈姆陷落地带	DARK	1	0	180	2	180	2	0	0	0	0	0	1	1	0	0	0	0	不会动	fengli	2024-04-03 07:14:03.67	2024-04-28 03:48:20.696	89	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui643uc000h11mywjwinn7i	毛咕噜	COMMON_BOSS	43	620	焦热山峰·A3	WIND	1	0	0	1	0	1	0	64	12	0	0	100	5	0	0	0	0	掉的帽子挺好看的	fengli	2024-04-03 07:14:44.773	2024-04-28 03:48:20.696	88	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui55nha000111myotjx9ia0	科隆老大	COMMON_BOSS	10	30	规划中地区	EARTH	1	1000	7	0	7	0	0	11	0	0	0	10	10	0	0	0	0	劳大	fengli	2024-04-03 07:15:18.875	2024-04-28 03:48:20.696	87	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluozah5r0000ijciwqr8rbg2	上古女帝	COMMON_BOSS	64	3120	上古女帝陵墓·最深处	LIGHT	1	0	32	52	32	52	0	48	1	8	0	10	10	5	5	5	5	无	fengli	2024-04-08 04:25:41.487	2024-05-12 10:41:01.194	86	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5a9ql000511my8n0qi7kh	幽灵兵甲	COMMON_BOSS	20	240	索菲亚下水道	DARK	1	8544	26	0	50	0	0	30	0	0	0	30	10	0	0	0	0	无	fengli	2024-04-08 09:05:02.896	2024-04-28 03:48:20.696	85	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5oygi000d11mympx04zbv	哥布林老大	COMMON_BOSS	40	560	里比可洞穴·最深处	FIRE	1	0	40	0	40	0	0	75	0	9	0	10	5	0	0	0	0	无	fengli	2024-04-08 09:44:09.342	2024-04-28 03:48:20.696	84	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5ckiy000711my8nvvvsoc	诡谲的结晶	COMMON_BOSS	24	255	凯渥斯峡谷·龙洞穴	DARK	1	0	0	0	0	0	0	0	0	4	0	5	15	0	0	0	0	无	fengli	2024-04-08 09:44:17.531	2024-04-28 03:48:20.696	83	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7972v000x11mygbn4skgm	狂暴龙	COMMON_BOSS	60	960	豪塔幽谷·深处	EARTH	1	0	60	2	60	2	0	45	0	0	0	1	1	0	0	0	0	无	fengli	2024-04-08 10:00:52.84	2024-04-28 03:48:20.696	82	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui765bp000v11myatj0el9t	甘瑞夫	COMMON_BOSS	58	1150	斯卡罗街区·最深处	EARTH	1	0	232	1	58	1	0	43	0	23	0	25	1	0	0	0	0	无	fengli	2024-04-08 10:01:11.284	2024-04-28 03:48:20.696	81	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusd5unt000011x4y11ayyhe	哥布林大哥	COMMON_BOSS	70	2400	里诺姆平原	FIRE	1	0	140	1	210	1	0	157	4	0	0	10	20	5	5	5	5	无	fengli	2024-04-09 12:31:17.302	2024-04-28 03:48:20.696	80	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdaqt3000111x4pvyfke02	石柱魔像	COMMON_BOSS	70	3600	消失的城镇·结界前	EARTH	1	0	140	2	140	2	0	11	0	30	0	25	25	5	5	5	5	掉落的盾牌挺好看的	fengli	2024-04-09 12:34:59.996	2024-04-28 03:48:20.696	79	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdg36i000211x4tyfrqovq	草龙耶弗	COMMON_BOSS	74	5040	维雪蚀刻地深处·先境之民村落	EARTH	1	0	146	2	219	2	0	87	0	30	0	100	100	5	5	5	5	受到的单次伤害过高时会提高自身抗性，可以对其施加麻痹等异常接触	fengli	2024-04-09 12:38:58.154	2024-04-28 03:48:20.696	78	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdj1sy000311x4kncp7jb3	奴雷德斯	COMMON_BOSS	76	5360	异界之门·最深处	DARK	1	0	152	23	152	23	0	57	0	13	0	2	3	5	5	5	5	无	fengli	2024-04-09 12:42:38.488	2024-04-28 03:48:20.696	77	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdm1jk000411x4v1xuk3ay	翡翠鸟	COMMON_BOSS	79	8400	砂石梯层	WIND	1	0	158	3	198	3	0	177	0	50	0	40	40	5	5	5	5	受控后一段时间内闪躲率提升	fengli	2024-04-09 12:44:55.286	2024-04-28 03:48:20.696	76	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdojrh000511x43obnruzj	葛瓦	COMMON_BOSS	82	5000	阿卡克废城·城外荒郊	NO_ELEMENT	1	0	41	3	41	3	0	246	5	5	0	10	10	5	5	5	5	无	fengli	2024-04-09 12:47:13.976	2024-04-28 03:48:20.696	75	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdr2hb000611x4c0fujm0s	魔形机壳	COMMON_BOSS	85	7900	魔法废弃物处理厂·最深处	DARK	1	0	255	3	255	3	0	64	0	5	0	1	1	5	5	5	5	无	fengli	2024-04-09 12:49:12.02	2024-04-28 03:48:20.696	74	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdtmw9000711x4k88rg3j7	虚假黑骑士	COMMON_BOSS	88	6600	彼岸黄泉·最深处	DARK	1	0	176	23	176	23	0	231	12	2	0	30	30	5	5	5	5	无	fengli	2024-04-09 12:51:15.926	2024-04-28 03:48:20.696	73	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdwmh4000811x43ejfjs8y	魔晶兽	COMMON_BOSS	91	6300	月之恩泽山顶	DARK	1	0	274	3	320	3	0	136	0	25	0	30	35	5	5	5	5	无	fengli	2024-04-09 12:53:12.475	2024-04-28 03:48:20.696	72	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluse9wij000a11x4unrim046	黑暗骑士因扎尼奥	COMMON_BOSS	94	5500	索费尼山岳要塞	WATER	1	4890000	212	3	188	3	0	176	3	10	0	35	15	5	5	5	5	无	fengli	2024-04-09 12:55:42.46	2024-04-28 03:48:20.696	71	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv7thfi000764bckwgsirxk	地狱三头犬	COMMON_BOSS	97	9220	转生泉·顶层	DARK	1	0	146	3	146	3	0	255	6	12	0	20	30	5	5	5	0	受到控制后会改变自身属性	fengli	2024-04-11 12:28:19.356	2024-05-30 02:11:21.85	70	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8eh550003u048e76ibdxs	佐尔班	COMMON_BOSS	95	3900	暗之镜	WIND	1	2440000	196	3	392	3	0	588	6	0	0	1	1	5	5	5	0	无	fengli	2024-04-11 12:44:39.725	2024-04-28 03:48:59.786	69	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8ijit0005u048knmhxyp9	薄暮巨龙	COMMON_BOSS	100	8000	索费尼山岳要塞·屋顶	NO_ELEMENT	1	0	180	4	260	4	0	255	6	12	0	20	30	5	5	5	0	无	fengli	2024-04-11 12:47:49.435	2024-04-28 03:48:59.786	68	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8pnax0007u048t9c16ckd	红晶魔蛛	COMMON_BOSS	100	4400	升华观园·中央区	EARTH	1	0	140	4	110	4	0	300	5	10	0	20	15	5	5	5	0	无	fengli	2024-04-11 12:53:20.928	2024-04-28 03:48:59.786	67	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluqevnyg0009pzxgc2vnj27i	蒙面战士	COMMON_BOSS	67	4300	庄园开垦地·高台	FIRE	1	0	134	2	134	2	0	200	4	4	0	25	25	5	5	5	0	无	fengli	2024-04-11 12:53:34.805	2024-04-28 03:48:20.696	66	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8t0860009u048a24icquk	嗜人蝎狮	COMMON_BOSS	100	14400	暗之城·第二区	NO_ELEMENT	1	0	220	4	242	4	0	248	3	9	0	20	40	5	5	5	0	无	fengli	2024-04-11 12:55:57.672	2024-04-28 03:48:59.786	65	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8uzts000bu048su2ccp8x	魔晶炮手	COMMON_BOSS	103	7610	战士摇篮·最深处	NO_ELEMENT	1	0	216	4	247	4	0	123	1	20	0	40	50	5	5	5	0	无	fengli	2024-04-11 12:57:30.426	2024-04-28 03:48:59.786	64	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv93ha6000fu048qq11zx9y	伊科诺斯	COMMON_BOSS	108	4200	自动炮台防卫线	EARTH	1	0	162	10	140	10	0	162	0	10	0	0	0	5	5	5	0	血量每下降33%，防御能力会发生变化	fengli	2024-04-11 13:04:06.298	2024-04-28 03:48:59.786	63	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv90elr000du048hics57c5	战将复制体	COMMON_BOSS	106	8700	原生质体·最深处	FIRE	1	7800000	371	20	392	15	0	238	0	20	0	35	35	5	5	5	0	无	fengli	2024-04-11 13:04:14.331	2024-04-28 03:48:59.786	62	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv969jf000hu048anlwmncr	格雷西亚复制体	COMMON_BOSS	109	8150	暗之城·大厅	FIRE	1	0	164	35	218	35	0	302	5	5	0	35	40	5	5	5	0	无	fengli	2024-04-11 13:06:16.274	2024-04-28 03:48:59.786	61	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvahldr000lu048n8tnj407	机甲狮将	COMMON_BOSS	115	6250	辛戈拉雷遗迹	EARTH	1	0	161	4	138	4	0	275	10	5	0	0	0	8	5	5	0	无	fengli	2024-04-11 13:43:04.408	2024-04-28 03:48:59.786	60	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvgo77p000nu048109v4tal	约克	COMMON_BOSS	118	6800	巨型水晶工厂·储藏库	NO_ELEMENT	1	0	295	4	118	4	0	275	10	5	0	40	0	5	5	5	0	无	fengli	2024-04-11 16:36:10.287	2024-04-28 03:48:59.786	59	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv98k6v000ju048zq3nfgym	合成魔兽	COMMON_BOSS	112	6000	烧灼裂谷·最深处	FIRE	1	0	179	4	158	4	0	185	5	5	0	30	15	5	5	5	0	无	fengli	2024-04-11 16:43:05.941	2024-04-28 03:48:59.786	58	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvgvr59000pu048jlo772t4	热带梦貘	COMMON_BOSS	120	7800	烧灼裂谷·地面	NO_ELEMENT	1	7813000	144	4	168	4	0	360	5	5	0	25	40	5	5	5	0	睡着了会回血	fengli	2024-04-11 16:43:54.352	2024-04-28 03:48:59.786	57	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh0ial000ru048060ee4vn	半魔像暴君	COMMON_BOSS	121	8400	小型半魔像制造厂·中枢	NO_ELEMENT	1	0	61	4	61	4	0	543	6	10	0	10	10	0	5	5	0	无	fengli	2024-04-11 16:45:44.61	2024-04-28 03:48:59.786	56	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh2f6u000tu0488nxl4vy8	龙兽半魔像	COMMON_BOSS	124	12240	大型半魔像制造厂·最深处	NO_ELEMENT	1	0	248	15	372	15	0	186	2	20	0	50	50	5	5	5	0	无	fengli	2024-04-11 16:47:13.85	2024-04-28 03:48:59.786	55	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh7gh1000xu0487ukrqnob	扎哈克半魔像	COMMON_BOSS	130	6000	路菲纳斯宅邸内·大厅	LIGHT	1	0	1000	5	1000	5	0	0	5	10	0	2	1	5	5	5	0	无	fengli	2024-04-11 16:51:08.801	2024-04-28 03:48:59.786	54	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh4hnn000vu048647dpkg4	妖精兽拉瓦达	COMMON_BOSS	127	6000	怪物之森·深处	LIGHT	1	0	381	15	445	15	0	228	2	7	0	30	40	5	5	5	0	无	fengli	2024-04-11 16:51:15.835	2024-04-28 03:48:59.786	53	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvha2u2000zu04891jyz3wc	重装魔偶·蓝	COMMON_BOSS	133	6200	布莱耶研究所·4号楼	WIND	1	0	399	80	0	80	0	299	0	0	0	5	5	5	5	5	0	无	fengli	2024-04-11 16:53:11.121	2024-04-28 03:48:59.786	52	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhbmid0011u048wsgycyt1	重装魔偶·黄	COMMON_BOSS	133	6200	布莱耶研究所·4号楼	WIND	1	0	399	55	0	55	0	299	0	0	0	5	5	5	5	5	0	无	fengli	2024-04-11 16:54:23.245	2024-04-28 03:48:59.786	51	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhcvnx0013u048kumee5cx	重装魔偶·红	COMMON_BOSS	133	6200	布莱耶研究所·4号楼	NO_ELEMENT	1	0	399	30	0	30	0	299	0	0	0	5	5	5	5	5	0	无	fengli	2024-04-11 16:55:21.803	2024-04-28 03:48:59.786	50	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhfck00015u048idz8xt7f	怪穆尔	COMMON_BOSS	136	8100	黑鸦监狱·屋顶广场	EARTH	1	0	204	5	204	5	25	204	5	15	0	1	2	5	5	5	0	无	fengli	2024-04-11 16:57:17.015	2024-04-28 03:48:59.786	49	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhh45f0017u048xpsrfz4d	终极半魔像	COMMON_BOSS	139	10500	多洛马广场	NO_ELEMENT	1	0	417	10	417	10	15	208	0	9	0	30	15	5	5	5	0	无	fengli	2024-04-11 16:58:39.419	2024-04-28 03:48:59.786	48	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhlw78001bu0484mat8wmw	剑型曼特恩	COMMON_BOSS	143	11000	通地塔·入口	WIND	1	0	400	15	500	15	0	428	0	0	0	5	5	5	5	5	0	无	fengli	2024-04-11 17:02:22.407	2024-04-28 03:48:59.786	47	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhnyrp001du0482l4o8sdg	香菇咪	COMMON_BOSS	145	7300	塔纳斯矿道·大厅	WATER	1	0	261	5	290	5	0	434	11	0	0	20	25	5	5	5	0	无	fengli	2024-04-11 17:03:59.045	2024-04-28 03:48:59.786	46	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhplet001fu048asp0pkgn	结晶泰坦	COMMON_BOSS	148	9300	被侵蚀的遗迹	DARK	1	0	592	25	448	25	0	111	0	9	0	30	25	5	5	5	0	无	fengli	2024-04-11 17:05:15.046	2024-04-28 03:48:59.786	45	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhk34o0019u0488ip7hlko	奥恩拉夫	COMMON_BOSS	142	8700	阿尔提梅亚宫殿·大廊	LIGHT	1	9500000	107	5	710	5	30	692	15	5	0	1	1	5	5	5	0	无	fengli	2024-04-11 17:08:35.471	2024-04-28 03:48:59.786	44	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhx0r9001hu048vx81qiei	薇芮娜·柯尔连生体	COMMON_BOSS	150	30000	阿尔提梅亚宫殿·皇座之殿	FIRE	1	0	300	6	200	6	0	75	0	7	0	10	5	5	5	5	0	无	fengli	2024-04-11 17:11:01.524	2024-04-28 03:48:59.786	43	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhzf33001ju048wrkhjt2r	柱状·柯尔连生体	COMMON_BOSS	145	9300	阿尔提梅亚宫殿·皇座之殿	DARK	1	0	290	5	290	5	0	109	0	7	0	5	20	5	5	5	0	无	fengli	2024-04-11 17:12:53.41	2024-04-28 03:48:59.786	42	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ka17y0001wv1fy5sj57bv	齐尔布兹	COMMON_BOSS	154	11100	米斯尔那山遗迹·露天回廊	LIGHT	1	1600000	539	6	462	6	10	116	10	10	0	20	20	5	5	5	0	无	fengli	2024-04-19 11:02:35.125	2024-04-28 04:01:08.802	41	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kgpjy0003wv1f2yl2xszc	马尔杜拉	COMMON_BOSS	157	8100	众神之殿·恩泽神域	LIGHT	1	0	157	6	393	6	10	470	15	1	0	5	5	5	5	5	0	无	fengli	2024-04-19 11:07:46.485	2024-04-28 04:01:08.802	40	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kuovw0005wv1fex3b30tk	泽雷萨乌迦	COMMON_BOSS	160	15300	种子女神之殿	LIGHT	1	0	320	6	320	6	25	240	10	10	0	10	20	5	5	5	0	无	fengli	2024-04-19 11:18:38.818	2024-04-28 04:02:19.801	39	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kyheu0007wv1f5wpb3zv4	皮多大王	COMMON_BOSS	163	12000	艾路菲山脉·神殿前	WATER	1	0	789	15	244	15	10	122	5	20	0	30	30	5	5	5	0	无	fengli	2024-04-19 11:21:35.706	2024-04-28 04:02:19.801	38	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6l98a5000bwv1fn2zs6knp	修斯古巨兽	COMMON_BOSS	169	13300	艾利路丹街道·艾恩之森附近	EARTH	1	0	422	6	263	6	0	253	4	0	0	5	20	5	5	5	0	半血后增加对物理、魔法伤害的暴击抗性	fengli	2024-04-19 11:29:57.141	2024-04-28 04:02:19.801	37	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6l4vfl0009wv1f55hypfwe	暗龙费因斯坦	COMMON_BOSS	166	14000	暗龙神殿·顶层附近	DARK	1	0	246	6	249	6	0	25	1	1	0	1	10	5	5	5	0	半血后获得高额暴击抗性，受到控制后可解除一段时间	fengli	2024-04-19 11:30:48.928	2024-04-28 04:02:19.801	36	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6nykby000dwv1f0psvbizc	魔蚀皮鲁兹	COMMON_BOSS	172	0	莫瑟雷瘤界·深处	FIRE	1	0	602	26	498	26	20	258	1	0	0	20	5	5	5	5	0	无	fengli	2024-04-19 12:45:40.545	2024-04-28 04:02:19.801	35	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6th6cu000fwv1fje7s1gmj	结晶兽	COMMON_BOSS	175	20200	弗拉库坦地区·桥的入口处	DARK	1	0	437	7	437	7	10	655	2	0	0	5	5	5	5	5	0	无	fengli	2024-04-19 15:20:06.785	2024-04-28 04:02:19.801	34	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6tmq9x000hwv1fu7b0bmsr	库斯特	COMMON_BOSS	178	18200	拉比兰斯地区·广场	EARTH	1	0	534	7	534	7	25	267	5	5	0	5	5	5	5	5	0	生命值每降低33%切换一阶段。每次切换阶段会进行召唤，可用控制打断。	fengli	2024-04-19 15:24:25.876	2024-04-28 04:02:19.801	33	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6u40id000lwv1fw2chusr7	佛拉布喇·近	COMMON_BOSS	184	19190	雷赛塔拉地区·集货所屋顶	NO_ELEMENT	1	5150000	552	21	184	7	0	276	0	14	0	100	100	5	5	5	0	仇恨值目标7m内时的状态	fengli	2024-04-19 15:37:52.282	2024-04-28 04:02:19.801	32	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ttfvh000jwv1fczqjwzxb	扎菲洛加	COMMON_BOSS	181	20270	先锋·原生质体·最深处	DARK	1	3800000	315	7	315	7	20	135	0	10	0	5	10	5	5	5	0	无	fengli	2024-04-19 15:38:11.424	2024-04-28 04:02:19.801	31	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6u8d9t000nwv1fjbmbyohh	佛拉布喇·远	COMMON_BOSS	184	19190	雷赛塔拉地区·集货所屋顶	NO_ELEMENT	1	5150000	184	7	736	21	0	552	21	0	0	100	100	5	5	5	0	仇恨值目标在7m外时的状态	fengli	2024-04-19 15:41:15.437	2024-04-28 04:02:19.801	30	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6um51d000rwv1f4aqjbn5m	伏地蛇	COMMON_BOSS	187	24760	迪鲁佐恩研究所区域·最深处	DARK	1	0	467	7	467	7	25	336	0	0	0	5	5	5	5	5	0	受到单次伤害超过一定值以后会改变自身属性，提高暴击抗性并限制自身受到的伤害额度。60%血以上时变属为火属性；60%以下变为无属性。	fengli	2024-04-19 15:51:57.967	2024-04-28 04:02:19.801	29	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6uoufi000twv1fal4xlw5j	魔晶鹫	COMMON_BOSS	190	27200	盖斯特沙漠·最深处	DARK	1	0	523	7	618	7	15	428	10	5	0	5	5	5	5	5	0	第二阶段属性会变为风属性	fengli	2024-04-19 15:54:04.165	2024-04-28 04:02:19.801	28	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6usbws000vwv1f8l91l44n	皮斯泰乌鱼	COMMON_BOSS	193	11300	多西亚海岸·最深处	WATER	1	0	386	7	482	7	0	433	8	0	0	10	15	5	5	5	0	无	fengli	2024-04-19 15:56:46.796	2024-04-28 04:02:19.801	27	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v144a000zwv1frhv71fxi	王座柯尔连生体	COMMON_BOSS	190	0	新·原生质体	NO_ELEMENT	1	0	665	7	475	7	25	285	0	6	0	5	20	5	5	5	0	无	fengli	2024-04-19 16:03:53.881	2024-04-28 04:02:19.801	26	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v4ws60011wv1f5ztq57so	恶灵巨蛛	COMMON_BOSS	196	11600	方舟之谷·最深处	DARK	1	0	511	7	392	7	0	353	4	4	0	20	20	5	5	5	0	最后阶段飞天开始向后位移时可以被控制。	fengli	2024-04-19 16:06:33.709	2024-04-28 04:02:19.801	25	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6uxjlm000xwv1fb3g0tjv4	薇芮娜·超柯尔连生体	COMMON_BOSS	195	57000	新·原生质体	FIRE	1	0	819	7	585	7	5	438	6	0	0	1	5	5	5	5	0	经验值包括柱子。一阶段受到翻覆后获得高额减伤；三阶段受到翻覆后会在自身脚下释放漩涡。	fengli	2024-04-19 16:07:46.568	2024-04-28 04:02:19.801	24	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v9cog0013wv1f6vymc7ea	黑影	COMMON_BOSS	199	12500	洛可可废墟城	DARK	1	0	398	7	597	7	10	298	4	4	0	10	10	5	5	5	0	受到伤害累计超过一定值后属性变更为火属性。	fengli	2024-04-19 16:10:00.933	2024-04-28 04:02:19.801	23	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vcla70015wv1f003qb6ks	塔利结晶兽	COMMON_BOSS	202	13420	魔女领地森林·最深处	WIND	1	0	606	8	606	8	20	303	10	1	0	5	25	5	5	5	0	开局释放天火和风刃完毕前，暴击抗性为100	fengli	2024-04-19 16:12:32.041	2024-04-28 04:02:19.801	22	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vgjhg0017wv1fkdtn4tb8	移儡原生质体	COMMON_BOSS	205	14460	诺芙·蒂拉·中央区	NO_ELEMENT	1	0	922	8	307	8	100	307	0	25	0	1	1	5	5	5	0	受到冰冻后，暴击抗性降低为零；生命值降低至75%以下时，属性变为风属性	fengli	2024-04-19 16:15:36.342	2024-04-28 04:02:19.801	21	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vjtv30019wv1fcyunhqls	雷丽莎	COMMON_BOSS	210	26200	恩惠的水边	DARK	1	0	420	8	630	8	30	630	5	5	0	1	10	5	5	5	0	第二阶段血量降低至50%以下后，暴击抗性提高至500	fengli	2024-04-19 16:18:09.673	2024-04-28 04:02:19.801	20	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vo2mo001bwv1f0vxczx5u	晶玛体	COMMON_BOSS	208	14080	隐匿的湖泊·最深处	FIRE	1	0	728	16	728	16	20	468	3	3	0	5	10	5	5	5	0	每降低25%最大生命值，会进入一段时间的高抗性状态，受到：昏厥、麻痹、着火会解除该状态。	fengli	2024-04-19 16:21:27.734	2024-04-28 04:02:19.801	19	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vuo5d001fwv1fg5wuac1z	卒龙灾比欧	COMMON_BOSS	214	16200	建材放置处·竞技场	NO_ELEMENT	1	0	642	8	535	8	20	642	10	0	0	10	5	5	5	5	0	单次伤害超过50万会召唤小怪。	fengli	2024-04-19 16:26:35.569	2024-04-28 04:02:19.801	18	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vznrs001hwv1f78z595uu	兵龙达鲁巴	COMMON_BOSS	217	16700	普利姆·拉姆斯·村落	EARTH	1	0	596	8	705	8	40	487	5	35	0	5	10	5	5	5	0	部位被破坏时，格挡率会降低。	fengli	2024-04-19 16:30:28.322	2024-04-28 04:02:19.801	17	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wboec001lwv1ftpa30r93	威琉魔	COMMON_BOSS	223	20600	原生质体要塞·最深处	NO_ELEMENT	1	0	892	8	892	8	25	334	0	30	5	5	10	5	5	5	0	按距离变色，紫色抗性增加	fengli	2024-04-19 16:39:49.023	2024-04-28 04:02:19.801	16	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6we81i001nwv1ftd6jymzi	奥克拉辛	COMMON_BOSS	226	21100	乌尔卡尼山·山顶	DARK	1	0	987	30	987	30	30	338	0	0	0	5	5	5	5	5	0	部位被破坏时，降低抗性与防御	fengli	2024-04-19 16:41:47.783	2024-04-28 04:02:19.801	15	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wik7s001pwv1fkf2t5c6z	犰尔达	COMMON_BOSS	229	25000	麦庐万泊地下瀑布·龙人之口	EARTH	1	5500000	1717	39	1717	39	40	343	0	30	0	1	5	5	5	5	0	部位被破坏时，降低抗性与防御	fengli	2024-04-19 16:45:10.199	2024-04-28 04:02:19.801	14	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wmh4w001rwv1f8aa3u6vh	护卫魔像	COMMON_BOSS	232	38000	龙人之喉	NO_ELEMENT	1	0	1160	25	1160	25	20	418	0	25	0	0	0	5	5	5	0	血量低于50%以后切换形态；红色形态的回血期间受到麻痹会被打断。	fengli	2024-04-19 16:48:12.807	2024-04-28 04:02:19.801	13	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6x7ebl001twv1fnhnoc8ln	灼龙伊戈涅乌斯	COMMON_BOSS	235	20800	波玛·莫加·村落中心	FIRE	1	0	823	9	823	9	20	350	1	1	0	15	20	5	5	5	0	血量降低至50%以后，抗性增加，并在一段时间免疫控制。	fengli	2024-04-19 17:04:28.948	2024-04-28 04:02:19.801	12	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xawyo001vwv1fcicqcor2	欺龙米缪加	COMMON_BOSS	238	22600	控制区域·驾驶座区域	EARTH	1	0	2620	9	2620	9	35	357	0	5	0	10	15	5	5	5	0	部位被破坏后，防御力降低。	fengli	2024-04-19 17:07:13.046	2024-04-28 04:02:19.801	11	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xdtcv001xwv1ft4jvd8r1	丝岩比尔	COMMON_BOSS	241	24400	龙人圣域·王龙茧之殿	FIRE	1	0	361	9	723	9	55	541	0	0	0	0	0	5	5	5	0	生命值高于50%时，免疫胆怯	fengli	2024-04-19 17:09:28.362	2024-04-28 04:02:19.801	10	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xkuou001zwv1fvj8ksq3a	恶龙法奇诺	COMMON_BOSS	244	25870	推进机区域·推进机室	DARK	1	6100000	488	9	854	9	40	367	0	5	0	1	1	5	5	5	0	小怪存在时，限制伤害，无法被昏厥、翻覆	fengli	2024-04-19 17:14:56.592	2024-04-28 04:02:19.801	9	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xtcs70021wv1fnuz01uwx	伽拉木瓦	COMMON_BOSS	247	26400	贾巴里·库布瓦·山顶	WIND	1	6260000	494	9	988	9	35	444	10	0	0	10	5	5	5	5	0	仇恨目标距离太远时，会转移到地图右侧，并暂时无敌。	fengli	2024-04-19 17:21:33.369	2024-04-28 04:02:19.801	8	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y2u4t0023wv1f6o35glva	乐龙雷多尔基	COMMON_BOSS	250	28900	波玛·空达·村落中心	NO_ELEMENT	1	7000000	500	10	875	10	35	375	0	0	0	3	5	5	5	5	0	受到翻覆后会反击（即使翻覆由boss自身的技能施加）	fengli	2024-04-19 17:28:55.676	2024-04-28 04:02:19.801	7	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y70u50025wv1fqyhsjcz9	多米纳雷多尔	COMMON_BOSS	253	32500	冰冻瀑布·最深处	DARK	1	0	1265	50	1265	50	30	450	5	20	0	1	15	5	5	5	0	每失去一个球，双抗降低10%，并降低闪躲率和格挡率	fengli	2024-04-19 17:32:11.071	2024-04-28 04:02:19.801	6	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y9m8z0027wv1fu3g36iei	萨波	COMMON_BOSS	256	22100	普埃尔塔群岛·矿口前	WATER	1	0	896	10	640	10	30	576	10	5	0	5	10	5	5	5	0	无	fengli	2024-04-19 17:34:12.106	2024-04-28 04:02:19.801	5	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ydapf0029wv1fz5zss4fd	尉龙鲁迪斯	COMMON_BOSS	259	24600	埃斯浦幕穹顶·门前	EARTH	1	0	647	10	906	10	35	388	0	10	0	5	5	5	5	5	0	部位受到破坏时，解除昏厥免疫	fengli	2024-04-21 13:34:35.204	2024-04-28 04:02:19.801	4	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vraf5001dwv1f0mm86k44	岩龙菲尔岑	COMMON_BOSS	211	15150	守护的树林·巨树前	EARTH	1	3171000	1055	8	739	8	20	316	2	8	0	10	20	5	5	5	0	被破坏部位后防御力会降低，并能释放更多种类的技能	fengli	2024-05-03 15:05:58.756	2024-05-03 15:05:58.756	3	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ubaz1000pwv1fgzxpbjxd	魔人库维扎	COMMON_BOSS	185	40500	摩尔迦荒原·最深处	DARK	1	0	925	7	925	7	25	415	5	0	0	5	5	5	5	5	0	无	fengli	2024-05-03 16:07:28.626	2024-05-03 16:07:28.626	2	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6w6zqu001jwv1fq5r6q9dv	炎龙布兰玛	COMMON_BOSS	220	16700	迪碧德之泉	FIRE	1	5600000	880	8	880	8	30	412	7	0	0	10	15	5	5	5	0	血量越低，抗性与防御越低	fengli	2024-05-04 09:21:39.296	2024-05-04 09:21:39.296	1	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clx46p3kv0000344wthpzbohf	测试	COMMON_BOSS	1	22	地址	DARK	1	100	55	5	55	5	5	55	5	5	5	5	5	5	5	5	5	额外信息	数据来源	2024-06-07 04:24:57.123	2024-06-07 04:26:16.544	0	system	\N	\N
\.


--
-- TOC entry 3867 (class 0 OID 16901)
-- Dependencies: 241
-- Data for Name: pet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pet (id, name, "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testPet	测试-宠物	null	null	2024-10-13 08:02:24.94	1970-01-01 00:00:00	testPetStatistics	\N	\N
\.


--
-- TOC entry 3868 (class 0 OID 16906)
-- Dependencies: 242
-- Data for Name: post; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post (id, name, "createdAt", "updatedAt", "createdById") FROM stdin;
\.


--
-- TOC entry 3869 (class 0 OID 16911)
-- Dependencies: 243
-- Data for Name: process; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.process (id) FROM stdin;
\.


--
-- TOC entry 3870 (class 0 OID 16916)
-- Dependencies: 244
-- Data for Name: rate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rate (id, rate, "userId", "statisticsId") FROM stdin;
\.


--
-- TOC entry 3871 (class 0 OID 16921)
-- Dependencies: 245
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (id, "sessionToken", expires, "userId") FROM stdin;
\.


--
-- TOC entry 3872 (class 0 OID 16926)
-- Dependencies: 246
-- Data for Name: skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill (id, "skillTreeName", name, "skillType", "weaponElementDependencyType", element, "skillDescription", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
\.


--
-- TOC entry 3873 (class 0 OID 16931)
-- Dependencies: 247
-- Data for Name: skill_cost; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill_cost (id, name, "costFormula", "skillEffectId") FROM stdin;
\.


--
-- TOC entry 3874 (class 0 OID 16936)
-- Dependencies: 248
-- Data for Name: skill_effect; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill_effect (id, condition, description, "actionBaseDurationFormula", "actionModifiableDurationFormula", "skillExtraActionType", "chantingBaseDurationFormula", "chantingModifiableDurationFormula", "chargingBaseDurationFormula", "chargingModifiableDurationFormula", "skillStartupFramesFormula", "belongToskillId") FROM stdin;
\.


--
-- TOC entry 3875 (class 0 OID 16941)
-- Dependencies: 249
-- Data for Name: skill_yield; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill_yield (id, name, "yieldType", "yieldFormula", "mutationTimingFormula", "skillEffectId") FROM stdin;
\.


--
-- TOC entry 3876 (class 0 OID 16946)
-- Dependencies: 250
-- Data for Name: special_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.special_equipment (id, name, "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testDXTDSpecialEquipment	测试-读星提灯	DXTDModifiersList	null	null	2024-10-13 07:54:24.747	1970-01-01 00:00:00	testDXTDSpecialEquipmentStatistics	\N	\N
\.


--
-- TOC entry 3877 (class 0 OID 16951)
-- Dependencies: 251
-- Data for Name: statistics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statistics (id, "monsterId", "crystalId", "mainWeaponId", "subWeaponId", "bodyArmorId", "additionalEquipmentId", "specialEquipmentId", "skillId", "petId", "consumableId", "characterId", "analyzerId") FROM stdin;
0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
5	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
10	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
13	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
15	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
16	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
17	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
19	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
32	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
35	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
37	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
38	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
39	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
40	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
41	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
42	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
43	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
44	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
45	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
47	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
48	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
49	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
50	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
51	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
52	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
53	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
54	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
55	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
56	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
57	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
58	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
59	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
60	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
61	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
62	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
63	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
64	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
65	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
66	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
67	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
68	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
69	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
70	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
71	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
72	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
73	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
74	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
75	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
76	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
77	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
78	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
79	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
80	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
81	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
82	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
83	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
84	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
85	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
86	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
87	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
88	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
89	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
90	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
91	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
92	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
93	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
94	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
95	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
96	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
97	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
98	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
99	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
100	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
101	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
102	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
system	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testMainWeaponMDStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testSubWeaponStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CrystalArmasitStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testBodyArmorStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testTMNAddEquipment	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testDXTDSpecialEquipmentStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testCharacterStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testPetStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
testAnalyzerStatistics	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- TOC entry 3878 (class 0 OID 16956)
-- Dependencies: 252
-- Data for Name: step; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.step (id, "order", "skillId", "processId") FROM stdin;
\.


--
-- TOC entry 3879 (class 0 OID 16961)
-- Dependencies: 253
-- Data for Name: sub_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sub_weapon (id, name, "subWeaponType", "baseAtk", refinement, stability, element, "modifierListId", "extraDetails", "dataSources", "updatedAt", "createdAt", "statisticsId", "updatedByUserId", "createdByUserId") FROM stdin;
testSubWeapon	测试-副武器风遁	NINJUTSUSCROLL	0	0	0	NO_ELEMENT	windScrollModifiersList	null	null	2024-10-13 07:06:46.62	1970-01-01 00:00:00	testSubWeaponStatistics	\N	\N
\.


--
-- TOC entry 3880 (class 0 OID 16966)
-- Dependencies: 254
-- Data for Name: usage_timestamp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_timestamp ("timestamp", "statisticsId") FROM stdin;
\.


--
-- TOC entry 3881 (class 0 OID 16971)
-- Dependencies: 255
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, email, "emailVerified", image, "userRole") FROM stdin;
cluiav4550005142rkmjoas5u	纸月	\N	\N	http://thirdqq.qlogo.cn/ek_qqapp/AQEjR57uEa7B8qfRs69icKT5R9mvEcC0Sw0dNHMaicMVDhU8NKWhHPtIPDnAwoX3C16f8uty4SiaSnLt2CvRmJuE0BhCv7Q2ibTDY2iciaFmtI3W9k88AtzQlhysMIOgLeyg/40	USER
cluhz95c5000078elg5r46i83	KiaClouth	clouthber@gmail.com	2024-04-28 03:57:29.629	\N	USER
clwu10qok00056vladmyfmmrb	大尾巴猪	\N	\N	http://thirdqq.qlogo.cn/ek_qqapp/AQKK7RCI3eMNSh6ssAiaxqmX3ls8icMO7lQZog5gkyOLhzR42o6SyF6bMgBz1QECxRVOSoxodF/40	USER
cluj6sptk0000e10ge9wetfz8	KiaClouth	591519722@qq.com	2024-04-11 07:47:29.523	\N	USER
clujlndnd0000zkw9d9qfsmgz	KiaClouth	mayunlong16@foxmail.com	2024-04-07 10:46:23.639	\N	USER
\.


--
-- TOC entry 3882 (class 0 OID 16976)
-- Dependencies: 256
-- Data for Name: user_create_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_create_data ("userId") FROM stdin;
cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 3883 (class 0 OID 16981)
-- Dependencies: 257
-- Data for Name: user_update_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_update_data ("userId") FROM stdin;
cluhz95c5000078elg5r46i83
\.


--
-- TOC entry 3884 (class 0 OID 16986)
-- Dependencies: 258
-- Data for Name: verification_token; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verification_token (identifier, token, expires) FROM stdin;
\.


--
-- TOC entry 3885 (class 0 OID 16991)
-- Dependencies: 259
-- Data for Name: view_timestamp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.view_timestamp ("timestamp", "statisticsId") FROM stdin;
\.


--
-- TOC entry 3490 (class 2606 OID 16997)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3492 (class 2606 OID 16999)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- TOC entry 3495 (class 2606 OID 17001)
-- Name: additional_equipment additional_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT additional_equipment_pkey PRIMARY KEY (id);


--
-- TOC entry 3498 (class 2606 OID 17003)
-- Name: analyzer analyzer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyzer
    ADD CONSTRAINT analyzer_pkey PRIMARY KEY (id);


--
-- TOC entry 3501 (class 2606 OID 17005)
-- Name: body_armor body_armor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.body_armor
    ADD CONSTRAINT body_armor_pkey PRIMARY KEY (id);


--
-- TOC entry 3508 (class 2606 OID 17007)
-- Name: character character_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT character_pkey PRIMARY KEY (id);


--
-- TOC entry 3511 (class 2606 OID 17009)
-- Name: combo combo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT combo_pkey PRIMARY KEY (id);


--
-- TOC entry 3513 (class 2606 OID 17011)
-- Name: combo_step combo_step_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo_step
    ADD CONSTRAINT combo_step_pkey PRIMARY KEY (id);


--
-- TOC entry 3515 (class 2606 OID 17013)
-- Name: consumable consumable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT consumable_pkey PRIMARY KEY (id);


--
-- TOC entry 3518 (class 2606 OID 17015)
-- Name: crystal crystal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT crystal_pkey PRIMARY KEY (id);


--
-- TOC entry 3521 (class 2606 OID 17017)
-- Name: image image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_pkey PRIMARY KEY (id);


--
-- TOC entry 3523 (class 2606 OID 17019)
-- Name: main_weapon main_weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_weapon
    ADD CONSTRAINT main_weapon_pkey PRIMARY KEY (id);


--
-- TOC entry 3526 (class 2606 OID 17021)
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- TOC entry 3528 (class 2606 OID 17023)
-- Name: mob mob_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT mob_pkey PRIMARY KEY (id);


--
-- TOC entry 3532 (class 2606 OID 17025)
-- Name: modifier_list modifier_list_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifier_list
    ADD CONSTRAINT modifier_list_pkey PRIMARY KEY (id);


--
-- TOC entry 3530 (class 2606 OID 17027)
-- Name: modifier modifier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifier
    ADD CONSTRAINT modifier_pkey PRIMARY KEY (id);


--
-- TOC entry 3534 (class 2606 OID 17029)
-- Name: monster monster_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monster
    ADD CONSTRAINT monster_pkey PRIMARY KEY (id);


--
-- TOC entry 3537 (class 2606 OID 17031)
-- Name: pet pet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet
    ADD CONSTRAINT pet_pkey PRIMARY KEY (id);


--
-- TOC entry 3541 (class 2606 OID 17033)
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- TOC entry 3543 (class 2606 OID 17035)
-- Name: process process_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.process
    ADD CONSTRAINT process_pkey PRIMARY KEY (id);


--
-- TOC entry 3545 (class 2606 OID 17037)
-- Name: rate rate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate
    ADD CONSTRAINT rate_pkey PRIMARY KEY (id);


--
-- TOC entry 3547 (class 2606 OID 17039)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- TOC entry 3553 (class 2606 OID 17041)
-- Name: skill_cost skill_cost_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_cost
    ADD CONSTRAINT skill_cost_pkey PRIMARY KEY (id);


--
-- TOC entry 3555 (class 2606 OID 17043)
-- Name: skill_effect skill_effect_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_effect
    ADD CONSTRAINT skill_effect_pkey PRIMARY KEY (id);


--
-- TOC entry 3550 (class 2606 OID 17045)
-- Name: skill skill_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT skill_pkey PRIMARY KEY (id);


--
-- TOC entry 3557 (class 2606 OID 17047)
-- Name: skill_yield skill_yield_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_yield
    ADD CONSTRAINT skill_yield_pkey PRIMARY KEY (id);


--
-- TOC entry 3559 (class 2606 OID 17049)
-- Name: special_equipment special_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT special_equipment_pkey PRIMARY KEY (id);


--
-- TOC entry 3562 (class 2606 OID 17051)
-- Name: statistics statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistics
    ADD CONSTRAINT statistics_pkey PRIMARY KEY (id);


--
-- TOC entry 3564 (class 2606 OID 17053)
-- Name: step step_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.step
    ADD CONSTRAINT step_pkey PRIMARY KEY (id);


--
-- TOC entry 3566 (class 2606 OID 17055)
-- Name: sub_weapon sub_weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_weapon
    ADD CONSTRAINT sub_weapon_pkey PRIMARY KEY (id);


--
-- TOC entry 3569 (class 2606 OID 17057)
-- Name: usage_timestamp usage_timestamp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_timestamp
    ADD CONSTRAINT usage_timestamp_pkey PRIMARY KEY ("timestamp");


--
-- TOC entry 3574 (class 2606 OID 17059)
-- Name: user_create_data user_create_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_create_data
    ADD CONSTRAINT user_create_data_pkey PRIMARY KEY ("userId");


--
-- TOC entry 3572 (class 2606 OID 17061)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 3576 (class 2606 OID 17063)
-- Name: user_update_data user_update_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_update_data
    ADD CONSTRAINT user_update_data_pkey PRIMARY KEY ("userId");


--
-- TOC entry 3580 (class 2606 OID 17065)
-- Name: view_timestamp view_timestamp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.view_timestamp
    ADD CONSTRAINT view_timestamp_pkey PRIMARY KEY ("timestamp");


--
-- TOC entry 3471 (class 1259 OID 17066)
-- Name: _additional_equipmentTocrystal_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_additional_equipmentTocrystal_AB_unique" ON public."_additional_equipmentTocrystal" USING btree ("A", "B");


--
-- TOC entry 3472 (class 1259 OID 17067)
-- Name: _additional_equipmentTocrystal_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_additional_equipmentTocrystal_B_index" ON public."_additional_equipmentTocrystal" USING btree ("B");


--
-- TOC entry 3473 (class 1259 OID 17068)
-- Name: _analyzerTomember_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_analyzerTomember_AB_unique" ON public."_analyzerTomember" USING btree ("A", "B");


--
-- TOC entry 3474 (class 1259 OID 17069)
-- Name: _analyzerTomember_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_analyzerTomember_B_index" ON public."_analyzerTomember" USING btree ("B");


--
-- TOC entry 3475 (class 1259 OID 17070)
-- Name: _analyzerTomob_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_analyzerTomob_AB_unique" ON public."_analyzerTomob" USING btree ("A", "B");


--
-- TOC entry 3476 (class 1259 OID 17071)
-- Name: _analyzerTomob_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_analyzerTomob_B_index" ON public."_analyzerTomob" USING btree ("B");


--
-- TOC entry 3477 (class 1259 OID 17072)
-- Name: _body_armorTocrystal_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_body_armorTocrystal_AB_unique" ON public."_body_armorTocrystal" USING btree ("A", "B");


--
-- TOC entry 3478 (class 1259 OID 17073)
-- Name: _body_armorTocrystal_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_body_armorTocrystal_B_index" ON public."_body_armorTocrystal" USING btree ("B");


--
-- TOC entry 3479 (class 1259 OID 17074)
-- Name: _characterTocombo_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_characterTocombo_AB_unique" ON public."_characterTocombo" USING btree ("A", "B");


--
-- TOC entry 3480 (class 1259 OID 17075)
-- Name: _characterTocombo_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterTocombo_B_index" ON public."_characterTocombo" USING btree ("B");


--
-- TOC entry 3481 (class 1259 OID 17076)
-- Name: _characterToconsumable_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_characterToconsumable_AB_unique" ON public."_characterToconsumable" USING btree ("A", "B");


--
-- TOC entry 3482 (class 1259 OID 17077)
-- Name: _characterToconsumable_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterToconsumable_B_index" ON public."_characterToconsumable" USING btree ("B");


--
-- TOC entry 3483 (class 1259 OID 17078)
-- Name: _characterToskill_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_characterToskill_AB_unique" ON public."_characterToskill" USING btree ("A", "B");


--
-- TOC entry 3484 (class 1259 OID 17079)
-- Name: _characterToskill_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterToskill_B_index" ON public."_characterToskill" USING btree ("B");


--
-- TOC entry 3485 (class 1259 OID 17080)
-- Name: _crystalTomain_weapon_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_crystalTomain_weapon_AB_unique" ON public."_crystalTomain_weapon" USING btree ("A", "B");


--
-- TOC entry 3486 (class 1259 OID 17081)
-- Name: _crystalTomain_weapon_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTomain_weapon_B_index" ON public."_crystalTomain_weapon" USING btree ("B");


--
-- TOC entry 3487 (class 1259 OID 17082)
-- Name: _crystalTospecial_equipment_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_crystalTospecial_equipment_AB_unique" ON public."_crystalTospecial_equipment" USING btree ("A", "B");


--
-- TOC entry 3488 (class 1259 OID 17083)
-- Name: _crystalTospecial_equipment_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTospecial_equipment_B_index" ON public."_crystalTospecial_equipment" USING btree ("B");


--
-- TOC entry 3493 (class 1259 OID 17084)
-- Name: account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON public.account USING btree (provider, "providerAccountId");


--
-- TOC entry 3496 (class 1259 OID 17085)
-- Name: additional_equipment_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "additional_equipment_statisticsId_key" ON public.additional_equipment USING btree ("statisticsId");


--
-- TOC entry 3499 (class 1259 OID 17086)
-- Name: analyzer_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "analyzer_statisticsId_key" ON public.analyzer USING btree ("statisticsId");


--
-- TOC entry 3502 (class 1259 OID 17087)
-- Name: body_armor_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "body_armor_statisticsId_key" ON public.body_armor USING btree ("statisticsId");


--
-- TOC entry 3503 (class 1259 OID 17088)
-- Name: character_cuisineModifierListId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_cuisineModifierListId_key" ON public."character" USING btree ("cuisineModifierListId");


--
-- TOC entry 3504 (class 1259 OID 17089)
-- Name: character_fashionModifierListId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_fashionModifierListId_key" ON public."character" USING btree ("fashionModifierListId");


--
-- TOC entry 3505 (class 1259 OID 17090)
-- Name: character_imageId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_imageId_key" ON public."character" USING btree ("imageId");


--
-- TOC entry 3506 (class 1259 OID 17091)
-- Name: character_modifierListId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_modifierListId_key" ON public."character" USING btree ("modifierListId");


--
-- TOC entry 3509 (class 1259 OID 17092)
-- Name: character_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_statisticsId_key" ON public."character" USING btree ("statisticsId");


--
-- TOC entry 3516 (class 1259 OID 17093)
-- Name: consumable_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "consumable_statisticsId_key" ON public.consumable USING btree ("statisticsId");


--
-- TOC entry 3519 (class 1259 OID 17094)
-- Name: crystal_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "crystal_statisticsId_key" ON public.crystal USING btree ("statisticsId");


--
-- TOC entry 3524 (class 1259 OID 17095)
-- Name: main_weapon_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "main_weapon_statisticsId_key" ON public.main_weapon USING btree ("statisticsId");


--
-- TOC entry 3535 (class 1259 OID 17096)
-- Name: monster_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "monster_statisticsId_key" ON public.monster USING btree ("statisticsId");


--
-- TOC entry 3538 (class 1259 OID 17097)
-- Name: pet_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "pet_statisticsId_key" ON public.pet USING btree ("statisticsId");


--
-- TOC entry 3539 (class 1259 OID 17098)
-- Name: post_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX post_name_idx ON public.post USING btree (name);


--
-- TOC entry 3548 (class 1259 OID 17099)
-- Name: session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "session_sessionToken_key" ON public.session USING btree ("sessionToken");


--
-- TOC entry 3551 (class 1259 OID 17100)
-- Name: skill_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "skill_statisticsId_key" ON public.skill USING btree ("statisticsId");


--
-- TOC entry 3560 (class 1259 OID 17101)
-- Name: special_equipment_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "special_equipment_statisticsId_key" ON public.special_equipment USING btree ("statisticsId");


--
-- TOC entry 3567 (class 1259 OID 17102)
-- Name: sub_weapon_statisticsId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "sub_weapon_statisticsId_key" ON public.sub_weapon USING btree ("statisticsId");


--
-- TOC entry 3570 (class 1259 OID 17103)
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- TOC entry 3577 (class 1259 OID 17104)
-- Name: verification_token_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX verification_token_identifier_token_key ON public.verification_token USING btree (identifier, token);


--
-- TOC entry 3578 (class 1259 OID 17105)
-- Name: verification_token_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX verification_token_token_key ON public.verification_token USING btree (token);


--
-- TOC entry 3581 (class 2606 OID 17106)
-- Name: _additional_equipmentTocrystal _additional_equipmentTocrystal_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentTocrystal"
    ADD CONSTRAINT "_additional_equipmentTocrystal_A_fkey" FOREIGN KEY ("A") REFERENCES public.additional_equipment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3582 (class 2606 OID 17111)
-- Name: _additional_equipmentTocrystal _additional_equipmentTocrystal_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentTocrystal"
    ADD CONSTRAINT "_additional_equipmentTocrystal_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3583 (class 2606 OID 17116)
-- Name: _analyzerTomember _analyzerTomember_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_analyzerTomember"
    ADD CONSTRAINT "_analyzerTomember_A_fkey" FOREIGN KEY ("A") REFERENCES public.analyzer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3584 (class 2606 OID 17121)
-- Name: _analyzerTomember _analyzerTomember_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_analyzerTomember"
    ADD CONSTRAINT "_analyzerTomember_B_fkey" FOREIGN KEY ("B") REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3585 (class 2606 OID 17126)
-- Name: _analyzerTomob _analyzerTomob_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_analyzerTomob"
    ADD CONSTRAINT "_analyzerTomob_A_fkey" FOREIGN KEY ("A") REFERENCES public.analyzer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3586 (class 2606 OID 17131)
-- Name: _analyzerTomob _analyzerTomob_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_analyzerTomob"
    ADD CONSTRAINT "_analyzerTomob_B_fkey" FOREIGN KEY ("B") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3587 (class 2606 OID 17136)
-- Name: _body_armorTocrystal _body_armorTocrystal_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_body_armorTocrystal"
    ADD CONSTRAINT "_body_armorTocrystal_A_fkey" FOREIGN KEY ("A") REFERENCES public.body_armor(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3588 (class 2606 OID 17141)
-- Name: _body_armorTocrystal _body_armorTocrystal_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_body_armorTocrystal"
    ADD CONSTRAINT "_body_armorTocrystal_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3589 (class 2606 OID 17146)
-- Name: _characterTocombo _characterTocombo_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocombo"
    ADD CONSTRAINT "_characterTocombo_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3590 (class 2606 OID 17151)
-- Name: _characterTocombo _characterTocombo_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocombo"
    ADD CONSTRAINT "_characterTocombo_B_fkey" FOREIGN KEY ("B") REFERENCES public.combo(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3591 (class 2606 OID 17156)
-- Name: _characterToconsumable _characterToconsumable_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3592 (class 2606 OID 17161)
-- Name: _characterToconsumable _characterToconsumable_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_B_fkey" FOREIGN KEY ("B") REFERENCES public.consumable(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3593 (class 2606 OID 17166)
-- Name: _characterToskill _characterToskill_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToskill"
    ADD CONSTRAINT "_characterToskill_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3594 (class 2606 OID 17171)
-- Name: _characterToskill _characterToskill_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToskill"
    ADD CONSTRAINT "_characterToskill_B_fkey" FOREIGN KEY ("B") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3595 (class 2606 OID 17176)
-- Name: _crystalTomain_weapon _crystalTomain_weapon_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTomain_weapon"
    ADD CONSTRAINT "_crystalTomain_weapon_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3596 (class 2606 OID 17181)
-- Name: _crystalTomain_weapon _crystalTomain_weapon_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTomain_weapon"
    ADD CONSTRAINT "_crystalTomain_weapon_B_fkey" FOREIGN KEY ("B") REFERENCES public.main_weapon(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3597 (class 2606 OID 17186)
-- Name: _crystalTospecial_equipment _crystalTospecial_equipment_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial_equipment"
    ADD CONSTRAINT "_crystalTospecial_equipment_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3598 (class 2606 OID 17191)
-- Name: _crystalTospecial_equipment _crystalTospecial_equipment_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial_equipment"
    ADD CONSTRAINT "_crystalTospecial_equipment_B_fkey" FOREIGN KEY ("B") REFERENCES public.special_equipment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3599 (class 2606 OID 17196)
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3600 (class 2606 OID 17201)
-- Name: additional_equipment additional_equipment_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT "additional_equipment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3601 (class 2606 OID 17206)
-- Name: additional_equipment additional_equipment_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT "additional_equipment_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3602 (class 2606 OID 17211)
-- Name: additional_equipment additional_equipment_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT "additional_equipment_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3603 (class 2606 OID 17216)
-- Name: additional_equipment additional_equipment_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT "additional_equipment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3604 (class 2606 OID 17221)
-- Name: analyzer analyzer_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyzer
    ADD CONSTRAINT "analyzer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3605 (class 2606 OID 17226)
-- Name: analyzer analyzer_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyzer
    ADD CONSTRAINT "analyzer_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3606 (class 2606 OID 17231)
-- Name: analyzer analyzer_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyzer
    ADD CONSTRAINT "analyzer_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3607 (class 2606 OID 17236)
-- Name: body_armor body_armor_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.body_armor
    ADD CONSTRAINT "body_armor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3608 (class 2606 OID 17241)
-- Name: body_armor body_armor_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.body_armor
    ADD CONSTRAINT "body_armor_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3609 (class 2606 OID 17246)
-- Name: body_armor body_armor_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.body_armor
    ADD CONSTRAINT "body_armor_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3610 (class 2606 OID 17251)
-- Name: body_armor body_armor_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.body_armor
    ADD CONSTRAINT "body_armor_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3611 (class 2606 OID 17256)
-- Name: character character_additionalEquipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_additionalEquipmentId_fkey" FOREIGN KEY ("additionalEquipmentId") REFERENCES public.additional_equipment(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3612 (class 2606 OID 17261)
-- Name: character character_bodyArmorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_bodyArmorId_fkey" FOREIGN KEY ("bodyArmorId") REFERENCES public.body_armor(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3613 (class 2606 OID 17266)
-- Name: character character_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3614 (class 2606 OID 17271)
-- Name: character character_cuisineModifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_cuisineModifierListId_fkey" FOREIGN KEY ("cuisineModifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3615 (class 2606 OID 17276)
-- Name: character character_fashionModifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_fashionModifierListId_fkey" FOREIGN KEY ("fashionModifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3616 (class 2606 OID 17281)
-- Name: character character_imageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3617 (class 2606 OID 17286)
-- Name: character character_mainWeaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_mainWeaponId_fkey" FOREIGN KEY ("mainWeaponId") REFERENCES public.main_weapon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3618 (class 2606 OID 17291)
-- Name: character character_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3619 (class 2606 OID 17296)
-- Name: character character_petId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_petId_fkey" FOREIGN KEY ("petId") REFERENCES public.pet(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3620 (class 2606 OID 17301)
-- Name: character character_specialEquipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_specialEquipmentId_fkey" FOREIGN KEY ("specialEquipmentId") REFERENCES public.special_equipment(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3621 (class 2606 OID 17306)
-- Name: character character_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3622 (class 2606 OID 17311)
-- Name: character character_subWeaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_subWeaponId_fkey" FOREIGN KEY ("subWeaponId") REFERENCES public.sub_weapon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3623 (class 2606 OID 17316)
-- Name: character character_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3624 (class 2606 OID 17321)
-- Name: combo combo_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT "combo_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3625 (class 2606 OID 17326)
-- Name: combo_step combo_step_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo_step
    ADD CONSTRAINT "combo_step_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public.combo(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3626 (class 2606 OID 17331)
-- Name: combo_step combo_step_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo_step
    ADD CONSTRAINT "combo_step_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3627 (class 2606 OID 17336)
-- Name: consumable consumable_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT "consumable_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3628 (class 2606 OID 17341)
-- Name: consumable consumable_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT "consumable_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3629 (class 2606 OID 17346)
-- Name: consumable consumable_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT "consumable_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3630 (class 2606 OID 17351)
-- Name: consumable consumable_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT "consumable_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3631 (class 2606 OID 17356)
-- Name: crystal crystal_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT "crystal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3632 (class 2606 OID 17361)
-- Name: crystal crystal_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT "crystal_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3633 (class 2606 OID 17366)
-- Name: crystal crystal_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT "crystal_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3634 (class 2606 OID 17371)
-- Name: crystal crystal_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT "crystal_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3635 (class 2606 OID 17376)
-- Name: image image_additional_equipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_additional_equipmentId_fkey" FOREIGN KEY ("additional_equipmentId") REFERENCES public.additional_equipment(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3636 (class 2606 OID 17381)
-- Name: image image_body_armorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_body_armorId_fkey" FOREIGN KEY ("body_armorId") REFERENCES public.body_armor(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3637 (class 2606 OID 17386)
-- Name: image image_main_weaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_main_weaponId_fkey" FOREIGN KEY ("main_weaponId") REFERENCES public.main_weapon(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3638 (class 2606 OID 17391)
-- Name: image image_special_equipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_special_equipmentId_fkey" FOREIGN KEY ("special_equipmentId") REFERENCES public.special_equipment(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3639 (class 2606 OID 17396)
-- Name: image image_sub_weaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "image_sub_weaponId_fkey" FOREIGN KEY ("sub_weaponId") REFERENCES public.sub_weapon(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3640 (class 2606 OID 17401)
-- Name: main_weapon main_weapon_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_weapon
    ADD CONSTRAINT "main_weapon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3641 (class 2606 OID 17406)
-- Name: main_weapon main_weapon_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_weapon
    ADD CONSTRAINT "main_weapon_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3642 (class 2606 OID 17411)
-- Name: main_weapon main_weapon_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_weapon
    ADD CONSTRAINT "main_weapon_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3643 (class 2606 OID 17416)
-- Name: main_weapon main_weapon_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_weapon
    ADD CONSTRAINT "main_weapon_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3644 (class 2606 OID 17421)
-- Name: member member_characterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3645 (class 2606 OID 17426)
-- Name: mob mob_monsterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES public.monster(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3646 (class 2606 OID 17431)
-- Name: modifier modifier_belongToModifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifier
    ADD CONSTRAINT "modifier_belongToModifierListId_fkey" FOREIGN KEY ("belongToModifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3647 (class 2606 OID 17436)
-- Name: monster monster_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monster
    ADD CONSTRAINT "monster_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3648 (class 2606 OID 17441)
-- Name: monster monster_imageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monster
    ADD CONSTRAINT "monster_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3649 (class 2606 OID 17446)
-- Name: monster monster_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monster
    ADD CONSTRAINT "monster_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3650 (class 2606 OID 17451)
-- Name: monster monster_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monster
    ADD CONSTRAINT "monster_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3651 (class 2606 OID 17456)
-- Name: pet pet_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet
    ADD CONSTRAINT "pet_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3652 (class 2606 OID 17461)
-- Name: pet pet_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet
    ADD CONSTRAINT "pet_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3653 (class 2606 OID 17466)
-- Name: pet pet_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet
    ADD CONSTRAINT "pet_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3654 (class 2606 OID 17471)
-- Name: post post_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT "post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3655 (class 2606 OID 17476)
-- Name: rate rate_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate
    ADD CONSTRAINT "rate_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3656 (class 2606 OID 17481)
-- Name: rate rate_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate
    ADD CONSTRAINT "rate_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3657 (class 2606 OID 17486)
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3661 (class 2606 OID 17491)
-- Name: skill_cost skill_cost_skillEffectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_cost
    ADD CONSTRAINT "skill_cost_skillEffectId_fkey" FOREIGN KEY ("skillEffectId") REFERENCES public.skill_effect(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3658 (class 2606 OID 17496)
-- Name: skill skill_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3662 (class 2606 OID 17501)
-- Name: skill_effect skill_effect_belongToskillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_effect
    ADD CONSTRAINT "skill_effect_belongToskillId_fkey" FOREIGN KEY ("belongToskillId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3659 (class 2606 OID 17506)
-- Name: skill skill_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3660 (class 2606 OID 17511)
-- Name: skill skill_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3663 (class 2606 OID 17516)
-- Name: skill_yield skill_yield_skillEffectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_yield
    ADD CONSTRAINT "skill_yield_skillEffectId_fkey" FOREIGN KEY ("skillEffectId") REFERENCES public.skill_effect(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3664 (class 2606 OID 17521)
-- Name: special_equipment special_equipment_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT "special_equipment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3665 (class 2606 OID 17526)
-- Name: special_equipment special_equipment_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT "special_equipment_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3666 (class 2606 OID 17531)
-- Name: special_equipment special_equipment_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT "special_equipment_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3667 (class 2606 OID 17536)
-- Name: special_equipment special_equipment_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT "special_equipment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3668 (class 2606 OID 17541)
-- Name: step step_processId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.step
    ADD CONSTRAINT "step_processId_fkey" FOREIGN KEY ("processId") REFERENCES public.process(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3669 (class 2606 OID 17546)
-- Name: step step_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.step
    ADD CONSTRAINT "step_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3670 (class 2606 OID 17551)
-- Name: sub_weapon sub_weapon_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_weapon
    ADD CONSTRAINT "sub_weapon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public.user_create_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3671 (class 2606 OID 17556)
-- Name: sub_weapon sub_weapon_modifierListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_weapon
    ADD CONSTRAINT "sub_weapon_modifierListId_fkey" FOREIGN KEY ("modifierListId") REFERENCES public.modifier_list(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3672 (class 2606 OID 17561)
-- Name: sub_weapon sub_weapon_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_weapon
    ADD CONSTRAINT "sub_weapon_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3673 (class 2606 OID 17566)
-- Name: sub_weapon sub_weapon_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_weapon
    ADD CONSTRAINT "sub_weapon_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public.user_update_data("userId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3674 (class 2606 OID 17571)
-- Name: usage_timestamp usage_timestamp_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_timestamp
    ADD CONSTRAINT "usage_timestamp_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3675 (class 2606 OID 17576)
-- Name: user_create_data user_create_data_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_create_data
    ADD CONSTRAINT "user_create_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3676 (class 2606 OID 17581)
-- Name: user_update_data user_update_data_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_update_data
    ADD CONSTRAINT "user_update_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3677 (class 2606 OID 17586)
-- Name: view_timestamp view_timestamp_statisticsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.view_timestamp
    ADD CONSTRAINT "view_timestamp_statisticsId_fkey" FOREIGN KEY ("statisticsId") REFERENCES public.statistics(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3821 (class 6104 OID 16384)
-- Name: electric_publication_default; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION electric_publication_default WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION electric_publication_default OWNER TO postgres;

--
-- TOC entry 3833 (class 6106 OID 17607)
-- Name: electric_publication_default additional_equipment; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.additional_equipment;


--
-- TOC entry 3826 (class 6106 OID 17600)
-- Name: electric_publication_default analyzer; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.analyzer;


--
-- TOC entry 3832 (class 6106 OID 17606)
-- Name: electric_publication_default body_armor; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.body_armor;


--
-- TOC entry 3840 (class 6106 OID 17614)
-- Name: electric_publication_default character; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."character";


--
-- TOC entry 3837 (class 6106 OID 17611)
-- Name: electric_publication_default consumable; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.consumable;


--
-- TOC entry 3829 (class 6106 OID 17603)
-- Name: electric_publication_default crystal; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.crystal;


--
-- TOC entry 3825 (class 6106 OID 17599)
-- Name: electric_publication_default image; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.image;


--
-- TOC entry 3830 (class 6106 OID 17604)
-- Name: electric_publication_default main_weapon; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.main_weapon;


--
-- TOC entry 3838 (class 6106 OID 17612)
-- Name: electric_publication_default member; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.member;


--
-- TOC entry 3839 (class 6106 OID 17613)
-- Name: electric_publication_default mob; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.mob;


--
-- TOC entry 3827 (class 6106 OID 17601)
-- Name: electric_publication_default modifier; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.modifier;


--
-- TOC entry 3828 (class 6106 OID 17602)
-- Name: electric_publication_default modifier_list; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.modifier_list;


--
-- TOC entry 3824 (class 6106 OID 17596)
-- Name: electric_publication_default monster; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.monster;


--
-- TOC entry 3834 (class 6106 OID 17608)
-- Name: electric_publication_default pet; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.pet;


--
-- TOC entry 3836 (class 6106 OID 17610)
-- Name: electric_publication_default skill; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.skill;


--
-- TOC entry 3835 (class 6106 OID 17609)
-- Name: electric_publication_default special_equipment; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.special_equipment;


--
-- TOC entry 3831 (class 6106 OID 17605)
-- Name: electric_publication_default sub_weapon; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.sub_weapon;


--
-- TOC entry 3822 (class 6106 OID 17594)
-- Name: electric_publication_default user; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public."user";


--
-- TOC entry 3823 (class 6106 OID 17595)
-- Name: electric_publication_default user_create_data; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION electric_publication_default ADD TABLE ONLY public.user_create_data;


-- Completed on 2024-11-01 11:58:32

--
-- PostgreSQL database dump complete
--

