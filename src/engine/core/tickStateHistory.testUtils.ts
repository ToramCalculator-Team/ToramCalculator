import { type TickStateHistoryDirectory, TickStateHistoryWriter } from "./tickStateHistory";

/** 为不关心成员历史内容的测试构造结构完整的 Tick 状态历史目录。 */
export function createTestTickStateHistory(tickCount = 0, tickDurationMs = 10): TickStateHistoryDirectory {
	const writer = new TickStateHistoryWriter(0, 0);
	for (let tick = 0; tick < tickCount; tick++) writer.appendTick(tick, (tick + 1) * tickDurationMs, []);
	return writer.finish();
}
