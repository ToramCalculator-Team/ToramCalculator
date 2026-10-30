import type { InputPort } from "./InputPort";
import type { Reactor } from "./Reactor";
import type { PendingMessage, PortConnection, ReactorContext, Tag } from "./types";
import { tagEq, tagLt } from "./types";

/**
 * ReactorScheduler：单 Tag 驱动的确定性调度器。
 *
 * 职责：
 * 1. 维护 Reactor 注册表和端口连接表
 * 2. 每个 Tag 开始时用 Kahn 拓扑排序构建 APG（有向无环优先图）
 * 3. 按层序执行各 Reactor 的 Reaction，在层间传播 OutputPort → InputPort
 * 4. 管理 PendingMessage 队列（Logical Action 的延迟投递）
 * 5. 检测因果环路并报错
 *
 * 单线程假设：所有操作在同一 JS Worker 内串行执行。
 * 分布式边界：federation 在此之上添加网络传输层，Reactor 模型不变。
 */
export class ReactorScheduler {
	private reactors = new Map<string, Reactor>();
	private connections: PortConnection[] = [];
	private pendingMessages: PendingMessage[] = [];
	private _currentTag: Tag = { logicalTime: 0n, microstep: 0 };
	/** APG 拓扑脏标记：有新 Reactor 注册或注销时置 true，下一 Tag 重建。 */
	private _apgDirty = true;
	/** 缓存的 Kahn 拓扑排序结果（按层分组的 reactorId 列表）。 */
	private _layers: string[][] = [];

	// ── ReactorContext（注入给每个 Reactor）───────────────────

	private makeContext(): ReactorContext {
		return {
			enqueue: (msg) => this._enqueue(msg),
			register: (reactor, connections) => this.register(reactor, connections),
			currentTag: () => this._currentTag,
		};
	}

	// ── 注册与注销 ────────────────────────────────────────────

	/**
	 * 注册 Reactor 到调度器，注入 ReactorContext，标记 APG 脏。
	 * connections 中涉及该 Reactor 的连接同时加入全局连接表。
	 */
	register(reactor: Reactor, connections?: PortConnection[]): void {
		this.reactors.set(reactor.id, reactor);
		reactor._bind(this.makeContext());
		if (connections) {
			this.connections.push(...connections);
		}
		this._apgDirty = true;
	}

	/** 从调度器移除 Reactor，同时移除涉及它的所有连接，标记 APG 脏。 */
	unregister(reactorId: string): void {
		this.reactors.delete(reactorId);
		this.connections = this.connections.filter((c) => c.fromReactorId !== reactorId && c.toReactorId !== reactorId);
		this._apgDirty = true;
	}

	/** 添加端口连接（不涉及新 Reactor 时使用）。 */
	addConnection(connection: PortConnection): void {
		this.connections.push(connection);
		this._apgDirty = true;
	}

	// ── Tag 驱动（外部调用入口）──────────────────────────────

	/**
	 * 推进到指定 Tag 并执行所有触发的 Reaction。
	 * tag 必须严格大于 currentTag（超稠密时间单调递增）。
	 */
	step(tag: Tag): void {
		if (!tagLt(this._currentTag, tag)) {
			throw new Error(
				`Tag 必须单调递增：当前
 (${this._currentTag.logicalTime},${this._currentTag.microstep})` + ` → 请求 (${tag.logicalTime},${tag.microstep})`,
			);
		}
		this._currentTag = tag;
		this._runTag(tag);
	}

	/**
	 * 处理下一个待投递消息的 Tag（推进逻辑时间到最近未来事件）。
	 * 返回处理的 Tag；若队列为空则返回 null。
	 */
	stepNext(): Tag | null {
		const next = this._nextPendingTag();
		if (!next) return null;
		this._currentTag = next;
		this._runTag(next);
		return next;
	}

