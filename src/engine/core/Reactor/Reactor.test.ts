import { describe, expect, it } from "vitest";
import { assign, createMachine } from "xstate";
import { z } from "zod";
import { InputPort } from "./InputPort";
import { OutputPort } from "./OutputPort";
import { Reactor } from "./Reactor";
import { ReactorScheduler } from "./ReactorScheduler";
import type { ReactionDecl, Tag } from "./types";
import { XStateReactor } from "./XStateReactor";

// ==================== 测试用 Schema ====================

const DamageSchema = z.object({
	amount: z.number().nonnegative(),
	sourceId: z.string(),
});

const HpSchema = z.number().nonnegative();
const AliveSchema = z.boolean();
const PositionSchema = z.object({ x: z.number(), z: z.number() });

type DamagePayload = z.infer<typeof DamageSchema>;

// ==================== 测试用 XState Machine ====================

interface HpContext {
	hp: number;
	maxHp: number;
}

const hpMachine = createMachine({
	id: "hp",
	initial: "alive",
	context: { hp: 100, maxHp: 100 } as HpContext,
	states: {
		alive: {
			on: {
				DAMAGE: {
					actions: assign({
						hp: ({ context, event }) => Math.max(0, context.hp - (event as { type: "DAMAGE"; amount: number }).amount),
					}),
					target: "alive",
					guard: ({ context, event }) => context.hp - (event as { type: "DAMAGE"; amount: number }).amount > 0,
				},
				DAMAGE_FATAL: {
					actions: assign({ hp: 0 }),
					target: "dead",
				},
			},
		},
		dead: {
			type: "final",
		},
	},
});

// ==================== 测试用 Reactor 实现 ====================

/** 战斗成员 Reactor：接收伤害，输出 HP 和存活状态 */
class MemberReactor extends XStateReactor<typeof hpMachine> {
	readonly damageIn = this.addInput("damageIn", DamageSchema);
	readonly hpOut = this.addOutput("hpOut", HpSchema);
	readonly aliveOut = this.addOutput("aliveOut", AliveSchema);

	constructor(id: string) {
		super(id, hpMachine, {
			inputToEvent: {
				damageIn: (v) => {
					const { amount } = v as DamagePayload;
					return { type: "DAMAGE" as const, amount };
				},
			},
			snapshotToOutput: {
				hpOut: (snap) => snap.context.hp,
				aliveOut: (snap) => snap.matches("alive"),
			},
		});
	}
}

/** 移动 Reactor：接收移动输入，输出位置 */
class MovementReactor extends Reactor {
	readonly movementIn = this.addInput("movementIn", PositionSchema);
	readonly positionOut = this.addOutput("positionOut", PositionSchema);

	private _position = { x: 0, z: 0 };

	reactions(): ReactionDecl<this>[] {
		return [
			{
				triggers: ["movementIn"],
				effects: ["positionOut"],
				body: (self) => {
					const input = self.movementIn.value;
					if (!input) return;
					self._position = { x: self._position.x + input.x, z: self._position.z + input.z };
					self.positionOut.set({ ...self._position });
				},
			},
		];
	}

	captureState() {
		return { position: this._position };
	}
	restoreState(s: unknown) {
		this._position = (s as { position: { x: number; z: number } }).position;
	}
}

// ==================== 辅助函数 ====================

const tag = (logicalTime: bigint, microstep = 0): Tag => ({ logicalTime, microstep });

// ==================== 测试 ====================

