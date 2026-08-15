/**
 * SceneRuntime 的 Babylon 实现层。
 *
 * 职责：持有唯一 canvas、Babylon engine/scene、基础背景组和实时模拟 session。
 * 边界：业务层只能通过 SceneRuntime session 进入实时渲染，不能越过本文件直接改 scene。
 * 见 docs/decisions/0009-persistent-render-runtime.md
 *    docs/decisions/0021-aui-interface-state-machine.md（装备高亮与拾取作为 AUI 场景投影端口）
 */

import { createId } from "@paralleldrive/cuid2";
import { createEffect, createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";
import { type Actor, createActor } from "xstate";
import { createLogger } from "~/lib/logger";
import { DEFAULT_TERRAIN_DEFINITION, type TerrainDefinition } from "~/lib/terrain";
import type { AbstractEngine, ArcRotateCameraMouseWheelInput } from "~/platform/render/babylon/runtime";
import {
	ArcRotateCamera,
	Color3,
	Color4,
	DirectionalLight,
	Engine,
	HemisphericLight,
	HighlightLayer,
	LensRenderingPipeline,
	Matrix,
	Mesh,
	PointerEventTypes,
	Scene,
	ShadowGenerator,
	TransformNode,
	Vector3,
} from "~/platform/render/babylon/runtime";
import { DEFAULT_TERRAIN_RENDER_CONFIG, WorldTerrain } from "~/platform/terrain";
import { store } from "~/store";
import { resolveColorSystem } from "~/styles/colorSystem/colorSystemController";
import {
	animateCameraTo,
	CAMERA_EFFECTIVE_RADIUS_MIN,
	CAMERA_RADIUS_LIMITS,
	FOLLOW_POSE,
	OBSERVE_POSE,
} from "./camera/cameraTransition";
import type { AnyCameraControlCmd } from "./camera/commands";
import { ThirdPersonCameraController } from "./camera/thirdPersonController";
import { readCharacterEquipmentSlotMetadata } from "./content/characterEquipmentMetadata";
import { createCharacterContentDeps } from "./content/sceneContentDeps";
import type { CharacterWorldResource } from "./contracts/worldResource";
import { SceneInputController } from "./input/controller";
import { registerFogOfWarMaterialPlugin, setFogOfWarCenter, setFogOfWarColor } from "./materials/fogOfWar";
import { createRendererController } from "./RendererController";
import { createProceduralStarSkybox, type ProceduralSkybox } from "./resources/proceduralStarSkybox";
import type {
	CharacterContentSession,
	CharacterEquipmentPick,
	RealtimeSceneConfig,
	RealtimeSceneSession,
	SceneRuntimeCoreApi,
	SceneRuntimeMode,
	ScreenPoint,
} from "./SceneRuntime";
import { createSceneMachine, type SceneMachine, type SceneMachineDeps } from "./sceneStateMachine";

const log = createLogger("SceneRuntime");

function isCameraControlCommand(value: unknown): value is AnyCameraControlCmd {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as { type?: unknown; subType?: unknown; data?: unknown };
	return candidate.type === "camera_control" && typeof candidate.subType === "string" && candidate.data !== undefined;
}

const LIGHT_TERRAIN_MAIN_COLOR = new Color3(0.23, 0.36, 0.19);
const LIGHT_TERRAIN_LINE_COLOR = new Color3(0.08, 0.12, 0.08);
const DARK_TERRAIN_MAIN_COLOR = Color3.Black();
const DARK_TERRAIN_LINE_COLOR = Color3.White();

export function SceneRuntimeCore(props: {
	onReady: (api: SceneRuntimeCoreApi) => void;
	onDisposed: (api: SceneRuntimeCoreApi) => void;
	onModeChange: (mode: SceneRuntimeMode) => void;
	onCharacterContentReadyChange: (ready: boolean) => void;
	onCharacterEquipmentPick: (pick: CharacterEquipmentPick) => void;
}): JSX.Element {
	const colorSystem = createMemo(() =>
		resolveColorSystem(store.settings.userInterface.theme, store.settings.userInterface.themeVersion),
	);
	const themePrimaryColor = createMemo(() => new Color3(...colorSystem().colors.semantic.primary.rgb01));
	const worldFogColor = createMemo(() =>
		store.settings.userInterface.theme === "light" ? Color3.White() : Color3.Black(),
	);
	const [ready, setReady] = createSignal(false);
	const [mode, setLocalMode] = createSignal<SceneRuntimeMode>("loading");
	const [characterPickingEnabled, setCharacterPickingEnabled] = createSignal(false);

	let canvas: HTMLCanvasElement | undefined;
	let engine: AbstractEngine | undefined;
	let scene: Scene | undefined;
	let realtimeRoot: TransformNode | undefined;
	// 角色内容根：character 内容稳态下挂角色模型；切换/释放时 dispose 子树。
	let characterRoot: TransformNode | undefined;
	// 单相机：全程唯一相机，观察态静态环绕，实时态由控制器跟随，态间用 babylon 动画补间。
	let sceneCamera: ArcRotateCamera | undefined;
	let lensPipeline: LensRenderingPipeline | undefined;
	let worldSkybox: ProceduralSkybox | undefined;
	let equipmentHighlightLayer: HighlightLayer | undefined;
	let rendererController: ReturnType<typeof createRendererController> | undefined;
	let thirdPersonController: ThirdPersonCameraController | undefined;
	let activeSessionId: string | null = null;
	let activeCharacterSessionId: string | null = null;
	let _activeControllerId: string | null = null;
	// 程序化世界地形：基础场景常驻部分，realtime 会话的实体通过它贴合地表。
	let worldTerrain: WorldTerrain | undefined;
	// realtime 稳态的场景输入；跟随场景会话生命周期。
	let sceneInputController: SceneInputController | undefined;
	let detachSceneInput: (() => void) | undefined;
	// 跟随门控：仅 realtime 稳态为 true，控制器 update 才驱动相机；过渡/观察期为 false，避免与动画打架。
	let followActive = false;
	let sceneMachineActor: Actor<SceneMachine> | undefined;
	let disposed = false;
	let initializationPromise: Promise<void> | undefined;
	let apiAnnounced = false;

	const setMode = (next: SceneRuntimeMode) => {
		setLocalMode(next);
		props.onModeChange(next);
	};

	const announceReady = () => {
		if (apiAnnounced) return;
		apiAnnounced = true;
		props.onReady(api);
	};

	/**
	 * 将 Babylon 的滚轮输入改为更新控制器的 desired distance。
	 * Babylon 已完成 deltaMode 归一化；这里复用其百分比缩放公式，但返回 0，
	 * 避免默认输入再直接修改 camera.radius。
	 */
	const configureCameraWheelInput = () => {
		if (!sceneCamera) return;
		// Babylon 的 inputs map 按字符串暴露具体输入类型，运行时已确认 mousewheel 的实际类型。
		const wheelInput = sceneCamera.inputs.attached.mousewheel as ArcRotateCameraMouseWheelInput | undefined;
		if (!wheelInput) return;
		wheelInput.customComputeDeltaFromMouseWheel = (wheelDelta, _input, event) => {
			event.preventDefault();
			if (!thirdPersonController) return 0;
			const distance = thirdPersonController.getCameraState().distance;
			const percentage = sceneCamera?.wheelDeltaPercentage ?? 0;
			if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(wheelDelta)) return 0;
			let radiusDelta = wheelDelta * 0.01 * percentage * distance;
			if (wheelDelta > 0) radiusDelta /= 1 + percentage;
			else radiusDelta *= 1 + percentage;
			thirdPersonController.adjustDistanceBy(-radiusDelta);
			return 0;
		};
	};

	const setCameraInputEnabled = (enabled: boolean) => {
		if (!canvas || !sceneCamera) return;
		if (enabled) {
			sceneCamera.attachControl(canvas, true);
			configureCameraWheelInput();
		} else {
			sceneCamera.detachControl();
			const wheelInput = sceneCamera.inputs.attached.mousewheel as ArcRotateCameraMouseWheelInput | undefined;
			if (wheelInput) wheelInput.customComputeDeltaFromMouseWheel = null;
		}
	};

	/** 将应用颜色模式投影到场景背景、雾和地形材质。 */
	const applySceneTheme = () => {
		const darkMode = store.settings.userInterface.theme === "dark";
		const ambientColor = themePrimaryColor();
		const fogColor = worldFogColor();
		if (!scene) return;
		scene.ambientColor = ambientColor;
		setFogOfWarColor(fogColor);
		worldSkybox?.setDarkMode(darkMode);
		worldTerrain?.setRenderColors(
			darkMode ? DARK_TERRAIN_MAIN_COLOR : LIGHT_TERRAIN_MAIN_COLOR,
			darkMode ? DARK_TERRAIN_LINE_COLOR : LIGHT_TERRAIN_LINE_COLOR,
			fogColor,
		);
	};

	createEffect(applySceneTheme);

	const handleCameraControl = (event: CustomEvent) => {
		const command = event.detail?.cmd ?? event.detail;
		if (!thirdPersonController || !isCameraControlCommand(command)) return;
		thirdPersonController.handleCameraCommand(command);
	};

	// 角色静态内容 deps：建/拆角色模型的逻辑抽到 content/sceneContentDeps，宿主只提供 scene/characterRoot 取值器。
	const characterContentDeps = createCharacterContentDeps({
		getScene: () => scene,
		getCharacterRoot: () => characterRoot,
		getGroundHeight: (x, z) => worldTerrain?.getHeightAt(x, z) ?? 0,
	});

	const mountWorldTerrain = async (definition: TerrainDefinition): Promise<void> => {
		if (!scene) throw new Error("SceneRuntime is not ready");
		const current = worldTerrain?.config.definition;
		if (
			current &&
			current.algorithmVersion === definition.algorithmVersion &&
			current.seed === definition.seed &&
			current.chunkSize === definition.chunkSize &&
			current.chunkResolution === definition.chunkResolution &&
			current.heightScale === definition.heightScale
		) {
			return;
		}
		worldTerrain?.dispose();
		worldTerrain = WorldTerrain.start({ definition, render: DEFAULT_TERRAIN_RENDER_CONFIG });
		await worldTerrain.mount(scene);
		applySceneTheme();
	};

	// 向控制器下发"跟随实体"指令（保留当前角度）。实时会话的 startFollow/setFollowTarget 共用。
	const sendFollowCommand = (entityId: string) => {
		if (!thirdPersonController) return;
		thirdPersonController.handleCameraCommand({
			type: "camera_control",
			entityId,
			subType: "follow",
			data: { followEntityId: entityId },
			seq: 0,
			ts: Date.now(),
		});
	};

	// ─── 机器副作用依赖 ──────────────────────────────────────────────────────────
	const sceneMachineDeps: SceneMachineDeps = {
		setupRealtimeResources: async (config) => {
			const camera = sceneCamera;
			if (!scene || !canvas || !camera) throw new Error("SceneRuntime is not ready");
			await mountWorldTerrain(config.terrain);
			rendererController = createRendererController(scene, {
				contentRoot: realtimeRoot,
				worldStateReader: config.renderSource.getWorldStateReader(),
				worldStateLayout: config.renderSource.getWorldStateLayout(),
			});
			await rendererController.applyWorldResources(config.worldResources, config.initialWorldPoses);
			const initialTarget = config.initialCameraTarget
				? new Vector3(config.initialCameraTarget.x, config.initialCameraTarget.y + 1, config.initialCameraTarget.z)
				: undefined;
			// 控制器复用唯一 sceneCamera，不再 new 第二台相机。
			thirdPersonController = new ThirdPersonCameraController(
				scene,
				camera,
				rendererController,
				{
					followEntityId: config.followEntityId,
					distance: FOLLOW_POSE.radius,
					smoothTransition: true,
					...(initialTarget ? { target: initialTarget } : {}),
				},
				// mountWorldTerrain 已在本函数前置完成；没有地形时不伪造 y=0 地面。
				worldTerrain?.getHeightAt,
			);
			if (config.controllerInput) {
				const input = config.controllerInput;
				const nextController = new SceneInputController({
					movementSink: input.movementSink,
					getCameraBasis: () => {
						const forward = camera.getDirection(Vector3.Forward());
						forward.y = 0;
						forward.normalize();
						const right = Vector3.Cross(Vector3.Up(), forward).normalize();
						return {
							forward: { x: forward.x, z: forward.z },
							right: { x: right.x, z: right.z },
						};
					},
					onAction: (action) => {
						input.onAction(action);
					},
					skillBindings: input.skillBindings,
				});
				sceneInputController = nextController;
				detachSceneInput = () => {
					nextController.dispose();
				};
			}
			// 控制器构造时会把相机 target 设到成员位；重置回观察位，让"飞入"动画从观察位起步。
			camera.alpha = OBSERVE_POSE.alpha;
			camera.beta = OBSERVE_POSE.beta;
			camera.radius = OBSERVE_POSE.radius;
			camera.setTarget(OBSERVE_POSE.target.clone());
		},
		teardownRealtimeResources: () => {
			window.removeEventListener("cameraControl", handleCameraControl as EventListener);
			setCameraInputEnabled(false);
			detachSceneInput?.();
			detachSceneInput = undefined;
			sceneInputController = undefined;
			rendererController?.dispose();
			rendererController = undefined;
			thirdPersonController?.dispose();
			thirdPersonController = undefined;
			activeSessionId = null;
			_activeControllerId = null;
		},
		runCameraTransition: (direction, _config, onDone) => {
			if (direction === "leave") {
				return animateCameraTo(scene, sceneCamera, { ...OBSERVE_POSE, target: OBSERVE_POSE.target.clone() }, onDone);
			}
			// enter：终点 target 取控制器当前 state（含成员位预摆），角度/距离用跟随默认。
			const followTarget = thirdPersonController?.getCameraState().target ?? OBSERVE_POSE.target;
			return animateCameraTo(scene, sceneCamera, { ...FOLLOW_POSE, target: followTarget.clone() }, onDone);
		},
		attachCameraInput: () => setCameraInputEnabled(true),
		detachCameraInput: () => setCameraInputEnabled(false),
		startFollow: (config) => {
			followActive = true;
			window.addEventListener("cameraControl", handleCameraControl as EventListener);
			if (config?.followEntityId) {
				sendFollowCommand(config.followEntityId);
			}
		},
		stopFollow: () => {
			followActive = false;
		},
		setupCharacterContent: (resource) => characterContentDeps.setupCharacterContent(resource),
		teardownCharacterContent: () => characterContentDeps.teardownCharacterContent(),
		onError: (error) => log.error("场景实时会话失败", error),
	};

	// 机器状态 → 对外 SceneRuntimeMode 映射。
	const modeFromMachineState = (value: string): SceneRuntimeMode => {
		switch (value) {
			case "loading":
				return "loading";
			case "idle":
			// character 内容稳态对外复用 idle：属观察类，Nav 不隐藏；装备交互不隐式改变相机。
			case "loadingCharacter":
			case "character":
			case "unloadingCharacter":
				return "idle";
			case "preparing":
			case "entering":
			case "realtime":
			case "leaving":
				// 过渡期对外即视为 realtime，使 UI（Nav 隐藏、pointer-events）与相机动画同步，避免闪烁。
				return "realtime";
			case "error":
				return "error";
			default:
				return "idle";
		}
	};

	const startSceneMachine = () => {
		if (sceneMachineActor) {
			sceneMachineActor.send({ type: "READY" });
			return;
		}
		const machine = createSceneMachine(sceneMachineDeps);
		sceneMachineActor = createActor(machine);
		sceneMachineActor.subscribe((snapshot) => {
			const value = String(snapshot.value);
			setMode(modeFromMachineState(value));
			setCharacterPickingEnabled(value === "character");
			props.onCharacterContentReadyChange(value === "character");
		});
		sceneMachineActor.start();
		sceneMachineActor.send({ type: "READY" });
	};

	const createBaseScene = async () => {
		if (!scene || !engine) return;
		realtimeRoot = new TransformNode("render-group:realtime", scene);
		characterRoot = new TransformNode("render-group:character", scene);

		scene.clearColor = new Color4(0, 0, 0, 0);
		scene.ambientColor = themePrimaryColor();

		sceneCamera = new ArcRotateCamera(
			"sceneCamera",
			OBSERVE_POSE.alpha,
			OBSERVE_POSE.beta,
			OBSERVE_POSE.radius,
			OBSERVE_POSE.target.clone(),
			scene,
		);
		sceneCamera.minZ = 0.1;
		sceneCamera.fov = 1;
		sceneCamera.wheelDeltaPercentage = 0.05;
		// CAMERA_RADIUS_LIMITS.min 约束 desired distance；有效半径还需要允许因地形碰撞低于该值。
		sceneCamera.lowerRadiusLimit = CAMERA_EFFECTIVE_RADIUS_MIN;
		sceneCamera.upperRadiusLimit = CAMERA_RADIUS_LIMITS.max;
		scene.activeCamera = sceneCamera;
		// Babylon 先执行动画和输入，再进入相机绘制；这里施加最终硬碰撞上限，覆盖所有直接写入。
		scene.onBeforeCameraRenderObservable.add(() => {
			thirdPersonController?.constrainCamera();
			// 回调发生在 Babylon 本帧默认变换矩阵计算之后，半径被钳制后需要重新计算矩阵。
			scene?.updateTransformMatrix(true);
		});
		worldSkybox = createProceduralStarSkybox(scene);
		registerFogOfWarMaterialPlugin();
		applySceneTheme();

		scene.onPointerObservable.add((pointerInfo) => {
			if (pointerInfo.type !== PointerEventTypes.POINTERPICK || !characterRoot) return;
			const snapshot = sceneMachineActor?.getSnapshot();
			if (!snapshot || String(snapshot.value) !== "character" || !snapshot.context.characterResource) return;
			const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
			if (!pickedMesh?.isDescendantOf(characterRoot)) return;
			const equipmentSlot = readCharacterEquipmentSlotMetadata(pickedMesh);
			if (!equipmentSlot) return;
			props.onCharacterEquipmentPick({
				characterId: snapshot.context.characterResource.resourceId,
				equipmentSlot,
			});
		});

		lensPipeline = new LensRenderingPipeline(
			"scene-lens",
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
			[sceneCamera],
		);

		// 世界日光与环境光：日光负责阴影，环境光提供基础照明。
		const sunLight = new DirectionalLight("sunLight", new Vector3(0.5, -1, 0.35), scene);
		sunLight.intensity = 3;
		const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), scene);
		ambientLight.intensity = 0.4;
		ambientLight.groundColor = new Color3(0.15, 0.15, 0.2);

		const shadowGenerator = new ShadowGenerator(2048, sunLight);
		shadowGenerator.bias = 0.0001;
		shadowGenerator.darkness = 0.4;
		shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
		shadowGenerator.filter = ShadowGenerator.FILTER_PCSS;
		shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_LOW;

		// 阴影归属统一入口：新 mesh 默认接收阴影；实时内容（角色/怪物）作为阴影投射源注册。
		scene.onNewMeshAddedObservable.add((mesh) => {
			mesh.receiveShadows = true;
			if (realtimeRoot && mesh.isDescendantOf(realtimeRoot)) {
				shadowGenerator.addShadowCaster(mesh);
			}
		});
		try {
			await mountWorldTerrain(DEFAULT_TERRAIN_DEFINITION);
			applySceneTheme();
			const revealCenter = sceneCamera.getTarget();
			setFogOfWarCenter(revealCenter);
			worldTerrain?.update(sceneCamera.position, revealCenter);
		} catch (error) {
			log.error("程序化世界生成失败，模拟场景将在平面地表运行", error);
		}
	};

	const initialize = async () => {
		if (!canvas) return;
		try {
			setMode("loading");
			engine = new Engine(canvas, true);
			engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
			engine.loadingScreen = {
				displayLoadingUI: () => {},
				hideLoadingUI: () => {},
				loadingUIBackgroundColor: "#000000",
				loadingUIText: "Loading...",
			};
			scene = new Scene(engine);
			await createBaseScene();
			if (disposed || !scene || !engine) return;
			const initializedScene = scene;
			engine.runRenderLoop(() => {
				if (!scene || !engine) return;
				const dt = engine.getDeltaTime() / 1000;
				rendererController?.tick(dt);
				// 仅 realtime 稳态驱动跟随；过渡期相机由 babylon 动画控制，避免两者打架。
				if (followActive) thirdPersonController?.update(dt);
				sceneInputController?.updateMovementState();
				if (sceneCamera) {
					const revealCenter = sceneCamera.getTarget();
					setFogOfWarCenter(revealCenter);
					worldTerrain?.update(sceneCamera.position, revealCenter);
				}
				scene.render();
			});
			// 等到 babylon 场景真正 ready（setReady(true) 已执行）后再让 initialize 完成，
			// 否则 acquireRealtimeSession 只 await initializationPromise 时会撞上 ready() 仍为 false 的窗口。
			await new Promise<void>((resolve) => {
				initializedScene.executeWhenReady(() => {
					if (!disposed) {
						engine?.resize();
						setReady(true);
						startSceneMachine();
					}
					resolve();
				});
			});

			// // 测试模式配置函数
			// // 开发环境下启动检查器。生产构建会移除这个分支，避免打包 Babylon Inspector。
			// if (import.meta.env.DEV) {
			// 	await import("@babylonjs/core/Debug/debugLayer");
			// 	await import("@babylonjs/inspector");
			// 	const { AxesViewer } = await import("@babylonjs/core/Debug/axesViewer");
			// 	// 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
			// 	void scene.debugLayer.show({
			// 		// embedMode: true
			// 	});
			// 	// 世界坐标轴显示
			// 	new AxesViewer(scene, 0.1);
			// }
		} catch (error) {
			log.error("SceneRuntime 初始化失败", error);
			sceneMachineActor?.send({ type: "FAIL" });
			setMode("error");
		}
	};

	const acquireRealtimeSession = async (config: RealtimeSceneConfig): Promise<RealtimeSceneSession> => {
		await initializationPromise;
		if (!ready() || !scene || !canvas || !sceneMachineActor) {
			throw new Error("SceneRuntime is not ready");
		}
		const sessionId = createId();
		activeCharacterSessionId = null;
		activeSessionId = sessionId;
		_activeControllerId = config.activeControllerId ?? null;
		// 若已有活动会话，先释放（机器从 realtime→leaving→idle 后再接受新 ACQUIRE）。
		sceneMachineActor.send({ type: "ACQUIRE", config });
		return {
			id: sessionId,
			setFollowTarget: (entityId) => {
				if (!entityId || activeSessionId !== sessionId) return;
				sendFollowCommand(entityId);
			},
			setActiveController: (controllerId) => {
				if (activeSessionId !== sessionId) return;
				_activeControllerId = controllerId;
			},
			setCameraInputEnabled: (enabled) => {
				if (activeSessionId !== sessionId) return;
				setCameraInputEnabled(enabled);
			},
			release: () => {
				if (activeSessionId !== sessionId) return;
				sceneMachineActor?.send({ type: "RELEASE" });
			},
		};
	};

	const acquireCharacterContent = async (resource: CharacterWorldResource): Promise<CharacterContentSession> => {
		await initializationPromise;
		if (!ready() || !scene || !sceneMachineActor) {
			throw new Error("SceneRuntime is not ready");
		}
		const sessionId = createId();
		activeCharacterSessionId = sessionId;
		// Character 内容允许新 acquire 抢占正在加载或已稳定的旧资源；realtime 仍由机器保持互斥。
		sceneMachineActor.send({ type: "LOAD_CHARACTER", resource });
		return {
			id: sessionId,
			release: () => {
				if (activeCharacterSessionId !== sessionId) return;
				activeCharacterSessionId = null;
				sceneMachineActor?.send({ type: "RELEASE_CONTENT" });
			},
		};
	};

	const api: SceneRuntimeCoreApi = {
		ready,
		mode,
		acquireRealtimeSession,
		acquireCharacterContent,
		highlightCharacterEquipment: (equipmentSlot) => {
			if (!scene || !characterRoot) return () => {};
			const root = characterRoot;
			const highlightedMeshes = scene.meshes.filter(
				(mesh): mesh is Mesh =>
					mesh instanceof Mesh &&
					mesh.isDescendantOf(root) &&
					readCharacterEquipmentSlotMetadata(mesh) === equipmentSlot,
			);
			if (highlightedMeshes.length === 0) return () => {};
			equipmentHighlightLayer ??= new HighlightLayer("character-equipment-highlight", scene);
			const color = themePrimaryColor();
			for (const mesh of highlightedMeshes) equipmentHighlightLayer.addMesh(mesh, color);
			return () => {
				for (const mesh of highlightedMeshes) equipmentHighlightLayer?.removeMesh(mesh);
			};
		},
		projectWorldToScreen: (position): ScreenPoint | null => {
			if (!scene || !engine) return null;
			const camera = scene.activeCamera;
			if (!camera) return null;
			const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
			const projected = Vector3.Project(
				new Vector3(position.x, position.y, position.z),
				Matrix.Identity(),
				scene.getTransformMatrix(),
				viewport,
			);
			return {
				x: projected.x,
				y: projected.y,
				visible: projected.z >= 0 && projected.z <= 1,
			};
		},
		dispose: () => {
			if (disposed) return;
			disposed = true;
			sceneMachineDeps.teardownRealtimeResources();
			sceneMachineDeps.teardownCharacterContent();
			sceneMachineActor?.stop();
			sceneMachineActor = undefined;
			worldTerrain?.dispose();
			worldTerrain = undefined;
			worldSkybox?.dispose();
			worldSkybox = undefined;
			equipmentHighlightLayer?.dispose();
			equipmentHighlightLayer = undefined;
			lensPipeline?.dispose();
			lensPipeline = undefined;
			scene?.dispose();
			scene = undefined;
			engine?.dispose();
			engine = undefined;
			props.onDisposed(api);
			setReady(false);
			setCharacterPickingEnabled(false);
			props.onCharacterContentReadyChange(false);
			setMode("idle");
		},
	};

	onMount(() => {
		initializationPromise = initialize();
		announceReady();
	});

	onCleanup(() => {
		api.dispose();
	});

	return (
		<canvas
			ref={(element) => {
				canvas = element;
			}}
			class={`fixed left-0 top-0 z-0 h-dvh w-dvw bg-transparent transition-opacity focus-within:outline-none ${
				ready() ? "opacity-100" : "opacity-0"
			} ${mode() === "realtime" || characterPickingEnabled() ? "pointer-events-auto" : "pointer-events-none"}`}
		>
			当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
		</canvas>
	);
}
