// 函数级 "use server" 保留 SolidStart server function 的类型化调用，同时让客户端构建只看到调用边界。
export async function getUserByCookie() {
	"use server";

	// 服务端依赖放在函数内部，避免 client bundle 解析 AUTH_SECRET、cookie、JWT、DB 查询实现。
	const [{ findUserWithRelations }, { getCookie }, { jwtVerify }] = await Promise.all([
		import("@db/repositories/user"),
		import("@solidjs/start/http"),
		import("jose"),
	]);

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
	const { findUserByEmail } = await import("@db/repositories/user");
	const user = await findUserByEmail(email);
	return !!user;
}
