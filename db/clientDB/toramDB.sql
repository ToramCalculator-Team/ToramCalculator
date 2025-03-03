--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2025-03-03 11:31:25

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 264 (class 1259 OID 16737)
-- Name: _BackRelation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_BackRelation" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_BackRelation" OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 16730)
-- Name: _FrontRelation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_FrontRelation" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_FrontRelation" OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 16800)
-- Name: _additional_equipmentTocrystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_additional_equipmentTocrystal" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_additional_equipmentTocrystal" OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 16807)
-- Name: _additional_equipmentToimage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_additional_equipmentToimage" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_additional_equipmentToimage" OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 16786)
-- Name: _armorTocrystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_armorTocrystal" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_armorTocrystal" OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 16793)
-- Name: _armorToimage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_armorToimage" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_armorToimage" OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 16814)
-- Name: _avatarTocharacter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_avatarTocharacter" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_avatarTocharacter" OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 16821)
-- Name: _characterTocharacter_skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterTocharacter_skill" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterTocharacter_skill" OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 16835)
-- Name: _characterTocombo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterTocombo" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterTocombo" OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 16828)
-- Name: _characterToconsumable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_characterToconsumable" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_characterToconsumable" OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 16765)
-- Name: _crystalTocustom_additional_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTocustom_additional_equipment" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTocustom_additional_equipment" OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 16758)
-- Name: _crystalTocustom_armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTocustom_armor" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTocustom_armor" OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 16779)
-- Name: _crystalTocustom_special_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTocustom_special_equipment" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTocustom_special_equipment" OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 16751)
-- Name: _crystalTocustom_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTocustom_weapon" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTocustom_weapon" OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 16772)
-- Name: _crystalTospecial_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalTospecial_equipment" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalTospecial_equipment" OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 16744)
-- Name: _crystalToweapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_crystalToweapon" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_crystalToweapon" OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 16856)
-- Name: _imageToweapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_imageToweapon" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_imageToweapon" OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 16842)
-- Name: _memberToteam; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_memberToteam" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_memberToteam" OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 16723)
-- Name: _mobTozone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_mobTozone" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_mobTozone" OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 16849)
-- Name: _simulatorToteam; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_simulatorToteam" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_simulatorToteam" OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 16396)
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

ALTER TABLE ONLY public.account REPLICA IDENTITY FULL;


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16417)
-- Name: account_create_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_create_data (
    "accountId" text NOT NULL
);

ALTER TABLE ONLY public.account_create_data REPLICA IDENTITY FULL;


ALTER TABLE public.account_create_data OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16424)
-- Name: account_update_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_update_data (
    "accountId" text NOT NULL
);

ALTER TABLE ONLY public.account_update_data REPLICA IDENTITY FULL;


ALTER TABLE public.account_update_data OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16438)
-- Name: activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.activity OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16569)
-- Name: additional_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.additional_equipment (
    name text NOT NULL,
    "baseDef" integer NOT NULL,
    modifiers text[],
    "colorA" integer NOT NULL,
    "colorB" integer NOT NULL,
    "colorC" integer NOT NULL,
    "itemId" text NOT NULL
);


ALTER TABLE public.additional_equipment OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16445)
-- Name: address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    "worldId" text NOT NULL
);


ALTER TABLE public.address OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16555)
-- Name: armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.armor (
    name text NOT NULL,
    "baseDef" integer NOT NULL,
    modifiers text[],
    "colorA" integer NOT NULL,
    "colorB" integer NOT NULL,
    "colorC" integer NOT NULL,
    "itemId" text NOT NULL
);


ALTER TABLE public.armor OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16562)
-- Name: armor_enchantment_attributes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.armor_enchantment_attributes (
    id text NOT NULL,
    name text NOT NULL,
    modifiers text[],
    details text,
    "dataSources" text,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);


ALTER TABLE public.armor_enchantment_attributes OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 16660)
-- Name: avatar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avatar (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    modifiers text[],
    "playerId" text NOT NULL
);


ALTER TABLE public.avatar OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 16667)
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
    "personalityType" text NOT NULL,
    "personalityValue" integer NOT NULL,
    "weaponId" text NOT NULL,
    "subWeaponId" text NOT NULL,
    "armorId" text NOT NULL,
    "addEquipId" text NOT NULL,
    "speEquipId" text NOT NULL,
    cooking text[],
    modifiers text[],
    "partnerSkillAId" text NOT NULL,
    "partnerSkillAType" text NOT NULL,
    "partnerSkillBId" text NOT NULL,
    "partnerSkillBType" text NOT NULL,
    "masterId" text NOT NULL,
    details text NOT NULL,
    "statisticId" text NOT NULL,
    "imageId" text NOT NULL
);


ALTER TABLE public."character" OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16639)
-- Name: character_skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.character_skill (
    id text NOT NULL,
    lv integer NOT NULL,
    "isStarGem" boolean NOT NULL,
    "templateId" text NOT NULL
);


ALTER TABLE public.character_skill OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16653)
-- Name: combo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.combo (
    id text NOT NULL,
    name text NOT NULL,
    combo jsonb NOT NULL
);


ALTER TABLE public.combo OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16597)
-- Name: consumable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumable (
    name text NOT NULL,
    "itemId" text NOT NULL,
    type text NOT NULL,
    "effectDuration" integer NOT NULL,
    effects text[]
);


ALTER TABLE public.consumable OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16540)
-- Name: crystal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crystal (
    name text NOT NULL,
    type text NOT NULL,
    modifiers text[],
    "itemId" text NOT NULL
);


ALTER TABLE public.crystal OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16625)
-- Name: custom_additional_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_additional_equipment (
    id text NOT NULL,
    name text NOT NULL,
    def integer NOT NULL,
    "templateId" text NOT NULL,
    refinement integer NOT NULL,
    "masterId" text NOT NULL
);


ALTER TABLE public.custom_additional_equipment OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16618)
-- Name: custom_armor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_armor (
    id text NOT NULL,
    name text NOT NULL,
    def integer NOT NULL,
    type text NOT NULL,
    "templateId" text NOT NULL,
    refinement integer NOT NULL,
    "enchantmentAttributesId" text,
    "masterId" text NOT NULL
);


ALTER TABLE public.custom_armor OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16646)
-- Name: custom_pet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_pet (
    id text NOT NULL,
    "templateId" text NOT NULL,
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
    "weaponType" text NOT NULL,
    "personaType" text NOT NULL,
    type text NOT NULL,
    "weaponAtk" integer NOT NULL,
    generation integer NOT NULL,
    "maxLv" integer NOT NULL,
    "masterId" text NOT NULL
);


ALTER TABLE public.custom_pet OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16632)
-- Name: custom_special_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_special_equipment (
    id text NOT NULL,
    name text NOT NULL,
    def integer NOT NULL,
    "templateId" text NOT NULL,
    refinement integer NOT NULL,
    "masterId" text NOT NULL
);


ALTER TABLE public.custom_special_equipment OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16604)
-- Name: custom_weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_weapon (
    id text NOT NULL,
    name text NOT NULL,
    "baseAbi" integer NOT NULL,
    stability integer NOT NULL,
    "extraAbi" integer NOT NULL,
    "templateId" text,
    refinement integer NOT NULL,
    "enchantmentAttributesId" text,
    "masterId" text NOT NULL
);


ALTER TABLE public.custom_weapon OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16532)
-- Name: drop_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drop_item (
    id text NOT NULL,
    "itemId" text NOT NULL,
    probability integer NOT NULL,
    "relatedPartType" text NOT NULL,
    "relatedPartInfo" text NOT NULL,
    "breakReward" text NOT NULL,
    "dropById" text NOT NULL
);


ALTER TABLE public.drop_item OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 16716)
-- Name: image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image (
    id text NOT NULL,
    "dataUrl" text NOT NULL
);


ALTER TABLE public.image OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16466)
-- Name: item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item (
    id text NOT NULL,
    type text NOT NULL,
    "dataSources" text NOT NULL,
    details text NOT NULL,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);


ALTER TABLE public.item OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16494)
-- Name: kill_requirement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kill_requirement (
    id text NOT NULL,
    "mobId" text NOT NULL,
    count integer NOT NULL,
    "taskId" text NOT NULL
);


ALTER TABLE public.kill_requirement OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16515)
-- Name: material; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material (
    name text NOT NULL,
    "itemId" text NOT NULL,
    type text NOT NULL,
    "ptValue" integer NOT NULL,
    price integer NOT NULL
);


ALTER TABLE public.material OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 16688)
-- Name: member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.member (
    id text NOT NULL,
    "order" integer NOT NULL,
    "playerId" text,
    "partnerId" text,
    "mercenaryId" text,
    "mobId" text,
    "mobDifficultyFlag" text NOT NULL
);


ALTER TABLE public.member OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 16674)
-- Name: mercenary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mercenary (
    type text NOT NULL,
    "templateId" text NOT NULL,
    "skillAId" text NOT NULL,
    "skillAType" text NOT NULL,
    "skillBId" text NOT NULL,
    "skillBType" text NOT NULL
);


ALTER TABLE public.mercenary OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16522)
-- Name: mob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mob (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    captureable boolean NOT NULL,
    "baseLv" integer NOT NULL,
    experience integer NOT NULL,
    "partsExperience" integer NOT NULL,
    "elementType" text NOT NULL,
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
    "imageId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);

ALTER TABLE ONLY public.mob REPLICA IDENTITY FULL;


ALTER TABLE public.mob OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16459)
-- Name: npc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.npc (
    id text NOT NULL,
    name text NOT NULL,
    "imageId" text NOT NULL,
    "zoneId" text NOT NULL
);


ALTER TABLE public.npc OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 16681)
-- Name: player; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player (
    id text NOT NULL,
    name text NOT NULL,
    "useIn" text NOT NULL,
    actions jsonb NOT NULL,
    "accountId" text NOT NULL
);


ALTER TABLE public.player OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16410)
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
-- TOC entry 228 (class 1259 OID 16480)
-- Name: recipe; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe (
    id text NOT NULL,
    "weaponId" text,
    "armorId" text,
    "addEquipId" text,
    "speEquipId" text,
    "consumableId" text,
    "activityId" text
);


ALTER TABLE public.recipe OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16473)
-- Name: recipe_ingredient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_ingredient (
    id text NOT NULL,
    type text NOT NULL,
    count integer NOT NULL,
    "itemId" text,
    "recipeId" text NOT NULL
);


ALTER TABLE public.recipe_ingredient OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16508)
-- Name: reward; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reward (
    id text NOT NULL,
    type text NOT NULL,
    value integer NOT NULL,
    probability integer NOT NULL,
    "itemId" text,
    "taskId" text NOT NULL
);


ALTER TABLE public.reward OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16403)
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
-- TOC entry 259 (class 1259 OID 16702)
-- Name: simulator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.simulator (
    id text NOT NULL,
    name text NOT NULL,
    "visibilityType" text NOT NULL,
    details text,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);


ALTER TABLE public.simulator OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16583)
-- Name: skill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill (
    id text NOT NULL,
    "treeType" text NOT NULL,
    "posX" integer NOT NULL,
    "posY" integer NOT NULL,
    tier integer NOT NULL,
    name text NOT NULL,
    "isPassive" boolean NOT NULL,
    details text NOT NULL,
    "dataSources" text NOT NULL,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);


