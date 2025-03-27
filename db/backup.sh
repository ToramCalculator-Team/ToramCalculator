#!/bin/bash

# 加载 .env 文件中的变量
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo ".env 文件不存在！请创建并配置数据库连接信息。"
  exit 1
fi

# 备份目录
OUTPUT_DIR="./test/backup_csv"
mkdir -p "$OUTPUT_DIR"

# PostgreSQL 运行在 Docker 容器中，确保连接的是 Docker 网络
PG_CONTAINER_NAME="toram-calculator-postgres-1"
PG_URL="postgresql://${PG_USERNAME}:${PG_PASSWORD}@${PG_CONTAINER_NAME}:${PG_PORT}/${PG_DBNAME}"

# 获取数据库中的所有表
tables=$(docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -t -c "
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public';
")

# 遍历每个表并导出为 CSV
for table in $tables; do
    echo "正在导出表: $table..."
    docker exec -i $PG_CONTAINER_NAME psql "$PG_URL" -c "
        COPY (SELECT * FROM \"$table\") 
        TO STDOUT WITH CSV HEADER
    " > "$OUTPUT_DIR/$table.csv"
done

echo "所有表已成功备份到 $OUTPUT_DIR 目录！"
