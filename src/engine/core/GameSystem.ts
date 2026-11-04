/**
 * 模拟系统的运行面。
 *
 * 外层只依赖推进、时间、状态、观察四件事，不依赖任何具体模拟模型的内部结构。
 */

/**
 * 一次逻辑推进的时刻。
 *
 * `cursor` 是实现自己的次序标记，引擎不解释，只按 `timeMs` 排序，需要时原样保存。
 */
export interface SimulationTime {
	timeMs: number;
	cursor?: unknown;
}

/**
 * 模拟系统的权威状态。
 *
 * `time` 是恢复点，用于定位；`payload` 是实现自己的状态，引擎只在外层加模型类型与版本。
 *
 * 检查点必须与产生它的运行配置同源：结束时刻、周期与容量都不在检查点里，
 * 由恢复方提供的配置决定。
 */
export interface GameSystemCheckpoint {
	time: SimulationTime;
	payload: unknown;
}

/**
 * 采集器诊断。
 *
 * `writeMs` 是自上次读取以来写入耗时的累计，读取后归零。
 */
export interface CollectorStats {
	name: string;
	sampleCount: number;
	writeMs: number;
	used: number;
	capacity: number;
	dropped: number;
}

export interface GameSystem {
	/**
	 * 初始化。
	 *
	 * 由宿主在加载时调用一次。实现在这里建立自己的内部结构，此后形状不再变化。
	 */
	initialize(): void;

	/** 启动推进。 */
	start(): void;

	/** 停止推进，释放唤醒源。 */
	stop(): void;

	/**
	 * 暂停推进。
	 *
	 * 保留状态与待处理工作。物理时钟由模拟环境冻结，因此系统内读到的经过时间连续。
	 * 暂停期间不推进，恢复后从暂停时的逻辑时刻继续。
	 */
	pause(): void;

	/** 恢复推进。与 `pause()` 对等，作用在同一实例上。 */
	resume(): void;

	/**
	 * 推进一次逻辑时间。
	 *
	 * 把一个逻辑时刻的全部工作做完后返回。只应在暂停时调用。
	 *
	 * @returns 推进后的时刻；已无待处理工作时返回 null
	 */
	stepToNext(): SimulationTime | null;

	/** 当前逻辑时刻。 */
	getTime(): SimulationTime;

	/**
	 * 注册逻辑时间完成观察者。
	 *
	 * 一个逻辑时刻的全部工作结束时调用，同一时刻不会重复通知。
	 * 观察者不得推进模拟或修改状态。
	 *
	 * @returns 取消注册的函数
	 */
	onAdvance(listener: (time: SimulationTime) => void): () => void;

	/** 捕获权威状态。 */
	captureCheckpoint(): GameSystemCheckpoint;

	/**
	 * 恢复权威状态。
	 *
	 * 只接受已初始化且未启动的实例。违反时抛错，不做修补：已启动实例的
	 * 定时器与启动工作都已消费，再恢复会重复排定。
	 */
	restoreCheckpoint(checkpoint: GameSystemCheckpoint): void;

	/** 采集器诊断。 */
	getCollectorStats(): CollectorStats[];
}
