import type * as Enums from "@db/schema/enums";
import type { Dictionary } from "../type";

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

const mainHandType: Record<Enums.MainHandType, string> = {
	...mainWeaponType,
	None: "なし",
};

const mainHandTypeLimit: Record<Enums.MainHandTypeLimit, string> = {
	...mainHandType,
	Any: "なし",
};

const subWeaponType: Record<Enums.SubWeaponType, string> = {
	Arrow: "矢",
	ShortSword: "短剣",
	NinjutsuScroll: "忍術巻物",
	Shield: "盾",
};

const subHandType: Record<Enums.SubHandType, string> = {
	...subWeaponType,
	OneHandSword: mainHandType.OneHandSword,
	Magictool: mainHandType.Magictool,
	Knuckle: mainHandType.Knuckle,
	Katana: mainHandType.Katana,
	None: "なし",
};

const subHandTypeLimit: Record<Enums.SubHandTypeLimit, string> = {
	...subHandType,
	Any: "なし",
};

const distanceType: Record<Enums.SkillDistanceType, string> = {
	None: "影響なし",
	Long: "遠距離のみ",
	Short: "近距離のみ",
	Both: "両方",
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
	Item: "アイテム",
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
	NecromancerSkill: "ネクロマンサースキル",
	GolemSkill: "ゴーレムスキル",
	//
	LuckSkill: "ラックスキル",
	MerchantSkill: "商人スキル",
	PetSkill: "ペットスキル",
};

