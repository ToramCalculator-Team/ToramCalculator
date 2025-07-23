/**
 * BabylonJS 背景场景组件
 * 实现了一个3D背景场景，包含模型加载、材质管理、光照效果等功能
 * 支持主题切换，并保持与SolidJS的响应式同步
 */

import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import { LoadingBar } from "~/components/controls/loadingBar";
import { store } from "~/store";
import { Material } from "@babylonjs/core/Materials/material";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Engine } from "@babylonjs/core/Engines/engine";
import { SubMesh } from "@babylonjs/core/Meshes/subMesh";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import { PBRBaseMaterial } from "@babylonjs/core/Materials/PBR/pbrBaseMaterial";
import { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
import { Nullable } from "@babylonjs/core/types";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Animation } from "@babylonjs/core/Animations/animation";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { LensRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/lensRenderingPipeline";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { RegisterMaterialPlugin } from "@babylonjs/core/Materials/materialPluginManager";
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";

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

  prepareDefines(defines: Record<string, boolean>, scene: Scene, mesh: Mesh) {
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
    scene: Scene,
    engine: Engine,
    subMesh: SubMesh,
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

  prepareDefines(defines: MaterialDefines, scene: Scene, mesh: Mesh) {
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
    scene: Scene,
    engine: Engine,
    subMesh: SubMesh,
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

/**
 * 将RGB数组转换为BabylonJS的Color3对象
 */
const rgb2Bcolor3 = (c: number[]) => new Color3(c[0] / 255, c[1] / 255, c[2] / 255);

// ==================== 常量定义 ====================
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

// 旋转动画定义
const yRot = new Animation("yRot", "rotation.y", 1, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
yRot.setKeys([
  { frame: 0, value: 0 },
  { frame: 96, value: 2 * Math.PI },
]);

// ==================== 主组件 ====================
export function BabylonBg(): JSX.Element {
  // ==================== 状态管理 ====================
  // 主题色计算
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
      })[store.theme],
  );

  // 加载状态
  const [loaderState, setLoaderState] = createSignal(false);
  let progress!: HTMLDivElement;

  // 场景相关引用
  let canvas!: HTMLCanvasElement;
  let engine: AbstractEngine;
  let scene: Scene;
  let camera: ArcRotateCamera;
  let defPBR: PBRMaterial | undefined;

  // ==================== 事件处理 ====================
  /**
   * 相机控制处理函数
   */
  const cameraControl = (event: MouseEvent, camera: ArcRotateCamera): void => {
    if (event.buttons === 0) {
      camera.alpha -= event.movementX / 100000;
      camera.beta -= event.movementY / 100000;
    }
  };

  // ==================== 生命周期 ====================
  onMount(() => {
    // 初始化引擎
    engine = new Engine(canvas, true);
    engine.loadingScreen = {
      displayLoadingUI: (): void => {},
      hideLoadingUI: (): void => {},
      loadingUIBackgroundColor: "#000000",
      loadingUIText: "Loading...",
    };

    // 初始化场景
    scene = new Scene(engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
    scene.ambientColor = themeColors().primary;

    // 初始化相机
    camera = new ArcRotateCamera("Camera", 1.58, 1.6, 3.12, new Vector3(0, 0.43, 0), scene);
    camera.attachControl(canvas, false);
    camera.minZ = 0.1;
    camera.fov = 1;
    camera.wheelDeltaPercentage = 0.05;

    // 初始化后期处理
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

    // 初始化光照
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

    // 初始化阴影
    const shadowGenerator = new ShadowGenerator(1024, mainSpotLight);
    shadowGenerator.bias = 0.000001;
    shadowGenerator.darkness = 0.5;
    shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

    // 注册材质插件
    RegisterMaterialPlugin("VolumetricFog", (material) => {
      material.volumetricFog = new VolumetricFogPluginMaterial(material);
      return material.volumetricFog;
    });

    // 初始化粒子系统
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
    spsMesh.rotation = new Vector3((Math.PI * -1) / 12, 0, 0);
    const particlePosY: number[] = [];

    SPS.initParticles = () => {
      for (let p = 0; p < SPS.nbParticles; p++) {
        const particle = SPS.particles[p]!;
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
        particle.position.y += (0.04 * particlePosY[spsNumber - particle.idx]! + 0.025) / engine.getFps();
        particle.rotation.y += (0.05 * particlePosY[particle.idx]!) / engine.getFps();
      }
      return particle;
    };

    scene.registerAfterRender(() => {
      SPS.setParticles();
    });

    // 加载模型
    void SceneLoader.AppendAsync("/models/", "bg.glb", scene, (event) => {
      if (progress) progress.innerHTML = "加载中..." + Math.floor((event.loaded / event.total) * 100).toString();
    }).then(() => {
      const defaultMat = scene.getMaterialByName("__GLTFLoader._default");
      defaultMat && (defaultMat.backFaceCulling = false);
      if (isPBRMaterial(defaultMat)) {
        defPBR = defaultMat;
        defPBR.albedoColor = themeColors().primary;
        defPBR.ambientColor = new Color3(0.008, 0.01, 0.01);
      }

      // 设置体积雾
      const mat: VolumetricFogPluginMaterial | undefined | null =
        defPBR?.pluginManager?.getPlugin("VolumetricFog");
      if (mat) {
        mat.center = new Vector3(0, 0, -6);
        mat.isEnabled = true;
        mat.color = themeColors().primary;
        mat.radius = 8;
        mat.density = 0.5;
      }

      // 设置材质和阴影
      scene.meshes.forEach((mesh) => {
        if (mesh.name === "__root__") return;
        mesh.receiveShadows = true;
        shadowGenerator.addShadowCaster(mesh, true);
        defPBR && (mesh.material = defPBR);
      });
    });

    // 启动渲染循环
    scene.executeWhenReady(() => {
      engine.runRenderLoop(() => {
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

    // 注册事件监听
    window.addEventListener("mousemove", (e) => cameraControl(e, camera));
    window.addEventListener("resize", () => engine.resize());
  });

  // 主题色变化响应
  createEffect(() => {
    scene.ambientColor = themeColors().primary;
  });

  // 清理
  onCleanup(() => {
    scene.dispose();
    engine.dispose();
    window.removeEventListener("mousemove", (e) => cameraControl(e, camera));
    window.removeEventListener("resize", () => engine.resize());
    console.log("内存已清理");
  });

  // ==================== 渲染 ====================
  return (
    <>
      <canvas ref={canvas!} class="fixed left-0 top-0 h-dvh w-dvw bg-transparent">
        当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
      </canvas>
      <div
        class={`LoadingBG fixed left-0 top-0 z-50 h-dvh w-dvw bg-primary-color ${
          !loaderState() ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
      ></div>
      <div
        class={`LoadingPage fixed left-0 top-0 z-50 flex h-dvh w-dvw items-center justify-center bg-aeskl bg-cover bg-center ${
          !loaderState() ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
      >
        <div class="LoadingMask fixed left-0 top-0 h-full w-full bg-linear-to-t from-primary-color from-10% to-primary-color-0 to-25% lg:from-5% lg:to-25%"></div>
        <div class="LoadingState fixed bottom-[calc(2%+67px)] left-[4dvw] flex h-fit flex-col gap-3 lg:left-[10dvw] lg:top-[97%] lg:-translate-y-full">
          <h1 ref={progress!} class="animate-pulse">
            加载中...
          </h1>
          <LoadingBar class="w-[92dvw] lg:w-[80dvw]" />
        </div>
      </div>
    </>
  );
}
