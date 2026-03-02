import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createEffect, createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";
import { store } from "~/store";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
// import { Inspector } from "@babylonjs/inspector";
import { rendererCommunication } from "./RendererCommunication";
import { createRendererController } from "./RendererController";
import type { EntityId } from "./RendererProtocol";
import {
	createThirdPersonController,
	type ThirdPersonCameraController as TPSController,
} from "./ThirdPersonCameraController";

// ----------------------------------------预设内容-----------------------------------
// 主题色定义
const cssColors = {
	white: [255, 255, 255],
	geryWhite: [200, 200, 200],
	grey: [55, 55, 55],
	black: [0, 0, 0],
	brown: [47, 26, 73],
	navyBlue: [105, 145, 214],
	greenBlue: [149, 207, 213],
	yellow: [255, 166, 60],
	orange: [253, 126, 80],
	water: [0, 140, 229],
	fire: [233, 62, 38],
	earth: [255, 151, 54],
	wind: [0, 143, 84],
	light: [248, 193, 56],
	dark: [141, 56, 240],
};
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
	let thirdPersonController: TPSController;
	let rendererController: ReturnType<typeof createRendererController>;

	// ==================== 清理函数集合 ====================
	const cleanupFunctions: Array<() => void> = [];

	// ==================== 辅助函数：注册清理 ====================
	function registerCleanup(fn: () => void) {
		cleanupFunctions.push(fn);
	}

	// ==================== 场景效果设置 ====================
	function setupSceneEffects() {
		createEffect(() => {
			scene.ambientColor = themeColors().primary;
		});

		scene.fogMode = Scene.FOGMODE_EXP2;
		scene.fogDensity = 0.01;
		scene.fogStart = 16;
		scene.fogEnd = 22;

		createEffect(() => {
			scene.fogColor =
				store.settings.userInterface.theme === "light" ? new Color3(0.8, 0.8, 0.8) : new Color3(0.3, 0.3, 0.3);
		});

		const mainSpotLight = new SpotLight(
			"mainSpotLight",
			new Vector3(0, 8, 0),
			new Vector3(0, -1, 0),
			Math.PI,
			2,
			scene,
		);
		mainSpotLight.id = "mainSpotLight";
		mainSpotLight.radius = 10;

		createEffect(() => {
			mainSpotLight.intensity = store.settings.userInterface.theme === "light" ? 200 : 100;
		});

		const shadowGenerator = new ShadowGenerator(1024, mainSpotLight);
		shadowGenerator.bias = 0.000001;
		shadowGenerator.darkness = 0.1;
		shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

		const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
		const skyboxMaterial = new StandardMaterial("skyBox", scene);
		skyboxMaterial.backFaceCulling = false;
		skybox.material = skyboxMaterial;
	}

	// ==================== 渲染通信设置 ====================
	function setupRenderCommunication() {
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

		// 3. 设置场景效果（雾、光照等）
		setupSceneEffects();

		// 4. 初始化渲染控制器
		rendererController = createRendererController(scene);

		// 5. 加载模型
		await AppendSceneAsync("/models/landscape.glb", scene);

		// 6. 初始化渲染通信
		setupRenderCommunication();

		// 7. 创建相机和控制器
		const thirdPersonSetup = createThirdPersonController(scene, canvas, rendererController, props.followEntityId, {
			distance: 8,
			smoothTransition: true,
		});
		camera = thirdPersonSetup.camera;
		thirdPersonController = thirdPersonSetup.controller;

		// 8. 设置相机属性
		camera.minZ = 0.1;
		camera.fov = 1;

		// 9. 启动渲染循环
		scene.executeWhenReady(() => {
			engine.runRenderLoop(() => {
				const dt = engine.getDeltaTime() / 1000;
				rendererController.tick(dt);
				thirdPersonController.update(dt);
				scene.render();
			});
			setLoaderState(true);
		});

		// 10. 窗口调整
		setupResizeHandling();

		// 11. 相机控制事件
		setupCameraControlEvents();

		// 12. 启动检查器
		// Inspector.Show(scene, { embedMode: true });
		// registerCleanup(() => {
		// 	Inspector.Hide();
		// });
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
