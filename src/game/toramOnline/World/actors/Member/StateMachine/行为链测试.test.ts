import { describe, expect, it } from "vitest";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import { State } from "~/lib/mistreevous/State";

const testChain = `
root {
  sequence {
    condition [可接受攻击]
    selector {
      sequence {
        condition [是魔法伤害]
        action [计算伤害值]
        action [写入伤害]
      }
      sequence {
        action [计算是否发生闪躲]
        condition [未被闪躲]
        action [计算是否发生回避]
        action [计算是否发生暴击]
        selector {
          sequence {
            condition [没被回避]
            action [计算是否发生格挡]
            action [计算伤害值]
            action [写入伤害]
          }
          sequence {
            condition [发生了暴击]
            action [计算伤害值]
            action [写入伤害]
          }
        }
      }
    }
  }
}
`;

type BenchmarkAgent = {
	accepted: boolean;
	magic: boolean;
	dodged: boolean;
	evaded: boolean;
	critical: boolean;
	damageWrites: number;
	可接受攻击(): boolean;
	是魔法伤害(): boolean;
	计算伤害值(): State;
	写入伤害(): State;
	计算是否发生闪躲(): State;
	未被闪躲(): boolean;
	计算是否发生回避(): State;
	计算是否发生暴击(): State;
	没被回避(): boolean;
	发生了暴击(): boolean;
	计算是否发生格挡(): State;
};

function createAgent(): BenchmarkAgent {
	return {
		accepted: true,
		magic: false,
		dodged: false,
		evaded: false,
		critical: true,
		damageWrites: 0,
		可接受攻击() {
			return this.accepted;
		},
		是魔法伤害() {
			return this.magic;
		},
		计算伤害值() {
			return State.SUCCEEDED;
		},
		写入伤害() {
			this.damageWrites += 1;
			return State.SUCCEEDED;
		},
		计算是否发生闪躲() {
			return State.SUCCEEDED;
		},
		未被闪躲() {
			return !this.dodged;
		},
		计算是否发生回避() {
			return State.SUCCEEDED;
		},
		计算是否发生暴击() {
			return State.SUCCEEDED;
		},
		没被回避() {
			return !this.evaded;
		},
		发生了暴击() {
			return this.critical;
		},
		计算是否发生格挡() {
			return State.SUCCEEDED;
		},
	};
}

function runNative(agent: BenchmarkAgent): void {
	if (!agent.可接受攻击()) return;

	if (agent.是魔法伤害()) {
		agent.计算伤害值();
		agent.写入伤害();
		return;
	}

	agent.计算是否发生闪躲();
	if (agent.dodged) return;
	agent.计算是否发生回避();
	agent.计算是否发生暴击();

	if (!agent.evaded || agent.critical) {
		if (!agent.evaded) agent.计算是否发生格挡();
		agent.计算伤害值();
		agent.写入伤害();
	}
}

function measure(run: () => void, iterations: number, samples: number): number {
	const durations: number[] = [];
	for (let sample = 0; sample < samples; sample += 1) {
		const start = performance.now();
		for (let i = 0; i < iterations; i += 1) run();
		durations.push((performance.now() - start) * 1e6);
	}
	durations.sort((a, b) => a - b);
	return durations[Math.floor(durations.length / 2)];
}

describe("Mistreevous 与原生 JS 执行成本", () => {
	it("比较构建后行为树与等价原生流程", () => {
		const agent = createAgent();
		const tree = new BehaviourTree(testChain, agent);
		const iterations = 30_000;
		const samples = 7;

		const runTree = () => tree.step();
		const runCode = () => runNative(agent);

		for (let i = 0; i < 5_000; i += 1) {
			runTree();
			runCode();
		}

		const treeNs = measure(runTree, iterations, samples);
		const jsNs = measure(runCode, iterations, samples);
		const treeNsPerRun = treeNs / iterations;
		const jsNsPerRun = jsNs / iterations;

		console.info(
			`[BT benchmark] ${iterations.toLocaleString()} runs × ${samples} samples; ` +
				`Mistreevous=${treeNsPerRun.toFixed(0)} ns/run, ` +
				`native JS=${jsNsPerRun.toFixed(0)} ns/run, ` +
				`ratio=${(treeNsPerRun / jsNsPerRun).toFixed(1)}x`,
		);

		expect(agent.damageWrites).toBeGreaterThan(0);
		expect(Number.isFinite(treeNsPerRun / jsNsPerRun)).toBe(true);
	});
});
