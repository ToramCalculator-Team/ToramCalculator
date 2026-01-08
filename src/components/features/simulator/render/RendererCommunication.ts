/**
 * 渲染器通信层
 * 
 * 职责：
 * - 从Worker接收渲染指令
 * - 管理渲染器生命周期
 * - 处理渲染状态同步
 */

import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";

export class RendererCommunication {
  private renderHandler: ((payload: any) => void) | null = null;
  private isInitialized = false;
  /** 保存 handler 引用，确保 on/off 使用同一个函数引用 */
  private boundHandleRenderCommand: ((data: { workerId: string; event: any }) => void) | null = null;

  // ==================== 生命周期管理 ====================
  
  /**
   * 初始化渲染通信
   */
  initialize() {
    if (this.isInitialized) {
      console.warn("RendererCommunication: 已经初始化过了", new Date().toLocaleTimeString());
      return;
    }

    // 保存 bound handler 引用，确保 on/off 使用同一个函数引用
    this.boundHandleRenderCommand = this.handleRenderCommand.bind(this);
    // 监听Worker发出的渲染指令
    realtimeSimulatorPool.on("render_cmd", this.boundHandleRenderCommand);
    
    this.isInitialized = true;
    // console.log("RendererCommunication: 初始化完成", new Date().toLocaleTimeString());
  }

  /**
   * 清理渲染通信
   */
  dispose() {
    if (!this.isInitialized) return;

    // 移除事件监听（使用保存的引用）
    if (this.boundHandleRenderCommand) {
      realtimeSimulatorPool.off("render_cmd", this.boundHandleRenderCommand);
      this.boundHandleRenderCommand = null;
    }
    
    // 清理渲染处理器
    this.renderHandler = null;
    this.isInitialized = false;
    
    // console.log("RendererCommunication: 已清理", new Date().toLocaleTimeString());
  }

  // ==================== 渲染指令处理 ====================
  
  /**
   * 设置渲染指令处理器
   * @param handler 渲染指令处理函数
   */
  setRenderHandler(handler: (payload: any) => void) {
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
   * 处理从Worker接收到的渲染指令
   */
  private handleRenderCommand(data: { workerId: string; event: any }) {
    if (!this.renderHandler) {
      console.warn("RendererCommunication: 收到渲染指令但没有设置处理器");
      return;
    }

    try {
      // 新的统一格式：渲染指令通过系统消息传递
      // data.event 包含实际的渲染指令数据
      const renderData = data.event;
      console.log("RendererCommunication: 收到渲染指令", renderData);
      // 解析不同格式的渲染指令
      if (renderData.type === "render:cmd" && renderData.cmd) {
        this.renderHandler(renderData.cmd);
      } else if (renderData.type === "render:cmds" && Array.isArray(renderData.cmds)) {
        this.renderHandler(renderData.cmds);
      } else {
        // 兼容直接传递的格式
        this.renderHandler(renderData);
      }
    } catch (error) {
      console.error("RendererCommunication: 渲染指令处理失败:", error);
    }
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
