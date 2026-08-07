import assert from "node:assert/strict";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { test } from "vitest";
import { HighlightLayer, Scene } from "./runtime";

test("Babylon 运行时在创建 HighlightLayer 前注册 EffectLayerSceneComponent", () => {
	const engine = new NullEngine();
	const scene = new Scene(engine);

	assert.doesNotThrow(() => {
		const highlightLayer = new HighlightLayer("test-highlight", scene);
		highlightLayer.dispose();
	});

	scene.dispose();
	engine.dispose();
});
