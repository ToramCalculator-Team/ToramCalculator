import { OutPort } from "../core/port";
import { type Parameter, type ReactionSandbox, Reactor, Timer } from "../core/reactor";
import type { Write } from "../core/types";

function produceOutput<S>(this: ReactionSandbox, o: Write<S>, payload: Parameter<S>): void {
	o.set(payload.get());

	// FIXME: create a test that actually tests double sets.
	// It's confusing to have SingleEvent be a DoubleEvent.
	// Duplicate sets for the same port is bad form,
	// but its worth checking that the correct value (from the last set)
	// is delivered.
	// FIXME：补充实际测试重复赋值的用例。SingleEvent 表现为 DoubleEvent 会令人困惑。
	// 对同一端口重复赋值是不规范的，但仍应验证最终传递的是最后一次赋值的值。
	console.log("Writing payload to SingleEvent's output.");
}

export class SingleEvent<T> extends Reactor {
	o: OutPort<T> = new OutPort<T>(this);

	t1: Timer = new Timer(this, 0, 0);

	constructor(
		parent: Reactor,
		private readonly payload: Parameter<T>,
	) {
		super(parent);
		this.addReaction([this.t1], [this.writable(this.o), this.payload], produceOutput);
	}
}
