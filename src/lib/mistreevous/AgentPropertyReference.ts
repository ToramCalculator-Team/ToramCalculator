import type { Agent } from "./Agent";

// 约定：形如 { $: "prop" } 的对象代表“取 agent[prop]”的引用
export type AgentPropertyReference = { $: string };

export function isAgentPropertyReference(value: unknown): value is AgentPropertyReference {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    if (Object.keys(value).length !== 1) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(value, "$")) {
        return false;
    }
    const propName = (value as { $?: unknown })["$"];
    return typeof propName === "string" && propName.length > 0;
}

export function resolveAgentNonNegativeInteger(
    agent: Agent,
    value: number | AgentPropertyReference,
    label: string
): number {
    // 统一解析：数字直接使用；引用则从 agent 上取值
    const resolved = typeof value === "number" ? value : agent[value.$];

    if (typeof resolved !== "number" || isNaN(resolved) || Math.floor(resolved) !== resolved) {
        throw new Error(`${label} 必须是整数`);
    }
    if (resolved < 0) {
        throw new Error(`${label} 必须是非负整数`);
    }

    return resolved;
}


