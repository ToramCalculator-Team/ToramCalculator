import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { findUserById } from "@db/repositories/user";
import type { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";
import { getCookie } from "vinxi/http";
import { z } from "zod/v4";
import type { ChangeRecord, SyncRequestBody } from "~/shared/types/sync";

// ==================== API 处理函数 ====================

export async function POST(event: APIEvent) {
	const token = getCookie("jwt");
	if (!token) {
		console.error("用户上传数据时，未发现jwt，终止数据写入");
		return new Response("未发现jwt，终止数据写入", { status: 401 });
	}

	let jwtUser: any;
	try {
		const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
		const { payload } = await jwtVerify(token, secret, {
			algorithms: ["HS256"],
		});

		jwtUser = payload;
	} catch (err) {
		console.error("用户 JWT 验证失败，终止数据写入", err);
		return new Response("JWT 无效", { status: 401 });
	}

	const body = (await event.request.json()) as SyncRequestBody;

	const user = await findUserById(jwtUser.sub);

	// 权限判断
	if (!user) {
		return new Response("未认证用户，终止数据写入", { status: 401 });
	}

	console.log("用户:" + user.name + " 变更数据,body:", body);

	// -------- 安全校验与约束 --------
	// 1) 允许的操作（默认禁用删除）
	const ALLOWED_OPS = new Set(["insert", "update"] as const);
	// 2) 允许的表名（如需更细可维护一个白名单；这里先允许全部，但执行前做信息架构校验）
	const SAFE_TABLE_NAME = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
	// 3) 负载 schema（宽松，但强约束关键字段与类型）
	const ChangeSchema = z.object({
		table_name: z.string().regex(SAFE_TABLE_NAME, "非法表名"),
		operation: z.union([z.literal("insert"), z.literal("update"), z.literal("delete")]),
		value: z.any(),
		write_id: z.string().min(1).optional(),
		transaction_id: z.string().min(1).optional(),
	});
	const TxSchema = z.array(z.object({ id: z.string().optional(), changes: z.array(ChangeSchema) }));

	try {
		TxSchema.parse(body);
	} catch (e) {
		return new Response("请求结构非法", { status: 400 });
	}

	// 示例权限判断（可选）
	// if (user.role !== "admin") {
	//   return new Response("当前用户无权限", { status: 403 });
	// }

	// 处理变更记录
	try {
		const db = await getDB();
		await db.transaction().execute(async (trx) => {
			for (const transaction of body) {
				for (const change of transaction.changes) {
					// 基础安全策略：禁止未授权操作 & 限制表名格式
					if (!SAFE_TABLE_NAME.test(change.table_name)) {
						throw new Error(`非法表名: ${change.table_name}`);
					}

					if (!ALLOWED_OPS.has(change.operation as "insert" | "update")) {
						// 若需要允许删除，可在此添加细粒度白名单或软删除逻辑
						throw new Error(`禁止的操作: ${change.operation}`);
					}

					// 类型断言：已通过安全校验的表名
					const tableName = change.table_name as keyof DB;

					// 获取表的主键列
					const primaryKeys = getPrimaryKeys(tableName);

					// 如果没有主键，跳过这个变更
					if (primaryKeys.length === 0) {
						console.log(`表 ${change.table_name} 没有主键，跳过变更`);
						continue;
					}

					// 值过滤：移除 undefined，避免覆盖为 null/undefined
					const cleanValue: Record<string, any> = {};
					for (const [k, v] of Object.entries(change.value ?? {})) {
						if (v !== undefined) cleanValue[k] = v;
					}

					switch (change.operation) {
						case "insert":
							await trx.insertInto(tableName).values(cleanValue).execute();
							break;

						case "update": {
							let query = trx.updateTable(tableName).set(cleanValue);
							// 添加所有主键条件
							for (const pk of primaryKeys) {
								query = query.where(pk, "=", change.value[pk]);
							}
							await query.execute();
							break;
						}

						case "delete": {
							let query = trx.deleteFrom(tableName);
							// 添加所有主键条件
							for (const pk of primaryKeys) {
								query = query.where(pk, "=", change.value[pk]);
							}
							await query.execute();
							break;
						}

						default:
							throw new Error(`无法识别的数据库操作数: ${change.operation}`);
					}
				}
			}
		});

		return new Response("操作成功", { status: 200 });
	} catch (err) {
		console.error("❌ 数据处理错误:", err);
		return new Response("服务器内部错误", { status: 500 });
	}
}
