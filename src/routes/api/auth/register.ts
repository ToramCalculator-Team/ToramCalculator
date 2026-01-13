import { getDB } from "@db/repositories/database";
import { createUser, findUserByEmail } from "@db/repositories/user";
import { createId } from "@paralleldrive/cuid2";
import type { APIEvent } from "@solidjs/start/server";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { setCookie } from "vinxi/http";

export async function POST(event: APIEvent) {
	try {
		// 解析请求体
		const requestBody = await event.request.json();
		const { email, userName, password } = requestBody;

		// 🛑 校验输入
		if (!email || !password) {
			return new Response(JSON.stringify({ error: "缺少 Email 或密码" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 🛑 验证 Email 格式
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return new Response(JSON.stringify({ error: "无效的 Email 格式" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 🛑 密码长度校验（至少 6 个字符）
		if (password.length < 6) {
			return new Response(JSON.stringify({ error: "密码必须至少 6 个字符" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// ✅ 检查 Email 是否已注册
		const existingUser = await findUserByEmail(email);
		if (existingUser) {
			return new Response(JSON.stringify({ error: "Email 已被注册" }), {
				status: 409,
				headers: { "Content-Type": "application/json" },
			});
		}

		// ✅ 生成哈希密码
		const hashedPassword = bcrypt.hashSync(password, 10);

		// ✅ 创建用户
		console.log("注册者:", userName);
		const db = await getDB();
		const user = await db.transaction().execute(async (trx) => {
			return await createUser(trx, {
				name: userName || email.split("@")[0], // 默认用户名
				email,
				password: hashedPassword, // 存储加密后的密码
				id: createId(),
			});
		});
		console.log(`${userName}注册成功`, "id为:", user.id);
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

		return new Response(JSON.stringify({ message: "注册成功", userId: user.id }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("注册错误:", error);
		return new Response(JSON.stringify({ error: "服务器错误" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
