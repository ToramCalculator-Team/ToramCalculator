import { type dictionary } from "../type";
import * as Enums from "../../../db/schema/enums";
// 工具類型
// ----------------------------------------------------------------

const mainWeaponType: Record<Enums.MainWeaponType, string> = {
  OneHandSword: "單手劍",
  TwoHandSword: "雙手劍",
  Bow: "弓",
  Rod: "法杖",
  Magictool: "魔導具",
  Knuckle: "拳套",
  Halberd: "旋風槍",
  Katana: "拔刀劍",
  Bowgun: "弩",
};

const subWeaponType: Record<Enums.SubWeaponType, string> = {
  Arrow: "箭矢",
  ShortSword: "小刀",
  NinjutsuScroll: "忍術卷軸",
  Shield: "盾牌",
};

// 實際類型
// ----------------------------------------------------------------

const accountType: Record<Enums.AccountType, string> = {
  Admin: "管理員",
  User: "用戶",
};

const addressType: Record<Enums.AddressType, string> = {
  Normal: "一般地點",
  Limited: "限時地點",
};

const elementType: Record<Enums.ElementType, string> = {
  Normal: "無屬性",
  Dark: "暗屬性",
  Earth: "地屬性",
  Fire: "火屬性",
  Light: "光屬性",
  Water: "水屬性",
  Wind: "風屬性",
};

const weaponType: Record<Enums.WeaponType, string> = {
  ...mainWeaponType,
  ...subWeaponType,
};

const mobType: Record<Enums.MobType, string> = {
  Boss: "定點王",
  MiniBoss: "野王",
  Mob: "小怪",
};

const itemType: Record<Enums.ItemType, string> = {
  Weapon: "武器",
  Armor: "防具",
  Option: "追加裝備",
  Special: "特殊裝備",
  Crystal: "鍛晶",
  Consumable: "消耗品",
  Material: "素材",
};

const materialType: Record<Enums.MaterialType, string> = {
  Metal: "金屬",
  Cloth: "布料",
  Beast: "獸品",
  Wood: "木材",
  Drug: "藥品",
  Magic: "魔素",
};

const consumableType: Record<Enums.ConsumableType, string> = {
  MaxHp: "最大HP",
  MaxMp: "最大MP",
  pAtk: "物理攻擊",
  mAtk: "魔法攻擊",
  Aspd: "攻擊速度",
  Cspd: "技能速度",
  Hit: "命中",
  Flee: "回避",
  EleStro: "對屬增強",
  EleRes: "對數抗性",
  pRes: "物理抗性",
  mRes: "魔法抗性",
};

const crystalType: Record<Enums.CrystalType, string> = {
  NormalCrystal: "通用鍛晶",
  WeaponCrystal: "武器鍛晶",
  ArmorCrystal: "防具鍛晶",
  OptionCrystal: "追加鍛晶",
  SpecialCrystal: "特殊鍛晶",
};

const recipeIngredientType: Record<Enums.MaterialType | "Gold" | "Item", string> = {
  ...materialType,
  Gold: "金幣",
  Item: "物品",
};

const dropItemRelatedPartType: Record<Enums.BossPartType, string> = {
  A: "A",
  B: "B",
  C: "C",
};

const dropItemBreakRewardType: Record<Enums.BossPartBreakRewardType, string> = {
  None: "無",
  CanDrop: "可掉落",
  DropUp: "掉落提升",
};

const taskType: Record<Enums.TaskType, string> = {
  Collect: "收集",
  Defeat: "討伐",
  Both: "收集與討伐",
  Other: "其他",
};

const taskRewardType: Record<Enums.TaskRewardType, string> = {
  Exp: "經驗值",
  Money: "金幣",
  Item: "物品",
};

const skillTreeType: Record<Enums.SkillTreeType, string> = {
  BladeSkill: "劍術技能",
  ShootSkill: "射擊技能",
  MagicSkill: "魔法技能",
  MarshallSkill: "格鬥技能",
  DualSwordSkill: "雙劍技能",
  HalberdSkill: "斧槍技能",
  MononofuSkill: "武士技能",
  CrusherSkill: "粉碎者技能",
  FeatheringSkill: "靈魂技能",
  GuardSkill: "格擋技能",
  ShieldSkill: "護盾技能",
  KnifeSkill: "小刀技能",
  KnightSkill: "騎士技能",
  HunterSkill: "狩獵技能",
  PriestSkill: "祭司技能",
  AssassinSkill: "暗殺技能",
  WizardSkill: "巫師技能",
  //
  SupportSkill: "輔助技能",
  BattleSkill: "好戰分子",
  SurvivalSkill: "生存本能",
  //
  SmithSkill: "鍛冶大師",
  AlchemySkill: "煉金術士",
  TamerSkill: "馴獸天分",
  //
  DarkPowerSkill: "暗黑之力",
  MagicBladeSkill: "魔劍技能",
  DancerSkill: "舞者技能",
  MinstrelSkill: "詩人技能",
  BareHandSkill: "空手技能",
  NinjaSkill: "忍者技能",
  PartisanSkill: "游擊隊技能",
  //
  LuckSkill: "",
  MerchantSkill: "商人技能",
  PetSkill: "寵物技能",
};

