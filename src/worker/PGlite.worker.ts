/// <reference lib="webworker" />

import { CLIENT_DB_BASELINE, CLIENT_DB_MIGRATIONS, type ClientDbMigration } from "@db/client/migrations";
import type { DB } from "@db/generated/zod/index";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { live } from "@electric-sql/pglite/live";
import { worker } from "@electric-sql/pglite/worker";
import { electricSync } from "@electric-sql/pglite-sync";
import { ChangeLogSynchronizer } from "~/lib/pglite/ChangeLogSynchronizer";
import { DB_SCHEMA_VERSION, MIN_COMPATIBLE_DB_SCHEMA_VERSION } from "~/lib/version/schema";

const ELECTRIC_HOST =
	import.meta.env.VITE_SERVER_HOST === "localhost"
		? "http://localhost:3000/v1/shape"
		: "https://test.kiaclouth.com/v1/shape";
// console.log("VITE_SERVER_HOST:" + import.meta.env.VITE_SERVER_HOST);
// console.log("ELECTRIC_HOST:" + ELECTRIC_HOST);

export interface syncMessage {
	type: "sync";
	data: {
		tableName: keyof DB;
		state: "start" | "success" | "fail";
	};
	timestamp: string;
}

export interface SyncControlMessage {
	type: "sync-control";
	action: "start" | "stop";
}

const PGLITE_DATA_DIR = "idb://toramCalculatorDB";
const PGLITE_INDEXED_DB_NAME = "toramCalculatorDB";

type DbMigration = ClientDbMigration;

interface ElectricSyncTableConfig {
	tableName: keyof DB;
	primaryKey: string[];
	urlParams?: string;
}

const ELECTRIC_SYNC_TABLE_CONFIGS = {
	account: { tableName: "account", primaryKey: ["id"] },
	account_create_data: { tableName: "account_create_data", primaryKey: ["userId"] },
	account_update_data: { tableName: "account_update_data", primaryKey: ["userId"] },
	player: { tableName: "player", primaryKey: ["id"] },
	statistic: { tableName: "statistic", primaryKey: ["id"] },
	image: { tableName: "image", primaryKey: ["id"] },
	world: { tableName: "world", primaryKey: ["id"] },
	activity: { tableName: "activity", primaryKey: ["id"] },
	address: { tableName: "address", primaryKey: ["id"] },
	zone: { tableName: "zone", primaryKey: ["id"] },
	_linkZones: { tableName: "_linkZones", primaryKey: ["A", "B"], urlParams: `"_linkZones"` },
	npc: { tableName: "npc", primaryKey: ["id"] },
	task: { tableName: "task", primaryKey: ["id"] },
	task_kill_requirement: { tableName: "task_kill_requirement", primaryKey: ["id"] },
	task_collect_require: { tableName: "task_collect_require", primaryKey: ["id"] },
	task_reward: { tableName: "task_reward", primaryKey: ["id"] },
	_mobTozone: { tableName: "_mobTozone", primaryKey: ["A", "B"], urlParams: `"_mobTozone"` },
	mob: { tableName: "mob", primaryKey: ["id"] },
	drop_item: { tableName: "drop_item", primaryKey: ["id"] },
	item: { tableName: "item", primaryKey: ["id"] },
	weapon: { tableName: "weapon", primaryKey: ["itemId"] },
	armor: { tableName: "armor", primaryKey: ["itemId"] },
	option: { tableName: "option", primaryKey: ["itemId"] },
	special: { tableName: "special", primaryKey: ["itemId"] },
	avatar: { tableName: "avatar", primaryKey: ["id"] },
	_avatarTocharacter: { tableName: "_avatarTocharacter", primaryKey: ["A", "B"], urlParams: `"_avatarTocharacter"` },
	crystal: { tableName: "crystal", primaryKey: ["itemId"] },
	_crystalToplayer_weapon: {
		tableName: "_crystalToplayer_weapon",
		primaryKey: ["A", "B"],
		urlParams: `"_crystalToplayer_weapon"`,
	},
	_crystalToplayer_armor: {
		tableName: "_crystalToplayer_armor",
		primaryKey: ["A", "B"],
		urlParams: `"_crystalToplayer_armor"`,
	},
	_crystalToplayer_option: {
		tableName: "_crystalToplayer_option",
		primaryKey: ["A", "B"],
		urlParams: `"_crystalToplayer_option"`,
	},
	_crystalToplayer_special: {
		tableName: "_crystalToplayer_special",
		primaryKey: ["A", "B"],
		urlParams: `"_crystalToplayer_special"`,
	},
	recipe: { tableName: "recipe", primaryKey: ["id"] },
	recipe_ingredient: { tableName: "recipe_ingredient", primaryKey: ["id"] },
	skill: { tableName: "skill", primaryKey: ["id"] },
	skill_variant: { tableName: "skill_variant", primaryKey: ["id"] },
	behavior_tree: { tableName: "behavior_tree", primaryKey: ["id"] },
	player_weapon: { tableName: "player_weapon", primaryKey: ["id"] },
	player_armor: { tableName: "player_armor", primaryKey: ["id"] },
	player_option: { tableName: "player_option", primaryKey: ["id"] },
	player_special: { tableName: "player_special", primaryKey: ["id"] },
	player_pet: { tableName: "player_pet", primaryKey: ["id"] },
	_characterToconsumable: {
		tableName: "_characterToconsumable",
		primaryKey: ["A", "B"],
		urlParams: `"_characterToconsumable"`,
	},
	character_skill: { tableName: "character_skill", primaryKey: ["id"] },
	consumable: { tableName: "consumable", primaryKey: ["itemId"] },
	material: { tableName: "material", primaryKey: ["itemId"] },
	combo: { tableName: "combo", primaryKey: ["id"] },
	character: { tableName: "character", primaryKey: ["id"] },
	mercenary: { tableName: "mercenary", primaryKey: ["templateId"] },
	member: { tableName: "member", primaryKey: ["id"] },
	team: { tableName: "team", primaryKey: ["id"] },
	_campA: { tableName: "_campA", primaryKey: ["A", "B"], urlParams: `"_campA"` },
	_campB: { tableName: "_campB", primaryKey: ["A", "B"], urlParams: `"_campB"` },
	simulator: { tableName: "simulator", primaryKey: ["id"] },
	sync_heartbeat: { tableName: "sync_heartbeat", primaryKey: ["id"] },
} satisfies Record<string, ElectricSyncTableConfig>;

