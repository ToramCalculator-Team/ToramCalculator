import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { describe, expect, it, vi } from "vitest";
import type { AbstractMesh } from "~/platform/render/babylon/runtime";
import {
	DirectionalLight,
	MeshBuilder,
	Scene,
	ShadowGenerator,
	TransformNode,
	Vector3,
} from "~/platform/render/babylon/runtime";
import { EntityFactory } from "./EntityFactory";

describe("EntityFactory 成员模型发布", () => {
	it("只发布成员真实网格，不发布名称标签", () => {
		const engine = new NullEngine();
		const scene = new Scene(engine);
		const contentRoot = new TransformNode("content-root", scene);
		const light = new DirectionalLight("sun", new Vector3(0, -1, 0.5), scene);
		const shadowGenerator = new ShadowGenerator(256, light);
		const onMemberMeshCreated = vi.fn<(mesh: AbstractMesh) => void>((mesh) => {
			shadowGenerator.addShadowCaster(mesh, false);
		});
		const factory = new EntityFactory(scene, contentRoot, onMemberMeshCreated);
		const label = MeshBuilder.CreatePlane("label:mob-a", { size: 1 }, scene);
		vi.spyOn(factory, "createLabel").mockReturnValue(label);

		const entity = factory.createSphere("mob-a", "Mob A", Vector3.Zero(), { radius: 0.5, color: "#ff0000" });

		expect(onMemberMeshCreated).toHaveBeenCalledOnce();
		const memberMesh = onMemberMeshCreated.mock.calls[0]?.[0];
		expect(memberMesh?.name).toBe("sphere:mob-a");
		expect(shadowGenerator.getShadowMap()?.renderList).toHaveLength(1);
		expect(shadowGenerator.getShadowMap()?.renderList?.[0]).toBe(memberMesh);
		expect(entity.label).toBe(label);
		expect(onMemberMeshCreated).not.toHaveBeenCalledWith(entity.label);

		entity.mesh.dispose();
		contentRoot.dispose();
		shadowGenerator.dispose();
		scene.dispose();
		engine.dispose();
	});
});
