import { randomUUID } from "node:crypto";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { findUserById } from "@db/repositories/user";
import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import type { JWTPayload } from "jose";
import { jwtVerify } from "jose";
import { ChangesRequestSchema } from "~/lib/writeSync/changesContract";

// ==================== API 处理函数 ====================

type ChangeValue = Record<string, unknown>;

/** 确定性的数据库约束冲突必须触发客户端 rollback，不能作为 500 永久占住 outbox 队首。 */
export const statusForChangeError = (error: unknown): 409 | 500 => {
	if (typeof error !== "object" || error === null || !("code" in error)) return 500;
	const code = error.code;
	return typeof code === "string" && code.startsWith("23") ? 409 : 500;
};

export async function POST(event: APIEvent) {
	const token = getCookie("jwt");
	if (!token) {
		console.error("用户上传数据时，未发现jwt，终止数据写入");
		return new Response("未发现jwt，终止数据写入", { status: 401 });
	}

	let jwtUser: JWTPayload;
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

	if (typeof jwtUser.sub !== "string") {
		return new Response("JWT 缺少用户标识", { status: 401 });
	}

	const requestBody = await event.request.json();

	const user = await findUserById(jwtUser.sub);

	// 权限判断
	if (!user) {
		return new Response("未认证用户，终止数据写入", { status: 401 });
	}

	// 客户端从同一 schema 推导请求类型，服务端在事务前执行运行时校验；协议不再维护两套结构。
	// 当前仍只校验 JWT 有效性，不做行级归属校验；该安全边界由后续加固计划处理。
	const parsedRequest = ChangesRequestSchema.safeParse(requestBody);
	if (!parsedRequest.success) {
		return new Response("请求结构非法", { status: 400 });
	}
	const body = parsedRequest.data;

	console.log(`用户:${user.name} 变更数据,body:`, JSON.stringify(body, null, 2));

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
					// 类型断言：已通过安全校验的表名
					const tableName = change.table_name as keyof DB;

					// 获取表的主键列
					const primaryKeys = getPrimaryKeys(tableName);

					// 如果没有主键，跳过这个变更
					if (primaryKeys.length === 0) {
						console.log(`表 ${change.table_name} 没有主键，跳过变更`);
						continue;
					}

					// 值过滤只移除 undefined；null 是可空外键的显式清空语义，必须写入服务端。
					const cleanValue: ChangeValue = {};
					for (const [k, v] of Object.entries(change.value ?? {})) {
						if (v !== undefined) cleanValue[k] = v;
					}

					// 收敛环：持久化 write_id（见 ADR 0018）。客户端触发器总会带上 write_id，
					// 缺失时兜底生成，保证服务端行的 write_id 非 NULL —— 否则 Electric 回灌后
					// 客户端清理触发器 `write_id = NEW.write_id` 永不命中，本地乐观行永不清理。
					const writeId = change.write_id ?? randomUUID();
					// insert/update 落库时写入 write_id；delete 不需要（按主键删行）。
					const valueWithWriteId: ChangeValue = { ...cleanValue, write_id: writeId };

					switch (change.operation) {
						case "insert": {
							// 幂等 upsert（见 ADR 0018）：崩溃窗口重投同一 change 时，
							// plain INSERT 会主键冲突 500 → 客户端无限 retry 死锁。
							// ON CONFLICT DO UPDATE 使重投等价于覆盖成同值，天然幂等。
							await trx
								.insertInto(tableName)
								.values(valueWithWriteId as never)
								.onConflict((oc) => oc.columns(primaryKeys as never).doUpdateSet(valueWithWriteId as never))
								.execute();
							break;
						}

						case "update": {
							let query = trx.updateTable(tableName).set(valueWithWriteId as never);
							// 添加所有主键条件
							for (const pk of primaryKeys) {
								query = query.where(pk, "=", change.value[String(pk)] as never);
							}
							await query.execute();
							break;
						}

						case "delete": {
							let query = trx.deleteFrom(tableName);
							// 添加所有主键条件
							for (const pk of primaryKeys) {
								query = query.where(pk, "=", change.value[String(pk)] as never);
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
		const status = statusForChangeError(err);
		return new Response(status === 409 ? "数据约束冲突" : "服务器内部错误", { status });
	}
}
