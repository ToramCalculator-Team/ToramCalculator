import { type dictionary } from "../type";
import * as Enums from "@db/schema/enums";
// 工具类型
// ----------------------------------------------------------------

const mainWeaponType: Record<Enums.MainWeaponType, string> = {
  OneHandSword: "片手剣",
  TwoHandSword: "両手剣",
  Bow: "弓",
  Rod: "杖",
  Magictool: "魔導具",
  Knuckle: "ナックル",
  Halberd: "ハルバード",
  Katana: "刀",
  Bowgun: "ボウガン",
};

const subWeaponType: Record<Enums.SubWeaponType, string> = {
  Arrow: "矢",
  ShortSword: "短剣",
  NinjutsuScroll: "忍術巻物",
  Shield: "盾",
};

// 実際のタイプ
// ----------------------------------------------------------------

const accountType: Record<Enums.AccountType, string> = {
  Admin: "管理者",
  User: "ユーザー",
};

const addressType: Record<Enums.AddressType, string> = {
  Normal: "通常地点",
  Limited: "期間限定地点",
};

const elementType: Record<Enums.ElementType, string> = {
  Normal: "無属性",
  Dark: "闇属性",
  Earth: "地属性",
  Fire: "火属性",
  Light: "光属性",
  Water: "水属性",
  Wind: "風属性",
};

const weaponType: Record<Enums.WeaponType, string> = {
  ...mainWeaponType,
  ...subWeaponType,
};

const mobType: Record<Enums.MobType, string> = {
  Boss: "ボス",
  MiniBoss: "ミニボス",
  Mob: "モブ",
};

const itemType: Record<Enums.ItemType, string> = {
  Weapon: "武器",
  Armor: "防具",
  Option: "追加装備",
  Special: "特殊装備",
  Crystal: "クリスタル",
  Consumable: "消耗品",
  Material: "素材",
};

const materialType: Record<Enums.MaterialType, string> = {
  Metal: "金属",
  Cloth: "布",
  Beast: "獣",
  Wood: "木",
  Drug: "薬",
  Magic: "魔法",
};

const consumableType: Record<Enums.ConsumableType, string> = {
  MaxHp: "最大HP",
  MaxMp: "最大MP",
  pAtk: "物理攻撃",
  mAtk: "魔法攻撃",
  Aspd: "攻撃速度",
  Cspd: "詠唱速度",
  Hit: "命中",
  Flee: "回避",
  EleStro: "属性強化",
  EleRes: "属性耐性",
  pRes: "物理耐性",
  mRes: "魔法耐性",
};

const crystalType: Record<Enums.CrystalType, string> = {
  NormalCrystal: "通常クリスタル",
  WeaponCrystal: "武器クリスタル",
  ArmorCrystal: "防具クリスタル",
  OptionCrystal: "追加クリスタル",
  SpecialCrystal: "特殊クリスタル",
};

const recipeIngredientType: Record<Enums.MaterialType | "Gold" | "Item", string> = {
  ...materialType,
  Gold: "ゴールド",
  Item: "アイテム"
};

const dropItemRelatedPartType: Record<Enums.BossPartType, string> = {
  A: "部位A",
  B: "部位B",
  C: "部位C",
};

const dropItemBreakRewardType: Record<Enums.BossPartBreakRewardType, string> = {
  None: "なし",
  CanDrop: "ドロップ可能",
  DropUp: "ドロップ率上昇",
};

const taskType: Record<Enums.TaskType, string> = {
  Collect: "収集",
  Defeat: "討伐",
  Both: "両方",
  Other: "その他",
};

const taskRewardType: Record<Enums.TaskRewardType, string> = {
  Exp: "経験値",
  Money: "お金",
  Item: "アイテム",
};

