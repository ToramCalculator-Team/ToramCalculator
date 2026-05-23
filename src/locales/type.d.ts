import type { DB } from "@db/generated/zod/index";

export type BaseFieldDetail = {
	key: string;
	tableFieldDescription: string;
	formFieldDescription: string;
};

export type FieldDetail = BaseFieldDetail & {
	/**
	 * Json 字段运行时读取用的宽松嵌套节点字典。
	 * 精确的编辑器补全由 FieldDetailFor<T> 提供；这里保持宽松，方便表单在运行时按路径读取缺失节点。
	 */
	fields?: Record<string, FieldDetail>;
	item?: FieldDetail;
	variants?: Record<string, FieldDetail>;
	enumMap?: Record<string, string>;
};

export type EnumFieldDetail<Enum extends string> = BaseFieldDetail & {
	enumMap: Record<Enum, string>;
};

type IsAny<T> = 0 extends 1 & T ? true : false;

type IsUnknown<T> =
	IsAny<T> extends true ? false : unknown extends T ? ([keyof T] extends [never] ? true : false) : false;

type IsUnion<T, TUnion = T> = IsAny<T> extends true
	? false
	: T extends unknown
		? [TUnion] extends [T]
			? false
			: true
		: false;

/**
 * 判断 T 是否是 string literal union（不是 string 自身，也不是单个 literal）。
 * 单个 literal 常见于 discriminated union 分支内，不强制它提供 enumMap。
 */
type IsStringLiteralUnionOnly<T> = [NonNullable<T>] extends [string]
	? string extends NonNullable<T>
		? false
		: IsUnion<NonNullable<T>>
	: false;

type FieldValue<T, K extends PropertyKey> = T extends unknown ? (K extends keyof T ? T[K] : never) : never;

type KnownDiscriminator = "behaviorKind" | "type";

// 只在对象 union 上识别判别字段；普通对象里的 enum 字段不应该被误当成 variants。
type DiscriminatorKey<T> =
	IsUnion<T> extends true
		? KnownDiscriminator extends infer K extends string
			? K extends keyof T
				? IsStringLiteralUnionOnly<FieldValue<T, K>> extends true
					? K
					: never
				: never
			: never
		: never;

type ObjectFieldDict<T> = {
	[K in Extract<keyof T, string>]-?: FieldDetailFor<FieldValue<T, K>>;
};

type VariantDict<T, D extends keyof T & string> = {
	[Value in Extract<FieldValue<T, D>, string>]-?: FieldDetailFor<Extract<T, Record<D, Value>>>;
};

type HasNestedDictionary<T> =
	IsAny<T> extends true
		? false
		: IsUnknown<T> extends true
			? false
			: IsStringLiteralUnionOnly<T> extends true
				? false
				: NonNullable<T> extends readonly (infer Item)[]
					? HasNestedDictionary<Item>
					: [DiscriminatorKey<NonNullable<T>>] extends [never]
						? NonNullable<T> extends object
							? true
							: false
						: true;

type ArrayFieldDetail<Item> =
	HasNestedDictionary<Item> extends true ? BaseFieldDetail & { item: FieldDetailFor<Item> } : FieldDetail;

/**
 * 递归字段字典结构。
 * 设计目标：用类型把嵌套结构完整暴露给编辑器，让维护字典时可以沿 fields / item / variants 自动补全。
 * unknown / any / 无法静态理解的节点会降级为普通 FieldDetail，避免把 JSON 自由区误判成结构化字典。
 */
export type FieldDetailFor<T> =
	IsAny<T> extends true
		? FieldDetail
		: IsUnknown<T> extends true
			? FieldDetail
			: IsStringLiteralUnionOnly<T> extends true
				? EnumFieldDetail<Extract<NonNullable<T>, string>>
				: NonNullable<T> extends readonly (infer Item)[]
					? ArrayFieldDetail<Item>
					: [DiscriminatorKey<NonNullable<T>>] extends [never]
						? NonNullable<T> extends object
							? BaseFieldDetail & { fields: ObjectFieldDict<NonNullable<T>> }
							: FieldDetail
						: DiscriminatorKey<NonNullable<T>> extends infer D extends keyof NonNullable<T> & string
							? BaseFieldDetail & {
									fields: ObjectFieldDict<NonNullable<T>>;
									variants: VariantDict<NonNullable<T>, D>;
								}
							: never;

