import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import { LoadingBar } from "~/components/loadingBar";
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
// import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
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

declare module "@babylonjs/core" {
  interface Material {
    fogofwar?: FogOfWarPluginMaterial;
    volumetricFog?: VolumetricFogPluginMaterial;
  }
}

class FogOfWarPluginMaterial extends MaterialPluginBase {
  constructor(material: Material) {
    // last parameter is a priority, which lets you define the order multiple plugins are run.
    super(material, "FogOfWar", 200, { FogOfWar: false });

    // let's enable it by default
    this.isEnabled = true;
  }

  static fogCenter = new Vector3(1, 1, 0);

  get isEnabled() {
    return this._isEnabled;
  }

  set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  _isEnabled = false;

  // Also, you should always associate a define with your plugin because the list of defines (and their values)
  // is what triggers a recompilation of the shader: a shader is recompiled only if a value of a define changes.
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
    uniformBuffer: {
      updateVector3: (arg0: string, arg1: Vector3) => void;
    },
    scene: Scene,
    engine: Engine,
    subMesh: SubMesh,
  ) {
    if (this._isEnabled) {
      uniformBuffer.updateVector3("fogCenter", FogOfWarPluginMaterial.fogCenter);
    }
  }

  getCustomCode = (
    shaderType: string,
  ):
    | {
        // 不知道为什么不主动声明返回值类型就会推断错误
        CUSTOM_VERTEX_DEFINITIONS: string;
        CUSTOM_VERTEX_MAIN_END: string;
      }
    | {
        CUSTOM_FRAGMENT_MAIN_END: string;
        CUSTOM_FRAGMENT_DEFINITIONS: string;
      }
    | null => {
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
                  varying vec3 vWorldPos;
              `,
        CUSTOM_VERTEX_MAIN_END: `
                  vWorldPos = worldPos.xyz; 
              `,
      };
    }
    if (shaderType === "fragment") {
      // we're adding this specific code at the end of the main() function
      return {
        CUSTOM_FRAGMENT_MAIN_END: `
                  float d = length(vWorldPos.xyz - fogCenter);
                  d = (18.0 - d)/10.0;
                  gl_FragColor.rgb *= vec3(d);
              `,
        CUSTOM_FRAGMENT_DEFINITIONS: `
                  varying vec3 vWorldPos;
              `,
      };
    }
    // for other shader types we're not doing anything, return null
    return null;
  };
}

class VolumetricFogPluginMaterial extends MaterialPluginBase {
  center = new Vector3(0, 0, 0);
  radius = 3;
  color = new Color3(1, 1, 1);
  density = 4.5;
  _varColorName: string;

  get isEnabled() {
    return this._isEnabled;
  }

  set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  _isEnabled = false;

  constructor(material: Material) {
    super(material, "VolumetricFog", 500, { VOLUMETRIC_FOG: false });

    this._varColorName = material instanceof PBRBaseMaterial ? "finalColor" : "color";
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

/**
 * 判断材质是否为PBRMaterial
 * @param mat 任意类型的babylon材质
 */
function isPBRMaterial(mat: Nullable<Material>): mat is PBRMaterial {
  if (mat !== null) {
    return mat.getClassName() === "PBRMaterial";
  } else {
    return false;
  }
}

// ----------------------------------------预设内容-----------------------------------
// 主题是定义
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

// y旋转动画
const yRot = new Animation("yRot", "rotation.y", 1, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
yRot.setKeys([
  // 由于是匀速旋转动画，只有起始帧和终点帧
  {
    frame: 0,
    value: 0,
  },
  {
    frame: 96,
    value: 2 * Math.PI,
  },
]);

export function BabylonBg(): JSX.Element {
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
  // 场景渲染状态代替图片加载状态
  const [loaderState, setLoaderState] = createSignal(false);
  // 模型加载进度展示标签引用
  let progress!: HTMLDivElement;
  // 场景材质初始主色
  // new Color3(234 / 255, 249 / 255, 254 / 255).toLinearSpace();

  // canvas引用
  let canvas!: HTMLCanvasElement;
  // 引擎定义
  let engine: AbstractEngine;
  // 场景定义
  let scene: Scene;
  // 相机定义
  let camera: ArcRotateCamera;
  // 相机控制
  const cameraControl = (event: MouseEvent, camera: ArcRotateCamera): void => {
    if (event.buttons === 0) {
      camera.alpha -= event.movementX / 100000;
      camera.beta -= event.movementY / 100000;
    }
  };

  // 测试模式配置函数
  // function testModelOpen() {
  //   import("@babylonjs/inspector").then(() => {
  //     // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
  //     void scene.debugLayer.show({
  //       // embedMode: true
  //     });
  //     // 世界坐标轴显示
  //     new AxesViewer(scene, 0.1);
  //   });
  // }

  // 其他bbl内容

  onMount(() => {
    engine = new Engine(canvas, true);
    //自定义加载动画
    engine.loadingScreen = {
      displayLoadingUI: (): void => {
        // console.log('display')
      },
      hideLoadingUI: (): void => {
        // console.log('hidden')
      },
      loadingUIBackgroundColor: "#000000",
      loadingUIText: "Loading...",
    };
    scene = new Scene(engine);
    scene.clearColor = new Color4(1, 0, 0, 1);
    scene.ambientColor = themeColors().primary;
    // testModelOpen();

    // 摄像机
    camera = new ArcRotateCamera("Camera", 1.58, 1.6, 3.12, new Vector3(0, 0.43, 0), scene);
    camera.attachControl(canvas, false);
    camera.minZ = 0.1;
    camera.fov = 1;
    camera.wheelDeltaPercentage = 0.05;
    // camera.inputs.clear(); // -----------------------------------------------------相机输入禁用-----------------------

    // 后期处理
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

    // -------------------------光照设置-------------------------
    // 设置顶部锥形光
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

    // 设置椭圆形舞台锥形光
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

    // 锥形光的阴影发生器---------------------
    const shadowGenerator = new ShadowGenerator(1024, mainSpotLight);
    shadowGenerator.bias = 0.000001;
    shadowGenerator.darkness = 0.5;
    shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

    // 迷雾
    // RegisterMaterialPlugin("FogOfWar", (material) => {
    //   material.fogofwar = new FogOfWarPluginMaterial(material);
    //   return material.fogofwar;
    // });

    // 体积雾
    RegisterMaterialPlugin("VolumetricFog", (material) => {
      material.volumetricFog = new VolumetricFogPluginMaterial(material);
      return material.volumetricFog;
    });

    // 两侧柱状粒子系统
    const spsPositionL = { x: -7, y: 0, z: -6 }; // 左侧粒子柱中心坐标
    const spsPositionR = { x: 7, y: 0, z: -6 }; // 右侧粒子柱中心坐标
    const spsSizeXZ = 2; // 粒子柱宽度和厚度
    const spsSizeY = 10; // 粒子柱高度
    const spsNumber = 1000; // 粒子数

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
        // 产生随机初始y坐标
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

    SPS.initParticles(); //call the initialising function
    SPS.setParticles(); //apply the properties and display the mesh
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

    // 加载model
    void SceneLoader.AppendAsync("/models/", "bg.glb", scene, (event) => {
      // 加载进度计算
      if (progress) progress.innerHTML = "加载中..." + Math.floor((event.loaded / event.total) * 100).toString();
    }).then(() => {
      const defauleMaterial = scene.getMaterialByName("__GLTFLoader._default");
      defauleMaterial && (defauleMaterial.backFaceCulling = false);
      if (isPBRMaterial(defauleMaterial)) {
        defauleMaterial.albedoColor = themeColors().primary;
        defauleMaterial.ambientColor = new Color3(0.008, 0.01, 0.01);
      }
      // 体积雾设置
      const mat: VolumetricFogPluginMaterial | undefined | null =
        defauleMaterial?.pluginManager?.getPlugin("VolumetricFog");
      if (mat) {
        mat.center = new Vector3(0, 0, -6);
        mat.isEnabled = true;
        mat.color = themeColors().primary;
        mat.radius = 8;
        mat.density = 0.5;
      }
      // 材质添加
      scene.meshes.forEach((mesh) => {
        if (mesh.name === "__root__") return;
        mesh.receiveShadows = true;
        shadowGenerator.addShadowCaster(mesh, true);
        mesh.material = defauleMaterial;
      });
    });

    // 当场景中资源加载和初始化完成后
    scene.executeWhenReady(() => {
      // 注册循环渲染函数
      engine.runRenderLoop(() => {
        // 更新外围迷雾的中心坐标
        // FogOfWarPluginMaterial.fogCenter.x = camera.position.x;
        // FogOfWarPluginMaterial.fogCenter.y = camera.position.y;
        // FogOfWarPluginMaterial.fogCenter.z = camera.position.z;
        scene.render();
      });
      // 通知loading
      setLoaderState(true);
    });

    window.addEventListener("mousemove", (e) => cameraControl(e, camera));
    window.addEventListener("resize", () => engine.resize());
  });

  createEffect(() => {
    scene.ambientColor = themeColors().primary;
  });

  onCleanup(() => {
    scene.dispose();
    engine.dispose();
    window.removeEventListener("mousemove", (e) => cameraControl(e, camera));
    window.removeEventListener("resize", () => engine.resize());
    console.log("内存已清理");
  });

  return (
    <>
      <canvas ref={canvas!} class="fixed left-0 top-0 h-dvh w-dvw bg-transparent">
        当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
      </canvas>
      {/* <div class=" fixed left-0 top-0 -z-0 h-dvh w-dvw bg-test bg-cover opacity-10"></div> */}
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
