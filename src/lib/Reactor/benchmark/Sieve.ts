import { Action } from "../core/action";
import { InPort, OutPort } from "../core/port";
import { App, Parameter, Reactor } from "../core/reactor";
import { State } from "../core/state";
import { Origin, TimeValue } from "../core/time";
import { Log } from "../core/util";

Log.setLevel(Log.LogLevel.INFO);
class Ramp extends Reactor {
	next: Action<number>;

	until: Parameter<number>;

	value = new OutPort<number>(this);

	constructor(parent: Reactor, until = 100000, period: TimeValue) {
		super(parent);
		this.until = new Parameter(until);
		this.next = new Action<number>(this, Origin.logical, period);
		this.addReaction(
			[this.startup, this.next],
			[this.schedulable(this.next), this.until, this.writable(this.value)],
			function (this, next, until, value) {
				const n = next.get();
				if (n === undefined) {
					next.schedule(0, 2);
				} else {
					if (n >= until.get()) {
						this.util.requestStop();
					} else {
						next.schedule(0, n + 1);
						value.set(n);
					}
				}
			},
		);
	}
}

class Filter extends Reactor {
	inp = new InPort<number>(this);

	out = new OutPort<number>(this);

	startPrime: Parameter<number>;

	localPrimes: State<number[]>;

	hasChild: State<boolean>;

	constructor(parent: Reactor, startPrime: number, numberOfPrimes: number) {
		super(parent);
		// console.log("Created filter with prime: " + prime)
		// 输出新建筛选器及其质数的调试信息。
		this.startPrime = new Parameter(startPrime);
		this.localPrimes = new State([] as number[]);
		this.hasChild = new State(false);
		this.addMutation(
			[this.inp],
			[this.inp, this.writable(this.out), this.out.asConnectable(), this.startPrime, this.hasChild, this.localPrimes],
			function (this, inp, outW, outC, prime, hasChild, localPrimes) {
				const p = inp.get();
				if (p !== undefined) {
					const seen = localPrimes.get();
					const size = seen.length;
					let div = false;
					for (const q of seen) {
						if (Number.isInteger(p / q)) {
							div = true;
							break;
						}
					}

					if (!div) {
						if (size < numberOfPrimes) {
							seen.push(p);
							console.log(`Found new prime number ${p}`);
						} else {
							// Potential prime found.
							// 找到可能的质数。
							if (!hasChild.get()) {
								const n = new Filter(this.getReactor(), p, numberOfPrimes);
								// this.start(n)
								// console.log("CREATING...")
								// let x = this.create(Filter, [this.getReactor(), p])
								// console.log("CREATED: " + x._getFullyQualifiedName())
								// FIXME: weird hack. Maybe just accept writable ports as well?
								// FIXME：此处使用了不寻常的变通方式；或许也可以直接接受可写端口？
								this.connect(outC, n.inp.asConnectable());
								// FIXME: this updates the dependency graph, but it doesn't redo the topological sort
								// For a pipeline like this one, it is not necessary, but in general it is.
								// Can we avoid redoing the entire sort?
								// FIXME：此操作会更新依赖图，但不会重新执行拓扑排序。对此流水线无需重排，但一般情况下需要。能否避免每次都完整重排？
								hasChild.set(true);
							} else {
								outW.set(p);
							}
						}
					}
				}
			},
		);
	}
}

class Sieve extends App {
	source: Ramp;

	filter: Filter;

	constructor(
		name: string,
		timeout: TimeValue | undefined = undefined,
		keepAlive = false,
		fast = false,
		success?: () => void,
		fail?: () => void,
	) {
		super(timeout, keepAlive, fast, success, fail);
		this.source = new Ramp(this, 100000, TimeValue.nsec(1));
		this.filter = new Filter(this, 2, 1000);
		this._connect(this.source.value, this.filter.inp);
	}
}

const sieve = new Sieve("Sieve");
sieve._start();
