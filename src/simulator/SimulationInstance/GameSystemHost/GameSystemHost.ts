import type {
	ObserverDeclaration,
	ObserverHandle,
	ObserverRegistration,
	ObserverRuntimeFactory,
} from "../Channels/Channels";
import type {
	GameInputReader,
	GameState,
	GameSystem,
	GameSystemFactory,
	GameSystemOperation,
} from "./GameSystem/GameSystem";
import { PausableHostClock } from "./GameSystem/PausableHostClock";

/** 游戏系统宿主的构造依赖。 */
export interface GameSystemHostOptions {
	observers: ObserverRuntimeFactory;
}

/** 游戏系统装载参数。 */
export interface GameSystemLoadOptions {
	input: GameInputReader;
	initialState?: GameState;
}

/**
 * 游戏系统运行环境。
 *
 * 宿主持有逻辑时钟和当前游戏系统，连接游戏控制器输入与观察输出，并管理观察者。
 * 同线程和跨线程模式都使用此宿主；通道实现决定具体的 I/O 传输方式。生命周期状态由上层控制器维护。
 */
export class GameSystemHost {
	/** 游戏世界唯一逻辑时钟。 */
	private readonly clock: PausableHostClock;

	/** 观察通道工厂。 */
	private readonly observersFactory: ObserverRuntimeFactory;

	/** 当前游戏系统。 */
	private gameSystem: GameSystem | null = null;

	/** 当前输入读取端。 */
	private input: GameInputReader | null = null;

	/** 已创建的观察者。 */
	private readonly observers = new Map<number, ObserverHandle>();

	private nextObserverId = 1;

	constructor(options: GameSystemHostOptions) {
		this.clock = new PausableHostClock();
		this.observersFactory = options.observers;
	}

	/**
	 * 构造并装载游戏系统。
	 *
	 * @param create 游戏实现提供的游戏系统工厂
	 * @param options 输入读取端和可选初始状态
	 */
	loadGame(create: GameSystemFactory, options: GameSystemLoadOptions): void {
		if (this.gameSystem) {
			throw new Error("游戏系统已经装载。");
		}
		this.input = options.input;
		this.gameSystem = create({
			clock: this.clock,
			input: options.input,
			initialState: options.initialState,
		});
	}

	/**
	 * 执行生命周期管理器已接受的游戏系统运行操作。
	 *
	 * @param operation 启动、暂停、恢复、停止或单步操作
	 * @returns 执行端完成操作的 Promise
	 * @throws 尚未装载游戏系统时抛出错误
	 */
	async execute(operation: GameSystemOperation): Promise<void> {
		this.assertLoaded();
		switch (operation) {
			case "start":
				this.clock.start();
				return;
			case "pause":
				this.clock.pause();
				return;
			case "resume":
				this.clock.resume();
				return;
			case "stop":
				this.clock.pause();
				return;
			case "step":
				this.stepToNext();
				return;
		}
	}

	/**
	 * 推进到游戏系统报告的下一项逻辑工作，并保持暂停。
	 *
	 * @throws 游戏系统未装载、没有下一项工作或时钟仍在运行时抛出错误
	 */
	stepToNext(): void {
		this.assertLoaded();
		const nextTime = this.gameSystem?.getNextTime();
		if (!nextTime) {
			throw new Error("游戏系统没有下一项逻辑工作。");
		}
		this.clock.advanceTo(nextTime.timeMs);
	}

	/**
	 * 添加一个动态观察者。
	 *
	 * @param declaration 消费端声明的数据选择和采样配置
	 * @returns 观察者编号与读取句柄
	 */
	addObserver(declaration: ObserverDeclaration): ObserverRegistration {
		this.assertLoaded();
		const gameSystem = this.gameSystem;
		if (!gameSystem) throw new Error("游戏系统尚未装载。");
		const handle = this.observersFactory.create(gameSystem, this.clock, declaration);
		const observerId = this.nextObserverId;
		this.nextObserverId += 1;
		this.observers.set(observerId, handle);
		return { observerId, handle };
	}

	/**
	 * 移除一个观察者。
	 *
	 * @param observerId 要移除的观察者编号
	 * @returns 观察资源释放完成的 Promise
	 */
	async removeObserver(observerId: number): Promise<void> {
		const handle = this.observers.get(observerId);
		if (!handle) return;
		this.observers.delete(observerId);
		await handle.close();
	}

	/**
	 * 销毁宿主、游戏系统、观察者和通道资源。
	 *
	 * @returns 资源释放完成的 Promise
	 */
	async dispose(): Promise<void> {
		const observers = [...this.observers.values()];
		this.observers.clear();
		await Promise.all(observers.map((observer) => observer.close()));
		this.gameSystem = null;
		this.input = null;
		this.clock.dispose();
	}

	private assertLoaded(): void {
		if (!this.gameSystem || !this.input) {
			throw new Error("游戏系统尚未装载。");
		}
	}
}
