import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod/index";

export const arrayDiff = <T extends keyof DB>(props: { table: T; oldArray: DB[T][]; newArray: DB[T][] }) => {
	const primaryKeys = getPrimaryKeys(props.table);
	if (primaryKeys.length === 0) {
		throw new Error("表没有主键");
	}
	const dataToAdd = props.newArray.filter(
		(effect) =>
			!props.oldArray.some((oldEffect) => {
				for (const primaryKey of primaryKeys) {
					if (effect[primaryKey as keyof DB[T]] === oldEffect[primaryKey as keyof DB[T]]) {
						return true;
					}
				}
				return false;
			}),
	);
	const dataToRemove = props.oldArray.filter(
		(oldEffect) =>
			!props.newArray.some((newEffect) => {
				for (const primaryKey of primaryKeys) {
					if (newEffect[primaryKey as keyof DB[T]] === oldEffect[primaryKey as keyof DB[T]]) {
						return true;
					}
				}
				return false;
			}),
	);
	const dataToUpdate = props.newArray.filter((newEffect) =>
		props.oldArray.some((oldEffect) => {
			for (const primaryKey of primaryKeys) {
				if (oldEffect[primaryKey as keyof DB[T]] === newEffect[primaryKey as keyof DB[T]]) {
					return true;
				}
			}
			return false;
		}),
	);

	return {
		dataToAdd,
		dataToRemove,
		dataToUpdate,
	};
};

/**
 * 文字滚动展示组件(暂未完成)
 * @param props.text 要展示的文字
 * @param props.width 展示的宽度
 **/
export const TextScroll = (props: { text: string; width: number }) => {
	// 当文字长度大于宽度时，文字会滚动
	const textLength = props.text.length;
	const scrollDuration = textLength * 0.1;
	return <span class="overflow-hidden text-nowrap text-ellipsis">{props.text}</span>;
};
