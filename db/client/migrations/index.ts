import baselineSql from "../baseline/client.sql?raw";

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

export const CLIENT_DB_MIGRATIONS: ClientDbMigration[] = [];
