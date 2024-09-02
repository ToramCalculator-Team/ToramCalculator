/// <reference types="vinxi/types/client" />

interface ImportMetaEnv {
  PG_HOST:string
  PG_PORT:string
  PG_USERNAME:string
  PG_PASSWORD:string
  PG_DBNAME:string
  PG_URL: string
  
  ELECTRIC_HOST: string
  ELECTRIC_PORT: string
  
  BAIDU_HTML_LABEL:string
  
  UMAMI_ID: string
  
  S3_BUCKET: string
  S3_ID: string
  S3_SECRET: string
  S3_ENDPOINT: string
}
  
interface ImportMeta {
  readonly env: ImportMetaEnv
}