/**
 * 字段字典结构：顶层字段和 JSON 嵌套字段都通过 FieldDetailFor 获得编辑器补全。
 */
type FieldDict<T> = {
	[K in keyof T]: FieldDetailFor<T[K]>;
};

/**
 * 表描述结构
 */
export type Dic<T> = {
	selfName: string;
	description: string;
	fields: FieldDict<T>;
};

export interface Dictionary {
	ui: {
		searchPlaceholder: string;
		columnsHidden: string;
		boolean: {
			true: string;
			false: string;
		};
		actions: {
			add: string;
			create: string;
			remove: string;
			upload: string;
			update: string;
			save: string;
			swap: string;
			reset: string;
			modify: string;
			cancel: string;
			open: string;
			close: string;
			back: string;
			filter: string;
			generateImage: string;
			checkInfo: string;
			zoomIn: string;
			zoomOut: string;
			logIn: string;
			logOut: string;
			register: string;
			switchUser: string;
			install: string;
			unInstall: string;
			operation: string;
			searching: string;
			enterFullscreen: string;
			exitFullscreen: string;
		};
		relationPrefix: {
			belongsTo: string;
			usedBy: string;
			updatedBy: string;
			createdBy: string;
			contains: string;
			related: string;
			none: string;
		};
		nav: {
			home: string;
			character: string;
			simulator: string;
			profile: string;
		};
		errorPage: {
			tips: string;
		};
		settings: {
			title: string;
			userInterface: {
				title: string;
				colorTheme: {
					title: string;
					description: string;
				};
				themeVersion: {
					title: string;
					description: string;
					v1: string;
					v2: string;
					v3: string;
				};
				isAnimationEnabled: {
					title: string;
					description: string;
				};
				is3DbackgroundDisabled: {
					title: string;
					description: string;
				};
			};
			language: {
				title: string;
				selectedLanguage: {
					title: string;
					description: string;
					zhCN: string;
					zhTW: string;
					enUS: string;
					jaJP: string;
				};
			};
			statusAndSync: {
				title: string;
				restorePreviousStateOnStartup: {
					title: string;
					description: string;
				};
				syncStateAcrossClients: {
					title: string;
					description: string;
				};
			};
			privacy: {
				title: string;
				postVisibility: {
					title: string;
					description: string;
					everyone: string;
					friends: string;
					onlyMe: string;
				};
			};
			messages: {
				title: string;
				notifyOnContentChange: {
					title: string;
					description: string;
					notifyOnReferencedContentChange: string;
					notifyOnLike: string;
					notifyOnBookmark: string;
				};
			};
			about: {
				title: string;
				description: {
					title: string;
					description: string;
				};
				version: {
					title: string;
					description: string;
				};
			};
			tool: {
				title: string;
				pwa: {
					title: string;
					description: string;
					notSupported: string;
				};
				storageInfo: {
					title: string;
					description: string;
					usage: string;
					clearStorage: string;
				};
			};
		};
		index: {
			adventurer: string;
			goodMorning: string;
			goodAfternoon: string;
			goodEvening: string;
			nullSearchResultWarring: string;
			nullSearchResultTips: string;
		};
		wiki: {
			selector: {
				title: string;
				groupName: {
					combat: string;
					daily: string;
				};
			};
			tableConfig: {
				title: string;
			};
			news: {
				title: string;
			};
		};
		simulator: {
			pageTitle: string;
			description: string;
			actualValue: string;
			baseValue: string;
			modifiers: string;
			staticModifiers: string;
			dynamicModifiers: string;
			simulatorPage: {
				mobsConfig: {
					title: string;
				};
				teamConfig: {
					title: string;
				};
			};
		};
		character: {
			pageTitle: string;
			description: string;
			tabs: {
				combo: string;
				behavior: string;
				equipment: {
					selfName: string;
					mainHand: string;
					subHand: string;
					armor: string;
					option: string;
					special: string;
				};
				consumable: string;
				cooking: string;
				registlet: string;
				skill: {
					selfName: string;
					treeSkill: string;
					starGem: string;
					trees: {
						[K in keyof SkillTreeMap]: {
							selfName: string;
							tree: SkillTreeMap[K];
						};
					};
				};
				ability: string;
				base: {
					selfName: string;
					name: string;
				};
			};
		};
	};
	db: { [K in keyof DB]: Dic<DB[K]> };
}
