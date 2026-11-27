import type { HostClock } from "./HostClock";

/** 一次逻辑推进的时刻。 */
export interface GameTime {
	timeMs: number;
	cursor: number;
}

/** 游戏系统向外发布的状态快照。 */
export interface GameState extends Record<string, unknown> {}

/** 游戏系统构造时获得的执行环境。 */
export interface GameSystemEnvironment {
	clock: HostClock;
	input: GameInputReader;
	initialState?: GameState;
}

/** 游戏系统读取输入的最小接口。 */
export interface GameInputReader {
	/**
	 * 读取当前可用的游戏输入。
	 *
	 * @returns 当前输入快照或没有输入时的 null
	 */
	read(): unknown | null;
}

/** 游戏系统在执行端支持的运行操作。 */
export type GameSystemOperation = "start" | "pause" | "resume" | "stop" | "step";

/** 当前线程或执行端都可以使用的游戏系统构造函数。 */
export type GameSystemFactory = (environment: GameSystemEnvironment) => GameSystem;

/** 在宿主时钟提供的环境中运行的游戏规则系统。 */
export interface GameSystem {
	/** 统一状态对象，每步逻辑工作完成后更新。 */
	readonly state: GameState;

	/**
	 * 获取当前已完成的逻辑时刻。
	 *
	 * @returns 当前逻辑时刻
	 */
	getCurrentTime(): GameTime;

	/**
	 * 获取下一项逻辑工作的时刻。
	 *
	 * @returns 下一项工作时刻；没有已排定工作时返回 null
	 */
	getNextTime(): GameTime | null;

	/**
	 * 注册逻辑步完成回调。
	 *
	 * @param handle 逻辑步完成后调用的回调
	 * @returns 回调句柄编号
	 */
	addStepHandle(handle: (time: GameTime) => void): number;

	/**
	 * 移除逻辑步完成回调。
	 *
	 * @param handleNumber 要移除的回调句柄编号
	 */
	removeStepHandle(handleNumber: number): void;
}

/** 游戏系统装载时使用的初始状态。 */
export interface GameSystemLoadOptions {
	input: GameInputReader;
	initialState?: GameState;
}
