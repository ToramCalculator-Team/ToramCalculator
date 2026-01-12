import type { DB } from "@db/generated/zod/index";
import type { AccountType } from "@db/schema/enums";
import * as _ from "lodash-es";
import { createStore } from "solid-js/store";
import type { Locale } from "~/locales/i18n";

/**
 * 本地存储结构
 * 负责存储全局状态信息和用户偏好设置，数据会缓存在LocalStorage中
 */

type DatabaseState = {
  /** 本地数据库是否初始化 */
	inited: boolean;
  /** 本地数据库表同步状态 */
	tableSyncState: Partial<Record<keyof DB, boolean>>;
};

type SessionState = {
  /** 用户信息 */
	user?: {
		/** 用户ID */
		id: string;
		/** 用户名 */
		name: string;
		/** 用户头像 */
		avatar: string;
	};
  /** 用户账户信息 */
	account: {
		/** 账户ID */
		id: string;
		/** 账户类型 */
		type: AccountType;
		/** 玩家信息 */
		player?: {
			/** 玩家ID */
			id: string;
			/** 角色信息 */
			character?: {
				/** 角色ID */
				id: string;
			};
		};
	};
};

type SettingsState = {
	/** 用户界面设置 */
	userInterface: {
		/** 主题 */
		theme: "light" | "dark";
		/** 语言 */
		language: Locale;
		/** 是否启用动画 */
		isAnimationEnabled: boolean;
		/** 是否禁用3D背景 */
		is3DbackgroundDisabled: boolean;
	};
	/** 是否已关闭PWA安装提示 */
	hasDismissedPWAInstall: boolean;
	/** 状态和同步设置 */
	statusAndSync: {
		/** 是否在启动时恢复上次状态 */
		restorePreviousStateOnStartup: boolean;
		/** 是否在多个客户端之间同步状态 */
		syncStateAcrossClients: boolean;
	};
	/** 隐私设置 */
	privacy: {
		/** 帖子可见性 */
		postVisibility: "everyone" | "friends" | "onlyMe";
	};
	/** 消息设置 */
	messages: {
		/** 内容变化通知 */
		notifyOnContentChange: {
			/** 通知引用内容变化 */
			notifyOnReferencedContentChange: boolean;
			/** 通知点赞 */
			notifyOnLike: boolean;
			/** 通知收藏 */
			notifyOnBookmark: boolean;
		};
	};
};

type PageState = {
	/** 资源加载状态 */
	resourcesLoaded: boolean;
	/** 设置对话框状态 */
	settingsDialogState: boolean;
	/** 登录对话框状态 */
	loginDialogState: boolean;
	/** WIKI页面个性化设置 */
	wiki: Partial<{
		[T in keyof DB]: {
			table: {
				sort: { id: keyof DB[T]; desc: boolean };
				hiddenColumns: Partial<Record<keyof DB[T], boolean>>;
			};
			/** 表单 */
			form: {};
			/** 卡片 */
			card: {
				hiddenFields: Array<keyof DB[T]>;
			};
		};
	}>;
	/** 卡片组缓存 */
	cardGroup: {
		type: keyof DB;
		id: string;
	}[];
	/** 表单组缓存 */
	formGroup: {
		type: keyof DB;
		data: Record<string, unknown>;
	}[];
};

type SwState = {
	/** 是否启用周期性检查 */
	periodicCheckEnabled: boolean;
	/** 周期性检查间隔 */
	periodicCheckInterval: number; // ms
	/** 缓存策略 */
	cacheStrategy: "all" | "core-only" | "assets-only";
	/** 上次手动更新时间 */
	lastManualUpdate?: string; // ISO 时间戳
};

export type DialogType = "form" | "card";

export type Store = {
	version: number;
	database: DatabaseState;
	settings: SettingsState;
	session: SessionState;
	sw: SwState;
	pages: PageState;
};

const initialStore: Store = {
	version: 20251009,
	database: {
		inited: false,
		tableSyncState: {
			account: false,
			account_create_data: false,
			account_update_data: false,
			image: false,
			mob: false,
			statistic: false,
			user: false,
		},
	},
	settings: {
		userInterface: {
			theme: "light",
			language: "zh-CN",
			isAnimationEnabled: true,
			is3DbackgroundDisabled: false,
		},
		hasDismissedPWAInstall: false,
		statusAndSync: {
			restorePreviousStateOnStartup: true,
			syncStateAcrossClients: true,
		},
		privacy: {
			postVisibility: "everyone",
		},
		messages: {
			notifyOnContentChange: {
				notifyOnReferencedContentChange: true,
				notifyOnLike: true,
				notifyOnBookmark: true,
			},
		},
	},
	session: {
		account: {
			// 初始化页面时，ensureLocalAccount方法会覆盖此内容
			id: "",
			type: "User",
		},
	},
	pages: {
		resourcesLoaded: false,
		settingsDialogState: false,
		loginDialogState: false,
		wiki: {},
		cardGroup: [],
		formGroup: [],
	},
	sw: {
		periodicCheckEnabled: true,
		periodicCheckInterval: 30 * 60 * 1000, // 30分钟
		cacheStrategy: "all",
		lastManualUpdate: undefined,
	},
};

const safeParse = (data: string) => {
	try {
		return JSON.parse(data);
	} catch (error) {
		console.warn("本地存储数据解析失败，正在重置为默认配置:", error);
		return null;
	}
};

export const getActStore = () => {
	const isBrowser = typeof window !== "undefined";
	if (isBrowser) {
		const storage = localStorage.getItem("store");
		if (storage) {
			const oldStore = safeParse(storage) || {};
			const newStore = initialStore;

			// 排除版本信息
			const { version: oldVersion, ...oldStoreWithoutVersion } = oldStore;
			const { version: newVersion, ...newStoreWithoutVersion } = newStore;

			let mergedStore: Store;
			if (oldVersion && oldVersion === newVersion) {
				mergedStore = _.merge({}, newStore, oldStore);
			} else {
				mergedStore = _.merge({}, newStoreWithoutVersion, oldStoreWithoutVersion);
				mergedStore.version = newVersion;
				localStorage.setItem("store", JSON.stringify(mergedStore));
			}
			return mergedStore;
		} else {
			console.log(performance.now(), "初始化本地配置");
			localStorage.setItem("store", JSON.stringify(initialStore));
		}
	}
	return initialStore;
};

const [store, setStore] = createStore<Store>(getActStore());
export { store, setStore };