const skillTreeType: Record<Enums.SkillTreeType, string> = {
  BladeSkill: "剣術スキル",
  ShootSkill: "射撃スキル",
  MagicSkill: "魔法スキル",
  MarshallSkill: "格闘スキル",
  DualSwordSkill: "双剣スキル",
  HalberdSkill: "斧槍スキル",
  MononofuSkill: "武士スキル",
  CrusherSkill: "クラッシャースキル",
  FeatheringSkill: "フェザリングスキル",
  GuardSkill: "ガードスキル",
  ShieldSkill: "シールドスキル",
  KnifeSkill: "ナイフスキル",
  KnightSkill: "ナイトスキル",
  HunterSkill: "ハンタースキル",
  PriestSkill: "プリーストスキル",
  AssassinSkill: "アサシンスキル",
  WizardSkill: "ウィザードスキル",
  //
  SupportSkill: "サポートスキル",
  BattleSkill: "バトルスキル",
  SurvivalSkill: "サバイバルスキル",
  //
  SmithSkill: "鍛冶スキル",
  AlchemySkill: "錬金術スキル",
  TamerSkill: "テイマースキル",
  //
  DarkPowerSkill: "闇の力スキル",
  MagicBladeSkill: "魔剣スキル",
  DancerSkill: "ダンサースキル",
  MinstrelSkill: "ミンストレルスキル",
  BareHandSkill: "素手スキル",
  NinjaSkill: "忍者スキル",
  PartisanSkill: "パルチザンスキル",
  //
  LuckSkill: "ラックスキル",
  MerchantSkill: "商人スキル",
  PetSkill: "ペットスキル",
};

const skillChargingType: Record<Enums.SkillChargingType, string> = {
  Chanting: "詠唱",
  Reservoir: "チャージ",
};

const skillDistanceType: Record<Enums.SkillDistanceType, string> = {
  None: "影響なし",
  Long: "遠距離のみ",
  Short: "近距離のみ",
  Both: "両方",
};

const skillTargetType: Record<Enums.SkillTargetType, string> = {
  None: "対象なし",
  Self: "自分",
  Player: "仲間",
  Enemy: "敵",
};

const playerArmorAbilityType: Record<Enums.PlayerArmorAbilityType, string> = {
  Normal: "通常",
  Light: "軽化",
  Heavy: "重化",
};

const playerPetPersonaType: Record<Enums.PetPersonaType, string> = {
  Fervent: "熱情",
  Intelligent: "聡明",
  Mild: "温和",
  Swift: "敏捷",
  Justice: "正義",
  Devoted: "忠実",
  Impulsive: "衝動",
  Calm: "冷静",
  Sly: "狡猾",
  Timid: "臆病",
  Brave: "勇敢",
  Active: "活発",
  Sturdy: "強靭",
  Steady: "安定",
  Max: "最大",
};

const playerPetType: Record<Enums.PetType, string> = {
  AllTrades: "全貿易",
  PhysicalAttack: "物理攻撃",
  MagicAttack: "魔法攻撃",
  PhysicalDefense: "物理防御",
  MagicDefensem: "魔法防御",
  Avoidance: "回避",
  Hit: "命中",
  SkillsEnhancement: "スキル強化",
  Genius: "天才",
};

const playerAvatarType: Record<Enums.AvatarType, string> = {
  Decoration: "装飾品",
  Top: "上衣",
  Bottom: "下装",
};

const characterPersonalityType: Record<Enums.CharacterPersonalityType, string> = {
  None: "なし",
  Luk: "幸運",
  Cri: "クリティカル",
  Tec: "技巧",
  Men: "精神",
};

const partnerSkillType: Record<Enums.PartnerSkillType, string> = {
  Passive: "パッシブ",
  Active: "アクティブ",
};

const comboStepType: Record<Enums.ComboStepType, string> = {
  None: "なし",
  Start: "",
  Rengeki: "連撃",
  ThirdEye: "心眼",
  Filling: "補位",
  Quick: "迅速",
  HardHit: "増幅",
  Tenacity: "執着",
  Invincible: "無敵",
  BloodSucking: "吸血",
  Tough: "強靭",
  AMomentaryWalk: "",
  Reflection: "反射",
  Illusion: "",
  Max: "",
};

