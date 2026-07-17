/**
 * 体积雾材质插件。
 *
 * 从 SceneRuntimeCore 抽出的纯 Babylon 材质资产：在片元着色器里对相机→片元的视线做球体雾积分。
 * 与"场景运行时"无关，是可独立复用的渲染资产。Core 只负责注册并同步主题色。
 */

import type { MaterialDefines, Mesh, Nullable } from "~/lib/babylon/runtime";
import {
	Color3,
	type Engine,
	type Material,
	MaterialPluginBase,
	PBRBaseMaterial,
	type PBRMaterial,
	RegisterMaterialPlugin,
	type Scene,
	type SubMesh,
	Vector3,
} from "~/lib/babylon/runtime";

let volumetricFogPluginRegistered = false;

export class VolumetricFogPluginMaterial extends MaterialPluginBase {
	center = new Vector3(0, 0, 0);
	radius = 3;
	color = new Color3(1, 1, 1);
	density = 4.5;
	private readonly varColorName: string;
	private enabledState = false;

	constructor(material: Material) {
		super(material, "VolumetricFog", 500, { VOLUMETRIC_FOG: false });
		this.varColorName = material instanceof PBRBaseMaterial ? "finalColor" : "color";
	}

	get isEnabled() {
		return this.enabledState;
	}

	set isEnabled(enabled) {
		if (this.enabledState === enabled) return;
		this.enabledState = enabled;
		this.markAllDefinesAsDirty();
		this._enable(this.enabledState);
	}

	prepareDefines(defines: MaterialDefines, _scene: Scene, _mesh: Mesh) {
		defines.VOLUMETRIC_FOG = this.enabledState;
	}

	getUniforms() {
		return {
			ubo: [
				{ name: "volFogCenter", size: 3, type: "vec3" },
				{ name: "volFogRadius", size: 1, type: "float" },
				{ name: "volFogColor", size: 3, type: "vec3" },
				{ name: "volFogDensity", size: 1, type: "float" },
			],
			fragment: `#ifdef VOLUMETRIC_FOG
                uniform vec3 volFogCenter;
                uniform float volFogRadius;
                uniform vec3 volFogColor;
                uniform float volFogDensity;
                #endif`,
		};
	}

	bindForSubMesh(
		uniformBuffer: {
			updateVector3: (arg0: string, arg1: Vector3) => void;
			updateFloat: (arg0: string, arg1: number) => void;
			updateColor3: (arg0: string, arg1: Color3) => void;
		},
		_scene: Scene,
		_engine: Engine,
		_subMesh: SubMesh,
	) {
		if (this.enabledState) {
			uniformBuffer.updateVector3("volFogCenter", this.center);
			uniformBuffer.updateFloat("volFogRadius", this.radius);
			uniformBuffer.updateColor3("volFogColor", this.color);
			uniformBuffer.updateFloat("volFogDensity", this.density);
		}
	}

	getClassName() {
		return "VolumetricFogPluginMaterial";
	}

	getCustomCode(shaderType: string): Nullable<{ [pointName: string]: string }> {
		return shaderType === "vertex"
			? null
			: {
					CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
            #ifdef VOLUMETRIC_FOG
              float volFogRadius2 = volFogRadius * volFogRadius;
              float distCamToPos = distance(vPositionW.xyz, vEyePosition.xyz);
              vec3 dir = normalize(vPositionW.xyz - vEyePosition.xyz);
              vec3 L = volFogCenter - vEyePosition.xyz;
              float tca = dot(L, dir);
              float d2 = dot(L, L) - tca * tca;
              if (d2 < volFogRadius2) {
                float thc = sqrt(volFogRadius2 - d2);
                float t0 = tca - thc;
                float t1 = tca + thc;
                float dist = 0.0;
                if (t0 < 0.0 && t1 > 0.0) {
                  dist = min(distCamToPos, t1);
                } else if (t0 > 0.0 && t1 > 0.0 && t0 < distCamToPos) {
                  dist = min(t1, distCamToPos) - t0;
                }
                float distToCenter = length(cross(volFogCenter - vEyePosition.xyz, dir));
                float fr = distToCenter < volFogRadius ? smoothstep(0.0, 1.0, cos(distToCenter/volFogRadius*3.141592/2.0)) : 0.0;
                float e = dist/(volFogRadius*2.0);
                e = 1.0 - exp(-e * volFogDensity);
                ${this.varColorName} = mix(${this.varColorName}, vec4(volFogColor, ${this.varColorName}.a), clamp(e*fr, 0.0, 1.0));
              }
            #endif
          `,
				};
	}
}

export function isPBRMaterial(mat: Nullable<Material>): mat is PBRMaterial {
	return mat !== null && mat.getClassName() === "PBRMaterial";
}

export function registerVolumetricFogPlugin() {
	if (volumetricFogPluginRegistered) return;
	RegisterMaterialPlugin("VolumetricFog", (material) => new VolumetricFogPluginMaterial(material));
	volumetricFogPluginRegistered = true;
}
