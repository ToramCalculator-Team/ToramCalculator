import type { Agent } from "./Agent";

// 约定：形如 { $: "prop" } 的对象代表“取 agent[prop]”的引用
export type AgentPropertyReference = { $: string };

export function isAgentPropertyReference(
	value: unknown,
): value is AgentPropertyReference {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	if (Object.keys(value).length !== 1) {
		return false;
	}
	if (!Object.hasOwn(value, "$")) {
		return false;
	}
	const propName = (value as { $?: unknown }).$;
	return typeof propName === "string" && propName.length > 0;
}

export function resolveAgentProperty(agent: Agent, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = agent;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

export function resolveAgentNonNegativeInteger(
	agent: Agent,
	value: number | AgentPropertyReference,
	label: string,
	resolveProperty?: (path: string) => unknown,
): number {
	let resolved: unknown;
	if (typeof value === "number") {
		resolved = value;
	} else {
		resolved = resolveAgentProperty(agent, value.$);
		if (resolved === undefined && resolveProperty) {
			resolved = resolveProperty(value.$);
		}
	}

	if (
		typeof resolved !== "number" ||
		Number.isNaN(resolved) ||
		Math.floor(resolved) !== resolved
	) {
		throw new Error(`${label} 必须是整数`);
	}
	if (resolved < 0) {
		throw new Error(`${label} 必须是非负整数`);
	}

	return resolved;
}
