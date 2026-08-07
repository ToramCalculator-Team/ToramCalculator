import { defaultData } from "@db/defaultData";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import {
	type RepositoryReader,
	type RepositoryWriter,
	repositoryReaders,
	repositoryWriters,
} from "@db/generated/repositories";
import { type DB, DBSchema } from "@db/generated/zod/index";
import type { Accessor } from "solid-js";
import { ObjRenderer } from "~/components/ui/dataDisplay/ObjRenderer";
import { Icons } from "~/components/ui/icons/index";
import { useOverlay } from "~/contexts/overlay/OverlayContext";
import { DATA_CONFIG, type TableDataConfig } from "~/dataConfig/data-config";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic, Dictionary } from "~/locales/type";
import { buildFKCardRenderers, ReferencedBySection } from "./fkRenderers";
import { type WikiPageConfig, wikiPageConfig } from "./wikiPage/wikiPageConfig";

export type TableConfig<TTableName extends keyof DB, T extends DB[TTableName] = DB[TTableName]> = {
	tableName: TTableName;
	schema: ZodSchemaFor<T>;
	dic: Dic<T>;
	readers: RepositoryReader<TTableName>;
	writers: RepositoryWriter<TTableName>;
	defaultData: T;
	wikiConfig: WikiPageConfig | undefined;
	UIConfig: TableDataConfig<TTableName, T>;
};

export function createTableConfig<TTableName extends keyof DB>(
	tableName: TTableName,
	dictionary: Dictionary,
): TableConfig<TTableName> | undefined {
	const UIConfig = DATA_CONFIG[tableName]?.(dictionary);
	if (!UIConfig) return;
	return {
		tableName,
		schema: DBSchema[tableName],
		dic: dictionary.db[tableName],
		readers: repositoryReaders[tableName],
		writers: repositoryWriters[tableName],
		defaultData: defaultData[tableName],
		wikiConfig: wikiPageConfig[tableName],
		UIConfig,
	} as TableConfig<TTableName>;
}

/**
 * 创建 FK 卡片导航函数。
 * 返回的 openRelatedCard 可在任意 wiki 页面使用：
 *   mode="open"  — 新建 dialog 层（从页面级 overlay 弹出）
 *   mode="push"  — 压入当前 dialog 层（面包屑导航，默认）
 */
export function createOpenRelatedCard(dictionary: Accessor<Dictionary>) {
	const getTablePrimaryKey = <T extends keyof DB>(t: T): keyof DB[T] => (getPrimaryKeys(t)[0] ?? "id") as keyof DB[T];

	function openRelatedCard(
		relatedTable: keyof DB,
		id: string,
		parentOverlay: ReturnType<typeof useOverlay>,
		mode: "push" | "open" = "push",
	): void {
		const relatedConfig = createTableConfig(relatedTable, dictionary());
		const dic = dictionary().db[relatedTable];

		if (!relatedConfig) {
			const entry: Parameters<typeof parentOverlay.openDialog>[0] = {
				title: dic?.selfName ?? String(relatedTable),
				titleIcon: () => <Icons.Spirits iconName={relatedTable} />,
				render: () => (
					<div class="flex flex-col gap-3 p-6">
						<p class="text-boundary-color text-sm">
							表 <code class="bg-area-color rounded px-1">{String(relatedTable)}</code> 暂无 UI 配置，无法预览。
						</p>
						<p class="text-boundary-color text-sm">如需显示此表数据，请在 data-config 中添加对应配置。</p>
					</div>
				),
			};
			if (mode === "open") parentOverlay.openDialog(entry);
			else parentOverlay.pushDialog(entry);
			return;
		}

		const hiddenFields = relatedConfig.UIConfig.card.hiddenFields ?? [];

		const entry: Parameters<typeof parentOverlay.openDialog>[0] = {
			title: dic?.selfName ?? String(relatedTable),
			titleIcon: () => <Icons.Spirits iconName={relatedTable} />,
			layout: "fill",
			render: () => {
				const dialogOverlay = useOverlay();

				const fkCardRenderers = buildFKCardRenderers(relatedTable, hiddenFields, dictionary(), (nextTable, nextId) =>
					openRelatedCard(nextTable, nextId, dialogOverlay),
				);

				return (
					<ObjRenderer
						query={(db) => relatedConfig.readers.get?.(db, id) ?? null}
						dataSchema={relatedConfig.schema}
						dictionary={relatedConfig.dic}
						hiddenFields={hiddenFields}
						fieldGroupMap={relatedConfig.UIConfig.fieldGroupMap}
						renderers={{
							fields: {
								...fkCardRenderers.fields,
								...relatedConfig.UIConfig.card.renderers?.fields,
							},
							containers: relatedConfig.UIConfig.card.renderers?.containers,
						}}
						after={(currentData) => (
							<ReferencedBySection
								tableName={relatedTable}
								referencedBy={relatedConfig.UIConfig.card.referencedBy}
								data={currentData}
								dictionary={dictionary()}
								onOpenCard={(nextTable, rowData) => {
									const pk = getTablePrimaryKey(nextTable);
									const nextId = String(rowData[pk as keyof typeof rowData] ?? "");
									if (nextId) openRelatedCard(nextTable, nextId, dialogOverlay);
								}}
							/>
						)}
					/>
				);
			},
		};

		if (mode === "open") parentOverlay.openDialog(entry);
		else parentOverlay.pushDialog(entry);
	}

	return openRelatedCard;
}
