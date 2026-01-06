/**
 * 模块化角色系统
 * 用于创建和操作可组合的3D角色模型
 * 支持动态更换角色的头部、躯干和腿部部件
 */

// 导入 Babylon.js 核心模块
import {
	type AnimationGroup, // 动画组
	ArcRotateCamera, // 弧形旋转相机
	Color4, // 颜色类
	type Engine, // 3D引擎
	HemisphericLight, // 半球光源
	type ISceneLoaderAsyncResult, // 异步场景加载结果接口
	Scene, // 3D场景
	SceneLoader, // 场景加载器
	Vector3, // 3D向量
} from "@babylonjs/core";

/**
 * 游戏场景创建类
 * 负责初始化3D场景、相机和光照
 */
class Playground {
	/**
	 * 创建3D场景
	 * @param engine - Babylon.js引擎实例
	 * @param canvas - HTML画布元素
	 * @returns 配置好的3D场景
	 */
	public static CreateScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
		const world = new GameWorld(engine, canvas);

		// 设置光照和相机
		world.scene.clearColor = new Color4(0.2, 0.3, 0.3); // 设置场景背景色为深蓝绿色
		const camera = new ArcRotateCamera("camera", 0, 1.5, 2, new Vector3(0, 1, 0), world.scene);
		camera.wheelDeltaPercentage = 0.02; // 设置鼠标滚轮缩放灵敏度
		camera.radius = 4; // 设置相机距离目标的距离
		camera.attachControl(canvas); // 将相机控制绑定到画布

		const hemiLight = new HemisphericLight("hemi-light", new Vector3(0, 1, 0), world.scene);
		hemiLight.intensity = 0.85; // 设置光照强度

		return world.scene;
	}
}

/**
 * 游戏世界类
 * 管理整个3D世界，包括场景、角色和动画
 */
class GameWorld {
	/** 3D场景实例 */
	scene: Scene;
	/** Babylon.js引擎实例 */
	engine: Engine;
	/** HTML画布元素 */
	canvas: HTMLCanvasElement;
	/** 角色动画组数组 */
	characterAnimations: AnimationGroup[] = [];
	/** 相机实例 */
	camera: ArcRotateCamera | null = null;
	/** 鼠标位置向量 */
	mouse: Vector3 = new Vector3(0, 1, 0);

	/**
	 * 构造函数
	 * @param engine - Babylon.js引擎实例
	 * @param canvas - HTML画布元素
	 */
	constructor(engine: Engine, canvas: HTMLCanvasElement) {
		this.engine = engine;
		this.canvas = canvas;
		this.scene = new Scene(this.engine);
		this.init();
	}

	/**
	 * 初始化游戏世界
	 * 设置场景并启动渲染循环
	 */
	async init() {
		await this.initScene();

		// 启动渲染循环
		this.engine.runRenderLoop(() => {
			this.scene.render();
		});
	}

	/**
	 * 初始化场景内容
	 * 加载两个模块化角色来演示不同部件和动画的组合
	 */
	async initScene() {
		// 加载两个模块化角色来演示我们可以添加不同的
		// 部件并播放不同的动画
		const characterA = await this.loadCharacterModel(
			ASSET_PATHS.LEGS.WITCH,
			ASSET_PATHS.TORSOS.MIDIEVAL,
			ASSET_PATHS.HEADS.WITCH,
		);

		const characterB = await this.loadCharacterModel(
			ASSET_PATHS.LEGS.WITCH,
			ASSET_PATHS.TORSOS.MIDIEVAL,
			ASSET_PATHS.HEADS.MIDIEVAL,
			new Vector3(0, 0, 1), // 设置第二个角色的位置
			Math.PI / 2, // 设置第二个角色的旋转角度
		);

		// 在第二个角色上显示不同的动画
		characterB.skeleton.animationGroups[4].stop();
		characterB.skeleton.animationGroups[16].start(true);

		// 每1秒随机化部件
		setInterval(() => {
			characterA.randomizeParts();
			characterB.randomizeParts();
		}, 1000);
	}

