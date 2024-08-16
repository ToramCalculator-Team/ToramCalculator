/// <reference types="vinxi/types/client" />

interface ImportMetaEnv {
  PG_HOST:string
  PG_PORT:string
  PG_USERNAME:string
  PG_PASSWORD:string
  PG_DBNAME:string
  PG_URL:string
  
  BAIDU_HTML_LABEL:string
  
  UMAMI_ID:string
}
  
interface ImportMeta {
  readonly env: ImportMetaEnv
}
