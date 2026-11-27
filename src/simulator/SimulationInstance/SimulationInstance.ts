import type { ObserverDeclaration, ObserverHandle } from "./Channels/Channels";
import type { GameController } from "./GameController/GameController";
import type { GameRenderer } from "./GameRenderer/GameRenderer";
import type { GameSystemHost } from "./GameSystemHost/GameSystemHost";
import type { GameSystemLifecycleController } from "./LifecycleController/GameSystemLifecycleController";

/** 一次模拟实例的四个直接组成模块。 */
export interface SimulationInstanceParts {
	lifecycle: GameSystemLifecycleController;
	controller: GameController;
	system: GameSystemHost;
	renderer: GameRenderer;
}

/** 由模拟服务创建并持有的单次模拟。 */
export class SimulationInstance {
	private disposed = false;

	constructor(
		readonly id: string,
		private readonly parts: SimulationInstanceParts,
	) {}

	/**
	 * 启动游戏系统。
	 */
	start(): Promise<void> {
		this.assertActive();
		return this.parts.lifecycle.send("start");
	}

	/**
	 * 暂停游戏世界的逻辑时间。
	 */
	pause(): Promise<void> {
		this.assertActive();
		return this.parts.lifecycle.send("pause");
	}

	/**
	 * 恢复游戏世界的逻辑时间。
	 */
	resume(): Promise<void> {
		this.assertActive();
		return this.parts.lifecycle.send("resume");
	}

	/**
	 * 停止游戏系统。
	 */
	stop(): Promise<void> {
		this.assertActive();
		return this.parts.lifecycle.send("stop");
	}

	/**
	 * 写入游戏输入。
	 *
	 * @param input 游戏输入
	 */
	submitInput(input: unknown): void {
		this.assertActive();
		this.parts.controller.submit(input);
	}

	/**
	 * 添加动态观察者。
	 *
	 * @param declaration 消费端声明的数据选择和采样策略
	 * @returns 可直接读取的观察句柄
	 */
	addObserver(declaration: ObserverDeclaration): ObserverHandle {
		this.assertActive();
		return this.parts.system.addObserver(declaration).handle;
	}

	/**
	 * 销毁模拟实例及其组成模块。
	 *
	 * @returns 全部资源释放完成的 Promise
	 */
	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		await this.parts.lifecycle.dispose();
		const results = await Promise.allSettled([
			this.parts.controller.dispose(),
			this.parts.system.dispose(),
			this.parts.renderer.dispose(),
		]);
		const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
		if (errors.length === 1) throw errors[0];
		if (errors.length > 1) throw new AggregateError(errors, "模拟实例销毁时有多个资源释放失败。");
	}

	private assertActive(): void {
		if (this.disposed) throw new Error(`SimulationInstance 已销毁: ${this.id}`);
	}
}
