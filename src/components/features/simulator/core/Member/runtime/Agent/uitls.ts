import { type ZodType, z } from "zod/v4";
import type { State } from "~/lib/mistreevous/State";
import type { CommonProperty } from "./CommonProperty";
import type { ActionPool, ConditionPool } from "./type";

const unwrapSchema = (schema: ZodType): ZodType => {
	let current: ZodType = schema;
	const asZodType = (t: z.core.$ZodType): ZodType => t as unknown as ZodType;
	while (true) {
		if (current instanceof z.ZodOptional) {
			current = asZodType(current.unwrap());
			continue;
		}
		if (current instanceof z.ZodNullable) {
			current = asZodType(current.unwrap());
			continue;
		}
		if (current instanceof z.ZodDefault) {
			current = asZodType(current.unwrap());
			continue;
		}
		if (current instanceof z.ZodPipe) {
			current = asZodType(current.in);
			continue;
		}
		break;
	}
	return current;
};

const getZodObjectShape = (schema: z.ZodObject): Record<string, ZodType> => {
	return schema.shape as unknown as Record<string, ZodType>;
};

const flattenSchemaLabels = (schema: ZodType, prefix = ""): string[] => {
	const unwrapped = unwrapSchema(schema);
	if (!(unwrapped instanceof z.ZodObject)) {
		return [prefix || "input"];
	}
	const shape = getZodObjectShape(unwrapped);
	const result: string[] = [];
	for (const [key, child] of Object.entries(shape)) {
		const label = prefix ? `${prefix}.${key}` : key;
		const childUnwrapped = unwrapSchema(child);
		if (childUnwrapped instanceof z.ZodObject) {
			result.push(...flattenSchemaLabels(childUnwrapped, label));
		} else {
			result.push(label);
		}
	}
	return result;
};

const buildInputObject = (schema: ZodType, args: unknown[]): unknown => {
	const labels = flattenSchemaLabels(schema);
	// 1) 非 object schema：允许直接传入单个值
	if (labels.length === 1 && labels[0] === "input") {
		return args[0];
	}
	// 2) 空 object schema：允许 0 参数
	if (labels.length === 0) {
		return {};
	}

	const obj: Record<string, unknown> = {};
	for (let i = 0; i < labels.length; i++) {
		const label = labels[i];
		const parts = label.split(".");
		let cursor: Record<string, unknown> = obj;
		for (let p = 0; p < parts.length; p++) {
			const k = parts[p];
			if (!k) continue;
			if (p === parts.length - 1) {
				cursor[k] = args[i];
			} else {
				const next = cursor[k];
				if (!next || typeof next !== "object") {
					cursor[k] = {};
				}
				cursor = cursor[k] as Record<string, unknown>;
			}
		}
	}
	return obj;
};

/**
 * 将 ActionPool（[schema, impl]）转换为可直接注入 runtimeContext 的 invoker 函数表。
 *
 * 注意：
 * - 运行时不做 zod 校验
 * - 仍保留“位置参数 -> object 输入”的映射规则，以兼容 MDSL 的调用方式
 */
export const actionPoolToInvokers = <TPool extends ActionPool<TContext>, TContext extends Record<string, unknown>>(
	_context: TContext, // 仅用于类型推导
	pool: TPool,
) => {
	// 注意：Mistreevous 会以 `agent[name].apply(agent, args)` 的方式调用动作函数
	// 因此这里需要返回 `(...args) => State` 形态的函数，并在内部把“位置参数”映射为 impl 所需的 inputObj。
	const invokers = {} as Record<keyof TPool, (this: TContext, ...args: unknown[]) => State>;
	for (const name of Object.keys(pool)) {
		const entry = pool[name as keyof TPool];
		const schema = entry[0] as unknown as ZodType;
		const impl = entry[1] as unknown as (context: TContext, actionInput: unknown) => State;

		// 必须使用 function 声明，以便拿到 `this === runtimeContext`
		invokers[name as keyof TPool] = function (this: TContext, ...args: unknown[]) {
			const inputObj = buildInputObject(schema, args);
			return impl(this, inputObj);
		};
	}
	return invokers;
};

/**
 * 将 ConditionPool（[schema, impl]）转换为可直接注入 runtimeContext 的 invoker 函数表。
 */
export const conditionPoolToInvokers = <
	TPool extends ConditionPool<TContext>,
	TContext extends Record<string, unknown>,
>(
	_context: TContext, // 仅用于类型推导
	pool: TPool,
): Record<keyof TPool, (this: TContext, ...args: unknown[]) => boolean> => {
	// 注意：Mistreevous 会以 `agent[name].apply(agent, args)` 的方式调用条件函数
	// 因此这里需要返回 `(...args) => boolean` 形态的函数，并在内部把“位置参数”映射为 impl 所需的 inputObj。
	const invokers = {} as Record<keyof TPool, (this: TContext, ...args: unknown[]) => boolean>;
	for (const name of Object.keys(pool)) {
		const entry = pool[name as keyof TPool];
		const schema = entry[0] as unknown as ZodType;
		const impl = entry[1] as unknown as (context: TContext, actionInput: unknown) => boolean;

		// 必须使用 function 声明，以便拿到 `this === runtimeContext`
		invokers[name as keyof TPool] = function (this: TContext, ...args: unknown[]) {
			const inputObj = buildInputObject(schema, args);
			return impl(this, inputObj);
		};
	}
	return invokers;
};

// 阈值描述函数
export const maxMin = (min: number, value: number, max: number) => {
	return Math.max(min, Math.min(value, max));
};

/**
 * 发送渲染指令
 * @param context 运行时上下文
 * @param actionName 动作名称
 * @param params 参数
 */
export const sendRenderCommand = (context: CommonProperty, actionName: string, params?: Record<string, unknown>) => {
	if (!context.renderMessageSender) {
		console.warn(`⚠️ [${context.owner?.name}] 无法获取渲染消息接口，无法发送渲染指令: ${actionName}`);
		return;
	}
	const now = Date.now();
	const renderCmd = {
		type: "render:cmd" as const,
		cmd: {
			type: "action" as const,
			entityId: context.owner?.id,
			name: actionName,
			seq: now,
			ts: now,
			params,
		},
	};
	context.renderMessageSender?.(renderCmd);
};
