import type { APIEvent } from "@solidjs/start/server";
import { getCookie } from "vinxi/http";
import { jwtVerify } from "jose";
import { getDB } from "../../../db/repositories/database";
import { findUserById } from "../../../db/repositories/user";
import { getPrimaryKeys } from "../../../db/repositories/untils";

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

// 在 changes.ts 中修改处理逻辑
try {
  const db = await getDB();
  await db.transaction().execute(async (trx) => {
    for (const transaction of body) {
      for (const change of transaction.changes) {
        // 获取表的主键列
        const primaryKeys = await getPrimaryKeys(trx, change.table_name) as string[];
        
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
