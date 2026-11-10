import { describe, expect, it } from "vitest";
import { InPort, OutPort } from "~/lib/Reactor/core/port";
import { App, Reactor, Timer } from "~/lib/Reactor/core/reactor";
import { State } from "~/lib/Reactor/core/state";
import { TimeValue } from "~/lib/Reactor/core/time";

/**
 * 验证端口值只在写入的 tag 上可见（`port.ts:41` 的 isPresent 要求 tag 相同），
 * 因此独立周期的采集器不能直接读端口。可行结构是两级：
 *
 *   1. 级联反应与端口同 tag 触发，把端口值落到 `State`；
 *   2. 采集器按自己的周期读 `State`。
 *
 * `State.get()` 无 tag 条件，所以第二级可以是任意周期。
 */

/** 源：按自己的周期写端口。 */
class CounterSource extends Reactor {
	readonly tick: Timer;

	readonly out = new OutPort<number>(this);

	private n = 0;

	constructor(container: Reactor, periodMs: number) {
		super(container);
		this.tick = new Timer(this, TimeValue.msecs(periodMs), TimeValue.msecs(periodMs));
		const source = this;
		this.addReaction([this.tick], [this.tick, this.writable(this.out)], function (this, _t, out) {
			source.n += 1;
			out.set(source.n);
		});
	}
}

/** 级联级：与端口同 tag 触发，把端口值落到 State。 */
class PortLatch extends Reactor {
	readonly source = new InPort<number>(this);

	readonly latest = new State<number | undefined>(undefined);

	constructor(container: Reactor) {
		super(container);
		const latch = this;
		this.addReaction([this.source], [this.source], function (this, source) {
			const value = source.get();
			if (value === undefined) return;
			latch.latest.set(value);
		});
	}
}

/** 采集级：自己的周期读 State，与源周期无关。 */
class PeriodicCollector extends Reactor {
	readonly tick: Timer;

	readonly samples: Array<{ tMs: number; value: number | undefined }> = [];

	constructor(
		container: Reactor,
		periodMs: number,
		private readonly latch: PortLatch,
	) {
		super(container);
		this.tick = new Timer(this, TimeValue.msecs(periodMs), TimeValue.msecs(periodMs));
		const collector = this;
		this.addReaction([this.tick], [this.tick], function (this) {
			collector.samples.push({
				tMs: this.util.getElapsedLogicalTime().toMilliseconds(),
				value: collector.latch.latest.get(),
			});
		});
	}
}

function run(options: { sourceMs: number; collectMs: number; durationMs: number }) {
	return new Promise<Array<{ tMs: number; value: number | undefined }>>((resolve) => {
		const { sourceMs, collectMs, durationMs } = options;
		class TestApp extends App {
			readonly collector: PeriodicCollector;

			constructor() {
				super(TimeValue.secs(5), false, true, () => resolve(this.collector.samples));
				const source = new CounterSource(this, sourceMs);
				const latch = new PortLatch(this);
				this._connect(source.out, latch.source);
				this.collector = new PeriodicCollector(this, collectMs, latch);
				const stop = new Timer(this, TimeValue.msecs(durationMs), TimeValue.msecs(durationMs));
				this.addReaction([stop], [stop], function () {
					this.util.requestStop();
				});
			}
		}
		new TestApp()._start();
	});
}

describe("端口可见性约束下的采集结构", () => {
	it("级联结构下采集器每周期都能读到最新值", async () => {
		const samples = await run({ sourceMs: 7, collectMs: 5, durationMs: 100 });
		expect(samples.length).toBeGreaterThan(10);
		const defined = samples.filter((s) => s.value !== undefined);
		expect(defined.length).toBeGreaterThan(10);
		const flat = samples.filter((s, i) => i > 0 && s.value === samples[i - 1]?.value).length;
		expect(flat).toBeGreaterThan(0);
	});

	it("采集频率低于源频率时不丢最新值，只丢中间过程", async () => {
		const samples = await run({ sourceMs: 3, collectMs: 20, durationMs: 300 });
		const values = samples.map((s) => s.value).filter((v): v is number => v !== undefined);
		expect(values.length).toBeGreaterThan(5);
		for (let i = 1; i < values.length; i += 1) {
			expect(values[i] as number).toBeGreaterThan(values[i - 1] as number);
		}
	});
});
