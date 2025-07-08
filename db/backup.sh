#!/bin/bash

# 加载 .env 文件中的变量
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo ".env 文件不存在！请创建并配置数据库连接信息。"
  exit 1
fi

# 检查必要的环境变量
required_vars=("PG_USERNAME" "PG_PASSWORD" "PG_HOST" "PG_PORT" "PG_DBNAME")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "错误: 环境变量 $var 未设置！"
    exit 1
  fi
done

# 打印环境变量信息（用于调试）
echo "数据库连接信息："
echo "主机: $PG_HOST"
echo "端口: $PG_PORT"
echo "用户名: $PG_USERNAME"
echo "数据库名: $PG_DBNAME"

# 备份目录
OUTPUT_DIR="./test/backups"
mkdir -p "$OUTPUT_DIR"

# 检查是否使用本地数据库
if [ "$PG_HOST" = "localhost" ] || [ "$PG_HOST" = "127.0.0.1" ]; then
  echo "检测到本地数据库，使用 Docker Compose 执行备份..."
  # 使用 Docker Compose 执行备份
  tables=$(docker compose -f ./backend/docker-compose.yaml exec -T postgres psql -U $PG_USERNAME -d $PG_DBNAME -t -c "
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public';
  ")

  # 遍历每个表并导出为 CSV
  for table in $tables; do
      echo "正在导出表: $table..."
      docker compose -f ./backend/docker-compose.yaml exec -T postgres psql -U $PG_USERNAME -d $PG_DBNAME -c "
          COPY (SELECT * FROM \"$table\") 
          TO STDOUT WITH CSV HEADER
      " > "$OUTPUT_DIR/$table.csv"
  done
else
  echo "检测到远程数据库，使用直接连接执行备份..."
  # 使用 Docker 容器连接到远程数据库
  tables=$(docker run --rm postgres:16-alpine psql "postgresql://${PG_USERNAME}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DBNAME}" -t -c "
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public';
  ")

  # 遍历每个表并导出为 CSV
  for table in $tables; do
      echo "正在导出表: $table..."
      docker run --rm postgres:16-alpine psql "postgresql://${PG_USERNAME}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DBNAME}" -c "
          COPY (SELECT * FROM \"$table\") 
          TO STDOUT WITH CSV HEADER
      " > "$OUTPUT_DIR/$table.csv"
  done
fi

echo "所有表已成功备份到 $OUTPUT_DIR 目录！"
