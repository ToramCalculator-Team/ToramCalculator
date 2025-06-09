import type { APIEvent } from "@solidjs/start/server";
import { getCookie } from "vinxi/http";
import { jwtVerify } from "jose";
import { getDB } from "~/repositories/database";
import { findUserById } from "~/repositories/user";
import { sql, Transaction } from "kysely";
import { DB } from "../../../db/kysely/kyesely";

export async function POST(event: APIEvent) {
  const token = getCookie("jwt");
  if (!token) {
    console.error("用户上传数据时，未发现jwt");
    return new Response("未发现jwt", { status: 401 });
  }

  let jwtUser: any;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    jwtUser = payload;
  } catch (err) {
    console.error("❌ 用户 JWT 验证失败:", err);
    return new Response("JWT 无效", { status: 401 });
  }

  const body = await event.request.json();

  const user = await findUserById(jwtUser.sub);

  console.log("用户:" + user.name + " 变更数据,body:", body);
  
  // 权限判断
  if (!user) {
    return new Response("未认证用户", { status: 401 });
  }

  // 示例权限判断（可选）
  // if (user.role !== "admin") {
  //   return new Response("当前用户无权限", { status: 403 });
  // }

  // 获取表的主键列
  const getPrimaryKeys = async (trx: Transaction<DB>, tableName: string) => {
    try {
      const rows = await trx
        .selectFrom(
          sql<{ column_name: string }>`
            (SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = ${tableName}
              AND tc.table_schema = 'public'
            ORDER BY kcu.ordinal_position)
          `.as('primary_keys')
        )
        .select('primary_keys.column_name')
        .execute();

      const primaryKeys = rows.map((row) => row.column_name);
      console.log("Primary keys for table", tableName, ":", primaryKeys);
      return primaryKeys;
    } catch (error) {
      console.error("Error getting primary keys for table", tableName, ":", error);
      throw error;
    }
  };

// 在 changes.ts 中修改处理逻辑
try {
  const db = await getDB();
  await db.transaction().execute(async (trx) => {
    for (const transaction of body) {
      for (const change of transaction.changes) {
        // 获取表的主键列
        const primaryKeys = await getPrimaryKeys(trx, change.table_name);
        
        // 如果没有主键，跳过这个变更
        if (primaryKeys.length === 0) {
          console.log(`表 ${change.table_name} 没有主键，跳过变更`);
          continue;
        }

        switch (change.operation) {
          case "insert":
            await trx.insertInto(change.table_name).values(change.value).execute();
            break;

          case "update": {
            let query = trx.updateTable(change.table_name).set(change.value);
            // 添加所有主键条件
            for (const pk of primaryKeys) {
              query = query.where(pk, "=", change.value[pk]);
            }
            await query.execute();
            break;
          }

          case "delete": {
            let query = trx.deleteFrom(change.table_name);
            // 添加所有主键条件
            for (const pk of primaryKeys) {
              query = query.where(pk, "=", change.value[pk]);
            }
            await query.execute();
            break;
          }

          default:
            throw new Error(`无法识别的数据库操作数: ${change.operation}`);
        }
      }
    }
  });

  return new Response("操作成功", { status: 200 });
} catch (err) {
  console.error("❌ 数据处理错误:", err);
  return new Response("服务器内部错误", { status: 500 });
}
}
