import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createEffect, createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";
import { createLogger } from "~/lib/Logger";
import { getCssColorRgb } from "~/lib/utils/color";
import { store } from "~/store";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { Material } from "@babylonjs/core/Materials/material";
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import { RegisterMaterialPlugin } from "@babylonjs/core/Materials/materialPluginManager";
import { PBRBaseMaterial } from "@babylonjs/core/Materials/PBR/pbrBaseMaterial";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh";
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
import { LensRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/lensRenderingPipeline";
import type { Nullable } from "@babylonjs/core/types";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import { rendererCommunication } from "./RendererCommunication";
import { createRendererController } from "./RendererController";
import type { EntityId } from "./RendererProtocol";
import {
	createThirdPersonController,
	type ThirdPersonCameraController,
} from "./ThirdPersonCameraController";

const log = createLogger("Renderer");

// ==================== 类型声明 ====================
declare module "@babylonjs/core" {
	interface Material {
		fogofwar?: FogOfWarPluginMaterial;
		volumetricFog?: VolumetricFogPluginMaterial;
	}
}

// ==================== 材质插件 ====================
/**
 * 战争迷雾材质插件
 * 实现了一个基于距离的迷雾效果
 */
class FogOfWarPluginMaterial extends MaterialPluginBase {
	static fogCenter = new Vector3(1, 1, 0);
	_isEnabled = false;

	constructor(material: Material) {
		super(material, "FogOfWar", 200, { FogOfWar: false });
		this.isEnabled = true;
	}

	get isEnabled() {
		return this._isEnabled;
	}

	set isEnabled(enabled) {
		if (this._isEnabled === enabled) return;
		this._isEnabled = enabled;
		this.markAllDefinesAsDirty();
		this._enable(this._isEnabled);
	}

	prepareDefines(defines: Record<string, boolean>, _scene: Scene, _mesh: Mesh) {
		defines.FogOfWar = this._isEnabled;
	}

	getClassName() {
		return "FogOfWarPluginMaterial";
	}

	getUniforms() {
		return {
			ubo: [{ name: "fogCenter", size: 3, type: "vec3" }],
			fragment: `#ifdef FogOfWar
                uniform vec3 fogCenter;
                #endif`,
		};
	}

	bindForSubMesh(
		uniformBuffer: { updateVector3: (arg0: string, arg1: Vector3) => void },
		_scene: Scene,
		_engine: Engine,
		_subMesh: SubMesh,
	) {
		if (this._isEnabled) {
			uniformBuffer.updateVector3("fogCenter", FogOfWarPluginMaterial.fogCenter);
		}
	}

	getCustomCode = (shaderType: string): Nullable<{ [pointName: string]: string }> => {
		if (shaderType === "vertex") {
			return {
				CUSTOM_VERTEX_DEFINITIONS: `varying vec3 vWorldPos;`,
				CUSTOM_VERTEX_MAIN_END: `vWorldPos = worldPos.xyz;`,
			};
		}
		if (shaderType === "fragment") {
			return {
				CUSTOM_FRAGMENT_MAIN_END: `
          float d = length(vWorldPos.xyz - fogCenter);
          d = (18.0 - d)/10.0;
          gl_FragColor.rgb *= vec3(d);
        `,
				CUSTOM_FRAGMENT_DEFINITIONS: `varying vec3 vWorldPos;`,
			};
		}
		return null;
	};
}

/**
 * 体积雾材质插件
 * 实现了一个基于球体的体积雾效果
 */
class VolumetricFogPluginMaterial extends MaterialPluginBase {
	center = new Vector3(0, 0, 0);
	radius = 3;
	color = new Color3(1, 1, 1);
	density = 4.5;
	_varColorName: string;
	_isEnabled = false;

	constructor(material: Material) {
		super(material, "VolumetricFog", 500, { VOLUMETRIC_FOG: false });
		this._varColorName = material instanceof PBRBaseMaterial ? "finalColor" : "color";
	}

	get isEnabled() {
		return this._isEnabled;
	}

	set isEnabled(enabled) {
		if (this._isEnabled === enabled) return;
		this._isEnabled = enabled;
		this.markAllDefinesAsDirty();
		this._enable(this._isEnabled);
	}

	prepareDefines(defines: MaterialDefines, _scene: Scene, _mesh: Mesh) {
		defines.VOLUMETRIC_FOG = this._isEnabled;
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
		if (this._isEnabled) {
			uniformBuffer.updateVector3("volFogCenter", this.center);
			uniformBuffer.updateFloat("volFogRadius", this.radius);
			uniformBuffer.updateColor3("volFogColor", this.color);
			uniformBuffer.updateFloat("volFogDensity", this.density);
		}
	}

	getClassName() {
		return "VolumetricFogPluginMaterial";
	}

	getCustomCode(shaderType: string) {
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
                ${this._varColorName} = mix(${this._varColorName}, vec4(volFogColor, ${this._varColorName}.a), clamp(e*fr, 0.0, 1.0));
              }
            #endif
          `,
				};
	}
}

// ==================== 工具函数 ====================
/**
 * 判断材质是否为PBRMaterial
 */
function isPBRMaterial(mat: Nullable<Material>): mat is PBRMaterial {
	return mat !== null && mat.getClassName() === "PBRMaterial";
}

// ==================== CSS 颜色定义 ====================
const cssColors = {
	white: getCssColorRgb("--white"),
	grey: getCssColorRgb("--grey"),
	black: getCssColorRgb("--black"),
	brown: getCssColorRgb("--brown"),
	navyBlue: getCssColorRgb("--navyBlue"),
	greenBlue: getCssColorRgb("--greenBlue"),
	yellow: getCssColorRgb("--yellow"),
	orange: getCssColorRgb("--orange"),
	water: getCssColorRgb("--water"),
	fire: getCssColorRgb("--fire"),
	earth: getCssColorRgb("--earth"),
	wind: getCssColorRgb("--wind"),
	light: getCssColorRgb("--light"),
	dark: getCssColorRgb("--dark"),
};
// ==================== 颜色归一化 ====================
const rgb2Bcolor3 = (c: number[]) => new Color3(c[0] / 255, c[1] / 255, c[2] / 255);

export function GameView(props: { followEntityId?: EntityId }): JSX.Element {
	// ==================== 响应式状态 ====================
	const [loaderState, setLoaderState] = createSignal(false);

	const themeColors = createMemo(
		() =>
			({
				light: {
					accent: rgb2Bcolor3(cssColors.brown),
					primary: rgb2Bcolor3(cssColors.white),
					transition: rgb2Bcolor3(cssColors.navyBlue),
					brand_1st: rgb2Bcolor3(cssColors.greenBlue),
					brand_2nd: rgb2Bcolor3(cssColors.yellow),
					brand_3rd: rgb2Bcolor3(cssColors.orange),
				},
				dark: {
					accent: rgb2Bcolor3(cssColors.white),
					primary: rgb2Bcolor3(cssColors.grey),
					transition: rgb2Bcolor3(cssColors.navyBlue),
					brand_1st: rgb2Bcolor3(cssColors.greenBlue),
					brand_2nd: rgb2Bcolor3(cssColors.yellow),
					brand_3rd: rgb2Bcolor3(cssColors.orange),
				},
			})[store.settings.userInterface.theme],
	);

	// ==================== DOM 引用 ====================
	const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | undefined>(undefined);
	const [containerRef, setContainerRef] = createSignal<HTMLDivElement | undefined>(undefined);

	// ==================== Babylon.js 资源 ====================
	let engine: AbstractEngine;
	let scene: Scene;
	let camera: ArcRotateCamera;
	let thirdPersonController: ThirdPersonCameraController;
	let rendererController: ReturnType<typeof createRendererController>;
	let defPBR: PBRMaterial | undefined;

	// ==================== 清理函数集合 ====================
	const cleanupFunctions: Array<() => void> = [];

	// ==================== 辅助函数：注册清理 ====================
	function registerCleanup(fn: () => void) {
		cleanupFunctions.push(fn);
	}

	// ==================== 渲染通信设置 ====================
	function setupRenderCommunication() {
		log.info("设置渲染通信");
		rendererCommunication.setRenderHandler((payload: any) => {
			try {
				if (!payload) return;
				if (Array.isArray(payload)) {
					rendererController.send(payload as any);
					return;
				}
				if (payload.type === "render:cmd" && payload.cmd) {
					rendererController.send(payload.cmd);
				} else if (payload.type === "render:cmds" && Array.isArray(payload.cmds)) {
					rendererController.send(payload.cmds);
				} else {
					rendererController.send(payload as any);
				}
			} catch (e) {
				console.error("RendererCommunication: 处理渲染指令失败", e);
			}
		});
		rendererCommunication.initialize();
	}

	// ==================== 窗口调整设置 ====================
	function setupResizeHandling() {
		const onWinResize = () => engine.resize();
		window.addEventListener("resize", onWinResize);
		registerCleanup(() => {
			window.removeEventListener("resize", onWinResize);
		});

		const container = containerRef();
		const canvas = canvasRef();
		if (!container || !canvas) return;

		const ro = new ResizeObserver(() => {
			if (!container) return;
			const rect = container.getBoundingClientRect();
			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${rect.height}px`;
			engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
			engine.setSize(rect.width, rect.height, true);
			engine.resize();
		});

		ro.observe(container);
		registerCleanup(() => {
			ro.disconnect();
		});

		// 初始调整
		queueMicrotask(() => {
			const rect = container.getBoundingClientRect();
			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${rect.height}px`;
			engine.setSize(rect.width, rect.height, true);
			engine.resize();
		});
	}

	// ==================== 相机控制事件设置 ====================
	function setupCameraControlEvents() {
		const handleCameraControl = (event: CustomEvent) => {
			if (thirdPersonController && event.detail) {
				const command = event.detail.cmd || event.detail;
				if (command && command.type === "camera_control") {
					thirdPersonController.handleCameraCommand(command);
				} else {
					console.warn("📹 相机控制事件格式不正确:", event.detail);
				}
			}
		};

		window.addEventListener("cameraControl", handleCameraControl as EventListener);
		registerCleanup(() => {
			window.removeEventListener("cameraControl", handleCameraControl as EventListener);
		});
	}

	// ==================== 主初始化 ====================
	onMount(async () => {
		log.info("开始初始化渲染器");
		const canvas = canvasRef();
		if (!canvas) return;

		// 1. 创建引擎（依赖 canvas）
		engine = new Engine(canvas, true);
		engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
		engine.loadingScreen = {
			displayLoadingUI: () => {},
			hideLoadingUI: () => {},
			loadingUIBackgroundColor: "#000000",
			loadingUIText: "Loading...",
		};

		// 2. 创建场景
		scene = new Scene(engine);
		scene.clearColor = new Color4(1, 1, 1, 1);
		createEffect(() => {
			scene.ambientColor = themeColors().primary;
		});

		// 3. 初始化渲染控制器
		rendererController = createRendererController(scene);

		// 4. 加载模型
		await AppendSceneAsync("/models/bg.glb", scene);

		//5. 场景内容添加
		const defaultMat = scene.getMaterialByName("__GLTFLoader._default");
		if (defaultMat) {
			defaultMat.backFaceCulling = false;
		}
		if (isPBRMaterial(defaultMat)) {
			defPBR = defaultMat;
			defPBR.albedoColor = themeColors().primary;
			defPBR.ambientColor = new Color3(0.008, 0.01, 0.01);
		}

		// 设置体积雾
		const mat: VolumetricFogPluginMaterial | undefined | null = defPBR?.pluginManager?.getPlugin("VolumetricFog");
		if (mat) {
			mat.center = new Vector3(0, 0, -6);
			mat.isEnabled = true;
			mat.color = themeColors().primary;
			mat.radius = 8;
			mat.density = 0.5;
		}

		// 注册材质插件
		RegisterMaterialPlugin("VolumetricFog", (material) => {
			material.volumetricFog = new VolumetricFogPluginMaterial(material);
			return material.volumetricFog;
		});

		// scene.fogMode = Scene.FOGMODE_EXP2;
		// scene.fogDensity = 0.01;
		// scene.fogStart = 16;
		// scene.fogEnd = 22;

		// createEffect(() => {
		// 	scene.fogColor =
		// 		store.settings.userInterface.theme === "light" ? new Color3(0.8, 0.8, 0.8) : new Color3(0.3, 0.3, 0.3);
		// });

		// 初始化光照
		const mainSpotLight = new SpotLight(
			"mainSpotLight",
			new Vector3(0, 20, 0),
			new Vector3(0, -1, 0),
			Math.PI / 3,
			2,
			scene,
		);
		mainSpotLight.id = "mainSpotLight";
		mainSpotLight.intensity = 300;
		mainSpotLight.radius = 10;

		const stageSpotLight = new SpotLight(
			"stageSpotLight",
			new Vector3(0, 5, 2),
			new Vector3(0, -1, -0.5),
			Math.PI / 2,
			2,
			scene,
		);
		stageSpotLight.id = "stageSpotLight";
		stageSpotLight.intensity = 20;
		stageSpotLight.radius = 10;

		createEffect(() => {
			mainSpotLight.intensity = store.settings.userInterface.theme === "light" ? 200 : 100;
		});

		// 初始化阴影
		const shadowGenerator = new ShadowGenerator(1024, mainSpotLight);
		shadowGenerator.bias = 0.000001;
		shadowGenerator.darkness = 0.5;
		shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

		// const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
		// const skyboxMaterial = new StandardMaterial("skyBox", scene);
		// skyboxMaterial.backFaceCulling = false;
		// skybox.material = skyboxMaterial;

		// 6. 初始化渲染通信
		setupRenderCommunication();

		// 7. 拉取当前世界渲染快照并应用（渲染层晚于引擎就绪，需首次全量同步），然后回放缓冲的渲染指令
		const renderSnapshot = await realtimeSimulatorPool.getRenderSnapshot(true);
		if (renderSnapshot && rendererController.applyRenderSnapshot) {
			await rendererController.applyRenderSnapshot(renderSnapshot);
		}
		rendererCommunication.markRenderSnapshotApplied();

		// 7. 创建相机和控制器
		const thirdPersonSetup = createThirdPersonController(scene, canvas, rendererController, props.followEntityId, {
			distance: 8,
			smoothTransition: true,
		});
		camera = thirdPersonSetup.camera;
		thirdPersonController = thirdPersonSetup.controller;

		// 8. 初始化后处理效果（需在相机创建后，LensRenderingPipeline 需要 camera 启用 depth renderer）
		new LensRenderingPipeline(
			"lens",
			{
				edge_blur: 1.0,
				chromatic_aberration: 1.0,
				distortion: 0.2,
				dof_focus_distance: 50,
				dof_aperture: 0.05,
				grain_amount: 1.0,
				dof_pentagon: true,
				dof_gain: 1.0,
				dof_threshold: 1.0,
				dof_darken: 0.125,
			},
			scene,
			1.0,
			[camera],
		);

		// 9. 设置相机属性
		camera.minZ = 0.1;
		camera.fov = 1;
		camera.wheelDeltaPercentage = 0.05;

		// 10. 初始化粒子系统
		const spsPositionL = { x: -7, y: 0, z: -6 };
		const spsPositionR = { x: 7, y: 0, z: -6 };
		const spsSizeXZ = 2;
		const spsSizeY = 10;
		const spsNumber = 1000;

		const SPS = new SolidParticleSystem("SPS", scene);
		const particle = MeshBuilder.CreateBox("particle", {});
		SPS.addShape(particle, spsNumber);
		particle.dispose();
		const spsMesh = SPS.buildMesh();
		
		spsMesh.receiveShadows = true;
		shadowGenerator.addShadowCaster(spsMesh, true);
		if (defPBR) {
			spsMesh.material = defPBR;
		}
		spsMesh.name = "spsMesh";
		spsMesh.rotation = new Vector3((Math.PI * -1) / 12, 0, 0);
		const particlePosY: number[] = [];

		SPS.initParticles = () => {
			for (let p = 0; p < SPS.nbParticles; p++) {
				const particle = SPS.particles[p];
				const currY = Scalar.RandomRange(0, spsPositionL.y + spsSizeY);
				particlePosY.push(currY);
				if (p % 2 === 0) {
					particle.position.x = Scalar.RandomRange(spsPositionL.x - spsSizeXZ, spsPositionL.x + spsSizeXZ);
					particle.position.z = Scalar.RandomRange(spsPositionL.z - spsSizeXZ, spsPositionL.z + spsSizeXZ);
				} else {
					particle.position.x = Scalar.RandomRange(spsPositionR.x - spsSizeXZ, spsPositionR.x + spsSizeXZ);
					particle.position.z = Scalar.RandomRange(spsPositionR.z - spsSizeXZ, spsPositionR.z + spsSizeXZ);
				}
				particle.position.y = currY;

				const scale = Scalar.RandomRange(0.15, 0.2);
				particle.scale.x = scale;
				particle.scale.y = scale;
				particle.scale.z = scale;

				particle.rotation.x = Scalar.RandomRange(0, Math.PI);
				particle.rotation.y = Scalar.RandomRange(0, Math.PI);
				particle.rotation.z = Scalar.RandomRange(0, Math.PI);
			}
		};

		SPS.initParticles();
		SPS.setParticles();
		SPS.updateParticle = (particle) => {
			if (particle.position.y >= spsSizeY) {
				particle.position.y = (-Math.random() * spsSizeY * 1) / 2;
			} else {
				particle.position.y += (0.04 * particlePosY[spsNumber - particle.idx] + 0.025) / engine.getFps();
				particle.rotation.y += (0.05 * particlePosY[particle.idx]) / engine.getFps();
			}
			return particle;
		};

		scene.registerAfterRender(() => {
			SPS.setParticles();
		});

		// 11. 启动渲染循环
		scene.executeWhenReady(() => {
			engine.runRenderLoop(() => {
				const dt = engine.getDeltaTime() / 1000;
				rendererController.tick(dt);
				thirdPersonController.update(dt);
				// 同步材质颜色
				if (defPBR) {
					const currentColor = themeColors().primary;
					if (!defPBR.albedoColor.equals(currentColor)) {
						defPBR.albedoColor = currentColor;
						defPBR.markAsDirty(Material.TextureDirtyFlag);
					}
				}
				scene.render();
			});
			setLoaderState(true);
		});

		// 12. 窗口调整
		setupResizeHandling();

		// 13. 相机控制事件
		setupCameraControlEvents();

		// 14. 启动检查器
		// const { ShowInspector } = await import("@babylonjs/inspector");
		// void ShowInspector(scene);
		// scene.debugLayer.show();
	});

	// ==================== 统一清理（只在组件顶层调用一次）====================
	onCleanup(() => {
		console.log("开始清理渲染器资源...");

		// 执行所有注册的清理函数
		cleanupFunctions.forEach((fn) => {
			try {
				fn();
			} catch (error) {
				console.error("清理函数执行失败:", error);
			}
		});

		// 清理渲染通信
		rendererCommunication?.dispose();

		// 清理第三人称控制器
		thirdPersonController?.dispose();

		// 清理 Babylon.js 资源
		scene?.dispose();
		engine?.dispose();

		console.log("渲染器资源已清理");
	});

	return (
		<div ref={setContainerRef} class="relative h-full w-full">
			<canvas ref={setCanvasRef} class="absolute inset-0 block bg-transparent">
				当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
			</canvas>
			<div
				class={`LoadingBG bg-primary-color pointer-events-none absolute inset-0 z-50 flex items-center justify-center transition-opacity ${
					!loaderState() ? "visible opacity-100" : "invisible opacity-0"
				}`}
			/>
		</div>
	);
}
