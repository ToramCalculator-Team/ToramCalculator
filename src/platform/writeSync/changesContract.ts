import { z } from "zod/v4";

const SAFE_TABLE_NAME = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

export const ChangeOperationSchema = z.enum(["insert", "update", "delete"]);

export const ChangeRequestSchema = z.object({
	table_name: z.string().regex(SAFE_TABLE_NAME, "非法表名"),
	operation: ChangeOperationSchema,
	value: z.record(z.string(), z.unknown()),
	write_id: z.string().min(1).optional(),
	transaction_id: z.string().min(1).optional(),
});

export const ChangeTransactionSchema = z.object({
	id: z.string().optional(),
	changes: z.array(ChangeRequestSchema),
});

export const ChangesRequestSchema = z.array(ChangeTransactionSchema);

export type ChangeOperation = z.output<typeof ChangeOperationSchema>;
export type ChangesRequest = z.output<typeof ChangesRequestSchema>;
