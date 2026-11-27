import { GameSystemLifecycleStateGraph } from "./GameSystemLifecycleStateGraph";

export type GameSystemLifecycleCommand = "start" | "pause" | "resume" | "stop";
export type GameSystemLifecycleState = keyof typeof GameSystemLifecycleStateGraph;

/** 执行端提供的游戏系统运行操作。 */
export interface GameSystemLifecycleOperations {
	/**
	 * 在执行端执行游戏系统运行操作。
	 *
	 * @param command 已接受的运行命令
	 * @returns 执行端确认操作完成的 Promise
	 */
	execute(command: GameSystemLifecycleCommand): Promise<void>;
}

/** 管理游戏系统启动、暂停、恢复和停止的状态转换。 */
export class GameSystemLifecycleController {
	private state: GameSystemLifecycleState = "Stopped";
	private pending: Promise<void> | null = null;

	constructor(private readonly operations: GameSystemLifecycleOperations) {}

	/**
	 * 提交一项游戏系统运行命令。
	 *
	 * @param command 要执行的运行命令
	 * @returns 执行端确认命令完成的 Promise
	 * @throws 当前状态不接受该命令，或另一个命令仍在执行时抛出错误
	 */
	async send(command: GameSystemLifecycleCommand): Promise<void> {
		if (this.pending) throw new Error("游戏系统生命周期命令正在执行。");
		const nextState = (
			GameSystemLifecycleStateGraph[this.state] as Partial<Record<GameSystemLifecycleCommand, GameSystemLifecycleState>>
		)[command];
		if (!nextState) throw new Error(`游戏系统状态 ${this.state} 不接受命令 ${command}。`);

		const operation = this.operations.execute(command);
		this.pending = operation;
		try {
			await operation;
			this.state = nextState;
		} finally {
			this.pending = null;
		}
	}

	/**
	 * 获取当前游戏系统运行状态。
	 *
	 * @returns 当前状态
	 */
	getState(): GameSystemLifecycleState {
		return this.state;
	}

	/** 释放控制器并等待正在执行的操作结束。 */
	async dispose(): Promise<void> {
		await this.pending;
	}
}
