import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { LoadingBar } from "~/components/controls/loadingBar";
import { store } from "~/store";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";
import * as _ from "lodash-es";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { createRendererController } from "./RendererController";
import type { EntityId } from "./RendererProtocol";
import { rendererCommunication } from "./RendererCommunication";
import { Portal } from "solid-js/web";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Inspector } from "@babylonjs/inspector";
import {
  createThirdPersonController,
  ThirdPersonCameraController as TPSController,
} from "./ThirdPersonCameraController";

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

export function GameView(props: { followEntityId?: EntityId }): JSX.Element {
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

  // ==================== 基础变量 ====================
  const [loaderState, setLoaderState] = createSignal(false);
  let progress!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let container!: HTMLDivElement;
  let engine: AbstractEngine;
  let scene: Scene;
  let camera: ArcRotateCamera;

  // 第三人称控制器
  let thirdPersonController: TPSController;

  // 渲染控制器实例
  let rendererController: ReturnType<typeof createRendererController>;

  // 测试模式配置函数
  // async function testModelOpen() {
  //   const AxesViewer = await import("@babylonjs/core/Debug/axesViewer").then((module) => module.AxesViewer);
  //   // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
  //   Inspector.Show(scene, {});
  //   // 世界坐标轴显示
  //   new AxesViewer(scene, 0.1);
  // }

  // 主场景内容

  onMount(async () => {
    engine = new Engine(canvas, true);
    // 根据设备像素比设置缩放，确保清晰且不被拉伸
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
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
    scene.clearColor = new Color4(1, 1, 1, 1);
    createEffect(() => {
      scene.ambientColor = themeColors().primary;
    });
    // 雾
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.01;
    scene.fogStart = 16;
    scene.fogEnd = 22;
    createEffect(() => {
      if (store.settings.userInterface.theme === "light") {
        scene.fogColor = new Color3(0.8, 0.8, 0.8);
      } else {
        scene.fogColor = new Color3(0.3, 0.3, 0.3);
      }
    });
    // await testModelOpen();

    // 初始化渲染控制器
    rendererController = createRendererController(scene);

    // -----------------------------------光照设置------------------------------------
    // 设置顶部锥形光
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
      switch (store.settings.userInterface.theme) {
        case "light":
          mainSpotLight.intensity = 200;
          break;
        case "dark":
          mainSpotLight.intensity = 100;
          break;
      }
    });
    // const mainSpotLight = new PointLight("mainSpotLight", new Vector3(0, 8, 0), scene);
    // mainSpotLight.id = "mainSpotLight";
    // mainSpotLight.radius = 10;
    // createEffect(() => {
    //   switch (store.settings.userInterface.theme) {
    //     case "light":
    //       mainSpotLight.intensity = 200;
    //       break;
    //     case "dark":
    //       mainSpotLight.intensity = 100;
    //       break;
    //   }
    // });

    // 顶部锥形光的阴影发生器---------------------
    const mainSpotLightShadowGenerator = new ShadowGenerator(1024, mainSpotLight);
    mainSpotLightShadowGenerator.bias = 0.000001;
    mainSpotLightShadowGenerator.darkness = 0.1;
    mainSpotLightShadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    const skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skybox.material = skyboxMaterial;

    // -----------------------------------------model--------------------------------------------

    await AppendSceneAsync("models/landscape.glb", scene);
    console.log("landscape.glb加载完成");

    // 先初始化渲染通信，确保能接收Worker的消息
    console.log("🔧 提前初始化渲染通信", new Date().toLocaleTimeString());
      rendererCommunication.setRenderHandler((payload: any) => {
        try {
          if (!payload) return;
          if (Array.isArray(payload)) {
          rendererController.send(payload as any);
            return;
          }
          // 支持 { type:'render:cmd', cmd } / { type:'render:cmds', cmds }
          if (payload.type === "render:cmd" && payload.cmd) {
          rendererController.send(payload.cmd);
          } else if (payload.type === "render:cmds" && Array.isArray(payload.cmds)) {
          rendererController.send(payload.cmds);
          } else {
            // 直接当作 RendererCmd 处理
          rendererController.send(payload as any);
          }
        } catch (e) {
          console.error("RendererCommunication: 处理渲染指令失败", e);
        }
      });
    rendererCommunication.initialize();

    // GLB加载完成后创建第三人称相机控制器
    const thirdPersonSetup = createThirdPersonController(scene, canvas, rendererController, props.followEntityId, {
      distance: 8,
      smoothTransition: true,
    });

    camera = thirdPersonSetup.camera;
    thirdPersonController = thirdPersonSetup.controller;

    // 设置相机基础属性
    camera.minZ = 0.1;
    camera.fov = 1;

    scene.executeWhenReady(() => {
      console.log("🎭 Scene executeWhenReady 触发", new Date().toLocaleTimeString());

      // 注册循环渲染函数
      engine.runRenderLoop(() => {
        const dt = engine.getDeltaTime() / 1000;
        rendererController.tick(dt);

        // 更新第三人称相机控制器
        thirdPersonController.update(dt);

        scene.render();
      });

      // 通知loading
      setLoaderState(true);
    });

    // 窗口大小调整事件
    const onWinResize = () => engine.resize();
    window.addEventListener("resize", onWinResize);

    // 使用 ResizeObserver 自适应父容器尺寸，避免被 CSS 拉伸
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // 设置画布的实际像素尺寸与展示尺寸
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
      engine.setSize(rect.width, rect.height, true);
      engine.resize();
    });
    ro.observe(container);
    // 初始调整一次
    queueMicrotask(() => {
      const rect = container.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      engine.setSize(rect.width, rect.height, true);
      engine.resize();
    });

    // 监听来自RealtimeSimulator的相机控制事件
    const handleCameraControl = (event: CustomEvent) => {
      if (thirdPersonController && event.detail) {
        // 检查事件结构，提取正确的命令对象
        const command = event.detail.cmd || event.detail;
        
        if (command && command.type === 'camera_control') {
          thirdPersonController.handleCameraCommand(command);
        } else {
          console.warn('📹 相机控制事件格式不正确:', event.detail);
        }
      }
    };

    window.addEventListener("cameraControl", handleCameraControl as EventListener);

    // 清理函数：事件与观察器
  onCleanup(() => {
    // 清理渲染通信
    rendererCommunication.dispose();
    
    // 清理Babylon.js资源
    scene.dispose();
    engine.dispose();
    console.log("渲染器资源已清理");
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("cameraControl", handleCameraControl as EventListener);
      thirdPersonController?.dispose();
    });
  });

  return (
    <div ref={container!} class="relative h-full w-full">
      <canvas ref={canvas!} class="absolute inset-0 block bg-transparent">
        当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
      </canvas>

      {/* 加载遮罩 */}
      <div
        class={`LoadingBG bg-primary-color pointer-events-none absolute inset-0 z-50 flex items-center justify-center transition-opacity ${
          !loaderState() ? "visible opacity-100" : "invisible opacity-0"
        }`}
      ></div>
    </div>
  );
}
