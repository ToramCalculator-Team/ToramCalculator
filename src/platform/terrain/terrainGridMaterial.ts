import type { MaterialDefines, Mesh, Nullable } from "~/platform/render/babylon/runtime";
import {
	Color3,
	type Engine,
	type Material,
	MaterialPluginBase,
	type Scene,
	type SubMesh,
} from "~/platform/render/babylon/runtime";

/**
 * 把无限地形网格写入 StandardMaterial 的基础色，并保留其原生光照与阴影流程。
 * 网格使用世界坐标计算，区块独立生成时不会在边界处重新起算。
 */
export class TerrainGridMaterialPlugin extends MaterialPluginBase {
	mainColor = new Color3(0.23, 0.36, 0.19);
	lineColor = new Color3(0.08, 0.12, 0.08);
	gridRatio = 1;
	majorUnitFrequency = 8;
	minorUnitVisibility = 0.35;

	constructor(material: Material) {
		super(material, "TerrainGrid", 100, { TERRAIN_GRID: false }, true, true);
	}

	prepareDefines(defines: MaterialDefines, _scene: Scene, _mesh: Mesh): void {
		defines.TERRAIN_GRID = true;
	}

	getUniforms() {
		return {
			ubo: [
				{ name: "terrainMainColor", size: 3, type: "vec3" },
				{ name: "terrainLineColor", size: 3, type: "vec3" },
				{ name: "terrainGridRatio", size: 1, type: "float" },
				{ name: "terrainMajorUnitFrequency", size: 1, type: "float" },
				{ name: "terrainMinorUnitVisibility", size: 1, type: "float" },
			],
			fragment: `#ifdef TERRAIN_GRID
uniform vec3 terrainMainColor;
uniform vec3 terrainLineColor;
uniform float terrainGridRatio;
uniform float terrainMajorUnitFrequency;
uniform float terrainMinorUnitVisibility;
#endif`,
		};
	}

	bindForSubMesh(
		uniformBuffer: {
			updateColor3: (name: string, value: Color3) => void;
			updateFloat: (name: string, value: number) => void;
		},
		_scene: Scene,
		_engine: Engine,
		_subMesh: SubMesh,
	): void {
		uniformBuffer.updateColor3("terrainMainColor", this.mainColor);
		uniformBuffer.updateColor3("terrainLineColor", this.lineColor);
		uniformBuffer.updateFloat("terrainGridRatio", this.gridRatio);
		uniformBuffer.updateFloat("terrainMajorUnitFrequency", this.majorUnitFrequency);
		uniformBuffer.updateFloat("terrainMinorUnitVisibility", this.minorUnitVisibility);
	}

	getClassName(): string {
		return "TerrainGridMaterialPlugin";
	}

	getCustomCode(shaderType: string): Nullable<Record<string, string>> {
		if (shaderType !== "fragment") return null;
		return {
			CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef TERRAIN_GRID
float terrainGridLine(float coordinate, float ratio) {
	float gridCoordinate = coordinate / ratio;
	float distanceToLine = abs(fract(gridCoordinate - 0.5) - 0.5);
	float derivativeWidth = max(fwidth(gridCoordinate), 0.0001);
	return 1.0 - smoothstep(derivativeWidth * 0.5, derivativeWidth * 1.5, distanceToLine);
}
#endif`,
			CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
#ifdef TERRAIN_GRID
float terrainMinorGrid = max(
	terrainGridLine(vPositionW.x, terrainGridRatio),
	terrainGridLine(vPositionW.z, terrainGridRatio)
);
float terrainMajorRatio = terrainGridRatio * terrainMajorUnitFrequency;
float terrainMajorGrid = max(
	terrainGridLine(vPositionW.x, terrainMajorRatio),
	terrainGridLine(vPositionW.z, terrainMajorRatio)
);
float terrainGrid = clamp(
	max(terrainMajorGrid, terrainMinorGrid * terrainMinorUnitVisibility),
	0.0,
	1.0
);
baseColor.rgb = mix(terrainMainColor, terrainLineColor, terrainGrid);
#endif`,
		};
	}
}
