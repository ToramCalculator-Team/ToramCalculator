import type { DB } from "@db/generated/zod/index";
import { createEffect, createRoot } from "solid-js";
import { runStartupGate } from "~/lib/version/startupGate";
import { ensureTemporaryAccount } from "~/session/temporaryAccount";
import { store } from "~/store";
import type { BootstrapModule } from "./types";

// Electric 的“全库首轮同步完成”判定清单。
// 设计目的：全库同步完成用于缓存预热和诊断；页面外壳只依赖 pgworker，表级内容继续读取 tableSyncState。
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
	"behavior_tree",
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
	"sync_heartbeat",
];

/**
 * 设计目标：把“表组是否 ready”的判断从具体页面/模块中抽出来，避免各处重复拼接门控逻辑。
 * 函数职责：检查传入表集合是否都完成首轮 Electric initial sync。
 */
const areElectricTablesReady = (tableNames: Array<keyof DB>) =>
	tableNames.every((tableName) => store.database.tableSyncState[tableName] === true);

/**
 * 设计目标：让依赖少量同步表的启动模块只等待自己的最小数据集合。
 * 函数职责：监听表组 ready 状态，并在满足条件后销毁独立 Solid root。
 */
const waitForElectricTables = (tableNames: Array<keyof DB>): Promise<void> => {
	if (typeof window === "undefined" || areElectricTablesReady(tableNames)) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		createRoot((dispose) => {
			// 独立 root：只监听到“表组 ready”这一刻就销毁，不污染组件树生命周期。
			createEffect(() => {
				if (!areElectricTablesReady(tableNames)) {
					return;
				}

				dispose();
				resolve();
			});
		});
	});
};

/**
 * 设计目标：保留“全库首轮同步完成”的后台模块语义，服务缓存预热和诊断。
 * 函数职责：等待 Electric 同步清单中的所有表完成首轮 initial sync。
 */
const waitForElectricInitialSync = (): Promise<void> => waitForElectricTables(ELECTRIC_SYNC_TABLES);

export const bootstrapModules: BootstrapModule<unknown>[] = [
	{
		name: "release",
		deps: [],
		init: async () => (await runStartupGate()).release,
	},
	{
		name: "storeMigration",
		deps: ["release"],
		init: async () => (await runStartupGate()).store,
	},
	{
		name: "store",
		deps: ["storeMigration"],
		init: async () => undefined,
	},
	{
		name: "sw",
		deps: ["storeMigration"],
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
					const releaseResp = await fetch("/api/release", { cache: "no-store" });
					if (!releaseResp.ok) {
						console.warn("无法获取 release manifest，使用离线缓存");
						return;
					}

					const release = await releaseResp.json();
					if (navigator.serviceWorker.controller) {
						navigator.serviceWorker.controller.postMessage({
							type: "CHECK_CACHE_VERSION",
							data: { release },
						});
						console.log("已通知Service Worker检查发布版本:", release.releaseId);
					}
				} catch (error) {
					console.warn("发布版本检查失败，使用离线缓存:", error);
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
		deps: ["storeMigration"],
		optional: true,
		init: async ({ log }) => {
			log("observer stub; schema version check ships in a later phase");
		},
	},
	{
		name: "pgworker",
		deps: ["storeMigration"],
		timeout: 60_000,
		init: async () => {
			// Phase B 起由 bootstrap 主动创建 worker，避免调用方各自抢跑初始化。
			const { createPgWorker } = await import("~/lib/pglite/pg");
			await createPgWorker();
		},
	},
	{
		name: "electricInitialSync",
		deps: ["pgworker"],
		optional: true,
		timeout: 120_000,
		init: async () => {
			await waitForElectricInitialSync();
		},
	},
	{
		name: "temporaryAccount",
		deps: ["pgworker"],
		timeout: 60_000,
		init: async () => {
			// 职责迁移：本地账号初始化从路由 onMount 收拢到统一启动阶段；本地账号只依赖 schema 已迁移且写入通道已注册。
			// 设计目的：pgworker 现在只代表本地 schema ready；账号初始化还需要 account 表完成首轮同步。
			await waitForElectricTables(["account"]);
			await ensureTemporaryAccount();
		},
	},
	{
		name: "engine",
		deps: [],
		timeout: 180_000,
		init: async ({ log, waitFor }) => {
			try {
				// 设计目的：engine 会创建计算 Worker；等待 PGlite 完成迁移和同步注册，避免和数据库 wasm/data 初始化抢首启资源。
				await waitFor("pgworker");
			} catch (error) {
				log(`data priority gate failed before engine init: ${String(error)}`);
			}
			const { EngineService } = await import("~/lib/engine/core/thread/EngineService");
			const service = EngineService.getInstance();
			service.init();
			await Promise.all([
				service.getSimulatorEngine().whenReady(),
				service.getCharacterEngine().whenReady(),
			]);
		},
	},
	{
		name: "changeLog",
		deps: ["pgworker", "temporaryAccount"],
		optional: true,
		init: async () => {
			const { syncControl } = await import("~/lib/pglite/pg");

			createRoot(() => {
				createEffect(() => {
					if (store.database.sync) {
						syncControl.start();
					} else {
						syncControl.stop();
					}
				});
			});
		},
	},
];
