// 设计说明：schema 版本描述本地持久化契约，发布版本描述一次构建。
// 两者分离后，资源更新不会被误判为 store/DB 结构迁移。
export const STORE_SCHEMA_VERSION = 20260603;
export const DB_SCHEMA_VERSION = 1;

export const MIN_COMPATIBLE_STORE_SCHEMA_VERSION = 20260413;
export const MIN_COMPATIBLE_DB_SCHEMA_VERSION = 1;
