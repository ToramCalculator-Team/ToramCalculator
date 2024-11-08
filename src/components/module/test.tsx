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
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import model_url from "/models/rocket.glb?url";
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
import * as _ from "lodash-es";

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
  // 场景材质初始主色
  // new Color3(234 / 255, 249 / 255, 254 / 255).toLinearSpace();

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
    scene = new Scene(engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
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

    // -------------------------基本mesh设置-------------------------
    const groundPBR = new PBRMaterial("groundPBR", scene);
    groundPBR.ambientColor = new Color3(0.008, 0.01, 0.01);
    groundPBR.backFaceCulling = false;
    groundPBR.metallic = 0.5;
    createEffect(() => {
      groundPBR.ambientColor = themeColors().primary;
      groundPBR.albedoColor = themeColors().primary;
      if (store.theme === "light") {
        groundPBR.emissiveColor = themeColors().primary;
      } else { 
        groundPBR.emissiveColor = new Color3(0, 0, 0);
      }
    });

    const sky = MeshBuilder.CreateSphere("sky", { diameter: 200 }, scene);
    sky.material = groundPBR;

    const ground = MeshBuilder.CreateGround("ground", { width: 280, height: 280 }, scene);
    ground.material = groundPBR;
    ground.receiveShadows = true;

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
    mainSpotLight.radius = 10;
    createEffect(() => {
      console.log(store.theme);
      switch (store.theme) {
        case "light":
          mainSpotLight.intensity = 300;
          break;
        case "dark":
          mainSpotLight.intensity = 100;
          break;
      }
    });

    // 顶部锥形光的阴影发生器---------------------
    const mainSpotLightShadowGenerator = new ShadowGenerator(1024, mainSpotLight);
    mainSpotLightShadowGenerator.bias = 0.000001;
    mainSpotLightShadowGenerator.darkness = 0.5;
    mainSpotLightShadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

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
    //     mainSpotLightShadowGenerator.addShadowCaster(mesh, true);
    //   });
    // });
    const ballPBR = new PBRMaterial("ballPBR1st", scene);
    ballPBR.metallic = 0;
    ballPBR.albedoColor = themeColors().brand_1st

    // 随机运动球粒子系统
    const spsPosition = { x: 0, y: 0, z: 0 }; // 粒子柱中心坐标
    const spsSizeXZ = 20; // 粒子柱宽度和厚度
    const spsSizeY = 20; // 粒子柱高度
    const spsNumber = 20; // 粒子数

    const SPS = new SolidParticleSystem("SPS", scene);
    const particle = MeshBuilder.CreateSphere("particle", {});
    SPS.addShape(particle, spsNumber);
    particle.dispose();
    const spsMesh = SPS.buildMesh();
    spsMesh.name = "spsMesh";
    spsMesh.material = ballPBR;
    const particlePosX: number[] = [];
    const particlePosY: number[] = [];
    const particlePosZ: number[] = [];

    SPS.initParticles = () => {
      for (let p = 0; p < SPS.nbParticles; p++) {
        const particle = SPS.particles[p]!;
        // 产生随机初始y坐标
        const currX = _.random(spsPosition.x - spsSizeXZ, spsPosition.x + spsSizeXZ);
        const currY = _.random(0, spsPosition.y + spsSizeY);
        const currZ = _.random(spsPosition.z - spsSizeXZ, spsPosition.z + spsSizeXZ);
        particlePosX.push(currX);
        particlePosY.push(currY);
        particlePosZ.push(currZ);
        particle.position.x = currX;
        particle.position.z = currZ;
        particle.position.y = currY;

        const scale = Math.random() * 0.6 + 0.15;
        particle.scale.x = scale;
        particle.scale.y = scale;
        particle.scale.z = scale;

        // switch (p % 3) {
        //   case 0: particle.materialIndex
        // }
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
