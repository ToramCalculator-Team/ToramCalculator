import { SignJWT } from "jose";
import type { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";
import { findUserById } from "~/repositories/server/user";

export async function POST(event: APIEvent) {
  try {
    // 解析请求体
    const requestBody = await event.request.json();
    const { userId } = requestBody;

    if (!userId) {
      return new Response("缺少UserId", { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return new Response("没找到此UerId", { status: 404 });
    }

    console.log("登录者:", user.name);

    // 生成 JWT
    const jwtPayload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    const jwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30days")
      .sign(secret);

    // 设置 Cookie
    setCookie("jwt", jwt, {
      httpOnly: true, // 确保 Cookie 只能被服务器访问
      secure: process.env.NODE_ENV === "production", // 仅在生产环境启用 Secure
      sameSite: "lax", // 允许跨站请求时携带 JWT
      path: "/", // 确保所有 API 都能访问 JWT
      maxAge: 30 * 24 * 60 * 60, // 30 天
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("登录错误:", error);
    return new Response("Invalid request", { status: 400 });
  }
}
