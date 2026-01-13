/// <reference lib="webworker" />

import initSQL from "@db/generated/client.sql?raw";
import type { DB } from "@db/generated/zod/index";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { live } from "@electric-sql/pglite/live";
import { worker } from "@electric-sql/pglite/worker";
import { electricSync } from "@electric-sql/pglite-sync";
import { ChangeLogSynchronizer } from "~/lib/ChangeLogSynchronizer";

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

const migrates = [
	{
		name: "init",
		sql: initSQL,
	},
];

worker({
	async init() {
		const pg = await PGlite.create({
			dataDir: "idb://toramCalculatorDB",
			relaxedDurability: true,
			// debug: 1,
			extensions: {
				live,
				electric: electricSync({ debug: false }),
				pg_trgm,
			},
		});

		// FTS相关插件
		await pg.exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

		// 添加本地迁移记录表
		await pg.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

		const result = await pg.exec(`SELECT name FROM migrations ORDER BY id;`);
		const appliedMigrations = result[0].rows.map((row) => row.name);
		for (const migration of migrates) {
			if (!appliedMigrations.includes(migration.name)) {
				await pg.exec(migration.sql);
				await pg.exec(
					`
        INSERT INTO migrations (name)
        VALUES ('${migration.name}');
      `,
				);
				console.log(`已应用迁移: ${migration.name}`);
			}
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
				shapeKey: `${tableName}s`,
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
		const _skillEffectShape = await syncTable("skill_effect", ["id"]);
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
