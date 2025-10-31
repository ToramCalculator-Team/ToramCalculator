/**
 * @file relationConfig.ts
 * @description 关系嵌套查询断点配置
 * 用于配置在哪些关系中停止子关系的嵌套查询，避免循环引用
 * 
 * 格式说明：
 * - key: 源表名（当前正在查询的表）
 * - value: 数组，包含在该源表查询时应停止嵌套查询的子关系名称
 * 
 * 工作原理：
 * - 当查询源表时，如果某个子关系在配置的断点列表中，则该子关系不会继续查询其自己的子关系
 * - 例如：recipe → recipe_ingredient → item → recipe 的循环
 * 
 * 配置示例：
 * - 如果你想在 recipe 查询 recipe_ingredient 时停止，recipe_ingredient 不会再往下查询：
 *   recipe: ["recipe_ingredient"]
 * 
 * - 如果你想在 recipe_ingredient 查询 item 时停止，item 不会再往下查询：
 *   recipe_ingredient: ["item"]
 * 
 * 注意：配置的是"在哪个源表的关系中断开"，不是"在哪个目标表停止"
 */
export const RELATION_BREAK_POINTS: Record<string, string[]> = {
  // 示例：recipe → recipe_ingredient → item → recipe 的循环
  // 场景：查询 recipe 时，希望只查询到 item，item 不再往下查询（避免循环引用）
  // 配置：在 recipe_ingredient 查询 item 时停止，item 不会再继续查询其子关系
    recipe_ingredient: ["item"],
    user: ["sessions"],
    account: ["user"]
};

