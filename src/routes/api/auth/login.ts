import { SignJWT } from "jose";
import type { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";
import { findUserByEmail } from "~/repositories/user";
import bcrypt from "bcrypt";

export async function POST(event: APIEvent) {
  try {
    // 解析请求体
    const requestBody = await event.request.json();
    const { email, password } = requestBody;

    if (!email) {
      return new Response(JSON.stringify({ error: "缺少邮箱" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!password) {
      return new Response(JSON.stringify({ error: "缺少密码" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: "用户不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ 使用 bcrypt 进行哈希比对
    const userPassword = user.password ?? "default_password";
    const isPasswordValid = bcrypt.compareSync(password, userPassword);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: "密码错误" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ 认证成功
    console.log("登录者:", user.name);

    // 生成 JWT
    const jwtPayload = {
      sub: user.id,
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