	/**
	 * 导入网格模型
	 * 简化网格导入过程，避免重复编写长函数调用
	 * @param path - 模型文件路径
	 * @returns 异步加载的网格结果
	 */
	async importMesh(path: string) {
		return SceneLoader.ImportMeshAsync("", BASE_FILE_PATH, path, this.scene);
	}

	/**
	 * 加载角色模型
	 * 创建一个完整的模块化角色，包含骨架和所有部件
	 * @param legsPath - 腿部模型路径
	 * @param torsoPath - 躯干模型路径
	 * @param headPath - 头部模型路径
	 * @param startPosition - 起始位置，默认为原点
	 * @param startRotation - 起始旋转角度，默认为0
	 * @returns 模块化角色实例
	 */
	async loadCharacterModel(
		legsPath: string,
		torsoPath: string,
		headPath: string,
		startPosition: Vector3 = new Vector3(0, 0, 0),
		startRotation: number = 0,
	): Promise<ModularCharacter> {
		// 这是一个从Blender导出的绑定角色模型，包含单个
		// 平面网格和带有动画的骨架。Babylon不会将
		// 骨架识别为骨架，除非我们在.glb中包含至少1个网格
		const skeleton = await this.importMesh(ASSET_PATHS.SKELETONS.HUMANOID);
		// 将骨架朝向相机
		skeleton.meshes[0].rotate(Vector3.Up(), Math.PI / 2 + startRotation);
		skeleton.meshes[0].position = startPosition;

		// 使用骨架创建模块化角色对象并附加初始部件
		const modularCharacter = new ModularCharacter(this, skeleton);

		await modularCharacter.attachPart(ModularCharacterPart.Head, headPath);
		await modularCharacter.attachPart(ModularCharacterPart.Torso, torsoPath);
		await modularCharacter.attachPart(ModularCharacterPart.Legs, legsPath);

		return modularCharacter;
	}
}

/**
 * 模块化角色类
 * 管理角色的各个部件（头部、躯干、腿部）和动画
 */
class ModularCharacter {
	/** 所有部件都将附加到这个骨架上，动画将在骨架上播放 */
	skeleton: ISceneLoaderAsyncResult;
	/** 我们需要保存部件的引用，以便在切换到不同部件时能够释放它们 */
	parts: Record<ModularCharacterPart, null | ISceneLoaderAsyncResult> = {
		[ModularCharacterPart.Head]: null,
		[ModularCharacterPart.Torso]: null,
		[ModularCharacterPart.Legs]: null,
	};
	/** 我们需要世界引用，以便在生成新部件时访问场景 */
	world: GameWorld;

	/**
	 * 构造函数
	 * @param world - 游戏世界实例
	 * @param skeleton - 角色骨架
	 */
	constructor(world: GameWorld, skeleton: ISceneLoaderAsyncResult) {
		this.world = world;

		this.skeleton = skeleton;
		while (skeleton.meshes.length > 1) {
			// 我们只需要根网格来定位骨架
			// 所以我们将删除用于欺骗Babylon导入我们
			// "空"骨架的平面网格，因为我们不再需要它
			skeleton.meshes.pop()!.dispose();
		}

		// 默认动画是第0个索引的"死亡"动画，但我们
		// 更希望默认为第4个索引的"空闲"动画
		skeleton.animationGroups[0].stop();
		skeleton.animationGroups[4].start(true);
	}

	/**
	 * 附加角色部件
	 * @param partCategory - 部件类别（头部、躯干或腿部）
	 * @param partPath - 部件模型文件路径
	 */
	async attachPart(partCategory: ModularCharacterPart, partPath: string) {
		// 这个部件必须是一个文件，其中包含附加到与基础骨架相同骨架的网格
		const part = await this.world.importMesh(partPath);
		// "CharacterArmature"是Blender文件中根节点的名称
		// 我们希望新部件将其设置为父节点，以便它们跟随
		// 骨架的变换
		const parent = getTransformNodeByName(this.skeleton, "CharacterArmature");

		// 告诉Babylon获取新部件中的网格并将其骨架
		// 更改为我们的基础骨架，这样它们将被"附加"到它并跟随
		// 动画
		for (const mesh of part.meshes) {
			if (!mesh.skeleton) continue;
			mesh.skeleton = this.skeleton.skeletons[0];
			mesh.parent = parent!;
		}

		part.skeletons[0].dispose();

		// 我们必须移除旧部件，否则部件会堆叠在一起
		this.removePart(partCategory);

		// 我们需要保存部件的引用，以便在切换到不同部件时能够释放它
		this.parts[partCategory] = part;
	}

