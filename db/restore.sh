#!/bin/bash

set -e  # 遇到错误时停止执行

# 加载 .env 配置
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env 文件不存在！请创建并配置数据库连接信息。"
  exit 1
fi

# 备份目录
BACKUP_DIR="./test/backup_csv"

# PostgreSQL 运行在 Docker 容器中
PG_CONTAINER_NAME="toram-calculator-postgres-1"
PG_URL="postgresql://${PG_USERNAME}:${PG_PASSWORD}@${PG_CONTAINER_NAME}:${PG_PORT}/${PG_DBNAME}"

echo "🔄 开始从 CSV 文件恢复数据库..."

# 1️⃣ **禁用外键约束**
echo "🚫 禁用外键约束..."
docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -c "SET session_replication_role = 'replica';" 2>/dev/null

# 2️⃣ **获取数据库中的所有表，按依赖关系排序**
echo "📌 获取表的正确导入顺序..."
tables=$(docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -t -c "
WITH RECURSIVE full_deps AS (
    -- 捕捉所有外键依赖关系（包括关联表）
    SELECT 
        c.oid::regclass AS child_table,
        p.oid::regclass AS parent_table
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid  -- 子表（含外键的表）
    JOIN pg_class p ON con.confrelid = p.oid -- 父表（被引用的表）
    WHERE con.contype = 'f'
),
all_tables AS (
    SELECT oid::regclass AS table_name
    FROM pg_class 
    WHERE relkind = 'r' 
      AND relnamespace = 'public'::regnamespace
),
sorted AS (
    -- 初始节点：没有父表的表（根节点）
    SELECT 
        table_name,
        ARRAY[table_name] AS path,
        0 AS depth
    FROM all_tables
    WHERE table_name NOT IN (SELECT child_table FROM full_deps)
    
    UNION ALL
    
    -- 递归添加依赖项：确保父表先于子表
    SELECT 
        d.child_table,
        s.path || d.child_table,
        s.depth + 1
    FROM full_deps d
    JOIN sorted s ON d.parent_table = s.table_name
    WHERE NOT d.child_table = ANY(s.path)  -- 防止循环
),
final_order AS (
    SELECT 
        table_name,
        depth,
        MAX(depth) OVER (PARTITION BY table_name) AS max_depth  -- ✅ 计算最大深度
    FROM sorted
),
distinct_tables AS (
    SELECT DISTINCT ON (table_name) table_name, depth  -- ✅ 显式去重
    FROM final_order
    WHERE depth = max_depth
    ORDER BY table_name, depth
)
SELECT regexp_replace(table_name::text, '\"', '', 'g') AS table_name
FROM distinct_tables
ORDER BY depth, table_name;
")

# 3️⃣ **按顺序导入 CSV 文件**
echo "📥 按依赖顺序导入 CSV 文件..."
for table in $tables; do
    csv_file="$BACKUP_DIR/$table.csv"
    if [ -f "$csv_file" ]; then
        echo "⬆️ 正在导入表: $table..."
        docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -c "\copy \"$table\" FROM STDIN CSV HEADER;" < "$csv_file" 2>/dev/null
    else
        echo "⚠️ 跳过: $table (未找到 $csv_file)"
    fi
done

# 4️⃣ **恢复外键约束**
echo "🔄 恢复外键约束..."
docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -c "SET session_replication_role = 'origin';" 2>/dev/null

# 5️⃣ **修复自增主键（序列）**
echo "🔧 修复自增序列..."
for table in $tables; do
    echo "  - 处理表: $table"
    docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -c "
        DO \$\$ 
        DECLARE 
            seq_name TEXT;
            pk_column TEXT;
            table_exists BOOLEAN;
        BEGIN
            -- 检查表是否存在
            SELECT EXISTS (
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = '$table'
                  AND n.nspname = 'public'
            ) INTO table_exists;

            IF table_exists THEN
                -- 获取主键列名
                SELECT a.attname INTO pk_column
                FROM pg_index i
                JOIN pg_attribute a ON a.attnum = ANY(i.indkey) AND a.attrelid = i.indrelid
                WHERE i.indrelid = '\"$table\"'::regclass  -- ✅ 处理大小写敏感
                  AND i.indisprimary;

                -- 如果存在单列主键，则获取序列并重置
                IF pk_column IS NOT NULL THEN
                    SELECT pg_get_serial_sequence('\"$table\"', pk_column) INTO seq_name;
                    IF seq_name IS NOT NULL THEN
                        EXECUTE 'SELECT setval(' || quote_literal(seq_name) || ', COALESCE((SELECT MAX(' || quote_ident(pk_column) || ') FROM \"$table\"), 1), false)';
                    END IF;
                ELSE
                    RAISE NOTICE '表 % 没有单列主键，跳过序列修复', '$table';
                END IF;
            ELSE
                RAISE NOTICE '表 % 不存在，跳过序列修复', '$table';
            END IF;
        END
        \$\$;" 2>/dev/null
done

echo "✅ 数据库恢复完成！"
