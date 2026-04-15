import { getDB } from "@db/repositories/database";
import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";
import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";

// 配置项 schema
const ConfigSchema = z.object({
	key: z.string().min(1),
	value: z.string(),
	remark: z.string().optional(),
});

// WebSocket配置 keys
const WS_CONFIG_KEYS = ["ws_url", "ws_enabled"] as const;

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
	const db = await getDB();
	const account = await db
		.selectFrom("account")
		.where("userId", "=", userId)
		.where("type", "=", "Admin")
		.selectAll()
		.executeTakeFirst();
	return !!account;
}

// 获取用户的account
async function getUserAccount(userId: string) {
	const db = await getDB();
	return await db
		.selectFrom("account")
		.where("userId", "=", userId)
		.selectAll()
		.executeTakeFirst();
}

// GET: 获取配置
export async function GET(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	const isAdminUser = await isAdmin(jwtUser.sub);

	try {
		const db = await getDB();
		const url = new URL(event.request.url);
		const key = url.searchParams.get("key");

		if (key) {
			// 获取单个配置
			const config = await db
				.selectFrom("dish_config")
				.where("key", "=", key)
				.selectAll()
				.executeTakeFirst();

			if (!config) {
				return new Response(JSON.stringify({ error: "配置不存在" }), { status: 404 });
			}

			return new Response(JSON.stringify({ data: config, isAdmin: isAdminUser }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} else {
			// 获取所有配置
			let query = db.selectFrom("dish_config").selectAll();
			
			if (!isAdminUser) {
				// 非管理员只能看着！
				query = query.where("key", "in", ["ws_enabled"]);
			}

			const configs = await query.execute();

			return new Response(JSON.stringify({ data: configs, isAdmin: isAdminUser }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}
	} catch (err) {
		console.error("获取配置失败:", err);
		return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
	}
}

// POST: 创建或更新配置
export async function POST(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	// 只有管理员可以修改配置
	if (!await isAdmin(jwtUser.sub)) {
		return new Response(JSON.stringify({ error: "无权限，只有管理员可以修改配置" }), { status: 403 });
	}

	const account = await getUserAccount(jwtUser.sub);
	if (!account) {
		return new Response(JSON.stringify({ error: "用户账户不存在" }), { status: 401 });
	}

	try {
		const body = await event.request.json();
		const data = ConfigSchema.parse(body);

		const db = await getDB();
		const now = new Date();

		// 检查配置是否已存在
		const existing = await db
			.selectFrom("dish_config")
			.where("key", "=", data.key)
			.selectAll()
			.executeTakeFirst();

		if (existing) {
			// 更新
			await db
				.updateTable("dish_config")
				.set({
					value: data.value,
					remark: data.remark ?? null,
					updatedAt: now,
					updatedById: account.id,
				})
				.where("key", "=", data.key)
				.execute();

			return new Response(JSON.stringify({ success: true, action: "updated" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} else {
			// 创建
			const id = createId();
			await db.insertInto("dish_config").values({
				id,
				key: data.key,
				value: data.value,
				remark: data.remark ?? null,
				createdAt: now,
				updatedAt: now,
				updatedById: account.id,
			}).execute();

			return new Response(JSON.stringify({ success: true, action: "created", data: { id } }), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			});
		}
	} catch (err) {
		console.error("保存配置失败:", err);
		if (err instanceof z.ZodError) {
			return new Response(JSON.stringify({ error: err.errors }), { status: 400 });
		}
		return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
	}
}

// DELETE: 删除配置
export async function DELETE(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	// 只有管理员可以删除配置
	if (!await isAdmin(jwtUser.sub)) {
		return new Response(JSON.stringify({ error: "无权限，只有管理员可以删除配置" }), { status: 403 });
	}

	try {
		const url = new URL(event.request.url);
		const key = url.searchParams.get("key");

		if (!key) {
			return new Response(JSON.stringify({ error: "缺少配置key" }), { status: 400 });
		}

		const db = await getDB();
		const result = await db
			.deleteFrom("dish_config")
			.where("key", "=", key)
			.returningAll()
			.executeTakeFirst();

		if (!result) {
			return new Response(JSON.stringify({ error: "配置不存在" }), { status: 404 });
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("删除配置失败:", err);
		return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
	}
}
