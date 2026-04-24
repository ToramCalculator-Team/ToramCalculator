// import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
// import "@babylonjs/inspector"; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
// import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Engine } from "@babylonjs/core/Engines/engine";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { Color3 } from "@babylonjs/core/Maths/math";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import type { CharacterWithRelations } from "@db/generated/repositories/character";
import { createEffect, createMemo, createSignal, type JSX, on, onCleanup, onMount } from "solid-js";
// import { LoadingBar } from "~/components/controls/loadingBar";
import {
	BuiltinAnimationType,
	type CharacterEntityRuntime,
	EntityFactory,
} from "~/lib/engine/render/RendererController";
import { store } from "~/store";
import { resolveColorSystem } from "~/styles/colorSystem/colorSystemController";

type CharacterViewProps = {
	character: CharacterWithRelations;
};

export function CharacterView(props: CharacterViewProps): JSX.Element {
	// 主题色计算
	const colorSystem = createMemo(() =>
		resolveColorSystem(store.settings.userInterface.theme, store.settings.userInterface.themeVersion),
	);
	// 颜色系统输出的是中立投影，这里只做 Babylon Color3 运行时适配
	const themePrimaryColor = createMemo(() => new Color3(...colorSystem().colors.semantic.primary.rgb01));
	// 场景渲染状态代替图片加载状态
	const [loaderState, setLoaderState] = createSignal(false);

	const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
	let engine: AbstractEngine;
	let scene: Scene;
	let camera: ArcRotateCamera;

	const createBabylonScene = (canvas: HTMLCanvasElement): Scene => {
		engine = new Engine(canvas, true);
		engine.loadingScreen = {
			displayLoadingUI: (): void => {
				// logger.info('display')
			},
			hideLoadingUI: (): void => {
				// logger.info('hidden')
			},
			loadingUIBackgroundColor: "#000000",
			loadingUIText: "Loading...",
		};
		scene = new Scene(engine);
		scene.autoClear = false;
		// 雾
		scene.fogMode = Scene.FOGMODE_EXP2;
		scene.fogDensity = 0.01;
		scene.fogStart = 16;
		scene.fogEnd = 22;
		scene.fogColor = new Color3(0.8, 0.8, 0.8);

		// 摄像机
		camera = new ArcRotateCamera("Camera", 1.55, 1.2, 7, new Vector3(0, 1, 0), scene);
		camera.minZ = 0.1;
		camera.fov = 1;

		// -----------------------------------光照设置------------------------------------
		// 设置顶部锥形光
		const mainSpotLight = new SpotLight(
			"mainSpotLight",
			new Vector3(0, 18, 8),
			new Vector3(0, -1, 0),
			Math.PI,
			5,
			scene,
		);
		mainSpotLight.id = "mainSpotLight";
		mainSpotLight.radius = 10;
		mainSpotLight.intensity = 1500;

		// 顶部锥形光的阴影发生器---------------------
		const mainSpotLightShadowGenerator = new ShadowGenerator(1024, mainSpotLight);
		mainSpotLightShadowGenerator.bias = 0.000001;
		mainSpotLightShadowGenerator.darkness = 0.1;
		mainSpotLightShadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

		// 设置正面锥形光
		const frontSpotLight = new SpotLight(
			"frontSpotLight",
			new Vector3(0, -1, 10),
			new Vector3(0, 1, 0),
			Math.PI,
			5,
			scene,
		);
		frontSpotLight.id = "frontSpotLight";
		frontSpotLight.radius = 10;
		frontSpotLight.intensity = 1500;

		// -----------------------------------------角色模型--------------------------------------------

		// 开始渲染循环
		engine.runRenderLoop(() => {
			scene.render();
		});

		const onWinResize = () => engine.resize();
		window.addEventListener("resize", onWinResize);
		return scene;
	};

	// new Engine会重设canvas尺寸，这会导致布局重绘，然后引起视觉抖动。这里通过延迟渲染解决
	createEffect(
		on(
			() => canvas(),
			(c) => {
				if (c)
					setTimeout(async () => {
						const scene = createBabylonScene(c);
						const factory = new EntityFactory(scene);
						let characterEntity: CharacterEntityRuntime | null = null;
						// 创建角色实体
						characterEntity = await factory.createCharacter(
							props.character.id ?? "unknown",
							props.character.name ?? "未命名角色",
							new Vector3(0, 0, 4),
						);

						// idle 动画已经在 createCharacter 中自动播放
						// 如果需要切换到其他动画，可以使用：
						characterEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.WALK);
					}, 10);
			},
		),
	);

	// 测试模式配置函数
	// function testModelOpen() {
	// 	// 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
	// 	void scene.debugLayer.show({
	// 		// embedMode: true
	// 	});
	// 	// 世界坐标轴显示
	// 	new AxesViewer(scene, 0.1);
	// }

	onCleanup(() => {
		scene?.dispose();
		engine?.dispose();
		console.log("内存已清理");
	});

	return (
		<div class="CharacterView relative hidden w-full flex-1 h-48 flex-none overflow-hidden portrait:block">
			<canvas ref={setCanvas} class="border-dividing-color block h-full w-full rounded-md border">
				当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
			</canvas>
		</div>
	);
}
