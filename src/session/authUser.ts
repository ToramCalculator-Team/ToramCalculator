import { findUserByEmail, findUserWithRelations } from "@db/repositories/user";
import { getCookie } from "@solidjs/start/http";
import { jwtVerify } from "jose";

// 函数级 "use server" 保留 SolidStart server function 的类型化调用，同时让客户端构建只看到调用边界。
// server function 的函数体在 client bundle 会被整体替换为 RPC 调用，下面的 server-only 依赖
//（DB 查询、cookie、jose）随之被 tree-shake，无需再用动态 import 做隔离。
export async function getUserByCookie() {
	"use server";

	const secret = process.env.AUTH_SECRET;
	if (!secret) return null;

	const token = getCookie("jwt");
	if (!token) return null;

	const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
	// payload.sub 直接作为用户 ID，后续只用 ID 查询完整用户关系。
	const userId = payload.sub;
	if (!userId) return null;

	return await findUserWithRelations(userId);
}

export async function emailExists(email: string) {
	"use server";

	// 注册页只需要布尔结果，避免把用户对象结构暴露给调用方。
	const user = await findUserByEmail(email);
	return !!user;
}
