import { describe, expect, it } from "vitest";
import { convertPrismaDiffToClientSql } from "./generateClientMigration";

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
});
