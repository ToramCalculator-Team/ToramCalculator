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

const notifySyncProgress = (tableName: keyof DB) => {
	self.postMessage({
		type: "sync",
		data: {
			tableName: tableName,
			state: "success",
		},
		timestamp: Date.now().toLocaleString(),
	});
};

const PGLITE_DATA_DIR = "idb://toramCalculatorDB";
const PGLITE_INDEXED_DB_NAME = "toramCalculatorDB";

type DbMigration = ClientDbMigration;

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

const deleteIndexedDb = (name: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error ?? new Error(`Failed to delete IndexedDB ${name}`));
		request.onblocked = () => reject(new Error(`IndexedDB ${name} deletion is blocked`));
	});

const resetDatabase = async (pg: WorkerPGlite | undefined): Promise<WorkerPGlite> => {
	if (pg && "close" in pg && typeof pg.close === "function") {
		await pg.close();
	}
	await deleteIndexedDb(PGLITE_INDEXED_DB_NAME);
	return await createDatabase();
};

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

const hasLegacyInitMigration = async (pg: WorkerPGlite): Promise<boolean> => {
	try {
		const result = await pg.exec(`SELECT name FROM migrations WHERE name = 'init' LIMIT 1;`);
		return result[0]?.rows.length > 0;
	} catch {
		return false;
	}
};

const recordMigration = async (pg: WorkerPGlite, migration: DbMigration) => {
	await ensureMigrationTables(pg);
	await pg.exec(
		`
      INSERT INTO app_schema_migrations (id, from_version, to_version, checksum)
      VALUES ('${migration.id}', ${migration.fromVersion}, ${migration.toVersion}, '${migration.checksum}')
      ON CONFLICT (id) DO NOTHING;
    `,
	);
};

const recordBaseline = async (pg: WorkerPGlite) => {
	await ensureMigrationTables(pg);
	await pg.exec(
		`
      INSERT INTO app_schema_migrations (id, from_version, to_version, checksum)
      VALUES ('${CLIENT_DB_BASELINE.id}', 0, ${CLIENT_DB_BASELINE.version}, '${CLIENT_DB_BASELINE.checksum}')
      ON CONFLICT (id) DO NOTHING;
    `,
	);
};

const getCurrentDbSchemaVersion = async (pg: WorkerPGlite): Promise<number> => {
	const result = await pg.exec(`SELECT MAX(to_version) AS version FROM app_schema_migrations;`);
	const value = result[0]?.rows[0]?.version;
	return typeof value === "number" ? value : Number(value ?? 0);
};

const hasAppliedClientMigrations = async (pg: WorkerPGlite): Promise<boolean> => {
	const result = await pg.exec(`SELECT COUNT(*) AS count FROM app_schema_migrations;`);
	const value = result[0]?.rows[0]?.count;
	return Number(value ?? 0) > 0;
};

const prepareSchemaRuntime = async (pg: WorkerPGlite) => {
	// FTS相关插件
	await pg.exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
	await ensureMigrationTables(pg);
};

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

const resetToBaseline = async (pg: WorkerPGlite | undefined): Promise<WorkerPGlite> => {
	const nextPg = await resetDatabase(pg);
	await prepareSchemaRuntime(nextPg);
	await nextPg.exec(CLIENT_DB_BASELINE.sql);
	await recordBaseline(nextPg);
	await applyMissingMigrations(nextPg, CLIENT_DB_BASELINE.version);
	return nextPg;
};

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

	const nextVersion = await getCurrentDbSchemaVersion(pg);
	if (nextVersion !== DB_SCHEMA_VERSION) {
		throw new Error(`PGlite schema version mismatch: current=${nextVersion}, target=${DB_SCHEMA_VERSION}`);
	}

	return pg;
};

