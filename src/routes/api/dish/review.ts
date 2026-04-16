import { getDB } from "@db/repositories/database";
import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";
import { z } from "zod/v4";

// 审核请求 schema
const ReviewDishSchema = z.object({
	id: z.string().min(1, "料理ID不能为空"),
	status: z.enum(["Approved", "Rejected"]),
	remark: z.string().max(200).optional(),
});

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

// 检查用户是否是管理员（通过userId查找关联的account）
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

// 获取用户的任意一个account
async function getUserAccount(userId: string) {
	const db = await getDB();
	return await db
		.selectFrom("account")
		.where("userId", "=", userId)
		.selectAll()
		.executeTakeFirst();
}

// POST: 审核料理
export async function POST(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	// 检查管理员权限
	if (!await isAdmin(jwtUser.sub)) {
		return new Response(JSON.stringify({ error: "无权限，只有管理员可以审核" }), { status: 403 });
	}

	const account = await getUserAccount(jwtUser.sub);
	if (!account) {
		return new Response(JSON.stringify({ error: "用户账户不存在" }), { status: 401 });
	}

	try {
		const body = await event.request.json();
		const data = ReviewDishSchema.parse(body);

		const db = await getDB();
		const now = new Date();

		// 检查料理是否存在
		const dish = await db
			.selectFrom("dish")
			.where("id", "=", data.id)
			.selectAll()
			.executeTakeFirst();

		if (!dish) {
			return new Response(JSON.stringify({ error: "料理不存在" }), { status: 404 });
		}

		if (dish.status !== "Pending") {
			return new Response(JSON.stringify({ error: "该料理已经审核过了" }), { status: 400 });
		}

		// 更新审核状态
		await db
			.updateTable("dish")
			.set({
				status: data.status,
				remark: data.remark ?? null,
				reviewedAt: now,
				reviewedById: account.id,
				updatedAt: now,
			})
			.where("id", "=", data.id)
			.execute();

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("审核料理失败:", err);
		if (err instanceof z.ZodError) {
			return new Response(JSON.stringify({ error: err.errors }), { status: 400 });
		}
		return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
	}
}