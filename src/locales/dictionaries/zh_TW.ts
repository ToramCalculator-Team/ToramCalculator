import type * as Enums from "@db/schema/enums";
import type { Dictionary } from "../type";

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

const mainHandType: Record<Enums.MainHandType, string> = {
	...mainWeaponType,
	None: "無",
};

const mainHandTypeLimit: Record<Enums.MainHandTypeLimit, string> = {
	...mainHandType,
	Any: "不限",
};

const subWeaponType: Record<Enums.SubWeaponType, string> = {
	Arrow: "箭矢",
	ShortSword: "小刀",
	NinjutsuScroll: "忍術卷軸",
	Shield: "盾牌",
};

const subHandType: Record<Enums.SubHandType, string> = {
	...subWeaponType,
	OneHandSword: mainHandType.OneHandSword,
	Magictool: mainHandType.Magictool,
	Knuckle: mainHandType.Knuckle,
	Katana: mainHandType.Katana,
	None: "無",
};

const subHandTypeLimit: Record<Enums.SubHandTypeLimit, string> = {
	...subHandType,
	Any: "不限",
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
	NecromancerSkill: "死靈法術",
	GolemSkill: "魔像技能",
	//
	LuckSkill: "",
	MerchantSkill: "商人技能",
	PetSkill: "寵物技能",
};