const skillChargingType: Record<Enums.SkillChargingType, string> = {
  Chanting: "詠唱",
  Reservoir: "蓄力",
};

const skillDistanceType: Record<Enums.SkillDistanceType, string> = {
  None: "不受影響",
  Long: "僅受遠距離威力影響",
  Short: "僅受近距離威力影響",
  Both: "同時受遠距離和近距離威力影響",
};

const skillTargetType: Record<Enums.SkillTargetType, string> = {
  None: "無目標",
  Self: "自己",
  Player: "同伴",
  Enemy: "敵人",
};

const playerArmorAbilityType: Record<Enums.PlayerArmorAbilityType, string> = {
  Normal: "一般",
  Light: "輕化",
  Heavy: "重化",
};

const playerPetPersonaType: Record<Enums.PetPersonaType, string> = {
  Fervent: "熱情",
  Intelligent: "聰明",
  Mild: "溫和",
  Swift: "敏捷",
  Justice: "正義",
  Devoted: "忠誠",
  Impulsive: "衝動",
  Calm: "冷靜",
  Sly: "狡猾",
  Timid: "膽小",
  Brave: "勇敢",
  Active: "活躍",
  Sturdy: "強壯",
  Steady: "穩定",
  Max: "最大",
};

const playerPetType: Record<Enums.PetType, string> = {
  AllTrades: "全貿易",
  PhysicalAttack: "物理攻擊",
  MagicAttack: "魔法攻擊",
  PhysicalDefense: "物理防禦",
  MagicDefensem: "魔法防禦",
  Avoidance: "回避",
  Hit: "命中",
  SkillsEnhancement: "技能增強",
  Genius: "天才",
};

const playerAvatarType: Record<Enums.AvatarType, string> = {
  Decoration: "裝飾品",
  Top: "上衣",
  Bottom: "下裝",
};

const characterPersonalityType: Record<Enums.CharacterPersonalityType, string> = {
  None: "無",
  Luk: "幸運",
  Cri: "暴擊",
  Tec: "技巧",
  Men: "異抗",
};

const partnerSkillType: Record<Enums.PartnerSkillType, string> = {
  Passive: "被動",
  Active: "主動",
};

const comboStepType: Record<Enums.ComboStepType, string> = {
  None: "無",
  Start: "",
  Rengeki: "連擊",
  ThirdEye: "心眼",
  Filling: "補位",
  Quick: "迅速",
  HardHit: "增幅",
  Tenacity: "執著",
  Invincible: "無敵",
  BloodSucking: "吸血",
  Tough: "強韌",
  AMomentaryWalk: "",
  Reflection: "反射",
  Illusion: "",
  Max: "",
};

const mercenaryType: Record<Enums.MercenaryType, string> = {
  Tank: "坦克",
  Dps: "輸出",
};

