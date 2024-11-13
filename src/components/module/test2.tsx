import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import LoadingBox from "~/components/ui/loadingBox";
import { store } from "~/store";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import * as _ from "lodash-es";
import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
import "@babylonjs/inspector"; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { NodeMaterial } from "@babylonjs/core/Materials/Node/nodeMaterial";
const model_url = "/models/landscape.glb";

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
  let camera: UniversalCamera;
  // 相机控制
  const stepX = 0.1;
  const stepZ = 0.1;
  const cameraControl = (e: KeyboardEvent, camera: UniversalCamera) => {
    const forward = camera.getDirection(Vector3.Forward());
    switch (e.key) {
      case "w": // 前进
        camera.position.addInPlace(forward.scale(stepZ));
        break;
      case "a": // 左旋转
        camera.rotation.y -= 0.01;
        break;
      case "d": // 右旋转
        camera.rotation.y += 0.01;
        break;
    }
  };

  // 测试模式配置函数
  // function testModelOpen() {
  //   // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
  //   void scene.debugLayer.show({
  //     // embedMode: true
  //   });
  //   // 世界坐标轴显示
  //   // new AxesViewer(scene, 0.1);
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
      if (store.theme === "light") {
        scene.fogColor = new Color3(0.8, 0.8, 0.8);
      } else {
        scene.fogColor = new Color3(0.3, 0.3, 0.3);
      }
    });
    // testModelOpen();

    // 摄像机
    camera = new UniversalCamera("Camera", new Vector3(0, 1, 0), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.fov = 1;
    camera.inputs.addMouseWheel();

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
      switch (store.theme) {
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
    //   switch (store.theme) {
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

    // -----------------------------------------model--------------------------------------------

    // 加载model
    void SceneLoader.AppendAsync(
      model_url.substring(0, model_url.lastIndexOf("/") + 1),
      model_url.substring(model_url.lastIndexOf("/") + 1),
      scene,
      (event) => {
        // 加载进度计算
        if (progress) progress.innerHTML = "加载中..." + Math.floor((event.loaded / event.total) * 100).toString();
      },
    ).then(() => {
      // 加载完成后的处理
      const root = scene.getMeshByName("__root__");
      if (root) {
        root.rotationQuaternion = null;
        scene.onBeforeRenderObservable.add(() => {
          root.position.x = Math.round(camera.position.x / stepX) * stepX;
          root.position.z = Math.round(camera.position.z / stepZ) * stepZ;
          const rotationY = camera.absoluteRotation.toEulerAngles().y - Math.PI;
          const snapAngle = Math.PI / 3;
          root.rotation.y = Math.round(rotationY / snapAngle) * snapAngle;
        });
      }
      const ground = scene.getMeshByName("groundSubtrateLow");
      if (ground) {
        NodeMaterial.ParseFromSnippetAsync("#LLUXAC", scene).then((nodeMaterial) => {
          ground.material = nodeMaterial;
          // 利用纹理深度进行碰撞
          let mesh = MeshBuilder.CreateGround(
            "collider",
            { width: 1, height: 1, subdivisions: 1, updatable: true },
            scene,
          );
          mesh.isVisible = false;
          mesh.checkCollisions = true;
          // const texture = nodeMaterial.getActiveTextures()[0];
          // texture.readPixels()?.then((data) => {
          // //   function findPixel(
          // //     textureData: number[],
          // //     textureSize: number,
          // //     planeSize: number,
          // //     x: number,
          // //     y: number
          // // ): number[] {
          // //     // Convert coordinates to texture space
          // //     let xCrd = ScalarMath.Map(x, -planeSize, planeSize, 0, textureSize);
          // //     let yCrd = ScalarMath.Map(y, -planeSize, planeSize, 0, textureSize);
          
          // //     // Determine integer and fractional parts for linear interpolation
          // //     const x0 = Math.floor(xCrd);
          // //     const y0 = Math.floor(yCrd);
          // //     const dx = xCrd - x0;
          // //     const dy = yCrd - y0;
          
          // //     // Function to get pixel color, considering array boundaries
          // //     const getPixel = (x: number, y: number): number[] => {
          // //         const clampedX = Math.max(0, Math.min(textureSize - 1, x));
          // //         const clampedY = Math.max(0, Math.min(textureSize - 1, y));
          // //         const index = (clampedY * textureSize + clampedX) * 4;
          // //         return textureData.slice(index, index + 4);
          // //     };
          
          // //     // Get color values for neighboring pixels
          // //     const topLeft = getPixel(x0, y0);
          // //     const topRight = getPixel(x0 + 1, y0);
          // //     const bottomLeft = getPixel(x0, y0 + 1);
          // //     const bottomRight = getPixel(x0 + 1, y0 + 1);
          
          // //     // Linear interpolation
          // //     const interpolate = (a: number[], b: number[], t: number) =>
          // //         a.map((v, i) => v * (1 - t) + b[i] * t);
          
          // //     // Interpolate by x between top and bottom pixels
          // //     const top = interpolate(topLeft, topRight, dx);
          // //     const bottom = interpolate(bottomLeft, bottomRight, dx);
          
          // //     // Interpolate by y between the results
          // //     const result = interpolate(top, bottom, dy);
          
          // //     // Round values to get integer results
          // //     return result.map(value => Math.round(value));
          // // }
          // //   scene.onBeforeRenderObservable.add(() => {
          // //     mesh.position.x = Math.round(camera!.globalPosition.x / colliderStep) * colliderStep || 0;
          // //     mesh.position.z = Math.round(camera!.globalPosition.z / colliderStep) * colliderStep || 0;

          // //     const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
          // //     const numberOfVertices = positions.length / 3;

          // //     for (let i = 0; i < numberOfVertices; i++) {
          // //       let px = findPixel(
          // //         numberArray,
          // //         textureSize,
          // //         groundSize,
          // //         positions[i * 3] + mesh.position.x,
          // //         positions[i * 3 + 2] + mesh.position.z,
          // //       );

          // //       const normalizedPixelValue = ScalarMath.Map(px[0], 0, 255, 0, 1);

          // //       positions[i * 3 + 1] = ScalarMath.Map(normalizedPixelValue, 0, 1, -elevationMin, elevationMax);
          // //     }
          // //     mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
          // //     mesh.refreshBoundingInfo();
          // //   });
          // });
        });
      }
    });

    // if (mainSpotLightShadowGenerator) {
    //   scene.meshes.forEach((mesh) => {
    //     if (mesh.getTotalVertices() > 0 && mesh.isEnabled() && mesh.name !== "__root__") {
    //       mesh.receiveShadows = true;
    //       mainSpotLightShadowGenerator.getShadowMap()?.renderList?.push(mesh);
    //       // mainSpotLightShadowGenerator.addShadowCaster(mesh, true);
    //     }
    //   });
    // }

    // 当场景中资源加载和初始化完成后
    scene.executeWhenReady(() => {
      // 注册循环渲染函数
      engine.runRenderLoop(() => {
        scene.render();
      });
      // 通知loading
      setLoaderState(true);
    });

    window.addEventListener("keydown", (e: KeyboardEvent) => cameraControl(e, camera));
    window.addEventListener("resize", () => engine.resize());
  });

  onCleanup(() => {
    scene.dispose();
    engine.dispose();
    window.removeEventListener("keydown", (e: KeyboardEvent) => cameraControl(e, camera));
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