const skillChargingType: Record<Enums.SkillChargingType, string> = {
	Chanting: "詠唱",
	Reservoir: "蓄力",
	None: "無讀條",
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

const playerArmorAbilityTypeLimit: Record<Enums.PlayerArmorAbilityTypeLimit, string> = {
	...playerArmorAbilityType,
	Any: "不限",
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
	MagicDefense: "魔法防禦",
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

const dictionary: Dictionary = {
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
			enterFullscreen: "進入全螢幕",
			exitFullscreen: "退出全螢幕",
		},
		relationPrefix: {
			belongsTo: "所屬",
			usedBy: "被用於",
			updatedBy: "更新資料",
			createdBy: "建立資料",
			contains: "包含的",
			related: "相關的",
			none: "",
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
				themeVersion: {
					title: "顏色版本",
					description: "選擇目前顏色系統使用的風格版本。",
					v1: "v1",
					v2: "v2",
					v3: "v3",
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
			//     baseAbi: "身體裝備基礎防禦力",
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
			//   skillVariantType: "讀取條類型",
			//   actionFixedMs: "固定動作時長（ms）",
			//   actionModifiedMs: "可加速動作時長（ms）",
			//   skillActionMs: "動作時長總值（ms）",
			//   chantingFixedMs: "固定詠唱時長（ms）",
			//   chantingModifiedMs: "可加速詠唱時長（ms）",
			//   skillChantingMs: "詠唱時長總值（ms）",
			//   chargingFixedMs: "固定蓄力時長（ms）",
			//   chargingModifiedMs: "可加速蓄力時長（ms）",
			//   skillChargingMs: "蓄力時長總值（ms）",
			//   skillDuration: "技能總耗時",
			//   skillStartupMs: "技能前搖（ms）",
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
			tabs: {
				combo: "連擊",
				behavior: "行動",
				equipment: {
					selfName: "裝備",
					mainHand: "主手",
					subHand: "副手",
					armor: "身體裝備",
					option: "追加裝備",
					special: "特殊裝備",
				},
				consumable: "消耗品",
				cooking: "料理",
				registlet: "雷吉斯托環",
				skill: {
					selfName: "技能",
					treeSkill: "技能樹",
					starGem: "星石",
					trees: {
						WeaponSkillGroup: {
							selfName: "武器技能",
							tree: {
								BladeSkill: "劍術技能",
								ShootSkill: "射擊技能",
								MagicSkill: "魔法技能",
								MarshallSkill: "格鬥技能",
								DualSwordSkill: "雙劍技能",
								HalberdSkill: "斧槍技能",
								MononofuSkill: "武士技能",
								CrusherSkill: "粉碎者技能",
								FeatheringSkill: "靈魂技能",
							},
						},
						BuffSkillGroup: {
							selfName: "強化技能",
							tree: {
								GuardSkill: "防衛技能",
								ShieldSkill: "護盾技能",
								KnifeSkill: "小刀技能",
								KnightSkill: "騎士技能",
								HunterSkill: "狩獵技能",
								PriestSkill: "祭司技能",
								AssassinSkill: "暗殺技能",
								WizardSkill: "巫師技能",
							},
						},
						AssistSkillGroup: {
							selfName: "輔助技能",
							tree: {
								SupportSkill: "輔助技能",
								BattleSkill: "好戰分子",
								SurvivalSkill: "生存本能",
							},
						},
						ProduceSkillGroup: {
							selfName: "製造相關",
							tree: {
								SmithSkill: "鍛冶大師",
								AlchemySkill: "煉金術士",
								TamerSkill: "馴獸天分",
							},
						},
						SkillBookGroup: {
							selfName: "技能書",
							tree: {
								DarkPowerSkill: "暗黑之力",
								MagicBladeSkill: "魔劍技能",
								DancerSkill: "舞者技能",
								MinstrelSkill: "詩人技能",
								BareHandSkill: "空手技能",
								NinjaSkill: "忍者技能",
								PartisanSkill: "游擊隊技能",
								NecromancerSkill: "死靈法術",
								GolemSkill: "魔像技能",
							},
						},
						OtherSkillGroup: {
							selfName: "其他技能",
							tree: {
								LuckSkill: "幸運技能",
								MerchantSkill: "商人技能",
								PetSkill: "寵物技能",
							},
						},
					},
				},
				ability: "能力值",
				base: {
					selfName: "基本配置",
					name: "名稱",
				},
			},
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
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "选项ID",
					tableFieldDescription: "關聯的選項ID",
					formFieldDescription: "選擇要關聯的選項",
				},
			},
			description: "记录水晶和选项之间的关联关系",
		},
		_crystalToplayer_armor: {
			selfName: "水晶-玩家防具關聯",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "玩家防具ID",
					tableFieldDescription: "關聯的玩家防具ID",
					formFieldDescription: "選擇要關聯的玩家防具",
				},
			},
			description: "記錄水晶和玩家防具之間的關聯關係",
		},
		_crystalToplayer_option: {
			selfName: "水晶-玩家追加關聯",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "玩家追加ID",
					tableFieldDescription: "關聯的玩家追加裝備ID",
					formFieldDescription: "選擇要關聯的玩家追加裝備",
				},
			},
			description: "記錄水晶和玩家追加裝備之間的關聯關係",
		},
		_crystalToplayer_special: {
			selfName: "水晶-玩家特殊關聯",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "玩家特殊ID",
					tableFieldDescription: "關聯的玩家特殊裝備ID",
					formFieldDescription: "選擇要關聯的玩家特殊裝備",
				},
			},
			description: "記錄水晶和玩家特殊裝備之間的關聯關係",
		},
		_crystalToplayer_weapon: {
			selfName: "水晶-玩家武器關聯",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "玩家武器ID",
					tableFieldDescription: "關聯的玩家武器ID",
					formFieldDescription: "選擇要關聯的玩家武器",
				},
			},
			description: "記錄水晶和玩家武器之間的關聯關係",
		},
		_crystalTospecial: {
			selfName: "水晶-特殊裝備關聯",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "特殊裝備ID",
					tableFieldDescription: "關聯的特殊裝備ID",
					formFieldDescription: "選擇要關聯的特殊裝備",
				},
			},
			description: "記錄水晶和特殊裝備之間的關聯關係",
		},
		_crystalToweapon: {
			selfName: "水晶-武器關聯",
			fields: {
				A: {
					key: "水晶ID",
					tableFieldDescription: "關聯的水晶ID",
					formFieldDescription: "選擇要關聯的水晶",
				},
				B: {
					key: "武器ID",
					tableFieldDescription: "關聯的武器ID",
					formFieldDescription: "選擇要關聯的武器",
				},
			},
			description: "記錄水晶和武器之間的關聯關係",
		},
		_frontRelation: {
			selfName: "前置關聯",
			fields: {
				A: {
					key: "前置水晶ID",
					tableFieldDescription: "關聯的前置水晶ID",
					formFieldDescription: "選擇前置位水晶",
				},
				B: {
					key: "後置水晶ID",
					tableFieldDescription: "關聯的後置水晶ID",
					formFieldDescription: "選擇後置位水晶",
				},
			},
			description: "記錄水晶之間的前置/後置關聯關係",
		},
		_linkZones: {
			selfName: "區域連接",
			description: "記錄區域之間的連接關係",
			fields: {
				A: {
					key: "區域A ID",
					tableFieldDescription: "連接的源區域ID",
					formFieldDescription: "選擇要連接的源區域",
				},
				B: {
					key: "區域B ID",
					tableFieldDescription: "連接的目標區域ID",
					formFieldDescription: "選擇要連接的目標區域",
				},
			},
		},
		_mobTozone: {
			selfName: "怪物-区域关联",
			fields: {
				A: {
					key: "怪物ID",
					tableFieldDescription: "關聯的怪物ID",
					formFieldDescription: "選擇要關聯的怪物",
				},
				B: {
					key: "区域ID",
					tableFieldDescription: "關聯的區域ID",
					formFieldDescription: "選擇要關聯的區域",
				},
			},
			description: "记录怪物和区域之间的关联关系",
		},
		account: {
			selfName: "帳號",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "帳號的唯一標識符",
					formFieldDescription: "帳號的唯一標識符",
				},
				type: {
					key: "類型",
					tableFieldDescription: "帳號的類型",
					formFieldDescription: "選择帳號類型",
					enumMap: accountType,
				},
				provider: {
					key: "提供商",
					tableFieldDescription: "帳號的提供商",
					formFieldDescription: "選择帳號提供商",
				},
				providerAccountId: {
					key: "提供商帳號ID",
					tableFieldDescription: "提供商帳號的唯一標識符",
					formFieldDescription: "提供商帳號的唯一標識符",
				},
				refresh_token: {
					key: "刷新令牌",
					tableFieldDescription: "帳號的刷新令牌",
					formFieldDescription: "帳號的刷新令牌",
				},
				access_token: {
					key: "访问令牌",
					tableFieldDescription: "帳號的访问令牌",
					formFieldDescription: "帳號的访问令牌",
				},
				expires_at: {
					key: "過期時間",
					tableFieldDescription: "令牌的過期時間",
					formFieldDescription: "令牌的過期時間",
				},
				token_type: {
					key: "令牌類型",
					tableFieldDescription: "令牌的類型",
					formFieldDescription: "令牌的類型",
				},
				scope: {
					key: "範圍",
					tableFieldDescription: "令牌的权限範圍",
					formFieldDescription: "令牌的权限範圍",
				},
				id_token: {
					key: "ID令牌",
					tableFieldDescription: "帳號的ID令牌",
					formFieldDescription: "帳號的ID令牌",
				},
				session_state: {
					key: "會話狀態",
					tableFieldDescription: "帳號的會話狀態",
					formFieldDescription: "帳號的會話狀態",
				},
				userId: {
					key: "用户ID",
					tableFieldDescription: "關聯的用户ID",
					formFieldDescription: "選择關聯的用户",
				},
			},
			description: "帳號資訊",
		},
		account_create_data: {
			selfName: "帳號創建資料",
			fields: {
				accountId: {
					key: "帳號ID",
					tableFieldDescription: "關聯的帳號ID",
					formFieldDescription: "選择要創建的帳號",
				},
			},
			description: "帳號建立記錄",
		},
		account_update_data: {
			selfName: "帳號更新資料",
			fields: {
				accountId: {
					key: "帳號ID",
					tableFieldDescription: "關聯的帳號ID",
					formFieldDescription: "選择要更新的帳號",
				},
			},
			description: "帳號更新記錄",
		},
		activity: {
			selfName: "活動",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "活動的唯一標識符",
					formFieldDescription: "活動的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "活動的名称",
					formFieldDescription: "請輸入活動名称",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的活動資訊",
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
					enumMap: addressType,
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
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的地點資訊",
		},
		armor: {
			selfName: "防具",
			fields: {
				name: {
					key: "名稱",
					tableFieldDescription: "防具的名稱",
					formFieldDescription: "請輸入防具名稱",
				},
				baseAbi: {
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
					key: "ID",
					tableFieldDescription: "頭像的唯一標識符",
					formFieldDescription: "頭像的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "頭像的名称",
					formFieldDescription: "請輸入頭像名称",
				},
				type: {
					key: "類型",
					tableFieldDescription: "頭像的類型",
					formFieldDescription: "選择頭像類型",
					enumMap: playerAvatarType,
				},
				modifiers: {
					key: "修正值",
					tableFieldDescription: "頭像的屬性修正值",
					formFieldDescription: "請輸入屬性修正值",
				},
				belongToPlayerId: {
					key: "玩家ID",
					tableFieldDescription: "關聯的玩家ID",
					formFieldDescription: "選择關聯的玩家",
				},
			},
			description: "時裝資訊",
		},
		character: {
			selfName: "機體",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "機體的唯一標識符",
					formFieldDescription: "機體的唯一標識符",
				},
				name: {
					key: "名稱",
					tableFieldDescription: "機體的名稱",
					formFieldDescription: "請輸入機體名稱",
				},
				lv: {
					key: "等級",
					tableFieldDescription: "機體的等級",
					formFieldDescription: "請輸入機體等級",
				},
				str: {
					key: "力量",
					tableFieldDescription: "機體的力量值",
					formFieldDescription: "請輸入機體力量值",
				},
				int: {
					key: "智力",
					tableFieldDescription: "機體的智力值",
					formFieldDescription: "請輸入機體智力值",
				},
				vit: {
					key: "體質",
					tableFieldDescription: "機體的體質值",
					formFieldDescription: "請輸入機體體質值",
				},
				agi: {
					key: "敏捷",
					tableFieldDescription: "機體的敏捷值",
					formFieldDescription: "請輸入機體敏捷值",
				},
				dex: {
					key: "靈巧",
					tableFieldDescription: "機體的靈巧值",
					formFieldDescription: "請輸入機體靈巧值",
				},
				personalityType: {
					key: "性格類型",
					tableFieldDescription: "機體的性格類型",
					formFieldDescription: "請選擇機體的性格類型",
					enumMap: characterPersonalityType,
				},
				personalityValue: {
					key: "性格值",
					tableFieldDescription: "機體的性格值",
					formFieldDescription: "請輸入機體性格值",
				},
				weaponId: {
					key: "武器ID",
					tableFieldDescription: "裝備的武器ID",
					formFieldDescription: "請選擇裝備的武器",
				},
				subWeaponId: {
					key: "副武器ID",
					tableFieldDescription: "裝備的副武器ID",
					formFieldDescription: "請選擇裝備的副武器",
				},
				armorId: {
					key: "防具ID",
					tableFieldDescription: "裝備的防具ID",
					formFieldDescription: "請選擇裝備的防具",
				},
				optionId: {
					key: "追加裝備ID",
					tableFieldDescription: "裝備的追加裝備ID",
					formFieldDescription: "請選擇裝備的追加裝備",
				},
				specialId: {
					key: "特殊裝備ID",
					tableFieldDescription: "裝備的特殊裝備ID",
					formFieldDescription: "請選擇裝備的特殊裝備",
				},
				cooking: {
					key: "烹飪",
					tableFieldDescription: "機體的烹飪技能",
					formFieldDescription: "請輸入烹飪技能等級",
				},
				modifiers: {
					key: "修正值",
					tableFieldDescription: "機體的屬性修正值",
					formFieldDescription: "請輸入機體的屬性修正值",
				},
				actions: {
					key: "行動",
					tableFieldDescription: "機體的行動",
					formFieldDescription: "請輸入機體的行動",
				},
				partnerSkillAId: {
					key: "伙伴技能A ID",
					tableFieldDescription: "伙伴技能A的ID",
					formFieldDescription: "請選擇伙伴技能A",
				},
				partnerSkillAType: {
					key: "伙伴技能A类型",
					tableFieldDescription: "伙伴技能A的类型",
					formFieldDescription: "請選擇伙伴技能A类型",
					enumMap: partnerSkillType,
				},
				partnerSkillBId: {
					key: "伙伴技能B ID",
					tableFieldDescription: "伙伴技能B的ID",
					formFieldDescription: "請選擇伙伴技能B",
				},
				partnerSkillBType: {
					key: "伙伴技能B类型",
					tableFieldDescription: "伙伴技能B的类型",
					formFieldDescription: "請選擇伙伴技能B类型",
					enumMap: partnerSkillType,
				},
				belongToPlayerId: {
					key: "主人ID",
					tableFieldDescription: "機體的主人ID",
					formFieldDescription: "請選擇機體的主人",
				},
				details: {
					key: "詳細資料",
					tableFieldDescription: "機體的詳細資料",
					formFieldDescription: "請輸入機體的詳細資料",
				},
				statisticId: {
					key: "統計ID",
					tableFieldDescription: "機體的統計ID",
					formFieldDescription: "請選擇機體的統計",
				},
			},
			description: "角色資訊",
		},
		character_skill: {
			selfName: "機體技能",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "角色技能的唯一標識符",
					formFieldDescription: "角色技能的唯一標識符",
				},
				lv: {
					key: "等級",
					tableFieldDescription: "角色技能的等級",
					formFieldDescription: "請輸入等級",
				},
				isStarGem: {
					key: "是否为星石",
					tableFieldDescription: "是否为星石技能",
					formFieldDescription: "是否为星石技能",
				},
				templateId: {
					key: "技能ID",
					tableFieldDescription: "角色技能的模板ID",
					formFieldDescription: "選择技能模板",
				},
				belongToCharacterId: {
					key: "所屬角色ID",
					tableFieldDescription: "角色技能所屬的角色ID",
					formFieldDescription: "選择所屬角色",
				},
			},
			description: "角色習得技能資訊",
		},
		combo: {
			selfName: "連擊",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "連擊的唯一標識符",
					formFieldDescription: "連擊的唯一標識符",
				},
				disable: {
					key: "是否禁用",
					tableFieldDescription: "連擊是否禁用",
					formFieldDescription: "是否禁用该連擊",
				},
				name: {
					key: "名称",
					tableFieldDescription: "連擊的名称",
					formFieldDescription: "請輸入連擊的名称",
				},
				belongToCharacterId: {
					key: "所屬角色ID",
					tableFieldDescription: "連擊所屬的角色ID",
					formFieldDescription: "選择所屬角色",
				},
			},
			description: "連擊資訊",
		},
		combo_step: {
			selfName: "連擊步驟",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "連擊步驟的唯一標識符",
					formFieldDescription: "連擊步驟的唯一標識符",
				},
				type: {
					key: "類型",
					tableFieldDescription: "連擊步驟的類型",
					formFieldDescription: "選择連擊步驟的類型",
					enumMap: comboStepType,
				},
				characterSkillId: {
					key: "角色技能ID",
					tableFieldDescription: "使用的角色技能ID",
					formFieldDescription: "選择使用的角色技能",
				},
				belongToComboId: {
					key: "所屬連擊ID",
					tableFieldDescription: "連擊步驟所屬的連擊ID",
					formFieldDescription: "選择所屬連擊",
				},
			},
			description: "連擊步驟資訊",
		},
		consumable: {
			selfName: "消耗品",
			fields: {
				name: {
					key: "名稱",
					tableFieldDescription: "消耗品的名稱",
					formFieldDescription: "請輸入消耗品名稱",
				},
				type: {
					key: "類型",
					tableFieldDescription: "消耗品的類型",
					formFieldDescription: "請選擇消耗品的類型",
					enumMap: consumableType,
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
				name: {
					key: "名稱",
					tableFieldDescription: "晶石的名稱",
					formFieldDescription: "請輸入晶石名稱",
				},
				type: {
					key: "類型",
					tableFieldDescription: "锻晶的類型",
					formFieldDescription: "選择锻晶的類型",
					enumMap: crystalType,
				},
				modifiers: {
					key: "屬性",
					tableFieldDescription: "锻晶的屬性",
					formFieldDescription: "請輸入锻晶的屬性",
				},
				itemId: {
					key: "所屬道具ID",
					tableFieldDescription: "锻晶所屬的道具ID",
					formFieldDescription: "選择锻晶所屬的道具",
				},
			},
			description: "遊戲中的鍛晶資訊",
		},
		drop_item: {
			selfName: "掉落物品",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "掉落物品的唯一標識符",
					formFieldDescription: "掉落物品的唯一標識符",
				},
				itemId: {
					key: "物品ID",
					tableFieldDescription: "掉落物品的物品ID",
					formFieldDescription: "選择掉落物品的物品",
				},
				probability: {
					key: "概率",
					tableFieldDescription: "掉落物品的概率",
					formFieldDescription: "請輸入掉落物品的概率",
				},
				relatedPartType: {
					key: "掉落部位",
					tableFieldDescription: "掉落物品的掉落部位",
					formFieldDescription: "選择掉落物品的掉落部位",
					enumMap: dropItemRelatedPartType,
				},
				relatedPartInfo: {
					key: "掉落部位信息",
					tableFieldDescription: "掉落物品的掉落部位信息",
					formFieldDescription: "請輸入掉落物品的掉落部位信息",
				},
				breakRewardType: {
					key: "部位破坏奖励",
					tableFieldDescription: "掉落物品的部位破坏奖励",
					formFieldDescription: "選择掉落物品的部位破坏奖励",
					enumMap: dropItemBreakRewardType,
				},
				belongToMobId: {
					key: "掉落于",
					tableFieldDescription: "掉落物品的怪物ID",
					formFieldDescription: "選择掉落物品的怪物",
				},
			},
			description: "怪物掉落物品資訊",
		},
		image: {
			selfName: "圖片",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "圖片的唯一標識符",
					formFieldDescription: "圖片的唯一標識符",
				},
				dataUrl: {
					key: "圖片URL",
					tableFieldDescription: "圖片的URL",
					formFieldDescription: "請輸入圖片的URL",
				},
				belongToNpcId: {
					key: "NPC ID",
					tableFieldDescription: "圖片的NPC ID",
					formFieldDescription: "選择圖片的NPC",
				},
				weaponId: {
					key: "武器ID",
					tableFieldDescription: "圖片的武器ID",
					formFieldDescription: "選择圖片的武器",
				},
				armorId: {
					key: "防具ID",
					tableFieldDescription: "圖片的防具ID",
					formFieldDescription: "選择圖片的防具",
				},
				optionId: {
					key: "追加裝備ID",
					tableFieldDescription: "圖片的追加裝備ID",
					formFieldDescription: "選择圖片的追加裝備",
				},
				mobId: {
					key: "怪物ID",
					tableFieldDescription: "圖片的怪物ID",
					formFieldDescription: "選择圖片的怪物",
				},
			},
			description: "遊戲中的圖片資源資訊",
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
					enumMap: itemType,
				},
				itemSourceType: {
					key: "道具來源",
					tableFieldDescription: "道具的來源",
					formFieldDescription: "道具的來源",
					enumMap: {
						Mob: "怪物",
						Task: "任務",
						BlacksmithShop: "鐵匠鋪",
						Player: "玩家",
					},
				},
			},
			description: "遊戲中的道具資訊",
		},
		material: {
			selfName: "材料",
			fields: {
				name: {
					key: "名稱",
					tableFieldDescription: "材料的名稱",
					formFieldDescription: "請輸入材料名稱",
				},
				type: {
					key: "類型",
					tableFieldDescription: "材料的類型",
					formFieldDescription: "請選擇材料的類型",
					enumMap: materialType,
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
					key: "ID",
					tableFieldDescription: "成員的唯一標識符",
					formFieldDescription: "成員的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "成員的名称",
					formFieldDescription: "請輸入成員的名称",
				},
				sequence: {
					key: "順序",
					tableFieldDescription: "成員的順序",
					formFieldDescription: "請輸入成員的順序",
				},
				playerId: {
					key: "玩家ID",
					tableFieldDescription: "成員的玩家ID",
					formFieldDescription: "選择成員的玩家",
				},
				partnerId: {
					key: "伙伴ID",
					tableFieldDescription: "成員的伙伴ID",
					formFieldDescription: "選择成員的伙伴",
				},
				mercenaryId: {
					key: "佣兵ID",
					tableFieldDescription: "成員的佣兵ID",
					formFieldDescription: "選择成員的佣兵",
				},
				mobId: {
					key: "怪物ID",
					tableFieldDescription: "成員的怪物ID",
					formFieldDescription: "選择成員的怪物",
				},
				mobDifficultyFlag: {
					key: "怪物难度",
					tableFieldDescription: "成員的怪物难度",
					formFieldDescription: "選择成員的怪物难度",
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
					tableFieldDescription: "成員的队伍ID",
					formFieldDescription: "選择成員的队伍",
				},
				type: {
					key: "類型",
					tableFieldDescription: "成員的類型",
					formFieldDescription: "選擇成員的類型",
					enumMap: {
						Player: "玩家",
						Partner: "伙伴",
						Mercenary: "佣兵",
						Mob: "怪物",
					},
				},
			},
			description: "隊伍成員資訊",
		},
		mercenary: {
			selfName: "傭兵",
			fields: {
				type: {
					key: "類型",
					tableFieldDescription: "佣兵的類型",
					formFieldDescription: "選择佣兵的類型",
					enumMap: mercenaryType,
				},
				templateId: {
					key: "模板角色ID",
					tableFieldDescription: "佣兵的模板角色ID",
					formFieldDescription: "選择模板角色",
				},
				skillAId: {
					key: "技能A ID",
					tableFieldDescription: "佣兵的技能A ID",
					formFieldDescription: "選择技能A",
				},
				skillAType: {
					key: "技能A類型",
					tableFieldDescription: "佣兵的技能A類型",
					formFieldDescription: "選择技能A類型",
					enumMap: partnerSkillType,
				},
				skillBId: {
					key: "技能B ID",
					tableFieldDescription: "佣兵的技能B ID",
					formFieldDescription: "選择技能B",
				},
				skillBType: {
					key: "技能B類型",
					tableFieldDescription: "佣兵的技能B類型",
					formFieldDescription: "選择技能B類型",
					enumMap: partnerSkillType,
				},
			},
			description: "傭兵資訊",
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
				normalDefExp: {
					key: "一般傷害慣性變動率",
					tableFieldDescription: "每次受到傷害時，一般慣性的變化值",
					formFieldDescription: "每次受到傷害時，一般慣性的變化值",
				},
				physicDefExp: {
					key: "物理傷害慣性變動率",
					tableFieldDescription: "每次受到傷害時，物理慣性的變化值",
					formFieldDescription: "每次受到傷害時，物理慣性的變化值",
				},
				magicDefExp: {
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
			description: "遊戲中的怪物資訊",
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
					formFieldDescription: "npc的名称，請填写和游戏内一致的翻译。你也不想大伙看到你写的东西之後一脸懵逼是吧。",
				},
				zoneId: {
					key: "出现的區域",
					tableFieldDescription: "npc站着的地方啦，比如某某街道第三區域啥的",
					formFieldDescription: "npc站着的地方啦，比如某某街道第三區域啥的",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的NPC資訊",
		},
		option: {
			selfName: "追加裝備",
			fields: {
				name: {
					key: "名稱",
					tableFieldDescription: "追加裝備的名稱",
					formFieldDescription: "請輸入追加裝備名稱",
				},
				baseAbi: {
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
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "玩家的名称",
					formFieldDescription: "請輸入玩家名称",
				},
				useIn: {
					key: "用于",
					tableFieldDescription: "玩家用于什么场景",
					formFieldDescription: "選择使用场景",
				},
				belongToAccountId: {
					key: "所屬帳號ID",
					tableFieldDescription: "玩家所屬的帳號ID",
					formFieldDescription: "選择所屬帳號",
				},
			},
			description: "玩家資訊",
		},
		player_armor: {
			selfName: "玩家防具",
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
					key: "基础防禦",
					tableFieldDescription: "防具的基础防禦值",
					formFieldDescription: "防具的基础防禦值",
				},
				extraAbi: {
					key: "额外防禦",
					tableFieldDescription: "防具的额外防禦值",
					formFieldDescription: "防具的额外防禦值",
				},
				ability: {
					key: "類型",
					tableFieldDescription: "防具的類型",
					formFieldDescription: "防具的類型",
					enumMap: playerArmorAbilityType,
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "防具的模板ID",
					formFieldDescription: "防具的模板ID",
				},
				refinement: {
					key: "精煉等級",
					tableFieldDescription: "防具的精煉等級",
					formFieldDescription: "防具的精煉等級",
				},
				modifiers: {
					key: "附魔屬性",
					tableFieldDescription: "防具的附魔屬性",
					formFieldDescription: "防具的附魔屬性",
				},
				belongToPlayerId: {
					key: "所屬玩家",
					tableFieldDescription: "防具的所屬玩家",
					formFieldDescription: "防具的所屬玩家",
				},
			},
			description: "玩家防具資訊",
		},
		player_option: {
			selfName: "玩家追加裝備",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "追加裝備的ID",
					formFieldDescription: "追加裝備的ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "追加裝備的名称",
					formFieldDescription: "追加裝備的名称",
				},
				extraAbi: {
					key: "额外防禦",
					tableFieldDescription: "追加裝備的额外防禦值",
					formFieldDescription: "追加裝備的额外防禦值",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "追加裝備的模板ID",
					formFieldDescription: "追加裝備的模板ID",
				},
				refinement: {
					key: "精煉等級",
					tableFieldDescription: "追加裝備的精煉等級",
					formFieldDescription: "追加裝備的精煉等級",
				},
				belongToPlayerId: {
					key: "所屬玩家",
					tableFieldDescription: "追加裝備的所屬玩家",
					formFieldDescription: "追加裝備的所屬玩家",
				},
				baseAbi: {
					key: "基础防禦",
					tableFieldDescription: "追加裝備的基础防禦值",
					formFieldDescription: "追加裝備的基础防禦值",
				},
				modifiers: {
					key: "附魔屬性",
					tableFieldDescription: "追加裝備的附魔屬性",
					formFieldDescription: "追加裝備的附魔屬性",
				},
			},
			description: "玩家追加裝備資訊",
		},
		player_pet: {
			selfName: "玩家寵物",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "寵物的ID",
					formFieldDescription: "寵物的ID",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "寵物的模板ID",
					formFieldDescription: "寵物的模板ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "寵物的名称",
					formFieldDescription: "寵物的名称",
				},
				pStr: {
					key: "力量潛力",
					tableFieldDescription: "寵物的力量潛力",
					formFieldDescription: "寵物的力量潛力",
				},
				pInt: {
					key: "智力潛力",
					tableFieldDescription: "寵物的智力潛力",
					formFieldDescription: "寵物的智力潛力",
				},
				pVit: {
					key: "耐力潛力",
					tableFieldDescription: "寵物的耐力潛力",
					formFieldDescription: "寵物的耐力潛力",
				},
				pAgi: {
					key: "敏捷潛力",
					tableFieldDescription: "寵物的敏捷潛力",
					formFieldDescription: "寵物的敏捷潛力",
				},
				pDex: {
					key: "靈巧潛力",
					tableFieldDescription: "寵物的靈巧潛力",
					formFieldDescription: "寵物的靈巧潛力",
				},
				str: {
					key: "力量",
					tableFieldDescription: "寵物的力量",
					formFieldDescription: "寵物的力量",
				},
				int: {
					key: "智力",
					tableFieldDescription: "寵物的智力",
					formFieldDescription: "寵物的智力",
				},
				vit: {
					key: "耐力",
					tableFieldDescription: "寵物的耐力",
					formFieldDescription: "寵物的耐力",
				},
				agi: {
					key: "敏捷",
					tableFieldDescription: "寵物的敏捷",
					formFieldDescription: "寵物的敏捷",
				},
				dex: {
					key: "靈巧",
					tableFieldDescription: "寵物的靈巧",
					formFieldDescription: "寵物的靈巧",
				},
				weaponType: {
					key: "武器類型",
					tableFieldDescription: "寵物的武器類型",
					formFieldDescription: "寵物的武器類型",
					enumMap: weaponType,
				},
				personaType: {
					key: "性格",
					tableFieldDescription: "寵物的性格",
					formFieldDescription: "寵物的性格",
					enumMap: playerPetPersonaType,
				},
				type: {
					key: "類型",
					tableFieldDescription: "寵物的類型",
					formFieldDescription: "寵物的類型",
					enumMap: playerPetType,
				},
				weaponAtk: {
					key: "戰鬥力",
					tableFieldDescription: "寵物的戰鬥力",
					formFieldDescription: "寵物的戰鬥力",
				},
				generation: {
					key: "代數",
					tableFieldDescription: "寵物的代數",
					formFieldDescription: "寵物的代數",
				},
				maxLv: {
					key: "最大等級",
					tableFieldDescription: "寵物的最大等級",
					formFieldDescription: "寵物的最大等級",
				},
				belongToPlayerId: {
					key: "所屬玩家",
					tableFieldDescription: "寵物的所屬玩家",
					formFieldDescription: "寵物的所屬玩家",
				},
			},
			description: "玩家資訊",
		},
		player_special: {
			selfName: "玩家特殊裝備",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "特殊裝備的ID",
					formFieldDescription: "特殊裝備的ID",
				},
				name: {
					key: "名称",
					tableFieldDescription: "特殊裝備的名称",
					formFieldDescription: "特殊裝備的名称",
				},
				extraAbi: {
					key: "额外攻擊力",
					tableFieldDescription: "特殊裝備的额外攻擊力",
					formFieldDescription: "特殊裝備的额外攻擊力",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "特殊裝備的模板ID",
					formFieldDescription: "特殊裝備的模板ID",
				},
				belongToPlayerId: {
					key: "所屬玩家",
					tableFieldDescription: "特殊裝備的所屬玩家",
					formFieldDescription: "特殊裝備的所屬玩家",
				},
				baseAbi: {
					key: "基础防禦力",
					tableFieldDescription: "特殊裝備的基础防禦力",
					formFieldDescription: "特殊裝備的基础防禦力",
				},
				modifiers: {
					key: "附魔屬性",
					tableFieldDescription: "特殊裝備的附魔屬性",
					formFieldDescription: "特殊裝備的附魔屬性",
				},
			},
			description: "玩家特殊裝備資訊",
		},
		player_weapon: {
			selfName: "玩家武器",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "武器的唯一標識符",
					formFieldDescription: "武器的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "武器的名称",
					formFieldDescription: "武器的名称",
				},
				baseAbi: {
					key: "基础屬性",
					tableFieldDescription: "武器的基础屬性",
					formFieldDescription: "武器的基础屬性",
				},
				stability: {
					key: "穩定率",
					tableFieldDescription: "武器的穩定率",
					formFieldDescription: "武器的穩定率",
				},
				extraAbi: {
					key: "额外攻擊力",
					tableFieldDescription: "武器的额外攻擊力",
					formFieldDescription: "武器的额外攻擊力",
				},
				templateId: {
					key: "模板ID",
					tableFieldDescription: "武器的模板ID",
					formFieldDescription: "武器的模板ID",
				},
				refinement: {
					key: "精煉等級",
					tableFieldDescription: "武器的精煉等級",
					formFieldDescription: "武器的精煉等級",
				},
				modifiers: {
					key: "附魔屬性",
					tableFieldDescription: "武器的附魔屬性",
					formFieldDescription: "武器的附魔屬性",
				},
				belongToPlayerId: {
					key: "所屬玩家",
					tableFieldDescription: "武器的所屬玩家",
					formFieldDescription: "武器的所屬玩家",
				},
				type: {
					key: "類型",
					tableFieldDescription: "武器的類型",
					formFieldDescription: "武器的類型",
					enumMap: weaponType,
				},
				elementType: {
					key: "元素類型",
					tableFieldDescription: "武器的元素類型",
					formFieldDescription: "武器的元素類型",
					enumMap: elementType,
				},
			},
			description: "玩家自訂武器資訊",
		},
		post: {
			selfName: "帖子",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "帖子的唯一標識符",
					formFieldDescription: "帖子的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "帖子的名称",
					formFieldDescription: "請輸入帖子名称",
				},
				createdAt: {
					key: "創建時間",
					tableFieldDescription: "帖子的創建時間",
					formFieldDescription: "請輸入帖子的創建時間",
				},
				updatedAt: {
					key: "更新時間",
					tableFieldDescription: "帖子的更新時間",
					formFieldDescription: "請輸入帖子的更新時間",
				},
				createdById: {
					key: "創建者ID",
					tableFieldDescription: "帖子的創建者ID",
					formFieldDescription: "選择創建者",
				},
			},
			description: "貼文資訊",
		},
		recipe: {
			selfName: "配方",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "配方的唯一標識符",
					formFieldDescription: "配方的唯一標識符",
				},
				itemId: {
					key: "所屬道具",
					tableFieldDescription: "所屬道具",
					formFieldDescription: "所屬道具",
				},
				activityId: {
					key: "所屬活動",
					tableFieldDescription: "所屬活動",
					formFieldDescription: "所屬活動",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的配方資訊",
		},
		recipe_ingredient: {
			selfName: "配方材料",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "配方的材料的唯一標識符",
					formFieldDescription: "配方的材料的唯一標識符",
				},
				count: {
					key: "數量",
					tableFieldDescription: "數量",
					formFieldDescription: "數量",
				},
				type: {
					key: "類型",
					tableFieldDescription: "類型",
					formFieldDescription: "類型",
					enumMap: recipeIngredientType,
				},
				itemId: {
					key: "對应道具",
					tableFieldDescription: "對应道具",
					formFieldDescription: "對应道具",
				},
				recipeId: {
					key: "所屬配方",
					tableFieldDescription: "所屬配方",
					formFieldDescription: "所屬配方",
				},
			},
			description: "配方材料資訊",
		},
		session: {
			selfName: "工作階段",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "會話的唯一標識符",
					formFieldDescription: "會話的唯一標識符",
				},
				sessionToken: {
					key: "會話令牌",
					tableFieldDescription: "會話的令牌",
					formFieldDescription: "請輸入會話令牌",
				},
				expires: {
					key: "過期時間",
					tableFieldDescription: "會話的過期時間",
					formFieldDescription: "請輸入會話過期時間",
				},
				userId: {
					key: "用户ID",
					tableFieldDescription: "會話關聯的用户ID",
					formFieldDescription: "選择關聯的用户",
				},
			},
			description: "工作階段資訊",
		},
		simulator: {
			selfName: "模擬器",
			fields: {
				id: {
					key: "模擬器ID",
					tableFieldDescription: "模擬器的唯一標識符",
					formFieldDescription: "模擬器的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "模擬器的名称",
					formFieldDescription: "請輸入模擬器的名称",
				},
				details: {
					key: "詳情",
					tableFieldDescription: "模擬器的詳情",
					formFieldDescription: "請輸入模擬器的詳情",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此模擬器的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此模擬器的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "模擬器資訊",
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
					enumMap: skillTreeType,
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
					enumMap: skillTargetType,
				},
				chargingType: {
					key: "詠唱類型",
					tableFieldDescription: `不受詠唱影響的技能都是${skillChargingType.Reservoir}。`,
					formFieldDescription: `不受詠唱影響的技能都是${skillChargingType.Reservoir}。`,
					enumMap: skillChargingType,
				},
				distanceType: {
					key: "距離威力類型",
					tableFieldDescription: "表示哪種類型的距離威力會影響這個技能",
					formFieldDescription: "表示哪種類型的距離威力會影響這個技能",
					enumMap: skillDistanceType,
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
				preSkillId: {
					key: "前置技能ID",
					tableFieldDescription: "前置技能",
					formFieldDescription: "前置技能",
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
			description: "遊戲中的技能資訊",
		},
		skill_variant: {
			selfName: "技能效果",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "技能效果的唯一標識符",
					formFieldDescription: "技能效果的唯一標識符",
				},
				targetMainWeaponType: {
					key: "目標主武器類型",
					tableFieldDescription: "此技能变體需要什么武器才能生效",
					formFieldDescription: "此技能变體需要什么武器才能生效",
					enumMap: mainHandTypeLimit,
				},
				targetSubWeaponType: {
					key: "目標副武器類型",
					tableFieldDescription: "此技能变體需要什么副武器才能生效",
					formFieldDescription: "此技能变體需要什么副武器才能生效",
					enumMap: subHandTypeLimit,
				},
				targetArmorAbilityType: {
					key: "目標身體裝備能力類型",
					tableFieldDescription: "此技能变體需要什么身體裝備能力才能生效",
					formFieldDescription: "此技能变體需要什么身體裝備能力才能生效",
					enumMap: playerArmorAbilityTypeLimit,
				},
				activeBehavior: {
					key: "主動行為 DSL",
					tableFieldDescription: "主動釋放時使用的預設結構化行為",
					formFieldDescription: "activeBehaviorTree 不存在時執行的主動釋放 DSL",
				},
				passiveBehavior: {
					key: "被動行為 DSL",
					tableFieldDescription: "成員建立時安裝的預設被動行為列表",
					formFieldDescription: "成員建立時安裝的預設被動行為列表",
				},
				registeredBehavior: {
					key: "長期註冊行為 DSL",
					tableFieldDescription: "生命週期超過本次技能釋放的預設註冊行為列表",
					formFieldDescription: "生命週期超過本次技能釋放的預設註冊行為列表",
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
					key: "所屬技能",
					tableFieldDescription: "所屬技能",
					formFieldDescription: "所屬技能",
				},
			},
			description: "技能變體資訊",
		},
		behavior_tree: {
			selfName: "行為樹",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "行為樹唯一標識符",
					formFieldDescription: "行為樹唯一標識符",
				},
				name: {
					key: "名稱",
					tableFieldDescription: "行為樹名稱",
					formFieldDescription: "行為樹名稱",
				},
				definition: {
					key: "定義",
					tableFieldDescription: "MDSL 行為樹定義",
					formFieldDescription: "MDSL 行為樹定義",
				},
				agent: {
					key: "Agent",
					tableFieldDescription: "行為樹可呼叫函式集",
					formFieldDescription: "行為樹可呼叫函式集",
				},
				attributeSlots: {
					key: "屬性槽",
					tableFieldDescription: "需要併入 StatContainer 的持久化屬性槽",
					formFieldDescription: "需要併入 StatContainer 的持久化屬性槽 JSON",
				},
				activeOwnerId: {
					key: "主動歸屬技能變體",
					tableFieldDescription: "作為自訂主動行為樹歸屬的技能變體",
					formFieldDescription: "作為自訂主動行為樹歸屬的技能變體",
				},
				passiveOwnerId: {
					key: "被動歸屬技能變體",
					tableFieldDescription: "作為自訂被動行為樹歸屬的技能變體",
					formFieldDescription: "作為自訂被動行為樹歸屬的技能變體",
				},
				registeredOwnerId: {
					key: "長期註冊歸屬技能變體",
					tableFieldDescription: "作為長期註冊行為樹歸屬的技能變體",
					formFieldDescription: "作為長期註冊行為樹歸屬的技能變體",
				},
			},
			description: "技能變體擁有的自訂行為樹資源",
		},
		special: {
			selfName: "特殊裝備",
			fields: {
				name: {
					key: "名稱",
					tableFieldDescription: "特殊裝備的名稱",
					formFieldDescription: "請輸入特殊裝備名稱",
				},
				baseAbi: {
					key: "基础防禦",
					tableFieldDescription: "基础防禦",
					formFieldDescription: "基础防禦",
				},
				modifiers: {
					key: "自带的附魔屬性",
					tableFieldDescription: "锻造時或者掉落時自带的附魔屬性",
					formFieldDescription: "锻造時或者掉落時自带的附魔屬性",
				},
				itemId: {
					key: "所屬道具ID",
					tableFieldDescription: "所屬道具ID",
					formFieldDescription: "所屬道具ID",
				},
			},
			description: "遊戲中的特殊裝備資訊",
		},
		statistic: {
			selfName: "統計資訊",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "统计信息的唯一標識符",
					formFieldDescription: "统计信息的唯一標識符",
				},
				updatedAt: {
					key: "更新時間",
					tableFieldDescription: "统计信息的更新時間",
					formFieldDescription: "請輸入更新時間",
				},
				createdAt: {
					key: "創建時間",
					tableFieldDescription: "统计信息的創建時間",
					formFieldDescription: "請輸入創建時間",
				},
				usageTimestamps: {
					key: "使用時間戳",
					tableFieldDescription: "使用時間戳列表",
					formFieldDescription: "請輸入使用時間戳",
				},
				viewTimestamps: {
					key: "查看時間戳",
					tableFieldDescription: "查看時間戳列表",
					formFieldDescription: "請輸入查看時間戳",
				},
			},
			description: "遊戲的統計欄位",
		},
		task: {
			selfName: "任務",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				lv: {
					key: "等級",
					tableFieldDescription: "承接任务時，如果角色低于此等級，则无法承接任务",
					formFieldDescription: "承接任务時，如果角色低于此等級，则无法承接任务",
				},
				name: {
					key: "名称",
					tableFieldDescription: "任务名称",
					formFieldDescription: "任务名称",
				},
				type: {
					key: "類型",
					tableFieldDescription: "任务類型",
					formFieldDescription: "任务類型",
					enumMap: taskType,
				},
				description: {
					key: "描述",
					tableFieldDescription: "任务描述",
					formFieldDescription: "任务描述",
				},
				belongToNpcId: {
					key: "所屬NPC",
					tableFieldDescription: "任务所屬的NPC",
					formFieldDescription: "任务所屬的NPC",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的任務資訊",
		},
		task_collect_require: {
			selfName: "任務收集要求",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				count: {
					key: "數量",
					tableFieldDescription: "需要收集的數量",
					formFieldDescription: "需要收集的數量",
				},
				itemId: {
					key: "所屬道具",
					tableFieldDescription: "所屬道具",
					formFieldDescription: "所屬道具",
				},
				belongToTaskId: {
					key: "所屬任务",
					tableFieldDescription: "所屬任务",
					formFieldDescription: "所屬任务",
				},
			},
			description: "任務收集需求",
		},
		task_kill_requirement: {
			selfName: "任務擊殺要求",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				mobId: {
					key: "需要擊杀的怪物",
					tableFieldDescription: "需要擊杀的怪物",
					formFieldDescription: "需要擊杀的怪物",
				},
				count: {
					key: "數量",
					tableFieldDescription: "需要擊杀的數量",
					formFieldDescription: "需要擊杀的數量",
				},
				belongToTaskId: {
					key: "所屬任务",
					tableFieldDescription: "所屬任务",
					formFieldDescription: "所屬任务",
				},
			},
			description: "任務擊殺要求",
		},
		task_reward: {
			selfName: "任務獎勵",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				type: {
					key: "類型",
					tableFieldDescription: "奖励類型",
					formFieldDescription: "奖励類型",
					enumMap: taskRewardType,
				},
				value: {
					key: "數量",
					tableFieldDescription: "奖励數量",
					formFieldDescription: "奖励數量",
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
					key: "所屬任务",
					tableFieldDescription: "所屬任务",
					formFieldDescription: "所屬任务",
				},
			},
			description: "任務獎勵資訊",
		},
		team: {
			selfName: "隊伍",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "队伍的唯一標識符",
					formFieldDescription: "队伍的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "队伍的名称",
					formFieldDescription: "請輸入队伍名称",
				},
				gems: {
					key: "宝石",
					tableFieldDescription: "队伍的宝石配置",
					formFieldDescription: "請輸入队伍的宝石配置",
				},
			},
			description: "隊伍資訊",
		},
		user: {
			selfName: "用戶",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "用户的唯一標識符",
					formFieldDescription: "用户的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "用户的名称",
					formFieldDescription: "請輸入用户名称",
				},
				email: {
					key: "郵箱",
					tableFieldDescription: "用户的郵箱",
					formFieldDescription: "請輸入用户郵箱",
				},
				emailVerified: {
					key: "郵箱已驗證",
					tableFieldDescription: "郵箱是否已驗證",
					formFieldDescription: "郵箱是否已驗證",
				},
				password: {
					key: "密码",
					tableFieldDescription: "用户的密码",
					formFieldDescription: "請輸入用户密码",
				},
				image: {
					key: "頭像",
					tableFieldDescription: "用户的頭像URL",
					formFieldDescription: "請輸入用户的頭像URL",
				},
			},
			description: "使用者資訊",
		},
		verification_token: {
			selfName: "驗證令牌",
			fields: {
				identifier: {
					key: "標識符",
					tableFieldDescription: "驗證令牌的標識符",
					formFieldDescription: "請輸入驗證令牌的標識符",
				},
				token: {
					key: "令牌",
					tableFieldDescription: "驗證令牌的值",
					formFieldDescription: "請輸入驗證令牌的值",
				},
				expires: {
					key: "過期時間",
					tableFieldDescription: "驗證令牌的過期時間",
					formFieldDescription: "請輸入驗證令牌的過期時間",
				},
			},
			description: "驗證令牌資訊",
		},
		weapon: {
			selfName: "武器",
			fields: {
				name: {
					key: "名稱",
					tableFieldDescription: "武器的名稱",
					formFieldDescription: "請輸入武器名稱",
				},
				type: {
					key: "類型",
					tableFieldDescription: "武器的類型，包括主武器和副武器",
					formFieldDescription: "請選擇武器的類型",
					enumMap: weaponType,
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
					enumMap: elementType,
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
					key: "ID",
					tableFieldDescription: "世界的唯一標識符",
					formFieldDescription: "世界的唯一標識符，由系统自動生成",
				},
				name: {
					key: "名称",
					tableFieldDescription: "世界的名称",
					formFieldDescription: "世界的名称",
				},
				statisticId: {
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的世界資訊",
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
					key: "统计ID",
					tableFieldDescription: "關聯的统计信息",
					formFieldDescription: "選择關聯的统计信息",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新此記錄的帳號",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建此記錄的帳號",
					formFieldDescription: "選择創建者帳號",
				},
			},
			description: "遊戲中的區域資訊，包含名稱、連結區域、獎勵節點等",
		},
		character_registlet: {
			selfName: "角色雷吉斯托環",
			description: "角色佩戴的雷吉斯托環資訊",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				level: {
					key: "等級",
					tableFieldDescription: "角色佩戴的雷吉斯托环的等級",
					formFieldDescription: "請輸入等級",
				},
				templateId: {
					key: "所屬雷吉斯托环",
					tableFieldDescription: "角色佩戴的雷吉斯托环的ID",
					formFieldDescription: "選择角色佩戴的雷吉斯托环",
				},
				belongToCharacterId: {
					key: "所屬角色",
					tableFieldDescription: "角色佩戴的雷吉斯托环所屬的角色ID",
					formFieldDescription: "選择角色",
				},
			},
		},
		registlet: {
			selfName: "雷吉斯托環",
			description: "遊戲中的雷吉斯托環資訊",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "雷吉斯托环的唯一標識符",
					formFieldDescription: "雷吉斯托环的唯一標識符",
				},
				name: {
					key: "名称",
					tableFieldDescription: "雷吉斯托环的名称",
					formFieldDescription: "請輸入雷吉斯托环的名称",
				},
				maxLevel: {
					key: "最大等級",
					tableFieldDescription: "雷吉斯托环的最大等級",
					formFieldDescription: "請輸入最大等級",
				},
				attrModifiers: {
					key: "屬性修正",
					tableFieldDescription: "雷吉斯托环的屬性修正",
					formFieldDescription: "請輸入屬性修正",
				},
				pipelinePatches: {
					key: "管道补丁",
					tableFieldDescription: "管道补丁效果",
					formFieldDescription: "請配置管道补丁效果",
				},
				skillBranchActivators: {
					key: "技能分支激活器",
					tableFieldDescription: "技能分支激活效果",
					formFieldDescription: "請配置技能分支激活效果",
				},
				updatedByAccountId: {
					key: "更新者",
					tableFieldDescription: "最後更新者",
					formFieldDescription: "選择更新者帳號",
				},
				createdByAccountId: {
					key: "創建者",
					tableFieldDescription: "創建者",
					formFieldDescription: "選择創建者帳號",
				},
				subscriptions: {
					key: "订阅事件",
					tableFieldDescription: "事件订阅效果",
					formFieldDescription: "請配置事件订阅效果",
				},
				thresholdWatchers: {
					key: "阈值监视器",
					tableFieldDescription: "阈值监视效果",
					formFieldDescription: "請配置阈值监视效果",
				},
			},
		},
	},
};

export default dictionary;
