import { describe, expect, it } from "vitest";
import {
	convertPrismaDiffToClientSql,
	hasExecutablePrismaDiff,
	haveEquivalentPrismaSchemaText,
} from "./generateClientMigration";

const generatedClientSql = `-- member
CREATE TABLE IF NOT EXISTS "member_synced" (
  "id" TEXT NOT NULL,
  "behavior" JSONB NOT NULL,
  "formationOrder" INTEGER NOT NULL,
  CONSTRAINT "member_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "member_local" (
  "id" TEXT,
  "behavior" JSONB,
  "formationOrder" INTEGER,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "member_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "member" AS SELECT 1;
CREATE OR REPLACE FUNCTION member_insert_trigger() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
`;

describe("客户端迁移 ALTER TABLE 转换", () => {
	it("逐项转换复合列变更，并保留 synced/local 各自的目标约束", () => {
		const prismaDiff = `-- AlterTable
ALTER TABLE "member" DROP COLUMN "sequence",
ADD COLUMN "behavior" JSONB NOT NULL DEFAULT '{"steps":[1,2]}'::jsonb,
ADD COLUMN "formationOrder" DECIMAL(10, 2) NOT NULL;
`;

		const sql = convertPrismaDiffToClientSql(prismaDiff, generatedClientSql);

		expect(sql.indexOf('DROP VIEW IF EXISTS "member"')).toBeLessThan(sql.indexOf('ALTER TABLE "member_synced"'));
		expect(sql).toContain(`ALTER TABLE "member_synced"
DROP COLUMN "sequence",
ADD COLUMN "behavior" JSONB NOT NULL,
ADD COLUMN "formationOrder" INTEGER NOT NULL;`);
		expect(sql).toContain(`ALTER TABLE "member_local"
DROP COLUMN "sequence",
ADD COLUMN "behavior" JSONB,
ADD COLUMN "formationOrder" INTEGER;`);
		expect(sql).not.toMatch(/(?:^|;\n\n)ADD COLUMN/);
		expect(sql.match(/CREATE OR REPLACE VIEW "member"/g)).toHaveLength(1);
	});

	it("按 synced/local 的目标列定义转换可空性变化", () => {
		const prismaDiff = `-- AlterTable
ALTER TABLE "member" ALTER COLUMN "behavior" DROP NOT NULL;
`;
		const nullableGeneratedClientSql = generatedClientSql.replace(
			'  "behavior" JSONB NOT NULL,',
			'  "behavior" JSONB,',
		);

		const sql = convertPrismaDiffToClientSql(prismaDiff, nullableGeneratedClientSql);

		expect(sql).toContain(`ALTER TABLE "member_synced"
ALTER COLUMN "behavior" DROP NOT NULL;`);
		expect(sql).toContain(`ALTER TABLE "member_local"
ALTER COLUMN "behavior" DROP NOT NULL;`);
	});

	it("目标 synced 列必填时设置约束，同时保持 local 覆盖列可空", () => {
		const prismaDiff = `-- AlterTable
ALTER TABLE "member" ALTER COLUMN "behavior" SET NOT NULL;
`;

		const sql = convertPrismaDiffToClientSql(prismaDiff, generatedClientSql);

		expect(sql).toContain(`ALTER TABLE "member_synced"
ALTER COLUMN "behavior" SET NOT NULL;`);
		expect(sql).toContain(`ALTER TABLE "member_local"
ALTER COLUMN "behavior" DROP NOT NULL;`);
	});
});

describe("Prisma schema 迁移等价判断", () => {
	it("忽略文件末尾换行，避免产生空迁移", () => {
		expect(haveEquivalentPrismaSchemaText("model a {}\n", "model a {}")).toBe(true);
		expect(haveEquivalentPrismaSchemaText("model a {}", "model b {}")).toBe(false);
	});

	it("Prisma 返回空 diff 时不生成迁移版本", () => {
		expect(hasExecutablePrismaDiff("\n")).toBe(false);
		expect(hasExecutablePrismaDiff("-- This is an empty migration.\n")).toBe(false);
		expect(hasExecutablePrismaDiff('ALTER TABLE "a" ADD COLUMN "name" TEXT;')).toBe(true);
	});
});
