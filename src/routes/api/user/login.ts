import { randomInt } from "crypto";
import { SignJWT } from "jose";
import type { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";

const userIDs = [
  "6z7dkeVLNm",
  "ycD76wW4R2",
  "IoQSaxeVO5",
  "WndZWmGkO4",
  "ENzoNm7g4E",
  "dLKecN3ntd",
  "7VoEoJWEwn",
  "enVvyDlBul",
  "9ogaDuDNFx",
];

export async function GET({ params }: APIEvent) {
  const jwtPayload = {
    sub: userIDs[randomInt(userIDs.length)],
    iat: Math.floor(Date.now() / 1000),
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30days")
    .sign(new TextEncoder().encode(import.meta.env.ZERO_AUTH_SECRET ?? process.env.ZERO_AUTH_SECRET));

  setCookie("jwt", jwt, {
    httpOnly: false, // 确保客户端 JS 无法访问
    secure: process.env.NODE_ENV === "production", // 在生产环境启用 secure
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  });

  return new Response("ok");
}
