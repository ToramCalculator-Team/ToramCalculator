import baselineSql from "../baseline/client.sql?raw";
import migration_20260608_080648_v1_to_v2_Sql from "./20260608_080648_v1_to_v2/client.sql?raw";
import migration_20260712_174440_v2_to_v3_Sql from "./20260712_174440_v2_to_v3/client.sql?raw";
import migration_20260713_022543_v3_to_v4_Sql from "./20260713_022543_v3_to_v4/client.sql?raw";
import migration_20260722_064153_v4_to_v5_Sql from "./20260722_064153_v4_to_v5/client.sql?raw";
import migration_20260724_093217_v5_to_v6_Sql from "./20260724_093217_v5_to_v6/client.sql?raw";

export type ClientDbBaseline = {
	id: string;
	version: number;
	checksum: string;
	sql: string;
};

export type ClientDbMigration = {
	id: string;
	fromVersion: number;
	toVersion: number;
	checksum: string;
	sql: string;
};

// 设计说明：本文件由 Prisma custom generator 维护。
// Vite 需要静态 raw import，因此迁移账本以生成的 TS 入口暴露给 PGlite Worker。
export const CLIENT_DB_BASELINE: ClientDbBaseline = {
	id: "baseline",
	version: 1,
	checksum: "8d565d41",
	sql: baselineSql,
};

export const CLIENT_DB_MIGRATIONS: ClientDbMigration[] = [
	{
		id: "20260608_080648_v1_to_v2",
		fromVersion: 1,
		toVersion: 2,
		checksum: "9d7f3338",
		sql: migration_20260608_080648_v1_to_v2_Sql,
	},
	{
		id: "20260712_174440_v2_to_v3",
		fromVersion: 2,
		toVersion: 3,
		checksum: "11456f27",
		sql: migration_20260712_174440_v2_to_v3_Sql,
	},
	{
		id: "20260713_022543_v3_to_v4",
		fromVersion: 3,
		toVersion: 4,
		checksum: "e20c729f",
		sql: migration_20260713_022543_v3_to_v4_Sql,
	},
	{
		id: "20260722_064153_v4_to_v5",
		fromVersion: 4,
		toVersion: 5,
		checksum: "5b8437b6",
		sql: migration_20260722_064153_v4_to_v5_Sql,
	},
	{
		id: "20260724_093217_v5_to_v6",
		fromVersion: 5,
		toVersion: 6,
		checksum: "9c2612d2",
		sql: migration_20260724_093217_v5_to_v6_Sql,
	},
];
