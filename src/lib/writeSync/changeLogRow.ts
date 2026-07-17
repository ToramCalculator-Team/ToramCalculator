import type { ChangeOperation } from "./changesContract";

/** PGlite 本地 changes outbox 的持久行，不等同于对外 HTTP 请求。 */
export type ChangeLogRow = {
	id: number;
	table_name: string;
	operation: ChangeOperation;
	value: Record<string, unknown>;
	write_id: string;
	transaction_id: string;
};