	/** 在游戏引擎固定步长 tick 中调用：按 tickNs 推进 logicalTime，microstep 重置为 0。 */
	tick(tickNs: bigint): void {
		const nextTag: Tag = {
			logicalTime: this._currentTag.logicalTime + tickNs,
			microstep: 0,
		};
		// 先处理所有到期的 pending messages（microstep 驱动的内部因果链）
		// 再推进主 tick
		this._drainPendingUpTo(nextTag);
		this._currentTag = nextTag;
		this._runTag(nextTag);
	}

	// ── Tag 内执行流程 ────────────────────────────────────────

	private _runTag(tag: Tag): void {
		// 1. 快照所有 Reactor 的 Mode（Modal Reactors 语义：本 Tag 内 become 不影响本 Tag）
		for (const reactor of this.reactors.values()) {
			reactor._snapshotMode();
		}

		// 2. 分发到期的 Logical Action 消息
		this._deliverPending(tag);

		// 3. 重建 APG（如果拓扑脏）
		if (this._apgDirty) {
			this._rebuildAPG();
			this._apgDirty = false;
		}

		// 4. 按层序执行 Reaction，层间传播端口值
		for (const layer of this._layers) {
			// 执行本层所有 Reactor 的触发 Reaction
			for (const reactorId of layer) {
				const reactor = this.reactors.get(reactorId);
				if (!reactor) continue;
				const triggered = reactor._getTriggeredReactions();
				for (const decl of triggered) {
					decl.body(reactor as never, tag);
				}
			}
			// 本层执行完毕后，传播 OutputPort → InputPort
			this._propagatePorts();
		}

		// 5. 清空所有端口与 Action
		for (const reactor of this.reactors.values()) {
			reactor._clearPorts();
		}

		// 6. 处理本 Tag 内因 send(delay=0) 产生的 microstep 事件
		this._drainMicrosteps(tag);
	}

	/** 处理 tag 范围内（logicalTime 相同，microstep 更大）的所有因果链事件。 */
	private _drainMicrosteps(baseTag: Tag): void {
		while (true) {
			const next = this._nextPendingTag();
			if (!next) break;
			// 只处理同 logicalTime 的更高 microstep（超稠密时间内部因果链）
			if (next.logicalTime !== baseTag.logicalTime) break;
			if (next.microstep <= this._currentTag.microstep) break;
			this._currentTag = next;
			this._runTag(next);
		}
	}

	/** 处理 tag 之前所有待投递消息（跨 logicalTime 的历史补偿，tick() 调用时用）。 */
	private _drainPendingUpTo(upTo: Tag): void {
		while (true) {
			const next = this._nextPendingTag();
			if (!next) break;
			if (!tagLt(next, upTo)) break;
			this._currentTag = next;
			this._runTag(next);
		}
	}

	// ── APG 构建（Kahn 拓扑排序）────────────────────────────

	/**
	 * 重建 APG：依据端口连接构造 Reactor 粒度的有向依赖图，
	 * 用 Kahn 算法计算拓扑层序。
	 *
	 * 边规则：若存在连接 A.out → B.in（无 after 延迟），则 A 必须在 B 之前执行（A → B）。
	 * 有 after 延迟的连接在当前 Tag 不产生依赖边（延迟到未来 Tag 投递，不影响当前拓扑）。
	 */
	private _rebuildAPG(): void {
		const ids = Array.from(this.reactors.keys());
		const inDegree = new Map<string, number>(ids.map((id) => [id, 0]));
		const successors = new Map<string, Set<string>>(ids.map((id) => [id, new Set()]));

		for (const conn of this.connections) {
			// 仅同 Tag 传播的连接（无 after 延迟）产生依赖边
			if (conn.afterNs && conn.afterNs > 0n) continue;
			const { fromReactorId: from, toReactorId: to } = conn;
			if (!this.reactors.has(from) || !this.reactors.has(to)) continue;
			const succs = successors.get(from);
			if (succs && !succs.has(to)) {
				succs.add(to);
				inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
			}
		}

		// Kahn 算法
		const layers: string[][] = [];
		let frontier = ids.filter((id) => (inDegree.get(id) ?? 0) === 0);

		while (frontier.length > 0) {
			layers.push(frontier);
			const next: string[] = [];
			for (const id of frontier) {
				for (const succ of successors.get(id) ?? []) {
					const deg = (inDegree.get(succ) ?? 0) - 1;
					inDegree.set(succ, deg);
					if (deg === 0) next.push(succ);
				}
			}
			frontier = next;
		}

		// 环路检测
		const sorted = layers.flat();
		if (sorted.length !== ids.length) {
			const cycle = ids.filter((id) => !sorted.includes(id));
			throw new Error(`检测到因果环路，涉及 Reactor：${cycle.join(", ")}`);
		}

		this._layers = layers;
	}

