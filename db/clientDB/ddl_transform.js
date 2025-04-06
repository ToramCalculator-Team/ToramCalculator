import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ddlFilePath = path.join(__dirname, "ddl.sql");

// 读取文件内容
let ddlContent = fs.readFileSync(ddlFilePath, "utf-8");

// 删除所有 `ALTER TABLE` 语句中涉及 `FOREIGN KEY` 的行
ddlContent = ddlContent.replace(/ALTER TABLE .* FOREIGN KEY.*;\n?/g, "");

// **删除孤立的 `-- AddForeignKey` 行**
ddlContent = ddlContent.replace(/-- AddForeignKey\s*\n?/g, "");

// 删除所有的 `CREATE INDEX` 语句
ddlContent = ddlContent.replace(/CREATE INDEX.*;\n?/g, "");
ddlContent = ddlContent.replace(/CREATE UNIQUE INDEX.*;\n?/g, "");

// **删除孤立的 `-- CreateIndex` 行**
ddlContent = ddlContent.replace(/-- CreateIndex\s*\n?/g, "");

// **去除可能多余的空行**
// ddlContent = ddlContent.replace(/\n{2,}/g, "\n");

fs.writeFileSync(ddlFilePath, ddlContent, "utf-8");

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

  // 如果没有主键，跳过视图和触发器生成
  if (pkCols.length === 0) {
    return `-- Skipped ${tableName} (no primary key)\n`;
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

  let view = "";

  if (pkCols.length > 0) {
    const joinCondition = pkCols.map((pk) => `synced."${pk}" = local."${pk}"`).join(" AND ");
    const whereCondition = `(${pkCols.map((pk) => `local."${pk}" IS NULL`).join(" OR ")} OR local."is_deleted" = FALSE)`;

    view = `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${selectLines.join(",\n")}
  FROM "${tableName}_synced" AS synced
  FULL OUTER JOIN "${tableName}_local" AS local
  ON ${joinCondition}
  WHERE ${whereCondition};`;
  } else {
    // 没有主键：使用 UNION ALL 合并 synced 和 local 表
    view = `
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
BEGIN
    INSERT INTO "${tableName}_local" (
    ${colNames.map((name) => `"${name}"`).join(", ")},
    "changed_columns",
    "write_id"
    )
    VALUES (
    ${colNames.map((name) => `NEW."${name}"`).join(", ")},
    ARRAY[${colNames
      .filter((c) => !pkCols.includes(c))
      .map((c) => `'${c}'`)
      .join(", ")}],
    local_write_id
    );

    INSERT INTO changes (
    "operation",
    "value",
    "write_id",
    "transaction_id"
    )
    VALUES (
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
    changed_cols TEXT[] := '{}';
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
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
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
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
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
const blocks = ddlContent
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

    // output.push(`-- DROP original "${tableName}"`);
    // output.push(`DROP TABLE IF EXISTS "${tableName}";\n`);

    output.push(generateSyncedTable(parsed));
    output.push("");

    output.push(generateLocalTable(parsed));
    output.push("");

    output.push(generateView(parsed));
    output.push("");
  } else {
    // 其余 SQL 保留
    output.push(block);
  }
}

const changesTable = `CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
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

fs.writeFileSync(ddlFilePath, output.join("\n") + changesTable, "utf-8");
console.log(`✅ 已转换ddl ${ddlFilePath}`);
