/**
 * 总线上流通的单条事实。
 *
 * topic 形如 `受击流程.命中判定.基础命中值计算:succeeded`，由 BT 树路径在发布时决定。
 * payload 形状由 topic 定义约束，在开发/测试环境校验；静态类型安全由规则包的 defineFlow 推断提供。
 */
export interface BusEvent {
	/** 完整 topic 路径。 */
	topic: string;
	/** 发布时刻的不可变值拷贝。 */
	payload: unknown;
	/** 派发模拟时间（毫秒）。 */
	timeMs: number;
}

export type EventBusCheckpoint = {};
