import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { describe, expect, it } from "vitest";
import { Color3, Scene, Vector3 } from "~/platform/render/babylon/runtime";
import { createAmbientMotes } from "./ambientMotes";

describe("AmbientMotes", () => {
	it("使用单一合并网格固定在世界单元中并可完整释放", () => {
		const engine = new NullEngine();
		const scene = new Scene(engine);
		const motes = createAmbientMotes(scene);
		const mesh = scene.getMeshByName("world-ambient-motes");

		expect(mesh).not.toBeNull();
		expect(scene.meshes.filter((candidate) => candidate.name.startsWith("world-ambient-mote"))).toEqual([mesh]);
		motes.setTheme(new Color3(0.2, 0.5, 0.8), true);
		motes.update(0, new Vector3(1, 2, 1), () => 0);
		const initialPositions = Array.from(mesh?.getVerticesData("position") ?? []);
		motes.update(0, new Vector3(4, 9, 4), () => 0);
		expect(mesh?.position.asArray()).toEqual([0, 0, 0]);
		expect(Array.from(mesh?.getVerticesData("position") ?? [])).toEqual(initialPositions);

		motes.update(1 / 240, new Vector3(4, 9, 4), () => 0);
		expect(Array.from(mesh?.getVerticesData("position") ?? [])).toEqual(initialPositions);
		motes.update(1 / 240, new Vector3(4, 9, 4), () => 0);
		expect(Array.from(mesh?.getVerticesData("position") ?? [])).not.toEqual(initialPositions);

		motes.update(0, new Vector3(6, 2, 1), () => 0);
		expect(Array.from(mesh?.getVerticesData("position") ?? [])).not.toEqual(initialPositions);

		motes.dispose();
		expect(scene.getMeshByName("world-ambient-motes")).toBeNull();
		scene.dispose();
		engine.dispose();
	});
});