worker({
	async init() {
		let pg = await createDatabase();
		try {
			pg = await applyMigrations(pg);
		} catch (error) {
			console.warn("PGlite迁移失败，测试阶段直接重建本地数据库:", error);
			pg = await resetToBaseline(pg);
		}

		const syncTable = async (tableName: keyof DB, primaryKey: string[], urlParams?: string) => {
			const tableParams = urlParams ?? tableName;
			return pg.electric.syncShapeToTable({
				shape: {
					url: ELECTRIC_HOST,
					params: {
						table: tableParams,
					},
				},
				table: `${tableName}_synced`,
				shapeKey: `${tableName}s:v${DB_SCHEMA_VERSION}`,
				primaryKey: primaryKey,
				onInitialSync: () => notifySyncProgress(tableName),
				onMustRefetch: async (tx) => {
					await tx.exec(`DELETE FROM "${tableName}_synced";`);
				},
			});
		};

		// const userShape = await syncTable('user', ["id"]);
		const _accountShape = await syncTable("account", ["id"]);
		const _accountCreateDataShape = await syncTable("account_create_data", ["userId"]);
		const _accountUpdateDataShape = await syncTable("account_update_data", ["userId"]);
		const _playerShape = await syncTable("player", ["id"]);
		const _statisticShape = await syncTable("statistic", ["id"]);
		const _imageShape = await syncTable("image", ["id"]);
		const _worldShape = await syncTable("world", ["id"]);
		const _activityShape = await syncTable("activity", ["id"]);
		const _addressShape = await syncTable("address", ["id"]);
		const _zoneShape = await syncTable("zone", ["id"]);
		const _linkZoneShape = await syncTable("_linkZones", ["A", "B"], `"_linkZones"`);
		const _npcShape = await syncTable("npc", ["id"]);
		const _taskShape = await syncTable("task", ["id"]);
		const _taskKillRequirementShape = await syncTable("task_kill_requirement", ["id"]);
		const _taskCollectRequireShape = await syncTable("task_collect_require", ["id"]);
		const _taskRewardShape = await syncTable("task_reward", ["id"]);
		const _mobToZoneShape = await syncTable("_mobTozone", ["A", "B"], `"_mobTozone"`);
		const _mobShape = await syncTable("mob", ["id"]);
		const _dropItemShape = await syncTable("drop_item", ["id"]);
		const _itemShape = await syncTable("item", ["id"]);
		const _weaponShape = await syncTable("weapon", ["itemId"]);
		const _armorShape = await syncTable("armor", ["itemId"]);
		const _optionShape = await syncTable("option", ["itemId"]);
		const _specialShape = await syncTable("special", ["itemId"]);
		const _avatarShape = await syncTable("avatar", ["id"]);
		const _avatarToCharacterShape = await syncTable("_avatarTocharacter", ["A", "B"], `"_avatarTocharacter"`);
		const _crystalShape = await syncTable("crystal", ["itemId"]);
		const _crystalToPlayerWeaponShape = await syncTable(
			"_crystalToplayer_weapon",
			["A", "B"],
			`"_crystalToplayer_weapon"`,
		);
		const _crystalToPlayerArmorShape = await syncTable(
			"_crystalToplayer_armor",
			["A", "B"],
			`"_crystalToplayer_armor"`,
		);
		const _crystalToPlayerOptionShape = await syncTable(
			"_crystalToplayer_option",
			["A", "B"],
			`"_crystalToplayer_option"`,
		);
		const _crystalToPlayerSpecialShape = await syncTable(
			"_crystalToplayer_special",
			["A", "B"],
			`"_crystalToplayer_special"`,
		);
		const _recipeShape = await syncTable("recipe", ["id"]);
		const _recipeIngredientShape = await syncTable("recipe_ingredient", ["id"]);
		const _skillShape = await syncTable("skill", ["id"]);
		const _skillVariantShape = await syncTable("skill_variant", ["id"]);
		const _btTreeShape = await syncTable("behavior_tree", ["id"]);
		const _playerWeponShape = await syncTable("player_weapon", ["id"]);
		const _playerArmorShape = await syncTable("player_armor", ["id"]);
		const _playerOptionShape = await syncTable("player_option", ["id"]);
		const _playerSpecialShape = await syncTable("player_special", ["id"]);
		const _customPetShape = await syncTable("player_pet", ["id"]);
		const _characterToConsumableShape = await syncTable(
			"_characterToconsumable",
			["A", "B"],
			`"_characterToconsumable"`,
		);
		const _characterSkillShape = await syncTable("character_skill", ["id"]);
		const _consumableShape = await syncTable("consumable", ["itemId"]);
		const _materialShape = await syncTable("material", ["itemId"]);
		const _comboShape = await syncTable("combo", ["id"]);
		const _characterShape = await syncTable("character", ["id"]);
		const _mercenaryShape = await syncTable("mercenary", ["templateId"]);
		const _memberShape = await syncTable("member", ["id"]);
		const _teamShape = await syncTable("team", ["id"]);
		const _campASimulatorShape = await syncTable("_campA", ["A", "B"], `"_campA"`);
		const _campBSimulatorShape = await syncTable("_campB", ["A", "B"], `"_campB"`);
		const _simulatorShape = await syncTable("simulator", ["id"]);
		// console.log("PGliteWorker初始化完成.....");
		console.log("已同步完成");

		const writePathSync = new ChangeLogSynchronizer(pg);
		// 不立即启动同步器，等待主线程控制
		// writePathSync.start()

		// 添加消息监听器处理同步控制
		self.addEventListener("message", async (event) => {
			const message = event.data as SyncControlMessage;
			if (message.type === "sync-control") {
				if (message.action === "start") {
					console.log("启动数据同步");
					await writePathSync.start();
				} else if (message.action === "stop") {
					console.log("停止数据同步");
					await writePathSync.stop();
				}
			}
		});

		return pg;
	},
});
