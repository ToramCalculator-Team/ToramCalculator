"use server";
import { findUserByEmail, findUserById, User } from "~/repositories/server/user";
import { jwtVerify } from "jose";
import { getCookie } from "vinxi/http";

async function verifyJWT(token: string, secret: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  // console.log("解析出的 User ID:", payload.sub); // 直接获取用户 ID
  return payload.sub; // 返回用户 ID
}

export async function getUserByCookie(): Promise<User | null> {
  const secrt = process.env.AUTH_SECRET;
  // console.log("secrt", secrt);
  if (!secrt) return null;

  const token = getCookie("jwt");
  // console.log("token", token);
  if (!token) return null;

  const userId = await verifyJWT(token, secrt);
  if (!userId) return null;

  const user = await findUserById(userId);
  return await findUserById(userId);
}

export async function emailExists(email: string) {
  const user = await findUserByEmail(email);
  return !!user;
}
