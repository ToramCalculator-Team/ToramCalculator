/**
 * Babylon runtime boundary.
 *
 * 目的：所有应用级 3D 入口都从这里取得 Babylon 类型和值，并在同一处完成全局副作用注册。
 * 原理：Vite dev 的依赖优化按入口发现依赖；把 shader、loader、scene component 固定到一个入口后，
 * 懒加载页面不会在运行时继续追加 Babylon 深层依赖，减少 Outdated Optimize Dep。
 */
import "./registerBuiltinShaders";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
// NodeMaterial snippet 反序列化依赖 RegisterClass 注册表；显式加载 #LLUXAC 使用的节点块，保证序列化类名能恢复为运行时节点。
import "@babylonjs/core/Materials/Node/Blocks/Dual/textureBlock";
import "@babylonjs/core/Materials/Node/Blocks/addBlock";
import "@babylonjs/core/Materials/Node/Blocks/gradientBlock";
import "@babylonjs/core/Materials/Node/Blocks/remapBlock";
import "@babylonjs/core/Materials/Node/Blocks/scaleBlock";
import "@babylonjs/core/Materials/Node/Blocks/vectorMergerBlock";
import "@babylonjs/core/Materials/Node/Blocks/vectorSplitterBlock";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";

export { Animation } from "@babylonjs/core/Animations/animation";
export { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
export type { IAnimationKey } from "@babylonjs/core/Animations/animationKey";
export { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
export { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
export type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
export { Engine } from "@babylonjs/core/Engines/engine";
export { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
export { SpotLight } from "@babylonjs/core/Lights/spotLight";
export { AppendSceneAsync, ImportMeshAsync, SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
export { Material } from "@babylonjs/core/Materials/material";
export type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
export { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
export { RegisterMaterialPlugin } from "@babylonjs/core/Materials/materialPluginManager";
export { NodeMaterial } from "@babylonjs/core/Materials/Node/nodeMaterial";
export { PBRBaseMaterial } from "@babylonjs/core/Materials/PBR/pbrBaseMaterial";
export type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
export { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
export { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
export { Color3, Color4, Matrix } from "@babylonjs/core/Maths/math";
export { Scalar } from "@babylonjs/core/Maths/math.scalar";
export { Vector3 } from "@babylonjs/core/Maths/math.vector";
export type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
export type { Mesh as MeshType } from "@babylonjs/core/Meshes/mesh";
export { Mesh } from "@babylonjs/core/Meshes/mesh";
export { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
export type { SubMesh } from "@babylonjs/core/Meshes/subMesh";
export { TransformNode } from "@babylonjs/core/Meshes/transformNode";
export { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
export { LensRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/lensRenderingPipeline";
export { Scene } from "@babylonjs/core/scene";
export type { Nullable } from "@babylonjs/core/types";
