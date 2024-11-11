import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import LoadingBox from "~/components/ui/loadingBox";
import { store } from "~/store";
import { Material } from "@babylonjs/core/Materials/material";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import { Nullable } from "@babylonjs/core/types";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Animation } from "@babylonjs/core/Animations/animation";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
import { LensRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/lensRenderingPipeline";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import model_url from "/models/rocket.glb?url";
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
import * as _ from "lodash-es";
import { Mesh, PointLight } from "@babylonjs/core";

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

export default function BabylonBg(): JSX.Element {
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
  let progress: HTMLDivElement;
  // canvas引用
  let canvas: HTMLCanvasElement;
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
  function testModelOpen() {
    import("@babylonjs/inspector").then(() => {
      // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
      void scene.debugLayer.show({
        // embedMode: true
      });
      // 世界坐标轴显示
      // new AxesViewer(scene, 0.1);
    });
  }

  // 其他bbl内容

  onMount(() => {
    engine = new Engine(canvas, true);
    scene = new Scene(engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
    scene.ambientColor = themeColors().primary;
    testModelOpen();

    // 摄像机
    camera = new ArcRotateCamera("Camera", 1.58, 1.6, 3.12, new Vector3(0, 0.43, 0), scene);
    camera.attachControl(canvas, false);
    camera.minZ = 0.1;
    camera.fov = 1;
    camera.wheelDeltaPercentage = 0.05;
    // camera.inputs.clear(); // -----------------------------------------------------相机输入禁用-----------------------

    // 后期处理
    // new LensRenderingPipeline(
    //   "lens",
    //   {
    //     edge_blur: 1.0,
    //     chromatic_aberration: 1.0,
    //     distortion: 0.2,
    //     dof_focus_distance: 50,
    //     dof_aperture: 0.05,
    //     grain_amount: 1.0,
    //     dof_pentagon: true,
    //     dof_gain: 1.0,
    //     dof_threshold: 1.0,
    //     dof_darken: 0.125,
    //   },
    //   scene,
    //   1.0,
    //   [camera],
    // );

    // -------------------------基本mesh设置-------------------------
    const groundPBR = new PBRMaterial("groundPBR", scene);
    groundPBR.backFaceCulling = false;
    groundPBR.metallic = 0.5;
    groundPBR.environmentIntensity = 1;
    createEffect(() => {
      // groundPBR.ambientColor = themeColors().primary;
      groundPBR.albedoColor = themeColors().primary;
      if (store.theme === "light") {
        // groundPBR.emissiveColor = themeColors().primary;
      } else {
        // groundPBR.emissiveColor = new Color3(0, 0, 0);
      }
    });

    const sky = MeshBuilder.CreateSphere("sky", { diameter: 60, sideOrientation: Mesh.BACKSIDE }, scene);
    sky.material = groundPBR;

    const ground = MeshBuilder.CreateGround("ground", { width: 72, height: 72 }, scene);
    ground.material = groundPBR;
    ground.receiveShadows = true;

    // -------------------------光照设置-------------------------
    // 设置顶部锥形光
    const mainPointLight = new PointLight("mainPointLight", new Vector3(0, 20, 0), scene);
    mainPointLight.id = "mainPointLight";
    mainPointLight.radius = 10;
    createEffect(() => {
      switch (store.theme) {
        case "light":
          mainPointLight.intensity = 2000;
          break;
        case "dark":
          mainPointLight.intensity = 100;
          break;
      }
    });

    // 顶部锥形光的阴影发生器---------------------
    const mainPointLightShadowGenerator = new ShadowGenerator(1024, mainPointLight);
    mainPointLightShadowGenerator.bias = 0.000001;
    mainPointLightShadowGenerator.darkness = 0.5;
    mainPointLightShadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

    // 加载model
    // void SceneLoader.AppendAsync(
    //   model_url.substring(0, model_url.lastIndexOf('/') + 1),
    //   model_url.substring(model_url.lastIndexOf('/') + 1), scene, (event) => {
    //   // 加载进度计算
    //   if (progress) progress.innerHTML = "加载中..." + Math.floor((event.loaded / event.total) * 100).toString();
    // }).then(() => {
    //   // 加载完成后的处理
    //   const root = scene.getMeshByName("__root__");
    //   if (root) {
    //     root.position.y = 1;
    //     root.scaling = new Vector3(0.4, 0.4, 0.4);
    //   }
    //   // 材质添加
    //   scene.meshes.forEach((mesh) => {
    //     if (mesh.name === "__root__") return;
    //     // mesh.receiveShadows = true;
    //     mainPointLightShadowGenerator.addShadowCaster(mesh, true);
    //   });
    // });
    const ballPBR1 = new PBRMaterial("ballPBR1", scene);
    ballPBR1.metallic = 0;
    ballPBR1.albedoColor = themeColors().brand_1st;
    ballPBR1.environmentIntensity = 1;
    const ballPBR2 = new PBRMaterial("ballPBR2", scene);
    ballPBR2.metallic = 0;
    ballPBR2.albedoColor = themeColors().brand_2nd;
    const ballPBR3 = new PBRMaterial("ballPBR3", scene);
    ballPBR3.metallic = 0;
    ballPBR3.albedoColor = themeColors().brand_3rd;

    const particles: {
      theta: number[];
      heightValue: number[];
      rotationSpeed: number[];
      elevationSpeed: number[];
      radius: number[];
      heightRange: number;
      nbParticles: number;
      meshes: Mesh[];
    } = {
      theta: [],
      heightValue: [],
      rotationSpeed: [],
      elevationSpeed: [],
      radius: [],
      heightRange: 4,
      nbParticles: 20,
      meshes: [],
    };

    function lerpValue(x: number, y: number, target: number) {
      return x + (y - x) * target + 2;
    }

    // 创建随机球背景
    for (let p = 0; p < particles.nbParticles; p++) {
      const particle = MeshBuilder.CreateSphere(`particle${p}`, {});
      particles.meshes.push(particle);
      switch (p % 3) {
        case 0:
          particle.material = ballPBR1;
          break;
        case 1:
          particle.material = ballPBR2;
          break;
        case 2:
          particle.material = ballPBR3;
          break;
      }
      // randomize initial rotation angle and store original value
      let theta = Math.random() * Math.PI * 2;
      particles.theta.push(theta);
      particles.rotationSpeed.push(Math.random() * 0.00025 + 0.000025);
      particles.radius.push(Math.random() * 0.75 + 1.25);

      // randomize initial height and elevation speed and store original values
      let height = Math.random();
      particles.heightValue.push(height);
      particles.elevationSpeed.push(Math.random() * 0.00001 + 0.00001);

      // randomize initial scale
      let scale = Math.random() * 0.2 + 0.3;

      // set initial particle position and scale
      particle.position = new Vector3(
        particles.radius[p] * Math.sin(theta),
        lerpValue(particles.heightRange * -0.5, particles.heightRange * 0.5, height),
        particles.radius[p] * Math.cos(theta),
      );
      particle.scaling = new Vector3(scale, scale, scale);
    }

    const particlesUpdate = (particle: Mesh) => {
      const particleIdx = parseInt(particle.name.replace("particle", ""), 10);
      // increase rotation angle but keep it between 0 and 2PI
      particles.theta[particleIdx] += particles.rotationSpeed[particleIdx] * Math.sign((particleIdx % 2) - 0.5);
      if (particles.theta[particleIdx] > Math.PI * 2) particles.theta[particleIdx] -= Math.PI * 2;

      // update particle position on X-Z plane based on rotation angle
      particle.position.x = particles.radius[particleIdx] * Math.sin(particles.theta[particleIdx]);
      particle.position.z = particles.radius[particleIdx] * Math.cos(particles.theta[particleIdx]);

      // update particle height to slowly rise and fall
      particles.heightValue[particleIdx] += particles.elevationSpeed[particleIdx];
      particle.position.y = lerpValue(
        particles.heightRange * -0.5,
        particles.heightRange * 0.5,
        Math.sin((particles.heightValue[particleIdx] % 1) * Math.PI),
      );
      return particle;
    };

    scene.onBeforeRenderObservable.add(() => {
      particles.meshes.forEach((mesh) => {
        particlesUpdate(mesh);
      })
    });

    // 当场景中资源加载和初始化完成后
    scene.executeWhenReady(() => {
      // 注册循环渲染函数
      engine.runRenderLoop(() => {
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
        <div class="LoadingMask fixed left-0 top-0 h-full w-full bg-gradient-to-t from-primary-color from-10% to-primary-color-0 to-25% lg:from-5% lg:to-[25%]"></div>
        <div class="LoadingState fixed bottom-[calc(2%+67px)] left-[4dvw] flex h-fit flex-col gap-3 lg:left-[10dvw] lg:top-[97%] lg:-translate-y-full">
          <h1 ref={progress!} class="animate-pulse">
            加载中...
          </h1>
          <LoadingBox class="w-[92dvw] lg:w-[80dvw]" />
        </div>
      </div>
    </>
  );
}
