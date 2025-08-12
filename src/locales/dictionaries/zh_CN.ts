import { type dictionary } from "../type";
import * as Enums from "@db/schema/enums";
// 工具类型
// ----------------------------------------------------------------

const mainWeaponType: Record<Enums.MainWeaponType, string> = {
  OneHandSword: "单手剑",
  TwoHandSword: "双手剑",
  Bow: "弓",
  Rod: "法杖",
  Magictool: "魔导具",
  Knuckle: "拳套",
  Halberd: "旋风枪",
  Katana: "拔刀剑",
  Bowgun: "弩",
};

const subWeaponType: Record<Enums.SubWeaponType, string> = {
  Arrow: "箭矢",
  ShortSword: "小刀",
  NinjutsuScroll: "忍术卷轴",
  Shield: "盾牌",
};

// 实际类型
// ----------------------------------------------------------------

const accountType: Record<Enums.AccountType, string> = {
  Admin: "管理员",
  User: "用户",
};

const addressType: Record<Enums.AddressType, string> = {
  Normal: "一般地点",
  Limited: "限时地点",
};

const elementType: Record<Enums.ElementType, string> = {
  Normal: "无属性",
  Dark: "暗属性",
  Earth: "地属性",
  Fire: "火属性",
  Light: "光属性",
  Water: "水属性",
  Wind: "风属性",
};

const weaponType: Record<Enums.WeaponType, string> = {
  ...mainWeaponType,
  ...subWeaponType,
};

const mobType: Record<Enums.MobType, string> = {
  Boss: "定点王",
  MiniBoss: "野王",
  Mob: "小怪",
};

const itemType: Record<Enums.ItemType, string> = {
  Weapon: "武器",
  Armor: "防具",
  Option: "追加武器",
  Special: "特殊武器",
  Crystal: "锻晶",
  Consumable: "消耗品",
  Material: "素材",
};

const materialType: Record<Enums.MaterialType, string> = {
  Metal: "金属",
  Cloth: "布料",
  Beast: "兽品",
  Wood: "木材",
  Drug: "药品",
  Magic: "魔素",
};

const consumableType: Record<Enums.ConsumableType, string> = {
  MaxHp: "最大HP",
  MaxMp: "最大MP",
  pAtk: "物理攻击",
  mAtk: "魔法攻击",
  Aspd: "攻击速度",
  Cspd: "技能速度",
  Hit: "命中",
  Flee: "回避",
  EleStro: "对属增强",
  EleRes: "对数抗性",
  pRes: "物理抗性",
  mRes: "魔法抗性",
};

const crystalType: Record<Enums.CrystalType, string> = {
  NormalCrystal: "通用锻晶",
  WeaponCrystal: "武器锻晶",
  ArmorCrystal: "防具锻晶",
  OptionCrystal: "追加锻晶",
  SpecialCrystal: "特殊锻晶",
};

const recipeIngredientType: Record<Enums.MaterialType | "Gold" | "Item", string> = {
  ...materialType,
  Gold: "金币",
  Item: "物品"
};

const dropItemRelatedPartType: Record<Enums.BossPartType, string> = {
  A: "A",
  B: "B",
  C: "C",
};

const dropItemBreakRewardType: Record<Enums.BossPartBreakRewardType, string> = {
  None: "无",
  CanDrop: "可掉落",
  DropUp: "掉落提升",
};

const taskType: Record<Enums.TaskType, string> = {
  Collect: "收集",
  Defeat: "讨伐",
  Both: "收集与讨伐",
  Other: "其他",
};

const taskRewardType: Record<Enums.TaskRewardType, string> = {
  Exp: "经验值",
  Money: "金币",
  Item: "物品",
};

const skillTreeType: Record<Enums.SkillTreeType, string> = {
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
};

const skillChargingType: Record<Enums.SkillChargingType, string> = {
  Chanting: "咏唱",
  Reservoir: "蓄力",
};

const skillDistanceType: Record<Enums.SkillDistanceType, string> = {
  None: "不受影响",
  Long: "仅受远距离威力影响",
  Short: "仅受近距离威力影响",
  Both: "同时受远距离和近距离威力影响",
};

const skillTargetType: Record<Enums.SkillTargetType, string> = {
  None: "无目标",
  Self: "自己",
  Player: "同伴",
  Enemy: "敌人",
};

const playerArmorAbilityType: Record<Enums.PlayerArmorAbilityType, string> = {
  Normal: "一般",
  Light: "轻化",
  Heavy: "重化",
};

const playerPetPersonaType: Record<Enums.PetPersonaType, string> = {
  Fervent: "热情",
  Intelligent: "聪明",
  Mild: "温和",
  Swift: "敏捷",
  Justice: "正义",
  Devoted: "忠诚",
  Impulsive: "冲动",
  Calm: "冷静",
  Sly: "狡猾",
  Timid: "胆小",
  Brave: "勇敢",
  Active: "活跃",
  Sturdy: "强壮",
  Steady: "稳定",
  Max: "最大",
};

const playerPetType: Record<Enums.PetType, string> = {
  AllTrades: "全贸易",
  PhysicalAttack: "物理攻击",
  MagicAttack: "魔法攻击",
  PhysicalDefense: "物理防御",
  MagicDefense: "魔法防御",
  Avoidance: "回避",
  Hit: "命中",
  SkillsEnhancement: "技能增强",
  Genius: "天才",
};

const playerAvatarType: Record<Enums.AvatarType, string> = {
  Decoration: "装饰品",
  Top: "上衣",
  Bottom: "下装",
};

const characterPersonalityType: Record<Enums.CharacterPersonalityType, string> = {
  None: "无",
  Luk: "幸运",
  Cri: "暴击",
  Tec: "技巧",
  Men: "异抗",
};

const partnerSkillType: Record<Enums.PartnerSkillType, string> = {
  Passive: "被动",
  Active: "主动",
};

const comboStepType: Record<Enums.ComboStepType, string> = {
  None: "无",
  Start: "",
  Rengeki: "连击",
  ThirdEye: "心眼",
  Filling: "补位",
  Quick: "迅速",
  HardHit: "增幅",
  Tenacity: "执着",
  Invincible: "无敌",
  BloodSucking: "吸血",
  Tough: "强韧",
  AMomentaryWalk: "",
  Reflection: "反射",
  Illusion: "", 
  Max: "",
};

