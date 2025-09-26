import { Random } from "~/lib/utils/random";

/**
 * 数组扩展器和高效数据结构工具
 * 提供栈、队列等数据结构的高效实现
 */
export class ArrayExt {
  /**
   * 将数组打乱顺序（Fisher-Yates洗牌算法）
   * 时间复杂度: O(n)，空间复杂度: O(1)
   *
   * @param list 要打乱的数组
   * @throws {Error} 当数组为null或undefined时抛出错误
   */
  public static shuffle<T>(list: Array<T>): void {
    if (!list) {
      throw new Error("数组不能为null或undefined");
    }

    // 优化：从后往前遍历，减少一次减法运算
    for (let i = list.length - 1; i > 0; i--) {
      const j = Random.integer(0, i);
      // 使用解构赋值进行交换，更简洁
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
  }

  /**
   * 取出数组第一个项（不移除）
   * @param list 目标数组
   * @returns 第一个元素
   * @throws {Error} 当数组为空时抛出错误
   */
  public static peek<T>(list: Array<T>): T {
    if (list.length === 0) {
      throw new Error("无法从空数组中获取元素");
    }
    return list[0]!;
  }

  /**
   * 向数组头部添加一个项
   * @param list 目标数组
   * @param item 要添加的项
   */
  public static unshift<T>(list: Array<T>, item: T): void {
    list.unshift(item);
  }

  /**
   * 移除数组第一个项并返回它
   * @param list 目标数组
   * @returns 移除的元素，如果数组为空则返回undefined
   */
  public static pop<T>(list: Array<T>): T | undefined {
    return list.shift();
  }

  /**
   * 向数组尾部添加一个项
   * @param list 目标数组
   * @param item 要添加的项
   */
  public static append<T>(list: Array<T>, item: T): void {
    list.push(item);
  }

  /**
   * 移除数组最后一个项并返回它
   * @param list 目标数组
   * @returns 移除的元素，如果数组为空则返回undefined
   */
  public static removeLast<T>(list: Array<T>): T | undefined {
    return list.pop();
  }

  /**
   * 检查数组是否为空
   * @param list 目标数组
   * @returns 是否为空
   */
  public static isEmpty<T>(list: Array<T>): boolean {
    return list.length === 0;
  }

  /**
   * 获取数组大小
   * @param list 目标数组
   * @returns 数组长度
   */
  public static size<T>(list: Array<T>): number {
    return list.length;
  }

  /**
   * 清空数组
   * @param list 目标数组
   */
  public static clear<T>(list: Array<T>): void {
    list.length = 0;
  }
}
