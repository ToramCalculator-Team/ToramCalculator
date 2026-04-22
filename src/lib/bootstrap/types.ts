export type ModuleStatus = "idle" | "loading" | "ready" | "error" | "skipped";

export interface BootstrapModule<T = void> {
	/** 唯一名称 */
	name: string;
	/** 依赖模块名（必须全部 ready 才开始） */
	deps: string[];
	/** 初始化；返回值可供后续模块通过 ctx.get(name) 取用 */
	init: (ctx: BootstrapRuntimeCtx) => Promise<T>;
	/** 为 true 时失败不阻塞下游（例如 SW 注册失败不应影响 PGlite） */
	optional?: boolean;
	/** 超时（ms）；超时视为 error */
	timeout?: number;
}

export interface BootstrapRuntimeCtx {
	get<T>(name: string): T | undefined;
	log: (msg: string) => void;
}

export interface BootstrapState {
	status: Record<string, ModuleStatus>;
	errors: Record<string, Error | undefined>;
	durations: Record<string, number>;
}
