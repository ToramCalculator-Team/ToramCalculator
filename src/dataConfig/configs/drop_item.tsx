import type { drop_item } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const DROP_ITEM_DATA_CONFIG: TableDataConfigurator<"drop_item", drop_item> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["probability", "relatedPartType", "relatedPartInfo", "breakRewardType"],
			对应道具: ["itemId"],
			所属怪物: ["belongToMobId"],
		},
		table: {
			columnsDef: [],
			hiddenColumnDef: [],
			defaultSort: { field: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id"],
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id"],
			references: [],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"drop_item", drop_item>;
