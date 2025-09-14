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
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { createRendererController } from "./RendererController";
import type { EntityId } from "./RendererProtocol";
import { Portal } from "solid-js/web";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { GridMaterial, SkyMaterial } from "@babylonjs/materials";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

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
      })[store.theme],
  );
  // 场景渲染状态代替图片加载状态
  const [loaderState, setLoaderState] = createSignal(false);
  // 模型加载进度展示标签引用
  let progress!: HTMLDivElement;
  // canvas引用
  let canvas!: HTMLCanvasElement;
  // 容器引用（用于自适应）
  let container!: HTMLDivElement;
  // 引擎定义
  let engine: AbstractEngine;
  // 场景定义
  let scene: Scene;
  // 相机定义
  let camera: UniversalCamera;
  // 相机控制
  const stepX = 0.1;
  const stepZ = 0.1;
  // 鼠标控制相关参数
  const mouseSensitivity = 0.005; // 鼠标灵敏度（增加到原来的2.5倍）
  const rotationSpeed = 0.1; // 旋转速度
  const maxPitch = Math.PI / 2 - 0.1; // 最大俯仰角（防止相机翻转）
  const minPitch = -Math.PI / 2 + 0.1; // 最小俯仰角
  let isMouseControl = false;
  let targetRotationY = 0; // 目标Y轴旋转
  let targetRotationX = 0; // 目标X轴旋转
  let currentRotationY = 0; // 当前Y轴旋转
  let currentRotationX = 0; // 当前X轴旋转

  // 移动控制相关参数
  const maxSpeed = 0.3; // 最大速度
  const acceleration = 0.02; // 基础加速度
  const dragCoefficient = 0.1; // 阻力系数
  const jumpHeight = 2; // 跳跃高度
  const jumpSpeed = 0.02; // 跳跃速度
  const fallingSpeed = 0.02; // 下落速度
  const baseHeight = 1.7; // 相机基础高度

  // 运动状态（本地FPS控制器）
  let velocity = new Vector3(0, 0, 0); // 当前速度
  let isJumping = false; // 是否正在跳跃
  let jumpProgress = 0; // 跳跃进度
  let moveInput = new Vector3(0, 0, 0); // 移动输入方向
  let activeKeys = new Set<string>(); // 当前按下的按键集合

  const cameraKeyboardControl = (e: KeyboardEvent, camera: UniversalCamera) => {
    const forward = camera.getDirection(Vector3.Forward());
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();

    // 添加按键到活动集合
    activeKeys.add(e.key.toLowerCase());

    // 更新移动输入
    moveInput = Vector3.Zero();

    // 处理移动输入
    if (activeKeys.has("w")) moveInput.z += 1;
    if (activeKeys.has("s")) moveInput.z -= 1;
    if (activeKeys.has("a")) moveInput.x += 1;
    if (activeKeys.has("d")) moveInput.x -= 1;

    // 处理旋转
    if (activeKeys.has("q")) targetRotationY -= rotationSpeed;
    if (activeKeys.has("e")) targetRotationY += rotationSpeed;

    // 处理跳跃
    if (activeKeys.has(" ") && !isJumping) {
      isJumping = true;
      jumpProgress = 0;
    }
  };

  const cameraMouseControl = (e: MouseEvent, camera: UniversalCamera) => {
    if (!isMouseControl) return;
    // 计算鼠标移动增量
    const deltaX = e.movementX;
    const deltaY = e.movementY;

    // 更新目标旋转角度
    targetRotationY += deltaX * mouseSensitivity; // 改为加号，反转水平方向
    targetRotationX += deltaY * mouseSensitivity;

    // 限制俯仰角
    targetRotationX = Math.max(minPitch, Math.min(maxPitch, targetRotationX));
  };

  // 添加平滑相机旋转更新
  const updateCameraRotation = (camera: UniversalCamera) => {
    // 平滑插值当前旋转到目标旋转
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    currentRotationX += (targetRotationX - currentRotationX) * 0.1;

    // 应用旋转
    camera.rotation.y = currentRotationY;
    camera.rotation.x = currentRotationX;
  };

  // 添加平滑移动更新
  const updateCameraMovement = (camera: UniversalCamera) => {
    // 获取相机朝向
    const forward = camera.getDirection(Vector3.Forward());
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();

    // 计算目标速度方向
    const targetDirection = new Vector3(
      moveInput.x * right.x + moveInput.z * forward.x,
      0,
      moveInput.x * right.z + moveInput.z * forward.z,
    ).normalize();

    // 计算当前速度大小
    const currentSpeed = velocity.length();

    // 计算阻力（与速度成正比）
    const drag = velocity.scale(-dragCoefficient * currentSpeed);

    // 计算加速度（与速度方向相反时增加）
    const accelerationForce = targetDirection.scale(acceleration * (1 + currentSpeed / maxSpeed));

    // 更新速度（加速度 + 阻力）
    velocity.addInPlace(accelerationForce);
    velocity.addInPlace(drag);

    // 限制最大速度
    if (velocity.length() > maxSpeed) {
      velocity.normalize().scaleInPlace(maxSpeed);
    }

    // 更新位置
    camera.position.addInPlace(velocity);

    // 跳跃处理
    if (isJumping) {
      jumpProgress += jumpSpeed;
      if (jumpProgress >= 1) {
        isJumping = false;
        jumpProgress = 0;
      } else {
        // 使用正弦函数实现平滑的跳跃曲线，加上基础高度
        const jumpOffset = Math.sin(jumpProgress * Math.PI) * jumpHeight;
        camera.position.y = baseHeight + jumpOffset;
      }
    } else {
      // 非跳跃状态下，使用更慢的速度平滑回到基础高度
      camera.position.y += (baseHeight - camera.position.y) * fallingSpeed;
    }

    // 重置移动输入
    moveInput = Vector3.Zero();
  };

  // 修改键盘抬起事件处理
  const handleKeyUp = (e: KeyboardEvent) => {
    // 从活动集合中移除按键
    activeKeys.delete(e.key.toLowerCase());

    // 更新移动输入
    moveInput = Vector3.Zero();

    // 重新计算移动输入
    if (activeKeys.has("w")) moveInput.z += 1;
    if (activeKeys.has("s")) moveInput.z -= 1;
    if (activeKeys.has("a")) moveInput.x += 1;
    if (activeKeys.has("d")) moveInput.x -= 1;
  };

  // 测试模式配置函数
  // function testModelOpen() {
  //   // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
  //   void scene.debugLayer.show({
  //     // embedMode: true
  //   });
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

    // skybox
    // const envTexture = new CubeTexture("/models/skybox.dds", scene);
    // scene.createDefaultSkybox(envTexture, true, 1000);
    // -----------------------------------天空盒-----------------------------------
    const skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.turbidity = 5; //nigori
    skyboxMaterial.rayleigh = 2; //rayleigh sanran
    skyboxMaterial.luminance = 0.8; //blightness
    skyboxMaterial.inclination = 0;
    skyboxMaterial.mieCoefficient = 0.005;
    skyboxMaterial.mieDirectionalG = 0.9999;
    skyboxMaterial.azimuth = 0.2147;
    skybox.material = skyboxMaterial;

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

    // const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    // const skyboxMaterial = new StandardMaterial("skyBox", scene);
    // skyboxMaterial.backFaceCulling = false;
    // skybox.material = skyboxMaterial;

    // -----------------------------------------model--------------------------------------------

    await AppendSceneAsync("models/landscape.glb", scene);

    // 加载model
    // void SceneLoader.AppendAsync("models/", "landscape.glb", scene, (event) => {
    //   // 加载进度计算
    //   if (progress) progress.innerHTML = "加载中..." + Math.floor((event.loaded / event.total) * 100).toString();
    // }).then(() => {
    // 加载完成后的处理
    const root = scene.getMeshByName("__root__");
    if (root) {
      root.rotationQuaternion = null;
      const gridMaterial = new GridMaterial("grid", scene);
      gridMaterial.mainColor = new Color3(0, 0, 0);
      gridMaterial.lineColor = new Color3(0.2, 0.4, 1.0);
      gridMaterial.opacity = 0.98;
      gridMaterial.backFaceCulling = false;
      root.material = gridMaterial;
      scene.onBeforeRenderObservable.add(() => {
        root.position.x = Math.round(camera.position.x / stepX) * stepX;
        root.position.z = Math.round(camera.position.z / stepZ) * stepZ;
        const rotationY = camera.absoluteRotation.toEulerAngles().y - Math.PI;
        const snapAngle = Math.PI / 3;
        root.rotation.y = Math.round(rotationY / snapAngle) * snapAngle;
      });
    }
    // const ground = scene.getMeshByName("groundSubtrateLow");
    // if (ground) {
    //   NodeMaterial.ParseFromSnippetAsync("#LLUXAC", scene).then((nodeMaterial) => {
    //     ground.material = nodeMaterial;
    //     // 利用纹理深度进行碰撞
    //     let mesh = MeshBuilder.CreateGround(
    //       "collider",
    //       { width: 1, height: 1, subdivisions: 1, updatable: true },
    //       scene,
    //     );
    //     mesh.isVisible = false;
    //     mesh.checkCollisions = true;
    //     // const texture = nodeMaterial.getActiveTextures()[0];
    //     // texture.readPixels()?.then((data) => {
    //     //     function findPixel(
    //     //       textureData: number[],
    //     //       textureSize: number,
    //     //       planeSize: number,
    //     //       x: number,
    //     //       y: number
    //     //   ): number[] {
    //     //       // Convert coordinates to texture space
    //     //       let xCrd = ScalarMath.Map(x, -planeSize, planeSize, 0, textureSize);
    //     //       let yCrd = ScalarMath.Map(y, -planeSize, planeSize, 0, textureSize);
    //     //       // Determine integer and fractional parts for linear interpolation
    //     //       const x0 = Math.floor(xCrd);
    //     //       const y0 = Math.floor(yCrd);
    //     //       const dx = xCrd - x0;
    //     //       const dy = yCrd - y0;
    //     //       // Function to get pixel color, considering array boundaries
    //     //       const getPixel = (x: number, y: number): number[] => {
    //     //           const clampedX = Math.max(0, Math.min(textureSize - 1, x));
    //     //           const clampedY = Math.max(0, Math.min(textureSize - 1, y));
    //     //           const index = (clampedY * textureSize + clampedX) * 4;
    //     //           return textureData.slice(index, index + 4);
    //     //       };
    //     //       // Get color values for neighboring pixels
    //     //       const topLeft = getPixel(x0, y0);
    //     //       const topRight = getPixel(x0 + 1, y0);
    //     //       const bottomLeft = getPixel(x0, y0 + 1);
    //     //       const bottomRight = getPixel(x0 + 1, y0 + 1);
    //     //       // Linear interpolation
    //     //       const interpolate = (a: number[], b: number[], t: number) =>
    //     //           a.map((v, i) => v * (1 - t) + b[i] * t);
    //     //       // Interpolate by x between top and bottom pixels
    //     //       const top = interpolate(topLeft, topRight, dx);
    //     //       const bottom = interpolate(bottomLeft, bottomRight, dx);
    //     //       // Interpolate by y between the results
    //     //       const result = interpolate(top, bottom, dy);
    //     //       // Round values to get integer results
    //     //       return result.map(value => Math.round(value));
    //     //   }
    //     //     scene.onBeforeRenderObservable.add(() => {
    //     //       mesh.position.x = Math.round(camera!.globalPosition.x / colliderStep) * colliderStep || 0;
    //     //       mesh.position.z = Math.round(camera!.globalPosition.z / colliderStep) * colliderStep || 0;
    //     //       const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    //     //       const numberOfVertices = positions.length / 3;
    //     //       for (let i = 0; i < numberOfVertices; i++) {
    //     //         let px = findPixel(
    //     //           numberArray,
    //     //           textureSize,
    //     //           groundSize,
    //     //           positions[i * 3] + mesh.position.x,
    //     //           positions[i * 3 + 2] + mesh.position.z,
    //     //         );
    //     //         const normalizedPixelValue = ScalarMath.Map(px[0], 0, 255, 0, 1);
    //     //         positions[i * 3 + 1] = ScalarMath.Map(normalizedPixelValue, 0, 1, -elevationMin, elevationMax);
    //     //       }
    //     //       mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    //     //       mesh.refreshBoundingInfo();
    //     //     });
    //     // });
    //   });
    // }
    // });

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
      // 初始化渲染控制器
      const controller = createRendererController(scene);

      // 提供全局入口，供主线程消息调度处转发渲染指令
      (globalThis as any).__SIM_RENDER__ = (payload: any) => {
        try {
          if (!payload) return;
          if (Array.isArray(payload)) {
            controller.send(payload as any);
            return;
          }
          // 支持 { type:'render:cmd', cmd } / { type:'render:cmds', cmds }
          if (payload.type === "render:cmd" && payload.cmd) {
            controller.send(payload.cmd);
          } else if (payload.type === "render:cmds" && Array.isArray(payload.cmds)) {
            controller.send(payload.cmds);
          } else {
            // 直接当作 RendererCmd 处理
            controller.send(payload as any);
          }
        } catch (e) {
          console.warn("__SIM_RENDER__ 处理渲染指令失败", e);
        }
      };

      // 注册循环渲染函数
      engine.runRenderLoop(() => {
        const dt = engine.getDeltaTime() / 1000;
        controller.tick(dt);

        // 跟随选中实体：将相机放在目标后方，朝向目标
        if (props.followEntityId) {
          const pose = controller.getEntityPose(props.followEntityId);
          if (pose) {
            const target = new Vector3(pose.pos.x, pose.pos.y, pose.pos.z);
            const backOffset = 2.5; // 相机距离
            const heightOffset = 1.2; // 相机高度
            const nx = Math.sin(pose.yaw);
            const nz = Math.cos(pose.yaw);
            const camPos = new Vector3(target.x - nx * backOffset, target.y + heightOffset, target.z - nz * backOffset);
            camera.position.copyFrom(camPos);
            camera.setTarget(target);
          }
        }
        scene.render();
      });

      // 通知loading
      setLoaderState(true);

      // 组件卸载时清理控制器与全局入口
      // onCleanup(() => {
      //   try {
      //     if ((globalThis as any).__SIM_RENDER__) delete (globalThis as any).__SIM_RENDER__;
      //   } catch {}
      //   controller.dispose();
      // });
    });

    // 在场景渲染循环中添加相机更新（仅在未跟随实体时启用本地FPS控制）
    scene.registerBeforeRender(() => {
      if (!props.followEntityId) {
        updateCameraRotation(camera);
        updateCameraMovement(camera);
      }
    });

    // 事件绑定：保存引用以便清理
    const onMouseMove = (e: MouseEvent) => cameraMouseControl(e, camera);
    const onKeyDown = (e: KeyboardEvent) => cameraKeyboardControl(e, camera);
    const onKeyUp = (e: KeyboardEvent) => handleKeyUp(e);
    const onWinResize = () => engine.resize();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
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

    // 清理函数：事件与观察器
    // onCleanup(() => {
    //   ro.disconnect();
    //   window.removeEventListener("mousemove", onMouseMove);
    //   window.removeEventListener("keydown", onKeyDown);
    //   window.removeEventListener("keyup", onKeyUp);
    //   window.removeEventListener("resize", onWinResize);
    // });
  });

  onCleanup(() => {
    scene.dispose();
    engine.dispose();
    console.log("内存已清理");
  });

  return (
    <div ref={container!} class="relative h-full w-full">
      <canvas
        ref={canvas!}
        class="absolute inset-0 block bg-transparent"
        onClick={() => (isMouseControl = !isMouseControl)}
      >
        当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
      </canvas>
      {/* <Portal> */}
      <div
        class={`LoadingBG bg-primary-color pointer-events-none absolute inset-0 z-50 flex items-center justify-center transition-opacity ${
          !loaderState() ? "visible opacity-100" : "invisible opacity-0"
        }`}
      ></div>
      {/* </Portal> */}
    </div>
  );
}
