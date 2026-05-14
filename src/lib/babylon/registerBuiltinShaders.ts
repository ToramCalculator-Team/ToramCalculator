// Babylon 的按需包不会自动注册所有内置 shader；这里集中注册项目 glTF/RGBD 解码和阴影会用到的 shader。
// 目的：让首次进入 simulator 或打开 3D 背景时直接命中 ShaderStore，避免 Babylon 请求 shader URL 后拿到 Vite 的 HTML 回退页。
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";
import "@babylonjs/core/Shaders/shadowMap.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/depthBoxBlur.fragment";
import "@babylonjs/core/Shaders/ShadersInclude/shadowMapFragmentSoftTransparentShadow";
import "@babylonjs/core/ShadersWGSL/shadowMap.fragment";
import "@babylonjs/core/ShadersWGSL/shadowMap.vertex";
import "@babylonjs/core/ShadersWGSL/depthBoxBlur.fragment";
import "@babylonjs/core/ShadersWGSL/ShadersInclude/shadowMapFragmentSoftTransparentShadow";
