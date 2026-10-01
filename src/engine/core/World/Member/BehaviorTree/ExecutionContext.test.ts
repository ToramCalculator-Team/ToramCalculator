import { describe, expect, it } from "vitest";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import { createExecutionContext } from "./ExecutionContext";

const createRuntime = (): MemberSharedRuntime =>
	({
		name: "member",
		memberId: "member-id",
		statusTags: [],
	}) as unknown as MemberSharedRuntime;

describe("createExecutionContext", () => {
	it("为每棵树创建隔离上下文，并按 localContext、binding、runtime 的顺序合并", () => {
		const runtime = createRuntime();
		const { context } = createExecutionContext({
			baseContext: runtime,
			memberName: runtime.name,
			bindings: {
				bindingOnly: "binding",
				shared: "binding",
			},
			localContext: {
				localOnly: "local",
				shared: "local",
			},
		});

		expect(context.localOnly).toBe("local");
		expect(context.bindingOnly).toBe("binding");
		expect(context.shared).toBe("local");
		expect(runtime).not.toHaveProperty("localOnly");
		expect(runtime).not.toHaveProperty("bindingOnly");
	});

	it("保留已有槽位并报告 binding 与 agent 冲突", () => {
		const warnings: string[] = [];
		const { context } = createExecutionContext({
			baseContext: createRuntime(),
			memberName: "member",
			bindings: { shared: "binding" },
			agent: "class Agent { shared = 'agent'; added() { return 'added'; } }",
			onWarning: (warning) => warnings.push(`${warning.code}:${warning.slotName ?? ""}`),
		});

		expect(context.shared).toBe("binding");
		expect(context.added).toBeTypeOf("function");
		expect(warnings).toEqual(["agent.member.conflict:shared"]);
	});
});
