import type { APIEvent } from "@solidjs/start/server";
import { getCookie } from "vinxi/http";
import { jwtVerify } from "jose";

export async function POST(event: APIEvent) {
  const token = getCookie("jwt");
  if (!token) return new Response("未发现jwt", { status: 401 });

  let user: any;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    user = payload;
  } catch (err) {
    console.error("❌ JWT 验证失败:", err);
    return new Response("JWT 无效", { status: 401 });
  }

  const body = await event.request.json();

  console.log("用户:" + user + " 变更数据,body:", body);

  if (!user) {
    return new Response("未认证用户", { status: 401 });
  }

  // 示例权限判断（可选）
  // if (user.role !== "admin") {
  //   return new Response("当前用户无权限", { status: 403 });
  // }

  try {
    // 🛠️ 实际的同步逻辑在这里，比如保存 changes 到数据库
    body.forEach((changes: any) => {
      console.log("changes:", changes);
      changes.forEach((change: any) => {
        console.log("-变更数据:", change);
      });
    });

    // return new Response("操作成功", { status: 200 });
    return new Response("同步失败", { status: 500 });
  } catch (err) {
    console.error("❌ 数据处理错误:", err);
    return new Response("服务器内部错误", { status: 500 });
  }
}
