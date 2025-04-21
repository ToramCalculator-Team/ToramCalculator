import { DataEnums } from "~/../db/dataEnums";
import { type dictionary } from "../type";
import { MobType } from "../../../db/kysely/enums";

const elementType = {
  Normal: "无属性",
  Dark: "暗属性",
  Earth: "地属性",
  Fire: "火属性",
  Light: "光属性",
  Water: "水属性",
  Wind: "风属性",
};

const mobType: Record<MobType, string> = {
  Boss: "定点王",
  MiniBoss: "野王",
  Mob: "小怪",
};

const MainWeaponType = {
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
};

const SubWeaponType = {
  Arrow: "箭矢",
  ShortSword: "小刀",
  NinjutsuScroll: "忍术卷轴",
  Shield: "盾牌",
  selfName: "副武器类型",
};

const WeaponType = {
  ...MainWeaponType,
  ...SubWeaponType,
};

const SkillTreeType = {
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
}

const SkillTargetType = {
  None: "无目标",
  Self: "自己",
  Player: "同伴",
  Enemy: "敌人",
}

const SkillChargingType = {
  Chanting: "咏唱",
  Reservoir: "蓄力",
}

const SkillDistanceType = {
  None: "不受影响",
  Long: "仅受远距离威力影响",
  Short: "仅受近距离威力影响",
  Both: "同时受远距离和近距离威力影响",
}

const enums: DataEnums = {
  account: {
    type: {
      Admin: "管理员",
      User: "用户",
    },
  },
  address: {
    type: {
      Normal: "一般地点",
      Limited: "限时地点",
    },
  },
  weapon: {
    type: WeaponType,
    elementType: elementType,
  },
  mob: {
    type: {
      Boss: "定点王",
      MiniBoss: "野王",
      Mob: "小怪",
    },
    initialElement: elementType,
  },
  item: {
    type: {
      Weapon: "",
      Armor: "",
      Option: "",
      Special: "",
      Crystal: "",
      Consumable: "",
      Material: "",
    },
  },
  material: {
    type: {
      Metal: "",
      Cloth: "",
      Beast: "",
      Wood: "",
      Drug: "",
      Magic: "",
    },
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
      mRes: "",
    },
  },
  crystal: {
    type: {
      NormalCrystal: "通用锻晶",
      WeaponCrystal: "武器锻晶",
      ArmorCrystal: "防具锻晶",
      OptEquipCrystal: "追加锻晶",
      SpecialCrystal: "特殊锻晶",
    },
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
      Magic: "",
    },
  },
  drop_item: {
    relatedPartType: {
      A: "",
      B: "",
      C: "",
    },
    breakRewardType: {
      None: "",
      CanDrop: "",
      DropUp: "",
    },
  },
  task: {
    type: {
      Collect: "",
      Defeat: "",
      Both: "",
      Other: "",
    },
  },
  task_reward: {
    type: {
      Exp: "",
      Money: "",
      Item: "",
    },
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
      Both: "",
    },
    targetType: {
      None: "",
      Self: "",
      Player: "",
      Enemy: "",
    },
  },
  player_armor: {
    ability: {
      Normal: "一般",
      Light: "轻化",
      Heavy: "重化",
    },
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
      Max: "",
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
      Genius: "",
    },
    weaponType: MainWeaponType,
  },
  avatar: {
    type: {
      Decoration: "",
      Top: "",
      Bottom: "",
    },
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
      Active: "",
    },
    partnerSkillBType: {
      Passive: "",
      Active: "",
    },
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
      Max: "",
    },
  },
  mercenary: {
    type: {
      Tank: "",
      Dps: "",
    },
    skillAType: {
      Passive: "",
      Active: "",
    },
    skillBType: {
      Passive: "",
      Active: "",
    },
  },
  member: {
    mobDifficultyFlag: {
      Easy: "",
      Normal: "",
      Hard: "",
      Lunatic: "",
      Ultimate: "",
    },
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
  _armorTocrystal: undefined,
  _avatarTocharacter: undefined,
  _BackRelation: undefined,
  _campA: undefined,
  _campB: undefined,
  _characterToconsumable: undefined,
  _crystalTooption: undefined,
  _crystalToplayer_armor: undefined,
  _crystalToplayer_option: undefined,
  _crystalToplayer_special: undefined,
  _crystalToplayer_weapon: undefined,
  _crystalTospecial: undefined,
  _crystalToweapon: undefined,
  _FrontRelation: undefined,
  _mobTozone: undefined
};

