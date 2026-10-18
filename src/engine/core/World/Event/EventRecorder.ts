// World中记录已发送事件的地方，服务于引擎的事件输出机制
// 外部模块需要知道某些事情发生时机的话，应该表明自己需要订阅这些事件，然后引擎每tick收集EventRecorder中记录的事件，发布到引擎输出端口
// 不主动收集事件，只被动记录
//
// 引擎过程产生事件
//     ↓
// EventRecorder 记录本 Tick 内所有事件
//     ↓
// Tick 末引擎遍历记录
//     ↓
// 按当前外部订阅筛选
//     ↓
// 只有匹配订阅的事件写入输出事件区

import type { WorldEvent } from "./types.ts";

export class EventRecorder {
	private events: Map<string, WorldEvent> = new Map();

	record(event: WorldEvent) {}
}
