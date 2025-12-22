export function stringToColor(str: string): string {
  // 预定义的颜色数组
  const colors: string[] = [];
  // 生成 14 个颜色值
  for (let i = 0; i < 15; i++) {
    const hue = Math.floor((i * (360 / 15)) % 360); // 色相值，从蓝色开始逐渐增加
    const saturation = "60%"; // 饱和度设置为 100%
    const lightness = "50%"; // 亮度设置为 50%

    // 将 HSL 颜色值转换为 CSS 格式的字符串
    const color = `hsl(${hue}, ${saturation}, ${lightness})`;

    colors.push(color);
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }

  // 将散列值映射到颜色数组的索引范围内
  const index = hash % colors.length;

  // 返回对应索引的颜色值
  return colors[index]!;
}

export function base16ToRgb(base16: string): [number, number, number] {
  const rgb = base16.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!rgb) {
    return [0, 0, 0];
  }
  return [parseInt(rgb[1], 16), parseInt(rgb[2], 16), parseInt(rgb[3], 16)];
}

export function rgbToBase16(rgb: [number, number, number]): string { 
  return `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`;
}

/**
 * 从 CSS 变量获取 RGB 值
 * CSS 变量格式为 "r g b"（空格分隔的 RGB 值）
 * @param varName CSS 变量名，如 '--primary'
 * @returns RGB 数组 [r, g, b]
 */
export function getCssColorRgb(varName: string): [number, number, number] {
  if (typeof window === 'undefined') return [0, 0, 0];
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  
  if (!value) return [0, 0, 0];
  
  const rgb = value.split(/\s+/).map(Number);
  if (rgb.length >= 3) {
    return [rgb[0]!, rgb[1]!, rgb[2]!];
  }
  
  return [0, 0, 0];
}

/**
 * RGB 数组转换为十六进制颜色字符串
 * @param rgb RGB 数组 [r, g, b]
 * @returns 十六进制颜色字符串，如 "#ff0000"
 */
export function rgbToHex(rgb: [number, number, number]): string {
  return rgbToBase16(rgb);
}

/**
 * RGB 数组转换为 rgb() CSS 字符串
 * @param rgb RGB 数组 [r, g, b]
 * @returns rgb() CSS 字符串，如 "rgb(255, 0, 0)"
 */
export function rgbToRgbString(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * RGB 数组转换为 rgba() CSS 字符串
 * @param rgb RGB 数组 [r, g, b]
 * @param alpha 透明度，范围 0-1，默认为 1
 * @returns rgba() CSS 字符串，如 "rgba(255, 0, 0, 0.5)"
 */
export function rgbToRgbaString(rgb: [number, number, number], alpha: number = 1): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * 从 CSS 变量获取十六进制颜色
 * @param varName CSS 变量名，如 '--primary'
 * @returns 十六进制颜色字符串，如 "#ffffff"
 */
export function getCssColorHex(varName: string): string {
  return rgbToHex(getCssColorRgb(varName));
}

/**
 * 从 CSS 变量获取 rgb() CSS 字符串
 * @param varName CSS 变量名，如 '--primary'
 * @returns rgb() CSS 字符串，如 "rgb(255, 255, 255)"
 */
export function getCssColorRgbString(varName: string): string {
  return rgbToRgbString(getCssColorRgb(varName));
}

/**
 * 从 CSS 变量获取 rgba() CSS 字符串
 * @param varName CSS 变量名，如 '--primary'
 * @param alpha 透明度，范围 0-1，默认为 1
 * @returns rgba() CSS 字符串，如 "rgba(255, 255, 255, 0.5)"
 */
export function getCssColorRgbaString(varName: string, alpha: number = 1): string {
  return rgbToRgbaString(getCssColorRgb(varName), alpha);
}

