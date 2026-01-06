import { type AnyFieldApi, type DeepKeys, type DeepValue, Field } from "@tanstack/solid-form";
import { For } from "solid-js";
import { ZodAny, type ZodEnum, type ZodObject, type ZodType, z } from "zod/v4";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Toggle } from "~/components/controls/toggle";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";
import { getZodType } from "~/lib/utils/zodTools";
import type { Dic, EnumFieldDetail } from "~/locales/type";

// 简化后的表单字段
export type SimplifiedFieldApi<T extends Record<string, unknown>, K extends DeepKeys<T> = DeepKeys<T>> = {
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
// export function fieldInfo<T extends Record<string, unknown>, K extends DeepKeys<T>>(field: SimplifiedFieldApi<T, K>): string {
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

// 工具：根据值类型选择字段组件
export function renderField<T extends Record<string, unknown>, K extends DeepKeys<T>>(
	form: any,
	fieldKey: string,
	fieldValue: DeepValue<T, K>,
	dictionary: Dic<T>,
	dataSchema: ZodObject<Record<string, ZodType>>,
) {
	// 如果fieldKey内存在.，则认为是子表单字段
	const isSubFormField = fieldKey.includes(".");
	// 获取字段名
	const fieldName = isSubFormField ? (fieldKey.split(".").pop() as string) : fieldKey;
	let inputTitle = fieldName;
	let inputDescription = "";
	try {
		inputTitle = dictionary.fields[fieldName].key;
		inputDescription = dictionary.fields[fieldName].formFieldDescription;
		// console.log("key", fieldName, "inputTitle", inputTitle);
	} catch (error) {
		console.log("字典中不存在字段：", fieldKey);
	}
	// 输入框的类型计算
	const zodValue = dataSchema.shape[fieldName];
	// 判断字段类型，便于确定默认输入框
	const valueType = getZodType(zodValue);
	const fieldCalss = `${isSubFormField ? "" : "border-dividing-color bg-primary-color rounded-md border"} w-full`;

	switch (valueType) {
		case "enum": {
			return (
				<Field
					form={form}
					name={fieldKey}
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: dataSchema.shape[fieldName],
					}}
				>
					{(field) => {
						const enumValue = zodValue as ZodEnum<any>;
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								validationMessage={fieldInfo(field())}
								class={fieldCalss}
							>
								<EnumSelect
									value={field().state.value as string}
									setValue={(value) => field().setValue(value as DeepValue<T, DeepKeys<T>>)}
									options={enumValue.options.map((i) => i.toString())}
									dic={(dictionary.fields[fieldName] as EnumFieldDetail<string>).enumMap}
									field={{
										id: field().name,
										name: field().name,
									}}
								/>
							</Input>
						);
					}}
				</Field>
			);
		}

		case "number": {
			return (
				<Field
					form={form}
					name={fieldKey}
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: dataSchema.shape[fieldName],
					}}
				>
					{(field) => {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								autocomplete="off"
								type="number"
								id={field().name}
								name={field().name}
								value={field().state.value as number}
								onBlur={field().handleBlur}
								onChange={(e) => field().handleChange(parseFloat(e.target.value) as DeepValue<T, DeepKeys<T>>)}
								validationMessage={fieldInfo(field())}
								class={fieldCalss}
							/>
						);
					}}
				</Field>
			);
		}
		case "array": {
			return (
				<Field
					form={form}
					name={fieldKey}
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: dataSchema.shape[fieldName],
					}}
				>
					{(field) => {
						// 一般数组对象字段会单独处理，如果这里被调用，说明是简单的字符串数组
						const arrayValue = () => field().state.value as string[];
						return (
							<Input title={inputTitle} description={""} validationMessage={fieldInfo(field())} class={fieldCalss}>
								<div class="ArrayBox flex w-full flex-col gap-2">
									<For each={arrayValue()}>
										{(item, index) => (
											<div class="flex items-center gap-2">
												<div class="flex-1">
													<Input
														type="text"
														value={item}
														onChange={(e) => {
															const newArray = [...arrayValue()];
															newArray[index()] = e.target.value;
															field().setValue(newArray);
														}}
														class="w-full p-0!"
													/>
												</div>
												<Button
													onClick={() => {
														const newArray = arrayValue().filter((_, i) => i !== index());
														field().setValue(newArray);
													}}
												>
													-
												</Button>
											</div>
										)}
									</For>
									<Button
										onClick={() => {
											const newArray = [...arrayValue(), ""];
											field().setValue(newArray);
										}}
										class="w-full"
									>
										+
									</Button>
								</div>
							</Input>
						);
					}}
				</Field>
			);
		}
		case "object": {
			return JSON.stringify(fieldValue, null, 2);
		}

		case "lazy": {
			return (
				<Field
					form={form}
					name={fieldKey}
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: dataSchema.shape[fieldName],
					}}
				>
					{(field) => {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								autocomplete="off"
								type="text"
								id={field().name}
								name={field().name}
								value={field().state.value as string}
								onBlur={field().handleBlur}
								onChange={(e) => {
									const target = e.target;
									field().handleChange(target.value as DeepValue<T, DeepKeys<T>>);
								}}
								validationMessage={fieldInfo(field())}
								class={fieldCalss}
							>
								"逻辑编辑器，暂未处理"
							</Input>
						);
					}}
				</Field>
			);
		}

		case "boolean": {
			return (
				<Field
					form={form}
					name={fieldKey}
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: dataSchema.shape[fieldName],
					}}
				>
					{(field) => {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								validationMessage={fieldInfo(field())}
								class={fieldCalss}
							>
								<Toggle
									id={field().name}
									onClick={() => {
										field().setValue(!field().state.value as DeepValue<T, DeepKeys<T>>);
									}}
									onBlur={field().handleBlur}
									name={field().name}
									checked={field().state.value as boolean}
								/>
							</Input>
						);
					}}
				</Field>
			);
		}

		// 字符串输入
		default: {
			return (
				<Field
					form={form}
					name={fieldKey}
					validators={{
						onChangeAsyncDebounceMs: 500,
						onChangeAsync: dataSchema.shape[fieldName],
					}}
				>
					{(field) => {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								autocomplete="off"
								type="text"
								id={field().name}
								name={field().name}
								value={field().state.value as string}
								onBlur={field().handleBlur}
								onChange={(e) => {
									const target = e.target;
									field().handleChange(target.value as DeepValue<T, DeepKeys<T>>);
								}}
								validationMessage={fieldInfo(field())}
								class={fieldCalss}
							/>
						);
					}}
				</Field>
			);
		}
	}
	// const type = typeof value;
	// switch (true) {
	//   case type === "string":
	//     return (
	//       <Field
	//         form={form}
	//         name={name}
	//         validators={{
	//           onChangeAsyncDebounceMs: 500,
	//           onChangeAsync: dataSchema.shape[name as keyof typeof dataSchema.shape],
	//         }}
	//       >
	//         {(field) => (
	//           <Input
	//             title={dictionary?.fields[name]?.key ?? name}
	//             type="text"
	//             state={fieldInfo(field())}
	//             description={dictionary?.fields[name]?.formFieldDescription}
	//             value={field().state.value as string}
	//             onChange={(e) => field().setValue(e.target.value)}
	//             onBlur={field().handleBlur}
	//             class="border-dividing-color bg-primary-color w-full rounded-md border"
	//           />
	//         )}
	//       </Field>
	//     );
	//   case type === "boolean":
	//     return (
	//       <Field form={form} name={name}>
	//         {(field) => (
	//           <Input
	//             title={dictionary?.fields[name]?.key ?? name}
	//             state={fieldInfo(field())}
	//             description={dictionary?.fields[name]?.formFieldDescription}
	//             class="border-dividing-color bg-primary-color w-full rounded-md border"
	//           >
	//             <Toggle
	//               id={field().name}
	//               name={field().name}
	//               checked={field().state.value as boolean}
	//               onClick={() => field().setValue(!field().state.value)}
	//               onBlur={field().handleBlur}
	//             />
	//           </Input>
	//         )}
	//       </Field>
	//     );
	//   case type === "number":
	//     return (
	//       <Field form={form} name={name}>
	//         {(field) => (
	//           <Input
	//             title={dictionary?.fields[name]?.key ?? name}
	//             description={dictionary?.fields[name]?.formFieldDescription}
	//             type="number"
	//             state={fieldInfo(field())}
	//             value={field().state.value as number}
	//             onChange={(e) => field().setValue(parseFloat(e.target.value))}
	//             onBlur={field().handleBlur}
	//             class="border-dividing-color bg-primary-color w-full rounded-md border"
	//           />
	//         )}
	//       </Field>
	//     );
	//   case Array.isArray(value):
	//     // 数组字段，假设数组项为对象
	//     return (
	//       <div class="flex flex-col gap-2">
	//         <For each={value as unknown[]}>
	//           {(item, idx) => (
	//             <div class="flex items-center gap-2">
	//               {Object.entries(item || {}).map(([subKey]) => (
	//                 <Field form={form} name={`${name}[${idx()}].${subKey}`}>
	//                   {(subField) =>
	//                     renderField(
	//                       form,
	//                       `${name}[${idx()}].${subKey}`,
	//                       subField().state.value,
	//                       dictionary,
	//                       dataSchema.shape[subKey],
	//                     )
	//                   }
	//                 </Field>
	//               ))}
	//               <Button
	//                 onClick={() => {
	//                   const newArray = [...(value as unknown[])];
	//                   newArray.splice(idx(), 1);
	//                   setFieldValue(name, newArray);
	//                 }}
	//               >
	//                 {typeof dictionary?.fields?.remove === "string" ? dictionary.fields.remove : "Remove"}
	//               </Button>
	//             </div>
	//           )}
	//         </For>
	//         <Button
	//           onClick={() => {
	//             const defaultItem = Object.keys(value[0] ?? {}).reduce(
	//               (acc, k) => ({
	//                 ...acc,
	//                 [k]: typeof value[0][k] === "string" ? "" : 0,
	//               }),
	//               {},
	//             );
	//             setFieldValue(name, [...(value as unknown[]), defaultItem]);
	//           }}
	//         >
	//           {typeof dictionary?.fields?.add === "string" ? dictionary.fields.add : "Add"}
	//         </Button>
	//       </div>
	//     );
	//   case type === "object" && value !== null:
	//     // 嵌套对象
	//     return (
	//       <div class="flex flex-col gap-2">
	//         {Object.entries(value as Record<string, unknown>).map(([subKey, subVal]) => (
	//           <div class="flex flex-col gap-1">
	//             <label class="text-accent-color font-bold">
	//               {typeof dictionary?.fields[subKey]?.key === "string" ? dictionary.fields[subKey].key : subKey}
	//             </label>
	//             {renderField(form, `${name}.${subKey}`, subVal, dictionary, dataSchema.shape[subKey])}
	//           </div>
	//         ))}
	//       </div>
	//     );
	//   default:
	//     return null;
	// }
}
