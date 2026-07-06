import { randomUUID } from "node:crypto";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { findUserById } from "@db/repositories/user";
import { getCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";
import type { JWTPayload } from "jose";
import { jwtVerify } from "jose";
import { z } from "zod/v4";

// ==================== API 处理函数 ====================

type ChangeValue = Record<string, unknown>;

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

	// -------- 安全校验与约束 --------
	// 1) 允许的操作
	//    delete 已启用：客户端视图删除（如 deleteCharacterSkill）会产生 delete 变更，
	//    服务端若拒绝会导致上行队列 HOL 死锁（见 ADR 0017 B-2）。
	//    信任模型：与 insert/update 一致，当前仅校验 JWT 有效性，不做行级归属校验。
	//    这不新增相对现状的越权面（update 本已可越权）；归属校验（insert/update/delete
	//    统一）留待 ADR 0017 A-1 处理。
	const ALLOWED_OPS = new Set(["insert", "update", "delete"] as const);
	// 2) 允许的表名（如需更细可维护一个白名单；这里先允许全部，但执行前做信息架构校验）
	const SAFE_TABLE_NAME = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
	// 3) 负载 schema（宽松，但强约束关键字段与类型）
	const ChangeSchema = z.object({
		table_name: z.string().regex(SAFE_TABLE_NAME, "非法表名"),
		operation: z.union([z.literal("insert"), z.literal("update"), z.literal("delete")]),
		value: z.record(z.string(), z.unknown()),
		write_id: z.string().min(1).optional(),
		transaction_id: z.string().min(1).optional(),
	});
	const TxSchema = z.array(z.object({ id: z.string().optional(), changes: z.array(ChangeSchema) }));

	let body: z.infer<typeof TxSchema>;
	try {
		body = TxSchema.parse(requestBody);
	} catch {
		return new Response("请求结构非法", { status: 400 });
	}

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
					// 基础安全策略：禁止未授权操作 & 限制表名格式
					if (!SAFE_TABLE_NAME.test(change.table_name)) {
						throw new Error(`非法表名: ${change.table_name}`);
					}

					if (!ALLOWED_OPS.has(change.operation as "insert" | "update" | "delete")) {
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
							// 幂等 upsert（见 ADR 0017 B-3）：崩溃窗口重投同一 change 时，
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
		return new Response("服务器内部错误", { status: 500 });
	}
}