// 同步优先级：账号表服务本地会话初始化；实时模拟表组服务 simulator 首屏。
// 设计目的：让现有页面继续通过 simulator ready 进入，同时保证它前置依赖的主要关系表已先追平。
const EARLY_ELECTRIC_SYNC_TABLES: ElectricSyncTableConfig[] = [
	ELECTRIC_SYNC_TABLE_CONFIGS.account,
	ELECTRIC_SYNC_TABLE_CONFIGS.player,
	ELECTRIC_SYNC_TABLE_CONFIGS.statistic,
	ELECTRIC_SYNC_TABLE_CONFIGS.image,
	ELECTRIC_SYNC_TABLE_CONFIGS.mob,
	ELECTRIC_SYNC_TABLE_CONFIGS.drop_item,
	ELECTRIC_SYNC_TABLE_CONFIGS.item,
	ELECTRIC_SYNC_TABLE_CONFIGS.weapon,
	ELECTRIC_SYNC_TABLE_CONFIGS.armor,
	ELECTRIC_SYNC_TABLE_CONFIGS.option,
	ELECTRIC_SYNC_TABLE_CONFIGS.special,
	ELECTRIC_SYNC_TABLE_CONFIGS.avatar,
	ELECTRIC_SYNC_TABLE_CONFIGS._avatarTocharacter,
	ELECTRIC_SYNC_TABLE_CONFIGS.crystal,
	ELECTRIC_SYNC_TABLE_CONFIGS._crystalToplayer_weapon,
	ELECTRIC_SYNC_TABLE_CONFIGS._crystalToplayer_armor,
	ELECTRIC_SYNC_TABLE_CONFIGS._crystalToplayer_option,
	ELECTRIC_SYNC_TABLE_CONFIGS._crystalToplayer_special,
	ELECTRIC_SYNC_TABLE_CONFIGS.skill,
	ELECTRIC_SYNC_TABLE_CONFIGS.skill_variant,
	ELECTRIC_SYNC_TABLE_CONFIGS.behavior_tree,
	ELECTRIC_SYNC_TABLE_CONFIGS.player_weapon,
	ELECTRIC_SYNC_TABLE_CONFIGS.player_armor,
	ELECTRIC_SYNC_TABLE_CONFIGS.player_option,
	ELECTRIC_SYNC_TABLE_CONFIGS.player_special,
	ELECTRIC_SYNC_TABLE_CONFIGS.player_pet,
	ELECTRIC_SYNC_TABLE_CONFIGS._characterToconsumable,
	ELECTRIC_SYNC_TABLE_CONFIGS.character_skill,
	ELECTRIC_SYNC_TABLE_CONFIGS.consumable,
	ELECTRIC_SYNC_TABLE_CONFIGS.combo,
	ELECTRIC_SYNC_TABLE_CONFIGS.character,
	ELECTRIC_SYNC_TABLE_CONFIGS.mercenary,
	ELECTRIC_SYNC_TABLE_CONFIGS.member,
	ELECTRIC_SYNC_TABLE_CONFIGS.team,
	ELECTRIC_SYNC_TABLE_CONFIGS._campA,
	ELECTRIC_SYNC_TABLE_CONFIGS._campB,
	ELECTRIC_SYNC_TABLE_CONFIGS.simulator,
];

