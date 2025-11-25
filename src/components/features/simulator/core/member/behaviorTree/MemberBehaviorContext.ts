/**
 * MemberBehaviorContext
 * 成员行为树上下文的最小接口
 * 
 * 所有成员类型（Player, Mob）的状态上下文都应该实现这个接口
 * 以便行为树节点可以通用地访问必要的字段
 */
export interface MemberBehaviorContext {
  /** 成员ID */
  id: string;
  /** 引擎引用 */
  engine: {
    getEventQueue(): {
      insert(event: {
        id: string;
        type: string;
        executeFrame: number;
        priority: string;
        payload: Record<string, unknown>;
      }): void;
    };
  };
  /** 当前帧 */
  currentFrame: number;
  /** 管线管理器引用 */
  pipelineManager: {
    run<P extends string>(
      pipelineName: P,
      ctx: any,
      params?: Record<string, unknown>,
    ): { ctx: any; stageOutputs: Record<string, any> };
  };
}

