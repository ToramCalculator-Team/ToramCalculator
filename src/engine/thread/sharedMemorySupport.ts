export type SharedMemoryCapabilities = {
	isSecureContext: boolean;
	crossOriginIsolated: boolean;
	hasSharedArrayBuffer: boolean;
	hasAtomics: boolean;
};

export function readSharedMemoryCapabilities(): SharedMemoryCapabilities {
	return {
		isSecureContext: globalThis.isSecureContext === true,
		crossOriginIsolated: globalThis.crossOriginIsolated === true,
		hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
		hasAtomics: typeof Atomics !== "undefined",
	};
}

/**
 * 校验跨线程共享内存所需的浏览器能力。
 * 该函数只报告技术能力，不决定哪个业务功能必须使用共享内存。
 */
export function assertSharedMemorySupport(capabilities = readSharedMemoryCapabilities()): void {
	const missing: string[] = [];
	if (!capabilities.isSecureContext) missing.push("安全上下文");
	if (!capabilities.crossOriginIsolated) missing.push("crossOriginIsolated");
	if (!capabilities.hasSharedArrayBuffer) missing.push("SharedArrayBuffer");
	if (!capabilities.hasAtomics) missing.push("Atomics");
	if (missing.length > 0) {
		throw new Error(`共享内存环境不可用，当前缺少: ${missing.join("、")}`);
	}
}
