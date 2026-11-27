import type { ObserverHandle } from "../Channels/Channels";

/** 游戏数据呈现端。 */
export interface GameRenderer {
	/**
	 * 读取并呈现一个观察者的数据通道。
	 *
	 * @param observer 消费端取得的观察者句柄
	 * @returns 停止读取和呈现的清理函数
	 */
	consume(observer: ObserverHandle): () => void;

	/**
	 * 释放渲染器资源和全部读取订阅。
	 *
	 * @returns 资源释放完成的 Promise
	 */
	dispose(): Promise<void>;
}
