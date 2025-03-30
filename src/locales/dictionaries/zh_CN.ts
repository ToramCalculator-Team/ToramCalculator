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
    searchPlaceholder: "这里是搜索框~",
    columnsHidden: "隐藏列",
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
      switchUser: "切换用户"
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
        Ultimate: "4星"
      }
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
        item: "",
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
