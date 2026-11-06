import type { Actor, AnyStateMachine, StateFrom } from "xstate";
import { createActor } from "xstate";
import { Reactor } from "./Reactor";
import type { ReactionDecl } from "./types";

/**
 * 端口映射声明：定义如何将 InputPort 值转换为 XState event，
 * 以及如何从 XState snapshot 投影到 OutputPort。
 *
 * TInput：InputPort 值类型的联合
 * TOutput：OutputPort 值类型的联合
 */
export interface XStatePortMap<TMachine extends AnyStateMachine> {
	/**
	 * InputPort 名 → XState event 工厂函数。
	 * reaction body 调用前先执行此映射，将端口值转换为 XState event。
	 */
	inputToEvent?: Partial<Record<string, (value: unknown) => Parameters<Actor<TMachine>["send"]>[0]>>;

	/**
	 * OutputPort 名 → 从 XState snapshot 投影值的函数。
	 * reaction body 执行后（状态机处理完 event 后）调用，将 context 写入端口。
	 */
	snapshotToOutput?: Partial<Record<string, (snapshot: StateFrom<TMachine>) => unknown>>;
}

/**
 * XStateReactor：将 XState v5 StateMachine 封装为标准 LF Reactor。
 *
 * 分层职责：
 * - LF 层（Reactor 基类）：端口声明、APG 构建、Tag 调度、mode 切换
 * - XState 层（本适配器）：事件驱动、状态转换、context 持久化
 *
 * 适配规则：
 * - 每个声明了 inputToEvent 映射的 InputPort 自动生成一个 Reaction
 * - 该 Reaction 的 body 将端口值转换为 XState event，驱动状态机
 * - 状态机处理完毕后，通过 snapshotToOutput 将 context 投影到 OutputPort
 * - XState state value 变化时自动调用 become() 同步 LF mode（供外部观察）
 *
 * @example
 * ```ts
 * class HpReactor extends XStateReactor<typeof hpMachine> {
 *   readonly damageIn = this.addInput("damageIn", z.number());
 *   readonly hpOut    = this.addOutput("hpOut", z.number());
 *
 *   constructor(id: string) {
 *     super(id, hpMachine, {
 *       inputToEvent: {
 *         damageIn: (v) => ({ type: "DAMAGE", amount: v as number }),
 *       },
 *       snapshotToOutput: {
 *         hpOut: (snap) => snap.context.hp,
 *       },
 *     });
 *   }
 * }
 * ```
 */
export abstract class XStateReactor<TMachine extends AnyStateMachine> extends Reactor {
	public readonly actor: Actor<TMachine>;
	private readonly portMap: XStatePortMap<TMachine>;

	constructor(id: string, machine: TMachine, portMap: XStatePortMap<TMachine>) {
		super(id);
		this.actor = createActor(machine);
		this.actor.start();
		this.portMap = portMap;
	}

	/**
	 * 自动根据 inputToEvent 映射生成 Reaction 列表。
	 * 每个有映射的 InputPort 生成一个独立 Reaction，按端口声明顺序排列。
	 * 子类可以 override 并追加自定义 Reaction。
	 */
	reactions(): ReactionDecl<this>[] {
		const decls: ReactionDecl<this>[] = [];
		const { inputToEvent = {}, snapshotToOutput = {} } = this.portMap;
		const outputPortNames = Object.keys(snapshotToOutput);

		for (const [portName, eventFactory] of Object.entries(inputToEvent)) {
			if (!eventFactory) continue;
			decls.push({
				triggers: [portName],
				effects: outputPortNames,
				body(self, _tag) {
					const port = self.inputPorts.get(portName);
					if (!port?.isPresent) return;

					// 投递 XState event
					const event = eventFactory(port.value);
					self.actor.send(event as Parameters<Actor<TMachine>["send"]>[0]);

					// 投影 snapshot → OutputPort
					const snapshot = self.actor.getSnapshot() as StateFrom<TMachine>;
					for (const [outName, project] of Object.entries(snapshotToOutput)) {
						if (!project) continue;
						const outPort = self.outputPorts.get(outName);
						if (outPort) (outPort as { set(v: unknown): void }).set(project(snapshot));
					}

					// 同步 LF mode（XState state value → mode 名）
					const stateValue = snapshot.value;
					const modeName = typeof stateValue === "string" ? stateValue : JSON.stringify(stateValue);
					self.become(modeName);
				},
			});
		}

		return decls;
	}

	captureState(): unknown {
		return this.actor.getPersistedSnapshot();
	}

	restoreState(state: unknown): void {
		// XState v5 不支持直接恢复已启动 actor 的快照；子类可按需 override
		void state;
	}
}