const EARLY_ELECTRIC_SYNC_TABLE_NAME_SET = new Set<keyof DB>(
	EARLY_ELECTRIC_SYNC_TABLES.map((config) => config.tableName),
);

// 后台同步表组：不参与 PGlite 可查询门槛，完成后仍会逐表通知主线程，供 wiki/缓存预热等模块使用。
// 排除 sync_heartbeat：它是高频延迟探针，单独同步（见 HEARTBEAT_SYNC_TABLE），不能混进任何批量组——
// syncShapesToTables 用“组内最小 lsn”做提交门控，组内任一静默表不推进 lsn 就会压住心跳的实时回传。
const BACKGROUND_ELECTRIC_SYNC_TABLES = Object.values(ELECTRIC_SYNC_TABLE_CONFIGS).filter(
	(config) =>
		!EARLY_ELECTRIC_SYNC_TABLE_NAME_SET.has(config.tableName) &&
		config.tableName !== ELECTRIC_SYNC_TABLE_CONFIGS.sync_heartbeat.tableName,
);

// 心跳探针单独同步：单表组的水位线只由它自己决定，每 3s 的新 lsn 立即 flush 到 _synced，
// 不被任何其他表的同步进度拖累。
const HEARTBEAT_SYNC_TABLE = ELECTRIC_SYNC_TABLE_CONFIGS.sync_heartbeat;

/**
 * 设计目标：把 worker 内部的表级同步进度转换成主线程可观察的 store 更新。
 * 函数职责：发送单张表的同步状态；是否聚合成业务 ready 状态由主线程/页面决定。
 */
const notifySyncProgress = (tableName: keyof DB, state: syncMessage["data"]["state"]) => {
	self.postMessage({
		type: "sync",
		data: {
			tableName: tableName,
			state,
		},
		timestamp: Date.now().toLocaleString(),
	});
};

/**
 * 设计目标：打开持久化的本地 PGlite 数据库，而不是每次启动都创建空库。
 * 函数职责：配置 PGlite 数据目录和扩展；schema 是否可用交给后续启动阶段校验。
 */
const createDatabase = async () =>
	await PGlite.create({
		dataDir: PGLITE_DATA_DIR,
		relaxedDurability: true,
		// debug: 1,
		extensions: {
			live,
			electric: electricSync({ debug: false }),
			pg_trgm,
		},
	});

type WorkerPGlite = Awaited<ReturnType<typeof createDatabase>>;

/**
 * 设计目标：在必须重建本地库时清理 IndexedDB，避免旧 schema 残留污染新基线。
 * 函数职责：封装 IndexedDB 删除回调为 Promise，向上暴露删除失败/blocked 错误。
 */
const deleteIndexedDb = (name: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error ?? new Error(`Failed to delete IndexedDB ${name}`));
		request.onblocked = () => reject(new Error(`IndexedDB ${name} deletion is blocked`));
	});

/**
 * 设计目标：只在空库、旧版本或迁移失败等场景执行破坏性重建。
 * 函数职责：关闭当前 PGlite 连接、删除持久化库，并重新打开一个干净实例。
 */
