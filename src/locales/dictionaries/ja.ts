import { DataEnums } from "../../../db/dataEnums";
import { MobType } from "../../../db/kysely/enums";
import {type dictionary } from "../type";

const elementType={
  Normal: "无属性",
  Dark: "暗属性",
  Earth: "地属性",
  Fire: "火属性",
  Light: "光属性",
  Water: "水属性",
  Wind: "风属性",
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
}

const dictionary: dictionary = {
  ui: {
    searchPlaceholder: "ここで検索~",
    columnsHidden: "列を隠す",
    boolean: {
      true: "はい",
      false: "いいえ",
    },
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
      register: "登録",
      switchUser: "ユーザー切り替え",
      install: "インストール", 
      unInstall: "アンインストール"
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
      tool: {
        title: "アプリ操作",
        pwa: {
          title: "PWA",
          description: "このアプリはプログレッシブウェブアプリ（PWA）として設計されており、条件が整えばデバイスにインストールしてより快適に利用できます（デフォルトではインストールされません）。",
          notSupported: "このデバイスはPWAをサポートしていないか、すでにインストール済みです"
        },
        storageInfo: {
          title: "ストレージ使用状況",
          description: "localStorage、IndexedDB などのキャッシュを含みます",
          usage: "使用済み",
          clearStorage: "このアプリのすべてのキャッシュを削除する"
        }
      }
      
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
          key: "名前",
          tableFieldDescription: "モンスターの名前は、通常ゲーム内と一致します。",
          formFieldDescription: "モンスターの名前をゲーム内と同じように記載してください。みんなが混乱しないようにね。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "これはモンスターのデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターのデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        type: {
          key: "モンスタータイプ",
          tableFieldDescription:
            "現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
          formFieldDescription:
            "現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
          enumMap: mobType
        },
        captureable: {
          key: "捕獲可能",
          tableFieldDescription: `${enums.mob.type.Boss}および${enums.mob.type.MiniBoss}以外のモンスターにのみ有効です。捕獲可能なガンリフや糖明凰は特別扱いされています。`,
          formFieldDescription: `${enums.mob.type.Mob}タイプでない場合は「不可」を選択してください。`,
        },
        actions: {
          key: "行動",
          tableFieldDescription:
            "モンスターの行動説明。シミュレーターはこのロジックに基づいて行動を模倣します",
          formFieldDescription:
            "モンスターの行動説明。シミュレーターはこのロジックに基づいて行動を模倣します",
        },
        baseLv: {
          key: "基本レベル",
          tableFieldDescription: `${enums.mob.type.Boss}の場合、この値は${enums.member.mobDifficultyFlag.Easy}難易度でのレベルです。他のタイプのモンスターには難易度がないため、これが実際のレベルです。`,
          formFieldDescription: `モンスタータイプが${enums.mob.type.Boss}の場合、${enums.member.mobDifficultyFlag.Easy}難易度でのレベルを入力してください。他のタイプのモンスターは実際のレベルを入力してください。`,
        },
        experience: {
          key: "経験値",
          tableFieldDescription: `${enums.mob.type.Boss}の場合、この値は${enums.member.mobDifficultyFlag.Easy}難易度での経験値です。他のタイプのモンスターには難易度がないため、これが実際の経験値です。`,
          formFieldDescription: `モンスタータイプが${enums.mob.type.Boss}の場合、${enums.member.mobDifficultyFlag.Easy}難易度での経験値を入力してください。他のタイプのモンスターは実際の経験値を入力してください。`,
        },
        initialElement: {
          key: "属性",
          tableFieldDescription:
            "これは初期属性です。戦闘中に属性が変わる場合があります。詳細は行動説明を参照してください。",
          formFieldDescription:
            "ここにモンスターの初期属性を記載してください。属性変更に関する説明は行動セクションで編集してください。",
          enumMap: elementType
        },
        radius: {
          key: "半径",
          tableFieldDescription: "モンスターのモデルサイズで、スキルが命中するかどうかを計算するために使用されます。",
          formFieldDescription:
            "モンスターのモデルサイズで、スキルが命中するかどうかを計算するために使用されます。遠距離から聖拳を発動した際に画面上に表示される距離-1で測定できます。",
        },
        maxhp: {
          key: "最大HP",
          tableFieldDescription: "この属性の意味がわからない人はいないよね？いないよね？",
          formFieldDescription: `${enums.mob.type.Boss}の場合、この値は${enums.member.mobDifficultyFlag.Easy}難易度でのHPです。他のタイプのモンスターには難易度がないため、この値は推測が必要かもしれません。`,
        },
        physicalDefense: {
          key: "物理防御",
          tableFieldDescription: "物理貫通と相互作用する属性です。",
          formFieldDescription: "物理貫通と相互作用する属性です。",
        },
        physicalResistance: {
          key: "物理耐性",
          tableFieldDescription:
            "モンスターにとって最も実用的な物理ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
          formFieldDescription:
            "モンスターにとって最も実用的な物理ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
        },
        magicalDefense: {
          key: "魔法防御",
          tableFieldDescription: "魔法貫通と相互作用する属性です。",
          formFieldDescription: "魔法貫通と相互作用する属性です。",
        },
        magicalResistance: {
          key: "魔法耐性",
          tableFieldDescription:
            "モンスターにとって最も実用的な魔法ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
          formFieldDescription:
            "モンスターにとって最も実用的な魔法ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
        },
        criticalResistance: {
          key: "クリティカル耐性",
          tableFieldDescription:
            "魔法ダメージの場合、クリティカル率は（物理クリティカル率×魔法クリティカル変換率）- この値です。",
          formFieldDescription:
            "魔法ダメージの場合、クリティカル率は（物理クリティカル率×魔法クリティカル変換率）- この値です。",
        },
        avoidance: {
          key: "回避",
          tableFieldDescription: "命中値と相互作用して、物理攻撃が命中するかどうかを判断します。",
          formFieldDescription: "命中値と相互作用して、物理攻撃が命中するかどうかを判断します。",
        },
        dodge: {
          key: "回避率",
          tableFieldDescription: "攻撃を受けた際に、この値に基づいて命中するかどうかを判断します。",
          formFieldDescription: "攻撃を受けた際に、この値に基づいて命中するかどうかを判断します。",
        },
        block: {
          key: "ブロック率",
          tableFieldDescription: "攻撃を受けた際に、この値に基づいてブロックするかどうかを判断します。",
          formFieldDescription: "攻撃を受けた際に、この値に基づいてブロックするかどうかを判断します。",
        },
        normalAttackResistanceModifier: {
          key: "通常ダメージ慣性変動率",
          tableFieldDescription: "ダメージを受けるたびに、通常慣性の変動値です。",
          formFieldDescription: "ダメージを受けるたびに、通常慣性の変動値です。",
        },
        physicalAttackResistanceModifier: {
          key: "物理ダメージ慣性変動率",
          tableFieldDescription: "ダメージを受けるたびに、物理慣性の変動値です。",
          formFieldDescription: "ダメージを受けるたびに、物理慣性の変動値です。",
        },
        magicalAttackResistanceModifier: {
          key: "魔法ダメージ慣性変動率",
          tableFieldDescription: "ダメージを受けるたびに、魔法慣性の変動値です。",
          formFieldDescription: "ダメージを受けるたびに、魔法慣性の変動値です。",
        },
        partsExperience: {
          key: "部位経験値",
          tableFieldDescription: `${enums.mob.type.Boss}のみこの値を持ちます。部位を破壊すると、討伐後の総経験値がこの値分追加されます。`,
          formFieldDescription: `${enums.mob.type.Boss}のみこの値を持ちます。部位を破壊すると、討伐後の総経験値がこの値分追加されます。`,
        },
        details: {
          key: "備考",
          tableFieldDescription: "編集者が追加で説明したい事項です。",
          formFieldDescription: "読者に伝えたいその他の情報です。",
        },
        dataSources: {
          key: "データソース",
          tableFieldDescription: "このデータを測定した人または組織です。",
          formFieldDescription: "このデータを測定した人または組織です。",
        },
        statisticId: {
          key: "統計情報ID",
          tableFieldDescription: "これはモンスターの統計情報のデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターの統計情報のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "これはモンスターの更新者のデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターの更新者のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        createdByAccountId: {
          key: "作成者ID",
          tableFieldDescription: "これはモンスターの作成者のデータベースIDです。普通は見ることはありません。",
          formFieldDescription:
            "これはモンスターの作成者のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
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
