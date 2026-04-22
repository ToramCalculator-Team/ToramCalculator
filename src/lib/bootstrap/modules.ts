import type { DB } from "@db/generated/zod/index";
import { createEffect, createRoot } from "solid-js";
import { ensureLocalAccount } from "~/lib/localAccount";
import { store } from "~/store";
import type { BootstrapModule } from "./types";

// Electric 的“首轮同步完成”判定清单。
// 目标是给 UI 一个可观测的全局门槛（electricInitialSync），而不是替代 tableSyncState 的细粒度用途。
const ELECTRIC_SYNC_TABLES: Array<keyof DB> = [
	"account",
	"account_create_data",
	"account_update_data",
	"player",
	"statistic",
	"image",
	"world",
	"activity",
	"address",
	"zone",
	"_linkZones",
	"npc",
	"task",
	"task_kill_requirement",
	"task_collect_require",
	"task_reward",
	"_mobTozone",
	"mob",
	"drop_item",
	"item",
	"weapon",
	"armor",
	"option",
	"special",
	"avatar",
	"_avatarTocharacter",
	"crystal",
	"_crystalToplayer_weapon",
	"_crystalToplayer_armor",
	"_crystalToplayer_option",
	"_crystalToplayer_special",
	"recipe",
	"recipe_ingredient",
	"skill",
	"skill_variant",
	"player_weapon",
	"player_armor",
	"player_option",
	"player_special",
	"player_pet",
	"_characterToconsumable",
	"character_skill",
	"consumable",
	"material",
	"combo",
	"character",
	"mercenary",
	"member",
	"team",
	"_campA",
	"_campB",
	"simulator",
];

const areAllElectricTablesReady = () =>
	ELECTRIC_SYNC_TABLES.every((tableName) => store.database.tableSyncState[tableName] === true);

const waitForElectricInitialSync = (): Promise<void> => {
	if (typeof window === "undefined" || areAllElectricTablesReady()) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		createRoot((dispose) => {
			// 独立 root：只监听到“全表 ready”这一刻就销毁，不污染组件树生命周期。
			createEffect(() => {
				if (!areAllElectricTablesReady()) {
					return;
				}

				dispose();
				resolve();
			});
		});
	});
};

export const bootstrapModules: BootstrapModule[] = [
	{
		name: "store",
		deps: [],
		init: async () => undefined,
	},
	{
		name: "sw",
		deps: [],
		optional: true,
		init: async ({ log }) => {
			if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
				return;
			}

			const isProduction = import.meta.env.MODE === "production";
			const { default: serviceWorkerUrl } = await import("~/worker/sw/main?worker&url");
			const swUrl = isProduction ? "/service.worker.js" : serviceWorkerUrl;

			// 职责：只做“注册 + 版本检查触发”，不承载业务数据初始化。
			const checkCacheVersion = async () => {
				if (!isProduction) {
					console.info("[DEV] 跳过缓存版本检查（开发模式）");
					return;
				}

				try {
					const manifestResp = await fetch("/chunk-manifest.json");
					if (!manifestResp.ok) {
						console.warn("无法获取chunk manifest，使用离线缓存");
						return;
					}

					const manifest = await manifestResp.json();
					if (navigator.serviceWorker.controller) {
						navigator.serviceWorker.controller.postMessage({
							type: "CHECK_CACHE_VERSION",
							data: { manifest },
						});
						console.log("已通知Service Worker检查缓存版本:", manifest.buildTime);
					}
				} catch (error) {
					console.warn("缓存版本检查失败，使用离线缓存:", error);
				}
			};

			try {
				const registration = await navigator.serviceWorker.register(swUrl, { type: "module" });

				if (isProduction) {
					if (registration.active) {
						await checkCacheVersion();
					} else {
						registration.addEventListener("activate", () => {
							setTimeout(() => {
								void checkCacheVersion();
							}, 1000);
						});
					}
				} else {
					console.info("[DEV] 开发环境下跳过缓存版本检查");
				}
			} catch (error) {
				log(`service worker registration failed: ${String(error)}`);
				throw error;
			}
		},
	},
	{
		name: "schemaCheck",
		deps: ["store"],
		optional: true,
		init: async ({ log }) => {
			log("observer stub; schema version check ships in a later phase");
		},
	},
	{
		name: "pgworker",
		deps: ["store"],
		timeout: 60_000,
		init: async () => {
			// Phase B 起由 bootstrap 主动创建 worker，避免调用方各自抢跑初始化。
			const { createPgWorker } = await import("~/initialWorker");
			await createPgWorker();
		},
	},
	{
		name: "electricInitialSync",
		deps: ["pgworker"],
		timeout: 120_000,
		init: async () => {
			await waitForElectricInitialSync();
		},
	},
	{
		name: "localAccount",
		deps: ["pgworker"],
		timeout: 60_000,
		init: async () => {
			// 职责迁移：本地账号初始化从路由 onMount 收拢到统一启动阶段。
			await ensureLocalAccount();
		},
	},
	{
		name: "engine",
		deps: [],
		timeout: 60_000,
		init: async () => {
			const { EngineService } = await import("~/lib/engine/core/thread/EngineService");
			await EngineService.getInstance().getDefaultEngine().whenReady();
		},
	},
	{
		name: "changeLog",
		deps: ["pgworker", "localAccount"],
		optional: true,
		init: async ({ log }) => {
			log("observer stub; changelog sync is still triggered outside bootstrap");
		},
	},
];
