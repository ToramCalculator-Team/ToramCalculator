import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";
import { dishWebSocketClient, initDishWebSocket } from "~/lib/dish-websocket";

// 验证JWT并获取用户信息
async function verifyAuth(event: APIEvent) {
	const token = getCookie("jwt");
	if (!token) return null;
	try {
		const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
		const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
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

// POST: 连接WebSocket
export async function POST(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	if (!await isAdmin(jwtUser.sub)) {
		return new Response(JSON.stringify({ error: "无权限" }), { status: 403 });
	}

	const success = await initDishWebSocket();
	const status = dishWebSocketClient.getStatus();
	
	return new Response(JSON.stringify({ 
		success, 
		status,
		message: success ? "连接成功" : "连接失败"
	}), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

// DELETE: 断开WebSocket
export async function DELETE(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	if (!await isAdmin(jwtUser.sub)) {
		return new Response(JSON.stringify({ error: "无权限" }), { status: 403 });
	}

	dishWebSocketClient.disconnect();
	
	return new Response(JSON.stringify({ success: true, message: "已断开" }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