	// ── 端口传播 ──────────────────────────────────────────────

	/**
	 * 将所有 OutputPort 的当前值传播到连接的 InputPort。
	 * after=0n 的连接在当前 Tag 传播（nextMicrostep 已由 _drainMicrosteps 处理）。
	 * after>0n 的连接转换为 PendingMessage 投递到未来 Tag。
	 */
	private _propagatePorts(): void {
		for (const conn of this.connections) {
			const fromReactor = this.reactors.get(conn.fromReactorId);
			const toReactor = this.reactors.get(conn.toReactorId);
			if (!fromReactor || !toReactor) continue;

			const outPort = fromReactor.outputPorts.get(conn.fromPortName);
			if (!outPort?.isPresent) continue;

			if (!conn.afterNs || conn.afterNs === 0n) {
				// 同 Tag 传播
				const inPort = toReactor.inputPorts.get(conn.toPortName) as InputPort<unknown> | undefined;
				inPort?._set(outPort.value);
			} else {
				// 有逻辑延迟：转为 PendingMessage
				const executeAt: Tag = {
					logicalTime: this._currentTag.logicalTime + conn.afterNs,
					microstep: 0,
				};
				this._enqueue({
					id: `port:${conn.fromReactorId}.${conn.fromPortName}->${conn.toReactorId}.${conn.toPortName}@$
 {executeAt.logicalTime}`,
					targetReactorId: conn.toReactorId,
					actionName: conn.toPortName,
					value: outPort.value,
					executeAt,
				});
			}
		}
	}

	// ── Logical Action 消息队列 ───────────────────────────────

	private _enqueue(msg: PendingMessage): void {
		this.pendingMessages.push(msg);
		// 保持按 executeAt 升序（简单插入排序，消息量少时足够）
		this.pendingMessages.sort((a, b) => {
			if (a.executeAt.logicalTime !== b.executeAt.logicalTime) {
				return a.executeAt.logicalTime < b.executeAt.logicalTime ? -1 : 1;
			}
			return a.executeAt.microstep - b.executeAt.microstep;
		});
	}

	/** 分发所有 executeAt === tag 的消息到对应 Reactor 的 LogicalAction 或 InputPort。 */
	private _deliverPending(tag: Tag): void {
		const remaining: PendingMessage[] = [];
		for (const msg of this.pendingMessages) {
			if (tagEq(msg.executeAt, tag)) {
				const reactor = this.reactors.get(msg.targetReactorId);
				if (!reactor) continue;
				const action = reactor.logicalActions.get(msg.actionName);
				if (action) {
					action._deliver(msg.value as never);
				} else {
					// 兼容 after 连接投递到 InputPort 的情况
					const port = reactor.inputPorts.get(msg.actionName) as InputPort<unknown> | undefined;
					port?._set(msg.value);
				}
			} else if (tagLt(tag, msg.executeAt)) {
				remaining.push(msg);
			}
			// executeAt < tag 的消息视为过期，丢弃
		}
		this.pendingMessages = remaining;
	}

	/** 返回消息队列中最近的未来 Tag，若队列为空返回 null。 */
	private _nextPendingTag(): Tag | null {
		if (this.pendingMessages.length === 0) return null;
		return this.pendingMessages[0].executeAt;
	}

	// ── 状态查询 ──────────────────────────────────────────────

	get currentTag(): Tag {
		return this._currentTag;
	}

	/** 已注册的 Reactor 数量。 */
	get reactorCount(): number {
		return this.reactors.size;
	}
}
