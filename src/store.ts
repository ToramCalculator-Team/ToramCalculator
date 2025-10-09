import { createStore } from "solid-js/store";
import { Locale } from "~/locales/i18n";
import * as _ from "lodash-es";
import { type DB } from "@db/generated/kysely/kysely";
import { AccountType } from "@db/schema/enums";

/**
 * 本地存储结构
 * 负责存储全局状态信息和用户偏好设置，数据会缓存在LocalStorage中
 */

type DatabaseState = {
  inited: boolean;
  tableSyncState: Partial<Record<keyof DB, boolean>>;
};

type SessionState = {
  user?: {
    id: string;
    name: string;
    avatar: string;
    account?: {
      id: string;
      type: AccountType;
      player?: {
        id: string;
        character?: {
          id: string;
        };
      };
    };
  };
};

type SettingsState = {
  userInterface: {
    theme: "light" | "dark";
    language: Locale;
    isAnimationEnabled: boolean;
    is3DbackgroundDisabled: boolean;
  };
  hasDismissedPWAInstall: boolean;
  statusAndSync: {
    restorePreviousStateOnStartup: boolean;
    syncStateAcrossClients: boolean;
  };
  privacy: {
    postVisibility: "everyone" | "friends" | "onlyMe";
  };
  messages: {
    notifyOnContentChange: {
      notifyOnReferencedContentChange: boolean;
      notifyOnLike: boolean;
      notifyOnBookmark: boolean;
    };
  };
};

type PageState = {
  resourcesLoaded: boolean;
  settingsDialogState: boolean;
  loginDialogState: boolean;
  indexPage: {};
  wiki: Partial<{
    [T in keyof DB]: {
      table: {
        sort: { id: keyof DB[T]; desc: boolean };
        hiddenColumns: Partial<Record<keyof DB[T], boolean>>;
      };
      form: {};
      card: {
        hiddenFields: Array<keyof DB[T]>;
      };
    };
  }>;
};

type SwState = {
  periodicCheckEnabled: boolean;
  periodicCheckInterval: number; // ms
  cacheStrategy: "all" | "core-only" | "assets-only";
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
  },
  pages:{
    resourcesLoaded: false,
    settingsDialogState: false,
    loginDialogState: false,
    indexPage: {},
    wiki: {},
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
