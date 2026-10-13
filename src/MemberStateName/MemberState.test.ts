import { describe, expect, it } from "vitest";
import type { MemberStateDeclaration, MemberStateFrameEntry } from "./MemberState";

describe("成员状态输出契约", () => {
	it("状态声明和状态帧只携带逻辑身份与开始时间", () => {
		const declaration: MemberStateDeclaration = { name: "skill.chanting", timeMs: 1_000, sequence: 1 };
		const frame: MemberStateFrameEntry = {
			name: declaration.name,
			instance: 1,
			startedAtLogicalTimeMs: declaration.timeMs,
		};
		expect(declaration).toEqual({ name: "skill.chanting", timeMs: 1_000, sequence: 1 });
		expect(frame).toEqual({ name: "skill.chanting", instance: 1, startedAtLogicalTimeMs: 1_000 });
	});
});
