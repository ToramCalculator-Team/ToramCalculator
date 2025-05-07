/**
 * @file init_transform.js
 * @description 客户端数据库初始化转换器
 * 
 * 此脚本用于将服务端数据库结构转换为客户端离线同步架构。
 * 转换过程包括：
 * 
 * 1. 数据表拆分
 *    - 将每个表拆分为 synced 和 local 两个表
 *    - synced 表存储从服务器同步的数据
 *    - local 表存储本地修改的数据
 * 
 * 2. 约束优化
 *    - 移除外键约束，避免同步冲突
 *    - 移除索引，优化本地存储性能
 * 
 * 3. 视图生成
 *    - 为每个表创建合并视图
 *    - 视图自动合并 synced 和 local 表的数据
 * 
 * 4. 变更追踪
 *    - 为 synced 和 local 表添加触发器
 *    - 触发器自动记录数据变更到 changes 表
 *    - 变更记录用于后续的数据同步
 * 
 * 使用方式：
 * 此脚本由 generator.js 自动调用，用于生成客户端数据库初始化文件。
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initSQLFilePath = path.join(__dirname, "init.sql");

// 读取文件内容
let initContent = fs.readFileSync(initSQLFilePath, "utf-8");

// 删除所有 `ALTER TABLE` 语句中涉及 `FOREIGN KEY` 的行
initContent = initContent.replace(/ALTER TABLE .* FOREIGN KEY.*;\n?/g, "");

// **删除孤立的 `-- AddForeignKey` 行**
initContent = initContent.replace(/-- AddForeignKey\s*\n?/g, "");

// 删除所有的 `CREATE INDEX` 语句
initContent = initContent.replace(/CREATE INDEX.*;\n?/g, "");
initContent = initContent.replace(/CREATE UNIQUE INDEX.*;\n?/g, "");

// **删除孤立的 `-- CreateIndex` 行**
initContent = initContent.replace(/-- CreateIndex\s*\n?/g, "");

// **去除可能多余的空行**
// initContent = initContent.replace(/\n{2,}/g, "\n");

fs.writeFileSync(initSQLFilePath, initContent, "utf-8");

console.log("✅ 外键约束及索引已删除！");

///////////////// 将sql转换成  *_synced 表（只读副本）；*_local 表（本地状态 + 乐观更新）；VIEW（合并读取视图）； ////////////////////

/**
 * 从原始 CREATE TABLE 语句中提取结构信息
 */
function parseCreateTable(sql) {
  const match = sql.match(/CREATE TABLE "?(\w+)"?\s*\(([\s\S]+?)\);/i);
  if (!match) return null;
  const [, tableName, body] = match;
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const columns = [];
  const constraints = [];

  for (const line of lines) {
    if (line.startsWith("CONSTRAINT") || line.startsWith("PRIMARY KEY") || line.startsWith("UNIQUE")) {
      constraints.push(line.replace(/,+$/, ""));
    } else {
      columns.push(line.replace(/,+$/, ""));
    }
  }

  return { tableName, columns, constraints };
}

/**
 * 重命名主键约束
 */
function renamePrimaryKeyConstraint(constraints, newName) {
  return constraints.map((constraint) => {
    return constraint.replace(/CONSTRAINT\s+"[^"]*"\s+PRIMARY KEY/i, `CONSTRAINT "${newName}" PRIMARY KEY`);
  });
}

/**
 * 生成 synced 表结构
 */
function generateSyncedTable({ tableName, columns, constraints }) {
  const renamedConstraints = renamePrimaryKeyConstraint(constraints, `${tableName}_synced_pkey`);
  const syncedCols = [...columns, `"write_id" UUID`];
  return `CREATE TABLE IF NOT EXISTS "${tableName}_synced" (\n  ${[...syncedCols, ...renamedConstraints].join(",\n  ")}\n);`;
}

/**
 * 生成 local 表结构
 */