ALTER TABLE public.skill OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16590)
-- Name: skill_effect; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_effect (
    id text NOT NULL,
    condition text NOT NULL,
    "elementLogic" text NOT NULL,
    "chargingType" text NOT NULL,
    "distanceType" text NOT NULL,
    "targetType" text NOT NULL,
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


ALTER TABLE public.skill_effect OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16576)
-- Name: special_equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.special_equipment (
    name text NOT NULL,
    "baseDef" integer NOT NULL,
    modifiers text[],
    "itemId" text NOT NULL
);


ALTER TABLE public.special_equipment OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 16709)
-- Name: statistic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statistic (
    id text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "usageTimestamps" timestamp(3) without time zone[],
    "viewTimestamps" timestamp(3) without time zone[]
);


ALTER TABLE public.statistic OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16487)
-- Name: task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task (
    id text NOT NULL,
    lv integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    "npcId" text NOT NULL
);


ALTER TABLE public.task OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16501)
-- Name: task_require; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_require (
    id text NOT NULL,
    type text NOT NULL,
    count integer NOT NULL,
    "itemId" text,
    "taskId" text NOT NULL
);


ALTER TABLE public.task_require OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 16695)
-- Name: team; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team (
    id text NOT NULL,
    name text,
    "order" integer NOT NULL,
    gems text[]
);


ALTER TABLE public.team OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16389)
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "roleType" text NOT NULL
);

ALTER TABLE ONLY public."user" REPLICA IDENTITY FULL;


ALTER TABLE public."user" OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16548)
-- Name: weapon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weapon (
    name text NOT NULL,
    type text NOT NULL,
    "baseAbi" integer NOT NULL,
    stability integer NOT NULL,
    modifiers text[],
    "colorA" integer NOT NULL,
    "colorB" integer NOT NULL,
    "colorC" integer NOT NULL,
    "elementType" text,
    "itemId" text NOT NULL
);


ALTER TABLE public.weapon OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16611)
-- Name: weapon_enchantment_attributes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weapon_enchantment_attributes (
    id text NOT NULL,
    name text NOT NULL,
    modifiers text[],
    details text,
    "dataSources" text,
    "statisticId" text NOT NULL,
    "updatedByAccountId" text,
    "createdByAccountId" text
);


ALTER TABLE public.weapon_enchantment_attributes OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16431)
-- Name: world; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.world (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.world OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16452)
-- Name: zone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zone (
    id text NOT NULL,
    name text,
    "linkZone" text[],
    "rewardNodes" integer NOT NULL,
    "activityId" text,
    "addressId" text NOT NULL
);


ALTER TABLE public.zone OWNER TO postgres;

--
-- Data for Name: _BackRelation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_BackRelation" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _FrontRelation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_FrontRelation" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _additional_equipmentTocrystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_additional_equipmentTocrystal" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _additional_equipmentToimage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_additional_equipmentToimage" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _armorTocrystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_armorTocrystal" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _armorToimage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_armorToimage" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _avatarTocharacter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_avatarTocharacter" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _characterTocharacter_skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterTocharacter_skill" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _characterTocombo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterTocombo" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _characterToconsumable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_characterToconsumable" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _crystalTocustom_additional_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTocustom_additional_equipment" ("A", "B") FROM stdin;
defaultItemAddEquipCrystalAId	defaultCustomAddEquipId
defaultIteamAddEquipCrystalBId	defaultCustomAddEquipId
\.

--
-- Data for Name: _crystalTocustom_armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTocustom_armor" ("A", "B") FROM stdin;
defaultIteamArmorCrystalAId	defaultCustomArmorId
defaultItemArmorCrystalBId	defaultCustomArmorId
\.

--
-- Data for Name: _crystalTocustom_special_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTocustom_special_equipment" ("A", "B") FROM stdin;
defaultItemSpeEquipCrystalAId	defaultCustomSpeEquipId
defaultItemSpeCrystalBId	defaultCustomSpeEquipId
\.


--
-- Data for Name: _crystalTocustom_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTocustom_weapon" ("A", "B") FROM stdin;
defaultItemWeaponCrystalAId	defaultCustomWeaponId
defaultItemWeaponCrystalBId	defaultCustomWeaponId
\.

--
-- Data for Name: _crystalTospecial_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalTospecial_equipment" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _crystalToweapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_crystalToweapon" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _imageToweapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_imageToweapon" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _memberToteam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_memberToteam" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _mobTozone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_mobTozone" ("A", "B") FROM stdin;
\.

--
-- Data for Name: _simulatorToteam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_simulatorToteam" ("A", "B") FROM stdin;
\.

--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (id, type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state, "userId") FROM stdin;
cluhz95c5000078elg5r46i83	User	qq	591519722	\N	\N	\N	\N	\N	\N	\N	cluhz95c5000078elg5r46831
\.

--
-- Data for Name: account_create_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_create_data ("accountId") FROM stdin;
cluhz95c5000078elg5r46i83
\.

--
-- Data for Name: account_update_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_update_data ("accountId") FROM stdin;
cluhz95c5000078elg5r46i83
\.

--
-- Data for Name: activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity (id, name) FROM stdin;
\.

--
-- Data for Name: additional_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.additional_equipment (name, "baseDef", modifiers, "colorA", "colorB", "colorC", "itemId") FROM stdin;
defaultAddEquipId	10	{"maxMp + 300","cspd + 400","mPie + 20%"}	0	0	0	defaultIteamAddEquipId
\.

--
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address (id, name, type, x, y, "worldId") FROM stdin;
\.

--
-- Data for Name: armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.armor (name, "baseDef", modifiers, "colorA", "colorB", "colorC", "itemId") FROM stdin;
defaultArmor	10	{}	0	0	0	defaultItemArmor
\.