	/**
	 * 移除角色部件
	 * @param partCategory - 要移除的部件类别
	 */
	removePart(partCategory: ModularCharacterPart) {
		disposeAsyncLoadedScene(this.parts[partCategory]);
		this.parts[partCategory] = null;
	}

	/**
	 * 随机化角色部件
	 * 随机选择不同的头部、躯干和腿部部件
	 */
	async randomizeParts() {
		const newHeadPath = Math.random() > 0.5 ? ASSET_PATHS.HEADS.MIDIEVAL : ASSET_PATHS.HEADS.WITCH;
		const newTorsoPath = Math.random() > 0.5 ? ASSET_PATHS.TORSOS.MIDIEVAL : ASSET_PATHS.TORSOS.WITCH;
		const newLegsPath = Math.random() > 0.5 ? ASSET_PATHS.LEGS.MIDIEVAL : ASSET_PATHS.LEGS.WITCH;

		this.attachPart(ModularCharacterPart.Head, newHeadPath);
		this.attachPart(ModularCharacterPart.Torso, newTorsoPath);
		this.attachPart(ModularCharacterPart.Legs, newLegsPath);
	}
}

/**
 * 模块化角色部件枚举
 * 定义角色的各个可替换部件
 */
enum ModularCharacterPart {
	/** 头部部件 */
	Head,
	/** 躯干部件 */
	Torso,
	/** 腿部部件 */
	Legs,
}

/**
 * 根据名称获取变换节点
 * @param sceneResult - 场景加载结果
 * @param name - 节点名称
 * @returns 找到的变换节点或undefined
 */
function getTransformNodeByName(sceneResult: ISceneLoaderAsyncResult, name: string) {
	for (const transformNode of sceneResult.transformNodes) {
		if (transformNode.name === name) return transformNode;
	}
	return undefined;
}

/**
 * 释放异步加载的场景资源
 * 清理场景中的所有资源，防止内存泄漏
 * @param sceneResult - 要释放的场景结果
 */
function disposeAsyncLoadedScene(sceneResult: ISceneLoaderAsyncResult | null) {
	if (sceneResult === null) return;
	while (sceneResult.meshes.length) sceneResult.meshes.pop()!.dispose();
	while (sceneResult.skeletons.length) sceneResult.skeletons.pop()!.dispose();
	while (sceneResult.transformNodes.length) sceneResult.transformNodes.pop()!.dispose();
	while (sceneResult.lights.length) sceneResult.lights.pop()!.dispose();
	while (sceneResult.geometries.length) sceneResult.geometries.pop()!.dispose();
	while (sceneResult.spriteManagers.length) sceneResult.spriteManagers.pop()!.dispose();
	while (sceneResult.animationGroups.length) sceneResult.animationGroups.pop()!.dispose();
	while (sceneResult.particleSystems.length) sceneResult.particleSystems.pop()!.dispose();
}

/**
 * 资源路径配置
 * 定义所有3D模型文件的路径
 */
const ASSET_PATHS = {
	/** 骨架模型路径 */
	SKELETONS: {
		HUMANOID: "adventurer-skeleton.glb",
	},
	/** 头部模型路径 */
	HEADS: {
		WITCH: "witch-head.glb",
		MIDIEVAL: "midieval-head.glb",
	},
	/** 躯干模型路径 */
	TORSOS: {
		WITCH: "witch-torso.glb",
		MIDIEVAL: "midieval-torso.glb",
	},
	/** 腿部模型路径 */
	LEGS: {
		WITCH: "witch-legs.glb",
		MIDIEVAL: "midieval-legs.glb",
	},
};

/** 基础文件路径 - 3D模型资源的根URL */
const BASE_FILE_PATH =
	"https://raw.githubusercontent.com/SnowdenWintermute/3d-assets/main/babylon-modular-characters-pg/";
