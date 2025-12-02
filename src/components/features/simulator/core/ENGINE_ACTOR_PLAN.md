你现在这套设想，其实已经很接近 “Erlang-style actor + 逻辑帧调度” 了，我会从 “保留/强化什么” 和 “需要警惕/调整什么（尤其是 JS 高性能现实约束）” 两块给建议。
我会刻意保留 / 强化的设计
actor-first 的世界观：所有系统都是 FSM/Actor，通信全靠消息
保持现在这条原则：禁止直接跨 Actor 改状态，只能 send 事件（包括成员、Buff 系统、渲染桥接器等）。
这点和 Erlang 非常一致，也最有利于以后分布式 / 录制回放 / 回滚。
“时间”与“逻辑”强分离：FrameLoop 只管时间，引擎/Actor 只管逻辑
非常赞同你刚才总结的：FrameLoop 只负责调度“单帧执行器”并根据结果决定是否推进帧数。
以后无论你是：
本地跑（workder 内）
远程 server 驱动帧号
离线回放（重放事件日志）
都只要换“谁在调用 stepFrame”，而不用动战斗逻辑。
跨帧行为一律显式为事件链，而不是 Promise 链
“不能有跨帧未完成的任务” + pendingFrameTasks 的约束，我建议继续坚持，并且写成显式的编码规范：
帧内只能做“确定能在本帧完成的同步任务”；
所有长逻辑要拆成多帧 FSM 事件（或 Worker 计算 + 回传事件）。
这点非常 Erlang：用消息表达“未来发生什么”，而不是持有一个阻塞中的调用。
消息都是 “纯数据”
这一点你基本已经在做（payload 里没有闭包和实例，只是 id / 类型 / data），非常适合：
跨线程（postMessage）
将来跨进程 / 跨设备（序列化传输）
重放 / 录制（事件日志）
我会提醒 / 调整的地方（结合 Erlang 思想 + JS 高性能现实）
1）中央事件队列 vs 各 Actor 本地队列：短期别急着去中心化
概念上，“每个 Actor 维护自己的定时事件队列”很 Erlang、也很优雅；
但在你当前阶段，中央 EventQueue 还有三大现实优势：
全局可观测性：一个快照就能画出“未来所有帧的事件时间线”（做 UI/调试非常有用）。
fast-forward / run-to-frame 很简单：只看一个地方就知道有没有活。
确定性调度顺序：统一按 (executeFrame, priority) 排序，不会出现各 Actor 本地顺序不一致的问题。
我的建议：
架构上把 EventQueue 当作“总线/日志”，而不是“业务处理器”；
API 只支持 “插入定时 FSM 事件” 和 “按帧批量取出”；
将来真要走 Erlang 式 per-mailbox，可以在 Actor 内部包一层，把 EventQueue 看成底层存储索引即可，现在不用为未来过早牺牲调试体验。
2）“let it crash” 要如何映射到 JS/XState
Erlang 的精髓之一是：错误隔离 + 监督树，而不是“所有异常都 try-catch 然后继续硬撑”。
你现在在 executeQueueEvent 里统一 try/catch，然后只是 console.error；建议稍作升级：
粒度：以“成员 Actor”为错误边界，某个成员的 FSM/行为树爆了，只标记这个成员为 dead/broken，让其它人照常跑。
监督：GameEngine/MemberManager 扮演 supervisor：
可以有简单的策略：某个成员连续 N 帧报错 → 自动移出战场 / 进入 “error” 状态。
这样做的好处是：更贴近 Erlang 的“错误是常态、要被隔离”，而不是 JS 世界常见的“要把所有异常吞掉”。
3）高性能角度：热路径上要克制使用“花里胡哨”的 TS/工具
你现在的主热路径大概是：FrameLoop.processFrameLoop → GameEngine.stepFrame → member.update / 行为树 tick / pipeline。
建议在这几条链路上注意：
减少对象分配和临时数组：
processQueueEvents 里频繁创建新数组、拷贝 payload 会给 GC 压力很大；
可以考虑：复用事件对象或用简单的对象池，但这可以等功能稳定后再做。
避免在热路径里频繁日志 / zod 校验：
插入事件/每帧处理时的 console.log、zod.parse，要保证都可以一键禁用，或者只在 debug 标志下开启。
成员更新顺序要稳定且 O(N)：
现在按 memberManager.getAllMembers() 遍历，注意保证这个返回顺序是稳定的（比如内部 Map → 数组时做一次排序），
这样行为是可重放/可预测的，有利于以后做“同配置同种子必然同结果”的优化搜索。
4）在 Actor 接口层面统一 “tick vs receive”
目前你有几种不同风格的“运行入口”（FSM 事件、行为树 tick、pipeline），建议收敛到两个概念：
receive(message)：处理一条 FSM 事件（就是现在的 member_fsm_event 最终落到的地方）。
tick(frame)：在每帧被调一次，用来推进内部时间（行为树 runtime 已经有 update(dt) 的概念）。
Erlang 只靠 receive，但你这里有“逻辑帧”，多一个 tick 接口是合理的：
所有“只依赖时间的事”（CD 递减、Buff 持续时间、自发事件）放在 tick；
所有“响应外部消息的事”放在 receive。
这样你的 FrameProcessor 只需要做两件事：
deliver all messages scheduled for this frame → actor.receive(...)
for each actor: actor.tick(currentFrame)
5）尽早固定一些“不可变的协议”
为了兼顾 Erlang 风格和未来的分布式/回放，我会建议你尽早把这些东西固定成协议文档，以后尽量不改：
消息格式：
比如 member_fsm_event 的 payload 始终是：
targetMemberId: string
fsmEventType: string
data: Record<string, unknown>
（可选）source: string / taskId: string
帧内不允许出现的模式：
不允许在 FSM action / 行为树节点里直接 await；
不允许写入 Math.random()（如果要做可重现优化）——改用统一的 RNG 服务。
错误处理约束：
禁止在业务代码里 try/catch 一切；
只允许在明确的“边界层”（比如 pipeline 封装、JS 脚本执行器）做错误转译。
一句话总结
从“最小惊喜 + Erlang 思想”的角度看，你现在的总体方向是对的：
纯 Actor + 纯消息 + 逻辑帧调度 + 禁止跨帧悬挂任务，本身就很贴合 Erlang 的精神。
如果要兼顾 高性能 + 长期可演进，我主要会建议你：
短期保留中央事件队列，作为“日志总线 + 调试入口”，把它瘦到只剩“定时 FSM 消息”；
在 Actor 边界上引入更明确的 tick/receive 和错误隔离策略；
在热路径里注意 GC/日志/zod 这些 JS 现实的性能因素。
如果你愿意，下一步我可以按这个思路，帮你写一份很短的“引擎内部编码规范”，专门约束：行为树节点 / FSM action / pipeline stage 在帧内可以做什么、不能做什么，这样你后面迭代逻辑时就不会和架构初衷打架。