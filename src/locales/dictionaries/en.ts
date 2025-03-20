import { type dictionary } from "./type";


const elementType={
  Normal: "无属性",
  Dark: "暗属性",
  Earth: "地属性",
  Fire: "火属性",
  Light: "光属性",
  Water: "水属性",
  Wind: "风属性",
}

const MainWeaponType= {
  OneHandSword: "单手剑",
  TwoHandSword: "双手剑",
  Bow: "弓",
  Rod: "法杖",
  Magictool: "魔导具",
  Knuckle: "拳套",
  Halberd: "旋风枪",
  Katana: "拔刀剑",
  Bowgun: "弩",
  selfName: "主武器类型",
}
const SubWeaponType = {
  Arrow: "箭矢",
  ShortSword: "小刀",
  NinjutsuScroll: "忍术卷轴",
  Shield: "盾牌",
  selfName: "副武器类型",
}

const WeaponType = {
  ...MainWeaponType,
  ...SubWeaponType
}

const dictionary: dictionary = {
  ui: {
    columnsHidden: "Columns Hidden",
    searchPlaceholder: "Search something ~",
    actions: {
      add: "Add",
      create: "Create",
      remove: "Remove",
      update: "Update",
      open: "Open",
      upload: "Upload",
      reset: "Reset",
      save: "Save",
      modify: "Modify",
      cancel: "Cancel",
      close: "close",
      back: "Back",
      filter: "Filter",
      generateImage: "Generate Image",
      swap: "Swap",
      checkInfo: "Check Info",
      zoomIn: "Zoom In",
      zoomOut: "Zoom Out",
    },
    nav: {
      home: "Home",
      mobs: "Mobs",
      skills: "Skills",
      equipments: "Equipments",
      crystals: "Crystas",
      pets: "Pets",
      items: "Items",
      character: "Character",
      simulator: "Simulator",
      profile: "",
    },
    errorPage: {
      tips: "You have no knowledge of the desert. Click the screen to return",
    },
    settings: {
      title: "Settings",
      userInterface: {
        title: "User Interface",
        isAnimationEnabled: {
          title: "Enable Animation",
          description: "Will affect the duration of transitions and animations on all pages.",
        },
        is3DbackgroundDisabled: {
          title: "Disable 3D Background",
          description: "May cause a lot of performance loss, not recommended.",
        }
      },
      language: {
        title: "Language",
        selectedLanguage: {
          title: " Language",
          description: "Affects all interface texts, but cannot change data class texts.",
          zhCN: "简体中文",
          zhTW: "繁体中文",
          enUS: "English",
          jaJP: "日本語"
        }
      },
      statusAndSync: {
        title: "Status and Sync",
        restorePreviousStateOnStartup: {
          title: "Restore Previous State on Startup",
          description: "Not implemented yet.",
        },
        syncStateAcrossClients: {
          title: "Sync State Across Clients",
          description: "Not implemented yet.",
        }
      },
      privacy: {
        title: "Privacy",
        postVisibility: {
          title: "Post Visibility",
          description: "Post Visibility includes: Character, Monstors, Crystas, Main Weapon, Sub Weapon, Body Armor, Additional Equipment, Special Equipment, Skills, Consumables, Combo, Simulator.",
          everyone: "Everyone",
          friends: "Friends",
          onlyMe: "Only Me"
        }
      },
      messages: {
        title: "Messages",
        notifyOnContentChange: {
          title: "Notify on Content Change",
          description: "Not implemented yet.",
          notifyOnReferencedContentChange: "Notify on Referenced Content Change",
          notifyOnLike: "Notify on Like",
          notifyOnBookmark: "Notify on Bookmark"
        }
      },
      about: {
        title: "About",
        description: {
          title: "Description",
          description: "~~~~~~~~~~~",
        },
        version: {
          title: "Version",
          description: "0.0.1-alpha",
        }
      }
    },
    index: {
      adventurer: "Adventurer",
      goodMorning: "Good Morning ~",
      goodAfternoon: "Good Afternoon ~",
      goodEvening: "Good Evening ~",
      nullSearchResultWarring: "Can not find anything!",
      nullSearchResultTips: "Emmm..."
    },
    mob: {
      pageTitle: "Mob",
      table: {
        title: "Mobs Table",
        description: "Emmm..............",
      },
      news: {
        title: "Recently Updated",
      },
      augmented: "Show All Stars",
      canNotModify: "System Generated",
      difficultyflag: {
        "Easy": "☆☆☆☆",
        "Normal": "★☆☆☆",
        "Hard": "★★☆☆",
        Lunatic: "★★★☆",
        Ultimate: "★★★★",
      },
      form: {
        description:
          "When uploading fixed-point boss data, please use one-star data, and the system will automatically calculate the data for other star levels according to the rules.",
      },
    },
    crystal: {
      pageTitle: "Crystal",
      description: "Emmm..............",
      canNotModify: "System Generated",
      crystalForm: {
        description: "Emmm..............",
      }
    },
    skill: {
      pageTitle: "Skill",
      table: {
        title: "Skill Table",
        description: "Emmm..............",
      },
      news: {
        title: "Recently Updated",
      },
      form: {
        description: "Emmm..............",
      }
    },
    simulator: {
      pageTitle: "Simulator",
      description: "Emmm..............",
      modifiers: "Modifiers",
      // dialogData: {
      //   selfName: "Attribute",
      //   lv: "Lv",
      //   mainWeapon: {
      //     selfName: "Main Weapon",
      //     type: "Type",
      //     baseAtk: "BaseAtk",
      //     refinement: "Refinement",
      //     stability: "Stability",
      //   },
      //   subWeapon: {
      //     selfName: "Sub Weapon",
      //     type: "Type",
      //     baseAtk: "BaseAtk",
      //     refinement: "Refinement",
      //     stability: "Stability",
      //   },
      //   bodyArmor: {
      //     selfName: "Body Armor",
      //     type: "Type",
      //     baseDef: "BaseDef",
      //     refinement: "Refinement",
      //   },
      //   str: "Str",
      //   int: "Int",
      //   vit: "Vit",
      //   agi: "Agi",
      //   dex: "Dex",
      //   luk: "Luk",
      //   cri: "Cri",
      //   tec: "Tec",
      //   men: "Men",
      //   pPie: "p-Pie",
      //   mPie: "m-Pie",
      //   pStab: "p-Stab",
      //   sDis: "n-Dis",
      //   lDis: "f-Dis",
      //   crC: "Cr-T",
      //   cdC: "Cd-T",
      //   weaponPatkT: "Wea-pAtk-T",
      //   weaponMatkT: "Wea-mAtk-T",
      //   uAtk: "Unsheathe-Atk",
      //   stro: {
      //     selfName: "Stro",
      //     Light: "Strong against Light",
      //     Normal: "Strong against No Element",
      //     Dark: "Strong against Dark",
      //     Water: "Strong against Water",
      //     Fire: "Strong against Fire",
      //     Earth: "Strong against Earth",
      //     Wind: "Strong against Wind",
      //   },
      //   total: "Total",
      //   final: "Final",
      //   am: "Am",
      //   cm: "Cm",
      //   aggro: "Aggro",
      //   maxHp: "MaxHP",
      //   maxMp: "MaxMp",
      //   pCr: "p-Cr",
      //   pCd: "p-Cd",
      //   mainWeaponAtk: "MainWeaponAtk",
      //   subWeaponAtk: "SubWeaponAtk",
      //   weaponAtk: "WeaponAtk",
      //   pAtk: "p-Atk",
      //   mAtk: "m-Atk",
      //   aspd: "Aspd",
      //   cspd: "Cspd",
      //   ampr: "Ampr",
      //   hp: "Hp",
      //   mp: "Mp",
      //   name: "Name",
      //   pDef: "p-Def",
      //   pRes: "p-Res",
      //   mDef: "m-Def",
      //   mRes: "m-Res",
      //   cRes: "c-Res",
      //   index: "Index",
      //   skillEffectType: "",
      //   actionFixedDuration: "action-FixedDuration",
      //   actionModifiableDuration: "action-ModifiableDuration",
      //   chantingFixedDuration: "chanting-FixedDuration",
      //   chantingModifiableDuration: "chanting-ModifiableDuration",
      //   chargingFixedDuration: "charging-FixedDuration",
      //   chargingModifiableDuration: "charging-ModifiableDuration",
      //   skillChargingFrames: "ChargingFrames",
      //   skillActionFrames: "ActionFrames",
      //   skillChantingFrames: "ChantingFrames",
      //   skillDuration: "Duration",
      //   skillStartupFrames: "StartupFrames",
      //   anticipate: "",
      //   vMatk: "v-mAtk",
      //   vPatk: "v-pAtk",
      // },
      actualValue: "Actual",
      baseValue: "Base",
      staticModifiers: "StaticModifiers",
      dynamicModifiers: "DynamicModifiers",
      simulatorPage: {
        mobsConfig: {
          title: "Mobs Config",
        },
        teamConfig: {
          title: "Team Config",
        }
      }
    },
    character: {
      pageTitle: "Skill",
      description: "Emmm..............",
    },
  },
  
  enums: {
    user: {
      role: {
        Admin: "管理员",
        User: "用户"
      }
    },
    address: {
      type: {
        Normal: "一般地点",
        Limited: "限时地点"
      }
    },
    weapon: {
      type: WeaponType,
      elementType: elementType
    },
    mob: {
      type: {
        Boss: "定点王",
        MiniBoss: "野王",
        Mob: "小怪",
      },
      initialElement: elementType
    },
    item: {
      tableType: {
        weapon: "",
        armor: "",
        option: "",
        special: "",
        crystal: "",
        consumable: "",
        material: ""
      }
    },
    material: {
      type: {
        Metal: "",
        Cloth: "",
        Beast: "",
        Wood: "",
        Drug: "",
        Magic: ""
      }
    },
    consumable: {
      type: {
        MaxHp: "",
        MaxMp: "",
        pAtk: "",
        mAtk: "",
        Aspd: "",
        Cspd: "",
        Hit: "",
        Flee: "",
        EleStro: "",
        EleRes: "",
        pRes: "",
        mRes: ""
      }
    },
    crystal: {
      type: {
        NormalCrystal: "通用锻晶",
        WeaponCrystal: "武器锻晶",
        ArmorCrystal: "防具锻晶",
        OptEquipCrystal: "追加锻晶",
        SpecialCrystal: "特殊锻晶",
      }
    },
    recipe_ingredient: {
      type: {
        gold: "",
        item: ""
      }
    },
    drop_item: {
      relatedPartType: {
        A: "",
        B: "",
        C: ""
      },
      breakReward: {
        None: "",
        CanDrop: "",
        DropUp: ""
      }
    },
    task: {
      type: {
        Collect: "",
        Defeat: "",
        Both: "",
        Other: ""
      }
    },
    reward: {
      type: {
        Exp: "",
        Money: "",
        Item: ""
      }
    },
    skill: {
      treeType: {
        BladeSkill: "剑术技能",
        ShootSkill: "射击技能",
        MagicSkill: "魔法技能",
        MarshallSkill: "格斗技能",
        DualSwordSkill: "双剑技能",
        HalberdSkill: "斧枪技能",
        MononofuSkill: "武士技能",
        CrusherSkill: "粉碎者技能",
        FeatheringSkill: "灵魂技能",
        GuardSkill: "格挡技能",
        ShieldSkill: "护盾技能",
        KnifeSkill: "小刀技能",
        KnightSkill: "骑士技能",
        HunterSkill: "狩猎技能",
        PriestSkill: "祭司技能",
        AssassinSkill: "暗杀技能",
        WizardSkill: "巫师技能",
        //
        SupportSkill: "辅助技能",
        BattleSkill: "好战分子",
        SurvivalSkill: "生存本能",
        //
        SmithSkill: "锻冶大师",
        AlchemySkill: "炼金术士",
        TamerSkill: "驯兽天分",
        //
        DarkPowerSkill: "暗黑之力",
        MagicBladeSkill: "魔剑技能",
        DancerSkill: "舞者技能",
        MinstrelSkill: "诗人技能",
        BareHandSkill: "空手技能",
        NinjaSkill: "忍者技能",
        PartisanSkill: "游击队技能",
        //
        LuckSkill: "",
        MerchantSkill: "商人技能",
        PetSkill: "宠物技能",
      },
      chargingType: {
        Chanting: "咏唱",
        Reservoir: "蓄力",
      },
      distanceType: {
        None: "",
        Long: "",
        Short: "",
        Both: ""
      },
      targetType: {
        None: "",
        Self: "",
        Player: "",
        Enemy: ""
      }
    },
    player_armor: {
      ability: {
        Normal: "一般",
        Light: "轻化",
        Heavy: "重化",
      }
    },
    player_pet: {
      personaType: {
        Fervent: "",
        Intelligent: "",
        Mild: "",
        Swift: "",
        Justice: "",
        Devoted: "",
        Impulsive: "",
        Calm: "",
        Sly: "",
        Timid: "",
        Brave: "",
        Active: "",
        Sturdy: "",
        Steady: "",
        Max: ""
      },
      type: {
        AllTrades: "",
        PhysicalAttack: "",
        MagicAttack: "",
        PhysicalDefense: "",
        MagicDefensem: "",
        Avoidance: "",
        Hit: "",
        SkillsEnhancement: "",
        Genius: ""
      },
      weaponType: MainWeaponType
    },
    avatar: {
      type: {
        Decoration: "",
        Top: "",
        Bottom: ""
      }
    },
    character: {
      personalityType: {
        None: "无",
        Luk: "幸运",
        Cri: "暴击",
        Tec: "技巧",
        Men: "异抗",
      },
      partnerSkillAType: {
        Passive: "",
        Active: ""
      },
      partnerSkillBType: {
        Passive: "",
        Active: ""
      }
    },
    combo_step: {
      type: {
        None: "",
        Start: "",
        Rengeki: "",
        ThirdEye: "",
        Filling: "",
        Quick: "",
        HardHit: "",
        Tenacity: "",
        Invincible: "",
        BloodSucking: "",
        Tough: "",
        AMomentaryWalk: "",
        Reflection: "",
        Illusion: "",
        Max: ""
      }
    },
    mercenary: {
      type: {
        Tank: "",
        Dps: ""
      },
      skillAType: {
        Passive: "",
        Active: ""
      },
      skillBType: {
        Passive: "",
        Active: ""
      }
    },
    member: {
      mobDifficultyFlag: {
        Easy: "",
        Normal: "",
        Hard: "",
        Lunatic: "",
        Ultimate: ""
      }
    }
  },
};

export default dictionary;
