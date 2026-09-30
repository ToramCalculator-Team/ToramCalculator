import { afterEach, describe, expect, it } from "vitest";
import { BehaviourTree, State } from "../index";
import { Examples } from "./Examples";

const registeredSubtreeNames = new Set<string>();

function createExampleAgent(exampleName: string): Record<string, unknown> {
	const calls: Record<string, number> = {};
	const statefulAgent: Record<string, unknown> = {
		get waitMs() {
			return 2000;
		},
		get minWaitMs() {
			return 1000;
		},
		get maxWaitMs() {
			return 5000;
		},
		get target() {
			return { name: "Enemy", xPosition: 100, yPosition: 100 };
		},
	};

	const actionNames = new Set<string>();
	const conditionNames = new Set<string>();
	const actionMatches = exampleName.matchAll(/action\s*(?:\[[^\]]*?\s*,\s*)?\[?([A-Za-z][A-Za-z0-9_]*)/g);
	for (const match of actionMatches) actionNames.add(match[1]);
	const conditionMatches = exampleName.matchAll(/condition\s*\[\s*([A-Za-z][A-Za-z0-9_]*)/g);
	for (const match of conditionMatches) conditionNames.add(match[1]);
	const callbackNames = exampleName.matchAll(/(?:entry|exit|step)\s*\(\s*([A-Za-z][A-Za-z0-9_]*)/g);
	for (const match of callbackNames) actionNames.add(match[1]);

	const method = (name: string) => {
		calls[name] = 0;
		return (..._args: unknown[]) => {
			calls[name] += 1;
			return State.SUCCEEDED;
		};
	};
	for (const name of actionNames) statefulAgent[name] = method(name);
	for (const name of conditionNames) statefulAgent[name] = () => true;

	statefulAgent.IndefiniteAction = () => State.RUNNING;
	statefulAgent.SomeAsyncAction = () => new Promise<State>(() => undefined);
	statefulAgent.GetName = () => "Example";
	statefulAgent.HasTarget = () => true;
	statefulAgent.IsHungry = () => true;
	statefulAgent.HasDollars = () => true;
	statefulAgent.HasIngredient = () => true;
	statefulAgent.IsKeyDown = () => false;
	statefulAgent.IsSimulationRunning = () => false;
	statefulAgent.CanSee = () => true;
	statefulAgent.CanDance = () => true;
	statefulAgent.HasItem = () => true;
	statefulAgent.getBooleanValue = () => true;
	statefulAgent.getNumberValue = () => 100;
	statefulAgent.MoveTowards = () => State.SUCCEEDED;
	statefulAgent.CanSee = () => true;
	statefulAgent.Dance = () => State.SUCCEEDED;
	statefulAgent.CookFood = () => State.SUCCEEDED;
	statefulAgent.OrderFood = () => State.SUCCEEDED;
	statefulAgent.Starve = () => State.SUCCEEDED;
	statefulAgent.Say = () => State.SUCCEEDED;
	statefulAgent.Succeed = () => State.SUCCEEDED;
	statefulAgent.Fail = () => State.FAILED;
	statefulAgent.Relax = () => State.SUCCEEDED;
	statefulAgent.Jump = () => State.SUCCEEDED;
	statefulAgent.IndefiniteAction = () => State.RUNNING;
	return statefulAgent;
}

function countNodes(value: { children?: Array<{ children?: unknown[] }>; state: State }): number {
	return 1 + (value.children ?? []).reduce((sum, child) => sum + countNodes(child as typeof value), 0);
}

afterEach(() => {
	for (const name of registeredSubtreeNames) BehaviourTree.unregister(name);
	registeredSubtreeNames.clear();
});

describe("mistreevous MDSL examples checkpoint compatibility", () => {
	for (const example of Examples) {
		it(`${example.name}: can capture and restore after one step`, () => {
			const agent = createExampleAgent(example.definition);
			if (example.name === "global-subtrees") {
				BehaviourTree.register("Celebrate", 'root { sequence { action [Jump] action [Say, "We did it!"] } }');
				registeredSubtreeNames.add("Celebrate");
			}
			if (example.name === "global-functions") {
				BehaviourTree.register("Say", () => State.SUCCEEDED);
				BehaviourTree.register("IsSimulationRunning", () => false);
				registeredSubtreeNames.add("Say");
				registeredSubtreeNames.add("IsSimulationRunning");
			}

			const tree = new BehaviourTree(example.definition, agent);
			const before = tree.getTreeNodeDetails();
			expect(countNodes(before)).toBeGreaterThan(0);
			tree.step();
			if (example.name === "async-action") {
				expect(() => tree.captureCheckpoint()).toThrow(/waiting for a Promise/);
				return;
			}

			const checkpoint = tree.captureCheckpoint();
			const restored = new BehaviourTree(example.definition, createExampleAgent(example.definition));
			restored.restoreCheckpoint(checkpoint);
			expect(restored.getTreeNodeDetails().state).toBe(tree.getTreeNodeDetails().state);
		});
	}
});
