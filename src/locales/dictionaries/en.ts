import type * as Enums from "@db/schema/enums";
import type { Dictionary } from "../type";

// Tool types
// ----------------------------------------------------------------

const mainWeaponType: Record<Enums.MainWeaponType, string> = {
	OneHandSword: "One-handed Sword",
	TwoHandSword: "Two-handed Sword",
	Bow: "Bow",
	Rod: "Staff",
	Magictool: "Magic Tool",
	Knuckle: "Knuckle",
	Halberd: "Halberd",
	Katana: "Katana",
	Bowgun: "Bowgun",
};

const mainHandType: Record<Enums.MainHandType, string> = {
	...mainWeaponType,
	None: "None",
};

const mainHandTypeLimit: Record<Enums.MainHandTypeLimit, string> = {
	...mainHandType,
	Any: "Any",
};

const subWeaponType: Record<Enums.SubWeaponType, string> = {
	Arrow: "Arrow",
	ShortSword: "Short Sword",
	NinjutsuScroll: "Ninjutsu Scroll",
	Shield: "Shield",
};

const subHandType: Record<Enums.SubHandType, string> = {
	...subWeaponType,
	OneHandSword: mainHandType.OneHandSword,
	Magictool: mainHandType.Magictool,
	Knuckle: mainHandType.Knuckle,
	Katana: mainHandType.Katana,
	None: "None",
};

const subHandTypeLimit: Record<Enums.SubHandTypeLimit, string> = {
	...subHandType,
	Any: "Any",
};

// Actual types
// ----------------------------------------------------------------

const accountType: Record<Enums.AccountType, string> = {
	Admin: "Admin",
	User: "User",
};

const addressType: Record<Enums.AddressType, string> = {
	Normal: "Normal Address",
	Limited: "Limited Time Address",
};

const elementType: Record<Enums.ElementType, string> = {
	Normal: "Normal",
	Dark: "Dark",
	Earth: "Earth",
	Fire: "Fire",
	Light: "Light",
	Water: "Water",
	Wind: "Wind",
};

const weaponType: Record<Enums.WeaponType, string> = {
	...mainWeaponType,
	...subWeaponType,
};

const mobType: Record<Enums.MobType, string> = {
	Boss: "Boss",
	MiniBoss: "Mini Boss",
	Mob: "Mob",
};

const itemType: Record<Enums.ItemType, string> = {
	Weapon: "Weapon",
	Armor: "Armor",
	Option: "Additional Equipment",
	Special: "Special Equipment",
	Crystal: "Crystal",
	Consumable: "Consumable",
	Material: "Material",
};

const materialType: Record<Enums.MaterialType, string> = {
	Metal: "Metal",
	Cloth: "Cloth",
	Beast: "Beast",
	Wood: "Wood",
	Drug: "Drug",
	Magic: "Magic",
};

const consumableType: Record<Enums.ConsumableType, string> = {
	MaxHp: "Max HP",
	MaxMp: "Max MP",
	pAtk: "Physical Attack",
	mAtk: "Magic Attack",
	Aspd: "Attack Speed",
	Cspd: "Cast Speed",
	Hit: "Hit",
	Flee: "Flee",
	EleStro: "Elemental Strength",
	EleRes: "Elemental Resistance",
	pRes: "Physical Resistance",
	mRes: "Magic Resistance",
};

const crystalType: Record<Enums.CrystalType, string> = {
	NormalCrystal: "Normal Crystal",
	WeaponCrystal: "Weapon Crystal",
	ArmorCrystal: "Armor Crystal",
	OptionCrystal: "Additional Crystal",
	SpecialCrystal: "Special Crystal",
};

const recipeIngredientType: Record<Enums.MaterialType | "Gold" | "Item", string> = {
	...materialType,
	Gold: "Gold",
	Item: "Item",
};

const dropItemRelatedPartType: Record<Enums.BossPartType, string> = {
	A: "A",
	B: "B",
	C: "C",
};

const dropItemBreakRewardType: Record<Enums.BossPartBreakRewardType, string> = {
	None: "None",
	CanDrop: "Can Drop",
	DropUp: "Drop Rate Up",
};

const taskType: Record<Enums.TaskType, string> = {
	Collect: "Collect",
	Defeat: "Defeat",
	Both: "Both",
	Other: "Other",
};

const taskRewardType: Record<Enums.TaskRewardType, string> = {
	Exp: "Experience",
	Money: "Money",
	Item: "Item",
};

const skillTreeType: Record<Enums.SkillTreeType, string> = {
	BladeSkill: "Blade Skill",
	ShootSkill: "Shoot Skill",
	MagicSkill: "Magic Skill",
	MarshallSkill: "Martial Skill",
	DualSwordSkill: "Dual Sword Skill",
	HalberdSkill: "Halberd Skill",
	MononofuSkill: "Samurai Skill",
	CrusherSkill: "Crusher Skill",
	FeatheringSkill: "Feathering Skill",
	GuardSkill: "Guard Skill",
	ShieldSkill: "Shield Skill",
	KnifeSkill: "Knife Skill",
	KnightSkill: "Knight Skill",
	HunterSkill: "Hunter Skill",
	PriestSkill: "Priest Skill",
	AssassinSkill: "Assassin Skill",
	WizardSkill: "Wizard Skill",
	//
	SupportSkill: "Support Skill",
	BattleSkill: "Battle Skill",
	SurvivalSkill: "Survival Skill",
	//
	SmithSkill: "Smith Skill",
	AlchemySkill: "Alchemy Skill",
	TamerSkill: "Tamer Skill",
	//
	DarkPowerSkill: "Dark Power Skill",
	MagicBladeSkill: "Magic Blade Skill",
	DancerSkill: "Dancer Skill",
	MinstrelSkill: "Minstrel Skill",
	BareHandSkill: "Bare Hand Skill",
	NinjaSkill: "Ninja Skill",
	PartisanSkill: "Partisan Skill",
	//
	LuckSkill: "",
	MerchantSkill: "Merchant Skill",
	PetSkill: "Pet Skill",
};

const skillChargingType: Record<Enums.SkillChargingType, string> = {
	Chanting: "Chanting",
	Reservoir: "Reservoir",
	None: "None",
};

const skillDistanceType: Record<Enums.SkillDistanceType, string> = {
	None: "Not Affected",
	Long: "Long Range Only",
	Short: "Short Range Only",
	Both: "Both Ranges",
};

const skillTargetType: Record<Enums.SkillTargetType, string> = {
	None: "No Target",
	Self: "Self",
	Player: "Player",
	Enemy: "Enemy",
};

const playerArmorAbilityType: Record<Enums.PlayerArmorAbilityType, string> = {
	Normal: "Normal",
	Light: "Light",
	Heavy: "Heavy",
};

const playerArmorAbilityTypeLimit: Record<Enums.PlayerArmorAbilityTypeLimit, string> = {
	...playerArmorAbilityType,
	Any: "Any",
};

const playerPetPersonaType: Record<Enums.PetPersonaType, string> = {
	Fervent: "Fervent",
	Intelligent: "Intelligent",
	Mild: "Mild",
	Swift: "Swift",
	Justice: "Justice",
	Devoted: "Devoted",
	Impulsive: "Impulsive",
	Calm: "Calm",
	Sly: "Sly",
	Timid: "Timid",
	Brave: "Brave",
	Active: "Active",
	Sturdy: "Sturdy",
	Steady: "Steady",
	Max: "Max",
};

const playerPetType: Record<Enums.PetType, string> = {
	AllTrades: "All Trades",
	PhysicalAttack: "Physical Attack",
	MagicAttack: "Magic Attack",
	PhysicalDefense: "Physical Defense",
	MagicDefense: "Magic Defense",
	Avoidance: "Avoidance",
	Hit: "Hit",
	SkillsEnhancement: "Skills Enhancement",
	Genius: "Genius",
};

const playerAvatarType: Record<Enums.AvatarType, string> = {
	Decoration: "Decoration",
	Top: "Top",
	Bottom: "Bottom",
};

const characterPersonalityType: Record<Enums.CharacterPersonalityType, string> = {
	None: "None",
	Luk: "Luck",
	Cri: "Critical",
	Tec: "Technique",
	Men: "Mental",
};

const partnerSkillType: Record<Enums.PartnerSkillType, string> = {
	Passive: "Passive",
	Active: "Active",
};

const comboStepType: Record<Enums.ComboStepType, string> = {
	None: "None",
	Start: "",
	Rengeki: "Rengeki",
	ThirdEye: "Third Eye",
	Filling: "Filling",
	Quick: "Quick",
	HardHit: "Hard Hit",
	Tenacity: "Tenacity",
	Invincible: "Invincible",
	BloodSucking: "Blood Sucking",
	Tough: "Tough",
	AMomentaryWalk: "",
	Reflection: "Reflection",
	Illusion: "",
	Max: "",
};

const mercenaryType: Record<Enums.MercenaryType, string> = {
	Tank: "Tank",
	Dps: "DPS",
};

const mobDifficultyFlag: Record<Enums.MobDifficultyFlag, string> = {
	Easy: "0 Star",
	Normal: "1 Star",
	Hard: "2 Star",
	Lunatic: "3 Star",
	Ultimate: "4 Star",
};

