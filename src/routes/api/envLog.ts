import type { APIEvent } from "@solidjs/start/server";
import { deleteCookie } from "vinxi/http";

export async function GET({ params }: APIEvent) {
  deleteCookie("jwt");

  return new Response(`env: 
# 中央数据库配置
PG_HOST=${process.env.PG_HOST}
PG_PORT=${process.env.PG_PORT}
PG_USERNAME=${process.env.PG_USERNAME}
PG_PASSWORD=${process.env.PG_PASSWORD}
PG_DBNAME=${process.env.PG_DBNAME}

# 同步引擎配置
ELECTRIC_HOST=${process.env.ELECTRIC_HOST}
ELECTRIC_PORT=${process.env.ELECTRIC_PORT}

# Auth.js配置
AUTH_SECRET=${process.env.AUTH_SECRET}
AUTH_URL=${process.env.AUTH_URL}

# Auth QQ Provider
QQ_CLIENT_ID=${process.env.QQ_CLIENT_ID}
QQ_CLIENT_SECRET=${process.env.QQ_CLIENT_SECRET}

# Auth Discord Provider
DISCORD_CLIENT_ID=${process.env.DISCORD_CLIENT_ID}
DISCORD_CLIENT_SECRET=${process.env.DISCORD_CLIENT_SECRET}

# Auth Github Provider
GITHUB_ID=${process.env.GITHUB_ID}
GITHUB_SECRET=${process.env.GITHUB_SECRET}

# Auth E-mail Provider
EMAIL_SERVER_USER=${process.env.EMAIL_SERVER_USER}
EMAIL_SERVER_PASSWORD=${process.env.EMAIL_SERVER_PASSWORD}
EMAIL_SERVER_HOST=${process.env.EMAIL_SERVER_HOST}
EMAIL_SERVER_PORT=${process.env.EMAIL_SERVER_PORT}
EMAIL_FROM=${process.env.EMAIL_FROM}

COMPATIBILITY_DATE=${process.env.COMPATIBILITY_DATE}
`);
}