const mobDifficultyFlag: Record<Enums.MobDifficultyFlag, string> = {
  Easy: "0星",
  Normal: "1星",
  Hard: "2星",
  Lunatic: "3星",
  Ultimate: "4星",
};

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
      install: "安裝",
      unInstall: "解除安裝",
      operation: "操作",
      searching: "搜尋中...",
    },
    nav: {
      home: "首頁",
      character: "角色配置",
      simulator: "連擊分析",
      profile: "個人資料",
    },
    errorPage: {
      tips: "你來到了沒有知識的荒原~，點擊屏幕返回",
    },
    settings: {
      title: "設定",
      userInterface: {
        title: "外觀",
        colorTheme: {
          title: "主題色",
          description: "只有普普通通的白天模式和黑暗模式",
        },
        isAnimationEnabled: {
          title: "是否開啟動畫",
          description: "將影響所有頁面的過渡和動畫效果持續時間。",
        },
        is3DbackgroundDisabled: {
          title: "是否禁用3D背景",
          description: "可能會產生大量性能損耗，不推薦開啟。",
        },
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
      tool: {
        title: "應用操作",
        pwa: {
          title: "PWA",
          description: "此應用為漸進式網頁應用程式（PWA），若條件允許，可安裝至裝置以獲得更佳的體驗，預設為不安裝。",
          notSupported: "此裝置不支援 PWA 或已安裝",
        },
        storageInfo: {
          title: "資源快取使用情況",
          description: "包含 localStorage、IndexedDB 等多項快取（将刷新頁面）",
          usage: "已使用",
          clearStorage: "清除此應用的所有快取",
        },
      },
    },
    index: {
      adventurer: "冒險者",
      goodMorning: "哦哈喵~ (=´ω｀=)",
      goodAfternoon: "下午好ヾ(=･ω･=)o",
      goodEvening: "晚上好(.-ω-)zzz",
      nullSearchResultWarring: "沒有找到相關內容!!!∑(ﾟДﾟノ)ノ",
      nullSearchResultTips: "變強之旅總有艱險阻道，求知路上不免遍佈荊棘\n但是這裡沒有\n搜尋結果裡沒有就是沒有",
    },
    wiki: {
      selector: {
        title: "Wiki選擇器",
        groupName: {
          combat: "戰鬥資料庫",
          daily: "日常資料庫",
        },
      },
      tableConfig: {
        title: "表格配置",
      },
      news: {
        title: "最近更新",
      },
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
          title: "隊伍配置",
        },
      },
    },
    character: {
      pageTitle: "機體表",
      description: "此頁面正在開發中，請勿使用",
    },
  },
  db: {
    _armorTocrystal: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _avatarTocharacter: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _backRelation: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _campA: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _campB: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _characterToconsumable: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalTooption: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalToplayer_armor: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalToplayer_option: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalToplayer_special: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalToplayer_weapon: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalTospecial: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _crystalToweapon: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _frontRelation: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    _linkZones: {
      selfName: "",
      description: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      cardFields: undefined,
    },
    _mobTozone: {
      selfName: "",
      fields: {
        A: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    account: {
      selfName: "帳號",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            User: "",
            Admin: "",
          },
        },
        provider: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        providerAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        refresh_token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        access_token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
          formFieldDescription: "",
        },
        id_token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        session_state: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        userId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    account_create_data: {
      selfName: "帳號創建資料",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    account_update_data: {
      selfName: "帳號更新資料",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    activity: {
      selfName: "活動",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    address: {
      selfName: "地点",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "地址的資料庫ID。通常不會顯示。",
          formFieldDescription: "地址的資料庫ID。如果需要輸入，請向開發者報告。",
        },
        name: {
          key: "名稱",
          tableFieldDescription: "地址的名稱，通常與遊戲內一致。",
          formFieldDescription: "請按照遊戲內顯示的名稱填寫。",
        },
        type: {
          key: "類型",
          tableFieldDescription: "地址的類型。分為普通地址和限時地址。",
          formFieldDescription: "請選擇地址的類型。",
          enumMap: {
            Normal: "普通地址",
            Limited: "限時地址",
          },
        },
        posX: {
          key: "X座標",
          tableFieldDescription: "地址的X座標。",
          formFieldDescription: "請輸入地址的X座標。",
        },
        posY: {
          key: "Y座標",
          tableFieldDescription: "地址的Y座標。",
          formFieldDescription: "請輸入地址的Y座標。",
        },
        worldId: {
          key: "所屬世界",
          tableFieldDescription: "地址所屬世界的ID。",
          formFieldDescription: "請選擇地址所屬的世界。",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    armor: {
      selfName: "防具",
      fields: {
        baseDef: {
          key: "基礎防禦",
          tableFieldDescription: "防具的基礎防禦值",
          formFieldDescription: "請輸入防具的基礎防禦值",
        },
        modifiers: {
          key: "修正值",
          tableFieldDescription: "防具的屬性修正值",
          formFieldDescription: "請輸入防具的屬性修正值",
        },
        colorA: {
          key: "顏色A",
          tableFieldDescription: "防具的主要顏色",
          formFieldDescription: "請選擇防具的主要顏色",
        },
        colorB: {
          key: "顏色B",
          tableFieldDescription: "防具的次要顏色",
          formFieldDescription: "請選擇防具的次要顏色",
        },
        colorC: {
          key: "顏色C",
          tableFieldDescription: "防具的第三顏色",
          formFieldDescription: "請選擇防具的第三顏色",
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "關聯的物品ID",
          formFieldDescription: "請選擇關聯的物品",
        },
      },
      description: "防具裝備信息",
    },
    avatar: {
      selfName: "時裝",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Decoration: "",
            Top: "",
            Bottom: "",
          },
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        playerId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    character: {
      selfName: "機體",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        lv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        str: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        int: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        vit: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        agi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        dex: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
            Men: "",
          },
        },
        personalityValue: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        weaponId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        subWeaponId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        armorId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        optEquipId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        speEquipId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        cooking: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        partnerSkillAId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        partnerSkillAType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Passive: "",
            Active: "",
          },
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
            Active: "",
          },
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    character_skill: {
      selfName: "機體技能",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        lv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        isStarGem: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        characterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    combo: {
      selfName: "連擊",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        disable: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        characterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    combo_step: {
      selfName: "連擊步驟",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
            Max: "",
          },
        },
        characterSkillId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        comboId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    consumable: {
      selfName: "消耗品",
      fields: {
        type: {
          key: "類型",
          tableFieldDescription: "消耗品的類型",
          formFieldDescription: "請選擇消耗品的類型",
          enumMap: {
            MaxHp: "最大生命值",
            MaxMp: "最大魔力值",
            pAtk: "物理攻擊",
            mAtk: "魔法攻擊",
            Aspd: "攻擊速度",
            Cspd: "詠唱速度",
            Hit: "命中",
            Flee: "迴避",
            EleStro: "屬性強化",
            EleRes: "屬性抗性",
            pRes: "物理抗性",
            mRes: "魔法抗性",
          },
        },
        effectDuration: {
          key: "效果持續時間",
          tableFieldDescription: "效果持續時間（秒）",
          formFieldDescription: "請輸入效果持續時間（秒）",
        },
        effects: {
          key: "效果",
          tableFieldDescription: "消耗品的效果描述",
          formFieldDescription: "請輸入消耗品的效果描述",
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "關聯的物品ID",
          formFieldDescription: "請選擇關聯的物品",
        },
      },
      description: "消耗品信息",
    },
    crystal: {
      selfName: "晶石",
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
            SpecialCrystal: "",
          },
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    drop_item: {
      selfName: "掉落物品",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        probability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        relatedPartType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            A: "",
            B: "",
            C: "",
          },
        },
        relatedPartInfo: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        breakRewardType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            None: "",
            CanDrop: "",
            DropUp: "",
          },
        },
        dropById: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    image: {
      selfName: "圖片",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        dataUrl: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        npcId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        weaponId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        armorId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        optEquipId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        mobId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    item: {
      selfName: "道具",
      fields: {
        id: {
          key: "道具ID",
          tableFieldDescription: "道具的唯一識別碼",
          formFieldDescription: "道具的唯一識別碼",
        },
        name: {
          key: "道具名稱",
          tableFieldDescription: "道具名稱",
          formFieldDescription: "道具名稱",
        },
        dataSources: {
          key: "資料來源",
          tableFieldDescription: "資料來源",
          formFieldDescription: "資料來源",
        },
        details: {
          key: "詳細資料",
          tableFieldDescription: "詳細資料",
          formFieldDescription: "詳細資料",
        },
        statisticId: {
          key: "統計ID",
          tableFieldDescription: "統計ID",
          formFieldDescription: "統計ID",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "更新者ID",
          formFieldDescription: "更新者ID",
        },
        createdByAccountId: {
          key: "建立者ID",
          tableFieldDescription: "建立者ID",
          formFieldDescription: "建立者ID",
        },
        itemType: {
          key: "道具類型",
          tableFieldDescription: "道具類型",
          formFieldDescription: "道具類型",
          enumMap: {
            Weapon: "武器",
            Armor: "防具",
            Option: "選擇",
            Special: "特殊",
            Crystal: "晶石",
            Consumable: "消耗品",
            Material: "材料",
          },
        },
      },
      description: "",
    },
    material: {
      selfName: "材料",
      fields: {
        type: {
          key: "類型",
          tableFieldDescription: "材料的類型",
          formFieldDescription: "請選擇材料的類型",
          enumMap: {
            Metal: "金屬",
            Cloth: "布料",
            Beast: "獸皮",
            Wood: "木材",
            Drug: "藥材",
            Magic: "魔法材料",
          },
        },
        ptValue: {
          key: "點數值",
          tableFieldDescription: "材料的點數值",
          formFieldDescription: "請輸入材料的點數值",
        },
        price: {
          key: "價格",
          tableFieldDescription: "材料的價格",
          formFieldDescription: "請輸入材料的價格",
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "關聯的物品ID",
          formFieldDescription: "請選擇關聯的物品",
        },
      },
      description: "材料信息",
    },
    member: {
      selfName: "成員",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        sequence: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        playerId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        partnerId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        mercenaryId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        mobId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
            Ultimate: "",
          },
        },
        teamId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        actions: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    mercenary: {
      selfName: "傭兵",
      fields: {
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Tank: "",
            Dps: "",
          },
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        skillAId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        skillAType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Passive: "",
            Active: "",
          },
        },
        skillBId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        skillBType: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Active: "",
            Passive: "",
          },
        },
      },
      description: "",
    },
    mob: {
      selfName: "怪物",
      fields: {
        name: {
          key: "名稱",
          tableFieldDescription: "怪物名稱，通常和遊戲內一致，通常...",
          formFieldDescription: "怪物名稱，請填寫和遊戲內一致的翻譯。你也不想大家看到你寫的東西之後一臉懵逼是吧。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "這是怪物的資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription: "這是怪物的資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        type: {
          key: "怪物類型",
          tableFieldDescription:
            "目前支援的類型只有這些，雖然實際上解包可以看到有很多種，但是對於咱這個應用沒啥用，因此忽略了很多種類。",
          formFieldDescription:
            "目前支援的類型只有這些，雖然實際上解包可以看到有很多種，但是對於咱這個應用沒啥用，因此忽略了很多種類。",
          enumMap: mobType,
        },
        captureable: {
          key: "是否可捕獲",
          tableFieldDescription: `這個屬性只對${mobType.Boss}和${mobType.MiniBoss}以外的怪物有效，能抓的甘瑞夫和糖明凰目前被視為特殊怪物。`,
          formFieldDescription: `如果不是${mobType.Mob}類型的怪物，請選擇不可捕獲。`,
        },
        actions: {
          key: "行為",
          tableFieldDescription: "怪物的行為描述，模擬器運行的時候會根據其中的邏輯模擬怪物行動",
          formFieldDescription: "怪物的行為描述，模擬器運行的時候會根據其中的邏輯模擬怪物行動",
        },
        baseLv: {
          key: "基礎等級",
          tableFieldDescription: `對於${mobType.Boss}來說，這個值是${mobDifficultyFlag.Easy}難度下的等級數值。其他類型的怪物由於沒有難度標識，這個值就是實際等級`,
          formFieldDescription: `如果怪物類型是${mobType.Boss}，請填寫你在選擇${mobDifficultyFlag.Easy}難度時它的等級。其他類型的怪物直接填寫實際等級即可。`,
        },
        experience: {
          key: "經驗",
          tableFieldDescription: `對於${mobType.Boss}來說，這個值是${mobDifficultyFlag.Easy}難度下的經驗值。其他類型的怪物由於沒有難度標識，這個值就是其際經驗值`,
          formFieldDescription: `如果怪物類型是${mobType.Boss}，請填寫你在選擇${mobDifficultyFlag.Easy}難度時它的經驗值。其他類型的怪物直接填實際經驗值即可。`,
        },
        initialElement: {
          key: "元素屬性",
          tableFieldDescription:
            "這是初始屬性，怪物在戰鬥時可能會改變其屬性，詳細情況將取決於怪物行為中的描述，要查看怪物行為，請點擊具體怪物",
          formFieldDescription: "這裡填寫怪物的初始屬性即可，有關屬性變化的描述請在怪物行為中編輯",
          enumMap: elementType,
        },
        radius: {
          key: "半徑",
          tableFieldDescription: "怪物的模型尺寸，主要是用來計算技能是否命中",
          formFieldDescription:
            "怪物的模型尺寸，主要是用來計算技能是否命中，從遠處按下聖拳之裁後，技能發動瞬間螢幕上顯示的距離-1就可以測出這個值。",
        },
        maxhp: {
          key: "最大生命值",
          tableFieldDescription: "不會有人不知道這個屬性是什麼意思吧，不會吧",
          formFieldDescription: `對於${mobType.Boss}來說，這個值是${mobDifficultyFlag.Easy}難度下顯示的數值。其他類型的怪物由於沒有難度標識，這個值可能需要估測`,
        },
        physicalDefense: {
          key: "物理防禦",
          tableFieldDescription: "與物理貫穿相作用的屬性",
          formFieldDescription: "與物理貫穿相作用的屬性",
        },
        physicalResistance: {
          key: "物理抗性",
          tableFieldDescription: "對怪物來說，這可能是他們最實用的物理傷害減免區間，而且玩家只能靠技能常數來應對",
          formFieldDescription: "對怪物來說，這可能是他們最實用的物理傷害減免區間，而且玩家只能靠技能常數來應對",
        },
        magicalDefense: {
          key: "魔法防禦",
          tableFieldDescription: "與魔法貫穿相作用的屬性",
          formFieldDescription: "與魔法貫穿相作用的屬性",
        },
        magicalResistance: {
          key: "魔法抗性",
          tableFieldDescription: "對怪物來說，這可能是他們最實用的魔法傷害減免區間，而且玩家只能靠技能常數來應對",
          formFieldDescription: "對怪物來說，這可能是他們最實用的魔法傷害減免區間，而且玩家只能靠技能常數來應對",
        },
        criticalResistance: {
          key: "暴擊抗性",
          tableFieldDescription: "對於魔法傷害來說，其暴擊率為（物理暴擊率*法術暴擊轉化率）-此值",
          formFieldDescription: "對於魔法傷害來說，其暴擊率為（物理暴擊率*法術暴擊轉化率）-此值",
        },
        avoidance: {
          key: "迴避",
          tableFieldDescription: "與命中值相作用後用於判斷物理傷害是否命中",
          formFieldDescription: "與命中值相作用後用於判斷物理傷害是否命中",
        },
        dodge: {
          key: "閃躲率",
          tableFieldDescription: "受到攻擊時，會根據此值判斷是否被擊中",
          formFieldDescription: "受到攻擊時，會根據此值判斷是否被擊中",
        },
        block: {
          key: "格擋率",
          tableFieldDescription: "受到攻擊時，會根據此值判斷是否格擋",
          formFieldDescription: "受到攻擊時，會根據此值判斷是否格擋",
        },
        normalAttackResistanceModifier: {
          key: "一般傷害慣性變動率",
          tableFieldDescription: "每次受到傷害時，一般慣性的變化值",
          formFieldDescription: "每次受到傷害時，一般慣性的變化值",
        },
        physicalAttackResistanceModifier: {
          key: "物理傷害慣性變動率",
          tableFieldDescription: "每次受到傷害時，物理慣性的變化值",
          formFieldDescription: "每次受到傷害時，物理慣性的變化值",
        },
        magicalAttackResistanceModifier: {
          key: "魔法傷害慣性變動率",
          tableFieldDescription: "每次受到傷害時，魔法慣性的變化值",
          formFieldDescription: "每次受到傷害時，魔法慣性的變化值",
        },
        partsExperience: {
          key: "部位經驗",
          tableFieldDescription: `只有${mobType.Boss}會有這個值，當某個部位被破壞時，討伐後的總經驗會額外增加此值`,
          formFieldDescription: `只有${mobType.Boss}會有這個值，當某個部位被破壞時，討伐後的總經驗會額外增加此值`,
        },
        details: {
          key: "額外說明",
          tableFieldDescription: "編輯者想額外描述的東西",
          formFieldDescription: "其他的你想告訴閱讀者的東西",
        },
        dataSources: {
          key: "數據來源",
          tableFieldDescription: "此數據的實際測量者或者組織",
          formFieldDescription: "此數據的實際測量者或者組織",
        },
        statisticId: {
          key: "統計信息ID",
          tableFieldDescription: "這是怪物的統計信息欄位資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription:
            "這是怪物的統計信息欄位資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "這是怪物的更新者資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription:
            "這是怪物的更新者資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
        createdByAccountId: {
          key: "創建者ID",
          tableFieldDescription: "這是怪物的創建者資料庫id，一般來說，你應該不可能看到這個",
          formFieldDescription:
            "這是怪物的創建者資料庫id，如果有哪裡需要你輸入這個，請給開發人員回饋。這是不正常的情況。",
        },
      },
      description: "",
    },
    npc: {
      selfName: "NPC",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        zoneId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    option: {
      selfName: "追加裝備",
      fields: {
        baseDef: {
          key: "基礎防禦",
          tableFieldDescription: "追加裝備的基礎防禦值",
          formFieldDescription: "請輸入追加裝備的基礎防禦值",
        },
        modifiers: {
          key: "修正值",
          tableFieldDescription: "追加裝備的屬性修正值",
          formFieldDescription: "請輸入追加裝備的屬性修正值",
        },
        colorA: {
          key: "顏色A",
          tableFieldDescription: "追加裝備的主要顏色",
          formFieldDescription: "請選擇追加裝備的主要顏色",
        },
        colorB: {
          key: "顏色B",
          tableFieldDescription: "追加裝備的次要顏色",
          formFieldDescription: "請選擇追加裝備的次要顏色",
        },
        colorC: {
          key: "顏色C",
          tableFieldDescription: "追加裝備的第三顏色",
          formFieldDescription: "請選擇追加裝備的第三顏色",
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "關聯的物品ID",
          formFieldDescription: "請選擇關聯的物品",
        },
      },
      description: "追加裝備信息",
    },
    player: {
      selfName: "玩家",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        useIn: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    player_armor: {
      selfName: "玩家防具",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        baseDef: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        ability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Normal: "",
            Light: "",
            Heavy: "",
          },
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        refinement: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    player_option: {
      selfName: "玩家追加裝備",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        refinement: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    player_pet: {
      selfName: "玩家寵物",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        pStr: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        pInt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        pVit: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        pAgi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        pDex: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        str: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        int: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        vit: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        agi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        dex: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
            Katana: "",
          },
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
            Max: "",
          },
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
            Genius: "",
          },
        },
        weaponAtk: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        generation: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        maxLv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    player_special: {
      selfName: "玩家特殊裝備",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    player_weapon: {
      selfName: "玩家武器",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        baseAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        stability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        extraAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        templateId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        refinement: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        masterId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    post: {
      selfName: "帖子",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdById: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    recipe: {
      selfName: "配方",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        activityId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    recipe_ingredient: {
      selfName: "配方材料",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        count: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
            Item: "",
          },
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        recipeId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    session: {
      selfName: "",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        sessionToken: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        expires: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        userId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    simulator: {
      selfName: "模擬器",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    skill: {
      selfName: "技能",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "這是技能的資料庫ID。通常，這不會顯示。",
          formFieldDescription: "這是技能的資料庫ID。如果系統要求您輸入這個，請向開發者報告。這不是正常情況。",
        },
        name: {
          key: "名稱",
          tableFieldDescription: "技能的名稱，通常與遊戲中的名稱一致。",
          formFieldDescription: "請輸入遊戲中顯示的技能名稱。請確保與遊戲內名稱一致，避免造成他人混淆。",
        },
        treeType: {
          key: "技能樹",
          tableFieldDescription: "技能的最上層分類，包括魔法技能、黑暗之力、輔助技能、戰士等。",
          formFieldDescription: "技能的最上層分類，包括魔法技能、黑暗之力、輔助技能、戰士等。",
          enumMap: {
            BladeSkill: "劍術技能",
            ShootSkill: "射擊技能",
            MagicSkill: "魔法技能",
            MarshallSkill: "格鬥技能",
            DualSwordSkill: "雙劍技能",
            HalberdSkill: "斧槍技能",
            MononofuSkill: "武士技能",
            CrusherSkill: "粉碎者技能",
            FeatheringSkill: "羽毛技能",
            GuardSkill: "守護技能",
            ShieldSkill: "盾牌技能",
            KnifeSkill: "短刀技能",
            KnightSkill: "騎士技能",
            HunterSkill: "獵人技能",
            PriestSkill: "祭司技能",
            AssassinSkill: "刺客技能",
            WizardSkill: "巫師技能",
            SupportSkill: "輔助技能",
            BattleSkill: "戰鬥技能",
            SurvivalSkill: "生存技能",
            SmithSkill: "鍛造技能",
            AlchemySkill: "鍊金技能",
            TamerSkill: "馴獸師技能",
            DarkPowerSkill: "黑暗之力技能",
            MagicBladeSkill: "魔劍技能",
            DancerSkill: "舞者技能",
            MinstrelSkill: "吟遊詩人技能",
            BareHandSkill: "空手技能",
            NinjaSkill: "忍者技能",
            PartisanSkill: "游擊兵技能",
            LuckSkill: "幸運技能",
            MerchantSkill: "商人技能",
            PetSkill: "寵物技能",
          },
        },
        posX: {
          key: "橫向位置",
          tableFieldDescription: "技能樹中的位置，最左側的列定義為第0列",
          formFieldDescription: "技能樹中的位置，最左側的列定義為第0列",
        },
        posY: {
          key: "縱向位置",
          tableFieldDescription: "技能樹中的位置，第0列最上方的技能定義為第0行",
          formFieldDescription: "技能樹中的位置，第0列最上方的技能定義為第0行",
        },
        tier: {
          key: "階級",
          tableFieldDescription: "主要用於傭兵技能冷卻時間的計算",
          formFieldDescription: "主要用於傭兵技能冷卻時間的計算",
        },
        targetType: {
          key: "目標類型",
          tableFieldDescription: `不需要選擇目標就能施放的技能是${skillTargetType.Self}，可以選擇${skillTargetType.Player}作為目標的技能是${skillTargetType.Player}。`,
          formFieldDescription: `不需要選擇目標就能施放的技能是${skillTargetType.Self}，可以選擇${skillTargetType.Player}作為目標的技能是${skillTargetType.Player}。`,
          enumMap: {
            None: "無目標",
            Self: "自身",
            Player: "隊友",
            Enemy: "敵人",
          },
        },
        chargingType: {
          key: "詠唱類型",
          tableFieldDescription: `不受詠唱影響的技能都是${skillChargingType.Reservoir}。`,
          formFieldDescription: `不受詠唱影響的技能都是${skillChargingType.Reservoir}。`,
          enumMap: {
            Chanting: "詠唱",
            Reservoir: "儲存",
          },
        },
        distanceType: {
          key: "距離威力類型",
          tableFieldDescription: "表示哪種類型的距離威力會影響這個技能",
          formFieldDescription: "表示哪種類型的距離威力會影響這個技能",
          enumMap: {
            None: "無影響",
            Long: "僅遠距離",
            Short: "僅近距離",
            Both: "兩者皆有",
          },
        },
        isPassive: {
          key: "被動",
          tableFieldDescription: "習得後立即生效的技能是被動技能",
          formFieldDescription: "習得後立即生效的技能是被動技能",
        },
        details: {
          key: "補充說明",
          tableFieldDescription: "編輯者想要補充的內容",
          formFieldDescription: "想要告訴讀者的其他內容",
        },
        dataSources: {
          key: "資料來源",
          tableFieldDescription: "測量這些數據的人員或組織",
          formFieldDescription: "測量這些數據的人員或組織",
        },
        statisticId: {
          key: "統計ID",
          tableFieldDescription: "這是統計資料庫的ID。通常，這不會顯示。",
          formFieldDescription: "這是統計資料庫的ID。如果系統要求您輸入這個，請向開發者報告。這不是正常情況。",
        },
        updatedByAccountId: {
          key: "更新者",
          tableFieldDescription: "這是更新者的資料庫ID。通常，這不會顯示。",
          formFieldDescription: "這是更新者的資料庫ID。如果系統要求您輸入這個，請向開發者報告。這不是正常情況。",
        },
        createdByAccountId: {
          key: "建立者",
          tableFieldDescription: "這是建立者的資料庫ID。通常，這不會顯示。",
          formFieldDescription: "這是建立者的資料庫ID。如果系統要求您輸入這個，請向開發者報告。這不是正常情況。",
        },
      },
      description: "",
    },
    skill_effect: {
      selfName: "技能效果",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        condition: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        elementLogic: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        castingRange: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        effectiveRange: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        motionFixed: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        motionModified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        chantingFixed: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        chantingModified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        reservoirFixed: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        reservoirModified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        startupFrames: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        cost: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        description: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        logic: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        details: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        belongToskillId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    special: {
      selfName: "特殊裝備",
      fields: {
        baseDef: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    statistic: {
      selfName: "統計資訊",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdAt: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        usageTimestamps: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        viewTimestamps: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    task: {
      selfName: "任務",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        lv: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Collect: "",
            Defeat: "",
            Both: "",
            Other: "",
          },
        },
        description: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        npcId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    task_collect_require: {
      selfName: "任務收集要求",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        count: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        taskId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    task_kill_requirement: {
      selfName: "任務擊殺要求",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        mobId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        count: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        taskId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    task_reward: {
      selfName: "任務獎勵",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        type: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
          enumMap: {
            Item: "",
            Exp: "",
            Money: "",
          },
        },
        value: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        probability: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        taskId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    team: {
      selfName: "隊伍",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        gems: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    user: {
      selfName: "用戶",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        email: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        emailVerified: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        password: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        image: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    verification_token: {
      selfName: "驗證令牌",
      fields: {
        identifier: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        token: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        expires: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    weapon: {
      selfName: "武器",
      fields: {
        type: {
          key: "類型",
          tableFieldDescription: "武器的類型，包括主武器和副武器",
          formFieldDescription: "請選擇武器的類型",
          enumMap: {
            OneHandSword: "單手劍",
            TwoHandSword: "雙手劍",
            Bow: "弓",
            Bowgun: "弩",
            Rod: "法杖",
            Magictool: "魔導具",
            Knuckle: "拳套",
            Halberd: "旋風槍",
            Katana: "拔刀劍",
            Arrow: "箭矢",
            ShortSword: "小刀",
            NinjutsuScroll: "忍術卷軸",
            Shield: "盾牌",
          },
        },
        baseAbi: {
          key: "基礎攻擊力",
          tableFieldDescription: "武器的基礎攻擊力",
          formFieldDescription: "請輸入武器的基礎攻擊力",
        },
        stability: {
          key: "穩定率",
          tableFieldDescription: "武器的穩定率，影響傷害波動",
          formFieldDescription: "請輸入武器的穩定率",
        },
        modifiers: {
          key: "修正值",
          tableFieldDescription: "武器的屬性修正值",
          formFieldDescription: "請輸入武器的屬性修正值",
        },
        colorA: {
          key: "顏色A",
          tableFieldDescription: "武器的主要顏色",
          formFieldDescription: "請選擇武器的主要顏色",
        },
        colorB: {
          key: "顏色B",
          tableFieldDescription: "武器的次要顏色",
          formFieldDescription: "請選擇武器的次要顏色",
        },
        colorC: {
          key: "顏色C",
          tableFieldDescription: "武器的第三顏色",
          formFieldDescription: "請選擇武器的第三顏色",
        },
        elementType: {
          key: "元素屬性",
          tableFieldDescription: "武器的元素屬性",
          formFieldDescription: "請選擇武器的元素屬性",
          enumMap: {
            Normal: "無屬性",
            Light: "光屬性",
            Dark: "暗屬性",
            Water: "水屬性",
            Fire: "火屬性",
            Earth: "地屬性",
            Wind: "風屬性",
          },
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "關聯的物品ID",
          formFieldDescription: "請選擇關聯的物品",
        },
      },
      description: "武器裝備信息",
    },
    world: {
      selfName: "世界",
      fields: {
        id: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "",
    },
    zone: {
      selfName: "區域",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "區域的唯一識別符",
          formFieldDescription: "區域的唯一識別符，由系統自動生成",
        },
        name: {
          key: "名稱",
          tableFieldDescription: "區域的名稱",
          formFieldDescription: "請輸入區域的名稱",
        },
        rewardNodes: {
          key: "獎勵節點數",
          tableFieldDescription: "區域內的獎勵節點數量",
          formFieldDescription: "請輸入區域內的獎勵節點數量",
        },
        activityId: {
          key: "活動ID",
          tableFieldDescription: "此區域所屬的活動ID",
          formFieldDescription: "選擇此區域所屬的活動",
        },
        addressId: {
          key: "地圖ID",
          tableFieldDescription: "此區域所屬的地圖ID",
          formFieldDescription: "選擇此區域所屬的地圖",
        },
        statisticId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        updatedByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        createdByAccountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      cardFields: {
        mobs: "出現的怪物",
        npcs: "出現的NPC",
      },
      description: "遊戲中的區域資訊，包含名稱、連結區域、獎勵節點等",
    },
  },
};

export default dictionary;
