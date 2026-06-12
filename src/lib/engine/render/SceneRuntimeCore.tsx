/**
 * SceneRuntime 的 Babylon 实现层。
 *
 * 职责：持有唯一 canvas、Babylon engine/scene、基础背景组和实时模拟 session。
 * 边界：业务层只能通过 SceneRuntime session 进入实时渲染，不能越过本文件直接改 scene。
 * 见 docs/decisions/0009-persistent-render-runtime.md
 *    docs/decisions/0012-intent-first-visual-control.md（focusCamera/resetCamera 作为意图层场景投影）
 */

import { createId } from "@paralleldrive/cuid2";
import { createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";
import { type Actor, createActor } from "xstate";
import type { AbstractEngine, MaterialDefines, Mesh, Nullable, PBRMaterial, SubMesh } from "~/lib/babylon/runtime";
import {
	Animation,
	AppendSceneAsync,
	ArcRotateCamera,
	Color3,
	Color4,
	CubicEase,
	EasingFunction,
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
import {
	BuiltinAnimationType,
	type CharacterEntityRuntime,
	createRendererController,
	EntityFactory,
} from "./RendererController";
import type { RendererCmd } from "./RendererProtocol";
import { createSceneMachine, type SceneMachine, type SceneMachineDeps } from "./sceneStateMachine";
import type {
	CharacterContentSession,
	RealtimeSceneConfig,
	RealtimeSceneSession,
	SceneRuntimeCoreApi,
	SceneRuntimeMode,
	ScreenPoint,
} from "./SceneRuntime";
import {
	type AnyCameraControlCmd,
	ThirdPersonCameraController,
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
	// 角色内容根：character 内容稳态下挂角色模型；切换/释放时 dispose 子树。
	let characterRoot: TransformNode | undefined;
	// 单相机：全程唯一相机，观察态静态环绕，实时态由控制器跟随，态间用 babylon 动画补间。
	let sceneCamera: ArcRotateCamera | undefined;
	let lensPipeline: LensRenderingPipeline | undefined;
	let rendererController: ReturnType<typeof createRendererController> | undefined;
	let rendererCommunication: RendererCommunication | undefined;
	let thirdPersonController: ThirdPersonCameraController | undefined;
	let defPBR: PBRMaterial | undefined;
	let activeSessionId: string | null = null;
	let _activeControllerId: string | null = null;
	// 角色内容：工厂、实体句柄、序号（防快速来回切换的异步失配，仿 acquireRealtimeSession 的 sessionId）。
	let characterFactory: EntityFactory | undefined;
	let characterEntity: CharacterEntityRuntime | undefined;
	let characterContentSeq = 0;
	// 跟随门控：仅 realtime 稳态为 true，控制器 update 才驱动相机；过渡/观察期为 false，避免与动画打架。
	let followActive = false;
	let sceneMachineActor: Actor<SceneMachine> | undefined;
	let disposed = false;
	let initializationPromise: Promise<void> | undefined;
	let apiAnnounced = false;

	// 观察位（背景相机初始姿态），过渡动画的"离开终点 / 进入起点"。
	const OBSERVE_POSE = { alpha: 1.58, beta: 1.6, radius: 3.12, target: new Vector3(0, 0.43, 0) };

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

	// ─── 单相机过渡动画 ──────────────────────────────────────────────────────────
	// 进入跟随位的固定角度/距离（与 ThirdPersonCameraController 默认一致）。
	const FOLLOW_POSE = { alpha: Math.PI / 2, beta: Math.PI / 3, radius: 8 };

	/** 把 sceneCamera 的 alpha/beta/radius/target 用 CubicEase 补间到目标姿态，完成调用 onDone，返回取消函数。 */
	const animateCameraTo = (
		dest: { alpha: number; beta: number; radius: number; target: Vector3 },
		onDone: () => void,
	): (() => void) => {
		if (!scene || !sceneCamera) {
			onDone();
			return () => {};
		}
		const camera = sceneCamera;
		const animationsEnabled = store.settings.userInterface.isAnimationEnabled;
		const durationMs = animationsEnabled ? 700 : 0;
		if (durationMs === 0) {
			camera.alpha = dest.alpha;
			camera.beta = dest.beta;
			camera.radius = dest.radius;
			camera.setTarget(dest.target.clone());
			onDone();
			return () => {};
		}
		const fps = 60;
		const frames = Math.round((durationMs / 1000) * fps);
		const ease = new CubicEase();
		ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

		const makeScalarAnim = (prop: "alpha" | "beta" | "radius", from: number, to: number) => {
			const anim = new Animation(`cam-${prop}`, prop, fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
			anim.setKeys([
				{ frame: 0, value: from },
				{ frame: frames, value: to },
			]);
			anim.setEasingFunction(ease);
			return anim;
		};
		const targetAnim = new Animation("cam-target", "target", fps, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
		targetAnim.setKeys([
			{ frame: 0, value: camera.getTarget().clone() },
			{ frame: frames, value: dest.target.clone() },
		]);
		targetAnim.setEasingFunction(ease);

		camera.animations = [
			makeScalarAnim("alpha", camera.alpha, dest.alpha),
			makeScalarAnim("beta", camera.beta, dest.beta),
			makeScalarAnim("radius", camera.radius, dest.radius),
			targetAnim,
		];
		const animatable = scene.beginAnimation(camera, 0, frames, false, 1, () => onDone());
		return () => {
			animatable.stop();
		};
	};

	// ─── 角色内容资源清理 ────────────────────────────────────────────────────────
	// 完整清理一个角色实体：动画组 / 网格 / 标签 / 纹理。仿 RendererController.disposeEntity——
	// 克隆动画组与 label 都不在 mesh 子树内（label 无 parent），只 dispose 子树会泄漏它们。
	const disposeCharacterEntity = (entity: CharacterEntityRuntime) => {
		entity.animationController.stopAllAnimations();
		entity.builtinAnimations.forEach((group) => group.dispose());
		entity.customAnimations.forEach((group) => group.dispose());
		entity.builtinAnimations.clear();
		entity.customAnimations.clear();
		entity.mesh.dispose(false, true);
		entity.label?.dispose(false, true);
		entity.labelTexture?.dispose();
	};

	// 向控制器下发"跟随实体"指令（保留当前角度）。三处入口（startFollow/setFollowTarget/followEntity）共用。
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
			if (!scene || !canvas) throw new Error("SceneRuntime is not ready");
			rendererController = createRendererController(scene);
			rendererCommunication = new RendererCommunication();
			rendererCommunication.setRenderHandler(handleRenderPayload);
			rendererCommunication.initialize(config.engine);
			const renderSnapshot = await config.engine.getRenderSnapshot(true);
			if (renderSnapshot && rendererController.applyRenderSnapshot) {
				await rendererController.applyRenderSnapshot(renderSnapshot);
			}
			rendererCommunication.markRenderSnapshotApplied();
			const initialTarget = config.initialCameraTarget
				? new Vector3(config.initialCameraTarget.x, config.initialCameraTarget.y + 1, config.initialCameraTarget.z)
				: undefined;
			// 控制器复用唯一 sceneCamera，不再 new 第二台相机。
			thirdPersonController = new ThirdPersonCameraController(scene, sceneCamera!, rendererController, {
				followEntityId: config.followEntityId,
				distance: FOLLOW_POSE.radius,
				smoothTransition: true,
				...(initialTarget ? { target: initialTarget } : {}),
			});
			// 控制器构造时会把相机 target 设到成员位；重置回观察位，让"飞入"动画从观察位起步。
			sceneCamera!.alpha = OBSERVE_POSE.alpha;
			sceneCamera!.beta = OBSERVE_POSE.beta;
			sceneCamera!.radius = OBSERVE_POSE.radius;
			sceneCamera!.setTarget(OBSERVE_POSE.target.clone());
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
			setCameraInputEnabledSignal(false);
			realtimeRoot?.getChildren().forEach((node) => {
				node.dispose();
			});
		},
		runCameraTransition: (direction, config, onDone) => {
			if (direction === "leave") {
				return animateCameraTo({ ...OBSERVE_POSE, target: OBSERVE_POSE.target.clone() }, onDone);
			}
			// enter：终点 target 取控制器当前 state（含成员位预摆），角度/距离用跟随默认。
			const followTarget = thirdPersonController?.getCameraState().target ?? OBSERVE_POSE.target;
			return animateCameraTo({ ...FOLLOW_POSE, target: followTarget.clone() }, onDone);
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
		setupCharacterContent: async (characterId) => {
			if (!scene) throw new Error("SceneRuntime is not ready");
			const seq = ++characterContentSeq;
			// 工厂常驻复用：EntityFactory 的 GLB 模板缓存是实例级，每次 new 都会重新 ImportMesh 并
			// 把隐藏模板永久留在 scene。复用同一工厂让模板只加载一次。
			characterFactory ??= new EntityFactory(scene);
			// 角色站位原点（0,0,0）；SLOT_CAMERA_POSES 围绕此原点摆位。
			const entity = await characterFactory.createCharacter(characterId, characterId, new Vector3(0, 0, 0));
			// 快速来回切换：异步加载期间若 seq 已被新请求/释放抢占，丢弃本次结果并完整清理。
			if (seq !== characterContentSeq || !characterRoot) {
				disposeCharacterEntity(entity);
				return;
			}
			// 挂到 characterRoot（修 createCharacter 未挂 root 的既有 bug）；label 不在子树内，靠 entity 句柄清理。
			entity.mesh.parent = characterRoot;
			entity.animationController.playBuiltinAnimation(BuiltinAnimationType.IDLE, { mode: "loop" });
			characterEntity = entity;
		},
		teardownCharacterContent: () => {
			// 序号自增使在途 setupCharacterContent 结果失配丢弃。
			characterContentSeq++;
			if (characterEntity) {
				disposeCharacterEntity(characterEntity);
				characterEntity = undefined;
			}
		},
		onError: (error) => log.error("场景实时会话失败", error),
	};

	// 机器状态 → 对外 SceneRuntimeMode 映射。
	const modeFromMachineState = (value: string): SceneRuntimeMode => {
		switch (value) {
			case "loading":
				return "loading";
			case "idle":
			// character 内容稳态对外复用 idle：属观察类，Nav 不隐藏、相机可被注意力机摆位。
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
			setMode(modeFromMachineState(String(snapshot.value)));
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
				displayLoadingUI: () => { },
				hideLoadingUI: () => { },
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
				// 仅 realtime 稳态驱动跟随；过渡期相机由 babylon 动画控制，避免两者打架。
				if (followActive) thirdPersonController?.update(dt);
				syncThemeMaterials();
				scene.render();
			});
			// 等到 babylon 场景真正 ready（setReady(true) 已执行）后再让 initialize 完成，
			// 否则 acquireRealtimeSession 只 await initializationPromise 时会撞上 ready() 仍为 false 的窗口。
			await new Promise<void>((resolve) => {
				scene!.executeWhenReady(() => {
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

	const acquireCharacterContent = async (characterId: string): Promise<CharacterContentSession> => {
		await initializationPromise;
		if (!ready() || !scene || !sceneMachineActor) {
			throw new Error("SceneRuntime is not ready");
		}
		const sessionId = createId();
		// 互斥由机器仲裁：idle 接受 LOAD_CHARACTER；非 idle（如 realtime/已有角色内容）时页面应先 release。
		sceneMachineActor.send({ type: "LOAD_CHARACTER", characterId });
		return {
			id: sessionId,
			release: () => {
				sceneMachineActor?.send({ type: "RELEASE_CONTENT" });
			},
		};
	};

	const api: SceneRuntimeCoreApi = {
		ready,
		mode,
		acquireRealtimeSession,
		acquireCharacterContent,
		// ── 意图层场景投影（ADR 0012）：把相机补间到槽位锚姿态 / 复位观察位 ──────────────
		// 统一相机模型（方案甲）：注意力机是 target→对焦姿态的唯一触发器，对 idle/character 稳态生效。
		// 已移除 idle-only 守卫——realtime 下注意力对焦改走 followEntity（bridge 分流），不写 target 补间，
		// 故此处补间不会与 controller target-lerp 同帧争用。animateCameraTo 是唯一补间器。
		focusCamera: (pose, onDone) => {
			if (!scene || !sceneCamera) {
				onDone();
				return () => {};
			}
			return animateCameraTo(
				{ alpha: pose.alpha, beta: pose.beta, radius: pose.radius, target: new Vector3(pose.target.x, pose.target.y, pose.target.z) },
				onDone,
			);
		},
		resetCamera: (onDone) => {
			if (!scene || !sceneCamera) {
				onDone();
				return () => {};
			}
			return animateCameraTo({ ...OBSERVE_POSE, target: OBSERVE_POSE.target.clone() }, onDone);
		},
		// realtime 内容专用：设定 followEntityId（保留当前角度），随后控制器每帧跟随。跟随是持续态，回执建议性。
		// 控制器未就绪（非 realtime 稳态）→ no-op + 立即回执。
		followEntity: (entityId, onDone) => {
			if (!thirdPersonController) {
				onDone();
				return () => {};
			}
			sendFollowCommand(entityId);
			onDone();
			return () => {};
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
			lensPipeline?.dispose();
			lensPipeline = undefined;
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
			class={`fixed left-0 top-0 z-0 h-dvh w-dvw bg-transparent transition-opacity ${ready() ? "opacity-100" : "opacity-0"
				} ${mode() === "realtime" ? "pointer-events-auto" : "pointer-events-none"}`}
		>
			当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
		</canvas>
	);
}
