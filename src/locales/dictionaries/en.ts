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
  Boss: "Boss",
  MiniBoss: "Mini Boss",
  Mob: "Mob",
};

const MainWeaponType= {
  OneHandSword: "One-handed Sword",
  TwoHandSword: "Two-handed Sword",
  Bow: "Bow",
  Rod: "Staff",
  Magictool: "Magic Tool",
  Knuckle: "Knuckle",
  Halberd: "Halberd",
  Katana: "Katana",
  Bowgun: "Bowgun",
  selfName: "Main Weapon Type",
}
const SubWeaponType = {
  Arrow: "Arrow",
  ShortSword: "Short Sword",
  NinjutsuScroll: "Ninjutsu Scroll",
  Shield: "Shield",
  selfName: "Sub Weapon Type",
}

const WeaponType = {
  ...MainWeaponType,
  ...SubWeaponType
}

const enums:DataEnums = {
  account: {
    type: {
      Admin: "Admin",
      User: "User"
    }
  },
  address: {
    type: {
      Normal: "Normal Address",
      Limited: "Limited Time Address"
    }
  },
  weapon: {
    type: WeaponType,
    elementType: elementType
  },
  mob: {
    type: mobType,
    initialElement: elementType
  },
  item: {
    itemType: {
      Weapon: "Weapon",
      Armor: "Armor",
      Option: "Option",
      Special: "Special",
      Crystal: "Crystal",
      Consumable: "Consumable",
      Material: "Material"
    }
  },
  material: {
    type: {
      Metal: "Metal",
      Cloth: "Cloth",
      Beast: "Beast",
      Wood: "Wood",
      Drug: "Drug",
      Magic: "Magic"
    }
  },
  consumable: {
    type: {
      MaxHp: "Max HP",
      MaxMp: "Max MP",
      pAtk: "Physical Attack",
      mAtk: "Magic Attack",
      Aspd: "Attack Speed",
      Cspd: "Cast Speed",
      Hit: "Hit",
      Flee: "Flee",
      EleStro: "Elemental Strength",
      EleRes: "Elemental Resistance",
      pRes: "Physical Resistance",
      mRes: "Magic Resistance"
    }
  },
  crystal: {
    type: {
      NormalCrystal: "Normal Crystal",
      WeaponCrystal: "Weapon Crystal",
      ArmorCrystal: "Armor Crystal",
      OptionCrystal: "Additional Crystal",
      SpecialCrystal: "Special Crystal"
    }
  },
  recipe_ingredient: {
    type: {
      Gold: "Gold",
      Item: "Item",
      Metal: "Metal",
      Cloth: "Cloth",
      Beast: "Beast",
      Wood: "Wood",
      Drug: "Drug",
      Magic: "Magic"
    }
  },
  drop_item: {
    relatedPartType: {
      A: "Part A",
      B: "Part B",
      C: "Part C"
    },
    breakRewardType: {
      None: "None",
      CanDrop: "Can Drop",
      DropUp: "Drop Rate Up"
    }
  },
  task: {
    type: {
      Collect: "Collect",
      Defeat: "Defeat",
      Both: "Both",
      Other: "Other"
    }
  },
  task_reward: {
    type: {
      Exp: "Experience",
      Money: "Money",
      Item: "Item"
    }
  },
  skill: {
    treeType: {
      BladeSkill: "Blade Skill",
      ShootSkill: "Shoot Skill",
      MagicSkill: "Magic Skill",
      MarshallSkill: "Martial Skill",
      DualSwordSkill: "Dual Sword Skill",
      HalberdSkill: "Halberd Skill",
      MononofuSkill: "Samurai Skill",
      CrusherSkill: "Crusher Skill",
      FeatheringSkill: "Feathering Skill",
      GuardSkill: "Guard Skill",
      ShieldSkill: "Shield Skill",
      KnifeSkill: "Knife Skill",
      KnightSkill: "Knight Skill",
      HunterSkill: "Hunter Skill",
      PriestSkill: "Priest Skill",
      AssassinSkill: "Assassin Skill",
      WizardSkill: "Wizard Skill",
      SupportSkill: "Support Skill",
      BattleSkill: "Battle Skill",
      SurvivalSkill: "Survival Skill",
      SmithSkill: "Smith Skill",
      AlchemySkill: "Alchemy Skill",
      TamerSkill: "Tamer Skill",
      DarkPowerSkill: "Dark Power Skill",
      MagicBladeSkill: "Magic Blade Skill",
      DancerSkill: "Dancer Skill",
      MinstrelSkill: "Minstrel Skill",
      BareHandSkill: "Bare Hand Skill",
      NinjaSkill: "Ninja Skill",
      PartisanSkill: "Partisan Skill",
      LuckSkill: "Luck Skill",
      MerchantSkill: "Merchant Skill",
      PetSkill: "Pet Skill"
    },
    chargingType: {
      Chanting: "Chanting",
      Reservoir: "Reservoir"
    },
    distanceType: {
      None: "Not Affected",
      Long: "Long Range Only",
      Short: "Short Range Only",
      Both: "Both Ranges"
    },
    targetType: {
      None: "No Target",
      Self: "Self",
      Player: "Ally",
      Enemy: "Enemy"
    }
  },
  player_armor: {
    ability: {
      Normal: "Normal",
      Light: "Light",
      Heavy: "Heavy"
    }
  },
  player_pet: {
    personaType: {
      Fervent: "Fervent",
      Intelligent: "Intelligent",
      Mild: "Mild",
      Swift: "Swift",
      Justice: "Justice",
      Devoted: "Devoted",
      Impulsive: "Impulsive",
      Calm: "Calm",
      Sly: "Sly",
      Timid: "Timid",
      Brave: "Brave",
      Active: "Active",
      Sturdy: "Sturdy",
      Steady: "Steady",
      Max: "Max"
    },
    type: {
      AllTrades: "All Trades",
      PhysicalAttack: "Physical Attack",
      MagicAttack: "Magic Attack",
      PhysicalDefense: "Physical Defense",
      MagicDefensem: "Magic Defense",
      Avoidance: "Avoidance",
      Hit: "Hit",
      SkillsEnhancement: "Skills Enhancement",
      Genius: "Genius"
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
  team: {},
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
      unInstall: "UnInstall",
      operation: "Operation",
      searching: "Searching...",
    },
    nav: {
      home: "Home",
      character: "Character",
      simulator: "Simulator",
      profile: "Profile",
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
        },
        colorTheme: {
          title: "Color Theme",
          description: "...",
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
          clearStorage: "Clear all caches for this app (Will refresh the page)"
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
    wiki: {
      selector: {
        title: "Wiki Selector",
        groupName: {
          combat: "Combat Database",
          daily: "Daily Database",
        },
      },
      tableConfig: {
        title: "Table Config"
      },
      news: {
        title: "News"
      }
    },
    simulator: {
      pageTitle: "Simulator",
      description: "Emmm..............",
      modifiers: "Modifiers",
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
      },
      description: ""
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
      },
      description: ""
    },
    _backRelation: {
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
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
      },
      description: ""
    },
    _frontRelation: {
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
      },
      description: ""
    },
    _linkZones: {
      selfName: "",
      description: "",
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
      },
      cardFields: undefined
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
      },
      description: ""
    },
    account: {
      selfName: "Account",
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
      },
      description: ""
    },
    account_create_data: {
      selfName: "Account Create Data",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      },
      description: ""
    },
    account_update_data: {
      selfName: "Account Update Data",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      },
      description: ""
    },
    activity: {
      selfName: "Activity",
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
      },
      description: ""
    },
    address: {
      selfName: "Address",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "The database ID of the address. Usually not displayed.",
          formFieldDescription: "The database ID of the address. If you are asked to input this, please report it to the developers."
        },
        name: {
          key: "Name",
          tableFieldDescription: "The name of the address, usually consistent with the in-game name.",
          formFieldDescription: "Please enter the name as it appears in the game."
        },
        type: {
          key: "Type",
          tableFieldDescription: "The type of address. Divided into normal and limited-time addresses.",
          formFieldDescription: "Please select the type of address.",
          enumMap: {
            Normal: "Normal Address",
            Limited: "Limited Time Address"
          }
        },
        posX: {
          key: "X Coordinate",
          tableFieldDescription: "The X coordinate of the address.",
          formFieldDescription: "Please enter the X coordinate of the address."
        },
        posY: {
          key: "Y Coordinate",
          tableFieldDescription: "The Y coordinate of the address.",
          formFieldDescription: "Please enter the Y coordinate of the address."
        },
        worldId: {
          key: "World",
          tableFieldDescription: "The ID of the world this address belongs to.",
          formFieldDescription: "Please select the world this address belongs to."
        }
      },
      description: ""
    },
    armor: {
      selfName: "Armor",
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
      },
      description: ""
    },
    avatar: {
      selfName: "Avatar",
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
      },
      description: ""
    },
    character: {
      selfName: "Character",
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
      },
      description: ""
    },
    character_skill: {
      selfName: "Character Skill",
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
      },
      description: ""
    },
    combo: {
      selfName: "Combo",
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
      },
      description: ""
    },
    combo_step: {
      selfName: "Combo Step",
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
      },
      description: ""
    },
    consumable: {
      selfName: "Consumable",
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
      },
      description: ""
    },
    crystal: {
      selfName: "Crystal",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            NormalCrystal: "",
            WeaponCrystal: "",
            ArmorCrystal: "",
            OptionCrystal: "",
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
      },
      description: ""
    },
    drop_item: {
      selfName: "Drop Item",
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
      },
      description: ""
    },
    image: {
      selfName: "Image",
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
      },
      description: ""
    },
    item: {
      selfName: "Item",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        },
        itemType: {
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
      },
      description: ""
    },
    material: {
      selfName: "Material",
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
      },
      description: ""
    },
    member: {
      selfName: "Member",
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
      },
      description: ""
    },
    mercenary: {
      selfName: "Mercenary",
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
      },
      description: ""
    },
    mob: {
      selfName: "Mob",
      fields: {
        name: {
          key: "Name",
          tableFieldDescription: "The monster's name, usually consistent with the in-game name.",
          formFieldDescription: "Please enter the monster's name as it appears in the game. You don't want others to be confused by your entry, right?",
        },
        id: {
          key: "ID",
          tableFieldDescription: "This is the monster's database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the monster's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        type: {
          key: "Monster Type",
          tableFieldDescription: "Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
          formFieldDescription: "Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
          enumMap: mobType
        },
        captureable: {
          key: "Capturable",
          tableFieldDescription: `This attribute is only valid for monsters other than ${enums.mob.type.Boss} and ${enums.mob.type.MiniBoss}. Special monsters like Ganrif and Tangming Phoenix are considered exceptions.`,
          formFieldDescription: `If the monster type is not ${enums.mob.type.Mob}, select 'Not Capturable'.`,
        },
        actions: {
          key: "Actions",
          tableFieldDescription: "Monster behavior description. The simulator will simulate actions based on this logic.",
          formFieldDescription: "Monster behavior description. The simulator will simulate actions based on this logic.",
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
          tableFieldDescription: "This is the initial element. Monsters may change their attributes during battle. Refer to the behavior description for details.",
          formFieldDescription: "Enter the monster's initial element here. Attribute changes should be described in the behavior section.",
          enumMap: elementType
        },
        radius: {
          key: "Radius",
          tableFieldDescription: "The monster's model size, mainly used to calculate whether skills hit.",
          formFieldDescription: "The monster's model size, mainly used to calculate whether skills hit. Subtract 1 from the distance displayed on the screen after casting Holy Fist.",
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
          tableFieldDescription: "This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
          formFieldDescription: "This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
        },
        magicalDefense: {
          key: "Magical Defense",
          tableFieldDescription: "Interacts with magical penetration.",
          formFieldDescription: "Interacts with magical penetration.",
        },
        magicalResistance: {
          key: "Magical Resistance",
          tableFieldDescription: "This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
          formFieldDescription: "This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
        },
        criticalResistance: {
          key: "Critical Resistance",
          tableFieldDescription: "For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
          formFieldDescription: "For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
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
          formFieldDescription: "This is the monster's statistics database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        updatedByAccountId: {
          key: "Updated By Account ID",
          tableFieldDescription: "This is the monster's updater database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the monster's updater database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        createdByAccountId: {
          key: "Created By Account ID",
          tableFieldDescription: "This is the monster's creator database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the monster's creator database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
      },
      description: ""
    },
    npc: {
      selfName: "NPC",
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
      },
      description: ""
    },
    option: {
      selfName: "Option Equipment",
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
      },
      description: ""
    },
    player: {
      selfName: "Player",
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
      },
      description: ""
    },
    player_armor: {
      selfName: "Player Armor",
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
      },
      description: ""
    },
    player_option: {
      selfName: "Player Option",
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
      },
      description: ""
    },
    player_pet: {
      selfName: "Player Pet",
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
      },
      description: ""
    },
    player_special: {
      selfName: "Player Special",
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
      },
      description: ""
    },
    player_weapon: {
      selfName: "Player Weapon",
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
      },
      description: ""
    },
    post: {
      selfName: "Post",
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
      },
      description: ""
    },
    recipe: {
      selfName: "Recipe",
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
      },
      description: ""
    },
    recipe_ingredient: {
      selfName: "Recipe Ingredient",
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
      },
      description: ""
    },
    session: {
      selfName: "Session",
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
      },
      description: ""
    },
    simulator: {
      selfName: "Simulator",
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
      },
      description: ""
    },
    skill: {
      selfName: "Skill",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "This is the skill's database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the skill's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        name: {
          key: "Name",
          tableFieldDescription: "The skill's name, usually consistent with the in-game name.",
          formFieldDescription: "Please enter the skill name as it appears in the game. You don't want others to be confused by your entry, right?",
        },
        treeType: {
          key: "Skill Tree",
          tableFieldDescription: "The top-level classification of the skill, such as Magic Skills, Dark Power, Support Skills, Warrior, etc.",
          formFieldDescription: "The top-level classification of the skill, such as Magic Skills, Dark Power, Support Skills, Warrior, etc.",
          enumMap: {
            "BladeSkill": "Blade Skill",
            "ShootSkill": "Shoot Skill",
            "MagicSkill": "Magic Skill",
            "MarshallSkill": "Marshall Skill",
            "DualSwordSkill": "Dual Sword Skill",
            "HalberdSkill": "Halberd Skill",
            "MononofuSkill": "Mononofu Skill",
            "CrusherSkill": "Crusher Skill",
            "FeatheringSkill": "Feathering Skill",
            "GuardSkill": "Guard Skill",
            "ShieldSkill": "Shield Skill",
            "KnifeSkill": "Knife Skill",
            "KnightSkill": "Knight Skill",
            "HunterSkill": "Hunter Skill",
            "PriestSkill": "Priest Skill",
            "AssassinSkill": "Assassin Skill",
            "WizardSkill": "Wizard Skill",
            "SupportSkill": "Support Skill",
            "BattleSkill": "Battle Skill",
            "SurvivalSkill": "Survival Skill",
            "SmithSkill": "Smith Skill",
            "AlchemySkill": "Alchemy Skill",
            "TamerSkill": "Tamer Skill",
            "DarkPowerSkill": "Dark Power Skill",
            "MagicBladeSkill": "Magic Blade Skill",
            "DancerSkill": "Dancer Skill",
            "MinstrelSkill": "Minstrel Skill",
            "BareHandSkill": "Bare Hand Skill",
            "NinjaSkill": "Ninja Skill",
            "PartisanSkill": "Partisan Skill",
            "LuckSkill": "Luck Skill",
            "MerchantSkill": "Merchant Skill",
            "PetSkill": "Pet Skill"
          }
        },
        posX: {
          key: "Horizontal Position",
          tableFieldDescription: "Position in the skill tree, with the leftmost column defined as column 0",
          formFieldDescription: "Position in the skill tree, with the leftmost column defined as column 0",
        },
        posY: {
          key: "Vertical Position",
          tableFieldDescription: "Position in the skill tree, with the topmost skill in column 0 defined as row 0",
          formFieldDescription: "Position in the skill tree, with the topmost skill in column 0 defined as row 0",
        },
        tier: {
          key: "Tier",
          tableFieldDescription: "Mainly used to calculate mercenary skill cooldown intervals",
          formFieldDescription: "Mainly used to calculate mercenary skill cooldown intervals",
        },
        targetType: {
          key: "Target Type",
          tableFieldDescription: `Skills that can be cast without selecting a target are ${enums.skill.targetType.Self}, skills that can target ${enums.skill.targetType.Player} are ${enums.skill.targetType.Player}.`,
          formFieldDescription: `Skills that can be cast without selecting a target are ${enums.skill.targetType.Self}, skills that can target ${enums.skill.targetType.Player} are ${enums.skill.targetType.Player}.`,
          enumMap: {
            "None": "No target",
            "Self": "Self",
            "Player": "Ally",
            "Enemy": "Enemy"
          }
        },
        chargingType: {
          key: "Casting Type",
          tableFieldDescription: `Skills unaffected by chanting are all ${enums.skill.chargingType.Reservoir}.`,
          formFieldDescription: `Skills unaffected by chanting are all ${enums.skill.chargingType.Reservoir}.`,
          enumMap: {
            "Chanting": "Chanting",
            "Reservoir": "Reservoir"
          }
        },
        distanceType: {
          key: "Distance Power Type",
          tableFieldDescription: "Indicates which types of distance power affect this skill",
          formFieldDescription: "Indicates which types of distance power affect this skill",
          enumMap: {
            "None": "No effect",
            "Long": "Long range only",
            "Short": "Short range only",
            "Both": "Both"
          }
        },
        isPassive: {
          key: "Is Passive",
          tableFieldDescription: "Skills that take effect immediately upon learning are passive skills",
          formFieldDescription: "Skills that take effect immediately upon learning are passive skills",
        },
        details: {
          key: "Additional Notes",
          tableFieldDescription: "Anything the editor wants to add",
          formFieldDescription: "Other things you want to tell readers",
        },
        dataSources: {
          key: "Data Sources",
          tableFieldDescription: "The person or organization that measured this data",
          formFieldDescription: "The person or organization that measured this data",
        },
        statisticId: {
          key: "Statistic ID",
          tableFieldDescription: "This is the statistics database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the statistics database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        updatedByAccountId: {
          key: "Updated By",
          tableFieldDescription: "This is the updater's database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the updater's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        },
        createdByAccountId: {
          key: "Created By",
          tableFieldDescription: "This is the creator's database ID. Generally, you shouldn't see this.",
          formFieldDescription: "This is the creator's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
        }
      },
      description: ""
    },
    skill_effect: {
      selfName: "Skill Effect",
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
      },
      description: ""
    },
    special: {
      selfName: "Special Equipment",
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
      },
      description: ""
    },
    statistic: {
      selfName: "Statistic",
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
      },
      description: ""
    },
    task: {
      selfName: "Task",
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
      },
      description: ""
    },
    task_collect_require: {
      selfName: "Task Collect Require",
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
      },
      description: ""
    },
    task_kill_requirement: {
      selfName: "Task Kill Require",
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
      },
      description: ""
    },
    task_reward: {
      selfName: "Task Reward",
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
      },
      description: ""
    },
    team: {
      selfName: "Team",
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
      },
      description: ""
    },
    user: {
      selfName: "User",
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
      },
      description: ""
    },
    verification_token: {
      selfName: "Verification Token",
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
      },
      description: ""
    },
    weapon: {
      selfName: "Weapon",
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
      },
      description: ""
    },
    world: {
      selfName: "World",
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
      },
      description: ""
    },
    zone: {
      selfName: "Zone",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "Unique identifier of the zone",
          formFieldDescription: "Unique identifier of the zone, automatically generated by the system"
        },
        name: {
          key: "Name",
          tableFieldDescription: "Name of the zone",
          formFieldDescription: "Please enter the name of the zone"
        },
        rewardNodes: {
          key: "Reward Nodes",
          tableFieldDescription: "Number of reward nodes in the zone",
          formFieldDescription: "Please enter the number of reward nodes in the zone"
        },
        activityId: {
          key: "Activity ID",
          tableFieldDescription: "ID of the activity this zone belongs to",
          formFieldDescription: "Select the activity this zone belongs to"
        },
        addressId: {
          key: "Map ID",
          tableFieldDescription: "ID of the map this zone belongs to",
          formFieldDescription: "Select the map this zone belongs to"
        }
      },
      cardFields: {
        mobs: "Appearing Monsters",
        npcs: "Appearing NPCs"
      },
      description: "Information about zones in the game, including name, linked zones, reward nodes, etc."
    }
  },
  enums: enums,
};

export default dictionary;