const resetDatabase = async (pg: WorkerPGlite | undefined): Promise<WorkerPGlite> => {
	if (pg && "close" in pg && typeof pg.close === "function") {
		await pg.close();
	}
	await deleteIndexedDb(PGLITE_INDEXED_DB_NAME);
	return await createDatabase();
};

/**
 * 设计目标：让 schema 版本账本成为判断初次创建/后续启动的唯一事实来源。
 * 函数职责：确保客户端迁移记录表存在；若检测到异常旧结构，则清理后重建记录表。
 */
const ensureMigrationTables = async (pg: WorkerPGlite) => {
	// 添加本地 schema 迁移记录表，记录客户端 baseline 和后续增量迁移。
	try {
		await pg.exec(`SELECT to_version FROM app_schema_migrations LIMIT 1;`);
	} catch {
		await pg.exec(`DROP TABLE IF EXISTS app_schema_migrations;`);
	}
	await pg.exec(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      id TEXT PRIMARY KEY,
      from_version INTEGER NOT NULL,
      to_version INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

/**
 * 设计目标：兼容早期使用旧 migrations 表的本地数据库，避免误把旧结构当作可升级结构。
 * 函数职责：探测 legacy init 迁移记录；探测失败时按“非 legacy”处理，交给后续账本检查。
 */
const hasLegacyInitMigration = async (pg: WorkerPGlite): Promise<boolean> => {
	try {
		const result = await pg.exec(`SELECT name FROM migrations WHERE name = 'init' LIMIT 1;`);
		return result[0]?.rows.length > 0;
	} catch {
		return false;
	}
};

/**
 * 设计目标：记录每个增量迁移的应用结果，支撑后续启动的轻量版本判断。
 * 函数职责：以迁移 id 去重写入 schema 账本；重复启动不会重复记录同一迁移。
 */
const recordMigration = async (pg: WorkerPGlite, migration: DbMigration) => {
	await pg.exec(
		`
      INSERT INTO app_schema_migrations (id, from_version, to_version, checksum)
      VALUES ('${migration.id}', ${migration.fromVersion}, ${migration.toVersion}, '${migration.checksum}')
      ON CONFLICT (id) DO NOTHING;
    `,
	);
};

/**
 * 设计目标：在首次创建或重建后写入基线版本，明确本地库从哪个版本开始演进。
 * 函数职责：记录 baseline 迁移；重复执行时通过 ON CONFLICT 保持幂等。
 */
const recordBaseline = async (pg: WorkerPGlite) => {
	await pg.exec(
		`
      INSERT INTO app_schema_migrations (id, from_version, to_version, checksum)
      VALUES ('${CLIENT_DB_BASELINE.id}', 0, ${CLIENT_DB_BASELINE.version}, '${CLIENT_DB_BASELINE.checksum}')
      ON CONFLICT (id) DO NOTHING;
    `,
	);
};

/**
 * 设计目标：用本地迁移账本判断 schema 当前版本，而不是依赖前端临时状态。
 * 函数职责：读取已应用迁移的最大目标版本；空账本按 0 处理。
 */
const getCurrentDbSchemaVersion = async (pg: WorkerPGlite): Promise<number> => {
	const result = await pg.exec(`SELECT MAX(to_version) AS version FROM app_schema_migrations;`);
	const value = result[0]?.rows[0]?.version;
	return typeof value === "number" ? value : Number(value ?? 0);
};

/**
 * 设计目标：把“本地库可查询”的门槛收敛到严格 schema 版本一致。
 * 函数职责：在初始化/迁移/重建后断言版本，防止半升级状态继续服务查询。
 */
const assertCurrentDbSchemaVersion = async (pg: WorkerPGlite, phase: string) => {
	const currentVersion = await getCurrentDbSchemaVersion(pg);
	if (currentVersion !== DB_SCHEMA_VERSION) {
		throw new Error(
			`PGlite schema version mismatch after ${phase}: current=${currentVersion}, target=${DB_SCHEMA_VERSION}`,
		);
	}
};

/**
 * 设计目标：区分“首次创建/需要重建”和“已有客户端迁移账本”的后续启动。
 * 函数职责：检查迁移账本是否有记录；无记录时由上层进入 baseline 重建路径。
 */
const hasAppliedClientMigrations = async (pg: WorkerPGlite): Promise<boolean> => {
	const result = await pg.exec(`SELECT COUNT(*) AS count FROM app_schema_migrations;`);
	const value = result[0]?.rows[0]?.count;
	return Number(value ?? 0) > 0;
};

/**
 * 设计目标：准备 schema 运行所需的本地扩展和迁移账本，不承载远端数据同步。
 * 函数职责：创建幂等扩展和迁移表；这是每次启动都允许执行的轻量步骤。
 */
const prepareSchemaRuntime = async (pg: WorkerPGlite) => {
	// FTS相关插件
	await pg.exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
	await ensureMigrationTables(pg);
};

/**
 * 设计目标：让后续启动只补齐缺失迁移，避免重复执行已记录的 schema 变更。
 * 函数职责：按版本链顺序执行增量迁移，并在每步后写入迁移账本。
 */
const applyMissingMigrations = async (pg: WorkerPGlite, fromVersion: number) => {
	let currentVersion = fromVersion;
	for (const migration of CLIENT_DB_MIGRATIONS) {
		if (migration.toVersion <= currentVersion) continue;
		if (migration.fromVersion !== currentVersion) {
			throw new Error(
				`PGlite migration chain mismatch: current=${currentVersion}, next=${migration.id}(${migration.fromVersion}->${migration.toVersion})`,
			);
		}
		await pg.exec(migration.sql);
		await recordMigration(pg, migration);
		currentVersion = migration.toVersion;
		console.log(`已应用迁移: ${migration.id}`);
	}
};

/**
 * 设计目标：处理首次创建、低兼容版本和迁移失败后的干净重建路径。
 * 函数职责：删除旧库、执行 baseline SQL、记录基线、补齐增量迁移并验证最终版本。
 */
const resetToBaseline = async (pg: WorkerPGlite | undefined): Promise<WorkerPGlite> => {
	const nextPg = await resetDatabase(pg);
	await prepareSchemaRuntime(nextPg);
	await nextPg.exec(CLIENT_DB_BASELINE.sql);
	await recordBaseline(nextPg);
	await applyMissingMigrations(nextPg, CLIENT_DB_BASELINE.version);
	// 设计说明：重建路径也必须验证最终版本，避免“首次清缓存可启动、刷新后才发现账本断档”。
	await assertCurrentDbSchemaVersion(nextPg, "baseline reset");
	return nextPg;
};

/**
 * 设计目标：把“后续启动需要的 schema 校验/迁移”与“数据同步”彻底分离。
 * 函数职责：打开账本、判断是否需要重建、补齐迁移；成功返回时本地库已经可查询。
 */
const applyMigrations = async (initialPg: WorkerPGlite): Promise<WorkerPGlite> => {
	const pg = initialPg;
	await prepareSchemaRuntime(pg);

	if ((await hasLegacyInitMigration(pg)) || !(await hasAppliedClientMigrations(pg))) {
		return await resetToBaseline(pg);
	}

	const currentVersion = await getCurrentDbSchemaVersion(pg);
	if (currentVersion < MIN_COMPATIBLE_DB_SCHEMA_VERSION) {
		return await resetToBaseline(pg);
	}
	await applyMissingMigrations(pg, currentVersion);

	await assertCurrentDbSchemaVersion(pg, "migration");

	return pg;
};

/**
 * 设计目标：提供 worker 启动阶段的唯一阻塞入口，让返回的 pg 一定具备可查询 schema。
 * 函数职责：打开持久化库、执行必要迁移；迁移失败时走测试阶段允许的重建兜底。
 */
const openSchemaReadyDatabase = async (): Promise<WorkerPGlite> => {
	let pg = await createDatabase();
	try {
		pg = await applyMigrations(pg);
	} catch (error) {
		console.warn("PGlite迁移失败，测试阶段直接重建本地数据库:", error);
		pg = await resetToBaseline(pg);
	}
	return pg;
};

// 用 syncShapesToTables 一次注册整组 shape，由库在单连接上并发拉取，取代逐表串行。
// onInitialSync 是整组一次性回调：组内全部表 initial sync 完成时，把本组所有表一并标记 success，
// 逐表 tableSyncState flag 仍逐个置真，wiki/bootstrap 的单表门控不受影响。
const syncTableGroup = async (pg: WorkerPGlite, groupName: string, configs: ElectricSyncTableConfig[]) => {
	const shapes: Record<string, Parameters<typeof pg.electric.syncShapesToTables>[0]["shapes"][string]> = {};
	for (const { tableName, primaryKey, urlParams } of configs) {
		shapes[tableName] = {
			shape: {
				url: ELECTRIC_HOST,
				// liveSse: true, 
				params: { table: urlParams ?? tableName }
			},
			table: `${tableName}_synced`,
			primaryKey,
			onMustRefetch: async (tx) => {
				await tx.exec(`DELETE FROM "${tableName}_synced";`);
			},
		};
	}
	const markGroup = (state: syncMessage["data"]["state"]) => {
		for (const { tableName } of configs) notifySyncProgress(tableName, state);
	};
	try {
		await pg.electric.syncShapesToTables({
			key: `group:${groupName}:v${DB_SCHEMA_VERSION}`,
			shapes,
			onInitialSync: () => {
				markGroup("success");
				console.log(`PGlite ${groupName} 表组同步注册完成`);
			},
			onError: (error) => {
				console.warn(`PGlite ${groupName} 表组同步失败:`, error);
				markGroup("fail");
			},
		});
	} catch (error) {
		console.warn(`PGlite ${groupName} 表组同步注册失败:`, error);
		markGroup("fail");
		throw error;
	}
};

// 把远端同步移出 init 阻塞链：先同步首屏关键表组，再同步后台表组；
// 任一组失败只影响该组 readiness，不阻断 pg 查询。
const runElectricSyncPlan = async (pg: WorkerPGlite) => {
	let earlySyncSucceeded = false;
	let backgroundSyncSucceeded = false;

	// 心跳探针独立成组并提前并行启动：单表组水位线只由自己决定，保证每 3s 的新值能持续 flush 到
	// _synced，让首页 live 订阅持续刷新延迟读数。不 await，避免被早期/后台组的 initial sync 拖慢启动。
	// 失败只影响延迟显示，不阻断其余同步。
	void syncTableGroup(pg, "心跳", [HEARTBEAT_SYNC_TABLE]).catch((error) => {
		console.warn("PGlite 心跳表同步中断:", error);
	});

	try {
		await syncTableGroup(pg, "早期", EARLY_ELECTRIC_SYNC_TABLES);
		earlySyncSucceeded = true;
	} catch (error) {
		console.warn("PGlite 早期表组同步中断:", error);
	}

	try {
		await syncTableGroup(pg, "后台", BACKGROUND_ELECTRIC_SYNC_TABLES);
		backgroundSyncSucceeded = true;
	} catch (error) {
		console.warn("PGlite 后台表组同步中断:", error);
	}

	if (earlySyncSucceeded && backgroundSyncSucceeded) {
		console.log("已同步完成");
	}
};

/**
 * 设计目标：写入通道控制属于 worker 运行态启动任务，不依赖全表 initial sync 完成。
 * 函数职责：注册 start/stop 消息监听，并把 ChangeLogSynchronizer 的异常限制在控制命令内。
 */
const registerSyncControlHandler = (pg: WorkerPGlite) => {
	const writePathSync = new ChangeLogSynchronizer(pg);
	// 不立即启动同步器，等待主线程控制
	// writePathSync.start()

	self.addEventListener("message", async (event) => {
		// 类型说明：Worker message 的 data 没有业务类型，下面用 type 字段守卫为同步控制消息。
		const message = event.data as SyncControlMessage;
		if (message.type !== "sync-control") {
			return;
		}

		try {
			if (message.action === "start") {
				console.log("启动数据同步");
				await writePathSync.start();
			} else if (message.action === "stop") {
				console.log("停止数据同步");
				await writePathSync.stop();
			}
		} catch (error) {
			console.warn(`写入同步控制 ${message.action} 执行失败:`, error);
		}
	});
};

worker({
	// init 只等到 schema-ready 的 pg 即返回；远端同步在后台跑（首个 await 即让出，不拖慢 init）。
	async init() {
		const pg = await openSchemaReadyDatabase();
		registerSyncControlHandler(pg);
		void runElectricSyncPlan(pg);
		return pg;
	},
});
