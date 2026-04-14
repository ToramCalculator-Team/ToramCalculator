import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const DROP_ITEM_DATA_CONFIG: TableDataConfig<"drop_item"> = {
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["probability", "relatedPartType", "relatedPartInfo", "breakRewardType"],
		对应道具: ["itemId"],
		所属怪物: ["belongToMobId"],
	},
	table: {
		columnsDef: [],
		hiddenColumnDef: [],
		defaultSort: { id: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		onInsert: repositoryMethods.drop_item.insert,
		onUpdate: repositoryMethods.drop_item.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
	},
};
