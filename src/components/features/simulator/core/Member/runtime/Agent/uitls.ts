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
