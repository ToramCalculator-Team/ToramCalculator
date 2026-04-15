import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";
import { dishWebSocketClient } from "~/lib/dish-websocket";

// 验证JWT并获取用户信息
async function verifyAuth(event: APIEvent) {
	const token = getCookie("jwt");
	if (!token) {
		return null;
	}

	try {
		const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
		const { payload } = await jwtVerify(token, secret, {
			algorithms: ["HS256"],
		});
		return payload;
	} catch {
		return null;
	}
}

// 检查用户是否是管理员
async function isAdmin(userId: string): Promise<boolean> {
	const { getDB } = await import("@db/repositories/database");
	const db = await getDB();
	const account = await db
		.selectFrom("account")
		.where("userId", "=", userId)
		.where("type", "=", "Admin")
		.selectAll()
		.executeTakeFirst();
	return !!account;
}

// GET: 获取WebSocket状态
export async function GET(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	// 只有管理员可以查看WebSocket状态
	if (!await isAdmin(jwtUser.sub)) {
		return new Response(JSON.stringify({ error: "无权限" }), { status: 403 });
	}

	const status = dishWebSocketClient.getStatus();
	
	return new Response(JSON.stringify(status), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