const dictionary: dictionary = {
  ui: {
    searchPlaceholder: "这里是搜索框~",
    columnsHidden: "隐藏列",
    boolean: {
      true: "是",
      false: "否",
    },
    actions: {
      add: "添加",
      create: "创建",
      remove: "删除",
      update: "更新",
      open: "打开",
      upload: "上传",
      save: "保存",
      reset: "清空",
      modify: "修改",
      cancel: "取消",
      close: "关闭",
      back: "返回",
      filter: "过滤",
      generateImage: "生成图片",
      swap: "替换",
      zoomIn: "放大",
      zoomOut: "缩小",
      checkInfo: "查看详情",
      logIn: "登录",
      logOut: "登出",
      register: "注册",
      switchUser: "切换用户",
      install: "安装",
      unInstall: "卸载",
    },
    nav: {
      home: "首页", 
      mobs: "怪物",
      skills: "技能",
      equipments: "装备",
      crystals: "锻晶",
      pets: "宠物",
      items: "消耗品",
      character: "角色配置",
      simulator: "流程模拟",
      profile: "",
    },
    errorPage: {
      tips: "你来到了没有知识的荒原~，点击屏幕返回",
    },
    settings: {
      title: "设置",
      userInterface: {
        title: "外观",
        isAnimationEnabled: {
          title: "开启动画与过渡效果",
          description: "将影响所有页面的过渡和动画效果持续时间。",
        },
        is3DbackgroundDisabled: {
          title: "开启3D效果",
          description: "可能会产生大量性能损耗，不推荐开启。",
        },
        colorTheme: {
          title: "颜色模式",
          description: "只有普普通通的白天模式和黑暗模式"
        }
      },
      language: {
        title: "语言偏好",
        selectedLanguage: {
          title: "系统语言",
          description: "影响所有的界面文本，但是无法改变数据类文本。",
          zhCN: "简体中文",
          zhTW: "繁体中文",
          enUS: "English",
          jaJP: "日本語",
        },
      },
      statusAndSync: {
        title: "状态和同步",
        restorePreviousStateOnStartup: {
          title: "启动时恢复上一次的状态",
          description: "暂未实现。",
        },
        syncStateAcrossClients: {
          title: "同步所有客户端状态",
          description: "此配置仅当用户登录时生效，未登录时客户端不具有身份标识，无法同步。",
        },
      },
      privacy: {
        title: "隐私",
        postVisibility: {
          title: "作品可见性",
          description: "作品可见性包括：角色、怪物、锻晶、主武器、副武器、身体装备、追加装备、特殊装备、宠物、技能、消耗品、连击、分析器。",
          everyone: "所有人可见",
          friends: "仅好友可见",
          onlyMe: "仅自己可见",
        },
      },
      messages: {
        title: "消息通知",
        notifyOnContentChange: {
          title: "以下内容发生变化时通知我",
          description: "暂未实现。",
          notifyOnReferencedContentChange: "引用内容发生变化时",
          notifyOnLike: "收到赞时",
          notifyOnBookmark: "作品被收藏时",
        },
      },
      about: {
        title: "关于此应用",
        description: {
          title: "描述",
          description: "没想好怎么写。",
        },
        version: {
          title: "版本",
          description: "0.0.1-alpha",
        },
      },
      tool: {
        title: "应用操作",
        pwa: {
          title: "PWA",
          description: "此应用被设计完渐进式Web应用程序(PWA)，在条件允许的情况下可以安装到设备上以提供更优秀的体验，默认不安装。",
          notSupported: "此设备不支持PWA或已安装"
        },
        storageInfo: {
          title: "资源缓存占用情况",
          description: "包含localstorage,indexedDB等多项缓存",
          usage: "已使用",
          clearStorage: "清除此应用的所有缓存（将刷新页面）"
        }
      }
    },
    index: {
      adventurer: "冒险者",
      goodMorning: "哦哈喵~ (=´ω｀=)",
      goodAfternoon: "下午好ヾ(=･ω･=)o",
      goodEvening: "晚上好(。-ω-)zzz",
      nullSearchResultWarring: "没有找到相关内容!!!∑(ﾟДﾟノ)ノ",
      nullSearchResultTips: "变强之旅总有艰险阻道，求知路上不免遍布荆棘\n但是这里没有\n搜索结果里没有就是没有",
    },
    mob: {
      pageTitle: "怪物",
      table: {
        title: "怪物表",
        description: "不是所有怪物一开始就是怪物，也不是所有怪物看起来都像怪物。",
      },
      news: {
        title: "最近更新",
      },
      augmented: "是否展示全部星级数据",
      canNotModify: "系统生成，不可修改",
      form: {
        description: "上传定点boss数据时请使用一星数据，系统将按规则自动计算其余星级数据。",
      },
      difficultyflag: {
        Easy: "0星",
        Normal: "1星",
        Hard: "2星",
        Lunatic: "3星",
        Ultimate: "4星",
      },
    },
    crystal: {
      pageTitle: "锻晶表",
      description: "正在开发中，请勿使用。",
      canNotModify: "系统生成，不可修改",
      crystalForm: {
        description: "阿拉啦",
      },
    },
    skill: {
      pageTitle: "技能",
      table: {
        title: "技能表",
        description: "小心无限循环。",
      },
      news: {
        title: "最近更新",
      },
      form: {
        description: "正在开发中，请勿使用。",
      },
    },
    simulator: {
      pageTitle: "流程计算器",
      description: "正在开发中，请勿使用",
      modifiers: "加成项",
      // dialogData: {
      //     selfName: "角色",
      //     lv: "等级",
      //     mainWeapon: {
      //       type: "主武器类型",
      //       baseAtk: "主武器基础攻击力",
      //       refinement: "主武器精炼值",
      //       stability: "主武器稳定率",
      //       selfName: "主武器",
      //     },
      //     subWeapon: {
      //       type: "副武器类型",
      //       baseAtk: "副武器基础攻击力",
      //       refinement: "副武器精炼值",
      //       stability: "副武器稳定率",
      //       selfName: "副武器",
      //     },
      //     bodyArmor: {
      //       type: "身体装备类型",
      //       baseDef: "身体装备基础防御力",
      //       refinement: "身体装备精炼值",
      //       selfName: "身体装备",
      //     },
      //     str: "力量",
      //     int: "智力",
      //     vit: "耐力",
      //     agi: "敏捷",
      //     dex: "灵巧",
      //     luk: "幸运",
      //     cri: "暴击",
      //     tec: "技巧",
      //     men: "异抗",
      //     pPie: "物理贯穿",
      //     mPie: "魔法贯穿",
      //     pStab: "物理稳定",
      //     sDis: "近距离威力",
      //     lDis: "远距离威力",
      //     crC: "法术暴击转化率",
      //     cdC: "法术爆伤转化率",
      //     weaponPatkT: "武器攻击转化率（物理）",
      //     weaponMatkT: "武器攻击转化率（魔法）",
      //     uAtk: "拔刀攻击",
      //     stro: {
      //       Light: "对光属性增强",
      //       Normal: "对无属性增强",
      //       Dark: "对暗属性增强",
      //       Water: "对水属性增强",
      //       Fire: "对火属性增强",
      //       Earth: "对地属性增强",
      //       Wind: "对风属性增强",
      //       selfName: "对属性增强列表",
      //     },
      //     total: "总伤害提升",
      //     final: "最终伤害提升",
      //     am: "行动速度",
      //     cm: "咏唱缩减",
      //     aggro: "仇恨值倍率",
      //     maxHp: "生命值上限",
      //     maxMp: "法力值上限",
      //     pCr: "物理暴击",
      //     pCd: "物理爆伤",
      //     mainWeaponAtk: "主武器攻击力",
      //     subWeaponAtk: "副武器攻击力",
      //     weaponAtk: "武器攻击力",
      //     pAtk: "物理攻击",
      //     mAtk: "魔法攻击",
      //     aspd: "攻击速度",
      //     cspd: "咏唱速度",
      //     ampr: "攻回",
      //     hp: "当前生命值",
      //     mp: "当前法力值",
      //     name: "名称",
      //     pDef: "物理防御",
      //     pRes: "物理抗性",
      //     mDef: "魔法防御",
      //     mRes: "魔法抗性",
      //     cRes: "暴击抗性",
      //     anticipate: "看穿",
      //     index: "序号",
      //     skillEffectType: "读条类型",
      //     actionFixedDuration: "动画固定帧",
      //     actionModifiableDuration: "动画可加速帧",
      //     skillActionFrames: "动画时长总值",
      //     chantingFixedDuration: "固定咏唱时长",
      //     chantingModifiableDuration: "可加速咏唱时长",
      //     skillChantingFrames: "咏唱时长总值",
      //     chargingFixedDuration: "固定蓄力时长",
      //     chargingModifiableDuration: "可加速蓄力时长",
      //     skillChargingFrames: "蓄力时长总值",
      //     skillDuration: "技能总耗时",
      //     skillStartupFrames: "技能前摇",
      //     vMatk: "有效攻击力（魔法）",
      //     vPatk: "有效物攻（物理）",
      // },
      actualValue: "实际值",
      baseValue: "基础值",
      staticModifiers: "常态加成",
      dynamicModifiers: "临时加成",
      simulatorPage: {
        mobsConfig: {
          title: "目标怪物",
        },
        teamConfig: {
          title: "队伍配置",
        },
      },
    },
    character: {
      pageTitle: "机体表",
      description: "此页面正在开发中，请勿使用",
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
      description: ""
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
      description: ""
    },
    _BackRelation: {
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
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
      description: ""
    },
    _FrontRelation: {
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
      description: ""
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
      description: ""
    },
    account: {
      selfName: "",
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
      description: ""
    },
    account_create_data: {
      selfName: "",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: ""
    },
    account_update_data: {
      selfName: "",
      fields: {
        accountId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: ""
    },
    activity: {
      selfName: "",
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
      },
      description: ""
    },
    address: {
      selfName: "",
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
            Normal: "",
            Limited: "",
          },
        },
        posX: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        posY: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        worldId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: ""
    },
    armor: {
      selfName: "",
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
        colorA: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorB: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorC: {
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
      description: ""
    },
    avatar: {
      selfName: "",
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
      description: ""
    },
    character: {
      selfName: "",
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
      description: ""
    },
    character_skill: {
      selfName: "",
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
      description: ""
    },
    combo: {
      selfName: "",
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
      description: ""
    },
    combo_step: {
      selfName: "",
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
      description: ""
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
            mRes: "",
          },
        },
        effectDuration: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        effects: {
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
      description: ""
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
      description: ""
    },
    drop_item: {
      selfName: "",
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
      description: ""
    },
    image: {
      selfName: "",
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
      description: ""
    },
    item: {
      selfName: "",
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
            Weapon: "",
            Armor: "",
            Option: "",
            Special: "",
            Crystal: "",
            Consumable: "",
            Material: "",
          },
        },
        name: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        dataSources: {
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
      description: ""
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
            Magic: "",
          },
        },
        ptValue: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        price: {
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
      description: ""
    },
    member: {
      selfName: "",
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
          formFieldDescription: ""
        }
      },
      description: ""
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
      description: ""
    },
    mob: {
      selfName: "",
      fields: {
        name: {
          key: "名称",
          tableFieldDescription: "怪物名称，通常和游戏内一致，通常...",
          formFieldDescription: "怪物名称，请填写和游戏内一致的翻译。你也不想大伙看到你写的东西之后一脸懵逼是吧。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "这是怪物的数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是怪物的数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        type: {
          key: "怪物类型",
          tableFieldDescription: "目前支持的类型只有这些，虽然实际上解包可以看到有很多种，但是对于咱这个应用没啥用，因此忽略了很多种类。",
          formFieldDescription: "目前支持的类型只有这些，虽然实际上解包可以看到有很多种，但是对于咱这个应用没啥用，因此忽略了很多种类。",
          enumMap: mobType,
        },
        captureable: {
          key: "是否可捕获",
          tableFieldDescription: `这个属性只对${enums.mob.type.Boss}和${enums.mob.type.MiniBoss}以外的怪物有效，能抓的甘瑞夫和糖明凰目前被视为特殊怪物。`,
          formFieldDescription: `如果不是${enums.mob.type.Mob}类型的怪物，请选择不可捕获。`,
        },
        actions: {
          key: "行为",
          tableFieldDescription: "怪物的行为描述，模拟器运行的时候会根据其中的逻辑模拟怪物行动",
          formFieldDescription: "怪物的行为描述，模拟器运行的时候会根据其中的逻辑模拟怪物行动",
        },
        baseLv: {
          key: "基础等级",
          tableFieldDescription: `对于${enums.mob.type.Boss}来说，这个值是${enums.member.mobDifficultyFlag.Easy}难度下的等级数值。其他类型的怪物由于没有难度标识，这个值就是实际等级`,
          formFieldDescription: `如果怪物类型是${enums.mob.type.Boss},请填写你在选择${enums.member.mobDifficultyFlag.Easy}难度时它的等级。其他类型的怪物直接填写实际等级即可。`,
        },
        experience: {
          key: "经验",
          tableFieldDescription: `对于${enums.mob.type.Boss}来说，这个值是${enums.member.mobDifficultyFlag.Easy}难度下的经验值。其他类型的怪物由于没有难度标识，这个值就是其际经验值`,
          formFieldDescription: `如果怪物类型是${enums.mob.type.Boss},请填写你在选择${enums.member.mobDifficultyFlag.Easy}难度时它的经验值。其他类型的怪物直接填写实际经验值即可。`,
        },
        initialElement: {
          key: "元素属性",
          tableFieldDescription: "这是初始属性，怪物在战斗时可能会改变其属性，详细情况将取决于怪物行为中的描述，要查看怪物行为，请点击具体怪物",
          formFieldDescription: "这里填写怪物的初始属性即可，有关属性变化的描述请在怪物行为中编辑",
          enumMap: elementType,
        },
        radius: {
          key: "半径",
          tableFieldDescription: "怪物的模型尺寸，主要是用来计算技能是否命中",
          formFieldDescription: "怪物的模型尺寸，主要是用来计算技能是否命中,从远处按下圣拳之裁后，技能发动瞬间屏幕上显示的距离-1就可以测出这个值。",
        },
        maxhp: {
          key: "最大生命值",
          tableFieldDescription: "不会有人不知道这个属性是什么意思吧，不会吧",
          formFieldDescription: `对于${enums.mob.type.Boss}来说，这个值是${enums.member.mobDifficultyFlag.Easy}难度下显示的数值。其他类型的怪物由于没有难度标识，这个值可能需要估测`,
        },
        physicalDefense: {
          key: "物理防御",
          tableFieldDescription: "与物理贯穿相作用的属性",
          formFieldDescription: "与物理贯穿相作用的属性",
        },
        physicalResistance: {
          key: "物理抗性",
          tableFieldDescription: "对怪物来说，这可能是他们最实用的物理伤害减免区间，而且玩家只能靠技能常数来应对",
          formFieldDescription: "对怪物来说，这可能是他们最实用的物理伤害减免区间，而且玩家只能靠技能常数来应对",
        },
        magicalDefense: {
          key: "魔法防御",
          tableFieldDescription: "与魔法贯穿相作用的属性",
          formFieldDescription: "与魔法贯穿相作用的属性",
        },
        magicalResistance: {
          key: "魔法抗性",
          tableFieldDescription: "对怪物来说，这可能是他们最实用的魔法伤害减免区间，而且玩家只能靠技能常数来应对",
          formFieldDescription: "对怪物来说，这可能是他们最实用的魔法伤害减免区间，而且玩家只能靠技能常数来应对",
        },
        criticalResistance: {
          key: "暴击抗性",
          tableFieldDescription: "对于魔法伤害来说，其暴击率为（物理暴击率*法术暴击转化率）-此值",
          formFieldDescription: "对于魔法伤害来说，其暴击率为（物理暴击率*法术暴击转化率）-此值",
        },
        avoidance: {
          key: "回避",
          tableFieldDescription: "与命中值相作用后用于判断物理伤害是否命中",
          formFieldDescription: "与命中值相作用后用于判断物理伤害是否命中",
        },
        dodge: {
          key: "闪躲率",
          tableFieldDescription: "受到攻击时，会根据此值判断是否被击中",
          formFieldDescription: "受到攻击时，会根据此值判断是否被击中",
        },
        block: {
          key: "格挡率",
          tableFieldDescription: "受到攻击时，会根据此值判断是否格挡",
          formFieldDescription: "受到攻击时，会根据此值判断是否格挡",
        },
        normalAttackResistanceModifier: {
          key: "一般伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，一般惯性的变化值",
          formFieldDescription: "每次受到伤害时，一般惯性的变化值",
        },
        physicalAttackResistanceModifier: {
          key: "物理伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，物理惯性的变化值",
          formFieldDescription: "每次受到伤害时，物理惯性的变化值",
        },
        magicalAttackResistanceModifier: {
          key: "魔法伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，魔法惯性的变化值",
          formFieldDescription: "每次受到伤害时，魔法惯性的变化值",
        },
        partsExperience: {
          key: "部位经验",
          tableFieldDescription: `只有${enums.mob.type.Boss}会有这个值，当某个部位被破坏时，讨伐后的总经验会额外增加此值`,
          formFieldDescription: `只有${enums.mob.type.Boss}会有这个值，当某个部位被破坏时，讨伐后的总经验会额外增加此值`,
        },
        details: {
          key: "额外说明",
          tableFieldDescription: "编辑者想额外描述的东西",
          formFieldDescription: "其他的你想告诉阅读者的东西",
        },
        dataSources: {
          key: "数据来源",
          tableFieldDescription: "此数据的实际测量者或者组织",
          formFieldDescription: "此数据的实际测量者或者组织",
        },
        statisticId: {
          key: "统计信息ID",
          tableFieldDescription: "这是怪物的统计信息字段数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是怪物的统计信息字段数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "这是怪物的更新者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是怪物的更新者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        createdByAccountId: {
          key: "创建者ID",
          tableFieldDescription: "这是怪物的创建者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是怪物的创建者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
      },
      description: "不是所有怪物一开始就是怪物，也不是所有怪物看起来都像怪物。"
    },
    npc: {
      selfName: "",
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
      },
      description: ""
    },
    option: {
      selfName: "",
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
        colorA: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorB: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorC: {
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
      description: ""
    },
    player: {
      selfName: "",
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
      description: ""
    },
    player_armor: {
      selfName: "",
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
      description: ""
    },
    player_option: {
      selfName: "",
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
      description: ""
    },
    player_pet: {
      selfName: "",
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
      description: ""
    },
    player_special: {
      selfName: "",
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
      description: ""
    },
    player_weapon: {
      selfName: "",
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
      description: ""
    },
    post: {
      selfName: "",
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
      description: ""
    },
    recipe: {
      selfName: "",
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
      },
      description: ""
    },
    recipe_ingredient: {
      selfName: "",
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
      description: ""
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
      description: ""
    },
    simulator: {
      selfName: "",
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
      description: ""
    },
    skill: {
      selfName: "",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "这是技能的数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是技能的数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        name: {
          key: "名称",
          tableFieldDescription: "技能名称，通常和游戏内一致，通常...",
          formFieldDescription: "技能名称，请填写和游戏内一致的翻译。你也不想大伙看到你写的东西之后一脸懵逼是吧。",
        },
        treeType: {
          key: "所属技能树",
          tableFieldDescription: "技能的最顶层分类，比如魔法技能、黑暗之力、辅助技能、好战分子等",
          formFieldDescription: "技能的最顶层分类，比如魔法技能、黑暗之力、辅助技能、好战分子等",
          enumMap: SkillTreeType
        },
        posX: {
          key: "水平坐标",
          tableFieldDescription: "在技能树中的位置，最左侧的一列定义为第0列",
          formFieldDescription: "在技能树中的位置，最左侧的一列定义为第0列",
        },
        posY: {
          key: "垂直坐标",
          tableFieldDescription: "在技能树中的位置，第0列中最上面的那个技能位置定义为第0行",
          formFieldDescription: "在技能树中的位置，第0列中最上面的那个技能位置定义为第0行",
        },
        tier: {
          key: "位阶",
          tableFieldDescription: "主要用于计算佣兵技能释放间隔",
          formFieldDescription: "主要用于计算佣兵技能释放间隔",
        },
        targetType: {
          key: "目标类型",
          tableFieldDescription: `不需要选择目标即可释放的为${enums.skill.targetType.Self}，能以${enums.skill.targetType.Player}为目标的技能即为${enums.skill.targetType.Player}。`,
          formFieldDescription: `不需要选择目标即可释放的为${enums.skill.targetType.Self}，能以${enums.skill.targetType.Player}为目标的技能即为${enums.skill.targetType.Player}。`,
          enumMap: SkillTargetType
        },
        chargingType: {
          key: "施法动作类型",
          tableFieldDescription: `不受咏唱影响的都为${enums.skill.chargingType.Reservoir}。`,
          formFieldDescription: `不受咏唱影响的都为${enums.skill.chargingType.Reservoir}。`,
          enumMap: SkillChargingType
        },
        distanceType: {
          key: "距离威力类型",
          tableFieldDescription: "表示此技能受这些类型的距离威力影响",
          formFieldDescription: "表示此技能受这些类型的距离威力影响",
          enumMap: SkillDistanceType
        },
        isPassive: {
          key: "是被动技能吗",
          tableFieldDescription: "学习后就一直生效的技能即为被动技能",
          formFieldDescription: "学习后就一直生效的技能即为被动技能",
        },
        details: {
          key: "额外说明",
          tableFieldDescription: "编辑者想额外描述的东西",
          formFieldDescription: "其他的你想告诉阅读者的东西",
        },
        dataSources: {
          key: "数据来源",
          tableFieldDescription: "此数据的实际测量者或者组织",
          formFieldDescription: "此数据的实际测量者或者组织",
        },
        statisticId: {
          key: "统计信息ID",
          tableFieldDescription: "这是统计信息字段数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是统计信息字段数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "这是更新者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是更新者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        createdByAccountId: {
          key: "创建者ID",
          tableFieldDescription: "这是创建者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription: "这是创建者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
      },
      description: ""
    },
    skill_effect: {
      selfName: "",
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
      description: ""
    },
    special: {
      selfName: "",
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
      description: ""
    },
    statistic: {
      selfName: "",
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
      description: ""
    },
    task: {
      selfName: "",
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
      },
      description: ""
    },
    task_collect_require: {
      selfName: "",
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
      description: ""
    },
    task_kill_requirement: {
      selfName: "",
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
      description: ""
    },
    task_reward: {
      selfName: "",
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
      description: ""
    },
    team: {
      selfName: "",
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
      description: ""
    },
    user: {
      selfName: "",
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
      description: ""
    },
    verification_token: {
      selfName: "",
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
      description: ""
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
            Shield: "",
          },
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
        modifiers: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorA: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorB: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        colorC: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
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
            Wind: "",
          },
        },
        itemId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: ""
    },
    world: {
      selfName: "",
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
      },
      description: ""
    },
    zone: {
      selfName: "",
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
        linkZone: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        rewardNodes: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        activityId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        addressId: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: ""
    },
  },
  enums: enums,
};

export default dictionary;
