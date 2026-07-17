/**
 * SceneRuntime 的 Babylon 实现层。
 *
 * 职责：持有唯一 canvas、Babylon engine/scene、基础背景组和实时模拟 session。
 * 边界：业务层只能通过 SceneRuntime session 进入实时渲染，不能越过本文件直接改 scene。
 * 见 docs/decisions/0009-persistent-render-runtime.md
 *    docs/decisions/0021-aui-interface-state-machine.md（装备高亮与拾取作为 AUI 场景投影端口）
 */

import { createId } from "@paralleldrive/cuid2";
import { createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";
import { type Actor, createActor } from "xstate";
import type { AbstractEngine, PBRMaterial } from "~/lib/babylon/runtime";
import {
	AppendSceneAsync,
	ArcRotateCamera,
	Color3,
	Color4,
	Engine,
	HighlightLayer,
	LensRenderingPipeline,
	Material,
	Matrix,
	Mesh,
	MeshBuilder,
	PointerEventTypes,
	Scalar,
	Scene,
	ShadowGenerator,
	SolidParticleSystem,
	SpotLight,
	TransformNode,
	Vector3,
} from "~/lib/babylon/runtime";
import { createLogger } from "~/lib/Logger";
import { store } from "~/store";
import { resolveColorSystem } from "~/styles/colorSystem/colorSystemController";
import type { RendererCmd } from "../engine/core/thread/RendererProtocol";
import { animateCameraTo, FOLLOW_POSE, OBSERVE_POSE } from "./camera/cameraTransition";
import type { AnyCameraControlCmd } from "./camera/commands";
import { ThirdPersonCameraController } from "./camera/thirdPersonController";
import { readCharacterEquipmentSlotMetadata } from "./content/characterEquipmentMetadata";
import { RendererCommunication } from "./content/RendererCommunication";
import { createCharacterContentDeps } from "./content/sceneContentDeps";
import type { CharacterWorldResource } from "./contracts/worldResource";
import {
	isPBRMaterial,
	registerVolumetricFogPlugin,
	type VolumetricFogPluginMaterial,
} from "./materials/volumetricFog";
import { createRendererController } from "./RendererController";
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

function isRenderCommandPacket(value: unknown): value is { type?: unknown; cmd?: unknown; cmds?: unknown[] } {
	return typeof value === "object" && value !== null;
}

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
	const [ready, setReady] = createSignal(false);
	const [mode, setLocalMode] = createSignal<SceneRuntimeMode>("loading");
	const [characterPickingEnabled, setCharacterPickingEnabled] = createSignal(false);

	let canvas: HTMLCanvasElement | undefined;
	let engine: AbstractEngine | undefined;
	let scene: Scene | undefined;
	let backgroundRoot: TransformNode | undefined;
	let realtimeRoot: TransformNode | undefined;
	// 角色内容根：character 内容稳态下挂角色模型；切换/释放时 dispose 子树。
	let characterRoot: TransformNode | undefined;
	// 单相机：全程唯一相机，观察态静态环绕，实时态由控制器跟随，态间用 babylon 动画补间。
	let sceneCamera: ArcRotateCamera | undefined;
	let lensPipeline: LensRenderingPipeline | undefined;
	let equipmentHighlightLayer: HighlightLayer | undefined;
	let rendererController: ReturnType<typeof createRendererController> | undefined;
	let rendererCommunication: RendererCommunication | undefined;
	let thirdPersonController: ThirdPersonCameraController | undefined;
	let defPBR: PBRMaterial | undefined;
	let activeSessionId: string | null = null;
	let activeCharacterSessionId: string | null = null;
	let _activeControllerId: string | null = null;
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

	const setCameraInputEnabled = (enabled: boolean) => {
		if (!canvas || !sceneCamera) return;
		if (enabled) {
			sceneCamera.attachControl(canvas, true);
		} else {
			sceneCamera.detachControl();
		}
	};

	const syncThemeMaterials = () => {
		if (!scene) return;
		const currentColor = themePrimaryColor();
		scene.ambientColor = currentColor;
		if (!defPBR) return;
		if (!defPBR.albedoColor.equals(currentColor)) {
			defPBR.albedoColor = currentColor;
			defPBR.markAsDirty(Material.TextureDirtyFlag);
		}
		const volumetricFog = defPBR.pluginManager?.getPlugin("VolumetricFog") as
			| VolumetricFogPluginMaterial
			| undefined
			| null;
		if (volumetricFog && !volumetricFog.color.equals(currentColor)) {
			volumetricFog.color = currentColor;
		}
	};

	const handleRenderPayload = (payload: unknown) => {
		if (!rendererController) return;
		try {
			if (Array.isArray(payload)) {
				// 类型说明：Worker 渲染协议已经由 EngineWorkerClient 边界产出，这里只在渲染端恢复命令联合类型。
				rendererController.send(payload as RendererCmd[]);
				return;
			}
			if (isRenderCommandPacket(payload)) {
				if (payload.type === "render:cmd" && payload.cmd) {
					// 类型说明：payload 由 RendererCommunication 从 WorkerSystemMessage 中拆包，运行时协议保证 cmd 形状。
					rendererController.send(payload.cmd as RendererCmd);
					return;
				}
				if (payload.type === "render:cmds" && Array.isArray(payload.cmds)) {
					// 类型说明：同上，批量命令在进入渲染控制器前恢复为 RendererCmd[]。
					rendererController.send(payload.cmds as RendererCmd[]);
					return;
				}
			}
			// 类型说明：兼容历史直接发送 RendererCmd 的路径。
			rendererController.send(payload as RendererCmd);
		} catch (error) {
			log.error("处理渲染指令失败", error);
		}
	};

	const handleCameraControl = (event: CustomEvent) => {
		const command = event.detail?.cmd ?? event.detail;
		if (!thirdPersonController || !isCameraControlCommand(command)) return;
		thirdPersonController.handleCameraCommand(command);
	};

	// 角色静态内容 deps：建/拆角色模型的逻辑抽到 content/sceneContentDeps，宿主只提供 scene/characterRoot 取值器。
	const characterContentDeps = createCharacterContentDeps({
		getScene: () => scene,
		getCharacterRoot: () => characterRoot,
	});

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
			rendererController = createRendererController(scene, { contentRoot: realtimeRoot });
			await rendererController.applyWorldResources(config.worldResources, config.initialWorldPoses);
			rendererCommunication = new RendererCommunication();
			rendererCommunication.setRenderHandler(handleRenderPayload);
			rendererCommunication.initialize(config.renderSource);
			const renderSnapshot = await config.renderSource.getRenderSnapshot(true);
			if (renderSnapshot && rendererController.applyRenderSnapshot) {
				await rendererController.applyRenderSnapshot(renderSnapshot);
			}
			rendererCommunication.markRenderSnapshotApplied();
			const initialTarget = config.initialCameraTarget
				? new Vector3(config.initialCameraTarget.x, config.initialCameraTarget.y + 1, config.initialCameraTarget.z)
				: undefined;
			// 控制器复用唯一 sceneCamera，不再 new 第二台相机。
			thirdPersonController = new ThirdPersonCameraController(scene, camera, rendererController, {
				followEntityId: config.followEntityId,
				distance: FOLLOW_POSE.radius,
				smoothTransition: true,
				...(initialTarget ? { target: initialTarget } : {}),
			});
			// 控制器构造时会把相机 target 设到成员位；重置回观察位，让"飞入"动画从观察位起步。
			camera.alpha = OBSERVE_POSE.alpha;
			camera.beta = OBSERVE_POSE.beta;
			camera.radius = OBSERVE_POSE.radius;
			camera.setTarget(OBSERVE_POSE.target.clone());
		},
		teardownRealtimeResources: () => {
			window.removeEventListener("cameraControl", handleCameraControl as EventListener);
			rendererCommunication?.dispose();
			rendererCommunication = undefined;
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
		const runtimeEngine = engine;
		registerVolumetricFogPlugin();
		backgroundRoot = new TransformNode("render-group:background", scene);
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
		scene.activeCamera = sceneCamera;

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

		const mainSpotLight = new SpotLight(
			"mainSpotLight",
			new Vector3(0, 30, 0),
			new Vector3(0, -1, 0),
			Math.PI / 4,
			2,
			scene,
		);
		mainSpotLight.id = "mainSpotLight";
		mainSpotLight.intensity = 300;
		mainSpotLight.radius = 10;

		const stageSpotLight = new SpotLight(
			"stageSpotLight",
			new Vector3(0, 4.5, 2.5),
			new Vector3(0, -1, 0),
			Math.PI / 4,
			2,
			scene,
		);
		stageSpotLight.id = "stageSpotLight";
		stageSpotLight.intensity = 40;
		stageSpotLight.radius = 10;

		const shadowGenerator = new ShadowGenerator(1024, mainSpotLight);
		shadowGenerator.bias = 0.000001;
		shadowGenerator.darkness = 0.5;
		shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
		shadowGenerator.filter = ShadowGenerator.FILTER_PCSS;
		shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_LOW;

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
		spsMesh.name = "spsMesh";
		spsMesh.parent = backgroundRoot;
		spsMesh.rotation = new Vector3((Math.PI * -1) / 12, 0, 0);
		const particlePosY: number[] = [];

		SPS.initParticles = () => {
			for (let p = 0; p < SPS.nbParticles; p++) {
				const currentParticle = SPS.particles[p];
				if (!currentParticle) continue;
				const currY = Scalar.RandomRange(0, spsPositionL.y + spsSizeY);
				particlePosY.push(currY);
				if (p % 2 === 0) {
					currentParticle.position.x = Scalar.RandomRange(spsPositionL.x - spsSizeXZ, spsPositionL.x + spsSizeXZ);
					currentParticle.position.z = Scalar.RandomRange(spsPositionL.z - spsSizeXZ, spsPositionL.z + spsSizeXZ);
				} else {
					currentParticle.position.x = Scalar.RandomRange(spsPositionR.x - spsSizeXZ, spsPositionR.x + spsSizeXZ);
					currentParticle.position.z = Scalar.RandomRange(spsPositionR.z - spsSizeXZ, spsPositionR.z + spsSizeXZ);
				}
				currentParticle.position.y = currY;
				const scale = Scalar.RandomRange(0.15, 0.2);
				currentParticle.scale.x = scale;
				currentParticle.scale.y = scale;
				currentParticle.scale.z = scale;
				currentParticle.rotation.x = Scalar.RandomRange(0, Math.PI);
				currentParticle.rotation.y = Scalar.RandomRange(0, Math.PI);
				currentParticle.rotation.z = Scalar.RandomRange(0, Math.PI);
			}
		};

		SPS.initParticles();
		SPS.setParticles();
		SPS.updateParticle = (currentParticle) => {
			if (currentParticle.position.y >= spsSizeY) {
				currentParticle.position.y = (-Math.random() * spsSizeY) / 2;
			} else {
				const mirroredY = particlePosY[spsNumber - currentParticle.idx] ?? 0;
				const ownY = particlePosY[currentParticle.idx] ?? 0;
				currentParticle.position.y += (0.04 * mirroredY + 0.025) / runtimeEngine.getFps();
				currentParticle.rotation.y += (0.05 * ownY) / runtimeEngine.getFps();
			}
			return currentParticle;
		};
		scene.registerAfterRender(() => {
			SPS.setParticles();
		});

		try {
			await AppendSceneAsync("/models/bg.glb", scene);
			const defaultMat = scene.getMaterialByName("__GLTFLoader._default");
			if (defaultMat) {
				defaultMat.backFaceCulling = false;
			}
			if (isPBRMaterial(defaultMat)) {
				defPBR = defaultMat;
				defPBR.albedoColor = themePrimaryColor();
				defPBR.ambientColor = new Color3(0.008, 0.01, 0.01);
			}
			// 类型说明：pluginManager 只能按基类返回插件；名称已由本文件注册，恢复为体积雾插件以同步主题色。
			const mat = defPBR?.pluginManager?.getPlugin("VolumetricFog") as VolumetricFogPluginMaterial | undefined | null;
			if (mat) {
				mat.center = new Vector3(0, 0, -6);
				mat.isEnabled = true;
				mat.color = themePrimaryColor();
				mat.radius = 8;
				mat.density = 0.5;
			}
			scene.meshes.forEach((mesh) => {
				if (mesh.name === "__root__") return;
				mesh.receiveShadows = true;
				shadowGenerator.addShadowCaster(mesh, true);
				if (defPBR) {
					mesh.material = defPBR;
				}
				if (!mesh.parent && backgroundRoot) {
					mesh.parent = backgroundRoot;
				}
			});
		} catch (error) {
			log.error("背景模型加载失败，保留空基础场景继续运行", error);
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
				syncThemeMaterials();
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
			class={`fixed left-0 top-0 z-0 h-dvh w-dvw bg-transparent transition-opacity ${
				ready() ? "opacity-100" : "opacity-0"
			} ${mode() === "realtime" || characterPickingEnabled() ? "pointer-events-auto" : "pointer-events-none"}`}
		>
			当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
		</canvas>
	);
}
