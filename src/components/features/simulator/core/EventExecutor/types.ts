/**
 * 表达式计算基础上下文
 *
 * 说明：
 * - 这是所有“字符串表达式”在运行时可见的最小公共字段集合
 * - 行为树 / 管线 / Buff 相关的表达式都应基于这套结构扩展，而不是各自定义一套 shape
 */
export interface ExpressionContext {
  /** 当前帧号（必填，用于基于帧的逻辑判断） */
  currentFrame: number;
  /** 施法者成员ID（通常等于 self.id） */
  casterId: string;
  /** 目标成员ID（可选） */
  targetId?: string;
  /** 技能等级（可选，用于技能表达式） */
  skillLv?: number;
  /** 环境变量（如天气、地形等） */
  environment?: any;
  /** 其他自定义变量 */
  [key: string]: any;
}

/**
 * 表达式执行结果
 */
export interface ExpressionResult {
  /** 计算结果 */
  value: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 调试信息 */
  debug?: {
    expression: string;
    variables: Record<string, any>;
    steps: string[];
  };
}