const mercenaryType: Record<Enums.MercenaryType, string> = {
  Tank: "タンク",
  Dps: "DPS",
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
      unInstall: "アンインストール",
      operation: "操作",
      searching: "検索中..."
    },
    nav: {
      home: "ホーム",
      character: "キャラクター",
      simulator: "コンボ分析",
      profile: "プロフィール",
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
          description: "すべてのページの遷移とアニメーション効果の持続時間に影響します。このコンフィグで制御されていないアニメーションがある場合は、ご報告ください。",
        },
        is3DbackgroundDisabled: {
          title: "3D背景を無効にする",
          description: "3D背景を無効にすると、大量の性能損失が発生しますが、推奨されません。",
        },
        colorTheme: {
          title: "色のテーマ",
          description: "普通の白天と黒夜しかありません。",
        }
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
          clearStorage: "このアプリのすべてのキャッシュを削除する（ページをリフレッシュします）",
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
    wiki: {
      selector: {
        title: "Wiki選択器",
        groupName: {
          combat: "戦闘データベース",
          daily: "日常データベース",
        },
      },
      tableConfig: {
        title: "テーブル設定"
      },
      news: {
        title: "最近更新",
      },
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
  db: {
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
      selfName: "アカウント",
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
      selfName: "アカウント作成データ",
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
      selfName: "アカウント更新データ",
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
      selfName: "アクティビティ",
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
    address: {
      selfName: "アドレス",
      description: "ゲーム内の特定の場所",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "アドレスのデータベースIDです。通常は表示されません。",
          formFieldDescription: "アドレスのデータベースIDです。入力が必要な場合は開発者に報告してください。",
        },
        name: {
          key: "名前",
          tableFieldDescription: "アドレスの名前は、通常ゲーム内と一致します。",
          formFieldDescription: "アドレスの名前をゲーム内と同じように記載してください。",
        },
        type: {
          key: "タイプ",
          tableFieldDescription: "アドレスのタイプを表します。通常アドレスと期間限定アドレスがあります。",
          formFieldDescription: "アドレスのタイプを選択してください。",
          enumMap: {
            Normal: "通常アドレス",
            Limited: "期間限定アドレス"
          }
        },
        posX: {
          key: "X座標",
          tableFieldDescription: "アドレスのX座標です。",
          formFieldDescription: "アドレスのX座標を入力してください。",
        },
        posY: {
          key: "Y座標",
          tableFieldDescription: "アドレスのY座標です。",
          formFieldDescription: "アドレスのY座標を入力してください。",
        },
        worldId: {
          key: "所属ワールド",
          tableFieldDescription: "アドレスが所属するワールドのIDです。",
          formFieldDescription: "アドレスが所属するワールドを選択してください。",
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
      cardFields: {
        zones: "包含する区域",
      },
    },
    armor: {
      selfName: "防具",
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
      selfName: "アバター",
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
      selfName: "機体",
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
      selfName: "機体技能",
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
      selfName: "連撃",
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
      selfName: "連撃ステップ",
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
      selfName: "消耗品",
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
      selfName: "クリスタル",
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
      selfName: "ドロップアイテム",
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
      selfName: "画像",
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
      selfName: "アイテム",
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
      selfName: "素材",
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
      selfName: "メンバー",
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
      selfName: "傭兵",
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
      selfName: "モンスター",
      fields: {
        name: {
          key: "名前",
          tableFieldDescription: "モンスターの名前は、通常ゲーム内と一致します。",
          formFieldDescription: "モンスターの名前をゲーム内と同じように記載してください。みんなが混乱しないようにね。",
        },
        id: {
          key: "ID",
          tableFieldDescription: "これはモンスターのデータベースIDです。普通は見ることはありません。",
          formFieldDescription: "これはモンスターのデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        type: {
          key: "モンスタータイプ",
          tableFieldDescription: "現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
          formFieldDescription: "現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
          enumMap: mobType
        },
        captureable: {
          key: "捕獲可能",
          tableFieldDescription: `${mobType.Boss}および${mobType.MiniBoss}以外のモンスターにのみ有効です。捕獲可能なガンリフや糖明凰は特別扱いされています。`,
          formFieldDescription: `${mobType.Mob}タイプでない場合は「不可」を選択してください。`,
        },
        actions: {
          key: "行動",
          tableFieldDescription: "モンスターの行動説明。シミュレーターはこのロジックに基づいて行動を模倣します",
          formFieldDescription: "モンスターの行動説明。シミュレーターはこのロジックに基づいて行動を模倣します",
        },
        baseLv: {
          key: "基本レベル",
          tableFieldDescription: `${mobType.Boss}の場合、この値は${mobDifficultyFlag.Easy}難易度でのレベルです。他のタイプのモンスターには難易度がないため、これが実際のレベルです。`,
          formFieldDescription: `モンスタータイプが${mobType.Boss}の場合、${mobDifficultyFlag.Easy}難易度でのレベルを入力してください。他のタイプのモンスターは実際のレベルを入力してください。`,
        },
        experience: {
          key: "経験値",
          tableFieldDescription: `${mobType.Boss}の場合、この値は${mobDifficultyFlag.Easy}難易度での経験値です。他のタイプのモンスターには難易度がないため、これが実際の経験値です。`,
          formFieldDescription: `モンスタータイプが${mobType.Boss}の場合、${mobDifficultyFlag.Easy}難易度での経験値を入力してください。他のタイプのモンスターは実際の経験値を入力してください。`,
        },
        initialElement: {
          key: "属性",
          tableFieldDescription: "これは初期属性です。戦闘中に属性が変わる場合があります。詳細は行動説明を参照してください。",
          formFieldDescription: "ここにモンスターの初期属性を記載してください。属性変更に関する説明は行動セクションで編集してください。",
          enumMap: elementType
        },
        radius: {
          key: "半径",
          tableFieldDescription: "モンスターのモデルサイズで、スキルが命中するかどうかを計算するために使用されます。",
          formFieldDescription: "モンスターのモデルサイズで、スキルが命中するかどうかを計算するために使用されます。遠距離から聖拳を発動した際に画面上に表示される距離-1で測定できます。",
        },
        maxhp: {
          key: "最大HP",
          tableFieldDescription: "この属性の意味がわからない人はいないよね？いないよね？",
          formFieldDescription: `${mobType.Boss}の場合、この値は${mobDifficultyFlag.Easy}難易度でのHPです。他のタイプのモンスターには難易度がないため、この値は推測が必要かもしれません。`,
        },
        physicalDefense: {
          key: "物理防御",
          tableFieldDescription: "物理貫通と相互作用する属性です。",
          formFieldDescription: "物理貫通と相互作用する属性です。",
        },
        physicalResistance: {
          key: "物理耐性",
          tableFieldDescription: "モンスターにとって最も実用的な物理ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
          formFieldDescription: "モンスターにとって最も実用的な物理ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
        },
        magicalDefense: {
          key: "魔法防御",
          tableFieldDescription: "魔法貫通と相互作用する属性です。",
          formFieldDescription: "魔法貫通と相互作用する属性です。",
        },
        magicalResistance: {
          key: "魔法耐性",
          tableFieldDescription: "モンスターにとって最も実用的な魔法ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
          formFieldDescription: "モンスターにとって最も実用的な魔法ダメージ軽減範囲です。プレイヤーはスキル定数で対応できます。",
        },
        criticalResistance: {
          key: "クリティカル耐性",
          tableFieldDescription: "魔法ダメージの場合、クリティカル率は（物理クリティカル率×魔法クリティカル変換率）- この値です。",
          formFieldDescription: "魔法ダメージの場合、クリティカル率は（物理クリティカル率×魔法クリティカル変換率）- この値です。",
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
          tableFieldDescription: `${mobType.Boss}のみこの値を持ちます。部位を破壊すると、討伐後の総経験値がこの値分追加されます。`,
          formFieldDescription: `${mobType.Boss}のみこの値を持ちます。部位を破壊すると、討伐後の総経験値がこの値分追加されます。`,
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
          formFieldDescription: "これはモンスターの統計情報のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        updatedByAccountId: {
          key: "更新者ID",
          tableFieldDescription: "これはモンスターの更新者のデータベースIDです。普通は見ることはありません。",
          formFieldDescription: "これはモンスターの更新者のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
        createdByAccountId: {
          key: "作成者ID",
          tableFieldDescription: "これはモンスターの作成者のデータベースIDです。普通は見ることはありません。",
          formFieldDescription: "これはモンスターの作成者のデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
        },
      },
      description: ""
    },
    npc: {
      selfName: "NPC",
      description: "ゲーム内の非プレイヤーキャラクター",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "NPCのデータベースIDです。通常は表示されません。",
          formFieldDescription: "NPCのデータベースIDです。入力が必要な場合は開発者に報告してください。",
        },
        name: {
          key: "名前",
          tableFieldDescription: "NPCの名前は、通常ゲーム内と一致します。",
          formFieldDescription: "NPCの名前をゲーム内と同じように記載してください。",
        },
        zoneId: {
          key: "所属ゾーン",
          tableFieldDescription: "NPCが所属するゾーンのIDです。",
          formFieldDescription: "NPCが所属するゾーンを選択してください。",
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
      cardFields: {
        tasks: "提供するクエスト",
      },
    },
    option: {
      selfName: "オプション装備",
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
      selfName: "プレイヤー",
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
      selfName: "プレイヤー防具",
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
        baseDef: {
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
      selfName: "プレイヤー追加装備",
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
      selfName: "プレイヤーのペット",
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
      selfName: "プレイヤー特殊装備",
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
      selfName: "プレイヤー武器",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "武器の一意の識別子",
          formFieldDescription: "武器の一意の識別子"
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
      selfName: "ポスト",
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
      selfName: "レシピ",
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
    recipe_ingredient: {
      selfName: "レシピ材料",
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
      selfName: "セッション",
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
      selfName: "シミュレーター",
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
      selfName: "スキル",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "これはスキルのデータベースIDです。通常、これは表示されません。",
          formFieldDescription: "これはスキルのデータベースIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
        },
        name: {
          key: "名前",
          tableFieldDescription: "スキルの名前で、通常はゲーム内の名前と一致します。",
          formFieldDescription: "ゲーム内で表示されるスキル名を入力してください。他の人が混乱しないようにしましょう。",
        },
        treeType: {
          key: "スキルツリー",
          tableFieldDescription: "スキルの最上位分類で、魔法スキル、闇の力、サポートスキル、戦士などがあります。",
          formFieldDescription: "スキルの最上位分類で、魔法スキル、闇の力、サポートスキル、戦士などがあります。",
          enumMap: {
            "BladeSkill": "ブレードスキル",
            "ShootSkill": "シュートスキル",
            "MagicSkill": "魔法スキル",
            "MarshallSkill": "マーシャルスキル",
            "DualSwordSkill": "双剣スキル",
            "HalberdSkill": "ハルバードスキル",
            "MononofuSkill": "もののふスキル",
            "CrusherSkill": "クラッシャースキル",
            "FeatheringSkill": "フェザリングスキル",
            "GuardSkill": "ガードスキル",
            "ShieldSkill": "シールドスキル",
            "KnifeSkill": "ナイフスキル",
            "KnightSkill": "ナイトスキル",
            "HunterSkill": "ハンタースキル",
            "PriestSkill": "プリーストスキル",
            "AssassinSkill": "アサシンスキル",
            "WizardSkill": "ウィザードスキル",
            "SupportSkill": "サポートスキル",
            "BattleSkill": "バトルスキル",
            "SurvivalSkill": "サバイバルスキル",
            "SmithSkill": "鍛冶スキル",
            "AlchemySkill": "錬金スキル",
            "TamerSkill": "テイマースキル",
            "DarkPowerSkill": "闇の力スキル",
            "MagicBladeSkill": "魔法剣スキル",
            "DancerSkill": "ダンサースキル",
            "MinstrelSkill": "ミンストレルスキル",
            "BareHandSkill": "素手スキル",
            "NinjaSkill": "忍者スキル",
            "PartisanSkill": "パルチザンスキル",
            "LuckSkill": "ラックスキル",
            "MerchantSkill": "商人スキル",
            "PetSkill": "ペットスキル"
          }
        },
        posX: {
          key: "横位置",
          tableFieldDescription: "スキルツリー内の位置で、左端の列を0列目と定義します",
          formFieldDescription: "スキルツリー内の位置で、左端の列を0列目と定義します",
        },
        posY: {
          key: "縦位置",
          tableFieldDescription: "スキルツリー内の位置で、0列目の最上部のスキルを0行目と定義します",
          formFieldDescription: "スキルツリー内の位置で、0列目の最上部のスキルを0行目と定義します",
        },
        tier: {
          key: "ティア",
          tableFieldDescription: "主に傭兵スキルのクールダウン間隔の計算に使用されます",
          formFieldDescription: "主に傭兵スキルのクールダウン間隔の計算に使用されます",
        },
        targetType: {
          key: "ターゲットタイプ",
          tableFieldDescription: `ターゲットを選択せずに発動できるスキルは${skillTargetType.Self}、${skillTargetType.Player}をターゲットにできるスキルは${skillTargetType.Player}です。`,
          formFieldDescription: `ターゲットを選択せずに発動できるスキルは${skillTargetType.Self}、${skillTargetType.Player}をターゲットにできるスキルは${skillTargetType.Player}です。`,
          enumMap: {
            "None": "ターゲットなし",
            "Self": "自身",
            "Player": "味方",
            "Enemy": "敵"
          }
        },
        chargingType: {
          key: "詠唱タイプ",
          tableFieldDescription: `詠唱の影響を受けないスキルはすべて${skillChargingType.Reservoir}です。`,
          formFieldDescription: `詠唱の影響を受けないスキルはすべて${skillChargingType.Reservoir}です。`,
          enumMap: {
            "Chanting": "詠唱",
            "Reservoir": "貯蔵"
          }
        },
        distanceType: {
          key: "距離威力タイプ",
          tableFieldDescription: "どのタイプの距離威力がこのスキルに影響するかを示します",
          formFieldDescription: "どのタイプの距離威力がこのスキルに影響するかを示します",
          enumMap: {
            "None": "影響なし",
            "Long": "遠距離のみ",
            "Short": "近距離のみ",
            "Both": "両方"
          }
        },
        isPassive: {
          key: "パッシブ",
          tableFieldDescription: "習得した時点で即座に効果が発揮されるスキルはパッシブスキルです",
          formFieldDescription: "習得した時点で即座に効果が発揮されるスキルはパッシブスキルです",
        },
        details: {
          key: "追加メモ",
          tableFieldDescription: "編集者が追加したい内容",
          formFieldDescription: "読者に伝えたいその他の内容",
        },
        dataSources: {
          key: "データソース",
          tableFieldDescription: "このデータを測定した人物または組織",
          formFieldDescription: "このデータを測定した人物または組織",
        },
        statisticId: {
          key: "統計ID",
          tableFieldDescription: "これは統計データベースのIDです。通常、これは表示されません。",
          formFieldDescription: "これは統計データベースのIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
        },
        updatedByAccountId: {
          key: "更新者",
          tableFieldDescription: "これは更新者のデータベースIDです。通常、これは表示されません。",
          formFieldDescription: "これは更新者のデータベースIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
        },
        createdByAccountId: {
          key: "作成者",
          tableFieldDescription: "これは作成者のデータベースIDです。通常、これは表示されません。",
          formFieldDescription: "これは作成者のデータベースIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
        }
      },
      description: ""
    },
    skill_effect: {
      selfName: "スキル効果",
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
      selfName: "特殊装備",
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
      selfName: "統計",
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
      selfName: "タスク",
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
    task_collect_require: {
      selfName: "タスク収集要件",
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
      selfName: "タスク撃破要件",
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
      selfName: "タスク報酬",
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
      selfName: "チーム",
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
      selfName: "ユーザー",
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
      selfName: "検証トークン",
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
      selfName: "武器",
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
      selfName: "世界",
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
    zone: {
      selfName: "ゾーン",
      fields: {
        id: {
          key: "ID",
          tableFieldDescription: "ゾーンの一意の識別子",
          formFieldDescription: "ゾーンの一意の識別子、システムによって自動生成されます"
        },
        name: {
          key: "名前",
          tableFieldDescription: "ゾーンの名前",
          formFieldDescription: "ゾーンの名前を入力してください"
        },
        rewardNodes: {
          key: "報酬ノード数",
          tableFieldDescription: "ゾーン内の報酬ノードの数",
          formFieldDescription: "ゾーン内の報酬ノードの数を入力してください"
        },
        activityId: {
          key: "アクティビティID",
          tableFieldDescription: "このゾーンが属するアクティビティのID",
          formFieldDescription: "このゾーンが属するアクティビティを選択してください"
        },
        addressId: {
          key: "マップID",
          tableFieldDescription: "このゾーンが属するマップのID",
          formFieldDescription: "このゾーンが属するマップを選択してください"
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
      cardFields: {
        mobs: "出現するモンスター",
        npcs: "出現するNPC"
      },
      description: "ゲーム内のゾーン情報、名前、リンクゾーン、報酬ノードなどを含みます"
    }
  },
};

export default dictionary;
