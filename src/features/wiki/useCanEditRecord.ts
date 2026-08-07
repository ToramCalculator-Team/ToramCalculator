import { repositoryWriters } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod/index";
import { type Accessor, createResource } from "solid-js";
import { store } from "~/store";

/**
 * 记录编辑权限的响应式判定。
 *
 * 复用生成层 repositoryWriters 的 canEdit（规则：未登录拒绝、Admin 放行、资源所有者放行），
 * 卡片、技能树等所有 wiki 编辑入口共用同一判定，避免 UI 层各自维护一套权限规则
 * 与服务端写边界产生分歧。id 为空时不发起判定（返回 undefined），由调用方配合 Show 控制按钮显隐。
 */
export function useCanEditRecord<TTableName extends keyof DB>(
	tableName: TTableName,
	id: Accessor<string | null | undefined>,
) {
	const [canEdit] = createResource(id, (recordId) => {
		const writer = repositoryWriters[tableName];
		if (!writer?.canEdit) return false;
		return writer.canEdit({ accountId: store.session.account.id, accountType: store.session.account.type }, recordId);
	});
	return canEdit;
}
