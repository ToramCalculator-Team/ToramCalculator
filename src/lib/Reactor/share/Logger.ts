import { InPort } from "../core/port";
import { type ReactionSandbox, Reactor } from "../core/reactor";
import { State } from "../core/state";
import type { Read } from "../core/types";

function print(this: ReactionSandbox, i: Read<unknown>, expected: State<unknown>): void {
	const received = i.get();
	if (received != null) {
		console.log(`Logging: ${received}`);
		if (received === expected.get()) {
			this.util.requestStop();
		} else {
			this.util.requestErrorStop(`Expected${expected.get()} but got ${received}`);
		}
	} else {
		throw new Error(
			"Log had no input available. This shouldn't happen because the logging reaction is triggered by the input",
		);
	}
}

export class Logger extends Reactor {
	i = new InPort<string>(this);

	constructor(parent: Reactor, expected: unknown) {
		super(parent);
		this.addReaction([this.i], [this.i, new State(expected)], print);
	}
}
