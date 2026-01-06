import type { CommonProperty } from "./CommonProperty";

// 阈值描述函数
export const maxMin = (min: number, value: number, max: number) => {
	return Math.max(min, Math.min(value, max));
};

export const getPathValue = (obj: any, path: string | undefined) => {
	if (!obj || !path) return undefined;
	return path.split(".").reduce((acc, key) => {
		if (acc && typeof acc === "object" && key in acc) {
			return (acc as any)[key];
		}
		return undefined;
	}, obj);
};

export const setPathValue = (obj: any, path: string, value: any) => {
	if (!path) return obj;
	const parts = path.split(".");
	let cursor = obj as any;
	for (let i = 0; i < parts.length; i++) {
		const key = parts[i];
		if (i === parts.length - 1) {
			cursor[key] = value;
			return obj;
		}
		if (!cursor[key] || typeof cursor[key] !== "object") {
			cursor[key] = {};
		}
		cursor = cursor[key];
	}
	return obj;
};

/**
 * 发送渲染指令
 * @param context 运行时上下文
 * @param actionName 动作名称
 * @param params 参数
 */
export const sendRenderCommand = (
	context: CommonProperty,
	actionName: string,
	params?: Record<string, unknown>,
) => {
	if (!context.owner?.engine.postRenderMessage) {
		console.warn(
			`⚠️ [${context.owner?.name}] 无法获取渲染消息接口，无法发送渲染指令: ${actionName}`,
		);
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
	context.owner?.engine.postRenderMessage(renderCmd);
};