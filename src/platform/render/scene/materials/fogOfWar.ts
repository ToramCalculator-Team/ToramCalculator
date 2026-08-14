/**
 * 径向战争迷雾材质插件。
 *
 * 设计来自 BabylonBg 的 FogOfWarPluginMaterial：按片元世界坐标到揭示中心的距离控制可见度。
 * 原实现的有效区间是 8m 到 18m；这里保持 8m 完全可见范围，将完全遮蔽半径扩到 28m，
 * 并使用 smoothstep 混合主题雾色，避免近处颜色被放大、远处产生负值或过渡过陡。
 */

import type { MaterialDefines, Mesh, Nullable } from "~/platform/render/babylon/runtime";
import {
	Color3,
	type Engine,
	type Material,
	MaterialPluginBase,
	PBRBaseMaterial,
	RegisterMaterialPlugin,
	type Scene,
	StandardMaterial,
	type SubMesh,
	Vector3,
} from "~/platform/render/babylon/runtime";

export const FOG_OF_WAR_INNER_RADIUS = 8;
export const FOG_OF_WAR_OUTER_RADIUS = 28;

const fogCenter = Vector3.Zero();
const fogColor = Color3.Black();

class FogOfWarPluginMaterial extends MaterialPluginBase {
	private readonly colorVariable: "color" | "finalColor";

	constructor(material: Material) {
		// 插件随材质创建立即启用；使用基类构造参数避免材质尚未完成构造时触发脏标记。
		super(material, "FogOfWar", 200, { FOG_OF_WAR: false }, true, true);
		this.colorVariable = material instanceof PBRBaseMaterial ? "finalColor" : "color";
	}

	prepareDefines(defines: MaterialDefines, _scene: Scene, _mesh: Mesh): void {
		defines.FOG_OF_WAR = true;
	}

	getUniforms() {
		return {
			ubo: [
				{ name: "fogOfWarCenter", size: 3, type: "vec3" },
				{ name: "fogOfWarColor", size: 3, type: "vec3" },
				{ name: "fogOfWarInnerRadius", size: 1, type: "float" },
				{ name: "fogOfWarOuterRadius", size: 1, type: "float" },
			],
			fragment: `#ifdef FOG_OF_WAR
uniform vec3 fogOfWarCenter;
uniform vec3 fogOfWarColor;
uniform float fogOfWarInnerRadius;
uniform float fogOfWarOuterRadius;
#endif`,
		};
	}

	bindForSubMesh(
		uniformBuffer: {
			updateVector3: (name: string, value: Vector3) => void;
			updateColor3: (name: string, value: Color3) => void;
			updateFloat: (name: string, value: number) => void;
		},
		_scene: Scene,
		_engine: Engine,
		_subMesh: SubMesh,
	): void {
		uniformBuffer.updateVector3("fogOfWarCenter", fogCenter);
		uniformBuffer.updateColor3("fogOfWarColor", fogColor);
		uniformBuffer.updateFloat("fogOfWarInnerRadius", FOG_OF_WAR_INNER_RADIUS);
		uniformBuffer.updateFloat("fogOfWarOuterRadius", FOG_OF_WAR_OUTER_RADIUS);
	}

	getClassName(): string {
		return "FogOfWarPluginMaterial";
	}

	getCustomCode(shaderType: string): Nullable<Record<string, string>> {
		if (shaderType === "vertex") {
			return {
				CUSTOM_VERTEX_DEFINITIONS: "varying vec3 vFogOfWarWorldPosition;",
				CUSTOM_VERTEX_MAIN_END: "vFogOfWarWorldPosition = worldPos.xyz;",
			};
		}
		if (shaderType !== "fragment") return null;
		return {
			CUSTOM_FRAGMENT_DEFINITIONS: "varying vec3 vFogOfWarWorldPosition;",
			CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
#ifdef FOG_OF_WAR
float fogOfWarDistance = distance(vFogOfWarWorldPosition.xz, fogOfWarCenter.xz);
float fogOfWarVisibility = 1.0 - smoothstep(fogOfWarInnerRadius, fogOfWarOuterRadius, fogOfWarDistance);
${this.colorVariable}.rgb = mix(fogOfWarColor, ${this.colorVariable}.rgb, fogOfWarVisibility);
#endif`,
		};
	}
}

/** 注册到之后创建的 Standard/PBR 材质；天空盒和自定义地形着色器分别自行处理。 */
export function registerFogOfWarMaterialPlugin(): void {
	RegisterMaterialPlugin("FogOfWar", (material) => {
		if (material.name === "world-skybox-material") return null;
		if (!(material instanceof StandardMaterial) && !(material instanceof PBRBaseMaterial)) return null;
		return new FogOfWarPluginMaterial(material);
	});
}

/** 更新所有战争迷雾材质共享的世界揭示中心。 */
export function setFogOfWarCenter(center: Vector3): void {
	fogCenter.copyFrom(center);
}

/** 更新所有战争迷雾材质共享的主题遮蔽色。 */
export function setFogOfWarColor(color: Color3): void {
	fogColor.copyFrom(color);
}
