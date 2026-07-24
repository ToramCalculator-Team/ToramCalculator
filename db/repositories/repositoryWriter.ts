import type { AccountType } from "@db/schema/enums";

/**
 * 写命令显式携带已经由会话入口准备好的账号身份。
 * repository 不读取 UI store，也不在数据操作过程中隐式启动账号生命周期。
 */
export interface RepositoryWriterContext {
	accountId: string;
	accountType: AccountType;
}

/** update/delete 在 SQL 执行前统一抛出此错误，调用方无需识别数据库错误文本。 */
export class RepositoryAuthorizationError extends Error {
	constructor(tableName: string, id: string) {
		super(`当前账号无权修改 ${tableName}(${id})`);
		this.name = "RepositoryAuthorizationError";
	}
}