const dictionary: Dictionary = {
	ui: {
		columnsHidden: "Columns Hidden",
		searchPlaceholder: "Search something ~",
		boolean: {
			true: "True",
			false: "False",
		},
		actions: {
			add: "Add",
			create: "Create",
			remove: "Remove",
			update: "Update",
			open: "Open",
			upload: "Upload",
			reset: "Reset",
			save: "Save",
			modify: "Modify",
			cancel: "Cancel",
			close: "close",
			back: "Back",
			filter: "Filter",
			generateImage: "Generate Image",
			swap: "Swap",
			checkInfo: "Check Info",
			zoomIn: "Zoom In",
			zoomOut: "Zoom Out",
			logIn: "Log In",
			logOut: "Log Out",
			register: "Register",
			switchUser: "Switch User",
			install: "Install",
			unInstall: "UnInstall",
			operation: "Operation",
			searching: "Searching...",
			enterFullscreen: "Enter Fullscreen",
			exitFullscreen: "Exit Fullscreen",
		},
		relationPrefix: {
			belongsTo: "Belongs to",
			usedBy: "Used by",
			updatedBy: "Update data",
			createdBy: "Create data",
			contains: "Contains",
			related: "Related",
			none: "",
		},
		nav: {
			home: "Home",
			character: "Character",
			simulator: "Simulator",
			profile: "Profile",
		},
		errorPage: {
			tips: "You have no knowledge of the desert. Click the screen to return",
		},
		settings: {
			title: "Settings",
			userInterface: {
				title: "User Interface",
				isAnimationEnabled: {
					title: "Enable Animation",
					description: "Will affect the duration of transitions and animations on all pages.",
				},
				is3DbackgroundDisabled: {
					title: "Disable 3D Background",
					description: "May cause a lot of performance loss, not recommended.",
				},
				colorTheme: {
					title: "Color Theme",
					description: "...",
				},
				themeVersion: {
					title: "Theme Version",
					description: "Choose which token version drives the current color system.",
					v1: "v1",
					v2: "v2",
					v3: "v3",
				},
			},
			language: {
				title: "Language",
				selectedLanguage: {
					title: " Language",
					description: "Affects all interface texts, but cannot change data class texts.",
					zhCN: "简体中文",
					zhTW: "繁体中文",
					enUS: "English",
					jaJP: "日本語",
				},
			},
			statusAndSync: {
				title: "Status and Sync",
				restorePreviousStateOnStartup: {
					title: "Restore Previous State on Startup",
					description: "Not implemented yet.",
				},
				syncStateAcrossClients: {
					title: "Sync State Across Clients",
					description: "Not implemented yet.",
				},
			},
			privacy: {
				title: "Privacy",
				postVisibility: {
					title: "Post Visibility",
					description:
						"Post Visibility includes: Character, Monstors, Crystas, Main Weapon, Sub Weapon, Body Armor, Additional Equipment, Special Equipment, Skills, Consumables, Combo, Simulator.",
					everyone: "Everyone",
					friends: "Friends",
					onlyMe: "Only Me",
				},
			},
			messages: {
				title: "Messages",
				notifyOnContentChange: {
					title: "Notify on Content Change",
					description: "Not implemented yet.",
					notifyOnReferencedContentChange: "Notify on Referenced Content Change",
					notifyOnLike: "Notify on Like",
					notifyOnBookmark: "Notify on Bookmark",
				},
			},
			about: {
				title: "About",
				description: {
					title: "Description",
					description: "~~~~~~~~~~~",
				},
				version: {
					title: "Version",
					description: "0.0.1-alpha",
				},
			},
			tool: {
				title: "App Operations",
				pwa: {
					title: "PWA",
					description:
						"This app is designed as a Progressive Web App (PWA), which can be installed on your device when supported to provide a better experience. It is not installed by default.",
					notSupported: "PWA is not supported or already installed on this device",
				},
				storageInfo: {
					title: "Storage Usage",
					description: "Includes caches such as localStorage, IndexedDB, etc.",
					usage: "Used",
					clearStorage: "Clear all caches for this app (Will refresh the page)",
				},
			},
		},
		index: {
			adventurer: "Adventurer",
			goodMorning: "Good Morning ~",
			goodAfternoon: "Good Afternoon ~",
			goodEvening: "Good Evening ~",
			nullSearchResultWarring: "Can not find anything!",
			nullSearchResultTips: "Emmm...",
		},
		wiki: {
			selector: {
				title: "Wiki Selector",
				groupName: {
					combat: "Combat Database",
					daily: "Daily Database",
				},
			},
			tableConfig: {
				title: "Table Config",
			},
			news: {
				title: "News",
			},
		},
		simulator: {
			pageTitle: "Simulator",
			description: "Emmm..............",
			modifiers: "Modifiers",
			actualValue: "Actual",
			baseValue: "Base",
			staticModifiers: "StaticModifiers",
			dynamicModifiers: "DynamicModifiers",
			simulatorPage: {
				mobsConfig: {
					title: "Mobs Config",
				},
				teamConfig: {
					title: "Team Config",
				},
			},
		},
		character: {
			pageTitle: "Skill",
			description: "Emmm..............",
			tabs: {
				combo: "Combo",
				behavior: "Behavior",
				equipment: {
					selfName: "Equipment",
					mainHand: "Main Hand",
					subHand: "Sub Hand",
					armor: "Armor",
					option: "Option",
					special: "Special",
				},
				consumable: "Consumable",
				cooking: "Cooking",
				registlet: "Registlet",
				skill: {
					selfName: "Skill",
					treeSkill: "Tree Skill",
					starGem: "Star Gem",
					trees: {
						WeaponSkillGroup: {
							selfName: "Weapon Skill",
							tree: {
								BladeSkill: "Blade Skill",
								ShootSkill: "Shoot Skill",
								MagicSkill: "Magic Skill",
								MarshallSkill: "Marshall Skill",
								DualSwordSkill: "Dual Sword Skill",
								HalberdSkill: "Halberd Skill",
								MononofuSkill: "Mononofu Skill",
								CrusherSkill: "Crusher Skill",
								FeatheringSkill: "Feathering Skill",
							},
						},
						BuffSkillGroup: {
							selfName: "Buff Skill",
							tree: {
								GuardSkill: "Guard Skill",
								ShieldSkill: "Shield Skill",
								KnifeSkill: "Knife Skill",
								KnightSkill: "Knight Skill",
								HunterSkill: "Hunter Skill",
								PriestSkill: "Priest Skill",
								AssassinSkill: "Assassin Skill",
								WizardSkill: "Wizard Skill",
							},
						},
						AssistSkillGroup: {
							selfName: "Assist Skill",
							tree: {
								SupportSkill: "Support Skill",
								BattleSkill: "Battle Skill",
								SurvivalSkill: "Survival Skill",
							},
						},
						ProduceSkillGroup: {
							selfName: "Production",
							tree: {
								SmithSkill: "Smith Skill",
								AlchemySkill: "Alchemy Skill",
								TamerSkill: "Tamer Skill",
							},
						},
						SkillBookGroup: {
							selfName: "Skill Book",
							tree: {
								DarkPowerSkill: "Dark Power Skill",
								MagicBladeSkill: "Magic Blade Skill",
								DancerSkill: "Dancer Skill",
								MinstrelSkill: "Minstrel Skill",
								BareHandSkill: "Bare Hand Skill",
								NinjaSkill: "Ninja Skill",
								PartisanSkill: "Partisan Skill",
							},
						},
						OtherSkillGroup: {
							selfName: "Other Skill",
							tree: {
								LuckSkill: "Luck Skill",
								MerchantSkill: "Merchant Skill",
								PetSkill: "Pet Skill",
							},
						},
					},
				},
				ability: "Ability",
				base: {
					selfName: "Base",
					name: "Name",
				},
			}
		},
	},
	db: {
		_armorTocrystal: {
			selfName: "Armor-Crystal Relation",
			fields: {
				A: {
					key: "Armor ID",
					tableFieldDescription: "Associated armor ID",
					formFieldDescription: "Select the armor",
				},
				B: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
			},
			description: "Records the relationship between armor and crystal",
		},
		_avatarTocharacter: {
			selfName: "Avatar-Character Relation",
			fields: {
				A: {
					key: "Avatar ID",
					tableFieldDescription: "Associated avatar ID",
					formFieldDescription: "Select the avatar",
				},
				B: {
					key: "Character ID",
					tableFieldDescription: "Associated character ID",
					formFieldDescription: "Select the character",
				},
			},
			description: "Records the relationship between avatar and character",
		},
		_backRelation: {
			selfName: "Back Relation",
			fields: {
				A: {
					key: "Source ID",
					tableFieldDescription: "Associated source ID",
					formFieldDescription: "Select source",
				},
				B: {
					key: "Target ID",
					tableFieldDescription: "Associated target ID",
					formFieldDescription: "Select target",
				},
			},
			description: "Records the back relation between crystals",
		},
		_campA: {
			selfName: "Camp A Relation",
			fields: {
				A: {
					key: "Source ID",
					tableFieldDescription: "Associated source ID",
					formFieldDescription: "Select source",
				},
				B: {
					key: "Target ID",
					tableFieldDescription: "Associated target ID",
					formFieldDescription: "Select target",
				},
			},
			description: "Records the Camp A relation",
		},
		_campB: {
			selfName: "Camp B Relation",
			fields: {
				A: {
					key: "Source ID",
					tableFieldDescription: "Associated source ID",
					formFieldDescription: "Select source",
				},
				B: {
					key: "Target ID",
					tableFieldDescription: "Associated target ID",
					formFieldDescription: "Select target",
				},
			},
			description: "Records the Camp B relation",
		},
		_characterToconsumable: {
			selfName: "Character-Consumable Relation",
			fields: {
				A: {
					key: "Character ID",
					tableFieldDescription: "Associated character ID",
					formFieldDescription: "Select the character",
				},
				B: {
					key: "Consumable ID",
					tableFieldDescription: "Associated consumable ID",
					formFieldDescription: "Select the consumable",
				},
			},
			description: "Records the relationship between character and consumable",
		},
		_crystalTooption: {
			selfName: "Crystal-Option Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Option ID",
					tableFieldDescription: "Associated option ID",
					formFieldDescription: "Select the option",
				},
			},
			description: "Records the relationship between crystal and option equipment",
		},
		_crystalToplayer_armor: {
			selfName: "Crystal-Player Armor Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Player Armor ID",
					tableFieldDescription: "Associated player armor ID",
					formFieldDescription: "Select the player armor",
				},
			},
			description: "Records the relationship between crystal and player armor",
		},
		_crystalToplayer_option: {
			selfName: "Crystal-Player Option Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Player Option ID",
					tableFieldDescription: "Associated player option ID",
					formFieldDescription: "Select the player option",
				},
			},
			description: "Records the relationship between crystal and player option equipment",
		},
		_crystalToplayer_special: {
			selfName: "Crystal-Player Special Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Player Special ID",
					tableFieldDescription: "Associated player special ID",
					formFieldDescription: "Select the player special",
				},
			},
			description: "Records the relationship between crystal and player special equipment",
		},
		_crystalToplayer_weapon: {
			selfName: "Crystal-Player Weapon Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Player Weapon ID",
					tableFieldDescription: "Associated player weapon ID",
					formFieldDescription: "Select the player weapon",
				},
			},
			description: "Records the relationship between crystal and player weapon",
		},
		_crystalTospecial: {
			selfName: "Crystal-Special Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Special Equipment ID",
					tableFieldDescription: "Associated special equipment ID",
					formFieldDescription: "Select the special equipment",
				},
			},
			description: "Records the relationship between crystal and special equipment",
		},
		_crystalToweapon: {
			selfName: "Crystal-Weapon Relation",
			fields: {
				A: {
					key: "Crystal ID",
					tableFieldDescription: "Associated crystal ID",
					formFieldDescription: "Select the crystal",
				},
				B: {
					key: "Weapon ID",
					tableFieldDescription: "Associated weapon ID",
					formFieldDescription: "Select the weapon",
				},
			},
			description: "Records the relationship between crystal and weapon",
		},
		_frontRelation: {
			selfName: "Front Relation",
			fields: {
				A: {
					key: "Front Crystal ID",
					tableFieldDescription: "Associated front crystal ID",
					formFieldDescription: "Select front crystal",
				},
				B: {
					key: "Back Crystal ID",
					tableFieldDescription: "Associated back crystal ID",
					formFieldDescription: "Select back crystal",
				},
			},
			description: "Records the front/back relationship between crystals",
		},
		_linkZones: {
			selfName: "Zone Connection",
			fields: {
				A: {
					key: "Zone A ID",
					tableFieldDescription: "Source zone ID",
					formFieldDescription: "Select source zone",
				},
				B: {
					key: "Zone B ID",
					tableFieldDescription: "Target zone ID",
					formFieldDescription: "Select target zone",
				},
			},
			description: "Records the connection between zones",
		},
		_mobTozone: {
			selfName: "Mob-Zone Relation",
			fields: {
				A: {
					key: "Mob ID",
					tableFieldDescription: "Associated mob ID",
					formFieldDescription: "Select the mob",
				},
				B: {
					key: "Zone ID",
					tableFieldDescription: "Associated zone ID",
					formFieldDescription: "Select the zone",
				},
			},
			description: "Records the relationship between mob and zone",
		},
		account: {
			selfName: "Account",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "账号的唯一标识符",
					formFieldDescription: "账号的唯一标识符",
				},
				type: {
					key: "Type",
					tableFieldDescription: "账号的类型",
					formFieldDescription: "选择账号类型",
					enumMap: accountType,
				},
				provider: {
					key: "Provider",
					tableFieldDescription: "账号的提供商",
					formFieldDescription: "选择账号提供商",
				},
				providerAccountId: {
					key: "Provider Account ID",
					tableFieldDescription: "提供商账号的唯一标识符",
					formFieldDescription: "提供商账号的唯一标识符",
				},
				refresh_token: {
					key: "Refresh Token",
					tableFieldDescription: "账号的刷新令牌",
					formFieldDescription: "账号的刷新令牌",
				},
				access_token: {
					key: "Access Token",
					tableFieldDescription: "账号的访问令牌",
					formFieldDescription: "账号的访问令牌",
				},
				expires_at: {
					key: "Expires",
					tableFieldDescription: "令牌的过期时间",
					formFieldDescription: "令牌的过期时间",
				},
				token_type: {
					key: "Token Type",
					tableFieldDescription: "令牌的类型",
					formFieldDescription: "令牌的类型",
				},
				scope: {
					key: "Range",
					tableFieldDescription: "令牌的权限范围",
					formFieldDescription: "令牌的权限范围",
				},
				id_token: {
					key: "ID Token",
					tableFieldDescription: "账号的ID令牌",
					formFieldDescription: "账号的ID令牌",
				},
				session_state: {
					key: "Session State",
					tableFieldDescription: "账号的会话状态",
					formFieldDescription: "账号的会话状态",
				},
				userId: {
					key: "User ID",
					tableFieldDescription: "关联的用户ID",
					formFieldDescription: "选择关联的用户",
				},
			},
			description: "Account information for authentication",
		},
		account_create_data: {
			selfName: "Account Create Data",
			fields: {
				accountId: {
					key: "Account ID",
					tableFieldDescription: "关联的账号ID",
					formFieldDescription: "选择要创建的账号",
				},
			},
			description: "Account creation record",
		},
		account_update_data: {
			selfName: "Account Update Data",
			fields: {
				accountId: {
					key: "Account ID",
					tableFieldDescription: "关联的账号ID",
					formFieldDescription: "选择要更新的账号",
				},
			},
			description: "Account update record",
		},
		activity: {
			selfName: "Activity",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "活动的唯一标识符",
					formFieldDescription: "活动的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "活动的名称",
					formFieldDescription: "请输入活动名称",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "Activity information in the game",
		},
		address: {
			selfName: "Address",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "The database ID of the address. Usually not displayed.",
					formFieldDescription:
						"The database ID of the address. If you are asked to input this, please report it to the developers.",
				},
				name: {
					key: "Name",
					tableFieldDescription: "The name of the address, usually consistent with the in-game name.",
					formFieldDescription: "Please enter the name as it appears in the game.",
				},
				type: {
					key: "Type",
					tableFieldDescription: "The type of address. Divided into normal and limited-time addresses.",
					formFieldDescription: "Please select the type of address.",
					enumMap:  addressType	,
				},
				posX: {
					key: "X Coordinate",
					tableFieldDescription: "The X coordinate of the address.",
					formFieldDescription: "Please enter the X coordinate of the address.",
				},
				posY: {
					key: "Y Coordinate",
					tableFieldDescription: "The Y coordinate of the address.",
					formFieldDescription: "Please enter the Y coordinate of the address.",
				},
				worldId: {
					key: "World",
					tableFieldDescription: "The ID of the world this address belongs to.",
					formFieldDescription: "Please select the world this address belongs to.",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "Address information in the game",
		},
		armor: {
			selfName: "Armor",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "防具的名称",
					formFieldDescription: "请输入防具名称",
				},
				baseAbi: {
					key: "Base DEF",
					tableFieldDescription: "防具的基础防御值",
					formFieldDescription: "请输入基础防御值",
				},
				modifiers: {
					key: "Innate Modifiers",
					tableFieldDescription: "锻造或者掉落时自带的附魔属性",
					formFieldDescription: "锻造或者掉落时自带的附魔属性",
				},
				colorA: {
					key: "Color A",
					tableFieldDescription: "防具的主要颜色",
					formFieldDescription: "选择主要颜色",
				},
				colorB: {
					key: "Color B",
					tableFieldDescription: "防具的次要颜色",
					formFieldDescription: "选择次要颜色",
				},
				colorC: {
					key: "Color C",
					tableFieldDescription: "防具的第三颜色",
					formFieldDescription: "选择第三颜色",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "关联的物品ID",
					formFieldDescription: "选择关联的物品",
				},
			},
			description: "Armor information in the game",
		},
		avatar: {
			selfName: "Avatar",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "头像的唯一标识符",
					formFieldDescription: "头像的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "头像的名称",
					formFieldDescription: "请输入头像名称",
				},
				type: {
					key: "Type",
					tableFieldDescription: "头像的类型",
					formFieldDescription: "选择头像类型",
					enumMap: playerAvatarType,
				},
				modifiers: {
					key: "Modifier Value",
					tableFieldDescription: "头像的属性修正值",
					formFieldDescription: "请输入属性修正值",
				},
				belongToPlayerId: {
					key: "Player ID",
					tableFieldDescription: "关联的玩家ID",
					formFieldDescription: "选择关联的玩家",
				},
			},
			description: "Avatar information",
		},
		character: {
			selfName: "Character",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "The database ID of the character. Usually not displayed.",
					formFieldDescription: "The database ID of the character. If you are asked to input this, please report it to the developers.",
				},
				name: {
					key: "Name",
					tableFieldDescription: "The name of the character, usually consistent with the in-game name.",
					formFieldDescription: "Please enter the name of the character.",
				},
				lv: {
					key: "Level",
					tableFieldDescription: "The level of the character.",
					formFieldDescription: "Please enter the level of the character.",
				},
				str: {
					key: "Strength",
					tableFieldDescription: "The strength of the character.",
					formFieldDescription: "Please enter the strength of the character.",
				},
				int: {
					key: "Intelligence",
					tableFieldDescription: "The intelligence of the character.",
					formFieldDescription: "Please enter the intelligence of the character.",
				},
				vit: {
					key: "Vitality",
					tableFieldDescription: "The vitality of the character.",
					formFieldDescription: "Please enter the vitality of the character.",
				},
				agi: {
					key: "Agility",
					tableFieldDescription: "The agility of the character.",
					formFieldDescription: "Please enter the agility of the character.",
				},
				dex: {
					key: "Dexterity",
					tableFieldDescription: "The dexterity of the character.",
					formFieldDescription: "Please enter the dexterity of the character.",
				},
				personalityType: {
					key: "Personality Type",
					tableFieldDescription: "The personality type of the character.",
					formFieldDescription: "Please select the personality type of the character.",
					enumMap: characterPersonalityType,
				},
				personalityValue: {
					key: "Personality Value",
					tableFieldDescription: "The personality value of the character.",
					formFieldDescription: "Please enter the personality value of the character.",
				},
				weaponId: {
					key: "Weapon ID",
					tableFieldDescription: "The ID of the weapon the character is equipped with.",
					formFieldDescription: "Please select the weapon the character is equipped with.",
				},
				subWeaponId: {
					key: "Sub-Weapon ID",
					tableFieldDescription: "The ID of the sub-weapon the character is equipped with.",
					formFieldDescription: "Please select the sub-weapon the character is equipped with.",
				},
				armorId: {
					key: "Armor ID",
					tableFieldDescription: "The ID of the armor the character is equipped with.",
					formFieldDescription: "Please select the armor the character is equipped with.",
				},
				optionId: {
					key: "Option ID",
					tableFieldDescription: "The ID of the option the character is equipped with.",
					formFieldDescription: "Please select the option the character is equipped with.",
				},
				specialId: {
					key: "Special ID",
					tableFieldDescription: "The ID of the special the character is equipped with.",
					formFieldDescription: "Please select the special the character is equipped with.",
				},
				cooking: {
					key: "Cooking",
					tableFieldDescription: "The cooking of the character.",
					formFieldDescription: "Please enter the cooking of the character.",
				},
				modifiers: {
					key: "Modifiers",
					tableFieldDescription: "The modifiers of the character.",
					formFieldDescription: "Please enter the modifiers of the character.",
				},
				actions: {
					key: "Actions",
					tableFieldDescription: "The actions of the character.",
					formFieldDescription: "Please enter the actions of the character.",
				},
				partnerSkillAId: {
					key: "Partner Skill A ID",
					tableFieldDescription: "The ID of the partner skill A the character is equipped with.",
					formFieldDescription: "Please select the partner skill A the character is equipped with.",
				},
				partnerSkillAType: {
					key: "Partner Skill A Type",
					tableFieldDescription: "The type of the partner skill A the character is equipped with.",
					formFieldDescription: "Please select the type of the partner skill A the character is equipped with.",
					enumMap: partnerSkillType,
				},
				partnerSkillBId: {
					key: "Partner Skill B ID",
					tableFieldDescription: "The ID of the partner skill B the character is equipped with.",
					formFieldDescription: "Please select the partner skill B the character is equipped with.",
				},
				partnerSkillBType: {
					key: "Partner Skill B Type",
					tableFieldDescription: "The type of the partner skill B the character is equipped with.",
					formFieldDescription: "Please select the type of the partner skill B the character is equipped with.",
					enumMap: partnerSkillType,
				},
				belongToPlayerId: {
					key: "Owner ID",
					tableFieldDescription: "The ID of the owner of the character.",
					formFieldDescription: "Please select the owner of the character.",
				},
				details: {
					key: "Details",
					tableFieldDescription: "The details of the character.",
					formFieldDescription: "Please enter the details of the character.",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "The ID of the statistic of the character.",
					formFieldDescription: "Please select the statistic of the character.",
				},
			},
			description: "Character information",
		},
		character_skill: {
			selfName: "Character Skill",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "角色技能的唯一标识符",
					formFieldDescription: "角色技能的唯一标识符",
				},
				lv: {
					key: "Level",
					tableFieldDescription: "角色技能的等级",
					formFieldDescription: "Please enter level",
				},
				isStarGem: {
					key: "Is Star Gem",
					tableFieldDescription: "是否为星石技能",
					formFieldDescription: "是否为星石技能",
				},
				templateId: {
					key: "Skill ID",
					tableFieldDescription: "角色技能的模板ID",
					formFieldDescription: "选择技能模板",
				},
				belongToCharacterId: {
					key: "Character ID",
					tableFieldDescription: "角色技能所属的角色ID",
					formFieldDescription: "Select character",
				},
			},
			description: "Character learned skill information",
		},
		combo: {
			selfName: "Combo",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "连击的唯一标识符",
					formFieldDescription: "连击的唯一标识符",
				},
				disable: {
					key: "Disabled",
					tableFieldDescription: "连击是否禁用",
					formFieldDescription: "是否禁用该连击",
				},
				name: {
					key: "Name",
					tableFieldDescription: "连击的名称",
					formFieldDescription: "请输入连击的名称",
				},
				belongToCharacterId: {
					key: "Character ID",
					tableFieldDescription: "连击所属的角色ID",
					formFieldDescription: "Select character",
				},
			},
			description: "Combo information",
		},
		combo_step: {
			selfName: "Combo Step",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "连击步骤的唯一标识符",
					formFieldDescription: "连击步骤的唯一标识符",
				},
				type: {
					key: "Type",
					tableFieldDescription: "连击步骤的类型",
					formFieldDescription: "选择连击步骤的类型",
					enumMap: comboStepType,
				},
				characterSkillId: {
					key: "Character Skill ID",
					tableFieldDescription: "Character Skill ID",
					formFieldDescription: "选择使用的角色技能",
				},
				belongToComboId: {
					key: "Combo ID",
					tableFieldDescription: "连击步骤所属的连击ID",
					formFieldDescription: "Select combo",
				},
			},
			description: "Combo step information",
		},
		consumable: {
			selfName: "Consumable",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "消耗品的名称",
					formFieldDescription: "请输入消耗品名称",
				},
				type: {
					key: "Type",
					tableFieldDescription: "消耗品类型",
					formFieldDescription: "选择消耗品类型",
					enumMap: consumableType,
				},
				effectDuration: {
					key: "Duration",
					tableFieldDescription: "消耗品效果持续时间",
					formFieldDescription: "请输入消耗品效果持续时间",
				},
				effects: {
					key: "Effect",
					tableFieldDescription: "消耗品效果",
					formFieldDescription: "请输入消耗品效果",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "消耗品所属的道具ID",
					formFieldDescription: "选择消耗品所属的道具",
				},
			},
			description: "Consumable information in the game",
		},
		crystal: {
			selfName: "Crystal",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "锻晶的名称",
					formFieldDescription: "请输入锻晶名称",
				},
				type: {
					key: "Type",
					tableFieldDescription: "锻晶的类型",
					formFieldDescription: "选择锻晶的类型",
					enumMap: crystalType,
				},
				modifiers: {
					key: "Attribute",
					tableFieldDescription: "锻晶的属性",
					formFieldDescription: "请输入锻晶的属性",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "锻晶所属的道具ID",
					formFieldDescription: "选择锻晶所属的道具",
				},
			},
			description: "Crystal information in the game",
		},
		drop_item: {
			selfName: "Drop Item",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "掉落物品的唯一标识符",
					formFieldDescription: "掉落物品的唯一标识符",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "掉落物品的物品ID",
					formFieldDescription: "选择掉落物品的物品",
				},
				probability: {
					key: "Probability",
					tableFieldDescription: "掉落物品的概率",
					formFieldDescription: "请输入掉落物品的概率",
				},
				relatedPartType: {
					key: "Drop Part",
					tableFieldDescription: "掉落物品的掉落部位",
					formFieldDescription: "选择掉落物品的掉落部位",
					enumMap: dropItemRelatedPartType,
				},
				relatedPartInfo: {
					key: "Drop Part Info",
					tableFieldDescription: "掉落物品的掉落部位信息",
					formFieldDescription: "请输入掉落物品的掉落部位信息",
				},
				breakRewardType: {
					key: "Part Break Reward",
					tableFieldDescription: "掉落物品的部位破坏奖励",
					formFieldDescription: "选择掉落物品的部位破坏奖励",
					enumMap: dropItemBreakRewardType,
				},
				belongToMobId: {
					key: "Dropped By",
					tableFieldDescription: "掉落物品的怪物ID",
					formFieldDescription: "选择掉落物品的怪物",
				},
			},
			description: "Monster drop item information",
		},
		image: {
			selfName: "Image",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "图片的唯一标识符",
					formFieldDescription: "图片的唯一标识符",
				},
				dataUrl: {
					key: "Image URL",
					tableFieldDescription: "图片的URL",
					formFieldDescription: "请输入图片的URL",
				},
				belongToNpcId: {
					key: "NPC ID",
					tableFieldDescription: "图片的NPC ID",
					formFieldDescription: "选择图片的NPC",
				},
				weaponId: {
					key: "Weapon ID",
					tableFieldDescription: "图片的武器ID",
					formFieldDescription: "选择图片的武器",
				},
				armorId: {
					key: "Armor ID",
					tableFieldDescription: "图片的防具ID",
					formFieldDescription: "选择图片的防具",
				},
				optionId: {
					key: "Additional Equipment ID",
					tableFieldDescription: "图片的追加装备ID",
					formFieldDescription: "选择图片的追加装备",
				},
				mobId: {
					key: "Mob ID",
					tableFieldDescription: "图片的怪物ID",
					formFieldDescription: "选择图片的怪物",
				},
			},
			description: "Image resource information in the game",
		},
		item: {
			selfName: "Item",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "道具的唯一标识符",
					formFieldDescription: "道具的唯一标识符",
				},
				itemType: {
					key: "Item Type",
					tableFieldDescription: "道具的表类型，这个类型主要用于系统判断",
					formFieldDescription: "一般不需要手动选择，如果看到这个，请给开发人员反馈",
					enumMap: itemType,
				},
				name: {
					key: "Name",
					tableFieldDescription: "道具的名称",
					formFieldDescription: "道具的名称",
				},
				dataSources: {
					key: "Data Source",
					tableFieldDescription: "道具的数据来源",
					formFieldDescription: "道具的数据来源",
				},
				details: {
					key: "详细描述",
					tableFieldDescription: "道具的详细描述",
					formFieldDescription: "道具的详细描述",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "道具的统计ID",
					formFieldDescription: "道具的统计ID",
				},
				updatedByAccountId: {
					key: "最后更新者",
					tableFieldDescription: "道具的最后更新者",
					formFieldDescription: "道具的最后更新者",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "道具的创建者",
					formFieldDescription: "道具的创建者",
				},
				itemSourceType: {
					key: "Item Source Type",
					tableFieldDescription: "The source of the item.",
					formFieldDescription: "The source of the item.",
					enumMap: {
						Mob: "Mob",
						Task: "Task",
						BlacksmithShop: "Blacksmith Shop",
						Player: "Player",
					},
				},
			},
			description: "Item information in the game",
		},
		material: {
			selfName: "Material",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "素材的名称",
					formFieldDescription: "请输入素材名称",
				},
				type: {
					key: "Type",
					tableFieldDescription: "素材的类型",
					formFieldDescription: "选择素材的类型",
					enumMap: materialType,
				},
				ptValue: {
					key: "PT Value",
					tableFieldDescription: "素材的PT值",
					formFieldDescription: "请输入素材的PT值",
				},
				price: {
					key: "Price",
					tableFieldDescription: "素材的价格",
					formFieldDescription: "请输入素材的价格",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "素材所属的道具ID",
					formFieldDescription: "选择素材所属的道具",
				},
			},
			description: "Material information in the game",
		},
		member: {
			selfName: "Member",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "成员的唯一标识符",
					formFieldDescription: "成员的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "成员的名称",
					formFieldDescription: "请输入成员的名称",
				},
				sequence: {
					key: "Order",
					tableFieldDescription: "成员的顺序",
					formFieldDescription: "请输入成员的顺序",
				},
				playerId: {
					key: "Player ID",
					tableFieldDescription: "成员的玩家ID",
					formFieldDescription: "选择成员的玩家",
				},
				partnerId: {
					key: "Partner ID",
					tableFieldDescription: "成员的伙伴ID",
					formFieldDescription: "选择成员的伙伴",
				},
				mercenaryId: {
					key: "Mercenary ID",
					tableFieldDescription: "成员的佣兵ID",
					formFieldDescription: "选择成员的佣兵",
				},
				mobId: {
					key: "Mob ID",
					tableFieldDescription: "成员的怪物ID",
					formFieldDescription: "选择成员的怪物",
				},
				mobDifficultyFlag: {
					key: "Mob Difficulty",
					tableFieldDescription: "成员的怪物难度",
					formFieldDescription: "选择成员的怪物难度",
					enumMap: {
						Easy: "Easy",
						Normal: "Normal",
						Hard: "Hard",
						Lunatic: "Lunatic",
						Ultimate: "Ultimate",
					},
				},
				belongToTeamId: {
					key: "Team ID",
					tableFieldDescription: "成员的队伍ID",
					formFieldDescription: "选择成员的队伍",
				},
				type: {
					key: "Type",
					tableFieldDescription: "The type of the member.",
					formFieldDescription: "The type of the member.",
					enumMap: {
						Player: "Player",
						Partner: "Partner",
						Mercenary: "Mercenary",
						Mob: "Mob",
					},
				},
			},
			description: "Team member information",
		},
		mercenary: {
			selfName: "Mercenary",
			fields: {
				type: {
					key: "Type",
					tableFieldDescription: "佣兵的类型",
					formFieldDescription: "选择佣兵的类型",
					enumMap: mercenaryType,
				},
				templateId: {
					key: "Template Character ID",
					tableFieldDescription: "佣兵的模板角色ID",
					formFieldDescription: "选择模板角色",
				},
				skillAId: {
					key: "Skill A ID",
					tableFieldDescription: "佣兵的技能A ID",
					formFieldDescription: "选择技能A",
				},
				skillAType: {
					key: "Skill A Type",
					tableFieldDescription: "佣兵的技能A类型",
					formFieldDescription: "选择技能A类型",
					enumMap: partnerSkillType,
				},
				skillBId: {
					key: "Skill B ID",
					tableFieldDescription: "佣兵的技能B ID",
					formFieldDescription: "选择技能B",
				},
				skillBType: {
					key: "Skill B Type",
					tableFieldDescription: "佣兵的技能B类型",
					formFieldDescription: "选择技能B类型",
					enumMap: partnerSkillType,
				},
			},
			description: "Mercenary information",
		},
		mob: {
			selfName: "Mob",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "The monster's name, usually consistent with the in-game name.",
					formFieldDescription:
						"Please enter the monster's name as it appears in the game. You don't want others to be confused by your entry, right?",
				},
				id: {
					key: "ID",
					tableFieldDescription: "This is the monster's database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the monster's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
				type: {
					key: "Monster Type",
					tableFieldDescription:
						"Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
					formFieldDescription:
						"Currently, only these types are supported. Although there are many types when unpacking, most are ignored for this application.",
					enumMap: mobType,
				},
				captureable: {
					key: "Capturable",
					tableFieldDescription: `This attribute is only valid for monsters other than ${mobType.Boss} and ${mobType.MiniBoss}. Special monsters like Ganrif and Tangming Phoenix are considered exceptions.`,
					formFieldDescription: `If the monster type is not ${mobType.Mob}, select 'Not Capturable'.`,
				},
				actions: {
					key: "Actions",
					tableFieldDescription:
						"Monster behavior description. The simulator will simulate actions based on this logic.",
					formFieldDescription:
						"Monster behavior description. The simulator will simulate actions based on this logic.",
				},
				baseLv: {
					key: "Base Level",
					tableFieldDescription: `For ${mobType.Boss}, this value represents the level at ${mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this is the actual level.`,
					formFieldDescription: `If the monster type is ${mobType.Boss}, enter the level at ${mobDifficultyFlag.Easy} difficulty. For other monsters, enter the actual level.`,
				},
				experience: {
					key: "Experience",
					tableFieldDescription: `For ${mobType.Boss}, this value represents the experience at ${mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this is the actual experience.`,
					formFieldDescription: `If the monster type is ${mobType.Boss}, enter the experience at ${mobDifficultyFlag.Easy} difficulty. For other monsters, enter the actual experience.`,
				},
				initialElement: {
					key: "Element Attribute",
					tableFieldDescription:
						"This is the initial element. Monsters may change their attributes during battle. Refer to the behavior description for details.",
					formFieldDescription:
						"Enter the monster's initial element here. Attribute changes should be described in the behavior section.",
					enumMap: elementType,
				},
				radius: {
					key: "Radius",
					tableFieldDescription: "The monster's model size, mainly used to calculate whether skills hit.",
					formFieldDescription:
						"The monster's model size, mainly used to calculate whether skills hit. Subtract 1 from the distance displayed on the screen after casting Holy Fist.",
				},
				maxhp: {
					key: "Max HP",
					tableFieldDescription: "No one doesn't know what this means, right? Right?",
					formFieldDescription: `For ${mobType.Boss}, this value represents the HP at ${mobDifficultyFlag.Easy} difficulty. For other monsters without difficulty flags, this value may need to be estimated.`,
				},
				physicalDefense: {
					key: "Physical Defense",
					tableFieldDescription: "Interacts with physical penetration.",
					formFieldDescription: "Interacts with physical penetration.",
				},
				physicalResistance: {
					key: "Physical Resistance",
					tableFieldDescription:
						"This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
					formFieldDescription:
						"This is the most practical physical damage reduction range for monsters. Players can only counteract it with skill constants.",
				},
				magicalDefense: {
					key: "Magical Defense",
					tableFieldDescription: "Interacts with magical penetration.",
					formFieldDescription: "Interacts with magical penetration.",
				},
				magicalResistance: {
					key: "Magical Resistance",
					tableFieldDescription:
						"This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
					formFieldDescription:
						"This is the most practical magical damage reduction range for monsters. Players can only counteract it with skill constants.",
				},
				criticalResistance: {
					key: "Critical Resistance",
					tableFieldDescription:
						"For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
					formFieldDescription:
						"For magical damage, the critical rate is (Physical Critical Rate * Spell Critical Conversion Rate) - this value.",
				},
				avoidance: {
					key: "Avoidance",
					tableFieldDescription: "Interacts with accuracy to determine whether physical attacks hit.",
					formFieldDescription: "Interacts with accuracy to determine whether physical attacks hit.",
				},
				dodge: {
					key: "Dodge Rate",
					tableFieldDescription: "When attacked, this value determines whether the attack hits.",
					formFieldDescription: "When attacked, this value determines whether the attack hits.",
				},
				block: {
					key: "Block Rate",
					tableFieldDescription: "When attacked, this value determines whether the attack is blocked.",
					formFieldDescription: "When attacked, this value determines whether the attack is blocked.",
				},
				normalDefExp: {
					key: "Normal Damage Inertia Modifier",
					tableFieldDescription: "The change in normal inertia each time damage is taken.",
					formFieldDescription: "The change in normal inertia each time damage is taken.",
				},
				physicDefExp: {
					key: "Physical Damage Inertia Modifier",
					tableFieldDescription: "The change in physical inertia each time damage is taken.",
					formFieldDescription: "The change in physical inertia each time damage is taken.",
				},
				magicDefExp: {
					key: "Magical Damage Inertia Modifier",
					tableFieldDescription: "The change in magical inertia each time damage is taken.",
					formFieldDescription: "The change in magical inertia each time damage is taken.",
				},
				partsExperience: {
					key: "Parts Experience",
					tableFieldDescription: `Only ${mobType.Boss} has this value. When a part is destroyed, total experience gained increases by this amount.`,
					formFieldDescription: `Only ${mobType.Boss} has this value. When a part is destroyed, total experience gained increases by this amount.`,
				},
				details: {
					key: "Additional Notes",
					tableFieldDescription: "Anything the editor wants to add.",
					formFieldDescription: "Other things you want to tell readers.",
				},
				dataSources: {
					key: "Data Sources",
					tableFieldDescription: "The person or organization that measured this data.",
					formFieldDescription: "The person or organization that measured this data.",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "This is the monster's statistics database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the monster's statistics database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
				updatedByAccountId: {
					key: "Updated By Account ID",
					tableFieldDescription: "This is the monster's updater database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the monster's updater database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
				createdByAccountId: {
					key: "Created By Account ID",
					tableFieldDescription: "This is the monster's creator database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the monster's creator database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
			},
			description: "Mob information in the game",
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
					key: "Name",
					tableFieldDescription: "npc的名称，通常和游戏内一致，通常...",
					formFieldDescription: "npc的名称，请填写和游戏内一致的翻译。你也不想大伙看到你写的东西之后一脸懵逼是吧。",
				},
				zoneId: {
					key: "Appearing Zone",
					tableFieldDescription: "npc站着的地方啦，比如某某街道第三区域啥的",
					formFieldDescription: "npc站着的地方啦，比如某某街道第三区域啥的",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "NPC information in the game",
		},
		option: {
			selfName: "Option Equipment",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "追加装备的名称",
					formFieldDescription: "请输入追加装备名称",
				},
				baseAbi: {
					key: "Base DEF",
					tableFieldDescription: "Base DEF",
					formFieldDescription: "Base DEF",
				},
				modifiers: {
					key: "Innate Modifiers",
					tableFieldDescription: "掉落时或者锻造时自带的附魔属性",
					formFieldDescription: "掉落时或者锻造时自带的附魔属性",
				},
				colorA: {
					key: "Color A",
					tableFieldDescription: "颜色A",
					formFieldDescription: "颜色A",
				},
				colorB: {
					key: "Color B",
					tableFieldDescription: "颜色B",
					formFieldDescription: "颜色B",
				},
				colorC: {
					key: "Color C",
					tableFieldDescription: "颜色C",
					formFieldDescription: "颜色C",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "所属道具ID",
					formFieldDescription: "所属道具ID",
				},
			},
			description: "Option equipment information in the game",
		},
		player: {
			selfName: "Player",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				name: {
					key: "Name",
					tableFieldDescription: "玩家的名称",
					formFieldDescription: "请输入玩家名称",
				},
				useIn: {
					key: "Used In",
					tableFieldDescription: "玩家用于什么场景",
					formFieldDescription: "选择使用场景",
				},
				belongToAccountId: {
					key: "Account ID",
					tableFieldDescription: "玩家所属的账号ID",
					formFieldDescription: "选择所属账号",
				},
			},
			description: "Player information",
		},
		player_armor: {
			selfName: "Player Armor",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "防具的ID",
					formFieldDescription: "防具的ID",
				},
				name: {
					key: "Name",
					tableFieldDescription: "防具的名称",
					formFieldDescription: "防具的名称",
				},
				baseAbi: {
					key: "Base DEF",
					tableFieldDescription: "防具的基础防御值",
					formFieldDescription: "防具的基础防御值",
				},
				extraAbi: {
					key: "Extra DEF",
					tableFieldDescription: "防具的额外防御值",
					formFieldDescription: "防具的额外防御值",
				},
				ability: {
					key: "Type",
					tableFieldDescription: "防具的类型",
					formFieldDescription: "防具的类型",
					enumMap: playerArmorAbilityType,
				},
				templateId: {
					key: "Template ID",
					tableFieldDescription: "防具的模板ID",
					formFieldDescription: "防具的模板ID",
				},
				refinement: {
					key: "Refinement Level",
					tableFieldDescription: "防具的精炼等级",
					formFieldDescription: "防具的精炼等级",
				},
				modifiers: {
					key: "Modifiers",
					tableFieldDescription: "防具的附魔属性",
					formFieldDescription: "防具的附魔属性",
				},
				belongToPlayerId: {
					key: "Player",
					tableFieldDescription: "防具的所属玩家",
					formFieldDescription: "防具的所属玩家",
				},
			},
			description: "Player armor information",
		},
		player_option: {
			selfName: "Player Option",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "追加装备的ID",
					formFieldDescription: "追加装备的ID",
				},
				name: {
					key: "Name",
					tableFieldDescription: "追加装备的名称",
					formFieldDescription: "追加装备的名称",
				},
				extraAbi: {
					key: "Extra DEF",
					tableFieldDescription: "追加装备的额外防御值",
					formFieldDescription: "追加装备的额外防御值",
				},
				templateId: {
					key: "Template ID",
					tableFieldDescription: "追加装备的模板ID",
					formFieldDescription: "追加装备的模板ID",
				},
				refinement: {
					key: "Refinement Level",
					tableFieldDescription: "追加装备的精炼等级",
					formFieldDescription: "追加装备的精炼等级",
				},
				belongToPlayerId: {
					key: "Player",
					tableFieldDescription: "追加装备的所属玩家",
					formFieldDescription: "追加装备的所属玩家",
				},
				baseAbi: {
					key: "Base DEF",
					tableFieldDescription: "追加装备的基础防御值",
					formFieldDescription: "追加装备的基础防御值",
				},
				modifiers: {
					key: "Modifiers",
					tableFieldDescription: "追加装备的附魔属性",
					formFieldDescription: "追加装备的附魔属性",
				},
			},
			description: "Player option equipment information",
		},
		player_pet: {
			selfName: "Player Pet",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "宠物的ID",
					formFieldDescription: "宠物的ID",
				},
				templateId: {
					key: "Template ID",
					tableFieldDescription: "宠物的模板ID",
					formFieldDescription: "宠物的模板ID",
				},
				name: {
					key: "Name",
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
					key: "STR",
					tableFieldDescription: "宠物的力量",
					formFieldDescription: "宠物的力量",
				},
				int: {
					key: "INT",
					tableFieldDescription: "宠物的智力",
					formFieldDescription: "宠物的智力",
				},
				vit: {
					key: "耐力",
					tableFieldDescription: "宠物的耐力",
					formFieldDescription: "宠物的耐力",
				},
				agi: {
					key: "AGI",
					tableFieldDescription: "宠物的敏捷",
					formFieldDescription: "宠物的敏捷",
				},
				dex: {
					key: "DEX",
					tableFieldDescription: "宠物的灵巧",
					formFieldDescription: "宠物的灵巧",
				},
				weaponType: {
					key: "Weapon Type",
					tableFieldDescription: "宠物的武器类型",
					formFieldDescription: "宠物的武器类型",
					enumMap: mainWeaponType,
				},
				personaType: {
					key: "Personality",
					tableFieldDescription: "宠物的性格",
					formFieldDescription: "宠物的性格",
					enumMap: playerPetPersonaType,
				},
				type: {
					key: "Type",
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
					key: "Max Level",
					tableFieldDescription: "宠物的最大等级",
					formFieldDescription: "宠物的最大等级",
				},
				belongToPlayerId: {
					key: "Player",
					tableFieldDescription: "宠物的所属玩家",
					formFieldDescription: "宠物的所属玩家",
				},
			},
			description: "Player information",
		},
		player_special: {
			selfName: "Player Special",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "特殊装备的ID",
					formFieldDescription: "特殊装备的ID",
				},
				name: {
					key: "Name",
					tableFieldDescription: "特殊装备的名称",
					formFieldDescription: "特殊装备的名称",
				},
				extraAbi: {
					key: "Extra ATK",
					tableFieldDescription: "特殊装备的额外攻击力",
					formFieldDescription: "特殊装备的额外攻击力",
				},
				templateId: {
					key: "Template ID",
					tableFieldDescription: "特殊装备的模板ID",
					formFieldDescription: "特殊装备的模板ID",
				},
				belongToPlayerId: {
					key: "Player",
					tableFieldDescription: "特殊装备的所属玩家",
					formFieldDescription: "特殊装备的所属玩家",
				},
				baseAbi: {
					key: "Base DEF",
					tableFieldDescription: "特殊装备的基础防御力",
					formFieldDescription: "特殊装备的基础防御力",
				},
				modifiers: {
					key: "Modifiers",
					tableFieldDescription: "特殊装备的附魔属性",
					formFieldDescription: "特殊装备的附魔属性",
				},
			},
			description: "Player special equipment information",
		},
		player_weapon: {
			selfName: "Player Weapon",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "武器的唯一标识符",
					formFieldDescription: "武器的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "武器的名称",
					formFieldDescription: "武器的名称",
				},
				baseAbi: {
					key: "Base Stats",
					tableFieldDescription: "武器的基础属性",
					formFieldDescription: "武器的基础属性",
				},
				stability: {
					key: "Stability",
					tableFieldDescription: "武器的稳定率",
					formFieldDescription: "武器的稳定率",
				},
				extraAbi: {
					key: "Extra ATK",
					tableFieldDescription: "武器的额外攻击力",
					formFieldDescription: "武器的额外攻击力",
				},
				templateId: {
					key: "Template ID",
					tableFieldDescription: "武器的模板ID",
					formFieldDescription: "武器的模板ID",
				},
				refinement: {
					key: "Refinement Level",
					tableFieldDescription: "武器的精炼等级",
					formFieldDescription: "武器的精炼等级",
				},
				modifiers: {
					key: "Modifiers",
					tableFieldDescription: "武器的附魔属性",
					formFieldDescription: "武器的附魔属性",
				},
				belongToPlayerId: {
					key: "Player",
					tableFieldDescription: "武器的所属玩家",
					formFieldDescription: "武器的所属玩家",
				},
				type: {
					key: "Type",
					tableFieldDescription: "The type of the weapon.",
					formFieldDescription: "The type of the weapon.",
					enumMap: weaponType,
				},
				elementType: {
					key: "Element Type",
					tableFieldDescription: "The element type of the weapon.",
					formFieldDescription: "The element type of the weapon.",
					enumMap: elementType,
				},
			},
			description: "Player custom weapon information",
		},
		post: {
			selfName: "Post",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "帖子的唯一标识符",
					formFieldDescription: "帖子的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "帖子的名称",
					formFieldDescription: "请输入帖子名称",
				},
				createdAt: {
					key: "Creation Time",
					tableFieldDescription: "帖子的创建时间",
					formFieldDescription: "请输入帖子的创建时间",
				},
				updatedAt: {
					key: "Update Time",
					tableFieldDescription: "帖子的更新时间",
					formFieldDescription: "请输入帖子的更新时间",
				},
				createdById: {
					key: "Created By",
					tableFieldDescription: "帖子的创建者ID",
					formFieldDescription: "选择创建者",
				},
			},
			description: "Post information",
		},
		recipe: {
			selfName: "Recipe",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "配方的唯一标识符",
					formFieldDescription: "配方的唯一标识符",
				},
				itemId: {
					key: "Item",
					tableFieldDescription: "所属道具",
					formFieldDescription: "所属道具",
				},
				activityId: {
					key: "Activity",
					tableFieldDescription: "所属活动",
					formFieldDescription: "所属活动",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "Recipe information in the game",
		},
		recipe_ingredient: {
			selfName: "Recipe Ingredient",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "配方的材料的唯一标识符",
					formFieldDescription: "配方的材料的唯一标识符",
				},
				count: {
					key: "Count",
					tableFieldDescription: "Count",
					formFieldDescription: "Count",
				},
				type: {
					key: "Type",
					tableFieldDescription: "Type",
					formFieldDescription: "Type",
					enumMap: recipeIngredientType,
				},
				itemId: {
					key: "Corresponding Item",
					tableFieldDescription: "对应道具",
					formFieldDescription: "对应道具",
				},
				recipeId: {
					key: "Recipe",
					tableFieldDescription: "所属配方",
					formFieldDescription: "所属配方",
				},
			},
			description: "Recipe ingredient information",
		},
		session: {
			selfName: "Session",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "会话的唯一标识符",
					formFieldDescription: "会话的唯一标识符",
				},
				sessionToken: {
					key: "Session Token",
					tableFieldDescription: "会话的令牌",
					formFieldDescription: "请输入会话令牌",
				},
				expires: {
					key: "Expires",
					tableFieldDescription: "会话的过期时间",
					formFieldDescription: "请输入会话过期时间",
				},
				userId: {
					key: "User ID",
					tableFieldDescription: "会话关联的用户ID",
					formFieldDescription: "选择关联的用户",
				},
			},
			description: "Session information",
		},
		simulator: {
			selfName: "Simulator",
			fields: {
				id: {
					key: "Simulator ID",
					tableFieldDescription: "模拟器的唯一标识符",
					formFieldDescription: "模拟器的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "模拟器的名称",
					formFieldDescription: "请输入模拟器的名称",
				},
				details: {
					key: "Details",
					tableFieldDescription: "模拟器的详情",
					formFieldDescription: "请输入模拟器的详情",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此模拟器的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此模拟器的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "Simulator information",
		},
		skill: {
			selfName: "Skill",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "This is the skill's database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the skill's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
				name: {
					key: "Name",
					tableFieldDescription: "The skill's name, usually consistent with the in-game name.",
					formFieldDescription:
						"Please enter the skill name as it appears in the game. You don't want others to be confused by your entry, right?",
				},
				treeType: {
					key: "Skill Tree",
					tableFieldDescription:
						"The top-level classification of the skill, such as Magic Skills, Dark Power, Support Skills, Warrior, etc.",
					formFieldDescription:
						"The top-level classification of the skill, such as Magic Skills, Dark Power, Support Skills, Warrior, etc.",
					enumMap: skillTreeType,
				},
				posX: {
					key: "Horizontal Position",
					tableFieldDescription: "Position in the skill tree, with the leftmost column defined as column 0",
					formFieldDescription: "Position in the skill tree, with the leftmost column defined as column 0",
				},
				posY: {
					key: "Vertical Position",
					tableFieldDescription: "Position in the skill tree, with the topmost skill in column 0 defined as row 0",
					formFieldDescription: "Position in the skill tree, with the topmost skill in column 0 defined as row 0",
				},
				tier: {
					key: "Tier",
					tableFieldDescription: "Mainly used to calculate mercenary skill cooldown intervals",
					formFieldDescription: "Mainly used to calculate mercenary skill cooldown intervals",
				},
				targetType: {
					key: "Target Type",
					tableFieldDescription: `Skills that can be cast without selecting a target are ${skillTargetType.Self}, skills that can target ${skillTargetType.Player} are ${skillTargetType.Player}.`,
					formFieldDescription: `Skills that can be cast without selecting a target are ${skillTargetType.Self}, skills that can target ${skillTargetType.Player} are ${skillTargetType.Player}.`,
					enumMap: skillTargetType,
				},
				chargingType: {
					key: "Casting Type",
					tableFieldDescription: `Skills unaffected by chanting are all ${skillChargingType.Reservoir}.`,
					formFieldDescription: `Skills unaffected by chanting are all ${skillChargingType.Reservoir}.`,
					enumMap: skillChargingType,
				},
				distanceType: {
					key: "Distance Power Type",
					tableFieldDescription: "Indicates which types of distance power affect this skill",
					formFieldDescription: "Indicates which types of distance power affect this skill",
					enumMap: skillDistanceType,
				},
				isPassive: {
					key: "Is Passive",
					tableFieldDescription: "Skills that take effect immediately upon learning are passive skills",
					formFieldDescription: "Skills that take effect immediately upon learning are passive skills",
				},
				details: {
					key: "Additional Notes",
					tableFieldDescription: "Anything the editor wants to add",
					formFieldDescription: "Other things you want to tell readers",
				},
				dataSources: {
					key: "Data Sources",
					tableFieldDescription: "The person or organization that measured this data",
					formFieldDescription: "The person or organization that measured this data",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "This is the statistics database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the statistics database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
				preSkillId: {
					key: "Prerequisite Skill ID",
					tableFieldDescription: "前置技能",
					formFieldDescription: "前置技能",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "This is the updater's database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the updater's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "This is the creator's database ID. Generally, you shouldn't see this.",
					formFieldDescription:
						"This is the creator's database ID. If you are asked to input this, please report it to the developers. This is not normal.",
				},
			},
			description: "Skill information in the game",
		},
		skill_variant: {
			selfName: "Skill Effect",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "技能效果的唯一标识符",
					formFieldDescription: "技能效果的唯一标识符",
				},
				targetMainWeaponType: {
					key: "Main Weapon Type",
					tableFieldDescription: "此技能变体需要什么武器才能生效",
					formFieldDescription: "此技能变体需要什么武器才能生效",
					enumMap: mainHandTypeLimit,
				},
				targetSubWeaponType: {
					key: "Sub Weapon Type",
					tableFieldDescription: "此技能变体需要什么副武器才能生效",
					formFieldDescription: "此技能变体需要什么副武器才能生效",
					enumMap: subHandTypeLimit,
				},
				targetArmorAbilityType: {
					key: "Armor Type",
					tableFieldDescription: "此技能变体需要什么身体装备能力才能生效",
					formFieldDescription: "此技能变体需要什么身体装备能力才能生效",
					enumMap: playerArmorAbilityTypeLimit,
				},
				activeEffect: {
					key: "Active Effect",
					tableFieldDescription: "主动效果",
					formFieldDescription: "主动效果",
				},
				passiveEffects: {
					key: "Passive Effect",
					tableFieldDescription: "被动效果",
					formFieldDescription: "被动效果",
				},
				buffs: {
					key: "Buff Effect",
					tableFieldDescription: "Buff效果",
					formFieldDescription: "Buff效果",
				},
				elementLogic: {
					key: "Element Logic",
					tableFieldDescription: "伤害属性的判断逻辑",
					formFieldDescription: "伤害属性的判断逻辑",
				},
				castingRange: {
					key: "Casting Range",
					tableFieldDescription: "施法范围",
					formFieldDescription: "施法范围",
				},
				effectiveRange: {
					key: "Skill Range",
					tableFieldDescription: "技能作用范围",
					formFieldDescription: "技能作用范围",
				},
				motionFixed: {
					key: "Fixed Animation Frames",
					tableFieldDescription: "固定动画帧",
					formFieldDescription: "固定动画帧",
				},
				motionModified: {
					key: "Acceleratable Animation Frames",
					tableFieldDescription: "可加速动画帧",
					formFieldDescription: "可加速动画帧",
				},
				chantingFixed: {
					key: "Fixed Chanting Time",
					tableFieldDescription: "固定咏唱时间",
					formFieldDescription: "固定咏唱时间",
				},
				chantingModified: {
					key: "Acceleratable Chanting Time",
					tableFieldDescription: "可加速咏唱时间",
					formFieldDescription: "可加速咏唱时间",
				},
				reservoirFixed: {
					key: "Fixed Charging Time",
					tableFieldDescription: "固定蓄力时间",
					formFieldDescription: "固定蓄力时间",
				},
				reservoirModified: {
					key: "Acceleratable Charging Time",
					tableFieldDescription: "可加速蓄力时间",
					formFieldDescription: "可加速蓄力时间",
				},
				startupFrames: {
					key: "Startup Frames",
					tableFieldDescription: "技能前摇",
					formFieldDescription: "技能前摇",
				},
				hpCost: {
					key: "HP Cost",
					tableFieldDescription: "HP Cost",
					formFieldDescription: "HP Cost",
				},
				mpCost: {
					key: "MP Cost",
					tableFieldDescription: "MP Cost",
					formFieldDescription: "MP Cost",
				},
				description: {
					key: "Effect Description",
					tableFieldDescription: "效果描述",
					formFieldDescription: "效果描述",
				},
				details: {
					key: "Extra Notes",
					tableFieldDescription: "额外说明",
					formFieldDescription: "额外说明",
				},
				belongToskillId: {
					key: "Skill",
					tableFieldDescription: "所属技能",
					formFieldDescription: "所属技能",
				},
			},
			description: "Skill variant information",
		},
		special: {
			selfName: "Special Equipment",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "特殊装备的名称",
					formFieldDescription: "请输入特殊装备名称",
				},
				baseAbi: {
					key: "Base DEF",
					tableFieldDescription: "Base DEF",
					formFieldDescription: "Base DEF",
				},
				modifiers: {
					key: "Innate Modifiers",
					tableFieldDescription: "锻造时或者掉落时自带的附魔属性",
					formFieldDescription: "锻造时或者掉落时自带的附魔属性",
				},
				itemId: {
					key: "Item ID",
					tableFieldDescription: "所属道具ID",
					formFieldDescription: "所属道具ID",
				},
			},
			description: "Special equipment information in the game",
		},
		statistic: {
			selfName: "Statistic",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "统计信息的唯一标识符",
					formFieldDescription: "统计信息的唯一标识符",
				},
				updatedAt: {
					key: "Update Time",
					tableFieldDescription: "统计信息的更新时间",
					formFieldDescription: "Please enter update time",
				},
				createdAt: {
					key: "Creation Time",
					tableFieldDescription: "统计信息的创建时间",
					formFieldDescription: "Please enter creation time",
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
			description: "Statistics tracking fields",
		},
		task: {
			selfName: "Task",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				lv: {
					key: "Level",
					tableFieldDescription: "承接任务时，如果角色低于此等级，则无法承接任务",
					formFieldDescription: "承接任务时，如果角色低于此等级，则无法承接任务",
				},
				name: {
					key: "Name",
					tableFieldDescription: "任务名称",
					formFieldDescription: "任务名称",
				},
				type: {
					key: "Type",
					tableFieldDescription: "任务类型",
					formFieldDescription: "任务类型",
					enumMap: taskType,
				},
				description: {
					key: "Description",
					tableFieldDescription: "任务描述",
					formFieldDescription: "任务描述",
				},
				belongToNpcId: {
					key: "NPC",
					tableFieldDescription: "任务所属的NPC",
					formFieldDescription: "任务所属的NPC",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "Task information in the game",
		},
		task_collect_require: {
			selfName: "Task Collect Require",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				count: {
					key: "Count",
					tableFieldDescription: "需要收集的数量",
					formFieldDescription: "需要收集的数量",
				},
				itemId: {
					key: "Item",
					tableFieldDescription: "所属道具",
					formFieldDescription: "所属道具",
				},
				belongToTaskId: {
					key: "Task",
					tableFieldDescription: "所属任务",
					formFieldDescription: "所属任务",
				},
			},
			description: "Task collection requirements",
		},
		task_kill_requirement: {
			selfName: "Task Kill Require",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				mobId: {
					key: "Kill Required Mobs",
					tableFieldDescription: "需要击杀的怪物",
					formFieldDescription: "需要击杀的怪物",
				},
				count: {
					key: "Count",
					tableFieldDescription: "需要击杀的数量",
					formFieldDescription: "需要击杀的数量",
				},
				belongToTaskId: {
					key: "Task",
					tableFieldDescription: "所属任务",
					formFieldDescription: "所属任务",
				},
			},
			description: "Task kill requirements",
		},
		task_reward: {
			selfName: "Task Reward",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID",
				},
				type: {
					key: "Type",
					tableFieldDescription: "奖励类型",
					formFieldDescription: "奖励类型",
					enumMap: taskRewardType,
				},
				value: {
					key: "Count",
					tableFieldDescription: "奖励数量",
					formFieldDescription: "奖励数量",
				},
				probability: {
					key: "Probability",
					tableFieldDescription: "奖励概率",
					formFieldDescription: "奖励概率",
				},
				itemId: {
					key: "奖励道具",
					tableFieldDescription: "奖励道具",
					formFieldDescription: "奖励道具",
				},
				belongToTaskId: {
					key: "Task",
					tableFieldDescription: "所属任务",
					formFieldDescription: "所属任务",
				},
			},
			description: "Task reward information",
		},
		team: {
			selfName: "Team",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "队伍的唯一标识符",
					formFieldDescription: "队伍的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "队伍的名称",
					formFieldDescription: "请输入队伍名称",
				},
				gems: {
					key: "宝石",
					tableFieldDescription: "队伍的宝石配置",
					formFieldDescription: "请输入队伍的宝石配置",
				},
			},
			description: "Team information",
		},
		user: {
			selfName: "User",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "用户的唯一标识符",
					formFieldDescription: "用户的唯一标识符",
				},
				name: {
					key: "Name",
					tableFieldDescription: "用户的名称",
					formFieldDescription: "请输入用户名称",
				},
				email: {
					key: "Email",
					tableFieldDescription: "用户的邮箱",
					formFieldDescription: "请输入用户邮箱",
				},
				emailVerified: {
					key: "Email Verified",
					tableFieldDescription: "邮箱是否已验证",
					formFieldDescription: "邮箱是否已验证",
				},
				password: {
					key: "Password",
					tableFieldDescription: "用户的密码",
					formFieldDescription: "请输入用户密码",
				},
				image: {
					key: "Avatar",
					tableFieldDescription: "用户的头像URL",
					formFieldDescription: "请输入用户的头像URL",
				},
			},
			description: "User information",
		},
		verification_token: {
			selfName: "Verification Token",
			fields: {
				identifier: {
					key: "Identifier",
					tableFieldDescription: "验证令牌的标识符",
					formFieldDescription: "请输入验证令牌的标识符",
				},
				token: {
					key: "Token",
					tableFieldDescription: "验证令牌的值",
					formFieldDescription: "请输入验证令牌的值",
				},
				expires: {
					key: "Expires",
					tableFieldDescription: "验证令牌的过期时间",
					formFieldDescription: "请输入验证令牌的过期时间",
				},
			},
			description: "Verification token information",
		},
		weapon: {
			selfName: "Weapon",
			fields: {
				name: {
					key: "Name",
					tableFieldDescription: "武器的名称",
					formFieldDescription: "请输入武器名称",
				},
				type: {
					key: "Type",
					tableFieldDescription: "武器的类型",
					formFieldDescription: "武器的类型",
					enumMap: weaponType,
				},
				baseAbi: {
					key: "Base ATK",
					tableFieldDescription: "武器的基础攻击力",
					formFieldDescription: "武器的基础攻击力",
				},
				stability: {
					key: "Stability",
					tableFieldDescription: "武器的稳定率",
					formFieldDescription: "武器的稳定率",
				},
				modifiers: {
					key: "Innate Modifiers",
					tableFieldDescription: "武器自带的附魔属性",
					formFieldDescription: "武器自带的附魔属性",
				},
				colorA: {
					key: "Color A",
					tableFieldDescription: "武器的颜色A",
					formFieldDescription: "武器的颜色A",
				},
				colorB: {
					key: "Color B",
					tableFieldDescription: "武器的颜色B",
					formFieldDescription: "武器的颜色B",
				},
				colorC: {
					key: "Color C",
					tableFieldDescription: "武器的颜色C",
					formFieldDescription: "武器的颜色C",
				},
				elementType: {
					key: "Element Type",
					tableFieldDescription: "武器的固有元素属性，即附魔时属性觉醒时耗费魔素较少的那个属性",
					formFieldDescription: "武器的固有元素属性，即附魔时属性觉醒时耗费魔素较少的那个属性",
					enumMap: elementType,
				},
				itemId: {
					key: "Item",
					tableFieldDescription: "武器所属的物品",
					formFieldDescription: "武器所属的物品",
				},
			},
			description: "Weapon information in the game",
		},
		world: {
			selfName: "World",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "世界的唯一标识符",
					formFieldDescription: "世界的唯一标识符，由系统自动生成",
				},
				name: {
					key: "Name",
					tableFieldDescription: "世界的名称",
					formFieldDescription: "世界的名称",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "World information in the game",
		},
		zone: {
			selfName: "Zone",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "Unique identifier of the zone",
					formFieldDescription: "Unique identifier of the zone, automatically generated by the system",
				},
				name: {
					key: "Name",
					tableFieldDescription: "Name of the zone",
					formFieldDescription: "Please enter the name of the zone",
				},
				rewardNodes: {
					key: "Reward Nodes",
					tableFieldDescription: "Number of reward nodes in the zone",
					formFieldDescription: "Please enter the number of reward nodes in the zone",
				},
				activityId: {
					key: "Activity ID",
					tableFieldDescription: "ID of the activity this zone belongs to",
					formFieldDescription: "Select the activity this zone belongs to",
				},
				addressId: {
					key: "Map ID",
					tableFieldDescription: "ID of the map this zone belongs to",
					formFieldDescription: "Select the map this zone belongs to",
				},
				statisticId: {
					key: "Statistic ID",
					tableFieldDescription: "关联的统计信息",
					formFieldDescription: "选择关联的统计信息",
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新此记录的账号",
					formFieldDescription: "选择更新者账号",
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建此记录的账号",
					formFieldDescription: "选择创建者账号",
				},
			},
			description: "Information about zones in the game, including name, linked zones, reward nodes, etc.",
		},
		character_registlet: {
			selfName: "Character Registlet",
			description: "Registlet information equipped by the character",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "ID",
					formFieldDescription: "ID"
				},
				level: {
					key: "Level",
					tableFieldDescription: "角色佩戴的雷吉斯托环的等级",
					formFieldDescription: "Please enter level"
				},
				templateId: {
					key: "Registlet",
					tableFieldDescription: "角色佩戴的雷吉斯托环的ID",
					formFieldDescription: "选择角色佩戴的雷吉斯托环"
				},
				belongToCharacterId: {
					key: "Character",
					tableFieldDescription: "角色佩戴的雷吉斯托环所属的角色ID",
					formFieldDescription: "选择角色"
				}
			}
		},
		registlet: {
			selfName: "Registlet",
			description: "Registlet information in the game",
			fields: {
				id: {
					key: "ID",
					tableFieldDescription: "雷吉斯托环的唯一标识符",
					formFieldDescription: "雷吉斯托环的唯一标识符"
				},
				name: {
					key: "Name",
					tableFieldDescription: "雷吉斯托环的名称",
					formFieldDescription: "请输入雷吉斯托环的名称"
				},
				maxLevel: {
					key: "Max Level",
					tableFieldDescription: "雷吉斯托环的最大等级",
					formFieldDescription: "请输入最大等级"
				},
				attrModifiers: {
					key: "Attribute Modifiers",
					tableFieldDescription: "雷吉斯托环的属性修正",
					formFieldDescription: "请输入属性修正"
				},
				pipelinePatches: {
					key: "Pipeline Patches",
					tableFieldDescription: "管道补丁效果",
					formFieldDescription: "请配置管道补丁效果"
				},
				skillBranchActivators: {
					key: "Skill Branch Activators",
					tableFieldDescription: "技能分支激活效果",
					formFieldDescription: "请配置技能分支激活效果"
				},
				updatedByAccountId: {
					key: "Updated By",
					tableFieldDescription: "最后更新者",
					formFieldDescription: "选择更新者账号"
				},
				createdByAccountId: {
					key: "Created By",
					tableFieldDescription: "创建者",
					formFieldDescription: "选择创建者账号"
				},
				subscriptions: {
					key: "Event Subscriptions",
					tableFieldDescription: "事件订阅效果",
					formFieldDescription: "请配置事件订阅效果"
				},
				thresholdWatchers: {
					key: "Threshold Watchers",
					tableFieldDescription: "阈值监视效果",
					formFieldDescription: "请配置阈值监视效果"
				}
			}
		}
	},
};

export default dictionary;
