import type { APIEvent } from "@solidjs/start/server";
import { deleteCookie } from "vinxi/http";

export async function GET({ params }: APIEvent) {
  deleteCookie("jwt");
  const API_URL =
    import.meta.env.VITE_SERVER_HOST == "localhost" ? "http://localhost:3001/api" : "https://app.kiaclouth.com/api";

  const ELECTRIC_HOST =
    import.meta.env.VITE_SERVER_HOST == "localhost"
      ? "http://localhost:3000/v1/shape"
      : "https://test.kiaclouth.com/v1/shape";

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

# 同步方法参数
API_URL=${API_URL}

# PGlite同步方法配置
ELECTRIC_HOST=${ELECTRIC_HOST}
`);
}
