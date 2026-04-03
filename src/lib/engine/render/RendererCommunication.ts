/**
 * 渲染器通信层
 * 
 * 职责：
 * - 从Worker接收渲染指令
 * - 管理渲染器生命周期
 * - 处理渲染状态同步
 */

import type { SimulationEngine } from "../core/thread/SimulationEngine";

export class RendererCommunication {
  private engine: SimulationEngine | null = null;
  private renderHandler: ((payload: unknown) => void) | null = null;
  private isInitialized = false;
  /**
   * 是否已完成首次状态同步：渲染快照应用前为 false，应用后为 true。
   * 为 true 后收到的 render_cmd 直接转发给 renderHandler；为 false 时入队缓冲。
   */
  private renderSnapshotApplied = false;
  /**
   * 同步前缓冲队列：渲染层必定晚于引擎就绪，在拉取并应用渲染快照完成之前，Worker 可能已发来多条 render_cmd。
   * 若直接执行，可能因场景尚未用渲染快照对齐而乱序、重复或冲突。因此在此段时间内将
   * 收到的指令全部 push 进 buffer，等 markRenderSnapshotApplied() 调用后按序回放给 renderHandler，
   * 再清空，之后进入实时流，避免丢失或错序执行渲染指令。
   */
  private buffer: unknown[] = [];
  /** 保存 handler 引用，确保 on/off 使用同一个函数引用 */
  private boundHandleRenderCommand: ((data: { engineId: string; cmd: unknown }) => void) | null = null;

  // ==================== 生命周期管理 ====================
  
  /**
   * 初始化渲染通信
   */
  initialize(engine: SimulationEngine) {
    if (this.isInitialized) {
      console.warn("RendererCommunication: 已经初始化过了", new Date().toLocaleTimeString());
      return;
    }

    this.engine = engine;
    this.boundHandleRenderCommand = this.handleRenderCommand.bind(this);
    engine.on("render_cmd", this.boundHandleRenderCommand);
    
    this.isInitialized = true;
    // console.log("RendererCommunication: 初始化完成", new Date().toLocaleTimeString());
  }

  /**
   * 清理渲染通信
   */
  dispose() {
    if (!this.isInitialized) return;

    // 移除事件监听（使用保存的引用）
    if (this.boundHandleRenderCommand && this.engine) {
      this.engine.off("render_cmd", this.boundHandleRenderCommand);
      this.boundHandleRenderCommand = null;
    }
    this.engine = null;

    this.buffer = [];
    this.renderSnapshotApplied = false;
    // 清理渲染处理器
    this.renderHandler = null;
    this.isInitialized = false;
  }

  // ==================== 渲染指令处理 ====================
  
  /**
   * 设置渲染指令处理器
   * @param handler 渲染指令处理函数
   */
  setRenderHandler(handler: (payload: unknown) => void) {
    this.renderHandler = handler;
    // console.log("RendererCommunication: 渲染处理器已设置", new Date().toLocaleTimeString());
  }

  /**
   * 移除渲染指令处理器
   */
  clearRenderHandler() {
    this.renderHandler = null;
    // console.log("RendererCommunication: 渲染处理器已移除");
  }

  /**
   * 处理从 Worker 接收到的渲染指令。
   * 渲染快照未应用时：只入队 buffer，不交给 renderHandler。
   * 渲染快照已应用后：直接交给 renderHandler；缓冲队列在 markRenderSnapshotApplied() 中回放。
   */
  private handleRenderCommand(data: { engineId: string; cmd: unknown }) {
    const renderData = data.cmd;
    const payload = typeof renderData === "object" && renderData !== null
      ? ((renderData as { type?: unknown; cmd?: unknown; cmds?: unknown[] }).type === "render:cmd" &&
        (renderData as { cmd?: unknown }).cmd
          ? (renderData as { cmd: unknown }).cmd
          : (renderData as { type?: unknown; cmds?: unknown[] }).type === "render:cmds" &&
              Array.isArray((renderData as { cmds?: unknown[] }).cmds)
            ? (renderData as { cmds: unknown[] }).cmds
            : renderData)
      : renderData;

    if (!this.renderSnapshotApplied) {
      this.buffer.push(payload);
      return;
    }

    if (!this.renderHandler) {
      console.warn("RendererCommunication: 收到渲染指令但没有设置处理器");
      return;
    }

    try {
      this.renderHandler(payload);
    } catch (error) {
      console.error("RendererCommunication: 渲染指令处理失败:", error);
    }
  }

  /**
   * 标记渲染快照已应用。将缓冲队列中的 render_cmd 按序回放给 renderHandler，
   * 然后清空 buffer，此后新到的指令直接实时转发，不再缓冲。
   */
  markRenderSnapshotApplied() {
    this.renderSnapshotApplied = true;
    if (!this.renderHandler) return;
    try {
      for (const payload of this.buffer) {
        this.renderHandler(payload);
      }
    } catch (error) {
      console.error("RendererCommunication: 回放缓冲指令失败:", error);
    }
    this.buffer = [];
  }

  // ==================== 状态查询 ====================
  
  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.renderHandler !== null;
  }

  /**
   * 获取渲染器状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasHandler: this.renderHandler !== null,
    };
  }
}

// ============================== 导出单例 ==============================

export const rendererCommunication = new RendererCommunication();