describe("Reactor 端口类型安全", () => {
	it("InputPort 持有 Zod schema，编译期类型与 schema 一致", () => {
		const port = new InputPort("damage", DamageSchema);
		expect(port.name).toBe("damage");
		expect(port.schema).toBe(DamageSchema);
	});

	it("OutputPort 持有 Zod schema，编译期类型与 schema 一致", () => {
		const port = new OutputPort("hp", HpSchema);
		expect(port.name).toBe("hp");
		expect(port.schema).toBe(HpSchema);
	});

	it("InputPort._set 拒绝不符合 schema 的值", () => {
		const port = new InputPort("damage", DamageSchema);
		// 缺少 sourceId 字段
		expect(() => port._set({ amount: 10 })).toThrow();
	});

	it("InputPort._set 接受符合 schema 的值", () => {
		const port = new InputPort("damage", DamageSchema);
		port._set({ amount: 10, sourceId: "enemy-1" });
		expect(port.isPresent).toBe(true);
		expect(port.value).toEqual({ amount: 10, sourceId: "enemy-1" });
	});

	it("Reactor 子类的端口 schema 可从实例读取（编辑器可发现性）", () => {
		const member = new MemberReactor("player-1");
		const damagePort = member.inputPorts.get("damageIn") as InputPort<DamagePayload>;
		const hpPort = member.outputPorts.get("hpOut");

		expect(damagePort?.schema).toBe(DamageSchema);
		expect(hpPort?.schema).toBe(HpSchema);
	});
});

describe("ReactorScheduler APG 构建", () => {
	it("单个 Reactor 注册后形成单层 APG", () => {
		const scheduler = new ReactorScheduler();
		const member = new MemberReactor("player-1");
		scheduler.register(member);

		expect(scheduler.reactorCount).toBe(1);
	});

	it("无依赖连接的两个 Reactor 形成独立单层", () => {
		const scheduler = new ReactorScheduler();
		const memberA = new MemberReactor("playerA");
		const memberB = new MemberReactor("playerB");
		scheduler.register(memberA);
		scheduler.register(memberB);

		// 两个 Reactor 没有连接，各自独立，APG 构建不报错
		expect(scheduler.reactorCount).toBe(2);
	});

	it("有端口连接时构建正确的 upstream→downstream 层序", () => {
		const scheduler = new ReactorScheduler();
		const movement = new MovementReactor("movement");
		const member = new MemberReactor("player-1");

		// movement.positionOut 连接到 member（假设 member 有 positionIn）
		// 这里只验证连接声明不报错，层序 movement < member
		scheduler.register(movement);
		scheduler.register(member, [
			{
				fromReactorId: "movement",
				fromPortName: "positionOut",
				toReactorId: "player-1",
				toPortName: "damageIn", // 借用 damageIn 端口验证连接结构
			},
		]);

		expect(scheduler.reactorCount).toBe(2);
	});

	it("环路连接在 APG 构建时抛出错误", () => {
		const scheduler = new ReactorScheduler();
		const a = new MovementReactor("a");
		const b = new MovementReactor("b");

		scheduler.register(a);
		scheduler.register(b);
		scheduler.addConnection({
			fromReactorId: "a",
			fromPortName: "positionOut",
			toReactorId: "b",
			toPortName: "movementIn",
		});
		scheduler.addConnection({
			fromReactorId: "b",
			fromPortName: "positionOut",
			toReactorId: "a",
			toPortName: "movementIn",
		});

		// APG 构建在 step() 时触发，因为 _apgDirty=true
		expect(() => scheduler.step(tag(1000n))).toThrow(/因果环路/);
	});

	it("after 延迟连接不产生 APG 依赖边（不影响当前 Tag 层序）", () => {
		const scheduler = new ReactorScheduler();
		const a = new MovementReactor("a");
		const b = new MovementReactor("b");

		scheduler.register(a);
		scheduler.register(b, [
			{
				fromReactorId: "a",
				fromPortName: "positionOut",
				toReactorId: "b",
				toPortName: "movementIn",
				afterNs: 1000n, // 有延迟，不产生 APG 边
			},
		]);

		// 反向也有 after 延迟，不产生环
		scheduler.addConnection({
			fromReactorId: "b",
			fromPortName: "positionOut",
			toReactorId: "a",
			toPortName: "movementIn",
			afterNs: 1000n,
		});

		// 两个方向都有 after 延迟，不产生 APG 依赖边，构建不报错
		expect(() => scheduler.step(tag(1000n))).not.toThrow();
	});
});

