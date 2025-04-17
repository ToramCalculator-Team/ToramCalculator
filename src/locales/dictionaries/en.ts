import { DataEnums } from "../../../db/dataEnums";
import { MobType } from "../../../db/kysely/enums";
import { type dictionary } from "../type";


const elementType={
  Normal: "Normal",
  Dark: "Dark",
  Earth: "Earth",
  Fire: "Fire",
  Light: "Light",
  Water: "Water",
  Wind: "Wind",
}

const mobType: Record<MobType, string> = {
  Boss: "定点王",
  MiniBoss: "野王",
  Mob: "小怪",
};

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

const enums:DataEnums = {
  account: {
    type: {
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
      Boss: "BOSS",
      MiniBoss: "MiniBoss",
      Mob: "Mob",
    },
    initialElement: elementType
  },
  item: {
    type: {
      Weapon: "",
      Armor: "",
      Option: "",
      Special: "",
      Crystal: "",
      Consumable: "",
      Material: ""
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
      Gold: "",
      Item: "",
      Metal: "",
      Cloth: "",
      Beast: "",
      Wood: "",
      Drug: "",
      Magic: ""
    }
  },
  drop_item: {
    relatedPartType: {
      A: "",
      B: "",
      C: ""
    },
    breakRewardType: {
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
  task_reward: {
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
  },
  user: {},
  session: {},
  verification_token: {},
  post: {},
  account_create_data: {},
  account_update_data: {},
  world: {},
  activity: {},
  zone: {},
  image: {},
  statistic: {},
  armor: {},
  option: {},
  special: {},
  recipe: {},
  npc: {},
  task_kill_requirement: {},
  task_collect_require: {},
  skill_effect: {},
  player: {},
  player_weapon: {},
  player_option: {},
  player_special: {},
  character_skill: {},
  combo: {},
  simulator: {},
  team: {}
}

const dictionary: dictionary = {
  ui: {
    columnsHidden: "Columns Hidden",
    searchPlaceholder: "Search something ~",
    boolean: {
      true: "True",
      false: "False",
    },
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
      logIn: "Log In",
      logOut: "Log Out",
      register: "Register",
      switchUser: "Switch User",
      install: "Install",
      unInstall: "UnInstall"
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
      },
      tool: {
        title: "App Operations",
        pwa: {
          title: "PWA",
          description: "This app is designed as a Progressive Web App (PWA), which can be installed on your device when supported to provide a better experience. It is not installed by default.",
          notSupported: "PWA is not supported or already installed on this device"
        },
        storageInfo: {
          title: "Storage Usage",
          description: "Includes caches such as localStorage, IndexedDB, etc.",
          usage: "Used",
          clearStorage: "Clear all caches for this app"
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
  db:{
    _armorTocrystal: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _avatarTocharacter: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _BackRelation: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _campA: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _campB: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _characterToconsumable: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalTooption: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalToplayer_armor: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalToplayer_option: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalToplayer_special: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalToplayer_weapon: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalTospecial: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _crystalToweapon: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _FrontRelation: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    _mobTozone: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    account: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            User: "",
            Admin: ""
          }
        },
        provider: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        providerAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        refresh_token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        access_token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        expires_at: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        token_type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        scope: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        id_token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        session_state: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        userId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    account_create_data: {
      selfName: "",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    account_update_data: {
      selfName: "",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    activity: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    address: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Normal: "",
            Limited: ""
          }
        },
        posX: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        posY: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        worldId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    armor: {
      selfName: "",
      fields: {
        baseDef: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorA: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorB: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorC: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    avatar: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Decoration: "",
            Top: "",
            Bottom: ""
          }
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        playerId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    character: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        lv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        str: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        int: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        vit: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        agi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        dex: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        personalityType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            None: "",
            Luk: "",
            Cri: "",
            Tec: "",
            Men: ""
          }
        },
        personalityValue: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        weaponId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        subWeaponId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        armorId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        optEquipId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        speEquipId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        cooking: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        partnerSkillAId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        partnerSkillAType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Passive: "",
            Active: ""
          }
        },
        partnerSkillBId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        partnerSkillBType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Passive: "",
            Active: ""
          }
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    character_skill: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        lv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        isStarGem: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        characterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    combo: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        disable: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        characterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    combo_step: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
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
        characterSkillId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        comboId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    consumable: {
      selfName: "",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Hit: "",
            MaxHp: "",
            MaxMp: "",
            pAtk: "",
            mAtk: "",
            Aspd: "",
            Cspd: "",
            Flee: "",
            EleStro: "",
            EleRes: "",
            pRes: "",
            mRes: ""
          }
        },
        effectDuration: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        effects: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    crystal: {
      selfName: "",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            NormalCrystal: "",
            WeaponCrystal: "",
            ArmorCrystal: "",
            OptEquipCrystal: "",
            SpecialCrystal: ""
          }
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    drop_item: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        probability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        relatedPartType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            A: "",
            B: "",
            C: ""
          }
        },
        relatedPartInfo: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        breakRewardType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            None: "",
            CanDrop: "",
            DropUp: ""
          }
        },
        dropById: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    image: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        dataUrl: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        npcId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        weaponId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        armorId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        optEquipId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        mobId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    item: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Weapon: "",
            Armor: "",
            Option: "",
            Special: "",
            Crystal: "",
            Consumable: "",
            Material: ""
          }
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        dataSources: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    material: {
      selfName: "",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Metal: "",
            Cloth: "",
            Beast: "",
            Wood: "",
            Drug: "",
            Magic: ""
          }
        },
        ptValue: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        price: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    member: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        sequence: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        playerId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        partnerId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        mercenaryId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        mobId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        mobDifficultyFlag: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Easy: "",
            Normal: "",
            Hard: "",
            Lunatic: "",
            Ultimate: ""
          }
        },
        teamId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        actions: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    mercenary: {
      selfName: "",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Tank: "",
            Dps: ""
          }
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        skillAId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        skillAType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Passive: "",
            Active: ""
          }
        },
        skillBId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        skillBType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Active: "",
            Passive: ""
          }
        }
      }
    },
    mob: {
      selfName: "",
      fields: {
        name: {
          key: "Name",
          tableFieldDescription: "The monster's name, usually consistent with the in-game name.",
          formFieldDescription:
            "Please enter the monster's name as it appears in the game. You don't want others to be confused by your entry, right?",
        },
        id: {
          key: "ID",
          tableFieldDescription: "This is the monster's database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        type: {
          key: "Monster Type",
          tableFieldDescription:
            "Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
          formFieldDescription:
            "Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
          enumMap: mobType
        },
        captureable: {
          key: "Capturable",
          tableFieldDescription: `This attribute is only valid for monsters other than ${enums.mob.type.Boss} and ${enums.mob.type.MiniBoss}. Special monsters like Ganrif and Tangming Phoenix are considered exceptions.`,
          formFieldDescription: `If the monster type is not ${enums.mob.type.Mob}, select 'Not Capturable'.`,
        },
        actions: {
          key: "Actions",
          tableFieldDescription:
            "Monster behavior description. The simulator will simulate actions based on this logic.",
          formFieldDescription:
            "Monster behavior description. The simulator will simulate actions based on this logic.",
        },
        baseLv: {
          key: "Base Level",
          tableFieldDescription: `For ${enums.mob.type.Boss}, this value represents the level at ${enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this is the actual level.`,
          formFieldDescription: `If the monster type is ${enums.mob.type.Boss}, enter the level at ${enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters, enter the actual level.`,
        },
        experience: {
          key: "Experience",
          tableFieldDescription: `For ${enums.mob.type.Boss}, this value represents the experience at ${enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this is the actual experience.`,
          formFieldDescription: `If the monster type is ${enums.mob.type.Boss}, enter the experience at ${enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters, enter the actual experience.`,
        },
        initialElement: {
          key: "Element Attribute",
          tableFieldDescription:
            "This is the initial element. Monsters may change their attributes during battle. Refer to the behavior description for details.",
          formFieldDescription:
            "Enter the monster's initial element here. Attribute changes should be described in the behavior section.",
          enumMap: elementType
        },
        radius: {
          key: "Radius",
          tableFieldDescription: "The monster's model size, mainly used to calculate whether skills hit.",
          formFieldDescription:
            "The monster's model size, mainly used to calculate whether skills hit. Subtract 1 from the distance displayed on the screen after casting Holy Fist.",
        },
        maxhp: {
          key: "Max HP",
          tableFieldDescription: "No one doesn't know what this means, right? Right?",
          formFieldDescription: `For ${enums.mob.type.Boss}, this value represents the HP at ${enums.member.mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this value may need to be estimated.`,
        },
        physicalDefense: {
          key: "Physical Defense",
          tableFieldDescription: "Interacts with physical penetration.",
          formFieldDescription: "Interacts with physical penetration.",
        },
        physicalResistance: {
          key: "Physical Resistance",
          tableFieldDescription:
            "This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
          formFieldDescription:
            "This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
        },
        magicalDefense: {
          key: "Magical Defense",
          tableFieldDescription: "Interacts with magical penetration.",
          formFieldDescription: "Interacts with magical penetration.",
        },
        magicalResistance: {
          key: "Magical Resistance",
          tableFieldDescription:
            "This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
          formFieldDescription:
            "This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
        },
        criticalResistance: {
          key: "Critical Resistance",
          tableFieldDescription:
            "For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
          formFieldDescription:
            "For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
        },
        avoidance: {
          key: "Avoidance",
          tableFieldDescription: "Interacts with accuracy to determine whether physical attacks hit.",
          formFieldDescription: "Interacts with accuracy to determine whether physical attacks hit.",
        },
        dodge: {
          key: "Dodge Rate",
          tableFieldDescription: "When attacked, this value determines whether the attack hits.",
          formFieldDescription: "When attacked, this value determines whether the attack hits.",
        },
        block: {
          key: "Block Rate",
          tableFieldDescription: "When attacked, this value determines whether the attack is blocked.",
          formFieldDescription: "When attacked, this value determines whether the attack is blocked.",
        },
        normalAttackResistanceModifier: {
          key: "Normal Damage Inertia Modifier",
          tableFieldDescription: "The change in normal inertia each time damage is taken.",
          formFieldDescription: "The change in normal inertia each time damage is taken.",
        },
        physicalAttackResistanceModifier: {
          key: "Physical Damage Inertia Modifier",
          tableFieldDescription: "The change in physical inertia each time damage is taken.",
          formFieldDescription: "The change in physical inertia each time damage is taken.",
        },
        magicalAttackResistanceModifier: {
          key: "Magical Damage Inertia Modifier",
          tableFieldDescription: "The change in magical inertia each time damage is taken.",
          formFieldDescription: "The change in magical inertia each time damage is taken.",
        },
        partsExperience: {
          key: "Parts Experience",
          tableFieldDescription: `Only ${enums.mob.type.Boss} has this value. When a part is destroyed, total experience gained increases by this amount.`,
          formFieldDescription: `Only ${enums.mob.type.Boss} has this value. When a part is destroyed, total experience gained increases by this amount.`,
        },
        details: {
          key: "Additional Notes",
          tableFieldDescription: "Anything the editor wants to add.",
          formFieldDescription: "Other things you want to tell readers.",
        },
        dataSources: {
          key: "Data Sources",
          tableFieldDescription: "The person or organization that measured this data.",
          formFieldDescription: "The person or organization that measured this data.",
        },
        statisticId: {
          key: "Statistic ID",
          tableFieldDescription: "This is the monster's statistics database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's statistics database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        updatedByAccountId: {
          key: "Updated By Account ID",
          tableFieldDescription: "This is the monster's updater database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's updater database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        createdByAccountId: {
          key: "Created By Account ID",
          tableFieldDescription: "This is the monster's creator database ID. Generally, you shouldn't see this.",
          formFieldDescription:
            "This is the monster's creator database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
      }
    },
    npc: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        zoneId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    option: {
      selfName: "",
      fields: {
        baseDef: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorA: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorB: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorC: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    player: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        useIn: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    player_armor: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        ability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Normal: "",
            Light: "",
            Heavy: ""
          }
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        refinement: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    player_option: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        refinement: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    player_pet: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        pStr: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        pInt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        pVit: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        pAgi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        pDex: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        str: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        int: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        vit: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        agi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        dex: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        weaponType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            OneHandSword: "",
            TwoHandSword: "",
            Bow: "",
            Bowgun: "",
            Rod: "",
            Magictool: "",
            Knuckle: "",
            Halberd: "",
            Katana: ""
          }
        },
        personaType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
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
          }
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            AllTrades: "",
            PhysicalAttack: "",
            MagicAttack: "",
            PhysicalDefense: "",
            MagicDefensem: "",
            Avoidance: "",
            Hit: "",
            SkillsEnhancement: "",
            Genius: ""
          }
        },
        weaponAtk: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        generation: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        maxLv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    player_special: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    player_weapon: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        baseAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        stability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        refinement: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    post: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        createdAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        updatedAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        createdById: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    recipe: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        activityId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    recipe_ingredient: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        count: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Metal: "",
            Cloth: "",
            Beast: "",
            Wood: "",
            Drug: "",
            Magic: "",
            Gold: "",
            Item: ""
          }
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        recipeId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    session: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        sessionToken: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        expires: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        userId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    simulator: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    skill: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        treeType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            BladeSkill: "",
            ShootSkill: "",
            MagicSkill: "",
            MarshallSkill: "",
            DualSwordSkill: "",
            HalberdSkill: "",
            MononofuSkill: "",
            CrusherSkill: "",
            FeatheringSkill: "",
            GuardSkill: "",
            ShieldSkill: "",
            KnifeSkill: "",
            KnightSkill: "",
            HunterSkill: "",
            PriestSkill: "",
            AssassinSkill: "",
            WizardSkill: "",
            SupportSkill: "",
            BattleSkill: "",
            SurvivalSkill: "",
            SmithSkill: "",
            AlchemySkill: "",
            TamerSkill: "",
            DarkPowerSkill: "",
            MagicBladeSkill: "",
            DancerSkill: "",
            MinstrelSkill: "",
            BareHandSkill: "",
            NinjaSkill: "",
            PartisanSkill: "",
            LuckSkill: "",
            MerchantSkill: "",
            PetSkill: ""
          }
        },
        posX: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        posY: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        tier: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        isPassive: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        chargingType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Chanting: "",
            Reservoir: ""
          }
        },
        distanceType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            None: "",
            Long: "",
            Short: "",
            Both: ""
          }
        },
        targetType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            None: "",
            Self: "",
            Player: "",
            Enemy: ""
          }
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        dataSources: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    skill_effect: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        condition: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        elementLogic: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        castingRange: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        effectiveRange: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        motionFixed: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        motionModified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        chantingFixed: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        chantingModified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        reservoirFixed: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        reservoirModified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        startupFrames: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        cost: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        description: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        logic: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        belongToskillId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    special: {
      selfName: "",
      fields: {
        baseDef: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    statistic: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        updatedAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        createdAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        usageTimestamps: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        viewTimestamps: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    task: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        lv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Collect: "",
            Defeat: "",
            Both: "",
            Other: ""
          }
        },
        description: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        npcId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    task_collect_require: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        count: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        taskId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    task_kill_requirement: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        mobId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        count: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        taskId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    task_reward: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Item: "",
            Exp: "",
            Money: ""
          }
        },
        value: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        probability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        taskId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    team: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        gems: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    user: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        email: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        emailVerified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        password: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        image: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    verification_token: {
      selfName: "",
      fields: {
        identifier: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        expires: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    weapon: {
      selfName: "",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            OneHandSword: "",
            TwoHandSword: "",
            Bow: "",
            Bowgun: "",
            Rod: "",
            Magictool: "",
            Knuckle: "",
            Halberd: "",
            Katana: "",
            Arrow: "",
            ShortSword: "",
            NinjutsuScroll: "",
            Shield: ""
          }
        },
        baseAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        stability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorA: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorB: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        colorC: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        elementType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Normal: "",
            Light: "",
            Dark: "",
            Water: "",
            Fire: "",
            Earth: "",
            Wind: ""
          }
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    world: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    },
    zone: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        linkZone: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        rewardNodes: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        activityId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        addressId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      }
    }
  },
  enums: enums,
};

export default dictionary;
