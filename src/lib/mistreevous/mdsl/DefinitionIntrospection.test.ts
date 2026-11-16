import { describe, expect, it } from "vitest";
import { flattenDefinition } from "../BehaviourTreeDefinitionUtilities";
import { convertMDSLToJSON } from "./MDSLDefinitionParser";

describe("MDSL 定义节点信息", () => {
	it("解析节点类型，并从 action/condition 的 call 读取业务名称", () => {
		const [root] = convertMDSLToJSON(`
			root {
				sequence {
					condition [HasTarget]
					action [HitCheck]
					wait [250]
				}
			}
		`);

		const nodes = flattenDefinition(root);

		expect(nodes.map((node) => node.type)).toEqual(["root", "sequence", "condition", "action", "wait"]);
		expect(nodes.filter((node) => node.type === "condition").map((node) => node.call)).toEqual(["HasTarget"]);
		expect(nodes.filter((node) => node.type === "action").map((node) => node.call)).toEqual(["HitCheck"]);
	});
});
