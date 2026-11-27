import type { GameSystem } from "../GameSystemHost/GameSystem/GameSystem";
import type { HostClock } from "../GameSystemHost/GameSystem/HostClock";

/** 游戏控制端写入、游戏系统读取的输入通道。 */
export interface GameInputChannel extends GameInputWriter, GameInputReader {}

/** 游戏输入写入端。 */
export interface GameInputWriter {
	/**
	 * 写入一份连续输入或离散命令。
	 *
	 * @param input 要发布的游戏输入
	 */
	write(input: unknown): void;

	/**
	 * 关闭输入写入端。
	 *
	 * @returns 关闭完成的 Promise
	 */
	close(): Promise<void>;
}

/** 游戏输入读取端。 */
export interface GameInputReader {
	/**
	 * 读取当前输入。
	 *
	 * @returns 当前输入快照或没有输入时的 null
	 */
	read(): unknown | null;
}

/** 消费端声明的观察输出需求。 */
export interface ObserverDeclaration {
	selection: readonly string[];
	samplePeriodMs: number;
	capacity: number;
	overflow: "drop-oldest" | "drop-newest" | "fail";
}

/** 消费端持有的观察读取句柄。 */
export interface ObserverHandle {
	/**
	 * 读取当前观察产出。
	 *
	 * @returns 当前快照或事件范围
	 */
	read(): unknown;

	/**
	 * 释放采样器和观察数据通道。
	 *
	 * @returns 资源释放完成的 Promise
	 */
	close(): Promise<void>;
}

/** 宿主持有的观察者注册信息。 */
export interface ObserverRegistration {
	observerId: number;
	handle: ObserverHandle;
}

/** 宿主用于创建按逻辑时间采样的观察者。 */
export interface ObserverRuntimeFactory {
	/**
	 * 创建观察者并接入游戏系统。
	 *
	 * @param gameSystem 观察者读取状态的游戏系统
	 * @param clock 观察者使用的执行端逻辑时钟
	 * @param declaration 消费端的数据选择与采样配置
	 * @returns 观察者读取句柄；关闭句柄会停止采样并释放通道
	 */
	create(gameSystem: GameSystem, clock: HostClock, declaration: ObserverDeclaration): ObserverHandle;
}