--
-- Data for Name: armor_enchantment_attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.armor_enchantment_attributes (id, name, modifiers, details, "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
\.

--
-- Data for Name: avatar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.avatar (id, name, type, modifiers, "playerId") FROM stdin;
\.

--
-- Data for Name: character; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."character" (id, name, lv, str, "int", vit, agi, dex, "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "addEquipId", "speEquipId", cooking, modifiers, "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "masterId", details, "statisticId", "imageId") FROM stdin;
defaultCharacterId	defaultCharacter	280	0	480	0	0	247	None	0	defaultCustomWeaponId	defaultCustomSubWeaponId	defaultCustomArmorId	defaultCustomAddEquipId	defaultCustomSpeEquipId	{}	{}					defaultPlayerId		defaultCharacterStatisticId	system
\.
--
-- Data for Name: character_skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.character_skill (id, lv, "isStarGem", "templateId") FROM stdin;
\.

--
-- Data for Name: combo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.combo (id, name, combo) FROM stdin;
\.

--
-- Data for Name: consumable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consumable (name, "itemId", type, "effectDuration", effects) FROM stdin;
\.

--
-- Data for Name: crystal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crystal (name, type, modifiers, "itemId") FROM stdin;
defaultAddEquipCrystalBId	AddEquipCrystal	{"distanceDamageBouns.short + 10%","maxHp + 30%","cr + 50%","maxMp - 100","armor.type == \\"Light\\" && pPie - 10%"}	defaultIteamAddEquipCrystalBId
defaultAddEquipCrystalAId	AddEuipCrystal	{"distanceDamageBonus.short + 12%","distanceDamageBonus.long + 6%","accuracy + 10%","aspd - 900","mainWeapon.type == \\"Migictool\\" && mspd + 5%","subWeapon.type == \\"Ninjutsuscroll\\" && pPie + 10%"}	defaultItemAddEquipCrystalAId
defaultSpeEquipCrystalAId	SpeEquipCrystal	{"mAtk + 9%","cspd + 9%","anticipate + 9%","mainWeapon.typ == \\"Rod\\" && aggro - 9%","subWeapon.type == \\"Shield\\" && aggro + 9%"}	defaultItemSpeEquipCrystalAId
defaultSpeEquipCrystalBId	SpeCrystal	{"dictanceDamageBouns.short + 9%","accuracy + 5%","maxMp + 200","maxHp - 300","cr - 7"}	defaultItemSpeCrystalBId
defaultWeaponCrystalAId	WeaponCrystal	{"mAtk + 8%","mPie + 20%","cspd - 16%"}	defaultItemWeaponCrystalAId
defaultWeaponCrystalBId	WeaponCrystal	{"mAtk + 10%","mPie + 7%","aggro - 11%","mDef - 30%"}	defaultItemWeaponCrystalBId
defaultArmorCrystalAId	ArmorCrystal	{"mAtk + 10%","int + 6%","cspd + 40%","ampr + 10%"}	defaultIteamArmorCrystalAId
defaultArmorCrystalBId	ArmorCrystal	{"pStabilitiy + 11%","str + 6%","vit + 6%","armor.type == \\"Light\\" && distanceDamageBouns.short + 11%","armor.type == \\"Light\\" && pStability - 5%","armor.type == \\"Heavy\\" && distanceDamageBouns.long + 11%","armor.type == \\"Heavy\\" && pStability - 5%"}	defaultItemArmorCrystalBId
\.

--
-- Data for Name: custom_additional_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_additional_equipment (id, name, def, "templateId", refinement, "masterId") FROM stdin;
defaultCustomAddEquipId	defaultCustomAddEquip	10	defaultIteamAddEquipId	15	defaultPlayerId
\.

--
-- Data for Name: custom_armor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_armor (id, name, def, type, "templateId", refinement, "enchantmentAttributesId", "masterId") FROM stdin;
defaultCustomArmorId	defaultCustomArmor	10		defaultItemArmor	0	\N	defaultPlayerId
\.


--
-- Data for Name: custom_pet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_pet (id, "templateId", "pStr", "pInt", "pVit", "pAgi", "pDex", str, "int", vit, agi, dex, "weaponType", "personaType", type, "weaponAtk", generation, "maxLv", "masterId") FROM stdin;
\.

--
-- Data for Name: custom_special_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_special_equipment (id, name, def, "templateId", refinement, "masterId") FROM stdin;
defaultCustomSpeEquipId	defaultCustomSpeEquip	10	defaultItemSpeEquipId	15	defaultPlayerId
\.

--
-- Data for Name: custom_weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_weapon (id, name, "baseAbi", stability, "extraAbi", "templateId", refinement, "enchantmentAttributesId", "masterId") FROM stdin;
defaultCustomWeaponId	defaultCustomWeapon	462	70	10	defaultItemWeaponId	15	\N	defaultPlayerId
defaultCustomSubWeaponId	defaultCustomSubWeapon	0	0	0	defaultItemSubWeaponId	0	\N	defaultPlayerId
\.

--
-- Data for Name: drop_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drop_item (id, "itemId", probability, "relatedPartType", "relatedPartInfo", "breakReward", "dropById") FROM stdin;
\.

--
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image (id, "dataUrl") FROM stdin;
system	
\.

--
-- Data for Name: item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.item (id, type, "dataSources", details, "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
defaultItemSubWeaponId	NinjutsuScroll			defaultItemSubWeaponStatisticId	\N	\N
defaultItemArmor	Liaght			defaultIteamArmorId	\N	\N
defaultIteamAddEquipId	AddEquip			defaultIteamAddEquiStatisticId	\N	\N
defaultItemSpeEquipId	SpeEquip			defaultItemSpeEquipStatisticId	\N	\N
defaultItemAddEquipCrystalAId	AddEquipCrystal			defaultItemAddEquipCrystalAStatisticId	\N	\N
defaultIteamAddEquipCrystalBId	AddEquipCrystal			defaultItemAddEquipCrystalBStatisticId	\N	\N
defaultItemSpeEquipCrystalAId	SpeEquipCrystal			defaultItemSpeEquipCrystalAStatisticId	\N	\N
defaultItemWeaponId	Magictool			defaultItemWeaponStatisticId	\N	\N
defaultItemSpeCrystalBId	SpeEquipCrystal			defaultItemSpeEquipCrystalBStatisticId	\N	\N
defaultItemWeaponCrystalAId	WeaponCrystal			defaultItemWeaponCrystalAStatisticId	\N	\N
defaultItemWeaponCrystalBId	WeaponCrystal			defaultItemWeaponCrystalBStatisticId	\N	\N
defaultIteamArmorCrystalAId	ArmorCrystal			defaultItemArmorCrystalAStatisticId	\N	\N
defaultItemArmorCrystalBId	ArmorCrystal			defaultItemArmorCrystalBStatisticId	\N	\N
\.

--
-- Data for Name: kill_requirement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kill_requirement (id, "mobId", count, "taskId") FROM stdin;
\.

--
-- Data for Name: material; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.material (name, "itemId", type, "ptValue", price) FROM stdin;
\.

--
-- Data for Name: member; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.member (id, "order", "playerId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag") FROM stdin;
\.

--
-- Data for Name: mercenary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mercenary (type, "templateId", "skillAId", "skillAType", "skillBId", "skillBType") FROM stdin;
\.

--
-- Data for Name: mob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mob (id, name, type, captureable, "baseLv", experience, "partsExperience", "elementType", radius, maxhp, "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", avoidance, dodge, block, "normalAttackResistanceModifier", "physicalAttackResistanceModifier", "magicalAttackResistanceModifier", actions, details, "dataSources", "statisticId", "imageId", "updatedByAccountId", "createdByAccountId") FROM stdin;
clv6we81i001nwv1ftd6jymzi	奥克拉辛	Boss	f	226	21100	0	Dark	1	0	987	30	987	30	30	338	0	0	0	5	5	{}	部位被破坏时，降低抗性与防御	fengli	15	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wik7s001pwv1fkf2t5c6z	犰尔达	Boss	f	229	25000	0	Earth	1	5500000	1717	39	1717	39	40	343	0	30	0	1	5	{}	部位被破坏时，降低抗性与防御	fengli	14	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vznrs001hwv1f78z595uu	兵龙达鲁巴	Boss	f	217	16700	0	Earth	1	0	596	8	705	8	40	487	5	35	0	5	10	{}	部位被破坏时，格挡率会降低。	fengli	17	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xawyo001vwv1fcicqcor2	欺龙米缪加	Boss	f	238	22600	0	Earth	1	0	2620	9	2620	9	35	357	0	5	0	10	15	{}	部位被破坏后，防御力降低。	fengli	11	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ydapf0029wv1fz5zss4fd	尉龙鲁迪斯	Boss	f	259	24600	0	Earth	1	0	647	10	906	10	35	388	0	10	0	5	5	{}	部位受到破坏时，解除昏厥免疫	fengli	4	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vraf5001dwv1f0mm86k44	岩龙菲尔岑	Boss	f	211	15150	0	Earth	1	3171000	1055	8	739	8	20	316	2	8	0	10	20	{}	被破坏部位后防御力会降低，并能释放更多种类的技能	fengli	3	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6x7ebl001twv1fnhnoc8ln	灼龙伊戈涅乌斯	Boss	f	235	20800	0	Fire	1	0	823	9	823	9	20	350	1	1	0	15	20	{}	血量降低至50%以后，抗性增加，并在一段时间免疫控制。	fengli	12	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6w6zqu001jwv1fq5r6q9dv	炎龙布兰玛	Boss	f	220	16700	0	Fire	1	5600000	880	8	880	8	30	412	7	0	0	10	15	{}	血量越低，抗性与防御越低	fengli	1	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv93ha6000fu048qq11zx9y	伊科诺斯	Boss	f	108	4200	0	Earth	1	0	162	10	140	10	0	162	0	10	0	0	0	{}	血量每下降33%，防御能力会发生变化	fengli	63	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wmh4w001rwv1f8aa3u6vh	护卫魔像	Boss	f	232	38000	0	Normal	1	0	1160	25	1160	25	20	418	0	25	0	0	0	{}	血量低于50%以后切换形态；红色形态的回血期间受到麻痹会被打断。	fengli	13	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6uxjlm000xwv1fb3g0tjv4	薇芮娜·超柯尔连生体	Boss	f	195	57000	0	Fire	1	0	819	7	585	7	5	438	6	0	0	1	5	{}	经验值包括柱子。一阶段受到翻覆后获得高额减伤；三阶段受到翻覆后会在自身脚下释放漩涡。	fengli	24	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vjtv30019wv1fcyunhqls	雷丽莎	Boss	f	210	26200	0	Dark	1	0	420	8	630	8	30	630	5	5	0	1	10	{}	第二阶段血量降低至50%以下后，暴击抗性提高至500	fengli	20	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6uoufi000twv1fal4xlw5j	魔晶鹫	Boss	f	190	27200	0	Dark	1	0	523	7	618	7	15	428	10	5	0	5	5	{}	第二阶段属性会变为风属性	fengli	28	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvgvr59000pu048jlo772t4	热带梦貘	Boss	f	120	7800	0	Normal	1	7813000	144	4	168	4	0	360	5	5	0	25	40	{}	睡着了会回血	fengli	57	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xdtcv001xwv1ft4jvd8r1	丝岩比尔	Boss	f	241	24400	0	Fire	1	0	361	9	723	9	55	541	0	0	0	0	0	{}	生命值高于50%时，免疫胆怯	fengli	10	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6tmq9x000hwv1fu7b0bmsr	库斯特	Boss	f	178	18200	0	Earth	1	0	534	7	534	7	25	267	5	5	0	5	5	{}	生命值每降低33%切换一阶段。每次切换阶段会进行召唤，可用控制打断。	fengli	33	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vo2mo001bwv1f0vxczx5u	晶玛体	Boss	f	208	14080	0	Fire	1	0	728	16	728	16	20	468	3	3	0	5	10	{}	每降低25%最大生命值，会进入一段时间的高抗性状态，受到：昏厥、麻痹、着火会解除该状态。	fengli	19	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y70u50025wv1fqyhsjcz9	多米纳雷多尔	Boss	f	253	32500	0	Dark	1	0	1265	50	1265	50	30	450	5	20	0	1	15	{}	每失去一个球，双抗降低10%，并降低闪躲率和格挡率	fengli	6	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v4ws60011wv1f5ztq57so	恶灵巨蛛	Boss	f	196	11600	0	Dark	1	0	511	7	392	7	0	353	4	4	0	20	20	{}	最后阶段飞天开始向后位移时可以被控制。	fengli	25	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvi2py9001lu048nvjh3joe	漂漂妈	Boss	f	151	12400	0	Water	1	0	226	6	271	6	0	226	5	0	0	15	20	{}	无	fengli	101	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5luln000b11my87rwbzsk	米诺陶诺斯	Boss	f	32	420	0	Wind	1	0	48	1	48	1	0	48	4	0	0	5	5	{}	无	fengli	100	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5v02h000f11myc5ylpafa	迪赛尔蛮龙	Boss	f	40	560	0	Earth	1	0	20	1	20	1	0	75	0	9	0	15	15	{}	无	fengli	99	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui66v15000j11myurfawvy9	遗迹魔像	Boss	f	45	660	0	Earth	1	0	106	1	106	1	0	14	0	50	0	15	15	{}	无	fengli	98	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui69tqk000l11mygtkum8iv	弗雷帝亚	Boss	f	49	1480	0	Wind	1	0	24	1	24	1	0	292	10	0	0	10	5	{}	无	fengli	97	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6d9hj000n11mydvgshlcp	焰狼沃格	Boss	f	50	1500	0	Fire	1	0	100	2	100	2	0	56	30	0	0	25	50	{}	无	fengli	96	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6iio3000p11my11qq7s9z	亚思托	Boss	f	50	760	0	Water	1	0	50	1	150	1	0	112	15	0	0	25	1	{}	无	fengli	95	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui6r7n8000r11myjtveczlw	黏液怪	Boss	f	52	1400	0	Water	1	0	78	12	78	12	0	0	0	50	0	5	5	{}	无	fengli	94	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui589ck000311my0p5bgm0o	出土魔像	Boss	f	16	90	0	Normal	1	3150	12	0	12	0	0	12	0	10	0	15	15	{}	无	fengli	93	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7cvao001111myok0n3ps3	獠牙王	Boss	f	62	3000	0	Normal	1	0	62	2	62	2	0	279	4	8	0	10	10	{}	无	fengli	92	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui74bi7000t11my1qhbbgjc	马维兹	Boss	f	55	1290	0	Water	1	0	165	7	165	7	0	41	3	30	0	10	5	{}	无	fengli	91	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluozah5r0000ijciwqr8rbg2	上古女帝	Boss	f	64	3120	0	Light	1	0	32	52	32	52	0	48	1	8	0	10	10	{}	无	fengli	86	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5a9ql000511my8n0qi7kh	幽灵兵甲	Boss	f	20	240	0	Dark	1	8544	26	0	50	0	0	30	0	0	0	30	10	{}	无	fengli	85	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5oygi000d11mympx04zbv	哥布林老大	Boss	f	40	560	0	Fire	1	0	40	0	40	0	0	75	0	9	0	10	5	{}	无	fengli	84	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5ckiy000711my8nvvvsoc	诡谲的结晶	Boss	f	24	255	0	Dark	1	0	0	0	0	0	0	0	0	4	0	5	15	{}	无	fengli	83	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7972v000x11mygbn4skgm	狂暴龙	Boss	f	60	960	0	Earth	1	0	60	2	60	2	0	45	0	0	0	1	1	{}	无	fengli	82	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui765bp000v11myatj0el9t	甘瑞夫	Boss	f	58	1150	0	Earth	1	0	232	1	58	1	0	43	0	23	0	25	1	{}	无	fengli	81	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusd5unt000011x4y11ayyhe	哥布林大哥	Boss	f	70	2400	0	Fire	1	0	140	1	210	1	0	157	4	0	0	10	20	{}	无	fengli	80	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdj1sy000311x4kncp7jb3	奴雷德斯	Boss	f	76	5360	0	Dark	1	0	152	23	152	23	0	57	0	13	0	2	3	{}	无	fengli	77	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdojrh000511x43obnruzj	葛瓦	Boss	f	82	5000	0	Normal	1	0	41	3	41	3	0	246	5	5	0	10	10	{}	无	fengli	75	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdr2hb000611x4c0fujm0s	魔形机壳	Boss	f	85	7900	0	Dark	1	0	255	3	255	3	0	64	0	5	0	1	1	{}	无	fengli	74	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdtmw9000711x4k88rg3j7	虚假黑骑士	Boss	f	88	6600	0	Dark	1	0	176	23	176	23	0	231	12	2	0	30	30	{}	无	fengli	73	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdwmh4000811x43ejfjs8y	魔晶兽	Boss	f	91	6300	0	Dark	1	0	274	3	320	3	0	136	0	25	0	30	35	{}	无	fengli	72	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluse9wij000a11x4unrim046	黑暗骑士因扎尼奥	Boss	f	94	5500	0	Water	1	4890000	212	3	188	3	0	176	3	10	0	35	15	{}	无	fengli	71	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8eh550003u048e76ibdxs	佐尔班	Boss	f	95	3900	0	Wind	1	2440000	196	3	392	3	0	588	6	0	0	1	1	{}	无	fengli	69	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8ijit0005u048knmhxyp9	薄暮巨龙	Boss	f	100	8000	0	Normal	1	0	180	4	260	4	0	255	6	12	0	20	30	{}	无	fengli	68	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8pnax0007u048t9c16ckd	红晶魔蛛	Boss	f	100	4400	0	Earth	1	0	140	4	110	4	0	300	5	10	0	20	15	{}	无	fengli	67	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluqevnyg0009pzxgc2vnj27i	蒙面战士	Boss	f	67	4300	0	Fire	1	0	134	2	134	2	0	200	4	4	0	25	25	{}	无	fengli	66	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8t0860009u048a24icquk	嗜人蝎狮	Boss	f	100	14400	0	Normal	1	0	220	4	242	4	0	248	3	9	0	20	40	{}	无	fengli	65	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv8uzts000bu048su2ccp8x	魔晶炮手	Boss	f	103	7610	0	Normal	1	0	216	4	247	4	0	123	1	20	0	40	50	{}	无	fengli	64	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv90elr000du048hics57c5	战将复制体	Boss	f	106	8700	0	Fire	1	7800000	371	20	392	15	0	238	0	20	0	35	35	{}	无	fengli	62	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv969jf000hu048anlwmncr	格雷西亚复制体	Boss	f	109	8150	0	Fire	1	0	164	35	218	35	0	302	5	5	0	35	40	{}	无	fengli	61	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvahldr000lu048n8tnj407	机甲狮将	Boss	f	115	6250	0	Earth	1	0	161	4	138	4	0	275	10	5	0	0	0	{}	无	fengli	60	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvgo77p000nu048109v4tal	约克	Boss	f	118	6800	0	Normal	1	0	295	4	118	4	0	275	10	5	0	40	0	{}	无	fengli	59	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv98k6v000ju048zq3nfgym	合成魔兽	Boss	f	112	6000	0	Fire	1	0	179	4	158	4	0	185	5	5	0	30	15	{}	无	fengli	58	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh0ial000ru048060ee4vn	半魔像暴君	Boss	f	121	8400	0	Normal	1	0	61	4	61	4	0	543	6	10	0	10	10	{}	无	fengli	56	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh2f6u000tu0488nxl4vy8	龙兽半魔像	Boss	f	124	12240	0	Normal	1	0	248	15	372	15	0	186	2	20	0	50	50	{}	无	fengli	55	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh7gh1000xu0487ukrqnob	扎哈克半魔像	Boss	f	130	6000	0	Light	1	0	1000	5	1000	5	0	0	5	10	0	2	1	{}	无	fengli	54	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvh4hnn000vu048647dpkg4	妖精兽拉瓦达	Boss	f	127	6000	0	Light	1	0	381	15	445	15	0	228	2	7	0	30	40	{}	无	fengli	53	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvha2u2000zu04891jyz3wc	重装魔偶·蓝	Boss	f	133	6200	0	Wind	1	0	399	80	0	80	0	299	0	0	0	5	5	{}	无	fengli	52	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhbmid0011u048wsgycyt1	重装魔偶·黄	Boss	f	133	6200	0	Wind	1	0	399	55	0	55	0	299	0	0	0	5	5	{}	无	fengli	51	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhcvnx0013u048kumee5cx	重装魔偶·红	Boss	f	133	6200	0	Normal	1	0	399	30	0	30	0	299	0	0	0	5	5	{}	无	fengli	50	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhfck00015u048idz8xt7f	怪穆尔	Boss	f	136	8100	0	Earth	1	0	204	5	204	5	25	204	5	15	0	1	2	{}	无	fengli	49	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhh45f0017u048xpsrfz4d	终极半魔像	Boss	f	139	10500	0	Normal	1	0	417	10	417	10	15	208	0	9	0	30	15	{}	无	fengli	48	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhlw78001bu0484mat8wmw	剑型曼特恩	Boss	f	143	11000	0	Wind	1	0	400	15	500	15	0	428	0	0	0	5	5	{}	无	fengli	47	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhnyrp001du0482l4o8sdg	香菇咪	Boss	f	145	7300	0	Water	1	0	261	5	290	5	0	434	11	0	0	20	25	{}	无	fengli	46	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhplet001fu048asp0pkgn	结晶泰坦	Boss	f	148	9300	0	Dark	1	0	592	25	448	25	0	111	0	9	0	30	25	{}	无	fengli	45	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhk34o0019u0488ip7hlko	奥恩拉夫	Boss	f	142	8700	0	Light	1	9500000	107	5	710	5	30	692	15	5	0	1	1	{}	无	fengli	44	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhx0r9001hu048vx81qiei	薇芮娜·柯尔连生体	Boss	f	150	30000	0	Fire	1	0	300	6	200	6	0	75	0	7	0	10	5	{}	无	fengli	43	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluvhzf33001ju048wrkhjt2r	柱状·柯尔连生体	Boss	f	145	9300	0	Dark	1	0	290	5	290	5	0	109	0	7	0	5	20	{}	无	fengli	42	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ka17y0001wv1fy5sj57bv	齐尔布兹	Boss	f	154	11100	0	Light	1	1600000	539	6	462	6	10	116	10	10	0	20	20	{}	无	fengli	41	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kgpjy0003wv1f2yl2xszc	马尔杜拉	Boss	f	157	8100	0	Light	1	0	157	6	393	6	10	470	15	1	0	5	5	{}	无	fengli	40	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kuovw0005wv1fex3b30tk	泽雷萨乌迦	Boss	f	160	15300	0	Light	1	0	320	6	320	6	25	240	10	10	0	10	20	{}	无	fengli	39	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6kyheu0007wv1f5wpb3zv4	皮多大王	Boss	f	163	12000	0	Water	1	0	789	15	244	15	10	122	5	20	0	30	30	{}	无	fengli	38	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6nykby000dwv1f0psvbizc	魔蚀皮鲁兹	Boss	f	172	0	0	Fire	1	0	602	26	498	26	20	258	1	0	0	20	5	{}	无	fengli	35	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6th6cu000fwv1fje7s1gmj	结晶兽	Boss	f	175	20200	0	Dark	1	0	437	7	437	7	10	655	2	0	0	5	5	{}	无	fengli	34	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ttfvh000jwv1fczqjwzxb	扎菲洛加	Boss	f	181	20270	0	Dark	1	3800000	315	7	315	7	20	135	0	10	0	5	10	{}	无	fengli	31	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6usbws000vwv1f8l91l44n	皮斯泰乌鱼	Boss	f	193	11300	0	Water	1	0	386	7	482	7	0	433	8	0	0	10	15	{}	无	fengli	27	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v144a000zwv1frhv71fxi	王座柯尔连生体	Boss	f	190	0	0	Normal	1	0	665	7	475	7	25	285	0	6	0	5	20	{}	无	fengli	26	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y9m8z0027wv1fu3g36iei	萨波	Boss	f	256	22100	0	Water	1	0	896	10	640	10	30	576	10	5	0	5	10	{}	无	fengli	5	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6ubaz1000pwv1fgzxpbjxd	魔人库维扎	Boss	f	185	40500	0	Dark	1	0	925	7	925	7	25	415	5	0	0	5	5	{}	无	fengli	2	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdaqt3000111x4pvyfke02	石柱魔像	Boss	f	70	3600	0	Earth	1	0	140	2	140	2	0	11	0	30	0	25	25	{}	掉落的盾牌挺好看的	fengli	79	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui643uc000h11mywjwinn7i	毛咕噜	Boss	f	43	620	0	Wind	1	0	0	1	0	1	0	64	12	0	0	100	5	{}	掉的帽子挺好看的	fengli	88	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6wboec001lwv1ftpa30r93	威琉魔	Boss	f	223	20600	0	Normal	1	0	892	8	892	8	25	334	0	30	5	5	10	{}	按距离变色，紫色抗性增加	fengli	16	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vcla70015wv1f003qb6ks	塔利结晶兽	Boss	f	202	13420	0	Wind	1	0	606	8	606	8	20	303	10	1	0	5	25	{}	开局释放天火和风刃完毕前，暴击抗性为100	fengli	22	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui5gbc3000911my2wys3fo7	森林巨狼	Boss	f	30	300	0	Wind	1	0	30	0	30	0	0	45	0	6	0	20	10	{}	巨大的狼	fengli	90	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xkuou001zwv1fvj8ksq3a	恶龙法奇诺	Boss	f	244	25870	0	Dark	1	6100000	488	9	854	9	40	367	0	5	0	1	1	{}	小怪存在时，限制伤害，无法被昏厥、翻覆	fengli	9	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdm1jk000411x4v1xuk3ay	翡翠鸟	Boss	f	79	8400	0	Wind	1	0	158	3	198	3	0	177	0	50	0	40	40	{}	受控后一段时间内闪躲率提升	fengli	76	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6y2u4t0023wv1f6o35glva	乐龙雷多尔基	Boss	f	250	28900	0	Normal	1	7000000	500	10	875	10	35	375	0	0	0	3	5	{}	受到翻覆后会反击（即使翻覆由boss自身的技能施加）	fengli	7	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clusdg36i000211x4tyfrqovq	草龙耶弗	Boss	f	74	5040	0	Earth	1	0	146	2	219	2	0	87	0	30	0	100	100	{}	受到的单次伤害过高时会提高自身抗性，可以对其施加麻痹等异常接触	fengli	78	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
cluv7thfi000764bckwgsirxk	地狱三头犬	Boss	f	97	9220	0	Dark	1	0	146	3	146	3	0	255	6	12	0	20	30	{}	受到控制后会改变自身属性	fengli	70	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6um51d000rwv1f4aqjbn5m	伏地蛇	Boss	f	187	24760	0	Dark	1	0	467	7	467	7	25	336	0	0	0	5	5	{}	受到单次伤害超过一定值以后会改变自身属性，提高暴击抗性并限制自身受到的伤害额度。60%血以上时变属为火属性；60%以下变为无属性。	fengli	29	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vgjhg0017wv1fkdtn4tb8	移儡原生质体	Boss	f	205	14460	0	Normal	1	0	922	8	307	8	100	307	0	25	0	1	1	{}	受到冰冻后，暴击抗性降低为零；生命值降低至75%以下时，属性变为风属性	fengli	21	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6v9cog0013wv1f6vymc7ea	黑影	Boss	f	199	12500	0	Dark	1	0	398	7	597	7	10	298	4	4	0	10	10	{}	受到伤害累计超过一定值后属性变更为火属性。	fengli	23	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6vuo5d001fwv1fg5wuac1z	卒龙灾比欧	Boss	f	214	16200	0	Normal	1	0	642	8	535	8	20	642	10	0	0	10	5	{}	单次伤害超过50万会召唤小怪。	fengli	18	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6l4vfl0009wv1f55hypfwe	暗龙费因斯坦	Boss	f	166	14000	0	Dark	1	0	246	6	249	6	0	25	1	1	0	1	10	{}	半血后获得高额暴击抗性，受到控制后可解除一段时间	fengli	36	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6l98a5000bwv1fn2zs6knp	修斯古巨兽	Boss	f	169	13300	0	Earth	1	0	422	6	263	6	0	253	4	0	0	5	20	{}	半血后增加对物理、魔法伤害的暴击抗性	fengli	37	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui55nha000111myotjx9ia0	科隆老大	Boss	f	10	30	0	Earth	1	1000	7	0	7	0	0	11	0	0	0	10	10	{}	劳大	fengli	87	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6xtcs70021wv1fnuz01uwx	伽拉木瓦	Boss	f	247	26400	0	Wind	1	6260000	494	9	988	9	35	444	10	0	0	10	5	{}	仇恨目标距离太远时，会转移到地图右侧，并暂时无敌。	fengli	8	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6u8d9t000nwv1fjbmbyohh	佛拉布喇·远	Boss	f	184	19190	0	Normal	1	5150000	184	7	736	21	0	552	21	0	0	100	100	{}	仇恨值目标在7m外时的状态	fengli	30	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clv6u40id000lwv1fw2chusr7	佛拉布喇·近	Boss	f	184	19190	0	Normal	1	5150000	552	21	184	7	0	276	0	14	0	100	100	{}	仇恨值目标7m内时的状态	fengli	32	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
clui7ar0n000z11my9mm10x0r	恶魔之门	Boss	f	60	1440	0	Dark	1	0	180	2	180	2	0	0	0	0	0	1	1	{}	不会动	fengli	89	system	cluhz95c5000078elg5r46i83	cluhz95c5000078elg5r46i83
\.

--
-- Data for Name: npc; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.npc (id, name, "imageId", "zoneId") FROM stdin;
\.

--
-- Data for Name: player; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player (id, name, "useIn", actions, "accountId") FROM stdin;
defaultPlayerId	defaultPlayer		{}	cluhz95c5000078elg5r46i83
\.

--
-- Data for Name: post; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post (id, name, "createdAt", "updatedAt", "createdById") FROM stdin;
\.

--
-- Data for Name: recipe; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe (id, "weaponId", "armorId", "addEquipId", "speEquipId", "consumableId", "activityId") FROM stdin;
\.

--
-- Data for Name: recipe_ingredient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe_ingredient (id, type, count, "itemId", "recipeId") FROM stdin;
\.

--
-- Data for Name: reward; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reward (id, type, value, probability, "itemId", "taskId") FROM stdin;
\.

--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (id, "sessionToken", expires, "accountId") FROM stdin;
\.

--
-- Data for Name: simulator; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.simulator (id, name, "visibilityType", details, "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
\.

--
-- Data for Name: skill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill (id, "treeType", "posX", "posY", tier, name, "isPassive", details, "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
\.

--
-- Data for Name: skill_effect; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skill_effect (id, condition, "elementLogic", "chargingType", "distanceType", "targetType", "castingRange", "effectiveRange", "motionFixed", "motionModified", "chantingFixed", "chantingModified", "reservoirFixed", "reservoirModified", "startupFrames", cost, description, logic, details, "belongToskillId") FROM stdin;
\.
--
-- Data for Name: special_equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.special_equipment (name, "baseDef", modifiers, "itemId") FROM stdin;
defaultSpeEquip	10	{"mPie + 10%"}	defaultItemSpeEquipId
\.

--
-- Data for Name: statistic; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statistic (id, "updatedAt", "createdAt", "usageTimestamps", "viewTimestamps") FROM stdin;
0	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
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
102	2024-04-11 07:47:29.523	2024-04-11 07:47:29.523	\N	\N
defaultItemSubWeaponStatisticId	2025-03-02 03:06:14.848	1970-01-01 00:00:00	{}	{}
defaultIteamArmorId	2025-03-02 03:36:19.603	1970-01-01 00:00:00	{}	{}
defaultIteamAddEquiStatisticId	2025-03-02 03:45:16.235	1970-01-01 00:00:00	{}	{}
defaultItemSpeEquipStatisticId	2025-03-02 03:49:51.4	1970-01-01 00:00:00	{}	{}
defaultCharacterStatisticId	2025-03-02 03:52:23.927	1970-01-01 00:00:00	{}	{}
defaultItemAddEquipCrystalAStatisticId	2025-03-02 04:47:12.528	1970-01-01 00:00:00	{}	{}
defaultItemAddEquipCrystalBStatisticId	2025-03-02 05:00:33.761	1970-01-01 00:00:00	{}	{}
defaultItemSpeEquipCrystalAStatisticId	2025-03-02 05:06:38.293	1970-01-01 00:00:00	{}	{}
defaultItemWeaponCrystalAStatisticId	2025-03-02 05:07:46.559	1970-01-01 00:00:00	{}	{}
defaultItemWeaponCrystalBStatisticId	2025-03-02 05:08:20.928	1970-01-01 00:00:00	{}	{}
defaultItemWeaponStatisticId	2025-03-02 05:12:29.109	1970-01-01 00:00:00	{}	{}
defaultItemSpeEquipCrystalBStatisticId	2025-03-02 05:12:29.109	1970-01-01 00:00:00	{}	{}
defaultItemArmorCrystalAStatisticId	2025-03-02 05:33:28.07	1970-01-01 00:00:00	{}	{}
defaultItemArmorCrystalBStatisticId	2025-03-02 05:33:55.82	1970-01-01 00:00:00	{}	{}
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task (id, lv, name, type, description, "npcId") FROM stdin;
\.
--
-- Data for Name: task_require; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_require (id, type, count, "itemId", "taskId") FROM stdin;
\.

--
-- Data for Name: team; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team (id, name, "order", gems) FROM stdin;
\.

--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, email, "emailVerified", image, "roleType") FROM stdin;
cluhz95c5000078elg5r46831	KiaClouth	clouthber@gmail.com	2024-04-28 03:57:29.629	\N	USER
clwu10qok00056vladmyfmmrb	大尾巴猪	\N	\N	http://thirdqq.qlogo.cn/ek_qqapp/AQKK7RCI3eMNSh6ssAiaxqmX3ls8icMO7lQZog5gkyOLhzR42o6SyF6bMgBz1QECxRVOSoxodF/40	USER
cluj6sptk0000e10ge9wetfz8	KiaClouth	591519722@qq.com	2024-04-11 07:47:29.523	\N	USER
clujlndnd0000zkw9d9qfsmgz	KiaClouth	mayunlong16@foxmail.com	2024-04-07 10:46:23.639	\N	USER
\.

--
-- Data for Name: weapon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weapon (name, type, "baseAbi", stability, modifiers, "colorA", "colorB", "colorC", "elementType", "itemId") FROM stdin;
defaultWeapon	MigicTool	462	70	{"element = light","stro.normal + 25%","pAtk + 6%","mAtk + 12%","cr + 60","anticipate + 60%","pRes + 30%","mRes + 30%","ailmentResistance + 15%","weaponRange - 3"}	0	0	0	Normal	defaultItemWeaponId
defaultSubWeapon	Ninjutsuscroll	0	0	{"aspd + 250"}	0	0	0	\N	defaultItemSubWeaponId
\.

--
-- Data for Name: weapon_enchantment_attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weapon_enchantment_attributes (id, name, modifiers, details, "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId") FROM stdin;
\.

--
-- Data for Name: world; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.world (id, name) FROM stdin;
\.

--
-- Data for Name: zone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zone (id, name, "linkZone", "rewardNodes", "activityId", "addressId") FROM stdin;
\.

--
-- Name: _BackRelation _BackRelation_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_BackRelation"
    ADD CONSTRAINT "_BackRelation_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3624 (class 2606 OID 16736)
-- Name: _FrontRelation _FrontRelation_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_FrontRelation"
    ADD CONSTRAINT "_FrontRelation_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3654 (class 2606 OID 16806)
-- Name: _additional_equipmentTocrystal _additional_equipmentTocrystal_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentTocrystal"
    ADD CONSTRAINT "_additional_equipmentTocrystal_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3657 (class 2606 OID 16813)
-- Name: _additional_equipmentToimage _additional_equipmentToimage_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentToimage"
    ADD CONSTRAINT "_additional_equipmentToimage_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3648 (class 2606 OID 16792)
-- Name: _armorTocrystal _armorTocrystal_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorTocrystal"
    ADD CONSTRAINT "_armorTocrystal_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3651 (class 2606 OID 16799)
-- Name: _armorToimage _armorToimage_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorToimage"
    ADD CONSTRAINT "_armorToimage_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3660 (class 2606 OID 16820)
-- Name: _avatarTocharacter _avatarTocharacter_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_avatarTocharacter"
    ADD CONSTRAINT "_avatarTocharacter_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3663 (class 2606 OID 16827)
-- Name: _characterTocharacter_skill _characterTocharacter_skill_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocharacter_skill"
    ADD CONSTRAINT "_characterTocharacter_skill_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3669 (class 2606 OID 16841)
-- Name: _characterTocombo _characterTocombo_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocombo"
    ADD CONSTRAINT "_characterTocombo_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3666 (class 2606 OID 16834)
-- Name: _characterToconsumable _characterToconsumable_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3639 (class 2606 OID 16771)
-- Name: _crystalTocustom_additional_equipment _crystalTocustom_additional_equipment_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_additional_equipment"
    ADD CONSTRAINT "_crystalTocustom_additional_equipment_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3636 (class 2606 OID 16764)
-- Name: _crystalTocustom_armor _crystalTocustom_armor_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_armor"
    ADD CONSTRAINT "_crystalTocustom_armor_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3645 (class 2606 OID 16785)
-- Name: _crystalTocustom_special_equipment _crystalTocustom_special_equipment_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_special_equipment"
    ADD CONSTRAINT "_crystalTocustom_special_equipment_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3633 (class 2606 OID 16757)
-- Name: _crystalTocustom_weapon _crystalTocustom_weapon_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_weapon"
    ADD CONSTRAINT "_crystalTocustom_weapon_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3642 (class 2606 OID 16778)
-- Name: _crystalTospecial_equipment _crystalTospecial_equipment_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial_equipment"
    ADD CONSTRAINT "_crystalTospecial_equipment_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3630 (class 2606 OID 16750)
-- Name: _crystalToweapon _crystalToweapon_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToweapon"
    ADD CONSTRAINT "_crystalToweapon_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3678 (class 2606 OID 16862)
-- Name: _imageToweapon _imageToweapon_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_imageToweapon"
    ADD CONSTRAINT "_imageToweapon_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3672 (class 2606 OID 16848)
-- Name: _memberToteam _memberToteam_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_memberToteam"
    ADD CONSTRAINT "_memberToteam_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3621 (class 2606 OID 16729)
-- Name: _mobTozone _mobTozone_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_mobTozone"
    ADD CONSTRAINT "_mobTozone_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3675 (class 2606 OID 16855)
-- Name: _simulatorToteam _simulatorToteam_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_simulatorToteam"
    ADD CONSTRAINT "_simulatorToteam_AB_pkey" PRIMARY KEY ("A", "B");


--
-- TOC entry 3522 (class 2606 OID 16423)
-- Name: account_create_data account_create_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_create_data
    ADD CONSTRAINT account_create_data_pkey PRIMARY KEY ("accountId");


--
-- TOC entry 3513 (class 2606 OID 16402)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- TOC entry 3524 (class 2606 OID 16430)
-- Name: account_update_data account_update_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_update_data
    ADD CONSTRAINT account_update_data_pkey PRIMARY KEY ("accountId");


--
-- TOC entry 3528 (class 2606 OID 16444)
-- Name: activity activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- TOC entry 3572 (class 2606 OID 16575)
-- Name: additional_equipment additional_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT additional_equipment_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3530 (class 2606 OID 16451)
-- Name: address address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_pkey PRIMARY KEY (id);


--
-- TOC entry 3569 (class 2606 OID 16568)
-- Name: armor_enchantment_attributes armor_enchantment_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor_enchantment_attributes
    ADD CONSTRAINT armor_enchantment_attributes_pkey PRIMARY KEY (id);


--
-- TOC entry 3567 (class 2606 OID 16561)
-- Name: armor armor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor
    ADD CONSTRAINT armor_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3600 (class 2606 OID 16666)
-- Name: avatar avatar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar
    ADD CONSTRAINT avatar_pkey PRIMARY KEY (id);


--
-- TOC entry 3603 (class 2606 OID 16673)
-- Name: character character_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT character_pkey PRIMARY KEY (id);


--
-- TOC entry 3594 (class 2606 OID 16645)
-- Name: character_skill character_skill_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.character_skill
    ADD CONSTRAINT character_skill_pkey PRIMARY KEY (id);


--
-- TOC entry 3598 (class 2606 OID 16659)
-- Name: combo combo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combo
    ADD CONSTRAINT combo_pkey PRIMARY KEY (id);


--
-- TOC entry 3581 (class 2606 OID 16603)
-- Name: consumable consumable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT consumable_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3563 (class 2606 OID 16546)
-- Name: crystal crystal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT crystal_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3590 (class 2606 OID 16631)
-- Name: custom_additional_equipment custom_additional_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_additional_equipment
    ADD CONSTRAINT custom_additional_equipment_pkey PRIMARY KEY (id);


--
-- TOC entry 3588 (class 2606 OID 16624)
-- Name: custom_armor custom_armor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_armor
    ADD CONSTRAINT custom_armor_pkey PRIMARY KEY (id);


--
-- TOC entry 3596 (class 2606 OID 16652)
-- Name: custom_pet custom_pet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_pet
    ADD CONSTRAINT custom_pet_pkey PRIMARY KEY (id);


--
-- TOC entry 3592 (class 2606 OID 16638)
-- Name: custom_special_equipment custom_special_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_special_equipment
    ADD CONSTRAINT custom_special_equipment_pkey PRIMARY KEY (id);


--
-- TOC entry 3583 (class 2606 OID 16610)
-- Name: custom_weapon custom_weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_weapon
    ADD CONSTRAINT custom_weapon_pkey PRIMARY KEY (id);


--
-- TOC entry 3561 (class 2606 OID 16538)
-- Name: drop_item drop_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drop_item
    ADD CONSTRAINT drop_item_pkey PRIMARY KEY (id);


--
-- TOC entry 3619 (class 2606 OID 16722)
-- Name: image image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_pkey PRIMARY KEY (id);


--
-- TOC entry 3536 (class 2606 OID 16472)
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- TOC entry 3550 (class 2606 OID 16500)
-- Name: kill_requirement kill_requirement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kill_requirement
    ADD CONSTRAINT kill_requirement_pkey PRIMARY KEY (id);


--
-- TOC entry 3556 (class 2606 OID 16521)
-- Name: material material_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3610 (class 2606 OID 16694)
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- TOC entry 3606 (class 2606 OID 16680)
-- Name: mercenary mercenary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mercenary
    ADD CONSTRAINT mercenary_pkey PRIMARY KEY ("templateId");


--
-- TOC entry 3558 (class 2606 OID 16528)
-- Name: mob mob_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT mob_pkey PRIMARY KEY (id);


--
-- TOC entry 3534 (class 2606 OID 16465)
-- Name: npc npc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.npc
    ADD CONSTRAINT npc_pkey PRIMARY KEY (id);


--
-- TOC entry 3608 (class 2606 OID 16687)
-- Name: player player_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT player_pkey PRIMARY KEY (id);


--
-- TOC entry 3520 (class 2606 OID 16416)
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);


--
-- TOC entry 3539 (class 2606 OID 16479)
-- Name: recipe_ingredient recipe_ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT recipe_ingredient_pkey PRIMARY KEY (id);


--
-- TOC entry 3544 (class 2606 OID 16486)
-- Name: recipe recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_pkey PRIMARY KEY (id);


--
-- TOC entry 3554 (class 2606 OID 16514)
-- Name: reward reward_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward
    ADD CONSTRAINT reward_pkey PRIMARY KEY (id);


--
-- TOC entry 3516 (class 2606 OID 16409)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- TOC entry 3614 (class 2606 OID 16708)
-- Name: simulator simulator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT simulator_pkey PRIMARY KEY (id);


--
-- TOC entry 3579 (class 2606 OID 16596)
-- Name: skill_effect skill_effect_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_effect
    ADD CONSTRAINT skill_effect_pkey PRIMARY KEY (id);


--
-- TOC entry 3576 (class 2606 OID 16589)
-- Name: skill skill_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT skill_pkey PRIMARY KEY (id);


--
-- TOC entry 3574 (class 2606 OID 16582)
-- Name: special_equipment special_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT special_equipment_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3617 (class 2606 OID 16715)
-- Name: statistic statistic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistic
    ADD CONSTRAINT statistic_pkey PRIMARY KEY (id);


--
-- TOC entry 3548 (class 2606 OID 16493)
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- TOC entry 3552 (class 2606 OID 16507)
-- Name: task_require task_require_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_require
    ADD CONSTRAINT task_require_pkey PRIMARY KEY (id);


--
-- TOC entry 3612 (class 2606 OID 16701)
-- Name: team team_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY (id);


--
-- TOC entry 3511 (class 2606 OID 16395)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 3585 (class 2606 OID 16617)
-- Name: weapon_enchantment_attributes weapon_enchantment_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon_enchantment_attributes
    ADD CONSTRAINT weapon_enchantment_attributes_pkey PRIMARY KEY (id);


--
-- TOC entry 3565 (class 2606 OID 16554)
-- Name: weapon weapon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon
    ADD CONSTRAINT weapon_pkey PRIMARY KEY ("itemId");


--
-- TOC entry 3526 (class 2606 OID 16437)
-- Name: world world_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.world
    ADD CONSTRAINT world_pkey PRIMARY KEY (id);


--
-- TOC entry 3532 (class 2606 OID 16458)
-- Name: zone zone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT zone_pkey PRIMARY KEY (id);


--
-- TOC entry 3628 (class 1259 OID 16882)
-- Name: _BackRelation_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_BackRelation_B_index" ON public."_BackRelation" USING btree ("B");


--
-- TOC entry 3625 (class 1259 OID 16881)
-- Name: _FrontRelation_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_FrontRelation_B_index" ON public."_FrontRelation" USING btree ("B");


--
-- TOC entry 3655 (class 1259 OID 16891)
-- Name: _additional_equipmentTocrystal_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_additional_equipmentTocrystal_B_index" ON public."_additional_equipmentTocrystal" USING btree ("B");


--
-- TOC entry 3658 (class 1259 OID 16892)
-- Name: _additional_equipmentToimage_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_additional_equipmentToimage_B_index" ON public."_additional_equipmentToimage" USING btree ("B");


--
-- TOC entry 3649 (class 1259 OID 16889)
-- Name: _armorTocrystal_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_armorTocrystal_B_index" ON public."_armorTocrystal" USING btree ("B");


--
-- TOC entry 3652 (class 1259 OID 16890)
-- Name: _armorToimage_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_armorToimage_B_index" ON public."_armorToimage" USING btree ("B");


--
-- TOC entry 3661 (class 1259 OID 16893)
-- Name: _avatarTocharacter_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_avatarTocharacter_B_index" ON public."_avatarTocharacter" USING btree ("B");


--
-- TOC entry 3664 (class 1259 OID 16894)
-- Name: _characterTocharacter_skill_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterTocharacter_skill_B_index" ON public."_characterTocharacter_skill" USING btree ("B");


--
-- TOC entry 3670 (class 1259 OID 16896)
-- Name: _characterTocombo_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterTocombo_B_index" ON public."_characterTocombo" USING btree ("B");


--
-- TOC entry 3667 (class 1259 OID 16895)
-- Name: _characterToconsumable_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_characterToconsumable_B_index" ON public."_characterToconsumable" USING btree ("B");


--
-- TOC entry 3640 (class 1259 OID 16886)
-- Name: _crystalTocustom_additional_equipment_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTocustom_additional_equipment_B_index" ON public."_crystalTocustom_additional_equipment" USING btree ("B");


--
-- TOC entry 3637 (class 1259 OID 16885)
-- Name: _crystalTocustom_armor_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTocustom_armor_B_index" ON public."_crystalTocustom_armor" USING btree ("B");


--
-- TOC entry 3646 (class 1259 OID 16888)
-- Name: _crystalTocustom_special_equipment_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTocustom_special_equipment_B_index" ON public."_crystalTocustom_special_equipment" USING btree ("B");


--
-- TOC entry 3634 (class 1259 OID 16884)
-- Name: _crystalTocustom_weapon_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTocustom_weapon_B_index" ON public."_crystalTocustom_weapon" USING btree ("B");


--
-- TOC entry 3643 (class 1259 OID 16887)
-- Name: _crystalTospecial_equipment_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalTospecial_equipment_B_index" ON public."_crystalTospecial_equipment" USING btree ("B");


--
-- TOC entry 3631 (class 1259 OID 16883)
-- Name: _crystalToweapon_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_crystalToweapon_B_index" ON public."_crystalToweapon" USING btree ("B");


--
-- TOC entry 3679 (class 1259 OID 16899)
-- Name: _imageToweapon_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_imageToweapon_B_index" ON public."_imageToweapon" USING btree ("B");


--
-- TOC entry 3673 (class 1259 OID 16897)
-- Name: _memberToteam_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_memberToteam_B_index" ON public."_memberToteam" USING btree ("B");


--
-- TOC entry 3622 (class 1259 OID 16880)
-- Name: _mobTozone_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_mobTozone_B_index" ON public."_mobTozone" USING btree ("B");


--
-- TOC entry 3676 (class 1259 OID 16898)
-- Name: _simulatorToteam_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_simulatorToteam_B_index" ON public."_simulatorToteam" USING btree ("B");


--
-- TOC entry 3514 (class 1259 OID 16864)
-- Name: account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON public.account USING btree (provider, "providerAccountId");


--
-- TOC entry 3570 (class 1259 OID 16874)
-- Name: armor_enchantment_attributes_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "armor_enchantment_attributes_statisticId_key" ON public.armor_enchantment_attributes USING btree ("statisticId");


--
-- TOC entry 3601 (class 1259 OID 16878)
-- Name: character_imageId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_imageId_key" ON public."character" USING btree ("imageId");


--
-- TOC entry 3604 (class 1259 OID 16877)
-- Name: character_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "character_statisticId_key" ON public."character" USING btree ("statisticId");


--
-- TOC entry 3537 (class 1259 OID 16867)
-- Name: item_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "item_statisticId_key" ON public.item USING btree ("statisticId");


--
-- TOC entry 3559 (class 1259 OID 16873)
-- Name: mob_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "mob_statisticId_key" ON public.mob USING btree ("statisticId");


--
-- TOC entry 3518 (class 1259 OID 16866)
-- Name: post_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX post_name_idx ON public.post USING btree (name);


--
-- TOC entry 3540 (class 1259 OID 16870)
-- Name: recipe_addEquipId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "recipe_addEquipId_key" ON public.recipe USING btree ("addEquipId");


--
-- TOC entry 3541 (class 1259 OID 16869)
-- Name: recipe_armorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "recipe_armorId_key" ON public.recipe USING btree ("armorId");


--
-- TOC entry 3542 (class 1259 OID 16872)
-- Name: recipe_consumableId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "recipe_consumableId_key" ON public.recipe USING btree ("consumableId");


--
-- TOC entry 3545 (class 1259 OID 16871)
-- Name: recipe_speEquipId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "recipe_speEquipId_key" ON public.recipe USING btree ("speEquipId");


--
-- TOC entry 3546 (class 1259 OID 16868)
-- Name: recipe_weaponId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "recipe_weaponId_key" ON public.recipe USING btree ("weaponId");


--
-- TOC entry 3517 (class 1259 OID 16865)
-- Name: session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "session_sessionToken_key" ON public.session USING btree ("sessionToken");


--
-- TOC entry 3615 (class 1259 OID 16879)
-- Name: simulator_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "simulator_statisticId_key" ON public.simulator USING btree ("statisticId");


--
-- TOC entry 3577 (class 1259 OID 16875)
-- Name: skill_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "skill_statisticId_key" ON public.skill USING btree ("statisticId");


--
-- TOC entry 3509 (class 1259 OID 16863)
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- TOC entry 3586 (class 1259 OID 16876)
-- Name: weapon_enchantment_attributes_statisticId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "weapon_enchantment_attributes_statisticId_key" ON public.weapon_enchantment_attributes USING btree ("statisticId");


--
-- TOC entry 3766 (class 2606 OID 17330)
-- Name: _BackRelation _BackRelation_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_BackRelation"
    ADD CONSTRAINT "_BackRelation_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3767 (class 2606 OID 17335)
-- Name: _BackRelation _BackRelation_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_BackRelation"
    ADD CONSTRAINT "_BackRelation_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3764 (class 2606 OID 17320)
-- Name: _FrontRelation _FrontRelation_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_FrontRelation"
    ADD CONSTRAINT "_FrontRelation_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3765 (class 2606 OID 17325)
-- Name: _FrontRelation _FrontRelation_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_FrontRelation"
    ADD CONSTRAINT "_FrontRelation_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3784 (class 2606 OID 17420)
-- Name: _additional_equipmentTocrystal _additional_equipmentTocrystal_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentTocrystal"
    ADD CONSTRAINT "_additional_equipmentTocrystal_A_fkey" FOREIGN KEY ("A") REFERENCES public.additional_equipment("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3785 (class 2606 OID 17425)
-- Name: _additional_equipmentTocrystal _additional_equipmentTocrystal_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentTocrystal"
    ADD CONSTRAINT "_additional_equipmentTocrystal_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3786 (class 2606 OID 17430)
-- Name: _additional_equipmentToimage _additional_equipmentToimage_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentToimage"
    ADD CONSTRAINT "_additional_equipmentToimage_A_fkey" FOREIGN KEY ("A") REFERENCES public.additional_equipment("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3787 (class 2606 OID 17435)
-- Name: _additional_equipmentToimage _additional_equipmentToimage_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_additional_equipmentToimage"
    ADD CONSTRAINT "_additional_equipmentToimage_B_fkey" FOREIGN KEY ("B") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3780 (class 2606 OID 17400)
-- Name: _armorTocrystal _armorTocrystal_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorTocrystal"
    ADD CONSTRAINT "_armorTocrystal_A_fkey" FOREIGN KEY ("A") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3781 (class 2606 OID 17405)
-- Name: _armorTocrystal _armorTocrystal_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorTocrystal"
    ADD CONSTRAINT "_armorTocrystal_B_fkey" FOREIGN KEY ("B") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3782 (class 2606 OID 17410)
-- Name: _armorToimage _armorToimage_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorToimage"
    ADD CONSTRAINT "_armorToimage_A_fkey" FOREIGN KEY ("A") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3783 (class 2606 OID 17415)
-- Name: _armorToimage _armorToimage_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_armorToimage"
    ADD CONSTRAINT "_armorToimage_B_fkey" FOREIGN KEY ("B") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3788 (class 2606 OID 17440)
-- Name: _avatarTocharacter _avatarTocharacter_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_avatarTocharacter"
    ADD CONSTRAINT "_avatarTocharacter_A_fkey" FOREIGN KEY ("A") REFERENCES public.avatar(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3789 (class 2606 OID 17445)
-- Name: _avatarTocharacter _avatarTocharacter_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_avatarTocharacter"
    ADD CONSTRAINT "_avatarTocharacter_B_fkey" FOREIGN KEY ("B") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3790 (class 2606 OID 17450)
-- Name: _characterTocharacter_skill _characterTocharacter_skill_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocharacter_skill"
    ADD CONSTRAINT "_characterTocharacter_skill_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3791 (class 2606 OID 17455)
-- Name: _characterTocharacter_skill _characterTocharacter_skill_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocharacter_skill"
    ADD CONSTRAINT "_characterTocharacter_skill_B_fkey" FOREIGN KEY ("B") REFERENCES public.character_skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3794 (class 2606 OID 17470)
-- Name: _characterTocombo _characterTocombo_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocombo"
    ADD CONSTRAINT "_characterTocombo_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3795 (class 2606 OID 17475)
-- Name: _characterTocombo _characterTocombo_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterTocombo"
    ADD CONSTRAINT "_characterTocombo_B_fkey" FOREIGN KEY ("B") REFERENCES public.combo(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3792 (class 2606 OID 17460)
-- Name: _characterToconsumable _characterToconsumable_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_A_fkey" FOREIGN KEY ("A") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3793 (class 2606 OID 17465)
-- Name: _characterToconsumable _characterToconsumable_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_characterToconsumable"
    ADD CONSTRAINT "_characterToconsumable_B_fkey" FOREIGN KEY ("B") REFERENCES public.consumable("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3774 (class 2606 OID 17370)
-- Name: _crystalTocustom_additional_equipment _crystalTocustom_additional_equipment_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_additional_equipment"
    ADD CONSTRAINT "_crystalTocustom_additional_equipment_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3775 (class 2606 OID 17375)
-- Name: _crystalTocustom_additional_equipment _crystalTocustom_additional_equipment_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_additional_equipment"
    ADD CONSTRAINT "_crystalTocustom_additional_equipment_B_fkey" FOREIGN KEY ("B") REFERENCES public.custom_additional_equipment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3772 (class 2606 OID 17360)
-- Name: _crystalTocustom_armor _crystalTocustom_armor_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_armor"
    ADD CONSTRAINT "_crystalTocustom_armor_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3773 (class 2606 OID 17365)
-- Name: _crystalTocustom_armor _crystalTocustom_armor_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_armor"
    ADD CONSTRAINT "_crystalTocustom_armor_B_fkey" FOREIGN KEY ("B") REFERENCES public.custom_armor(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3778 (class 2606 OID 17390)
-- Name: _crystalTocustom_special_equipment _crystalTocustom_special_equipment_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_special_equipment"
    ADD CONSTRAINT "_crystalTocustom_special_equipment_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3779 (class 2606 OID 17395)
-- Name: _crystalTocustom_special_equipment _crystalTocustom_special_equipment_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_special_equipment"
    ADD CONSTRAINT "_crystalTocustom_special_equipment_B_fkey" FOREIGN KEY ("B") REFERENCES public.custom_special_equipment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3770 (class 2606 OID 17350)
-- Name: _crystalTocustom_weapon _crystalTocustom_weapon_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_weapon"
    ADD CONSTRAINT "_crystalTocustom_weapon_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3771 (class 2606 OID 17355)
-- Name: _crystalTocustom_weapon _crystalTocustom_weapon_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTocustom_weapon"
    ADD CONSTRAINT "_crystalTocustom_weapon_B_fkey" FOREIGN KEY ("B") REFERENCES public.custom_weapon(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3776 (class 2606 OID 17380)
-- Name: _crystalTospecial_equipment _crystalTospecial_equipment_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial_equipment"
    ADD CONSTRAINT "_crystalTospecial_equipment_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3777 (class 2606 OID 17385)
-- Name: _crystalTospecial_equipment _crystalTospecial_equipment_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalTospecial_equipment"
    ADD CONSTRAINT "_crystalTospecial_equipment_B_fkey" FOREIGN KEY ("B") REFERENCES public.special_equipment("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3768 (class 2606 OID 17340)
-- Name: _crystalToweapon _crystalToweapon_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToweapon"
    ADD CONSTRAINT "_crystalToweapon_A_fkey" FOREIGN KEY ("A") REFERENCES public.crystal("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3769 (class 2606 OID 17345)
-- Name: _crystalToweapon _crystalToweapon_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_crystalToweapon"
    ADD CONSTRAINT "_crystalToweapon_B_fkey" FOREIGN KEY ("B") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3800 (class 2606 OID 17500)
-- Name: _imageToweapon _imageToweapon_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_imageToweapon"
    ADD CONSTRAINT "_imageToweapon_A_fkey" FOREIGN KEY ("A") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3801 (class 2606 OID 17505)
-- Name: _imageToweapon _imageToweapon_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_imageToweapon"
    ADD CONSTRAINT "_imageToweapon_B_fkey" FOREIGN KEY ("B") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3796 (class 2606 OID 17480)
-- Name: _memberToteam _memberToteam_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_memberToteam"
    ADD CONSTRAINT "_memberToteam_A_fkey" FOREIGN KEY ("A") REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3797 (class 2606 OID 17485)
-- Name: _memberToteam _memberToteam_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_memberToteam"
    ADD CONSTRAINT "_memberToteam_B_fkey" FOREIGN KEY ("B") REFERENCES public.team(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3762 (class 2606 OID 17310)
-- Name: _mobTozone _mobTozone_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_mobTozone"
    ADD CONSTRAINT "_mobTozone_A_fkey" FOREIGN KEY ("A") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3763 (class 2606 OID 17315)
-- Name: _mobTozone _mobTozone_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_mobTozone"
    ADD CONSTRAINT "_mobTozone_B_fkey" FOREIGN KEY ("B") REFERENCES public.zone(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3798 (class 2606 OID 17490)
-- Name: _simulatorToteam _simulatorToteam_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_simulatorToteam"
    ADD CONSTRAINT "_simulatorToteam_A_fkey" FOREIGN KEY ("A") REFERENCES public.simulator(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3799 (class 2606 OID 17495)
-- Name: _simulatorToteam _simulatorToteam_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_simulatorToteam"
    ADD CONSTRAINT "_simulatorToteam_B_fkey" FOREIGN KEY ("B") REFERENCES public.team(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3683 (class 2606 OID 16915)
-- Name: account_create_data account_create_data_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_create_data
    ADD CONSTRAINT "account_create_data_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3684 (class 2606 OID 16920)
-- Name: account_update_data account_update_data_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_update_data
    ADD CONSTRAINT "account_update_data_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3680 (class 2606 OID 16900)
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3721 (class 2606 OID 17105)
-- Name: additional_equipment additional_equipment_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_equipment
    ADD CONSTRAINT "additional_equipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3685 (class 2606 OID 16925)
-- Name: address address_worldId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "address_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES public.world(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3718 (class 2606 OID 17100)
-- Name: armor_enchantment_attributes armor_enchantment_attributes_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor_enchantment_attributes
    ADD CONSTRAINT "armor_enchantment_attributes_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3719 (class 2606 OID 17090)
-- Name: armor_enchantment_attributes armor_enchantment_attributes_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor_enchantment_attributes
    ADD CONSTRAINT "armor_enchantment_attributes_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3720 (class 2606 OID 17095)
-- Name: armor_enchantment_attributes armor_enchantment_attributes_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor_enchantment_attributes
    ADD CONSTRAINT "armor_enchantment_attributes_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3717 (class 2606 OID 17085)
-- Name: armor armor_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armor
    ADD CONSTRAINT "armor_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3744 (class 2606 OID 17220)
-- Name: avatar avatar_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avatar
    ADD CONSTRAINT "avatar_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3745 (class 2606 OID 17240)
-- Name: character character_addEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_addEquipId_fkey" FOREIGN KEY ("addEquipId") REFERENCES public.custom_additional_equipment(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3746 (class 2606 OID 17235)
-- Name: character character_armorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_armorId_fkey" FOREIGN KEY ("armorId") REFERENCES public.custom_armor(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3747 (class 2606 OID 17260)
-- Name: character character_imageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3748 (class 2606 OID 17250)
-- Name: character character_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3741 (class 2606 OID 17205)
-- Name: character_skill character_skill_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.character_skill
    ADD CONSTRAINT "character_skill_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3749 (class 2606 OID 17245)
-- Name: character character_speEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_speEquipId_fkey" FOREIGN KEY ("speEquipId") REFERENCES public.custom_special_equipment(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3750 (class 2606 OID 17255)
-- Name: character character_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3751 (class 2606 OID 17230)
-- Name: character character_subWeaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_subWeaponId_fkey" FOREIGN KEY ("subWeaponId") REFERENCES public.custom_weapon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3752 (class 2606 OID 17225)
-- Name: character character_weaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."character"
    ADD CONSTRAINT "character_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES public.custom_weapon(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3727 (class 2606 OID 17135)
-- Name: consumable consumable_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumable
    ADD CONSTRAINT "consumable_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3715 (class 2606 OID 17075)
-- Name: crystal crystal_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crystal
    ADD CONSTRAINT "crystal_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3737 (class 2606 OID 17190)
-- Name: custom_additional_equipment custom_additional_equipment_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_additional_equipment
    ADD CONSTRAINT "custom_additional_equipment_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3738 (class 2606 OID 17185)
-- Name: custom_additional_equipment custom_additional_equipment_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_additional_equipment
    ADD CONSTRAINT "custom_additional_equipment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.additional_equipment("itemId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3734 (class 2606 OID 17175)
-- Name: custom_armor custom_armor_enchantmentAttributesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_armor
    ADD CONSTRAINT "custom_armor_enchantmentAttributesId_fkey" FOREIGN KEY ("enchantmentAttributesId") REFERENCES public.armor_enchantment_attributes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3735 (class 2606 OID 17180)
-- Name: custom_armor custom_armor_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_armor
    ADD CONSTRAINT "custom_armor_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3736 (class 2606 OID 17170)
-- Name: custom_armor custom_armor_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_armor
    ADD CONSTRAINT "custom_armor_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3742 (class 2606 OID 17215)
-- Name: custom_pet custom_pet_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_pet
    ADD CONSTRAINT "custom_pet_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3743 (class 2606 OID 17210)
-- Name: custom_pet custom_pet_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_pet
    ADD CONSTRAINT "custom_pet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3739 (class 2606 OID 17200)
-- Name: custom_special_equipment custom_special_equipment_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_special_equipment
    ADD CONSTRAINT "custom_special_equipment_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3740 (class 2606 OID 17195)
-- Name: custom_special_equipment custom_special_equipment_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_special_equipment
    ADD CONSTRAINT "custom_special_equipment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.special_equipment("itemId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3728 (class 2606 OID 17145)
-- Name: custom_weapon custom_weapon_enchantmentAttributesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_weapon
    ADD CONSTRAINT "custom_weapon_enchantmentAttributesId_fkey" FOREIGN KEY ("enchantmentAttributesId") REFERENCES public.weapon_enchantment_attributes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3729 (class 2606 OID 17150)
-- Name: custom_weapon custom_weapon_masterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_weapon
    ADD CONSTRAINT "custom_weapon_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3730 (class 2606 OID 17140)
-- Name: custom_weapon custom_weapon_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_weapon
    ADD CONSTRAINT "custom_weapon_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3713 (class 2606 OID 17070)
-- Name: drop_item drop_item_dropById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drop_item
    ADD CONSTRAINT "drop_item_dropById_fkey" FOREIGN KEY ("dropById") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3714 (class 2606 OID 17065)
-- Name: drop_item drop_item_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drop_item
    ADD CONSTRAINT "drop_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3690 (class 2606 OID 16960)
-- Name: item item_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3691 (class 2606 OID 16950)
-- Name: item item_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3692 (class 2606 OID 16955)
-- Name: item item_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3702 (class 2606 OID 17010)
-- Name: kill_requirement kill_requirement_mobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kill_requirement
    ADD CONSTRAINT "kill_requirement_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3703 (class 2606 OID 17015)
-- Name: kill_requirement kill_requirement_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kill_requirement
    ADD CONSTRAINT "kill_requirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3708 (class 2606 OID 17040)
-- Name: material material_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT "material_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3755 (class 2606 OID 17285)
-- Name: member member_mercenaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_mercenaryId_fkey" FOREIGN KEY ("mercenaryId") REFERENCES public.mercenary("templateId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3756 (class 2606 OID 17290)
-- Name: member member_mobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES public.mob(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3757 (class 2606 OID 17280)
-- Name: member member_partnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES public.mercenary("templateId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3758 (class 2606 OID 17275)
-- Name: member member_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT "member_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.player(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3753 (class 2606 OID 17265)
-- Name: mercenary mercenary_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mercenary
    ADD CONSTRAINT "mercenary_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."character"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3709 (class 2606 OID 17060)
-- Name: mob mob_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3710 (class 2606 OID 17050)
-- Name: mob mob_imageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3711 (class 2606 OID 17045)
-- Name: mob mob_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3712 (class 2606 OID 17055)
-- Name: mob mob_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob
    ADD CONSTRAINT "mob_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3688 (class 2606 OID 16940)
-- Name: npc npc_imageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.npc
    ADD CONSTRAINT "npc_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES public.image(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3689 (class 2606 OID 16945)
-- Name: npc npc_zoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.npc
    ADD CONSTRAINT "npc_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES public.zone(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3754 (class 2606 OID 17270)
-- Name: player player_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT "player_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3682 (class 2606 OID 16910)
-- Name: post post_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT "post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3695 (class 2606 OID 17000)
-- Name: recipe recipe_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.activity(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3696 (class 2606 OID 16985)
-- Name: recipe recipe_addEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_addEquipId_fkey" FOREIGN KEY ("addEquipId") REFERENCES public.additional_equipment("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3697 (class 2606 OID 16980)
-- Name: recipe recipe_armorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_armorId_fkey" FOREIGN KEY ("armorId") REFERENCES public.armor("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3698 (class 2606 OID 16995)
-- Name: recipe recipe_consumableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES public.consumable("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3693 (class 2606 OID 16965)
-- Name: recipe_ingredient recipe_ingredient_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "recipe_ingredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3694 (class 2606 OID 16970)
-- Name: recipe_ingredient recipe_ingredient_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT "recipe_ingredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public.recipe(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3699 (class 2606 OID 16990)
-- Name: recipe recipe_speEquipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_speEquipId_fkey" FOREIGN KEY ("speEquipId") REFERENCES public.special_equipment("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3700 (class 2606 OID 16975)
-- Name: recipe recipe_weaponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT "recipe_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES public.weapon("itemId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3706 (class 2606 OID 17030)
-- Name: reward reward_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward
    ADD CONSTRAINT "reward_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3707 (class 2606 OID 17035)
-- Name: reward reward_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reward
    ADD CONSTRAINT "reward_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3681 (class 2606 OID 16905)
-- Name: session session_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3759 (class 2606 OID 17305)
-- Name: simulator simulator_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT "simulator_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3760 (class 2606 OID 17295)
-- Name: simulator simulator_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT "simulator_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3761 (class 2606 OID 17300)
-- Name: simulator simulator_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulator
    ADD CONSTRAINT "simulator_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3723 (class 2606 OID 17125)
-- Name: skill skill_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3726 (class 2606 OID 17130)
-- Name: skill_effect skill_effect_belongToskillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_effect
    ADD CONSTRAINT "skill_effect_belongToskillId_fkey" FOREIGN KEY ("belongToskillId") REFERENCES public.skill(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3724 (class 2606 OID 17115)
-- Name: skill skill_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3725 (class 2606 OID 17120)
-- Name: skill skill_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill
    ADD CONSTRAINT "skill_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3722 (class 2606 OID 17110)
-- Name: special_equipment special_equipment_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_equipment
    ADD CONSTRAINT "special_equipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3701 (class 2606 OID 17005)
-- Name: task task_npcId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT "task_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES public.npc(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3704 (class 2606 OID 17020)
-- Name: task_require task_require_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_require
    ADD CONSTRAINT "task_require_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3705 (class 2606 OID 17025)
-- Name: task_require task_require_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_require
    ADD CONSTRAINT "task_require_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3731 (class 2606 OID 17165)
-- Name: weapon_enchantment_attributes weapon_enchantment_attributes_createdByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon_enchantment_attributes
    ADD CONSTRAINT "weapon_enchantment_attributes_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES public.account_create_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3732 (class 2606 OID 17155)
-- Name: weapon_enchantment_attributes weapon_enchantment_attributes_statisticId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon_enchantment_attributes
    ADD CONSTRAINT "weapon_enchantment_attributes_statisticId_fkey" FOREIGN KEY ("statisticId") REFERENCES public.statistic(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3733 (class 2606 OID 17160)
-- Name: weapon_enchantment_attributes weapon_enchantment_attributes_updatedByAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon_enchantment_attributes
    ADD CONSTRAINT "weapon_enchantment_attributes_updatedByAccountId_fkey" FOREIGN KEY ("updatedByAccountId") REFERENCES public.account_update_data("accountId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3716 (class 2606 OID 17080)
-- Name: weapon weapon_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weapon
    ADD CONSTRAINT "weapon_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.item(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3686 (class 2606 OID 16930)
-- Name: zone zone_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT "zone_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.activity(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3687 (class 2606 OID 16935)
-- Name: zone zone_addressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT "zone_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES public.address(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Completed on 2025-03-03 11:31:33

--
-- PostgreSQL database dump complete
--

