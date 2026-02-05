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
			selfName: "Account",
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
					enumMap: accountType,
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
			selfName: "Account Create Data",
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
			selfName: "Account Update Data",
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
			selfName: "Activity",
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
			selfName: "Armor",
			fields: {
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
			description: "",
		},
		avatar: {
			selfName: "Avatar",
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
					enumMap: playerAvatarType,
				},
				modifiers: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				belongToPlayerId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		character: {
			selfName: "Character",
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
					enumMap: characterPersonalityType,
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
				optionId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				specialId: {
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
					enumMap: partnerSkillType,
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
					enumMap: partnerSkillType,
				},
				belongToPlayerId: {
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
			selfName: "Character Skill",
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
				belongToCharacterId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		combo: {
			selfName: "Combo",
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
				belongToCharacterId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		combo_step: {
			selfName: "Combo Step",
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
					enumMap: comboStepType,
				},
				characterSkillId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				belongToComboId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		consumable: {
			selfName: "Consumable",
			fields: {
				name: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				type: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: consumableType,
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
			description: "",
		},
		crystal: {
			selfName: "Crystal",
			fields: {
				name: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				type: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: crystalType,
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
			selfName: "Drop Item",
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
					enumMap: dropItemRelatedPartType,
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
					enumMap: dropItemBreakRewardType,
				},
				belongToMobId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		image: {
			selfName: "Image",
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
				belongToNpcId: {
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
				optionId: {
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
			selfName: "Item",
			fields: {
				id: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				itemType: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: itemType,
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
			description: "",
		},
		material: {
			selfName: "Material",
			fields: {
				name: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				type: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: materialType,
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
			description: "",
		},
		member: {
			selfName: "Member",
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
						Easy: "Easy",
						Normal: "Normal",
						Hard: "Hard",
						Lunatic: "Lunatic",
						Ultimate: "Ultimate",
					},
				},
				belongToTeamId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				actions: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
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
			description: "",
		},
		mercenary: {
			selfName: "Mercenary",
			fields: {
				type: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: mercenaryType,
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
					enumMap: partnerSkillType,
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
					enumMap: partnerSkillType,
				},
			},
			description: "",
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
			selfName: "Option Equipment",
			fields: {
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
			description: "",
		},
		player: {
			selfName: "Player",
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
				belongToAccountId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		player_armor: {
			selfName: "Player Armor",
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
					enumMap: playerArmorAbilityType,
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
				belongToPlayerId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		player_option: {
			selfName: "Player Option",
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
				belongToPlayerId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				baseAbi: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				modifiers: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		player_pet: {
			selfName: "Player Pet",
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
					enumMap: mainWeaponType,
				},
				personaType: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: playerPetPersonaType,
				},
				type: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: playerPetType,
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
				belongToPlayerId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		player_special: {
			selfName: "Player Special",
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
				belongToPlayerId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				baseAbi: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				modifiers: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		player_weapon: {
			selfName: "Player Weapon",
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
				belongToPlayerId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
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
			description: "",
		},
		post: {
			selfName: "Post",
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
			selfName: "Recipe",
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
			selfName: "Recipe Ingredient",
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
					enumMap: recipeIngredientType,
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
			selfName: "Session",
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
			selfName: "Simulator",
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
			description: "",
		},
		skill_variant: {
			selfName: "Skill Effect",
			fields: {
				id: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				targetMainWeaponType: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: mainHandType,
				},
				targetSubWeaponType: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: subHandType,
				},
				targetArmorAbilityType: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: playerArmorAbilityType,
				},
				activeEffect: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				passiveEffects: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				buffs: {
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
				hpCost: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				mpCost: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				description: {
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
			selfName: "Special Equipment",
			fields: {
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
			selfName: "Statistic",
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
			selfName: "Task",
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
					enumMap: taskType,
				},
				description: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				belongToNpcId: {
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
			selfName: "Task Collect Require",
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
				belongToTaskId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		task_kill_requirement: {
			selfName: "Task Kill Require",
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
				belongToTaskId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		task_reward: {
			selfName: "Task Reward",
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
					enumMap: taskRewardType,
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
				belongToTaskId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		team: {
			selfName: "Team",
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
			selfName: "User",
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
			selfName: "Verification Token",
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
			selfName: "Weapon",
			fields: {
				name: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
				type: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
					enumMap: weaponType,
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
					enumMap: elementType,
				},
				itemId: {
					key: "",
					tableFieldDescription: "",
					formFieldDescription: "",
				},
			},
			description: "",
		},
		world: {
			selfName: "World",
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
				mobs: "Appearing Monsters",
				npcs: "Appearing NPCs",
			},
			description: "Information about zones in the game, including name, linked zones, reward nodes, etc.",
		},
	},
};

export default dictionary;
