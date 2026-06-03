/**
 * SceneRuntime 的 Babylon 实现层。
 *
 * 职责：持有唯一 canvas、Babylon engine/scene、基础背景组和实时模拟 session。
 * 边界：业务层只能通过 SceneRuntime session 进入实时渲染，不能越过本文件直接改 scene。
 * 见 src/lib/engine/document/decisions/0009-persistent-render-runtime.md
 */

import { createId } from "@paralleldrive/cuid2";
import { createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";
import type { AbstractEngine, MaterialDefines, Mesh, Nullable, PBRMaterial, SubMesh } from "~/lib/babylon/runtime";
import {
	AppendSceneAsync,
	ArcRotateCamera,
	Color3,
	Color4,
	Engine,
	LensRenderingPipeline,
	Material,
	MaterialPluginBase,
	Matrix,
	MeshBuilder,
	PBRBaseMaterial,
	RegisterMaterialPlugin,
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
import { RendererCommunication } from "./RendererCommunication";
import { createRendererController } from "./RendererController";
import type { RendererCmd } from "./RendererProtocol";
import type {
	RealtimeSceneConfig,
	RealtimeSceneSession,
	SceneRuntimeCoreApi,
	SceneRuntimeMode,
	ScreenPoint,
} from "./SceneRuntime";
import {
	type AnyCameraControlCmd,
	createThirdPersonController,
	type ThirdPersonCameraController,
} from "./ThirdPersonCameraController";

const log = createLogger("SceneRuntime");

let volumetricFogPluginRegistered = false;

class VolumetricFogPluginMaterial extends MaterialPluginBase {
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

function isPBRMaterial(mat: Nullable<Material>): mat is PBRMaterial {
	return mat !== null && mat.getClassName() === "PBRMaterial";
}

function registerVolumetricFogPlugin() {
	if (volumetricFogPluginRegistered) return;
	RegisterMaterialPlugin("VolumetricFog", (material) => new VolumetricFogPluginMaterial(material));
	volumetricFogPluginRegistered = true;
}

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
}): JSX.Element {
	const colorSystem = createMemo(() =>
		resolveColorSystem(store.settings.userInterface.theme, store.settings.userInterface.themeVersion),
	);
	const themePrimaryColor = createMemo(() => new Color3(...colorSystem().colors.semantic.primary.rgb01));
	const [ready, setReady] = createSignal(false);
	const [mode, setLocalMode] = createSignal<SceneRuntimeMode>("loading");
	const [cameraInputEnabled, setCameraInputEnabledSignal] = createSignal(false);

	let canvas: HTMLCanvasElement | undefined;
	let engine: AbstractEngine | undefined;
	let scene: Scene | undefined;
	let backgroundRoot: TransformNode | undefined;
	let realtimeRoot: TransformNode | undefined;
	let backgroundCamera: ArcRotateCamera | undefined;
	let realtimeCamera: ArcRotateCamera | undefined;
	let realtimePipeline: LensRenderingPipeline | undefined;
	let rendererController: ReturnType<typeof createRendererController> | undefined;
	let rendererCommunication: RendererCommunication | undefined;
	let thirdPersonController: ThirdPersonCameraController | undefined;
	let defPBR: PBRMaterial | undefined;
	let activeSessionId: string | null = null;
	let _activeControllerId: string | null = null;
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
		if (!canvas || !realtimeCamera) return;
		if (enabled) {
			realtimeCamera.attachControl(canvas, false);
		} else {
			realtimeCamera.detachControl();
		}
		setCameraInputEnabledSignal(enabled);
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
				// 类型说明：Worker 渲染协议已经由 SimulationEngine 边界产出，这里只在渲染端恢复命令联合类型。
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

	const releaseRealtimeSession = (sessionId?: string) => {
		if (sessionId && activeSessionId !== sessionId) return;
		window.removeEventListener("cameraControl", handleCameraControl as EventListener);
		rendererCommunication?.dispose();
		rendererCommunication = undefined;
		rendererController?.dispose();
		rendererController = undefined;
		thirdPersonController?.dispose();
		thirdPersonController = undefined;
		realtimePipeline?.dispose();
		realtimePipeline = undefined;
		if (realtimeCamera) {
			realtimeCamera.detachControl();
			realtimeCamera.dispose();
			realtimeCamera = undefined;
		}
		activeSessionId = null;
		_activeControllerId = null;
		setCameraInputEnabledSignal(false);
		if (scene && backgroundCamera) {
			scene.activeCamera = backgroundCamera;
		}
		realtimeRoot?.getChildren().forEach((node) => {
			node.dispose();
		});
		if (!disposed) setMode("idle");
	};

	const createBaseScene = async () => {
		if (!scene || !engine) return;
		const runtimeEngine = engine;
		registerVolumetricFogPlugin();
		backgroundRoot = new TransformNode("render-group:background", scene);
		realtimeRoot = new TransformNode("render-group:realtime", scene);

		scene.clearColor = new Color4(0, 0, 0, 0);
		scene.ambientColor = themePrimaryColor();

		backgroundCamera = new ArcRotateCamera("backgroundCamera", 1.58, 1.6, 3.12, new Vector3(0, 0.43, 0), scene);
		backgroundCamera.minZ = 0.1;
		backgroundCamera.fov = 1;
		backgroundCamera.wheelDeltaPercentage = 0.05;
		scene.activeCamera = backgroundCamera;

		new LensRenderingPipeline(
			"background-lens",
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
			[backgroundCamera],
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
			engine.runRenderLoop(() => {
				if (!scene || !engine) return;
				const dt = engine.getDeltaTime() / 1000;
				rendererController?.tick(dt);
				thirdPersonController?.update(dt);
				syncThemeMaterials();
				scene.render();
			});
			const handleResize = () => engine?.resize();
			window.addEventListener("resize", handleResize);
			onCleanup(() => window.removeEventListener("resize", handleResize));
			scene.executeWhenReady(() => {
				if (disposed) return;
				engine?.resize();
				setReady(true);
				setMode("idle");
			});
		} catch (error) {
			log.error("SceneRuntime 初始化失败", error);
			setMode("error");
		}
	};

	const acquireRealtimeSession = async (config: RealtimeSceneConfig): Promise<RealtimeSceneSession> => {
		await initializationPromise;
		if (!ready() || !scene || !canvas) {
			throw new Error("SceneRuntime is not ready");
		}
		releaseRealtimeSession();
		const sessionId = createId();
		activeSessionId = sessionId;
		_activeControllerId = config.activeControllerId ?? null;
		rendererController = createRendererController(scene);
		rendererCommunication = new RendererCommunication();
		rendererCommunication.setRenderHandler(handleRenderPayload);
		rendererCommunication.initialize(config.engine);
		const renderSnapshot = await config.engine.getRenderSnapshot(true);
		if (renderSnapshot && rendererController.applyRenderSnapshot) {
			await rendererController.applyRenderSnapshot(renderSnapshot);
		}
		rendererCommunication.markRenderSnapshotApplied();
		const thirdPersonSetup = createThirdPersonController(scene, canvas, rendererController, config.followEntityId, {
			distance: 8,
			smoothTransition: true,
		});
		realtimeCamera = thirdPersonSetup.camera;
		thirdPersonController = thirdPersonSetup.controller;
		realtimeCamera.minZ = 0.1;
		realtimeCamera.fov = 1;
		realtimeCamera.wheelDeltaPercentage = 0.05;
		realtimePipeline = new LensRenderingPipeline(
			"realtime-lens",
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
			[realtimeCamera],
		);
		window.addEventListener("cameraControl", handleCameraControl as EventListener);
		setCameraInputEnabled(true);
		setMode("realtime");
		return {
			id: sessionId,
			setFollowTarget: (entityId) => {
				if (!entityId || activeSessionId !== sessionId || !thirdPersonController) return;
				thirdPersonController.handleCameraCommand({
					type: "camera_control",
					entityId,
					subType: "follow",
					data: { followEntityId: entityId },
					seq: 0,
					ts: Date.now(),
				});
			},
			setActiveController: (controllerId) => {
				if (activeSessionId !== sessionId) return;
				_activeControllerId = controllerId;
			},
			setCameraInputEnabled: (enabled) => {
				if (activeSessionId !== sessionId) return;
				setCameraInputEnabled(enabled);
			},
			release: () => releaseRealtimeSession(sessionId),
		};
	};

	const api: SceneRuntimeCoreApi = {
		ready,
		mode,
		acquireRealtimeSession,
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
			releaseRealtimeSession();
			scene?.dispose();
			scene = undefined;
			engine?.dispose();
			engine = undefined;
			props.onDisposed(api);
			setReady(false);
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
			} ${mode() === "realtime" && cameraInputEnabled() ? "pointer-events-auto" : "pointer-events-none"}`}
		>
			当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
		</canvas>
	);
}
