import {type dictionary } from "./type";

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
    searchPlaceholder: "ここで検索~",
    columnsHidden: "列を隠す",
    actions: {
      add: "追加",
      create: "作成",
      remove: "削除",
      update: "更新",
      open: "開く",
      upload: "アップロード",
      save: "保存",
      reset: "クリア",
      modify: "修正",
      cancel: "キャンセル",
      close: "閉じる",
      back: "戻る",
      filter: "フィルター",
      generateImage: "画像生成",
      swap: "入れ替え",
      checkInfo: "情報を確認",
      zoomIn: "拡大",
      zoomOut: "縮小",
      logIn: "ログイン",
      logOut: "ログアウト",
      switchUser: "ユーザー切り替え",
    },
    nav: {
      home: "ホーム",
      mobs: "モンスター",
      skills: "スキル",
      equipments: "装備",
      crystals: "クリスタル",
      pets: "ペット",
      items: "消耗品",
      character: "キャラクター",
      simulator: "コンボ分析",
      profile: "",
    },
    errorPage: {
      tips: "あなたは知識の荒野にいるが、クリックして戻ります",
    },
    settings: {
      title: "設定",
      userInterface: {
        title: "外観",
        isAnimationEnabled: {
          title: "アニメーションを有効にする",
          description:
            "すべてのページの遷移とアニメーション効果の持続時間に影響します。このコンフィグで制御されていないアニメーションがある場合は、ご報告ください。",
        },
        is3DbackgroundDisabled: {
          title: "3D背景を無効にする",
          description: "3D背景を無効にすると、大量の性能損失が発生しますが、推奨されません。",
        },
      },
      language: {
        title: "言語",
        selectedLanguage: {
          title: "言語を選択",
          description: "すべてのインターフェーステキストに影響しますが、データテキストは変更できません。",
          zhCN: "简体中文",
          zhTW: "繁体中文",
          enUS: "English",
          jaJP: "日本語",
        },
      },
      statusAndSync: {
        title: "状態と同期",
        restorePreviousStateOnStartup: {
          title: "起動時に前回の状態を復元",
          description: "まだ実装されていません。",
        },
        syncStateAcrossClients: {
          title: "すべてのクライアントの状態を同期",
          description:
            "この設定はユーザーがログインしている場合にのみ有効です。ログインしていない場合、クライアントには識別子がないため同期できません。",
        },
      },
      privacy: {
        title: "プライバシー",
        postVisibility: {
          title: "作品の可視性",
          description:
            "作品の可視性には以下が含まれます：キャラクター、モンスター、クリスタル、メイン武器、サブ武器、ボディアーマー、追加装備、特殊装備、ペット、スキル、消耗品、コンボ、アナライザー。",
          everyone: "全員に公開",
          friends: "フレンドのみに公開",
          onlyMe: "自分のみに公開",
        },
      },
      messages: {
        title: "メッセージ通知",
        notifyOnContentChange: {
          title: "以下の内容に変更があった場合に通知する",
          description: "まだ実装されていません。",
          notifyOnReferencedContentChange: "参照コンテンツに変更があった場合",
          notifyOnLike: "いいねを受け取った場合",
          notifyOnBookmark: "作品がブックマークされた場合",
        },
      },
      about: {
        title: "このアプリについて",
        description: {
          title: "説明",
          description: "まだ記述内容を決めていません。",
        },
        version: {
          title: "バージョン",
          description: "0.0.1-alpha",
        },
      },
    },
    index: {
      adventurer: "冒険者",
      goodMorning: "おはにゃ～ (=´ω｀=)",
      goodAfternoon: "こんにちは ヾ(=･ω･=)o",
      goodEvening: "こんばんは (。-ω-)zzz",
      nullSearchResultWarring: "関連コンテンツが見つかりません!!!∑(ﾟДﾟノ)ノ",
      nullSearchResultTips:
        "強くなる旅には困難が待ち受け、知識を求める道には障害物が散らばっています\nしかし、ここにはありません\n検索結果にないということは、存在しないということです",
    },
    mob: {
      pageTitle: "モンスター",
      table: {
        title: "モンスター",
        description: "ログイン後、自身でデータをアップロードできます。",
      },
      news: {
        title: "最新のアップデート",
      },
      augmented: "すべての星級データを表示",
      canNotModify: "システムによって生成され、修正不可",
      form: {
        description: "固定ボスデータをアップロードする際は一星データを使用してください。システムが規則に従って他の星級データを自動的に計算します。",
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
      pageTitle: "クリスタルテーブル",
      description: "開発中です。使用しないでください。",
      canNotModify: "システムによって生成され、修正不可",
      crystalForm: {
        description: "アララ",
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
        description: "開発中です。使用しないでください。",
      }
    },
    simulator: {
      pageTitle: "プロセス計算機",
      description: "開発中です。使用しないでください。",
      modifiers: "補正項目",
      // dialogData: {
      //   selfName: "属性",
      //   lv: "レベル",
      //   mainWeapon: {
      //     selfName: "メイン武器",
      //     type: "メイン武器タイプ",
      //     baseAtk: "メイン武器基礎攻撃力",
      //     refinement: "メイン武器精錬値",
      //     stability: "メイン武器安定率",
      //   },
      //   subWeapon: {
      //     selfName: "サブ武器",
      //     type: "サブ武器タイプ",
      //     baseAtk: "サブ武器基礎攻撃力",
      //     refinement: "サブ武器精錬値",
      //     stability: "サブ武器安定率",
      //   },
      //   bodyArmor: {
      //     selfName: "ボディアーマー",
      //     type: "ボディアーマータイプ",
      //     baseDef: "ボディアーマー基礎防御力",
      //     refinement: "ボディアーマー精錬値",
      //   },
      //   str: "力",
      //   int: "知力",
      //   vit: "体力",
      //   agi: "敏捷",
      //   dex: "器用",
      //   luk: "運",
      //   cri: "クリティカル",
      //   tec: "テクニック",
      //   men: "異常耐性",
      //   pPie: "物理貫通",
      //   mPie: "魔法貫通",
      //   pStab: "物理安定",
      //   sDis: "近距離威力",
      //   lDis: "遠距離威力",
      //   crC: "魔法クリティカル変換率",
      //   cdC: "魔法クリティカルダメージ変換率",
      //   weaponPatkT: "武器攻撃変換率（物理）",
      //   weaponMatkT: "武器攻撃変換率（魔法）",
      //   uAtk: "抜刀攻撃",
      //   stro: {
      //     Light: "",
      //     Normal: "",
      //     Dark: "",
      //     Water: "",
      //     Fire: "",
      //     Earth: "",
      //     Wind: "",
      //     selfName: "攻撃タイプ",
      //   },
      //   total: "総ダメージ上昇",
      //   final: "最終ダメージ上昇",
      //   am: "行動速度",
      //   cm: "詠唱短縮",
      //   aggro: "ヘイト倍率",
      //   maxHp: "最大HP",
      //   maxMp: "最大MP",
      //   pCr: "物理クリティカル",
      //   pCd: "物理クリティカルダメージ",
      //   mainWeaponAtk: "メイン武器攻撃力",
      //   subWeaponAtk: "サブ武器攻撃力",
      //   weaponAtk: "武器攻撃力",
      //   pAtk: "物理攻撃",
      //   mAtk: "魔法攻撃",
      //   aspd: "攻撃速度",
      //   cspd: "詠唱速度",
      //   ampr: "攻撃MP回復",
      //   hp: "現在HP",
      //   mp: "現在MP",
      //   name: "名前",
      //   pDef: "物理防御",
      //   pRes: "物理耐性",
      //   mDef: "魔法防御",
      //   mRes: "魔法耐性",
      //   cRes: "クリティカル耐性",
      //   anticipate: "先読み",
      //   index: "インデックス",
      //   skillEffectType: "スキル効果タイプ",
      //   actionFixedDuration: "固定アクションフレーム",
      //   actionModifiableDuration: "加速可能アクションフレーム",
      //   skillActionFrames: "アクション総フレーム",
      //   chantingFixedDuration: "固定詠唱時間",
      //   chantingModifiableDuration: "加速可能詠唱時間",
      //   skillChantingFrames: "詠唱総時間",
      //   chargingFixedDuration: "固定チャージ時間",
      //   chargingModifiableDuration: "加速可能チャージ時間",
      //   skillChargingFrames: "チャージ総時間",
      //   skillDuration: "スキル総所要時間",
      //   skillStartupFrames: "スキル発動前隙",
      //   vMatk: "有効魔法攻撃力",
      //   vPatk: "有効物理攻撃力",
      // },
      actualValue: "実際値",
      baseValue: "基本値",
      staticModifiers: "常時補正",
      dynamicModifiers: "一時補正",
      simulatorPage: {
        mobsConfig: {
          title: "モンスター設定",
        },
        teamConfig: {
          title: "チーム設定"
        }
      }
    },
    character: {
      pageTitle: "キャラクターテーブル",
      description: "このページは開発中です。使用しないでください。",
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
    VerificationToken: {},
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
