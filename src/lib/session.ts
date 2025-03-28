"use server";
import { useSession } from "vinxi/http";
import { findUserById, User } from "~/repositories/server/user";

export async function getUser(): Promise<User | null> {
  const secrt = process.env.AUTH_SECRET;
  console.log("secrt", secrt);
  if (!secrt) return null;
  const session = await useSession({
    password: secrt,
  });
  console.log("session data:", session.data); // 检查解析出的数据
  const userId = session.data.userId;
  if (!userId) return null;
  return await findUserById(userId);
}
