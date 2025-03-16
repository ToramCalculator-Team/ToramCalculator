
将备份sql复制进容器：docker cp .\db\clientDB\toramDB.sql toram-calculator-postgres-1:/
进入容器：docker exec -it toram-calculator-postgres-1 bash
还原数据库：psql -U postgres -d postgres -f ./toramDB.sql