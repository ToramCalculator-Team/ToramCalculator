import { useNavigate, useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createResource, createSignal, on, onMount, Show } from "solid-js";
import { findCharactersByPlayerId, findCharacterWithRelations } from "@db/repositories/character";
import {
  EntityFactory,
  BuiltinAnimationType,
  type CharacterEntityRuntime,
} from "~/components/features/simulator/render/RendererController";
// import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
// import "@babylonjs/inspector"; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";
import { Engine } from "@babylonjs/core/Engines/engine";
import { store } from "~/store";
import {
  AbstractEngine,
  ArcRotateCamera,
  AxesViewer,
  Color3,
  Color4,
  Scene,
  ShadowGenerator,
  SpotLight,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { Button } from "~/components/controls/button";
import { getDictionary } from "~/locales/i18n";
import { Motion } from "solid-motionone";
import Icons from "~/components/icons";
import { Select } from "~/components/controls/select";
import { LoadingBar } from "~/components/controls/loadingBar";
import { getDB } from "@db/repositories/database";

export default function CharactePage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const navigate = useNavigate();

  const params = useParams();
  const [character, { refetch: refetchCharacter }] = createResource(() =>
    findCharacterWithRelations(params.characterId),
  );

  const [characters, { refetch: refetchCharacters }] = createResource(() =>
    findCharactersByPlayerId(store.session.account?.player?.id ?? ""),
  );

  // ----------------------------------------预设内容-----------------------------------
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
  const rgb2Bcolor3 = (c: number[]) => new Color3(c[0] / 255, c[1] / 255, c[2] / 255);
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
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  // 引擎定义
  let engine: AbstractEngine;
  // 场景定义
  let scene: Scene;
  // 相机定义
  let camera: ArcRotateCamera;

  const createBabylonScene = (canvas: HTMLCanvasElement) => {
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
    scene.autoClear = false;
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
    // 测试模式配置函数
    // function testModelOpen() {
    //   // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
    //   void scene.debugLayer.show({
    //     // embedMode: true
    //   });
    //   // 世界坐标轴显示
    //   new AxesViewer(scene, 0.1);
    // }
    // testModelOpen();

    // 摄像机
    camera = new ArcRotateCamera("Camera", 1.55, 1.2, 7, new Vector3(0, 1, 0), scene);
    camera.minZ = 0.1;
    camera.fov = 1;

    // -----------------------------------光照设置------------------------------------
    // 设置顶部锥形光
    const mainSpotLight = new SpotLight(
      "mainSpotLight",
      new Vector3(0, 18, 8),
      new Vector3(0, -1, 0),
      Math.PI,
      5,
      scene,
    );
    mainSpotLight.id = "mainSpotLight";
    mainSpotLight.radius = 10;
    createEffect(() => {
      switch (store.settings.userInterface.theme) {
        case "light":
          mainSpotLight.intensity = 2000;
          break;
        case "dark":
          mainSpotLight.intensity = 1000;
          break;
      }
    });

    // 顶部锥形光的阴影发生器---------------------
    const mainSpotLightShadowGenerator = new ShadowGenerator(1024, mainSpotLight);
    mainSpotLightShadowGenerator.bias = 0.000001;
    mainSpotLightShadowGenerator.darkness = 0.1;
    mainSpotLightShadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

    // -----------------------------------------角色模型--------------------------------------------
    const factory = new EntityFactory(scene);
    let characterEntity: CharacterEntityRuntime | null = null;

    // 等待角色数据加载完成后创建角色
    createEffect(async () => {
      if (character()) {
        try {
          // 创建角色实体
          characterEntity = await factory.createCharacter(
            character()?.id ?? "unknown",
            character()?.name ?? "未命名角色",
            new Vector3(0, 0, 4),
          );

          // idle 动画已经在 createCharacter 中自动播放
          // 如果需要切换到其他动画，可以使用：
          // characterEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.WALK);
        } catch (error) {
          console.error("❌ 角色创建失败:", error);
        }
      }
    });

    // 开始渲染循环
    engine.runRenderLoop(() => {
      scene.render();
    });

    // 窗口大小调整
    const onWinResize = () => engine.resize();
    window.addEventListener("resize", onWinResize);
  };

  createEffect(
    on(
      () => canvas(),
      (c) => {
        // new Engine会重设canvas尺寸，这会导致布局重绘，然后引起视觉抖动。这里通过延迟渲染解决
        if (c) setTimeout(() => createBabylonScene(c), 10);
      },
    ),
  );

  return (
    <Show
      when={character.latest}
      fallback={
        <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
          <LoadingBar center class="h-12 w-1/2 min-w-[320px]" />
        </div>
      }
    >
      {(character) => (
        <Motion.div
          animate={{ opacity: [0, 1] }}
          exit={{ opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class="CharacterPage flex h-full w-full flex-col overflow-hidden"
        >
          <div class={`Title w-full`}>
            <Select
              value={character().name}
              setValue={(value) => {
                navigate(`/character/${value}`);
              }}
              options={characters()?.map((character) => ({ label: character.name, value: character.id })) ?? []}
              placeholder={character().name}
              styleLess
              textCenter
            />
          </div>
          <div class="Content flex h-full w-full flex-1 flex-col overflow-hidden p-6 landscape:flex-row">
            <div class="CharacterView hidden w-full flex-1 overflow-hidden portrait:block">
              <canvas ref={setCanvas} class="border-dividing-color block h-full w-full rounded-md border-1">
                当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
              </canvas>
            </div>
            <div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:hidden landscape:h-full landscape:w-[1px]"></div>
            <OverlayScrollbarsComponent
              element="div"
              options={{ scrollbars: { visibility: "hidden" } }}
              defer
              class="flex-none portrait:w-full landscape:w-fit"
            >
              <div class={`flex flex-row items-start gap-2 landscape:flex-col`}>
                <Button
                  onClick={() => console.log("连击")}
                  level="quaternary"
                  icon={<Icons.Outline.Gamepad />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  {dictionary().db.combo.selfName}
                </Button>
                <Button
                  onClick={() => console.log("装备")}
                  level="quaternary"
                  icon={<Icons.Outline.Category />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  装备
                </Button>
                <Button
                  onClick={() => console.log("消耗品")}
                  level="quaternary"
                  icon={<Icons.Outline.Sale />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  {dictionary().db.consumable.selfName}
                </Button>
                <Button
                  onClick={() => console.log("料理")}
                  level="quaternary"
                  icon={<Icons.Outline.Coupon2 />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  料理
                </Button>
                <Button
                  onClick={() => console.log("雷吉斯托环")}
                  level="quaternary"
                  icon={<Icons.Outline.CreditCard />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  雷吉斯托环
                </Button>
                <Button
                  onClick={() => console.log("技能")}
                  level="quaternary"
                  icon={<Icons.Outline.Scale />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  技能
                </Button>
                <Button
                  onClick={() => console.log("能力值")}
                  level="quaternary"
                  icon={<Icons.Outline.Filter />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  能力值
                </Button>
                <Button
                  onClick={() => console.log("基本配置")}
                  level="quaternary"
                  icon={<Icons.Outline.Edit />}
                  textAlign="left"
                  class="flex-none landscape:w-full"
                >
                  基本配置
                </Button>
              </div>
            </OverlayScrollbarsComponent>
            <div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:h-full landscape:w-[1px]"></div>
            <OverlayScrollbarsComponent
              element="div"
              options={{ scrollbars: { autoHide: "scroll" } }}
              defer
              class="flex flex-none portrait:w-full landscape:w-1/2"
            >
              <div class={`flex w-full flex-none gap-3 portrait:flex-wrap landscape:flex-col`}>
                <div class="MainHand border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border-1 landscape:w-full landscape:border-b-1">
                  <div class="Label px-4 py-3">主手</div>
                  <div class="Selector flex w-full items-center gap-2 overflow-x-hidden px-4 text-ellipsis whitespace-nowrap">
                    <Icons.Spirits iconName={character().weapon?.type ?? ""} size={24} />
                    {character().weapon?.name}
                  </div>
                  <div class="Function flex flex-none">
                    <Button icon={<Icons.Outline.Category />} level="quaternary" />
                    <Show
                      when={character().weapon}
                      fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" />}
                    >
                      <Button icon={<Icons.Outline.Trash />} level="quaternary" />
                    </Show>
                  </div>
                </div>
                <div class="SubHand border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border-1 landscape:w-full landscape:border-b-1">
                  <div class="Label px-4 py-3">副手</div>
                  <div class="Selector flex w-full items-center gap-2 overflow-x-hidden px-4 text-ellipsis whitespace-nowrap">
                    <Icons.Spirits iconName={character().subWeapon?.type ?? ""} size={24} />
                    {character().subWeapon?.name}
                  </div>
                  <div class="Function flex flex-none">
                    <Show
                      when={character().subWeapon}
                      fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" />}
                    >
                      <Button icon={<Icons.Outline.Trash />} level="quaternary" />
                    </Show>
                  </div>
                </div>
                <div class="Armor border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border-1 portrait:py-2 landscape:border-b-1">
                  <div class="Label px-4 py-3 portrait:hidden">防具</div>
                  <div class="Selector flex w-full items-center gap-2 overflow-x-hidden px-4 text-ellipsis whitespace-nowrap">
                    <Icons.Spirits iconName={character().armor?.ability ?? ""} size={24} />
                    {character().armor?.name}
                  </div>
                  <div class="Function flex flex-none">
                    <Show
                      when={character().armor}
                      fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" />}
                    >
                      <Button icon={<Icons.Outline.Trash />} level="quaternary" />
                    </Show>
                  </div>
                </div>
                <div class="OptEquip border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border-1 portrait:py-2 landscape:border-b-1">
                  <div class="Label px-4 py-3 portrait:hidden">追加</div>
                  <div class="Selector flex w-full items-center gap-2 overflow-x-hidden px-4 text-ellipsis whitespace-nowrap">
                    <Icons.Spirits iconName={"optEquip"} size={24} />
                    {character().optEquip?.name}
                  </div>
                  <div class="Function flex flex-none">
                    <Show
                      when={character().optEquip}
                      fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" />}
                    >
                      <Button icon={<Icons.Outline.Trash />} level="quaternary" />
                    </Show>
                  </div>
                </div>
                <div class="SpeEquip border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border-1 portrait:py-2 landscape:border-b-1">
                  <div class="Label px-4 py-3 portrait:hidden">特殊</div>
                  <div class="Selector flex w-full items-center gap-2 overflow-x-hidden px-4 text-ellipsis whitespace-nowrap">
                    <Icons.Spirits iconName={"speEquip"} size={24} />
                    {character().speEquip?.name}
                  </div>
                  <div class="Function flex flex-none">
                    <Show
                      when={character().speEquip}
                      fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" />}
                    >
                      <Button icon={<Icons.Outline.Trash />} level="quaternary" />
                    </Show>
                  </div>
                </div>
              </div>
            </OverlayScrollbarsComponent>
          </div>
        </Motion.div>
      )}
    </Show>
  );
}
