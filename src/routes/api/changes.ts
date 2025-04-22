import type { APIEvent } from "@solidjs/start/server";
import { getCookie } from "vinxi/http";
import { jwtVerify } from "jose";
import { getDB } from "~/repositories/database";
import { findUserById } from "~/repositories/user";

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

  const user = await findUserById(jwtUser.id);

  console.log("用户:" + user.name + " 变更数据,body:", body);
  
  // 权限判断
  if (!user) {
    return new Response("未认证用户", { status: 401 });
  }

  // 示例权限判断（可选）
  // if (user.role !== "admin") {
  //   return new Response("当前用户无权限", { status: 403 });
  // }

  try {
    // 🛠️ 实际的同步逻辑在这里，比如保存 changes 到数据库
    const db = await getDB();
    await db.transaction().execute(async (trx) => {
      for (const transaction of body) {
        for (const change of transaction.changes) {
          switch (change.operation) {
            case "insert":
              await trx.insertInto(change.table_name).values(change.value).execute();
              break;

            case "update":
              await trx
                .updateTable(change.table_name)
                .set(change.value)
                .where("id", "=", change.value.id) // 这里只是示例，最好根据你的实际主键条件来写
                .execute();
              break;

            case "delete":
              await trx.deleteFrom(change.table_name).where("id", "=", change.value.id).execute();
              break;

            default:
              throw new Error(`无法识别的数据库操作数: ${change.operation}`);
          }
        }
      }
    });

    return new Response("操作成功", { status: 200 });
    // return new Response("同步失败", { status: 500 });
  } catch (err) {
    console.error("❌ 数据处理错误:", err);
    return new Response("服务器内部错误", { status: 500 });
  }
}
