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
    searchPlaceholder: "這裡是搜尋框~",
    columnsHidden: "隱藏列",
    boolean: {
      true: "是",
      false: "否",
    },
    actions: {
      add: "新增",
      create: "建立",
      remove: "刪除",
      update: "更新",
      open: "開啟",
      upload: "上傳",
      save: "儲存",
      reset: "清空",
      modify: "修改",
      cancel: "取消",
      close: "關閉",
      back: "返回",
      filter: "過濾",
      generateImage: "生成圖片",
      swap: "替換",
      checkInfo: "查看詳情",
      zoomIn: "放大",
      zoomOut: "縮小",
      logIn: "登入",
      logOut: "登出",
      register: "註冊",
      switchUser: "切換用戶",
    },
    nav: {
      home: "首頁",
      mobs: "怪物",
      skills: "技能",
      equipments: "裝備",
      crystals: "鍛晶",
      pets: "寵物",
      items: "消耗品",
      character: "角色配置",
      simulator: "連擊分析",
      profile: "",
    },
    errorPage: {
      tips: "你來到了沒有知識的荒原~，點擊屏幕返回",
    },
    settings: {
      title: "設定",
      userInterface: {
        title: "外觀",
        isAnimationEnabled: {
          title: "是否開啟動畫",
          description: "將影響所有頁面的過渡和動畫效果持續時間。",
        },
        is3DbackgroundDisabled: {
          title: "是否禁用3D背景",
          description: "可能會產生大量性能損耗，不推薦開啟。",
        }
      },
      language: {
        title: "語言",
        selectedLanguage: {
          title: "選擇語言",
          description: "影響所有的介面文本，但是無法改變資料類文本。",
          zhCN: "簡體中文",
          zhTW: "繁體中文",
          enUS: "English",
          jaJP: "日本語",
        },
      },
      statusAndSync: {
        title: "狀態與同步",
        restorePreviousStateOnStartup: {
          title: "啟動時恢復上一次的狀態",
          description: "暫未實現。",
        },
        syncStateAcrossClients: {
          title: "同步所有客戶端狀態",
          description: "此設定僅當使用者登入時生效，未登入時客戶端不具有身分標識，無法同步。",
        },
      },
      privacy: {
        title: "隱私",
        postVisibility: {
          title: "作品可見性",
          description:
            "作品可見性包括：角色、怪物、鍛晶、主武器、副武器、身體裝備、追加裝備、特殊裝備、寵物、技能、消耗品、連擊、分析器。",
          everyone: "所有人可見",
          friends: "僅好友可見",
          onlyMe: "僅自己可見",
        },
      },
      messages: {
        title: "訊息通知",
        notifyOnContentChange: {
          title: "以下內容發生變化時通知我",
          description: "暫未實現。",
          notifyOnReferencedContentChange: "引用內容改變時",
          notifyOnLike: "收到讚時",
          notifyOnBookmark: "作品被收藏時",
        },
      },
      about: {
        title: "關於此應用",
        description: {
          title: "描述",
          description: "沒想好怎麼寫。",
        },
        version: {
          title: "版本",
          description: "0.0.1-alpha",
        },
      },
    },
    index: {
      adventurer: "冒險者",
      goodMorning: "哦哈喵~ (=´ω｀=)",
      goodAfternoon: "下午好ヾ(=･ω･=)o",
      goodEvening: "晚上好(.-ω-)zzz",
      nullSearchResultWarring: "沒有找到相關內容!!!∑(ﾟДﾟノ)ノ",
      nullSearchResultTips: "變強之旅總有艱險阻道，求知路上不免遍佈荊棘\n但是這裡沒有\n搜尋結果裡沒有就是沒有",
    },
    mob: {
      pageTitle: "怪物",
      table: {
        title: "怪物資訊表",
        description: "不是所有怪物一開始就是怪物，也不是所有怪物看起來都像怪物。",
      },
      news: {
        title: "最近更新",
      },
      augmented: "是否展示全部星級資料",
      canNotModify: "系統生成，不可修改",
      form: {
        description: "上傳定點boss資料時請使用一星數據，系統將以規則自動計算其餘星級資料。",
      },
      difficultyflag: {
        Easy: "0星",
        Normal: "1星",
        Hard: "2星",
        Lunatic: "3星",
        Ultimate: "4星"
      }
    },
    crystal: {
      pageTitle: "鍛晶表",
      description: "正在開發中，請勿使用。",
      canNotModify: "系統生成，不可修改",
      crystalForm: {
        description: "阿拉啦",
      },
    },
    skill: {
      pageTitle: "技能",
      table: {
        title: "技能表",
        description: "小心無限循環。",
      },
      news: {
        title: "最近更新",
      },
      form: {
        description: "正在開發中，请勿使用。",
      }
    },
    simulator: {
      pageTitle: "流程計算器",
      description: "正在開發中，請勿使用",
      modifiers: "加成項",
      // dialogData: {
      //   selfName: "属性",
      //   lv: "等級",
      //   mainWeapon: {
      //     type: "主武器型別",
      //     baseAtk: "主武器基礎攻擊力",
      //     refinement: "主武器精煉值",
      //     stability: "主武器穩定率",
      //     selfName: "主武器",
      //   },
      //   subWeapon: {
      //     type: "副武器型別",
      //     baseAtk: "副武器基礎攻擊力",
      //     refinement: "副武器精煉值",
      //     stability: "副武器穩定率",
      //     selfName: "副武器",
      //   },
      //   bodyArmor: {
      //     type: "身體裝備類型",
      //     baseDef: "身體裝備基礎防禦力",
      //     refinement: "身體裝備精煉值",
      //     selfName: "身體裝備",
      //   },
      //   str: "力量",
      //   int: "智力",
      //   vit: "耐力",
      //   agi: "敏捷",
      //   dex: "靈巧",
      //   luk: "幸運",
      //   cri: "爆擊",
      //   tec: "技巧",
      //   men: "異抗",
      //   pPie: "物理貫穿",
      //   mPie: "魔法貫穿",
      //   pStab: "物理穩定",
      //   sDis: "近距離威力",
      //   lDis: "遠距離威力",
      //   crC: "法術爆擊轉換率",
      //   cdC: "法術爆傷轉換率",
      //   weaponPatkT: "武器攻擊轉換率（物理）",
      //   weaponMatkT: "武器攻擊轉換率（魔法）",
      //   uAtk: "拔刀攻擊",
      //   stro: {
      //     Light: "对光属性增强",
      //     Normal: "对無属性增强",
      //     Dark: "对暗属性增强",
      //     Water: "对水属性增强",
      //     Fire: "对火属性增强",
      //     Earth: "对土属性增强",
      //     Wind: "对風属性增强",
      //     selfName: "对属增強",
      //   },
      //   total: "總傷害提升",
      //   final: "最終傷害提升",
      //   am: "行動速度",
      //   cm: "詠唱縮減",
      //   aggro: "仇恨值倍率",
      //   maxHp: "生命值上限",
      //   maxMp: "法力值上限",
      //   pCr: "物理暴擊",
      //   pCd: "物理爆傷",
      //   mainWeaponAtk: "主武器攻擊力",
      //   subWeaponAtk: "副武器攻擊力",
      //   weaponAtk: "武器攻擊力",
      //   pAtk: "物理攻擊",
      //   mAtk: "魔法攻擊",
      //   aspd: "攻擊速度",
      //   cspd: "詠唱速度",
      //   ampr: "攻回",
      //   hp: "當前生命值",
      //   mp: "當前法力值",
      //   name: "名稱",
      //   pDef: "物理防禦",
      //   pRes: "物理抗性",
      //   mDef: "魔法防禦",
      //   mRes: "魔法抗性",
      //   cRes: "暴擊抗性",
      //   anticipate: "看穿",

      //   index: "序號",
      //   skillEffectType: "讀取條類型",
      //   actionFixedDuration: "動畫固定畫面",
      //   actionModifiableDuration: "動畫可加速影格",
      //   skillActionFrames: "動畫長度總值",
      //   chantingFixedDuration: "固定詠唱時間",
      //   chantingModifiableDuration: "可加速詠唱時長",
      //   skillChantingFrames: "詠唱時長總值",
      //   chargingFixedDuration: "固定蓄力時長",
      //   chargingModifiableDuration: "可加速蓄力時長",
      //   skillChargingFrames: "蓄力長度總值",
      //   skillDuration: "技能總耗時",
      //   skillStartupFrames: "技能前搖",
      //   vMatk: "有效攻擊力（魔法）",
      //   vPatk: "有效物攻（物理）",
      // },
      actualValue: "實際值",
      baseValue: "基礎值",
      staticModifiers: "常態加成",
      dynamicModifiers: "暫時加成",
      simulatorPage: {
        mobsConfig: {
          title: "目標怪物",
        },
        teamConfig: {
          title: "隊伍配置"
        }
      }
    },
    character: {
      pageTitle: "機體表",
      description: "此頁面正在開發中，請勿使用",
    },
  },
  enums: {
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
        Boss: "定点王",
        MiniBoss: "野王",
        Mob: "小怪",
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
  },
};

export default dictionary;
