import { JSX } from "solid-js/jsx-runtime";
import { render } from "solid-js/web/types/client.js";

export const convertJsxIconToDataUrl = (svg: JSX.Element) => {
  // 创建一个 div 容器用于装载 JSX
  const container = document.createElement("div");

  // 使用 Solid 的 JSX 元素挂载在 div 容器中
  render(() => svg, container);

  // 获取 div 中的第一个子元素，即 SVG 元素
  const svgElement = container.querySelector("svg");

  if (!svgElement) {
    throw new Error("SVG element not found");
  }

  // 使用 XMLSerializer 将 SVG 元素序列化为字符串
  const svgString = new XMLSerializer().serializeToString(svgElement);

  // 将 SVG 字符串编码为 Base64 格式的 data URL
  const encodedData = `data:image/svg+xml;base64,${btoa(svgString)}`;

  return encodedData;
};
