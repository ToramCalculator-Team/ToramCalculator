import { describe, expect, it } from "vitest";
import { assertSharedMemorySupport } from "./sharedMemorySupport";

describe("assertSharedMemorySupport", () => {
	it("完整共享内存能力通过启动断言", () => {
		expect(() =>
			assertSharedMemorySupport({
				isSecureContext: true,
				crossOriginIsolated: true,
				hasSharedArrayBuffer: true,
				hasAtomics: true,
			}),
		).not.toThrow();
	});

	it("缺少跨源隔离时明确失败且不提供降级", () => {
		expect(() =>
			assertSharedMemorySupport({
				isSecureContext: true,
				crossOriginIsolated: false,
				hasSharedArrayBuffer: false,
				hasAtomics: true,
			}),
		).toThrow("crossOriginIsolated、SharedArrayBuffer");
	});
});