function generateLocalTable({ tableName, columns, constraints }) {
  const localCols = columns.map((col) => {
    const [name, type] = col.split(/\s+/, 2);
    if (name === "id") return col; // 保留主键原样
    return `${name} ${type}`;
  });

  const renamedConstraints = renamePrimaryKeyConstraint(constraints, `${tableName}_local_pkey`);

  return `CREATE TABLE IF NOT EXISTS "${tableName}_local" (\n  ${[
    ...localCols,
    `"changed_columns" TEXT[]`,
    `"is_deleted" BOOLEAN NOT NULL DEFAULT FALSE`,
    `"write_id" UUID NOT NULL`,
    ...renamedConstraints,
  ].join(",\n  ")}
);`;
}

/**
 * 生成视图
 */
function generateView({ tableName, columns, constraints }) {
  const colNames = columns.map((col) => col.split(/\s+/, 1)[0].replace(/^"|"$/g, ""));

  // 解析主键字段
  const pkConstraint = constraints.find((c) => c.includes("PRIMARY KEY"));
  const pkCols = pkConstraint
    ? pkConstraint
        .match(/\(([^)]+)\)/)[1]
        .split(",")
        .map((s) => s.trim().replace(/"/g, ""))
    : [];

  // 对于关联表，如果没有主键，使用所有列作为主键
  if (pkCols.length === 0 && tableName.startsWith("_")) {
    pkCols.push(...colNames);
  }

  // 如果仍然没有主键，使用 UNION ALL 方式
  if (pkCols.length === 0) {
    return `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${colNames.map((name) => `   synced."${name}" AS "${name}"`).join(",\n")}
  FROM "${tableName}_synced" AS synced
  UNION ALL
  SELECT
  ${colNames.map((name) => `   local."${name}" AS "${name}"`).join(",\n")}
  FROM "${tableName}_local" AS local
  WHERE local."is_deleted" = FALSE;`;
  }

  const selectLines = colNames.map((name) =>
    pkCols.includes(name)
      ? `   COALESCE(local."${name}", synced."${name}") AS "${name}"`
      : `   CASE
    WHEN '${name}' = ANY(local.changed_columns)
      THEN local."${name}"
      ELSE synced."${name}"
    END AS "${name}"`,
  );

  const joinCondition = pkCols.map((pk) => `synced."${pk}" = local."${pk}"`).join(" AND ");
  const whereCondition = `(${pkCols.map((pk) => `local."${pk}" IS NULL`).join(" OR ")} OR local."is_deleted" = FALSE)`;

  const view = `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${selectLines.join(",\n")}
  FROM "${tableName}_synced" AS synced
  FULL OUTER JOIN "${tableName}_local" AS local
  ON ${joinCondition}
  WHERE ${whereCondition};`;

  const jsonFields = colNames.map((name) => `'${name}', NEW."${name}"`).join(",\n      ");
  const updateJsonFields = colNames
    .map((name) => `'${name}', COALESCE(NEW."${name}", local."${name}")`)
    .join(",\n      ");

  const changedColsCheck = colNames
    .filter((c) => !pkCols.includes(c))
    .map(
      (name) => `
    IF NEW."${name}" IS DISTINCT FROM synced."${name}" THEN
      changed_cols := array_append(changed_cols, '${name}');
    END IF;`,
    )
    .join("");

  const triggerFnInsert = `
CREATE OR REPLACE FUNCTION ${tableName}_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Add all non-primary key columns to changed_columns
    ${colNames
      .filter(name => !pkCols.includes(name))
      .map(name => `changed_cols := array_append(changed_cols, '${name}');`)
      .join('\n    ')}

    INSERT INTO "${tableName}_local" (
    ${colNames.map((name) => `"${name}"`).join(", ")},
    changed_columns,
    write_id
    )
    VALUES (
    ${colNames.map((name) => `NEW."${name}"`).join(", ")},
    changed_cols,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'insert',
    jsonb_build_object(
        ${jsonFields}
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

  const updateSetLines =
    colNames
      .filter((c) => !pkCols.includes(c))
      .map(
        (name) =>
          `
    "${name}" = CASE WHEN NEW."${name}" IS DISTINCT FROM synced."${name}" THEN NEW."${name}" ELSE local."${name}" END`,
      )
      .join(",") || "-- no non-pk fields";

  const triggerFnUpdate = `
CREATE OR REPLACE FUNCTION ${tableName}_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "${tableName}_synced"%ROWTYPE;
    local "${tableName}_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "${tableName}_synced" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    SELECT * INTO local FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    ${changedColsCheck || "-- no non-pk fields to track"}
    IF NOT FOUND THEN
    INSERT INTO "${tableName}_local" (
        ${colNames.map((name) => `"${name}"`).join(", ")},
        changed_columns,
        write_id
    )
    VALUES (
        ${colNames.map((name) => `NEW."${name}"`).join(", ")},
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "${tableName}_local"
    SET
        ${updateSetLines},
        changed_columns = (
        SELECT array_agg(DISTINCT col) FROM (
            SELECT unnest(local.changed_columns) AS col
            UNION
            SELECT unnest(changed_cols) AS col
        ) AS cols
        ),
        write_id = local_write_id
    WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'update',
    jsonb_strip_nulls(jsonb_build_object(
        ${updateJsonFields}
    )),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

  const triggerFnDelete = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")}) THEN
    UPDATE "${tableName}_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")};
    ELSE
    INSERT INTO "${tableName}_local" (
        ${pkCols.join(", ")},
        "is_deleted",
        "write_id"
    )
    VALUES (
        ${pkCols.map((pk) => `OLD."${pk}"`).join(", ")},
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'delete',
    jsonb_build_object(${pkCols.map((pk) => `'${pk}', OLD."${pk}"`).join(", ")}),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;`;

  const triggers = `
CREATE OR REPLACE TRIGGER ${tableName}_insert
INSTEAD OF INSERT ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_insert_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_update
INSTEAD OF UPDATE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_update_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_delete
INSTEAD OF DELETE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_trigger();
`;

  const syncedInsertUpdateCleanupFn = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "${tableName}_local"
  WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")}
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

  const syncedDeleteCleanupFn = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "${tableName}_local"
  WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")};
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
`;

  const syncedTriggers = `
CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "${tableName}_synced"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "${tableName}_synced"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_local_on_synced_delete_trigger();
`;

  return [
    view,
    triggerFnInsert,
    triggerFnUpdate,
    triggerFnDelete,
    triggers,
    syncedInsertUpdateCleanupFn,
    syncedDeleteCleanupFn,
    syncedTriggers,
  ].join("\n");
}

// 匹配完整的 SQL 块（包括注释）
const blocks = initContent
  .split(/(?=^--|^CREATE\s|^ALTER\s|^DROP\s)/gim)
  .map((block) => block.trim())
  .filter(Boolean);

const output = [];

for (const block of blocks) {
  if (/^CREATE\s+TABLE/i.test(block)) {
    const parsed = parseCreateTable(block);
    if (!parsed) {
      output.push(`-- ⚠️ 无法解析的表定义保留如下：\n${block}`);
      continue;
    }

    const { tableName } = parsed;

    output.push(`-- ${tableName}`);

    // output.push(`-- DROP original "${tableName}"`);
    // output.push(`DROP TABLE IF EXISTS "${tableName}";\n`);

    output.push(generateSyncedTable(parsed));

    output.push(generateLocalTable(parsed));

    output.push(generateView(parsed));
  } else {
    // 其余 SQL 保留
    output.push(block);
  }
}

const changesTable = `CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  write_id UUID NOT NULL,
  transaction_id XID8 NOT NULL
);

CREATE OR REPLACE FUNCTION changes_notify_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER changes_notify
AFTER INSERT ON changes
FOR EACH ROW
EXECUTE FUNCTION changes_notify_trigger();
`;

fs.writeFileSync(initSQLFilePath, output.join("\n") + changesTable, "utf-8");
console.log(`✅ 已转换initSQL ${initSQLFilePath}`);