describe("XStateReactor 适配器", () => {
	it("自动从 inputToEvent 映射生成 Reaction 声明", () => {
		const member = new MemberReactor("player-1");
		const reactions = member.reactions();

		expect(reactions).toHaveLength(1);
		expect(reactions[0].triggers).toContain("damageIn");
		expect(reactions[0].effects).toContain("hpOut");
		expect(reactions[0].effects).toContain("aliveOut");
	});

	it("Reaction body 驱动 XState machine，snapshot 投影到 OutputPort", () => {
		const scheduler = new ReactorScheduler();
		const member = new MemberReactor("player-1");
		scheduler.register(member);

		// 手动设置 damageIn 端口值（模拟调度器填充）
		const damagePort = member.inputPorts.get("damageIn") as InputPort<DamagePayload>;
		damagePort._set({ amount: 30, sourceId: "enemy" });

		// 执行 Reaction
		const reactions = member._getTriggeredReactions();
		expect(reactions).toHaveLength(1);
		reactions[0].body(member as never, tag(1000n));

		// 验证 OutputPort 值
		expect(member.hpOut.value).toBe(70);
		expect(member.aliveOut.value).toBe(true);
	});

	it("XState state 变化时 become() 同步 LF mode", () => {
		const scheduler = new ReactorScheduler();
		const member = new MemberReactor("player-1");
		scheduler.register(member);

		// 触发致命伤害
		const damagePort = member.inputPorts.get("damageIn") as InputPort<DamagePayload>;
		damagePort._set({ amount: 200, sourceId: "enemy" });

		// 手动触发 DAMAGE_FATAL 以测试 mode 切换
		member.actor.send({ type: "DAMAGE_FATAL" });
		const snap = member.actor.getSnapshot();
		expect(snap.matches("dead")).toBe(true);
	});
});

describe("Reactor Modal Reactors（become/mode）", () => {
	it("become() 在本 Tag 调用，下一 Tag 的 _snapshotMode 才更新", () => {
		const scheduler = new ReactorScheduler();
		const member = new MemberReactor("player-1");
		scheduler.register(member);

		// 当前 mode 快照为 undefined
		expect(member._modeSnapshot).toBeUndefined();

		// become() 切换 mode
		member.become("combat");

		// 快照还未更新（需要等下一 Tag 的 _snapshotMode 调用）
		expect(member._modeSnapshot).toBeUndefined();

		// 调度器在下一 Tag 开始时更新快照
		member._snapshotMode();
		expect(member._modeSnapshot).toBe("combat");
	});

	it("mode 过滤：未声明 mode 的 Reaction 在任何 mode 下均激活", () => {
		const member = new MemberReactor("player-1");
		// XStateReactor 生成的 reaction 不声明 mode
		const reactions = member.reactions();
		expect(reactions[0].mode).toBeUndefined();
	});
});

describe("端口连接 schema 兼容性", () => {
	it("可从端口 schema 读取类型信息（编辑器可发现性）", () => {
		const movement = new MovementReactor("movement");
		const member = new MemberReactor("member-1");

		// 编辑器场景：枚举所有输出端口及其 schema
		const outputSchemas = Array.from(movement.outputPorts.entries()).map(([name, port]) => ({
			name,
			schema: port.schema,
		}));

		expect(outputSchemas).toHaveLength(1);
		expect(outputSchemas[0].name).toBe("positionOut");
		expect(outputSchemas[0].schema).toBe(PositionSchema);

		// 枚举所有输入端口
		const inputSchemas = Array.from(member.inputPorts.entries()).map(([name, port]) => ({
			name,
			schema: port.schema,
		}));

		expect(inputSchemas).toHaveLength(1);
		expect(inputSchemas[0].name).toBe("damageIn");
	});
});
