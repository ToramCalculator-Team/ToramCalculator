/** 游戏输入控制器。 */
export interface GameController {
	/**
	 * 发布一份连续输入或离散游戏命令。
	 *
	 * @param input 游戏输入
	 */
	submit(input: unknown): void;

	/**
	 * 释放输入通道。
	 *
	 * @returns 资源释放完成的 Promise
	 */
	dispose(): Promise<void>;
}
