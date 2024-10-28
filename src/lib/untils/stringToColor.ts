export default function stringToColor(str: string): string {
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
