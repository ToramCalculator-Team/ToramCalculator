#!/bin/sh

# PostgreSQL 健康检查脚本
# 确保数据库完全初始化后才标记为健康

# 检查 PostgreSQL 是否接受连接
if ! pg_isready -U postgres; then
    echo "PostgreSQL is not ready yet."
    exit 1
fi

# 检查 PostgreSQL 是否已经完成了初始化
# 通过检查数据库是否可以正常执行查询来判断
# 如果数据库还在初始化过程中，查询会失败

# 首先检查数据库是否可以连接
if ! psql -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "PostgreSQL is running but not ready for queries yet"
    exit 1
fi

# 检查是否有表创建（说明 init.sql 已执行）
TABLE_COUNT=$(psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

# 如果表数量为 0，说明初始化还没完成
if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -eq 0 ]; then
    echo "PostgreSQL is ready but tables not created yet"
    exit 1
fi

# 检查 PostgreSQL 是否已经完成了完整的初始化周期
# 通过检查数据库的进程状态来判断
# 如果数据库还在执行 init.sql，会有特殊的进程状态

# 检查是否有 init.sql 相关的进程还在运行
# 在 PostgreSQL 初始化过程中，会有特殊的进程执行 init.sql
INIT_PROCESSES=$(psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query LIKE '%init.sql%' AND query NOT LIKE '%pg_stat_activity%';" 2>/dev/null | tr -d ' ')

if [ -n "$INIT_PROCESSES" ] && [ "$INIT_PROCESSES" -gt 0 ]; then
    echo "PostgreSQL is running but init.sql is still executing"
    exit 1
fi

# 检查数据库是否处于稳定状态
# 如果数据库刚刚完成初始化，可能还有一些后台进程在运行
# 我们检查是否有任何长时间运行的查询或事务（排除复制相关的查询）

ACTIVE_QUERIES=$(psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%' AND query NOT LIKE '%START_REPLICATION%' AND query NOT LIKE '%CREATE_REPLICATION_SLOT%' AND query NOT LIKE '%pg_drop_replication_slot%';" 2>/dev/null | tr -d ' ')

if [ -n "$ACTIVE_QUERIES" ] && [ "$ACTIVE_QUERIES" -gt 0 ]; then
    echo "PostgreSQL is running but has active queries (may still be initializing)"
    exit 1
fi

echo "PostgreSQL initialization complete - $TABLE_COUNT tables created, no active initialization processes"
exit 0