const skillCastTimeType: Record<Enums.SkillCastTimeType, string> = {
	Instant: "即時",
	Chanting: "詠唱",
	Charging: "チャージ",
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

const playerArmorAbilityTypeLimit: Record<Enums.PlayerArmorAbilityTypeLimit, string> = {
	...playerArmorAbilityType,
	Any: "なし",
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
	MagicDefense: "魔法防御",
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

const dictionary: Dictionary = {
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
			searching: "検索中...",
			enterFullscreen: "全画面表示",
			exitFullscreen: "全画面を終了",
		},
		relationPrefix: {
			belongsTo: "所属",
			usedBy: "使用される",
			updatedBy: "更新データ",
			createdBy: "作成データ",
			contains: "含まれる",
			related: "関連",
			none: "",
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
					description:
						"すべてのページの遷移とアニメーション効果の持続時間に影響します。このコンフィグで制御されていないアニメーションがある場合は、ご報告ください。",
				},
				is3DbackgroundDisabled: {
					title: "3D背景を無効にする",
					description: "3D背景を無効にすると、大量の性能損失が発生しますが、推奨されません。",
				},
				colorTheme: {
					title: "色のテーマ",
					description: "普通の白天と黒夜しかありません。",
				},
				themeVersion: {
					title: "テーマバージョン",
					description: "現在の色システムで使うトークンの版を選択します。",
					v1: "v1",
					v2: "v2",
					v3: "v3",
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
					description:
						"このアプリはプログレッシブウェブアプリ（PWA）として設計されており、条件が整えばデバイスにインストールしてより快適に利用できます（デフォルトではインストールされません）。",
					notSupported: "このデバイスはPWAをサポートしていないか、すでにインストール済みです",
				},
				storageInfo: {
					title: "ストレージ使用状況",
					description: "localStorage、IndexedDB などのキャッシュを含みます",
					usage: "使用済み",
					clearStorage: "このアプリのすべてのキャッシュを削除する（ページをリフレッシュします）",
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
		wiki: {
			selector: {
				title: "Wiki選択器",
				groupName: {
					combat: "戦闘データベース",
					daily: "日常データベース",
				},
			},
			tableConfig: {
				title: "テーブル設定",
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
			//     baseAbi: "ボディアーマー基礎防御力",
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
			//   skillVariantType: "スキル効果タイプ",
			//   actionFixedMs: "固定アクション時間（ms）",
			//   actionModifiedMs: "加速可能アクション時間（ms）",
			//   skillActionMs: "アクション総時間（ms）",
			//   chantingFixedMs: "固定詠唱時長（ms）",
			//   chantingModifiedMs: "加速可能詠唱時間（ms）",
			//   skillChantingMs: "詠唱総時間（ms）",
			//   chargingFixedMs: "固定チャージ時間（ms）",
			//   chargingModifiedMs: "加速可能チャージ時間（ms）",
			//   skillChargingMs: "チャージ総時間（ms）",
			//   skillDuration: "スキル総所要時間（ms）",
			//   skillStartupMs: "スキル発動前時間（ms）",
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
					title: "チーム設定",
				},
			},
		},
		character: {
			pageTitle: "キャラクターテーブル",
			description: "このページは開発中です。使用しないでください。",
			tabs: {
				combo: "コンボ",
				behavior: "行動",
				equipment: {
					selfName: "アイテム",
					mainHand: "メインハンド",
					subHand: "サブハンド",
					armor: "ボディアーマー",
					option: "オプション",
					special: "スペシャル",
				},
				consumable: "コンシューム",
				cooking: "コック",
				registlet: "レジストルト",
				skill: {
					selfName: "スキル",
					treeSkill: "ツリースキル",
					starGem: "スタージェム",
					trees: {
						WeaponSkillGroup: {
							selfName: "武器スキル",
							tree: {
								BladeSkill: "ブレードスキル",
								ShootSkill: "シュートスキル",
								MagicSkill: "魔法スキル",
								MarshallSkill: "格闘スキル",
								DualSwordSkill: "双剣スキル",
								HalberdSkill: "斧槍スキル",
								MononofuSkill: "武士スキル",
								CrusherSkill: "クラッシャースキル",
								FeatheringSkill: "フェザリングスキル",
							},
						},
						BuffSkillGroup: {
							selfName: "バフスキル",
							tree: {
								GuardSkill: "ガードスキル",
								ShieldSkill: "シールドスキル",
								KnifeSkill: "ナイフスキル",
								KnightSkill: "ナイトスキル",
								HunterSkill: "ハンタースキル",
								PriestSkill: "プリーストスキル",
								AssassinSkill: "アサシンスキル",
								WizardSkill: "ウィザードスキル",
							},
						},
						AssistSkillGroup: {
							selfName: "補助スキル",
							tree: {
								SupportSkill: "補助スキル",
								BattleSkill: "好戦分子",
								SurvivalSkill: "生存本能",
							},
						},
						ProduceSkillGroup: {
							selfName: "生産関連",
							tree: {
								SmithSkill: "鍛冶マスター",
								AlchemySkill: "錬金術士",
								TamerSkill: "テイマー",
							},
						},
						SkillBookGroup: {
							selfName: "スキルブック",
							tree: {
								DarkPowerSkill: "暗黒の力",
								MagicBladeSkill: "魔剣スキル",
								DancerSkill: "ダンサースキル",
								MinstrelSkill: "ミンストレルスキル",
								BareHandSkill: "素手スキル",
								NinjaSkill: "忍者スキル",
								PartisanSkill: "パルチザンスキル",
								NecromancerSkill: "ネクロマンサースキル",
								GolemSkill: "ゴーレムスキル",
							},
						},
						OtherSkillGroup: {
							selfName: "その他スキル",
							tree: {
								LuckSkill: "ラックスキル",
								MerchantSkill: "商人スキル",
								PetSkill: "ペットスキル",
							},
						},
					},
				},
				ability: "ステータス",
				base: {
					selfName: "ベース",
					name: "名前",
				},
			},
		},
	},
	db: {
		_armorTocrystal: {
			selfName: "防具-水晶関連",
			fields: {
				A: {
					key: "防具ID",
					tableFieldDescription: "関連する防具ID",
					formFieldDescription: "関連付ける防具を選択",
				},
				B: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
			},
			description: "防具と水晶の関連を記録",
		},
		_avatarTocharacter: {
			selfName: "アバター-キャラ関連",
			fields: {
				A: {
					key: "アバターID",
					tableFieldDescription: "関連するアバターID",
					formFieldDescription: "関連付けるアバターを選択",
				},
				B: {
					key: "キャラID",
					tableFieldDescription: "関連するキャラID",
					formFieldDescription: "関連付けるキャラを選択",
				},
			},
			description: "アバターとキャラの関連を記録",
		},
		_backRelation: {
			selfName: "逆関連",
			fields: {
				A: {
					key: "ソースID",
					tableFieldDescription: "関連するソースID",
					formFieldDescription: "ソースを選択",
				},
				B: {
					key: "ターゲットID",
					tableFieldDescription: "関連するターゲットID",
					formFieldDescription: "ターゲットを選択",
				},
			},
			description: "クリスタル間の逆関連を記録",
		},
		_campA: {
			selfName: "陣営A関連",
			fields: {
				A: {
					key: "ソースID",
					tableFieldDescription: "関連するソースID",
					formFieldDescription: "ソースを選択",
				},
				B: {
					key: "ターゲットID",
					tableFieldDescription: "関連するターゲットID",
					formFieldDescription: "ターゲットを選択",
				},
			},
			description: "陣営Aの関連を記録",
		},
		_campB: {
			selfName: "陣営B関連",
			fields: {
				A: {
					key: "ソースID",
					tableFieldDescription: "関連するソースID",
					formFieldDescription: "ソースを選択",
				},
				B: {
					key: "ターゲットID",
					tableFieldDescription: "関連するターゲットID",
					formFieldDescription: "ターゲットを選択",
				},
			},
			description: "陣営Bの関連を記録",
		},
		_characterToconsumable: {
			selfName: "キャラ-消耗品関連",
			fields: {
				A: {
					key: "キャラID",
					tableFieldDescription: "関連するキャラID",
					formFieldDescription: "関連付けるキャラを選択",
				},
				B: {
					key: "消耗品ID",
					tableFieldDescription: "関連する消耗品ID",
					formFieldDescription: "関連付ける消耗品を選択",
				},
			},
			description: "キャラと消耗品の関連を記録",
		},
		_crystalTooption: {
			selfName: "水晶-オプション関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "オプションID",
					tableFieldDescription: "関連するオプションID",
					formFieldDescription: "関連付けるオプションを選択",
				},
			},
			description: "水晶と追加装備の関連を記録",
		},
		_crystalToplayer_armor: {
			selfName: "水晶-プレイヤー防具関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "プレイヤー防具ID",
					tableFieldDescription: "関連するプレイヤー防具ID",
					formFieldDescription: "関連付けるプレイヤー防具を選択",
				},
			},
			description: "水晶とプレイヤー防具の関連を記録",
		},
		_crystalToplayer_option: {
			selfName: "水晶-プレイヤーオプション関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "プレイヤーオプションID",
					tableFieldDescription: "関連するプレイヤー追加装備ID",
					formFieldDescription: "関連付けるプレイヤー追加装備を選択",
				},
			},
			description: "水晶とプレイヤー追加装備の関連を記録",
		},
		_crystalToplayer_special: {
			selfName: "水晶-プレイヤー特殊関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "プレイヤー特殊ID",
					tableFieldDescription: "関連するプレイヤー特殊装備ID",
					formFieldDescription: "関連付けるプレイヤー特殊装備を選択",
				},
			},
			description: "水晶とプレイヤー特殊装備の関連を記録",
		},
		_crystalToplayer_weapon: {
			selfName: "水晶-プレイヤー武器関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "プレイヤー武器ID",
					tableFieldDescription: "関連するプレイヤー武器ID",
					formFieldDescription: "関連付けるプレイヤー武器を選択",
				},
			},
			description: "水晶とプレイヤー武器の関連を記録",
		},
		_crystalTospecial: {
			selfName: "水晶-特殊装備関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "特殊装備ID",
					tableFieldDescription: "関連する特殊装備ID",
					formFieldDescription: "関連付ける特殊装備を選択",
				},
			},
			description: "水晶と特殊装備の関連を記録",
		},
		_crystalToweapon: {
			selfName: "水晶-武器関連",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "関連する水晶ID",
					formFieldDescription: "関連付ける水晶を選択",
				},
				B: {
					key: "武器ID",
					tableFieldDescription: "関連する武器ID",
					formFieldDescription: "関連付ける武器を選択",
				},
			},
			description: "水晶と武器の関連を記録",
		},
		_frontRelation: {
			selfName: "前関連",
			fields: {
				A: {
					key: "前置水晶ID",
					tableFieldDescription: "関連する前置水晶ID",
					formFieldDescription: "前置クリスタルを選択",
				},
				B: {
					key: "後置水晶ID",
					tableFieldDescription: "関連する後置水晶ID",
					formFieldDescription: "後置クリスタルを選択",
				},
			},
			description: "クリスタル間の前後関係を記録",
		},
		_linkZones: {
			selfName: "ゾーン接続",
			fields: {
				A: {
					key: "ゾーンA ID",
					tableFieldDescription: "接続元ゾーンID",
					formFieldDescription: "接続元ゾーンを選択",
				},
				B: {
					key: "ゾーンB ID",
					tableFieldDescription: "接続先ゾーンID",
					formFieldDescription: "接続先ゾーンを選択",
				},
			},
			description: "ゾーン間の接続を記録",
		},
		_mobTozone: {
			selfName: "モブ-ゾーン関連",
			fields: {
				A: {
					key: "モブID",
					tableFieldDescription: "関連するモブID",
					formFieldDescription: "関連付けるモブを選択",
				},
				B: {
					key: "ゾーンID",
					tableFieldDescription: "関連するゾーンID",
					formFieldDescription: "関連付けるゾーンを選択",
				},
			},
			description: "モブとゾーンの関連を記録",
		},
		account: {
			selfName: "アカウント",
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
					enumMap: accountType,
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
			description: "認証用のアカウント情報",
		},
		account_create_data: {
			selfName: "アカウント作成データ",
			fields: {
				accountId: {
					key: "账号ID",
					tableFieldDescription: "关联的账号ID",
					formFieldDescription: "选择要创建的账号",
				},
			},
			description: "アカウント作成記録",
		},
		account_update_data: {
			selfName: "アカウント更新データ",
			fields: {
				accountId: {
					key: "账号ID",
					tableFieldDescription: "关联的账号ID",
					formFieldDescription: "选择要更新的账号",
				},
			},
			description: "アカウント更新記録",
		},
		activity: {
			selfName: "アクティビティ",
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
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "ゲーム内のアクティビティ情報",
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
					enumMap: addressType,
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
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
		},
		armor: {
			selfName: "防具",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "防具の名前",
					formFieldDescription: "防具の名前を入力してください。",
				},
				baseAbi: {
					key: "基礎防御",
					tableFieldDescription: "防具の基礎防御",
					formFieldDescription: "防具の基礎防御を入力してください。",
				},
				modifiers: {
					key: "付与属性",
					tableFieldDescription: "防具の付与属性",
					formFieldDescription: "防具の付与属性を入力してください。",
				},
				colorA: {
					key: "色A",
					tableFieldDescription: "防具の色A",
					formFieldDescription: "防具の色Aを選択してください。",
				},
				colorB: {
					key: "色B",
					tableFieldDescription: "防具の色B",
					formFieldDescription: "防具の色Bを選択してください。",
				},
				colorC: {
					key: "色C",
					tableFieldDescription: "防具の色C",
					formFieldDescription: "防具の色Cを選択してください。",
				},
				itemId: {
					key: "物品ID",
					tableFieldDescription: "防具の物品ID",
					formFieldDescription: "防具の物品IDを入力してください。",
				},
			},
			description: "ゲーム内の防具情報",
		},
		avatar: {
			selfName: "アバター",
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
					enumMap: playerAvatarType,
				},
				modifiers: {
					key: "修正值",
					tableFieldDescription: "头像的属性修正值",
					formFieldDescription: "请输入属性修正值",
				},
				belongToPlayerId: {
					key: "玩家ID",
					tableFieldDescription: "关联的玩家ID",
					formFieldDescription: "选择关联的玩家",
				},
			},
			description: "アバター情報",
		},
		character: {
			selfName: "キャラクター",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "キャラクターのデータベースIDです。通常は表示されません。",
					formFieldDescription: "キャラクターのデータベースIDです。入力が必要な場合は開発者に報告してください。",
				},
				name: {
					key: "名前",
					tableFieldDescription: "キャラクターの名前",
					formFieldDescription: "キャラクターの名前を入力してください。",
				},
				lv: {
					key: "レベル",
					tableFieldDescription: "キャラクターのレベル",
					formFieldDescription: "キャラクターのレベルを入力してください。",
				},
				str: {
					key: "力",
					tableFieldDescription: "キャラクターの力の値",
					formFieldDescription: "キャラクターの力の値を入力してください。",
				},
				int: {
					key: "知力",
					tableFieldDescription: "キャラクターの知力の値",
					formFieldDescription: "キャラクターの知力の値を入力してください。",
				},
				vit: {
					key: "体力",
					tableFieldDescription: "キャラクターの体力の値",
					formFieldDescription: "キャラクターの体力の値を入力してください。",
				},
				agi: {
					key: "敏捷",
					tableFieldDescription: "キャラクターの敏捷の値",
					formFieldDescription: "キャラクターの敏捷の値を入力してください。",
				},
				dex: {
					key: "器用",
					tableFieldDescription: "キャラクターの器用の値",
					formFieldDescription: "キャラクターの器用の値を入力してください。",
				},
				personalityType: {
					key: "性格タイプ",
					tableFieldDescription: "キャラクターの性格タイプ",
					formFieldDescription: "キャラクターの性格タイプを選択してください。",
					enumMap: characterPersonalityType,
				},
				personalityValue: {
					key: "性格値",
					tableFieldDescription: "キャラクターの性格値",
					formFieldDescription: "キャラクターの性格値を入力してください。",
				},
				weaponId: {
					key: "武器ID",
					tableFieldDescription: "キャラクターの武器ID",
					formFieldDescription: "キャラクターの武器を選択してください。",
				},
				subWeaponId: {
					key: "サブ武器ID",
					tableFieldDescription: "キャラクターのサブ武器ID",
					formFieldDescription: "キャラクターのサブ武器を選択してください。",
				},
				armorId: {
					key: "防具ID",
					tableFieldDescription: "キャラクターの防具ID",
					formFieldDescription: "キャラクターの防具を選択してください。",
				},
				optionId: {
					key: "オプションID",
					tableFieldDescription: "キャラクターのオプションID",
					formFieldDescription: "キャラクターのオプションを選択してください。",
				},
				specialId: {
					key: "特殊ID",
					tableFieldDescription: "キャラクターの特殊ID",
					formFieldDescription: "キャラクターの特殊を選択してください。",
				},
				cooking: {
					key: "料理",
					tableFieldDescription: "キャラクターの料理",
					formFieldDescription: "キャラクターの料理を入力してください。",
				},
				modifiers: {
					key: "修正値",
					tableFieldDescription: "キャラクターの修正値",
					formFieldDescription: "キャラクターの修正値を入力してください。",
				},
				actions: {
					key: "行動",
					tableFieldDescription: "キャラクターの行動",
					formFieldDescription: "キャラクターの行動を入力してください。",
					fields: {
						name: {
							key: "ビヘイビアツリー名",
							tableFieldDescription: "ビヘイビアツリーの名前",
							formFieldDescription: "ビヘイビアツリーの名前",
						},
						definition: {
							key: "ビヘイビアツリー定義",
							tableFieldDescription: "MDSL ビヘイビアツリー定義",
							formFieldDescription: "MDSL ビヘイビアツリー定義",
						},
						agent: {
							key: "Agent関数",
							tableFieldDescription: "ビヘイビアツリーの呼び出し可能関数群",
							formFieldDescription: "ビヘイビアツリーの呼び出し可能関数群",
						},
						memberType: {
							key: "メンバータイプ",
							tableFieldDescription: "この行動が属するメンバータイプ",
							formFieldDescription: "この行動が属するメンバータイプ",
							enumMap: {
								Player: "プレイヤー",
								Partner: "パートナー",
								Mercenary: "傭兵",
								Mob: "モブ",
							},
						},
						attributeSlots: {
							key: "属性スロット",
							tableFieldDescription: "StatContainer に追加する永続属性スロット",
							formFieldDescription: "StatContainer に追加する永続属性スロット",
							item: {
								key: "",
								tableFieldDescription: "",
								formFieldDescription: "",
								fields: {
									path: {
										key: "属性パス",
										tableFieldDescription: "ドット区切りの完全な属性パス",
										formFieldDescription: "ドット区切りの完全な属性パス",
									},
									attribute: {
										key: "属性定義",
										tableFieldDescription: "属性定義",
										formFieldDescription: "属性定義",
										fields: {
											displayName: {
												key: "表示名",
												tableFieldDescription: "属性の表示名",
												formFieldDescription: "属性の表示名",
											},
											expression: {
												key: "初期式",
												tableFieldDescription: "属性の初期式",
												formFieldDescription: "属性の初期式",
											},
											noBaseValue: {
												key: "乗算除外",
												tableFieldDescription: "パーセンテージ補正が乗算に参加しない",
												formFieldDescription: "パーセンテージ補正が乗算に参加しない",
											},
										},
									},
								},
							},
						},
					},
				},
				partnerSkillAId: {
					key: "パートナー技能A ID",
					tableFieldDescription: "キャラクターのパートナー技能A ID",
					formFieldDescription: "キャラクターのパートナー技能Aを選択してください。",
				},
				partnerSkillAType: {
					key: "パートナー技能Aタイプ",
					tableFieldDescription: "キャラクターのパートナー技能Aタイプ",
					formFieldDescription: "キャラクターのパートナー技能Aタイプを選択してください。",
					enumMap: partnerSkillType,
				},
				partnerSkillBId: {
					key: "パートナー技能B ID",
					tableFieldDescription: "キャラクターのパートナー技能B ID",
					formFieldDescription: "キャラクターのパートナー技能Bを選択してください。",
				},
				partnerSkillBType: {
					key: "パートナー技能Bタイプ",
					tableFieldDescription: "キャラクターのパートナー技能Bタイプ",
					formFieldDescription: "キャラクターのパートナー技能Bタイプを選択してください。",
					enumMap: partnerSkillType,
				},
				belongToPlayerId: {
					key: "主人ID",
					tableFieldDescription: "キャラクターの主人ID",
					formFieldDescription: "キャラクターの主人を選択してください。",
				},
				details: {
					key: "詳細情報",
					tableFieldDescription: "キャラクターの詳細情報",
					formFieldDescription: "キャラクターの詳細情報を入力してください。",
				},
				statisticId: {
					key: "統計ID",
					tableFieldDescription: "キャラクターの統計ID",
					formFieldDescription: "キャラクターの統計を選択してください。",
				},
			},
			description: "キャラクター情報",
		},
		character_skill: {
			selfName: "機体技能",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "角色技能的唯一标识符",
					formFieldDescription: "角色技能的唯一标识符",
				},
				lv: {
					key: "等级",
					tableFieldDescription: "角色技能的等级",
					formFieldDescription: "请输入等级",
				},
				isStarGem: {
					key: "是否为星石",
					tableFieldDescription: "是否为星石技能",
					formFieldDescription: "是否为星石技能",
				},
				templateId: {
					key: "技能ID",
					tableFieldDescription: "角色技能的模板ID",
					formFieldDescription: "选择技能模板",
				},
				belongToCharacterId: {
					key: "所属角色ID",
					tableFieldDescription: "角色技能所属的角色ID",
					formFieldDescription: "选择所属角色",
				},
			},
			description: "キャラクター習得スキル情報",
		},
		combo: {
			selfName: "連撃",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "连击的唯一标识符",
					formFieldDescription: "连击的唯一标识符",
				},
				disable: {
					key: "是否禁用",
					tableFieldDescription: "连击是否禁用",
					formFieldDescription: "是否禁用该连击",
				},
				name: {
					key: "名称",
					tableFieldDescription: "连击的名称",
					formFieldDescription: "请输入连击的名称",
				},
				belongToCharacterId: {
					key: "所属角色ID",
					tableFieldDescription: "连击所属的角色ID",
					formFieldDescription: "选择所属角色",
				},
			},
			description: "コンボ情報",
		},
		combo_step: {
			selfName: "連撃ステップ",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "连击步骤的唯一标识符",
					formFieldDescription: "连击步骤的唯一标识符",
				},
				type: {
					key: "类型",
					tableFieldDescription: "连击步骤的类型",
					formFieldDescription: "选择连击步骤的类型",
					enumMap: comboStepType,
				},
				characterSkillId: {
					key: "角色技能ID",
					tableFieldDescription: "使用的角色技能ID",
					formFieldDescription: "选择使用的角色技能",
				},
				belongToComboId: {
					key: "所属连击ID",
					tableFieldDescription: "连击步骤所属的连击ID",
					formFieldDescription: "选择所属连击",
				},
			},
			description: "コンボステップ情報",
		},
		consumable: {
			selfName: "消耗品",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "武器の名前",
					formFieldDescription: "武器の名前を入力してください。",
				},
				type: {
					key: "タイプ",
					tableFieldDescription: "消耗品のタイプ",
					formFieldDescription: "消耗品のタイプを選択してください。",
					enumMap: consumableType,
				},
				effectDuration: {
					key: "効果持続時間",
					tableFieldDescription: "消耗品の効果持続時間",
					formFieldDescription: "消耗品の効果持続時間を入力してください。",
				},
				effects: {
					key: "効果",
					tableFieldDescription: "消耗品の効果",
					formFieldDescription: "消耗品の効果を入力してください。",
				},
				itemId: {
					key: "物品ID",
					tableFieldDescription: "消耗品の物品ID",
					formFieldDescription: "消耗品の物品IDを入力してください。",
				},
			},
			description: "消耗品情報",
		},
		crystal: {
			selfName: "クリスタル",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "クリスタルの名前",
					formFieldDescription: "クリスタルの名前を入力してください。",
				},
				type: {
					key: "タイプ",
					tableFieldDescription: "クリスタルのタイプ",
					formFieldDescription: "クリスタルのタイプを選択してください。",
					enumMap: crystalType,
				},
				modifiers: {
					key: "付与属性",
					tableFieldDescription: "クリスタルの付与属性",
					formFieldDescription: "クリスタルの付与属性を入力してください。",
				},
				itemId: {
					key: "物品ID",
					tableFieldDescription: "クリスタルの物品ID",
					formFieldDescription: "クリスタルの物品IDを入力してください。",
				},
			},
			description: "クリスタル情報",
		},
		drop_item: {
			selfName: "ドロップアイテム",
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
					enumMap: dropItemRelatedPartType,
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
					enumMap: dropItemBreakRewardType,
				},
				belongToMobId: {
					key: "掉落于",
					tableFieldDescription: "掉落物品的怪物ID",
					formFieldDescription: "选择掉落物品的怪物",
				},
			},
			description: "モブのドロップアイテム情報",
		},
		image: {
			selfName: "画像",
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
				belongToNpcId: {
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
				optionId: {
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
			description: "ゲーム内の画像リソース情報",
		},
		item: {
			selfName: "アイテム",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "道具的唯一标识符",
					formFieldDescription: "道具的唯一标识符",
				},
				itemType: {
					key: "道具类型",
					tableFieldDescription: "道具的表类型，这个类型主要用于系统判断",
					formFieldDescription: "一般不需要手动选择，如果看到这个，请给开发人员反馈",
					enumMap: itemType,
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
					key: "アイテムソースタイプ",
					tableFieldDescription: "アイテムのソースタイプ",
					formFieldDescription: "アイテムのソースタイプ",
					enumMap: {
						Mob: "モンスター",
						Task: "任務",
						BlacksmithShop: "鐵匠鋪",
						Player: "プレイヤー",
					},
				},
			},
			description: "ゲーム内のアイテム情報",
		},
		material: {
			selfName: "素材",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "素材の名前",
					formFieldDescription: "素材の名前を入力してください。",
				},
				type: {
					key: "タイプ",
					tableFieldDescription: "素材のタイプ",
					formFieldDescription: "素材のタイプを選択してください。",
					enumMap: materialType,
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
			description: "ゲーム内の素材情報",
		},
		member: {
			selfName: "メンバー",
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
						Easy: "",
						Normal: "",
						Hard: "",
						Lunatic: "",
						Ultimate: "",
					},
				},
				belongToTeamId: {
					key: "队伍ID",
					tableFieldDescription: "成员的队伍ID",
					formFieldDescription: "选择成员的队伍",
				},
				type: {
					key: "タイプ",
					tableFieldDescription: "メンバーのタイプ",
					formFieldDescription: "メンバーのタイプ",
					enumMap: {
						Player: "プレイヤー",
						Partner: "パートナー",
						Mercenary: "傭兵",
						Mob: "モンスター",
					},
				},
			},
			description: "チームメンバー情報",
		},
		mercenary: {
			selfName: "傭兵",
			fields: {
				type: {
					key: "类型",
					tableFieldDescription: "佣兵的类型",
					formFieldDescription: "选择佣兵的类型",
					enumMap: mercenaryType,
				},
				templateId: {
					key: "模板角色ID",
					tableFieldDescription: "佣兵的模板角色ID",
					formFieldDescription: "选择模板角色",
				},
				skillAId: {
					key: "技能A ID",
					tableFieldDescription: "佣兵的技能A ID",
					formFieldDescription: "选择技能A",
				},
				skillAType: {
					key: "技能A类型",
					tableFieldDescription: "佣兵的技能A类型",
					formFieldDescription: "选择技能A类型",
					enumMap: partnerSkillType,
				},
				skillBId: {
					key: "技能B ID",
					tableFieldDescription: "佣兵的技能B ID",
					formFieldDescription: "选择技能B",
				},
				skillBType: {
					key: "技能B类型",
					tableFieldDescription: "佣兵的技能B类型",
					formFieldDescription: "选择技能B类型",
					enumMap: partnerSkillType,
				},
			},
			description: "傭兵情報",
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
					formFieldDescription:
						"これはモンスターのデータベースIDです。もし入力を求められた場合、開発者に報告してください。これは異常な状況です。",
				},
				type: {
					key: "モンスタータイプ",
					tableFieldDescription:
						"現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
					formFieldDescription:
						"現在サポートされているタイプはこれだけです。実際には多くのタイプがありますが、このアプリでは必要ないため無視しています。",
					enumMap: mobType,
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
					fields: {
						name: {
							key: "ビヘイビアツリー名",
							tableFieldDescription: "ビヘイビアツリーの名前",
							formFieldDescription: "ビヘイビアツリーの名前",
						},
						definition: {
							key: "ビヘイビアツリー定義",
							tableFieldDescription: "MDSL ビヘイビアツリー定義",
							formFieldDescription: "MDSL ビヘイビアツリー定義",
						},
						agent: {
							key: "Agent関数",
							tableFieldDescription: "ビヘイビアツリーの呼び出し可能関数群",
							formFieldDescription: "ビヘイビアツリーの呼び出し可能関数群",
						},
						memberType: {
							key: "メンバータイプ",
							tableFieldDescription: "この行動が属するメンバータイプ",
							formFieldDescription: "この行動が属するメンバータイプ",
							enumMap: {
								Player: "プレイヤー",
								Partner: "パートナー",
								Mercenary: "傭兵",
								Mob: "モブ",
							},
						},
						attributeSlots: {
							key: "属性スロット",
							tableFieldDescription: "StatContainer に追加する永続属性スロット",
							formFieldDescription: "StatContainer に追加する永続属性スロット",
							item: {
								key: "",
								tableFieldDescription: "",
								formFieldDescription: "",
								fields: {
									path: {
										key: "属性パス",
										tableFieldDescription: "ドット区切りの完全な属性パス",
										formFieldDescription: "ドット区切りの完全な属性パス",
									},
									attribute: {
										key: "属性定義",
										tableFieldDescription: "属性定義",
										formFieldDescription: "属性定義",
										fields: {
											displayName: {
												key: "表示名",
												tableFieldDescription: "属性の表示名",
												formFieldDescription: "属性の表示名",
											},
											expression: {
												key: "初期式",
												tableFieldDescription: "属性の初期式",
												formFieldDescription: "属性の初期式",
											},
											noBaseValue: {
												key: "乗算除外",
												tableFieldDescription: "パーセンテージ補正が乗算に参加しない",
												formFieldDescription: "パーセンテージ補正が乗算に参加しない",
											},
										},
									},
								},
							},
						},
					},
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
					tableFieldDescription:
						"これは初期属性です。戦闘中に属性が変わる場合があります。詳細は行動説明を参照してください。",
					formFieldDescription:
						"ここにモンスターの初期属性を記載してください。属性変更に関する説明は行動セクションで編集してください。",
					enumMap: elementType,
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
					formFieldDescription: `${mobType.Boss}の場合、この値は${mobDifficultyFlag.Easy}難易度でのHPです。他のタイプのモンスターには難易度がないため、この値は推測が必要かもしれません。`,
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
				normalDefExp: {
					key: "通常ダメージ慣性変動率",
					tableFieldDescription: "ダメージを受けるたびに、通常慣性の変動値です。",
					formFieldDescription: "ダメージを受けるたびに、通常慣性の変動値です。",
				},
				physicDefExp: {
					key: "物理ダメージ慣性変動率",
					tableFieldDescription: "ダメージを受けるたびに、物理慣性の変動値です。",
					formFieldDescription: "ダメージを受けるたびに、物理慣性の変動値です。",
				},
				magicDefExp: {
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
			},
			description: "ゲーム内のモブ情報",
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
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
		},
		option: {
			selfName: "オプション装備",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "オプション装備の名前",
					formFieldDescription: "オプション装備の名前を入力してください。",
				},
				baseAbi: {
					key: "基礎防御",
					tableFieldDescription: "オプション装備の基礎防御",
					formFieldDescription: "オプション装備の基礎防御を入力してください。",
				},
				modifiers: {
					key: "付与属性",
					tableFieldDescription: "オプション装備の付与属性",
					formFieldDescription: "オプション装備の付与属性を入力してください。",
				},
				colorA: {
					key: "色A",
					tableFieldDescription: "オプション装備の色A",
					formFieldDescription: "オプション装備の色Aを選択してください。",
				},
				colorB: {
					key: "色B",
					tableFieldDescription: "オプション装備の色B",
					formFieldDescription: "オプション装備の色Bを選択してください。",
				},
				colorC: {
					key: "色C",
					tableFieldDescription: "オプション装備の色C",
					formFieldDescription: "オプション装備の色Cを選択してください。",
				},
				itemId: {
					key: "物品ID",
					tableFieldDescription: "オプション装備の物品ID",
					formFieldDescription: "オプション装備の物品IDを入力してください。",
				},
			},
			description: "オプション装備情報",
		},
		player: {
			selfName: "プレイヤー",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "玩家的名称",
					formFieldDescription: "请输入玩家名称",
				},
				useIn: {
					key: "用于",
					tableFieldDescription: "玩家用于什么场景",
					formFieldDescription: "选择使用场景",
				},
				belongToAccountId: {
					key: "所属账号ID",
					tableFieldDescription: "玩家所属的账号ID",
					formFieldDescription: "选择所属账号",
				},
			},
			description: "プレイヤー情報",
		},
		player_armor: {
			selfName: "プレイヤー防具",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "防具的ID",
					formFieldDescription: "防具的ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "防具的名称",
					formFieldDescription: "防具的名称",
				},
				baseAbi: {
					key: "基础防御",
					tableFieldDescription: "防具的基础防御值",
					formFieldDescription: "防具的基础防御值",
				},
				extraAbi: {
					key: "额外防御",
					tableFieldDescription: "防具的额外防御值",
					formFieldDescription: "防具的额外防御值",
				},
				ability: {
					key: "类型",
					tableFieldDescription: "防具的类型",
					formFieldDescription: "防具的类型",
					enumMap: playerArmorAbilityType,
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "防具的模板ID",
					formFieldDescription: "防具的模板ID",
				},
				refinement: {
					key: "精炼等级",
					tableFieldDescription: "防具的精炼等级",
					formFieldDescription: "防具的精炼等级",
				},
				modifiers: {
					key: "附魔属性",
					tableFieldDescription: "防具的附魔属性",
					formFieldDescription: "防具的附魔属性",
				},
				belongToPlayerId: {
					key: "所属玩家",
					tableFieldDescription: "防具的所属玩家",
					formFieldDescription: "防具的所属玩家",
				},
			},
			description: "プレイヤー防具情報",
		},
		player_option: {
			selfName: "プレイヤー追加装備",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "追加装备的ID",
					formFieldDescription: "追加装备的ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "追加装备的名称",
					formFieldDescription: "追加装备的名称",
				},
				extraAbi: {
					key: "额外防御",
					tableFieldDescription: "追加装备的额外防御值",
					formFieldDescription: "追加装备的额外防御值",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "追加装备的模板ID",
					formFieldDescription: "追加装备的模板ID",
				},
				refinement: {
					key: "精炼等级",
					tableFieldDescription: "追加装备的精炼等级",
					formFieldDescription: "追加装备的精炼等级",
				},
				belongToPlayerId: {
					key: "所属玩家",
					tableFieldDescription: "追加装备的所属玩家",
					formFieldDescription: "追加装备的所属玩家",
				},
				baseAbi: {
					key: "基础防御",
					tableFieldDescription: "追加装备的基础防御值",
					formFieldDescription: "追加装备的基础防御值",
				},
				modifiers: {
					key: "附魔属性",
					tableFieldDescription: "追加装备的附魔属性",
					formFieldDescription: "追加装备的附魔属性",
				},
			},
			description: "プレイヤー追加装備情報",
		},
		player_pet: {
			selfName: "プレイヤーのペット",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "宠物的ID",
					formFieldDescription: "宠物的ID",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "宠物的模板ID",
					formFieldDescription: "宠物的模板ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "宠物的名称",
					formFieldDescription: "宠物的名称",
				},
				pStr: {
					key: "力量潜力",
					tableFieldDescription: "宠物的力量潜力",
					formFieldDescription: "宠物的力量潜力",
				},
				pInt: {
					key: "智力潜力",
					tableFieldDescription: "宠物的智力潜力",
					formFieldDescription: "宠物的智力潜力",
				},
				pVit: {
					key: "耐力潜力",
					tableFieldDescription: "宠物的耐力潜力",
					formFieldDescription: "宠物的耐力潜力",
				},
				pAgi: {
					key: "敏捷潜力",
					tableFieldDescription: "宠物的敏捷潜力",
					formFieldDescription: "宠物的敏捷潜力",
				},
				pDex: {
					key: "灵巧潜力",
					tableFieldDescription: "宠物的灵巧潜力",
					formFieldDescription: "宠物的灵巧潜力",
				},
				str: {
					key: "力量",
					tableFieldDescription: "宠物的力量",
					formFieldDescription: "宠物的力量",
				},
				int: {
					key: "智力",
					tableFieldDescription: "宠物的智力",
					formFieldDescription: "宠物的智力",
				},
				vit: {
					key: "耐力",
					tableFieldDescription: "宠物的耐力",
					formFieldDescription: "宠物的耐力",
				},
				agi: {
					key: "敏捷",
					tableFieldDescription: "宠物的敏捷",
					formFieldDescription: "宠物的敏捷",
				},
				dex: {
					key: "灵巧",
					tableFieldDescription: "宠物的灵巧",
					formFieldDescription: "宠物的灵巧",
				},
				weaponType: {
					key: "武器类型",
					tableFieldDescription: "宠物的武器类型",
					formFieldDescription: "宠物的武器类型",
					enumMap: weaponType,
				},
				personaType: {
					key: "性格",
					tableFieldDescription: "宠物的性格",
					formFieldDescription: "宠物的性格",
					enumMap: playerPetPersonaType,
				},
				type: {
					key: "类型",
					tableFieldDescription: "宠物的类型",
					formFieldDescription: "宠物的类型",
					enumMap: playerPetType,
				},
				weaponAtk: {
					key: "战斗力",
					tableFieldDescription: "宠物的战斗力",
					formFieldDescription: "宠物的战斗力",
				},
				generation: {
					key: "代数",
					tableFieldDescription: "宠物的代数",
					formFieldDescription: "宠物的代数",
				},
				maxLv: {
					key: "最大等级",
					tableFieldDescription: "宠物的最大等级",
					formFieldDescription: "宠物的最大等级",
				},
				belongToPlayerId: {
					key: "所属玩家",
					tableFieldDescription: "宠物的所属玩家",
					formFieldDescription: "宠物的所属玩家",
				},
			},
			description: "プレイヤー情報",
		},
		player_special: {
			selfName: "プレイヤー特殊装備",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "特殊装备的ID",
					formFieldDescription: "特殊装备的ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "特殊装备的名称",
					formFieldDescription: "特殊装备的名称",
				},
				extraAbi: {
					key: "额外攻击力",
					tableFieldDescription: "特殊装备的额外攻击力",
					formFieldDescription: "特殊装备的额外攻击力",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "特殊装备的模板ID",
					formFieldDescription: "特殊装备的模板ID",
				},
				belongToPlayerId: {
					key: "所属玩家",
					tableFieldDescription: "特殊装备的所属玩家",
					formFieldDescription: "特殊装备的所属玩家",
				},
				baseAbi: {
					key: "基础防御力",
					tableFieldDescription: "特殊装备的基础防御力",
					formFieldDescription: "特殊装备的基础防御力",
				},
				modifiers: {
					key: "附魔属性",
					tableFieldDescription: "特殊装备的附魔属性",
					formFieldDescription: "特殊装备的附魔属性",
				},
			},
			description: "プレイヤー特殊装備情報",
		},
		player_weapon: {
			selfName: "プレイヤー武器",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "武器の一意の識別子",
					formFieldDescription: "武器の一意の識別子",
				},
				name: {
					key: "名称",
					tableFieldDescription: "武器的名称",
					formFieldDescription: "武器的名称",
				},
				baseAbi: {
					key: "基础属性",
					tableFieldDescription: "武器的基础属性",
					formFieldDescription: "武器的基础属性",
				},
				stability: {
					key: "稳定率",
					tableFieldDescription: "武器的稳定率",
					formFieldDescription: "武器的稳定率",
				},
				extraAbi: {
					key: "额外攻击力",
					tableFieldDescription: "武器的额外攻击力",
					formFieldDescription: "武器的额外攻击力",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "武器的模板ID",
					formFieldDescription: "武器的模板ID",
				},
				refinement: {
					key: "精炼等级",
					tableFieldDescription: "武器的精炼等级",
					formFieldDescription: "武器的精炼等级",
				},
				modifiers: {
					key: "附魔属性",
					tableFieldDescription: "武器的附魔属性",
					formFieldDescription: "武器的附魔属性",
				},
				belongToPlayerId: {
					key: "所属玩家",
					tableFieldDescription: "武器的所属玩家",
					formFieldDescription: "武器的所属玩家",
				},
				type: {
					key: "タイプ",
					tableFieldDescription: "武器のタイプ",
					formFieldDescription: "武器のタイプ",
					enumMap: weaponType,
				},
				elementType: {
					key: "元素タイプ",
					tableFieldDescription: "武器の元素タイプ",
					formFieldDescription: "武器の元素タイプ",
					enumMap: elementType,
				},
			},
			description: "プレイヤーカスタム武器情報",
		},
		post: {
			selfName: "ポスト",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "帖子的唯一标识符",
					formFieldDescription: "帖子的唯一标识符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "帖子的名称",
					formFieldDescription: "请输入帖子名称",
				},
				createdAt: {
					key: "创建时间",
					tableFieldDescription: "帖子的创建时间",
					formFieldDescription: "请输入帖子的创建时间",
				},
				updatedAt: {
					key: "更新时间",
					tableFieldDescription: "帖子的更新时间",
					formFieldDescription: "请输入帖子的更新时间",
				},
				createdById: {
					key: "创建者ID",
					tableFieldDescription: "帖子的创建者ID",
					formFieldDescription: "选择创建者",
				},
			},
			description: "投稿情報",
		},
		recipe: {
			selfName: "レシピ",
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
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "ゲーム内のレシピ情報",
		},
		recipe_ingredient: {
			selfName: "レシピ材料",
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
					enumMap: recipeIngredientType,
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
			description: "レシピ材料情報",
		},
		session: {
			selfName: "セッション",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "会话的唯一标识符",
					formFieldDescription: "会话的唯一标识符",
				},
				sessionToken: {
					key: "会话令牌",
					tableFieldDescription: "会话的令牌",
					formFieldDescription: "请输入会话令牌",
				},
				expires: {
					key: "过期时间",
					tableFieldDescription: "会话的过期时间",
					formFieldDescription: "请输入会话过期时间",
				},
				userId: {
					key: "用户ID",
					tableFieldDescription: "会话关联的用户ID",
					formFieldDescription: "选择关联的用户",
				},
			},
			description: "セッション情報",
		},
		simulator: {
			selfName: "シミュレーター",
			fields: {
				id: {
					key: "模拟器ID",
					tableFieldDescription: "模拟器的唯一标识符",
					formFieldDescription: "模拟器的唯一标识符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "模拟器的名称",
					formFieldDescription: "请输入模拟器的名称",
				},
				details: {
					key: "详情",
					tableFieldDescription: "模拟器的详情",
					formFieldDescription: "请输入模拟器的详情",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此模拟器的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此模拟器的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "シミュレーター情報",
		},
		skill: {
			selfName: "スキル",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "これはスキルのデータベースIDです。通常、これは表示されません。",
					formFieldDescription:
						"これはスキルのデータベースIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
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
					enumMap: skillTreeType,
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
					formFieldDescription:
						"これは統計データベースのIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
				},
				preSkillId: {
					key: "前置技能ID",
					tableFieldDescription: "前置技能",
					formFieldDescription: "前置技能",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "これは更新者のデータベースIDです。通常、これは表示されません。",
					formFieldDescription:
						"これは更新者のデータベースIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
				},
				createdByAccountId: {
					key: "作成者",
					tableFieldDescription: "これは作成者のデータベースIDです。通常、これは表示されません。",
					formFieldDescription:
						"これは作成者のデータベースIDです。これを入力するように求められた場合は、開発者に報告してください。これは正常ではありません。",
				},
			},
			description: "ゲーム内のスキル情報",
		},
		skill_variant: {
			selfName: "スキル効果",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "技能效果的唯一标识符",
					formFieldDescription: "技能效果的唯一标识符",
				},
				targetMainWeaponType: {
					key: "目标主武器类型",
					tableFieldDescription: "此技能变体需要什么武器才能生效",
					formFieldDescription: "此技能变体需要什么武器才能生效",
					enumMap: mainHandTypeLimit,
				},
				targetSubWeaponType: {
					key: "目标副武器类型",
					tableFieldDescription: "此技能变体需要什么副武器才能生效",
					formFieldDescription: "此技能变体需要什么副武器才能生效",
					enumMap: subHandTypeLimit,
				},
				targetArmorAbilityType: {
					key: "目标身体装备能力类型",
					tableFieldDescription: "此技能变体需要什么身体装备能力才能生效",
					formFieldDescription: "此技能变体需要什么身体装备能力才能生效",
					enumMap: playerArmorAbilityTypeLimit,
				},
				activeBehavior: {
					key: "アクティブ行動 DSL",
					tableFieldDescription: "能動発動時に使う既定の構造化行動",
					formFieldDescription: "activeBehaviorTree がない場合に実行する DSL",
				},
				passiveBehavior: {
					key: "パッシブ行動 DSL",
					tableFieldDescription: "メンバー作成時にインストールする既定のパッシブ行動一覧",
					formFieldDescription: "メンバー作成時にインストールする既定のパッシブ行動一覧",
				},
				registeredBehavior: {
					key: "登録行動 DSL",
					tableFieldDescription: "今回のスキル発動を超えて残る長期登録行動一覧",
					formFieldDescription: "今回のスキル発動を超えて残る長期登録行動一覧",
				},
				hpCost: {
					key: "HP消耗",
					tableFieldDescription: "HP消耗",
					formFieldDescription: "HP消耗",
				},
				mpCost: {
					key: "MP消耗",
					tableFieldDescription: "MP消耗",
					formFieldDescription: "MP消耗",
				},
				description: {
					key: "效果描述",
					tableFieldDescription: "效果描述",
					formFieldDescription: "效果描述",
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
				comboCompatible: {
					key: "コンボ対応",
					tableFieldDescription: "コンボに配置できるかどうか",
					formFieldDescription: "コンボに配置できるかどうか",
				},
				range: {
					key: "攻撃範囲",
					tableFieldDescription: "攻撃範囲",
					formFieldDescription: "攻撃範囲",
				},
				castTimeType: {
					key: "読込タイプ",
					tableFieldDescription: `スキル行動開始前の読込段階：${skillCastTimeType.Instant}、${skillCastTimeType.Chanting}、${skillCastTimeType.Charging}。`,
					formFieldDescription: `スキル行動開始前の読込段階：${skillCastTimeType.Instant}、${skillCastTimeType.Chanting}、${skillCastTimeType.Charging}。`,
					enumMap: skillCastTimeType,
				},
				distanceType: {
					key: "距離威力タイプ",
					tableFieldDescription: "このスキル変体が影響を受ける距離威力の種類を示す",
					formFieldDescription: "このスキル変体が影響を受ける距離威力の種類を示す",
					enumMap: distanceType,
				},
				targetType: {
					key: "対象タイプ",
					tableFieldDescription: "このスキル変体の対象タイプ",
					formFieldDescription: "このスキル変体の対象タイプ",
					enumMap: skillTargetType,
				},
				chantingFixedMs: {
					key: "固定詠唱時間(ms)",
					tableFieldDescription: "固定詠唱時間(ミリ秒)",
					formFieldDescription: "固定詠唱時間(ミリ秒)",
				},
				chantingModifiedMs: {
					key: "可変詠唱時間(ms)",
					tableFieldDescription: "加速可能な詠唱時間(ミリ秒)",
					formFieldDescription: "加速可能な詠唱時間(ミリ秒)",
				},
				chargingFixedMs: {
					key: "固定チャージ時間(ms)",
					tableFieldDescription: "固定チャージ時間(ミリ秒)",
					formFieldDescription: "固定チャージ時間(ミリ秒)",
				},
				chargingModifiedMs: {
					key: "可変チャージ時間(ms)",
					tableFieldDescription: "加速可能なチャージ時間(ミリ秒)",
					formFieldDescription: "加速可能なチャージ時間(ミリ秒)",
				},
				actionFixedMs: {
					key: "固定動作時間(ms)",
					tableFieldDescription: "固定動作時間(ミリ秒)",
					formFieldDescription: "固定動作時間(ミリ秒)",
				},
				actionModifiedMs: {
					key: "可変動作時間(ms)",
					tableFieldDescription: "加速可能な動作時間(ミリ秒)",
					formFieldDescription: "加速可能な動作時間(ミリ秒)",
				},
				startupRatio: {
					key: "動作前比率",
					tableFieldDescription: "スキル動作前の準備動作の割合",
					formFieldDescription: "スキル動作前の準備動作の割合",
				},
			},
			description: "スキルバリアント情報",
		},
		behavior_tree: {
			selfName: "ビヘイビアツリー",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ビヘイビアツリーの一意識別子",
					formFieldDescription: "ビヘイビアツリーの一意識別子",
				},
				name: {
					key: "名前",
					tableFieldDescription: "ビヘイビアツリー名",
					formFieldDescription: "ビヘイビアツリー名",
				},
				definition: {
					key: "定義",
					tableFieldDescription: "MDSL ビヘイビアツリー定義",
					formFieldDescription: "MDSL ビヘイビアツリー定義",
				},
				agent: {
					key: "Agent",
					tableFieldDescription: "ビヘイビアツリーの呼び出し可能関数群",
					formFieldDescription: "ビヘイビアツリーの呼び出し可能関数群",
				},
				attributeSlots: {
					key: "属性スロット",
					tableFieldDescription: "StatContainer に追加する永続属性スロット",
					formFieldDescription: "StatContainer に追加する永続属性スロット JSON",
					item: {
						key: "",
						tableFieldDescription: "",
						formFieldDescription: "",
						fields: {
							path: {
								key: "属性パス",
								tableFieldDescription: "ドット区切りの完全な属性パス",
								formFieldDescription: "ドット区切りの完全な属性パス",
							},
							attribute: {
								key: "属性定義",
								tableFieldDescription: "属性定義",
								formFieldDescription: "属性定義",
								fields: {
									displayName: {
										key: "表示名",
										tableFieldDescription: "属性の表示名",
										formFieldDescription: "属性の表示名",
									},
									expression: {
										key: "初期式",
										tableFieldDescription: "属性の初期式",
										formFieldDescription: "属性の初期式",
									},
									noBaseValue: {
										key: "乗算除外",
										tableFieldDescription: "パーセンテージ補正が乗算に参加しない",
										formFieldDescription: "パーセンテージ補正が乗算に参加しない",
									},
								},
							},
						},
					},
				},
				activeOwnerId: {
					key: "能動所有スキル変体",
					tableFieldDescription: "この能動ビヘイビアツリーを所有するスキル変体",
					formFieldDescription: "この能動ビヘイビアツリーを所有するスキル変体",
				},
				passiveOwnerId: {
					key: "受動所有スキル変体",
					tableFieldDescription: "この受動ビヘイビアツリーを所有するスキル変体",
					formFieldDescription: "この受動ビヘイビアツリーを所有するスキル変体",
				},
				registeredOwnerId: {
					key: "登録所有スキル変体",
					tableFieldDescription: "この長期登録ビヘイビアツリーを所有するスキル変体",
					formFieldDescription: "この長期登録ビヘイビアツリーを所有するスキル変体",
				},
			},
			description: "スキル変体が所有するカスタムビヘイビアツリー資源",
		},
		special: {
			selfName: "特殊装備",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "特殊装備の名前",
					formFieldDescription: "特殊装備の名前を入力してください。",
				},
				baseAbi: {
					key: "基礎防御",
					tableFieldDescription: "特殊装備の基礎防御",
					formFieldDescription: "特殊装備の基礎防御を入力してください。",
				},
				modifiers: {
					key: "付与属性",
					tableFieldDescription: "特殊装備の付与属性",
					formFieldDescription: "特殊装備の付与属性を入力してください。",
				},
				itemId: {
					key: "物品ID",
					tableFieldDescription: "特殊装備の物品ID",
					formFieldDescription: "特殊装備の物品IDを入力してください。",
				},
			},
			description: "特殊装備情報",
		},
		statistic: {
			selfName: "統計",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "统计信息的唯一标识符",
					formFieldDescription: "统计信息的唯一标识符",
				},
				updatedAt: {
					key: "更新时间",
					tableFieldDescription: "统计信息的更新时间",
					formFieldDescription: "请输入更新时间",
				},
				createdAt: {
					key: "创建时间",
					tableFieldDescription: "统计信息的创建时间",
					formFieldDescription: "请输入创建时间",
				},
				usageTimestamps: {
					key: "使用时间戳",
					tableFieldDescription: "使用时间戳列表",
					formFieldDescription: "请输入使用时间戳",
				},
				viewTimestamps: {
					key: "查看时间戳",
					tableFieldDescription: "查看时间戳列表",
					formFieldDescription: "请输入查看时间戳",
				},
			},
			description: "統計情報",
		},
		task: {
			selfName: "タスク",
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
					enumMap: taskType,
				},
				description: {
					key: "描述",
					tableFieldDescription: "任务描述",
					formFieldDescription: "任务描述",
				},
				belongToNpcId: {
					key: "所属NPC",
					tableFieldDescription: "任务所属的NPC",
					formFieldDescription: "任务所属的NPC",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "ゲーム内のタスク情報",
		},
		task_collect_require: {
			selfName: "タスク収集要件",
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
				belongToTaskId: {
					key: "所属任务",
					tableFieldDescription: "所属任务",
					formFieldDescription: "所属任务",
				},
			},
			description: "タスク収集要件",
		},
		task_kill_requirement: {
			selfName: "タスク撃破要件",
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
				belongToTaskId: {
					key: "所属任务",
					tableFieldDescription: "所属任务",
					formFieldDescription: "所属任务",
				},
			},
			description: "タスク討伐要件",
		},
		task_reward: {
			selfName: "タスク報酬",
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
					enumMap: taskRewardType,
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
				belongToTaskId: {
					key: "所属任务",
					tableFieldDescription: "所属任务",
					formFieldDescription: "所属任务",
				},
			},
			description: "タスク報酬情報",
		},
		team: {
			selfName: "チーム",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "队伍的唯一标识符",
					formFieldDescription: "队伍的唯一标识符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "队伍的名称",
					formFieldDescription: "请输入队伍名称",
				},
				gems: {
					key: "宝石",
					tableFieldDescription: "队伍的宝石配置",
					formFieldDescription: "请输入队伍的宝石配置",
				},
			},
			description: "チーム情報",
		},
		user: {
			selfName: "ユーザー",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "用户的唯一标识符",
					formFieldDescription: "用户的唯一标识符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "用户的名称",
					formFieldDescription: "请输入用户名称",
				},
				email: {
					key: "邮箱",
					tableFieldDescription: "用户的邮箱",
					formFieldDescription: "请输入用户邮箱",
				},
				emailVerified: {
					key: "邮箱已验证",
					tableFieldDescription: "邮箱是否已验证",
					formFieldDescription: "邮箱是否已验证",
				},
				password: {
					key: "密码",
					tableFieldDescription: "用户的密码",
					formFieldDescription: "请输入用户密码",
				},
				image: {
					key: "头像",
					tableFieldDescription: "用户的头像URL",
					formFieldDescription: "请输入用户的头像URL",
				},
			},
			description: "ユーザー情報",
		},
		verification_token: {
			selfName: "検証トークン",
			fields: {
				identifier: {
					key: "标识符",
					tableFieldDescription: "验证令牌的标识符",
					formFieldDescription: "请输入验证令牌的标识符",
				},
				token: {
					key: "令牌",
					tableFieldDescription: "验证令牌的值",
					formFieldDescription: "请输入验证令牌的值",
				},
				expires: {
					key: "过期时间",
					tableFieldDescription: "验证令牌的过期时间",
					formFieldDescription: "请输入验证令牌的过期时间",
				},
			},
			description: "認証トークン情報",
		},
		weapon: {
			selfName: "武器",
			fields: {
				name: {
					key: "名前",
					tableFieldDescription: "武器の名前",
					formFieldDescription: "武器の名前を入力してください。",
				},
				type: {
					key: "タイプ",
					tableFieldDescription: "武器のタイプ",
					formFieldDescription: "武器のタイプを選択してください。",
					enumMap: weaponType,
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
					enumMap: elementType,
				},
				itemId: {
					key: "所属物品",
					tableFieldDescription: "武器所属的物品",
					formFieldDescription: "武器所属的物品",
				},
			},
			description: "ゲーム内の武器情報",
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
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "ゲーム内の世界情報",
		},
		zone: {
			selfName: "ゾーン",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ゾーンの一意の識別子",
					formFieldDescription: "ゾーンの一意の識別子、システムによって自動生成されます",
				},
				name: {
					key: "名前",
					tableFieldDescription: "ゾーンの名前",
					formFieldDescription: "ゾーンの名前を入力してください",
				},
				rewardNodes: {
					key: "報酬ノード数",
					tableFieldDescription: "ゾーン内の報酬ノードの数",
					formFieldDescription: "ゾーン内の報酬ノードの数を入力してください",
				},
				activityId: {
					key: "アクティビティID",
					tableFieldDescription: "このゾーンが属するアクティビティのID",
					formFieldDescription: "このゾーンが属するアクティビティを選択してください",
				},
				addressId: {
					key: "マップID",
					tableFieldDescription: "このゾーンが属するマップのID",
					formFieldDescription: "このゾーンが属するマップを選択してください",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "创建者",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "ゲーム内のゾーン情報、名前、リンクゾーン、報酬ノードなどを含みます",
		},
		character_registlet: {
			selfName: "キャラレジストレット",
			description: "キャラが装備しているレジストレット情報",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				level: {
					key: "等级",
					tableFieldDescription: "角色佩戴的雷吉斯托环的等级",
					formFieldDescription: "请输入等级",
				},
				templateId: {
					key: "所属雷吉斯托环",
					tableFieldDescription: "角色佩戴的雷吉斯托环的ID",
					formFieldDescription: "选择角色佩戴的雷吉斯托环",
				},
				belongToCharacterId: {
					key: "所属角色",
					tableFieldDescription: "角色佩戴的雷吉斯托环所属的角色ID",
					formFieldDescription: "选择角色",
				},
			},
		},
		registlet: {
			selfName: "レジストレット",
			description: "ゲーム内のレジストレット情報",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "雷吉斯托环的唯一标识符",
					formFieldDescription: "雷吉斯托环的唯一标识符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "雷吉斯托环的名称",
					formFieldDescription: "请输入雷吉斯托环的名称",
				},
				maxLevel: {
					key: "最大等级",
					tableFieldDescription: "雷吉斯托环的最大等级",
					formFieldDescription: "请输入最大等级",
				},
				attrModifiers: {
					key: "属性修正",
					tableFieldDescription: "レジストレットの属性修正",
					formFieldDescription: "属性修正を入力してください",
				},
				pipelinePatches: {
					key: "パイプラインパッチ",
					tableFieldDescription: "パイプライン修正効果",
					formFieldDescription: "パイプライン修正効果を設定",
					item: {
						key: "",
						tableFieldDescription: "",
						formFieldDescription: "",
						fields: {
							pipelineName: {
								key: "対象パイプライン",
								tableFieldDescription: "対象パイプライン名",
								formFieldDescription: "対象パイプライン名",
							},
							slot: {
								key: "対象スロット",
								tableFieldDescription: "対象スロット",
								formFieldDescription: "対象スロット",
							},
							position: {
								key: "挿入位置",
								tableFieldDescription: "対象ステップの前後に挿入",
								formFieldDescription: "対象ステップの前後に挿入",
								enumMap: {
									before: "前",
									after: "後",
								},
							},
							priority: {
								key: "優先度",
								tableFieldDescription: "実行優先度",
								formFieldDescription: "実行優先度",
							},
							steps: {
								key: "ステップ一覧",
								tableFieldDescription: "一連のローカルステップ",
								formFieldDescription: "一連のローカルステップ",
								item: {
									key: "",
									tableFieldDescription: "",
									formFieldDescription: "",
									fields: {
										type: {
											key: "ステップタイプ",
											tableFieldDescription: "ステップタイプ",
											formFieldDescription: "ステップタイプ",
											enumMap: {
												setValue: "値設定",
												runPipeline: "パイプライン実行",
												scheduleMemberEvent: "メンバーイベント予約",
												interrupt: "中断",
												insertInstructions: "命令挿入",
											},
										},
									},
									variants: {
										setValue: {
											key: "値設定",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ステップタイプ", tableFieldDescription: "", formFieldDescription: "" },
												target: { key: "対象フィールド", tableFieldDescription: "", formFieldDescription: "" },
												value: { key: "値", tableFieldDescription: "", formFieldDescription: "" },
											},
										},
										runPipeline: {
											key: "パイプライン実行",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ステップタイプ", tableFieldDescription: "", formFieldDescription: "" },
												pipelineName: { key: "パイプライン名", tableFieldDescription: "", formFieldDescription: "" },
												params: { key: "パラメータ", tableFieldDescription: "", formFieldDescription: "", fields: {} },
											},
										},
										scheduleMemberEvent: {
											key: "メンバーイベント予約",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ステップタイプ", tableFieldDescription: "", formFieldDescription: "" },
												eventName: { key: "イベント名", tableFieldDescription: "", formFieldDescription: "" },
												delay: { key: "遅延", tableFieldDescription: "", formFieldDescription: "" },
												payload: { key: "ペイロード", tableFieldDescription: "", formFieldDescription: "", fields: {} },
											},
										},
										interrupt: {
											key: "中断",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ステップタイプ", tableFieldDescription: "", formFieldDescription: "" },
												reason: { key: "理由", tableFieldDescription: "", formFieldDescription: "" },
											},
										},
										insertInstructions: {
											key: "命令挿入",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ステップタイプ", tableFieldDescription: "", formFieldDescription: "" },
												instructions: {
													key: "命令一覧",
													tableFieldDescription: "",
													formFieldDescription: "",
													item: {
														key: "",
														tableFieldDescription: "",
														formFieldDescription: "",
														fields: {
															target: { key: "対象", tableFieldDescription: "", formFieldDescription: "" },
															op: { key: "演算子", tableFieldDescription: "", formFieldDescription: "" },
															a: { key: "パラメータA", tableFieldDescription: "", formFieldDescription: "" },
															b: { key: "パラメータB", tableFieldDescription: "", formFieldDescription: "" },
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				skillBranchActivators: {
					key: "スキル分岐アクティベーター",
					tableFieldDescription: "スキル分岐有効化効果",
					formFieldDescription: "スキル分岐有効化効果を設定",
					item: {
						key: "",
						tableFieldDescription: "",
						formFieldDescription: "",
						fields: {
							skillId: {
								key: "対象スキルID",
								tableFieldDescription: "対象スキルID",
								formFieldDescription: "対象スキルID",
							},
							branchKey: {
								key: "分岐キー",
								tableFieldDescription: "分岐キー",
								formFieldDescription: "分岐キー",
							},
							value: {
								key: "分岐選択値",
								tableFieldDescription: "分岐選択値",
								formFieldDescription: "分岐選択値",
							},
						},
					},
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最終更新者",
					formFieldDescription: "更新者アカウントを選択",
				},
				createdByAccountId: {
					key: "作成者",
					tableFieldDescription: "作成者",
					formFieldDescription: "作成者アカウントを選択",
				},
				subscriptions: {
					key: "イベント購読",
					tableFieldDescription: "イベント購読効果",
					formFieldDescription: "イベント購読効果を設定",
					item: {
						key: "",
						tableFieldDescription: "",
						formFieldDescription: "",
						fields: {
							eventNames: {
								key: "購読イベント名一覧",
								tableFieldDescription: "購読するイベント名の一覧",
								formFieldDescription: "購読するイベント名の一覧",
							},
							requiredDamageTags: {
								key: "必要ダメージタグ",
								tableFieldDescription: "必要ダメージタグ",
								formFieldDescription: "必要ダメージタグ",
							},
							requiredStatusTypes: {
								key: "必要状態異常タイプ",
								tableFieldDescription: "必要状態異常タイプ",
								formFieldDescription: "必要状態異常タイプ",
							},
							handlers: {
								key: "トリガーハンドラ",
								tableFieldDescription: "トリガー時に実行するアクション一覧",
								formFieldDescription: "トリガー時に実行するアクション一覧",
								item: {
									key: "",
									tableFieldDescription: "",
									formFieldDescription: "",
									fields: {
										type: {
											key: "ハンドラタイプ",
											tableFieldDescription: "ハンドラタイプ",
											formFieldDescription: "ハンドラタイプ",
											enumMap: {
												addModifier: "修正追加",
												removeModifierBySource: "ソース別修正削除",
												emit: "イベント発射",
											},
										},
									},
									variants: {
										addModifier: {
											key: "修正追加",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ハンドラタイプ", tableFieldDescription: "", formFieldDescription: "" },
												attribute: { key: "属性", tableFieldDescription: "", formFieldDescription: "" },
												modifierType: {
													key: "修正タイプ",
													tableFieldDescription: "",
													formFieldDescription: "",
													enumMap: {
														dynamicFixed: "動的固定",
														dynamicPercentage: "動的パーセント",
														staticFixed: "静的固定",
														staticPercentage: "静的パーセント",
													},
												},
												value: { key: "値", tableFieldDescription: "", formFieldDescription: "" },
												lifetime: {
													key: "ライフタイム",
													tableFieldDescription: "",
													formFieldDescription: "",
													enumMap: { once: "一度", bySource: "ソース別" },
												},
												sourceIdSuffix: { key: "ソースID接尾辞", tableFieldDescription: "", formFieldDescription: "" },
											},
										},
										removeModifierBySource: {
											key: "ソース別修正削除",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ハンドラタイプ", tableFieldDescription: "", formFieldDescription: "" },
												attribute: { key: "属性", tableFieldDescription: "", formFieldDescription: "" },
												sourceIdSuffix: { key: "ソースID接尾辞", tableFieldDescription: "", formFieldDescription: "" },
											},
										},
										emit: {
											key: "イベント発射",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ハンドラタイプ", tableFieldDescription: "", formFieldDescription: "" },
												eventName: { key: "イベント名", tableFieldDescription: "", formFieldDescription: "" },
												payload: { key: "ペイロード", tableFieldDescription: "", formFieldDescription: "", fields: {} },
											},
										},
									},
								},
							},
						},
					},
				},
				thresholdWatchers: {
					key: "閾値監視",
					tableFieldDescription: "閾値監視効果",
					formFieldDescription: "閾値監視効果を設定",
					item: {
						key: "",
						tableFieldDescription: "",
						formFieldDescription: "",
						fields: {
							path: {
								key: "属性パス",
								tableFieldDescription: "監視する属性パス",
								formFieldDescription: "監視する属性パス",
							},
							threshold: {
								key: "閾値",
								tableFieldDescription: "閾値",
								formFieldDescription: "閾値",
							},
							direction: {
								key: "方向",
								tableFieldDescription: "トリガー方向",
								formFieldDescription: "トリガー方向",
								enumMap: {
									rising: "上昇",
									falling: "下降",
									both: "両方",
								},
							},
							cooldownMs: {
								key: "クールダウン(ms)",
								tableFieldDescription: "クールダウン（ミリ秒）",
								formFieldDescription: "クールダウン（ミリ秒）",
							},
							fireOnRegister: {
								key: "登録時発火",
								tableFieldDescription: "登録時に即座に発火するか",
								formFieldDescription: "登録時に即座に発火するか",
							},
							handlers: {
								key: "トリガーハンドラ",
								tableFieldDescription: "トリガー時に実行するアクション一覧",
								formFieldDescription: "トリガー時に実行するアクション一覧",
								item: {
									key: "",
									tableFieldDescription: "",
									formFieldDescription: "",
									fields: {
										type: {
											key: "ハンドラタイプ",
											tableFieldDescription: "ハンドラタイプ",
											formFieldDescription: "ハンドラタイプ",
											enumMap: {
												addModifier: "修正追加",
												removeModifierBySource: "ソース別修正削除",
												emit: "イベント発射",
											},
										},
									},
									variants: {
										addModifier: {
											key: "修正追加",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ハンドラタイプ", tableFieldDescription: "", formFieldDescription: "" },
												attribute: { key: "属性", tableFieldDescription: "", formFieldDescription: "" },
												modifierType: {
													key: "修正タイプ",
													tableFieldDescription: "",
													formFieldDescription: "",
													enumMap: {
														dynamicFixed: "動的固定",
														dynamicPercentage: "動的パーセント",
														staticFixed: "静的固定",
														staticPercentage: "静的パーセント",
													},
												},
												value: { key: "値", tableFieldDescription: "", formFieldDescription: "" },
												lifetime: {
													key: "ライフタイム",
													tableFieldDescription: "",
													formFieldDescription: "",
													enumMap: { once: "一度", bySource: "ソース別" },
												},
												sourceIdSuffix: { key: "ソースID接尾辞", tableFieldDescription: "", formFieldDescription: "" },
											},
										},
										removeModifierBySource: {
											key: "ソース別修正削除",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ハンドラタイプ", tableFieldDescription: "", formFieldDescription: "" },
												attribute: { key: "属性", tableFieldDescription: "", formFieldDescription: "" },
												sourceIdSuffix: { key: "ソースID接尾辞", tableFieldDescription: "", formFieldDescription: "" },
											},
										},
										emit: {
											key: "イベント発射",
											tableFieldDescription: "",
											formFieldDescription: "",
											fields: {
												type: { key: "ハンドラタイプ", tableFieldDescription: "", formFieldDescription: "" },
												eventName: { key: "イベント名", tableFieldDescription: "", formFieldDescription: "" },
												payload: { key: "ペイロード", tableFieldDescription: "", formFieldDescription: "", fields: {} },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
};

export default dictionary;
