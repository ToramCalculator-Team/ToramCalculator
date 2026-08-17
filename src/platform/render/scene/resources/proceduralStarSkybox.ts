import {
	Color3,
	MeshBuilder,
	RawCubeTexture,
	type Scene,
	StandardMaterial,
	Texture,
} from "~/platform/render/babylon/runtime";

const SKYBOX_SIZE = 1000;
const STAR_TEXTURE_SIZE = 256;
const STARS_PER_FACE = 140;
const FACE_COUNT = 6;
const CHANNEL_COUNT = 4;

/** 创建可复现的伪随机数源，使同一片星空在每次初始化时保持一致。 */
function createSeededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
	};
}

function writePixel(data: Uint8Array, x: number, y: number, brightness: number): void {
	const offset = (y * STAR_TEXTURE_SIZE + x) * CHANNEL_COUNT;
	const value = Math.max(data[offset], Math.round(brightness));
	data[offset] = value;
	data[offset + 1] = value;
	data[offset + 2] = value;
}

/**
 * 在内存中生成黑底星点立方体纹理。
 * 星点避开面边缘，避免六面独立采样产生明显的接缝亮点；较亮星点带一个像素的微弱光芒。
 */
function createStarFaces(): Uint8Array[] {
	const random = createSeededRandom(0x534b595f);
	return Array.from({ length: FACE_COUNT }, () => {
		const data = new Uint8Array(STAR_TEXTURE_SIZE * STAR_TEXTURE_SIZE * CHANNEL_COUNT);
		for (let pixel = 0; pixel < STAR_TEXTURE_SIZE * STAR_TEXTURE_SIZE; pixel++) {
			data[pixel * CHANNEL_COUNT + 3] = 255;
		}

		for (let index = 0; index < STARS_PER_FACE; index++) {
			const x = 2 + Math.floor(random() * (STAR_TEXTURE_SIZE - 4));
			const y = 2 + Math.floor(random() * (STAR_TEXTURE_SIZE - 4));
			const brightness = 150 + random() * 105;
			writePixel(data, x, y, brightness);
			if (brightness > 225) {
				const haloBrightness = brightness * 0.28;
				writePixel(data, x - 1, y, haloBrightness);
				writePixel(data, x + 1, y, haloBrightness);
				writePixel(data, x, y - 1, haloBrightness);
				writePixel(data, x, y + 1, haloBrightness);
			}
		}

		return data;
	});
}

export interface ProceduralSkybox {
	setDarkMode(darkMode: boolean): void;
	update(elapsedSeconds: number): void;
	dispose(): void;
}

/** 计算星空纹理亮度；浅色主题固定关闭，深色主题只做低幅非同步变化。 */
export function resolveStarTextureLevel(elapsedSeconds: number, darkMode: boolean): number {
	if (!darkMode) return 0;
	return 0.9 + Math.sin(elapsedSeconds * 0.47) * 0.065 + Math.sin(elapsedSeconds * 1.13 + 1.7) * 0.025;
}

/**
 * 创建不受灯光、阴影和战争迷雾影响的主题天空盒。
 * 深色模式显示内存生成的星空，浅色模式保留同一网格并切换为纯白色。
 */
export function createProceduralStarSkybox(scene: Scene): ProceduralSkybox {
	const texture = new RawCubeTexture(scene, createStarFaces(), STAR_TEXTURE_SIZE);
	texture.coordinatesMode = Texture.SKYBOX_MODE;

	const material = new StandardMaterial("world-skybox-material", scene);
	material.backFaceCulling = false;
	material.disableLighting = true;
	material.diffuseColor = Color3.Black();
	material.emissiveColor = Color3.Black();
	material.specularColor = Color3.Black();
	material.reflectionTexture = texture;

	const skybox = MeshBuilder.CreateBox("world-skybox", { size: SKYBOX_SIZE }, scene);
	skybox.material = material;
	skybox.infiniteDistance = true;
	skybox.isPickable = false;
	skybox.applyFog = false;
	skybox.receiveShadows = false;
	let darkModeEnabled = false;
	return {
		setDarkMode(darkMode) {
			darkModeEnabled = darkMode;
			const backgroundColor = darkMode ? Color3.Black() : Color3.White();
			material.diffuseColor.copyFrom(backgroundColor);
			material.emissiveColor.copyFrom(backgroundColor);
			texture.level = resolveStarTextureLevel(0, darkMode);
		},
		update(elapsedSeconds) {
			if (!darkModeEnabled) return;
			// 单纹理级别的低幅变化只更新一个材质参数，不重写天空纹理或增加额外天空层。
			texture.level = resolveStarTextureLevel(elapsedSeconds, true);
		},
		dispose() {
			skybox.dispose(false, true);
		},
	};
}
