import { createId as createUniqueId } from "@paralleldrive/cuid2";
import { SimulationInstance, type SimulationInstanceParts } from "../SimulationInstance/SimulationInstance";

/** 模拟实例装配器。 */
export interface SimulationInstanceFactory {
	/**
	 * 创建一次模拟实例所需的四个组成模块。
	 *
	 * @param instanceId 新实例标识
	 * @returns 生命周期控制器、游戏控制器、游戏系统执行端和渲染器
	 */
	create(instanceId: string): Promise<SimulationInstanceParts>;
}

/** 管理多个模拟实例的创建和销毁。 */
export class SimulationService {
	private readonly instances = new Map<string, SimulationInstance>();

	constructor(
		private readonly factory: SimulationInstanceFactory,
		private readonly createId: () => string = createUniqueId,
	) {}

	/**
	 * 创建并登记一个模拟实例。
	 *
	 * @returns 已完成装配的模拟实例
	 */
	async createInstance(): Promise<SimulationInstance> {
		const id = this.createId();
		if (this.instances.has(id)) throw new Error(`SimulationInstance ID 冲突: ${id}`);

		const parts = await this.factory.create(id);
		const instance = new SimulationInstance(id, parts);
		this.instances.set(id, instance);
		return instance;
	}

	/**
	 * 按标识获取模拟实例。
	 *
	 * @param instanceId 模拟实例标识
	 * @returns 当前实例；不存在时返回 null
	 */
	getInstance(instanceId: string): SimulationInstance | null {
		return this.instances.get(instanceId) ?? null;
	}

	/**
	 * 销毁并移除一个模拟实例。
	 *
	 * @param instanceId 模拟实例标识
	 * @returns 资源释放完成的 Promise
	 */
	async closeInstance(instanceId: string): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance) return;
		await instance.dispose();
		this.instances.delete(instanceId);
	}

	/**
	 * 销毁当前服务管理的全部模拟实例。
	 *
	 * @returns 所有资源释放完成的 Promise
	 */
	async dispose(): Promise<void> {
		const instances = [...this.instances.values()];
		const results = await Promise.allSettled(instances.map((instance) => instance.dispose()));
		this.instances.clear();
		const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
		if (errors.length === 1) throw errors[0];
		if (errors.length > 1) throw new AggregateError(errors, "模拟服务关闭时有多个实例释放失败。");
	}
}
