/**
 * 设置canvas的大小
 * @param canvas 一个HTMLCanvasElement对象
 * @param width 宽度值，当类型为number时，将会把canvas的宽度设为该值；当值为'unset'或者不存在时，将会把canvas的宽度设为与父级一样
 * @param height 高度值，当类型为number时，将会把canvas的高度设为该值；当值为'unset'或者不存在时，将会把canvas的高度设为与父级一样
 */
export function canvasResize(canvas: HTMLCanvasElement, width?: number | string, height?: number | string): void {
  if (typeof width === "number") {
    canvas.width = width;
  } else if (width === "unset" || !width) {
    canvas.width = canvas.parentElement!.clientWidth;
  }

  if (typeof height === "number") {
    canvas.height = height;
  } else if (height === "unset" || !height) {
    canvas.height = canvas.parentElement!.clientHeight;
  }
  // console.log('canvas：' + canvas.id + '的尺寸设置完成！')
}
