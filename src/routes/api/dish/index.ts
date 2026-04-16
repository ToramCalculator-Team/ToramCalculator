import { getDB } from "@db/repositories/database";
import { findUserById } from "@db/repositories/user";
import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";
import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";

// 转义 LIKE 通配符，防止通配符注入
function escapeLikePattern(str: string): string {
	return str.replace(/[%_\\]/g, "\\$&");
}

// 料理提交请求 schema
const SubmitDishSchema = z.object({
	name: z.string().min(1, "料理名称不能为空").max(50, "料理名称过长"),
	level: z.number().int().min(1).max(10),
	playerId: z.string().min(1, "门牌号不能为空"),
	qqNumber: z.string().optional(),
});

// 料理查询参数 schema
const QueryDishSchema = z.object({
	status: z.enum(["Pending", "Approved", "Rejected"]).optional(),
	level: z.number().int().min(1).max(10).optional(),
	playerId: z.string().optional(),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).optional(),
	search: z.string().optional(),
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

// GET: 获取料理列表
export async function GET(event: APIEvent) {
	const url = new URL(event.request.url);
	const params = Object.fromEntries(url.searchParams);
	
	// 检查是否为管理员
	const jwtUser = await verifyAuth(event);
	const isAdminUser = jwtUser ? await isAdmin(jwtUser.sub) : false;
	
	// 解析查询参数
	const query = QueryDishSchema.parse({
		status: params.status,
		level: params.level ? parseInt(params.level) : undefined,
		playerId: params.playerId,
		page: params.page ? parseInt(params.page) : 1,
		pageSize: params.pageSize ? parseInt(params.pageSize) : 20,
		search: params.search || undefined,
	});

	try {
		const db = await getDB();
		
		// 构建查询
		let queryBuilder = db.selectFrom("dish").selectAll();
		
		if (!isAdminUser) {
			queryBuilder = queryBuilder.where("status", "=", "Approved");
		} else if (query.status) {
			// 管理员可以按状态筛选
			queryBuilder = queryBuilder.where("status", "=", query.status);
		}
		
		if (query.level) {
			queryBuilder = queryBuilder.where("level", "=", query.level);
		}
		if (query.playerId) {
			queryBuilder = queryBuilder.where("playerId", "=", query.playerId);
		}
		// 搜索功能：匹配门牌号或料理名称（转义通配符）
		if (query.search) {
			const escapedSearch = escapeLikePattern(query.search);
			queryBuilder = queryBuilder.where((eb) =>
				eb.or([
					eb("playerId", "like", `%${escapedSearch}%`),
					eb("name", "like", `%${escapedSearch}%`),
				])
			);
		}
		
		// 计算总数（需要同样的过滤条件）
		let countQuery = db
			.selectFrom("dish")
			.select(db.fn.count("id").as("count"));
		
		// 非管理员只能看到已通过的料理
		if (!isAdminUser) {
			countQuery = countQuery.where("status", "=", "Approved");
		} else if (query.status) {
			countQuery = countQuery.where("status", "=", query.status!);
		}
		
		countQuery = countQuery
			.$if(!!query.level, (qb) => qb.where("level", "=", query.level!))
			.$if(!!query.playerId, (qb) => qb.where("playerId", "=", query.playerId!));
		
		if (query.search) {
			const escapedSearch = escapeLikePattern(query.search);
			countQuery = countQuery.where((eb) =>
				eb.or([
					eb("playerId", "like", `%${escapedSearch}%`),
					eb("name", "like", `%${escapedSearch}%`),
				])
			);
		}
		
		const countResult = await countQuery.executeTakeFirst();
		
		const total = Number(countResult?.count ?? 0);
		
		// 分页查询
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const offset = (page - 1) * pageSize;
		
		const dishes = await queryBuilder
			.orderBy("createdAt", "desc")
			.limit(pageSize)
			.offset(offset)
			.execute();

		return new Response(JSON.stringify({
			data: dishes,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("查询料理列表失败:", err);
		return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
	}
}

// POST: 提交新料理
export async function POST(event: APIEvent) {
	const jwtUser = await verifyAuth(event);
	if (!jwtUser) {
		return new Response(JSON.stringify({ error: "未认证" }), { status: 401 });
	}

	const user = await findUserById(jwtUser.sub);
	if (!user) {
		return new Response(JSON.stringify({ error: "用户不存在" }), { status: 401 });
	}

	try {
		const body = await event.request.json();
		const data = SubmitDishSchema.parse(body);

		const db = await getDB();
		const id = createId();
		const now = new Date();

		await db.insertInto("dish").values({
			id,
			name: data.name,
			level: data.level,
			playerId: data.playerId,
			source: "Web",
			status: "Pending",
			qqNumber: data.qqNumber ?? null,
			remark: null,
			createdAt: now,
			updatedAt: now,
			reviewedAt: null,
			reviewedById: null,
			submittedById: user.id,
		}).execute();

		return new Response(JSON.stringify({ 
			success: true, 
			data: { id } 
		}), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("提交料理失败:", err);
		if (err instanceof z.ZodError) {
			return new Response(JSON.stringify({ error: err.errors }), { status: 400 });
		}
		return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
	}
}
