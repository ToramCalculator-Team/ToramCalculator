/**
 * 总线上流通的单条事实。
 *
 * topic 形如 `受击流程.命中判定:succeeded`，由 BT 节点 wrapper 在发布时按树路径自动生成。
 * payload 形状由 topic 定义约束；静态类型安全由规则包的 defineFlow 推断提供（声明式系统建立后生效）。
 */
export interface BusEvent {
	/** 完整 topic 路径。 */
	topic: string;
	/** 发布时刻的不可变值拷贝。 */
	payload: unknown;
	/** 派发模拟时间（毫秒）。 */
	timeMs: number;
}

export interface InEngineSubscription {
	/** passive / buff / registlet id，按来源批量清理时使用。 */
	sourceId: string;
	/** topic 前缀，前缀匹配。 */
	topicPrefix: string;
	handler: (event: BusEvent) => void;
}

/**
 * checkpoint 只保留 subscriptions 的元数据索引；handler 不可序列化，
 * restore 后由 passive / skill 安装逻辑重新订阅。
 */
export interface EventBusCheckpoint {
	subscriptions: Array<{ sourceId: string; topicPrefix: string }>;
}