const mercenaryType: Record<Enums.MercenaryType, string> = {
  Tank: "坦克",
  Dps: "输出",
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
      operation: "操作",
      searching: "搜索中...",
    },
    nav: {
      home: "首页",
      character: "角色配置",
      simulator: "流程模拟",
      profile: "个人设置",
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
          description: "只有普普通通的白天模式和黑暗模式",
        },
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
          description:
            "作品可见性包括：角色、怪物、锻晶、主武器、副武器、身体装备、追加装备、特殊装备、宠物、技能、消耗品、连击、分析器。",
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
          description:
            "此应用被设计完渐进式Web应用程序(PWA)，在条件允许的情况下可以安装到设备上以提供更优秀的体验，默认不安装。",
          notSupported: "此设备不支持PWA或已安装",
        },
        storageInfo: {
          title: "资源缓存占用情况",
          description: "包含localstorage,indexedDB等多项缓存",
          usage: "已使用",
          clearStorage: "清除此应用的所有缓存（将刷新页面）",
        },
      },
    },
    index: {
      adventurer: "冒险者",
      goodMorning: "哦哈喵~ (=´ω｀=)",
      goodAfternoon: "下午好ヾ(=･ω･=)o",
      goodEvening: "晚上好(。-ω-)zzz",
      nullSearchResultWarring: "没有找到相关内容!!!∑(ﾟДﾟノ)ノ",
      nullSearchResultTips: "变强之旅总有艰险阻道，求知路上不免遍布荆棘\n但是这里没有\n搜索结果里没有就是没有",
    },
    wiki: {
      selector: {
        title: "Wiki选择器",
        groupName: {
          combat: "战斗数据库",
          daily: "日常数据",
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
      //       baseAbi: "身体装备基础防御力",
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
      selfName: "防具-水晶关联",
      fields: {
        A: {
          key: "防具ID",
          tableFieldDescription: "关联的防具ID",
          formFieldDescription: "选择要关联的防具",
        },
        B: {
          key: "水晶ID",
          tableFieldDescription: "关联的水晶ID",
          formFieldDescription: "选择要关联的水晶",
        },
      },
      description: "记录防具和水晶之间的关联关系",
    },
    _avatarTocharacter: {
      selfName: "头像-角色关联",
      fields: {
        A: {
          key: "头像ID",
          tableFieldDescription: "关联的头像ID",
          formFieldDescription: "选择要关联的头像",
        },
        B: {
          key: "角色ID",
          tableFieldDescription: "关联的角色ID",
          formFieldDescription: "选择要关联的角色",
        },
      },
      description: "记录头像和角色之间的关联关系",
    },
    _backRelation: {
      selfName: "反向关联",
      fields: {
        A: {
          key: "源ID",
          tableFieldDescription: "关联的源ID",
          formFieldDescription: "选择源对象",
        },
        B: {
          key: "目标ID",
          tableFieldDescription: "关联的目标ID",
          formFieldDescription: "选择目标对象",
        },
      },
      description: "记录对象之间的反向关联关系",
    },
    _campA: {
      selfName: "阵营A关联",
      fields: {
        A: {
          key: "源ID",
          tableFieldDescription: "关联的源ID",
          formFieldDescription: "选择源对象",
        },
        B: {
          key: "目标ID",
          tableFieldDescription: "关联的目标ID",
          formFieldDescription: "选择目标对象",
        },
      },
      description: "记录阵营A的关联关系",
    },
    _campB: {
      selfName: "阵营B关联",
      fields: {
        A: {
          key: "源ID",
          tableFieldDescription: "关联的源ID",
          formFieldDescription: "选择源对象",
        },
        B: {
          key: "目标ID",
          tableFieldDescription: "关联的目标ID",
          formFieldDescription: "选择目标对象",
        },
      },
      description: "记录阵营B的关联关系",
    },
    _characterToconsumable: {
      selfName: "角色-消耗品关联",
      fields: {
        A: {
          key: "角色ID",
          tableFieldDescription: "关联的角色ID",
          formFieldDescription: "选择要关联的角色",
        },
        B: {
          key: "消耗品ID",
          tableFieldDescription: "关联的消耗品ID",
          formFieldDescription: "选择要关联的消耗品",
        },
      },
      description: "记录角色和消耗品之间的关联关系",
    },
    _crystalTooption: {
      selfName: "水晶-选项关联",
      fields: {
        A: {
          key: "水晶ID",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "选项ID",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "记录水晶和选项之间的关联关系",
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
      selfName: "怪物-区域关联",
      fields: {
        A: {
          key: "怪物ID",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        B: {
          key: "区域ID",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
      },
      description: "记录怪物和区域之间的关联关系",
    },
    account: {
      selfName: "账号",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "账号的唯一标识符",
          formFieldDescription: "账号的唯一标识符",
        },
        type: {
          key: "类型",
          tableFieldDescription: "账号的类型",
          formFieldDescription: "选择账号类型",
          enumMap: {
            User: "用户",
            Admin: "管理员",
          },
        },
        provider: {
          key: "提供商",
          tableFieldDescription: "账号的提供商",
          formFieldDescription: "选择账号提供商",
        },
        providerAccountId: {
          key: "提供商账号ID",
          tableFieldDescription: "提供商账号的唯一标识符",
          formFieldDescription: "提供商账号的唯一标识符",
        },
        refresh_token: {
          key: "刷新令牌",
          tableFieldDescription: "账号的刷新令牌",
          formFieldDescription: "账号的刷新令牌",
        },
        access_token: {
          key: "访问令牌",
          tableFieldDescription: "账号的访问令牌",
          formFieldDescription: "账号的访问令牌",
        },
        expires_at: {
          key: "过期时间",
          tableFieldDescription: "令牌的过期时间",
          formFieldDescription: "令牌的过期时间",
        },
        token_type: {
          key: "令牌类型",
          tableFieldDescription: "令牌的类型",
          formFieldDescription: "令牌的类型",
        },
        scope: {
          key: "范围",
          tableFieldDescription: "令牌的权限范围",
          formFieldDescription: "令牌的权限范围",
        },
        id_token: {
          key: "ID令牌",
          tableFieldDescription: "账号的ID令牌",
          formFieldDescription: "账号的ID令牌",
        },
        session_state: {
          key: "会话状态",
          tableFieldDescription: "账号的会话状态",
          formFieldDescription: "账号的会话状态",
        },
        userId: {
          key: "用户ID",
          tableFieldDescription: "关联的用户ID",
          formFieldDescription: "选择关联的用户",
        },
      },
      description: "用户账号信息",
    },
    account_create_data: {
      selfName: "账号创建的数据",
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
      selfName: "账号更新数据",
      fields: {
        accountId: {
          key: "账号ID",
          tableFieldDescription: "关联的账号ID",
          formFieldDescription: "选择要更新的账号",
        },
      },
      description: "账号更新记录",
    },
    activity: {
      selfName: "活动",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "活动的唯一标识符",
          formFieldDescription: "活动的唯一标识符",
        },
        name: {
          key: "名称",
          tableFieldDescription: "活动的名称",
          formFieldDescription: "请输入活动名称",
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
      description: "游戏活动信息",
    },
    address: {
      selfName: "地点",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "地址的唯一标识符",
          formFieldDescription: "地址的唯一标识符",
        },
        name: {
          key: "名称",
          tableFieldDescription: "地址的名称",
          formFieldDescription: "请输入地址名称",
        },
        type: {
          key: "类型",
          tableFieldDescription: "地址的类型",
          formFieldDescription: "选择地址类型",
          enumMap: {
            Normal: "普通",
            Limited: "限时",
          },
        },
        posX: {
          key: "X坐标",
          tableFieldDescription: "地址的X坐标",
          formFieldDescription: "请输入X坐标",
        },
        posY: {
          key: "Y坐标",
          tableFieldDescription: "地址的Y坐标",
          formFieldDescription: "请输入Y坐标",
        },
        worldId: {
          key: "世界ID",
          tableFieldDescription: "所属世界的ID",
          formFieldDescription: "选择所属世界",
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
      description: "游戏中的地址信息",
    },
    armor: {
      selfName: "防具",
      fields: {
        baseAbi: {
          key: "基础防御",
          tableFieldDescription: "防具的基础防御值",
          formFieldDescription: "请输入基础防御值",
        },
        modifiers: {
          key: "自带的附魔属性",
          tableFieldDescription: "锻造或者掉落时自带的附魔属性",
          formFieldDescription: "锻造或者掉落时自带的附魔属性",
        },
        colorA: {
          key: "颜色A",
          tableFieldDescription: "防具的主要颜色",
          formFieldDescription: "选择主要颜色",
        },
        colorB: {
          key: "颜色B",
          tableFieldDescription: "防具的次要颜色",
          formFieldDescription: "选择次要颜色",
        },
        colorC: {
          key: "颜色C",
          tableFieldDescription: "防具的第三颜色",
          formFieldDescription: "选择第三颜色",
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "关联的物品ID",
          formFieldDescription: "选择关联的物品",
        },
      },
      description: "防具装备信息",
    },
    avatar: {
      selfName: "时装",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "头像的唯一标识符",
          formFieldDescription: "头像的唯一标识符",
        },
        name: {
          key: "名称",
          tableFieldDescription: "头像的名称",
          formFieldDescription: "请输入头像名称",
        },
        type: {
          key: "类型",
          tableFieldDescription: "头像的类型",
          formFieldDescription: "选择头像类型",
          enumMap: {
            Decoration: "装饰",
            Top: "顶部",
            Bottom: "底部",
          },
        },
        modifiers: {
          key: "修正值",
          tableFieldDescription: "头像的属性修正值",
          formFieldDescription: "请输入属性修正值",
        },
        playerId: {
          key: "玩家ID",
          tableFieldDescription: "关联的玩家ID",
          formFieldDescription: "选择关联的玩家",
        },
      },
      description: "时装信息",
    },
    character: {
      selfName: "机体",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "角色的唯一标识符",
          formFieldDescription: "角色的唯一标识符",
        },
        name: {
          key: "名称",
          tableFieldDescription: "角色的名称",
          formFieldDescription: "请输入角色名称",
        },
        lv: {
          key: "等级",
          tableFieldDescription: "角色的等级",
          formFieldDescription: "请输入角色等级",
        },
        str: {
          key: "力量",
          tableFieldDescription: "角色的力量值",
          formFieldDescription: "请输入力量值",
        },
        int: {
          key: "智力",
          tableFieldDescription: "角色的智力值",
          formFieldDescription: "请输入智力值",
        },
        vit: {
          key: "体质",
          tableFieldDescription: "角色的体质值",
          formFieldDescription: "请输入体质值",
        },
        agi: {
          key: "敏捷",
          tableFieldDescription: "角色的敏捷值",
          formFieldDescription: "请输入敏捷值",
        },
        dex: {
          key: "灵巧",
          tableFieldDescription: "角色的灵巧值",
          formFieldDescription: "请输入灵巧值",
        },
        personalityType: {
          key: "性格类型",
          tableFieldDescription: "角色的性格类型",
          formFieldDescription: "选择性格类型",
          enumMap: {
            None: "无",
            Luk: "幸运",
            Cri: "暴击",
            Tec: "技巧",
            Men: "精神",
          },
        },
        personalityValue: {
          key: "性格值",
          tableFieldDescription: "角色的性格值",
          formFieldDescription: "请输入性格值",
        },
        weaponId: {
          key: "武器ID",
          tableFieldDescription: "装备的武器ID",
          formFieldDescription: "选择装备的武器",
        },
        subWeaponId: {
          key: "副武器ID",
          tableFieldDescription: "装备的副武器ID",
          formFieldDescription: "选择装备的副武器",
        },
        armorId: {
          key: "防具ID",
          tableFieldDescription: "装备的防具ID",
          formFieldDescription: "选择装备的防具",
        },
        optEquipId: {
          key: "可选装备ID",
          tableFieldDescription: "装备的可选装备ID",
          formFieldDescription: "选择可选装备",
        },
        speEquipId: {
          key: "特殊装备ID",
          tableFieldDescription: "装备的特殊装备ID",
          formFieldDescription: "选择特殊装备",
        },
        cooking: {
          key: "烹饪",
          tableFieldDescription: "角色的烹饪技能",
          formFieldDescription: "请输入烹饪技能等级",
        },
        modifiers: {
          key: "修正值",
          tableFieldDescription: "角色的属性修正值",
          formFieldDescription: "请输入属性修正值",
        },
        partnerSkillAId: {
          key: "伙伴技能A ID",
          tableFieldDescription: "伙伴技能A的ID",
          formFieldDescription: "选择伙伴技能A",
        },
        partnerSkillAType: {
          key: "伙伴技能A类型",
          tableFieldDescription: "伙伴技能A的类型",
          formFieldDescription: "选择伙伴技能A类型",
          enumMap: {
            Passive: "被动",
            Active: "主动",
          },
        },
        partnerSkillBId: {
          key: "伙伴技能B ID",
          tableFieldDescription: "伙伴技能B的ID",
          formFieldDescription: "选择伙伴技能B",
        },
        partnerSkillBType: {
          key: "伙伴技能B类型",
          tableFieldDescription: "伙伴技能B的类型",
          formFieldDescription: "选择伙伴技能B类型",
          enumMap: {
            Passive: "被动",
            Active: "主动",
          },
        },
        masterId: {
          key: "主人ID",
          tableFieldDescription: "角色的主人ID",
          formFieldDescription: "选择角色主人",
        },
        details: {
          key: "详情",
          tableFieldDescription: "角色的详细信息",
          formFieldDescription: "请输入角色详情",
        },
        statisticId: {
          key: "统计ID",
          tableFieldDescription: "关联的统计ID",
          formFieldDescription: "选择关联的统计",
        },
      },
      description: "机体配置",
    },
    character_skill: {
      selfName: "机体习得的技能",
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
      selfName: "连击",
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
      selfName: "连击步骤",
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
          key: "类型",
          tableFieldDescription: "消耗品类型",
          formFieldDescription: "选择消耗品类型",
          enumMap: {
            Hit: "命中",
            MaxHp: "最大生命值",
            MaxMp: "最大魔法值",
            pAtk: "物理攻击力",
            mAtk: "魔法攻击力",
            Aspd: "攻击速度",
            Cspd: "魔法速度",
            Flee: "回避",
            EleStro: "元素属性增强",
            EleRes: "元素属性抵抗",
            pRes: "物理属性抵抗",
            mRes: "魔法属性抵抗",
          },
        },
        effectDuration: {
          key: "效果持续时间",
          tableFieldDescription: "消耗品效果持续时间",
          formFieldDescription: "请输入消耗品效果持续时间",
        },
        effects: {
          key: "效果",
          tableFieldDescription: "消耗品效果",
          formFieldDescription: "请输入消耗品效果",
        },
        itemId: {
          key: "所属道具ID",
          tableFieldDescription: "消耗品所属的道具ID",
          formFieldDescription: "选择消耗品所属的道具",
        },
      },
      description: "",
    },
    crystal: {
      selfName: "锻晶",
      fields: {
        type: {
          key: "类型",
          tableFieldDescription: "锻晶的类型",
          formFieldDescription: "选择锻晶的类型",
          enumMap: {
            NormalCrystal: "普通锻晶",
            WeaponCrystal: "武器锻晶",
            ArmorCrystal: "防具锻晶",
            OptionCrystal: "追加锻晶",
            SpecialCrystal: "特殊锻晶",
          },
        },
        modifiers: {
          key: "属性",
          tableFieldDescription: "锻晶的属性",
          formFieldDescription: "请输入锻晶的属性",
        },
        itemId: {
          key: "所属道具ID",
          tableFieldDescription: "锻晶所属的道具ID",
          formFieldDescription: "选择锻晶所属的道具",
        },
      },
      description: "",
    },
    drop_item: {
      selfName: "掉落物品",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "掉落物品的唯一标识符",
          formFieldDescription: "掉落物品的唯一标识符",
        },
        itemId: {
          key: "物品ID",
          tableFieldDescription: "掉落物品的物品ID",
          formFieldDescription: "选择掉落物品的物品",
        },
        probability: {
          key: "概率",
          tableFieldDescription: "掉落物品的概率",
          formFieldDescription: "请输入掉落物品的概率",
        },
        relatedPartType: {
          key: "掉落部位",
          tableFieldDescription: "掉落物品的掉落部位",
          formFieldDescription: "选择掉落物品的掉落部位",
          enumMap: {
            A: "A",
            B: "B",
            C: "C",
          },
        },
        relatedPartInfo: {
          key: "掉落部位信息",
          tableFieldDescription: "掉落物品的掉落部位信息",
          formFieldDescription: "请输入掉落物品的掉落部位信息",
        },
        breakRewardType: {
          key: "部位破坏奖励",
          tableFieldDescription: "掉落物品的部位破坏奖励",
          formFieldDescription: "选择掉落物品的部位破坏奖励",
          enumMap: {
            None: "无",
            CanDrop: "可掉落",
            DropUp: "掉落提升",
          },
        },
        dropById: {
          key: "掉落于",
          tableFieldDescription: "掉落物品的怪物ID",
          formFieldDescription: "选择掉落物品的怪物",
        },
      },
      description: "",
    },
    image: {
      selfName: "",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "图片的唯一标识符",
          formFieldDescription: "图片的唯一标识符",
        },
        dataUrl: {
          key: "图片URL",
          tableFieldDescription: "图片的URL",
          formFieldDescription: "请输入图片的URL",
        },
        npcId: {
          key: "NPC ID",
          tableFieldDescription: "图片的NPC ID",
          formFieldDescription: "选择图片的NPC",
        },
        weaponId: {
          key: "武器ID",
          tableFieldDescription: "图片的武器ID",
          formFieldDescription: "选择图片的武器",
        },
        armorId: {
          key: "防具ID",
          tableFieldDescription: "图片的防具ID",
          formFieldDescription: "选择图片的防具",
        },
        optEquipId: {
          key: "追加装备ID",
          tableFieldDescription: "图片的追加装备ID",
          formFieldDescription: "选择图片的追加装备",
        },
        mobId: {
          key: "怪物ID",
          tableFieldDescription: "图片的怪物ID",
          formFieldDescription: "选择图片的怪物",
        },
      },
      description: "",
    },
    item: {
      selfName: "道具",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "",
          formFieldDescription: "",
        },
        itemType: {
          key: "道具类型",
          tableFieldDescription: "道具的表类型，这个类型主要用于系统判断",
          formFieldDescription: "一般不需要手动选择，如果看到这个，请给开发人员反馈",
          enumMap: {
            Weapon: "武器",
            Armor: "防具",
            Option: "追加装备",
            Special: "特殊装备",
            Crystal: "锻晶",
            Consumable: "消耗品",
            Material: "素材",
          },
        },
        name: {
          key: "名称",
          tableFieldDescription: "道具的名称",
          formFieldDescription: "道具的名称",
        },
        dataSources: {
          key: "数据来源",
          tableFieldDescription: "道具的数据来源",
          formFieldDescription: "道具的数据来源",
        },
        details: {
          key: "详细描述",
          tableFieldDescription: "道具的详细描述",
          formFieldDescription: "道具的详细描述",
        },
        statisticId: {
          key: "统计ID",
          tableFieldDescription: "道具的统计ID",
          formFieldDescription: "道具的统计ID",
        },
        updatedByAccountId: {
          key: "最后更新者",
          tableFieldDescription: "道具的最后更新者",
          formFieldDescription: "道具的最后更新者",
        },
        createdByAccountId: {
          key: "创建者",
          tableFieldDescription: "道具的创建者",
          formFieldDescription: "道具的创建者",
        },
        itemSourceType: {
          key: "道具来源",
          tableFieldDescription: "道具的来源",
          formFieldDescription: "道具的来源",
          enumMap: {
            Mob: "怪物",
            Task: "任务",
            BlacksmithShop: "铁匠铺",
            Player: "玩家",
          },
        }
      },
      description: "",
    },
    material: {
      selfName: "素材",
      fields: {
        type: {
          key: "类型",
          tableFieldDescription: "素材的类型",
          formFieldDescription: "选择素材的类型",
          enumMap: {
            Metal: "金属",
            Cloth: "布料",
            Beast: "兽品",
            Wood: "木材",
            Drug: "药草",
            Magic: "魔素",
          },
        },
        ptValue: {
          key: "PT值",
          tableFieldDescription: "素材的PT值",
          formFieldDescription: "请输入素材的PT值",
        },
        price: {
          key: "价格",
          tableFieldDescription: "素材的价格",
          formFieldDescription: "请输入素材的价格",
        },
        itemId: {
          key: "所属道具ID",
          tableFieldDescription: "素材所属的道具ID",
          formFieldDescription: "选择素材所属的道具",
        },
      },
      description: "",
    },
    member: {
      selfName: "成员",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "成员的唯一标识符",
          formFieldDescription: "成员的唯一标识符",
        },
        name: {
          key: "名称",
          tableFieldDescription: "成员的名称",
          formFieldDescription: "请输入成员的名称",
        },
        sequence: {
          key: "顺序",
          tableFieldDescription: "成员的顺序",
          formFieldDescription: "请输入成员的顺序",
        },
        playerId: {
          key: "玩家ID",
          tableFieldDescription: "成员的玩家ID",
          formFieldDescription: "选择成员的玩家",
        },
        partnerId: {
          key: "伙伴ID",
          tableFieldDescription: "成员的伙伴ID",
          formFieldDescription: "选择成员的伙伴",
        },
        mercenaryId: {
          key: "佣兵ID",
          tableFieldDescription: "成员的佣兵ID",
          formFieldDescription: "选择成员的佣兵",
        },
        mobId: {
          key: "怪物ID",
          tableFieldDescription: "成员的怪物ID",
          formFieldDescription: "选择成员的怪物",
        },
        mobDifficultyFlag: {
          key: "怪物难度",
          tableFieldDescription: "成员的怪物难度",
          formFieldDescription: "选择成员的怪物难度",
          enumMap: {
            Easy: "零星",
            Normal: "一星",
            Hard: "二星",
            Lunatic: "三星",
            Ultimate: "四星",
          },
        },
        teamId: {
          key: "队伍ID",
          tableFieldDescription: "成员的队伍ID",
          formFieldDescription: "选择成员的队伍",
        },
        actions: {
          key: "行为",
          tableFieldDescription: "成员的行为",
          formFieldDescription: "请输入成员的行为",
        },
        type: {
          key: "类型",
          tableFieldDescription: "成员的类型",
          formFieldDescription: "选择成员的类型",
          enumMap: {
            Player: "玩家",
            Partner: "伙伴",
            Mercenary: "佣兵",
            Mob: "怪物",
          },
        }
      },
      description: "",
    },
    mercenary: {
      selfName: "佣兵",
      fields: {
        type: {
          key: "类型",
          tableFieldDescription: "佣兵的类型",
          formFieldDescription: "选择佣兵的类型",
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
          key: "类型",
          tableFieldDescription:
            "目前支持的类型只有这些，虽然实际上解包可以看到有很多种，但是对于咱这个应用没啥用，因此忽略了很多种类。",
          formFieldDescription:
            "目前支持的类型只有这些，虽然实际上解包可以看到有很多种，但是对于咱这个应用没啥用，因此忽略了很多种类。",
          enumMap: mobType,
        },
        captureable: {
          key: "是否可捕获",
          tableFieldDescription: `这个属性只对${mobType.Boss}和${mobType.MiniBoss}以外的怪物有效，能抓的甘瑞夫和糖明凰目前被视为特殊怪物。`,
          formFieldDescription: `如果不是${mobType.Mob}类型的怪物，请选择不可捕获。`,
        },
        actions: {
          key: "行为",
          tableFieldDescription: "怪物的行为描述，模拟器运行的时候会根据其中的逻辑模拟怪物行动",
          formFieldDescription: "怪物的行为描述，模拟器运行的时候会根据其中的逻辑模拟怪物行动",
        },
        baseLv: {
          key: "基础等级",
          tableFieldDescription: `对于${mobType.Boss}来说，这个值是${mobDifficultyFlag.Easy}难度下的等级数值。其他类型的怪物由于没有难度标识，这个值就是实际等级`,
          formFieldDescription: `如果怪物类型是${mobType.Boss},请填写你在选择${mobDifficultyFlag.Easy}难度时它的等级。其他类型的怪物直接填写实际等级即可。`,
        },
        experience: {
          key: "经验",
          tableFieldDescription: `对于${mobType.Boss}来说，这个值是${mobDifficultyFlag.Easy}难度下的经验值。其他类型的怪物由于没有难度标识，这个值就是其际经验值`,
          formFieldDescription: `如果怪物类型是${mobType.Boss},请填写你在选择${mobDifficultyFlag.Easy}难度时它的经验值。其他类型的怪物直接填写实际经验值即可。`,
        },
        initialElement: {
          key: "元素属性",
          tableFieldDescription:
            "这是初始属性，怪物在战斗时可能会改变其属性，详细情况将取决于怪物行为中的描述，要查看怪物行为，请点击具体怪物",
          formFieldDescription: "这里填写怪物的初始属性即可，有关属性变化的描述请在怪物行为中编辑",
          enumMap: elementType,
        },
        radius: {
          key: "半径",
          tableFieldDescription: "怪物的模型尺寸，主要是用来计算技能是否命中",
          formFieldDescription:
            "怪物的模型尺寸，主要是用来计算技能是否命中,从远处按下圣拳之裁后，技能发动瞬间屏幕上显示的距离-1就可以测出这个值。",
        },
        maxhp: {
          key: "最大生命值",
          tableFieldDescription: "不会有人不知道这个属性是什么意思吧，不会吧",
          formFieldDescription: `对于${mobType.Boss}来说，这个值是${mobDifficultyFlag.Easy}难度下显示的数值。其他类型的怪物由于没有难度标识，这个值可能需要估测`,
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
        normalDefExp: {
          key: "一般伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，一般惯性的变化值",
          formFieldDescription: "每次受到伤害时，一般惯性的变化值",
        },
        physicDefExp: {
          key: "物理伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，物理惯性的变化值",
          formFieldDescription: "每次受到伤害时，物理惯性的变化值",
        },
        magicDefExp: {
          key: "魔法伤害惯性变动率",
          tableFieldDescription: "每次受到伤害时，魔法惯性的变化值",
          formFieldDescription: "每次受到伤害时，魔法惯性的变化值",
        },
        partsExperience: {
          key: "部位经验",
          tableFieldDescription: `只有${mobType.Boss}会有这个值，当某个部位被破坏时，讨伐后的总经验会额外增加此值`,
          formFieldDescription: `只有${mobType.Boss}会有这个值，当某个部位被破坏时，讨伐后的总经验会额外增加此值`,
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
          formFieldDescription:
            "这是怪物的统计信息字段数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "这是怪物的更新者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription:
            "这是怪物的更新者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
        createdByAccountId: {
          key: "创建者ID",
          tableFieldDescription: "这是怪物的创建者数据库id，一般来说，你应该不可能看到这个",
          formFieldDescription:
            "这是怪物的创建者数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
        },
      },
      description: "不是所有怪物一开始就是怪物，也不是所有怪物看起来都像怪物。",
    },
    npc: {
      selfName: "NPC",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "NPC的ID",
          formFieldDescription: "NPC的ID",
        },
        name: {
          key: "名称",
          tableFieldDescription: "npc的名称，通常和游戏内一致，通常...",
          formFieldDescription: "npc的名称，请填写和游戏内一致的翻译。你也不想大伙看到你写的东西之后一脸懵逼是吧。",
        },
        zoneId: {
          key: "出现的区域",
          tableFieldDescription: "npc站着的地方啦，比如某某街道第三区域啥的",
          formFieldDescription: "npc站着的地方啦，比如某某街道第三区域啥的",
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
      selfName: "追加装备",
      fields: {
        baseAbi: {
          key: "基础防御",
          tableFieldDescription: "基础防御",
          formFieldDescription: "基础防御",
        },
        modifiers: {
          key: "自带的附魔属性",
          tableFieldDescription: "掉落时或者锻造时自带的附魔属性",
          formFieldDescription: "掉落时或者锻造时自带的附魔属性",
        },
        colorA: {
          key: "颜色A",
          tableFieldDescription: "颜色A",
          formFieldDescription: "颜色A",
        },
        colorB: {
          key: "颜色B",
          tableFieldDescription: "颜色B",
          formFieldDescription: "颜色B",
        },
        colorC: {
          key: "颜色C",
          tableFieldDescription: "颜色C",
          formFieldDescription: "颜色C",
        },
        itemId: {
          key: "所属道具ID",
          tableFieldDescription: "所属道具ID",
          formFieldDescription: "所属道具ID",
        },
      },
      description: "",
    },
    player: {
      selfName: "玩家",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "ID",
          formFieldDescription: "ID",
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
        baseAbi: {
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
      selfName: "玩家追加装备",
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
        baseAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      },
      description: "",
    },
    player_pet: {
      selfName: "玩家宠物",
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
            MagicDefense: "",
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
      selfName: "玩家特殊装备",
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
        baseAbi: {
          key: "",
          tableFieldDescription: "",
          formFieldDescription: ""
        }
      },
      description: "",
    },
    player_weapon: {
      selfName: "玩家武器",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "武器的唯一标识符",
          formFieldDescription: "武器的唯一标识符",
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
        
        type: {
          key: "类型",
          tableFieldDescription: "武器的类型",
          formFieldDescription: "武器的类型",
          enumMap: {
            OneHandSword: "单手剑",
            TwoHandSword: "双手剑",
            Bow: "弓",
            Bowgun: "弩",
            Rod: "法杖",
            Magictool: "魔导具",
            Knuckle: "拳套",
            Halberd: "旋风枪",
            Katana: "拔刀剑",
            Arrow: "箭矢",
            ShortSword: "小刀",
            NinjutsuScroll: "忍术卷轴",
            Shield: "盾",
          },
        },
        elementType: {
          key: "元素类型",
          tableFieldDescription: "武器的固有元素属性，即附魔时属性觉醒时耗费魔素较少的那个属性",
          formFieldDescription: "武器的固有元素属性，即附魔时属性觉醒时耗费魔素较少的那个属性",
          enumMap: {
            Normal: "无属性",
            Light: "光属性",
            Dark: "暗属性",
            Water: "水属性",
            Fire: "火属性",
            Earth: "地属性",
            Wind: "风属性",
          },
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
          key: "ID",
          tableFieldDescription: "配方的唯一标识符",
          formFieldDescription: "配方的唯一标识符",
        },
        itemId: {
          key: "所属道具",
          tableFieldDescription: "所属道具",
          formFieldDescription: "所属道具",
        },
        activityId: {
          key: "所属活动",
          tableFieldDescription: "所属活动",
          formFieldDescription: "所属活动",
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
          key: "ID",
          tableFieldDescription: "配方的材料的唯一标识符",
          formFieldDescription: "配方的材料的唯一标识符",
        },
        count: {
          key: "数量",
          tableFieldDescription: "数量",
          formFieldDescription: "数量",
        },
        type: {
          key: "类型",
          tableFieldDescription: "类型",
          formFieldDescription: "类型",
          enumMap: {
            Metal: "金属",
            Cloth: "布料",
            Beast: "兽品",
            Wood: "木材",
            Drug: "药品",
            Magic: "魔素",
            Gold: "金币",
            Item: "道具",
          },
        },
        itemId: {
          key: "对应道具",
          tableFieldDescription: "对应道具",
          formFieldDescription: "对应道具",
        },
        recipeId: {
          key: "所属配方",
          tableFieldDescription: "所属配方",
          formFieldDescription: "所属配方",
        },
      },
      description: "",
    },
    session: {
      selfName: "会话",
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
      selfName: "模拟器",
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
          enumMap: skillTreeType,
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
          tableFieldDescription: `不需要选择目标即可释放的为${skillTargetType.Self}，能以${skillTargetType.Player}为目标的技能即为${skillTargetType.Player}。`,
          formFieldDescription: `不需要选择目标即可释放的为${skillTargetType.Self}，能以${skillTargetType.Player}为目标的技能即为${skillTargetType.Player}。`,
          enumMap: skillTargetType,
        },
        chargingType: {
          key: "施法动作类型",
          tableFieldDescription: `不受咏唱影响的都为${skillChargingType.Reservoir}。`,
          formFieldDescription: `不受咏唱影响的都为${skillChargingType.Reservoir}。`,
          enumMap: skillChargingType,
        },
        distanceType: {
          key: "距离威力类型",
          tableFieldDescription: "表示此技能受这些类型的距离威力影响",
          formFieldDescription: "表示此技能受这些类型的距离威力影响",
          enumMap: skillDistanceType,
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
          formFieldDescription:
            "这是统计信息字段数据库id，如果有哪里需要你输入这个，请给开发人员反馈。这是不正常的情况。",
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
      description: "",
    },
    skill_effect: {
      selfName: "技能效果",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "技能效果的唯一标识符",
          formFieldDescription: "技能效果的唯一标识符",
        },
        condition: {
          key: "激活此效果的条件",
          tableFieldDescription: "激活此效果的条件",
          formFieldDescription: "激活此效果的条件",
        },
        elementLogic: {
          key: "伤害属性的判断逻辑",
          tableFieldDescription: "伤害属性的判断逻辑",
          formFieldDescription: "伤害属性的判断逻辑",
        },
        castingRange: {
          key: "施法范围",
          tableFieldDescription: "施法范围",
          formFieldDescription: "施法范围",
        },
        effectiveRange: {
          key: "技能作用范围",
          tableFieldDescription: "技能作用范围",
          formFieldDescription: "技能作用范围",
        },
        motionFixed: {
          key: "固定动画帧",
          tableFieldDescription: "固定动画帧",
          formFieldDescription: "固定动画帧",
        },
        motionModified: {
          key: "可加速动画帧",
          tableFieldDescription: "可加速动画帧",
          formFieldDescription: "可加速动画帧",
        },
        chantingFixed: {
          key: "固定咏唱时间",
          tableFieldDescription: "固定咏唱时间",
          formFieldDescription: "固定咏唱时间",
        },
        chantingModified: {
          key: "可加速咏唱时间",
          tableFieldDescription: "可加速咏唱时间",
          formFieldDescription: "可加速咏唱时间",
        },
        reservoirFixed: {
          key: "固定蓄力时间",
          tableFieldDescription: "固定蓄力时间",
          formFieldDescription: "固定蓄力时间",
        },
        reservoirModified: {
          key: "可加速蓄力时间",
          tableFieldDescription: "可加速蓄力时间",
          formFieldDescription: "可加速蓄力时间",
        },
        startupFrames: {
          key: "技能前摇",
          tableFieldDescription: "技能前摇",
          formFieldDescription: "技能前摇",
        },
        cost: {
          key: "技能消耗",
          tableFieldDescription: "技能消耗",
          formFieldDescription: "技能消耗",
        },
        description: {
          key: "效果描述",
          tableFieldDescription: "效果描述",
          formFieldDescription: "效果描述",
        },
        logic: {
          key: "效果逻辑",
          tableFieldDescription: "效果逻辑",
          formFieldDescription: "效果逻辑",
        },
        details: {
          key: "额外说明",
          tableFieldDescription: "额外说明",
          formFieldDescription: "额外说明",
        },
        belongToskillId: {
          key: "所属技能",
          tableFieldDescription: "所属技能",
          formFieldDescription: "所属技能",
        },
      },
      description: "",
    },
    special: {
      selfName: "特殊装备",
      fields: {
        baseAbi: {
          key: "基础防御",
          tableFieldDescription: "基础防御",
          formFieldDescription: "基础防御",
        },
        modifiers: {
          key: "自带的附魔属性",
          tableFieldDescription: "锻造时或者掉落时自带的附魔属性",
          formFieldDescription: "锻造时或者掉落时自带的附魔属性",
        },
        itemId: {
          key: "所属道具ID",
          tableFieldDescription: "所属道具ID",
          formFieldDescription: "所属道具ID",
        },
      },
      description: "",
    },
    statistic: {
      selfName: "统计信息",
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
      selfName: "任务",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "ID",
          formFieldDescription: "ID",
        },
        lv: {
          key: "等级",
          tableFieldDescription: "承接任务时，如果角色低于此等级，则无法承接任务",
          formFieldDescription: "承接任务时，如果角色低于此等级，则无法承接任务",
        },
        name: {
          key: "名称",
          tableFieldDescription: "任务名称",
          formFieldDescription: "任务名称",
        },
        type: {
          key: "类型",
          tableFieldDescription: "任务类型",
          formFieldDescription: "任务类型",
          enumMap: {
            Collect: "收集",
            Defeat: "击杀",
            Both: "收集和击杀",
            Other: "其他",
          },
        },
        description: {
          key: "描述",
          tableFieldDescription: "任务描述",
          formFieldDescription: "任务描述",
        },
        npcId: {
          key: "所属NPC",
          tableFieldDescription: "任务所属的NPC",
          formFieldDescription: "任务所属的NPC",
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
      selfName: "任务收集要求",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "ID",
          formFieldDescription: "ID",
        },
        count: {
          key: "数量",
          tableFieldDescription: "需要收集的数量",
          formFieldDescription: "需要收集的数量",
        },
        itemId: {
          key: "所属道具",
          tableFieldDescription: "所属道具",
          formFieldDescription: "所属道具",
        },
        taskId: {
          key: "所属任务",
          tableFieldDescription: "所属任务",
          formFieldDescription: "所属任务",
        },
      },
      description: "",
    },
    task_kill_requirement: {
      selfName: "任务击杀要求",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "ID",
          formFieldDescription: "ID",
        },
        mobId: {
          key: "需要击杀的怪物",
          tableFieldDescription: "需要击杀的怪物",
          formFieldDescription: "需要击杀的怪物",
        },
        count: {
          key: "数量",
          tableFieldDescription: "需要击杀的数量",
          formFieldDescription: "需要击杀的数量",
        },
        taskId: {
          key: "所属任务",
          tableFieldDescription: "所属任务",
          formFieldDescription: "所属任务",
        },
      },
      description: "",
    },
    task_reward: {
      selfName: "任务奖励",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "ID",
          formFieldDescription: "ID",
        },
        type: {
          key: "类型",
          tableFieldDescription: "奖励类型",
          formFieldDescription: "奖励类型",
          enumMap: {
            Item: "道具",
            Exp: "经验",
            Money: "金币",
          },
        },
        value: {
          key: "数量",
          tableFieldDescription: "奖励数量",
          formFieldDescription: "奖励数量",
        },
        probability: {
          key: "概率",
          tableFieldDescription: "奖励概率",
          formFieldDescription: "奖励概率",
        },
        itemId: {
          key: "奖励道具",
          tableFieldDescription: "奖励道具",
          formFieldDescription: "奖励道具",
        },
        taskId: {
          key: "所属任务",
          tableFieldDescription: "所属任务",
          formFieldDescription: "所属任务",
        },
      },
      description: "",
    },
    team: {
      selfName: "队伍",
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
      selfName: "用户",
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
      selfName: "验证令牌",
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
          key: "类型",
          tableFieldDescription: "武器的类型",
          formFieldDescription: "武器的类型",
          enumMap: {
            OneHandSword: "单手剑",
            TwoHandSword: "双手剑",
            Bow: "弓",
            Bowgun: "弩",
            Rod: "法杖",
            Magictool: "魔导具",
            Knuckle: "拳套",
            Halberd: "旋风枪",
            Katana: "拔刀剑",
            Arrow: "箭矢",
            ShortSword: "小刀",
            NinjutsuScroll: "忍术卷轴",
            Shield: "盾",
          },
        },
        baseAbi: {
          key: "基础攻击力",
          tableFieldDescription: "武器的基础攻击力",
          formFieldDescription: "武器的基础攻击力",
        },
        stability: {
          key: "稳定率",
          tableFieldDescription: "武器的稳定率",
          formFieldDescription: "武器的稳定率",
        },
        modifiers: {
          key: "自带的附魔属性",
          tableFieldDescription: "武器自带的附魔属性",
          formFieldDescription: "武器自带的附魔属性",
        },
        colorA: {
          key: "颜色A",
          tableFieldDescription: "武器的颜色A",
          formFieldDescription: "武器的颜色A",
        },
        colorB: {
          key: "颜色B",
          tableFieldDescription: "武器的颜色B",
          formFieldDescription: "武器的颜色B",
        },
        colorC: {
          key: "颜色C",
          tableFieldDescription: "武器的颜色C",
          formFieldDescription: "武器的颜色C",
        },
        elementType: {
          key: "元素类型",
          tableFieldDescription: "武器的固有元素属性，即附魔时属性觉醒时耗费魔素较少的那个属性",
          formFieldDescription: "武器的固有元素属性，即附魔时属性觉醒时耗费魔素较少的那个属性",
          enumMap: {
            Normal: "无属性",
            Light: "光属性",
            Dark: "暗属性",
            Water: "水属性",
            Fire: "火属性",
            Earth: "地属性",
            Wind: "风属性",
          },
        },
        itemId: {
          key: "所属物品",
          tableFieldDescription: "武器所属的物品",
          formFieldDescription: "武器所属的物品",
        },
      },
      description: "",
    },
    world: {
      selfName: "世界",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "世界的唯一标识符",
          formFieldDescription: "世界的唯一标识符，由系统自动生成",
        },
        name: {
          key: "名称",
          tableFieldDescription: "世界的名称",
          formFieldDescription: "世界的名称",
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
      selfName: "区域",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "区域的唯一标识符",
          formFieldDescription: "区域的唯一标识符，由系统自动生成",
        },
        name: {
          key: "名称",
          tableFieldDescription: "区域的名称",
          formFieldDescription: "请输入区域的名称",
        },
        rewardNodes: {
          key: "道具点数量",
          tableFieldDescription: "区域内的道具点数量",
          formFieldDescription: "请输入区域内的道具点数量",
        },
        activityId: {
          key: "所属活动ID",
          tableFieldDescription: "该区域所属的活动ID",
          formFieldDescription: "选择该区域所属的活动，常驻区域不属于任何活动，不填此项",
        },
        addressId: {
          key: "所属地图ID",
          tableFieldDescription: "该区域所属的地图ID",
          formFieldDescription: "选择该区域所属的地图",
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
        mobs: "出现的怪物",
        npcs: "出现的NPC",
      },
      description: "游戏中的区域信息，包括名称、链接区域、道具点等信息",
    },
  },
};

export default dictionary;
