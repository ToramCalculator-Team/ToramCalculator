import type { AnyFieldApi, DeepKeys, DeepValue } from "@tanstack/solid-form";

// 简化后的表单字段
export type SimplifiedFieldApi<T extends object, K extends DeepKeys<T> = DeepKeys<T>> = {
	name: string;
	setValue: (value: DeepValue<T, K>) => void;
	handleChange: (value: DeepValue<T, K>) => void;
	handleBlur: () => void;
	state: {
		value: DeepValue<T, K>;
		meta: {
			isTouched: boolean;
			isValidating: boolean;
			errors: any[];
		};
	};
};

// 获取表单字段的错误信息
export function fieldInfo(field: AnyFieldApi): string {
	if (!field.state.meta) {
		return "";
	}
	const errors =
		field.state.meta.isTouched && field.state.meta.errors?.length ? field.state.meta.errors.join(",") : null;
	const isValidating = field.state.meta.isValidating ? "..." : null;
	if (errors) {
		console.log(field.state.meta.errors);
		return errors;
	}
	if (isValidating) {
		return isValidating;
	}
	return "";
}
