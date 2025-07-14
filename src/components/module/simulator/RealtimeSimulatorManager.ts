import { createId } from '@paralleldrive/cuid2';
import { SimulatorWithRelations } from "~/repositories/simulator";
import simulationWorker from './Simulation.worker?worker&url';
import * as Comlink from 'comlink';
import type { WorkerAPIType, BattleSnapshot, WorkerMessage, WorkerResponse } from './Simulation.worker';

/**
 * 实时模拟器状态
 */
export const enum RealtimeSimulatorState {
  IDLE = 'idle',
  INITIALIZING = 'initializing', 
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING_FOR_INPUT = 'waiting_for_input',
  AUTO_PAUSED = 'auto_paused', // 自动暂停状态
  ERROR = 'error',
  DESTROYED = 'destroyed'
}

/**
 * 暂停原因枚举
 */
export const enum PauseReason {
  MANUAL = 'manual',           // 手动暂停
  PLAYER_IDLE = 'player_idle', // 玩家空闲
  WAITING_INPUT = 'waiting_input', // 等待输入
  BATTLE_END = 'battle_end',   // 战斗结束
  ERROR = 'error'             // 错误导致的暂停
}

/**
 * 暂停状态信息
 */
export interface PauseInfo {
  reason: PauseReason;
  timestamp: number;
  playerId?: string;        // 哪个玩家导致的暂停
  message?: string;         // 暂停消息
  autoResumeEnabled?: boolean; // 是否允许自动恢复
  autoResumeDelay?: number;    // 自动恢复延迟（毫秒）
}

/**
 * 玩家活动追踪
 */
interface PlayerActivity {
  playerId: string;
  lastActionTime: number;
  actionCount: number;
  isIdle: boolean;
}

/**
 * 实时数据回调接口
 */
export interface RealtimeCallbacks {
  onFrameUpdate?: (data: {
    frame: number;
    battleSnapshot: BattleSnapshot;
    events: any[];
  }) => void;
  onStateChange?: (state: RealtimeSimulatorState, data?: any) => void;
  onPlayerActionResult?: (result: {
    success: boolean;
    message: string;
    playerId: string;
    actionId: string;
  }) => void;
  onError?: (error: string) => void;
  onPauseRequest?: (reason: PauseReason, pauseInfo: PauseInfo) => void;
  onAutoResumeCountdown?: (remainingTime: number, pauseInfo: PauseInfo) => void;
  onPlayerIdleDetected?: (playerId: string, idleTime: number) => void;
}

/**
 * 暂停/恢复配置
 */
export interface PauseResumeConfig {
  playerIdleThreshold: number;    // 玩家空闲阈值（毫秒）默认30秒
  autoResumeDelay: number;        // 自动恢复延迟（毫秒）默认3秒
  enableAutoResume: boolean;      // 是否启用自动恢复
  enableIdleDetection: boolean;   // 是否启用空闲检测
  idleCheckInterval: number;      // 空闲检测间隔（毫秒）默认5秒
}

/**
 * 单Worker实时模拟器管理器
 * 
 * 专门用于实时操作模式，提供：
 * - 单Worker实例管理
 * - 通过Comlink进行实时玩家控制
 * - 智能暂停/等待输入机制
 * - 玩家空闲检测和自动暂停
 * - Promise-based API
 */
export class RealtimeSimulatorManager {
  private worker: Worker | null = null;
  private workerAPI: Comlink.Remote<WorkerAPIType> | null = null;
  private state: RealtimeSimulatorState = RealtimeSimulatorState.IDLE;
  private callbacks: RealtimeCallbacks = {};
  private simulatorData: SimulatorWithRelations | null = null;
  
  // 新增：暂停/恢复管理
  private pauseInfo: PauseInfo | null = null;
  private pauseResumeConfig: PauseResumeConfig;
  private playerActivities = new Map<string, PlayerActivity>();
  private idleCheckTimer: NodeJS.Timeout | null = null;
  private autoResumeTimer: NodeJS.Timeout | null = null;

  constructor(callbacks: RealtimeCallbacks = {}, config?: Partial<PauseResumeConfig>) {
    this.callbacks = callbacks;
    
    // 初始化暂停/恢复配置
    this.pauseResumeConfig = {
      playerIdleThreshold: 30000,     // 30秒
      autoResumeDelay: 3000,          // 3秒
      enableAutoResume: true,
      enableIdleDetection: true,
      idleCheckInterval: 5000,        // 5秒
      ...config
    };
  }

  /**
   * 初始化实时模拟器
   */
  async initialize(simulatorData?: SimulatorWithRelations): Promise<void> {
    if (this.state !== RealtimeSimulatorState.IDLE) {
      throw new Error(`无法初始化，当前状态: ${this.state}`);
    }

    this.setState(RealtimeSimulatorState.INITIALIZING);
    
    // 如果提供了数据，设置它，否则保持为null等待后续设置
    if (simulatorData) {
      this.simulatorData = simulatorData;
    }

    try {
      // 创建Worker实例并包装API
      await this.createWorkerWithComlink();
      
      // 初始化玩家活动追踪
      this.initializePlayerActivityTracking();
      
      // 如果有数据，发送初始化数据（生命周期管理仍使用传统消息）
      if (simulatorData) {
        await this.sendWorkerMessage({
          type: 'start_simulation',
          data: simulatorData
        });
      }

      this.setState(RealtimeSimulatorState.RUNNING);
      
      // 启动空闲检测
      this.startIdleDetection();
      
      console.log('实时模拟器初始化完成');

    } catch (error: any) {
      this.setState(RealtimeSimulatorState.ERROR, error.message);
      throw error;
    }
  }

  /**
   * 创建Worker并使用Comlink包装
   */
  private async createWorkerWithComlink(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 创建Worker实例
        this.worker = new Worker(simulationWorker, { type: 'module' });
        
        // 等待Worker准备就绪的临时监听器
        const readyListener = (event: MessageEvent) => {
          if (event.data && event.data.type === 'worker_ready') {
            // Worker准备就绪，移除监听器
            this.worker!.removeEventListener('message', readyListener);
            
            // 使用Comlink包装Worker API
            this.workerAPI = Comlink.wrap<WorkerAPIType>(this.worker!);
            
            // 重新设置正常的消息监听器（用于生命周期管理）
            this.worker!.onmessage = (event) => {
              this.handleWorkerMessage(event);
            };
            
            console.log('Worker和Comlink API创建成功');
            resolve();
          }
        };
        
        // 设置临时监听器等待准备就绪信号
        this.worker.addEventListener('message', readyListener);

        this.worker.onerror = (error) => {
          console.error('Worker错误:', error);
          this.setState(RealtimeSimulatorState.ERROR, error.message);
          this.callbacks.onError?.(error.message);
          reject(error);
        };

      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * 处理Worker消息（仅用于生命周期管理）
   */
  private handleWorkerMessage(event: MessageEvent<any>): void {
    const message = event.data;

    // 过滤Comlink内部消息
    if (message && typeof message === 'object') {
      // Comlink消息通常包含特定字段如 HANDLER, name, value, id 等
      if ('type' in message && message.type === 'HANDLER') {
        // 这是Comlink内部消息，忽略
        return;
      }
      
      // 其他Comlink内部消息标识
      if ('name' in message || 'value' in message || 'id' in message) {
        // 可能是Comlink消息，但检查是否是我们的业务消息
        if (!('type' in message) || !['simulation_progress', 'simulation_complete', 'simulation_paused', 'error'].includes(message.type as string)) {
          return;
        }
      }
    }

    switch (message.type) {
      case 'simulation_progress':
        // 实时帧数据更新
        this.callbacks.onFrameUpdate?.({
          frame: message.data.frame,
          battleSnapshot: message.data.battleSnapshot!,
          events: message.data.events || []
        });
        break;

      case 'simulation_paused':
        // 模拟器请求暂停（等待输入）
        // 转换字符串类型到PauseReason枚举
        const pauseReason = message.data.reason === 'player_idle' ? PauseReason.PLAYER_IDLE :
                           message.data.reason === 'waiting_input' ? PauseReason.WAITING_INPUT :
                           message.data.reason === 'manual' ? PauseReason.MANUAL :
                           PauseReason.WAITING_INPUT; // 默认值
        
        const pauseInfo: PauseInfo = {
          reason: pauseReason,
          timestamp: Date.now(),
          message: `Simulation paused: ${message.data.reason}`
        };
        
        this.setState(RealtimeSimulatorState.WAITING_FOR_INPUT, pauseInfo);
        this.pauseInfo = pauseInfo;
        this.callbacks.onPauseRequest?.(pauseReason, pauseInfo);
        break;

      case 'simulation_complete':
        // 模拟完成
        this.setState(RealtimeSimulatorState.IDLE);
        break;

      case 'error':
        // 错误处理
        this.setState(RealtimeSimulatorState.ERROR, message.data);
        this.callbacks.onError?.(message.data);
        break;

      default:
        console.warn('未知Worker消息类型:', message);
    }
  }

  /**
   * 发送玩家技能指令（使用Comlink API）
   */
  async castSkill(playerId: string, skillId: string, targetId?: string): Promise<void> {
    this.ensureRunning();
    this.ensureWorkerAPI();
    
    try {
      // 记录玩家操作
      this.recordPlayerAction(playerId);
      
      // 先获取PlayerControlAPI对象，然后调用方法
      const playerAPI = await this.workerAPI!.PlayerControlAPI;
      const result = await playerAPI.castSkill(playerId, skillId, targetId);
      
      // 生成actionId用于回调
      const actionId = createId();
      this.callbacks.onPlayerActionResult?.({
        success: result.success,
        message: result.message,
        playerId,
        actionId
      });

      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error: any) {
      const actionId = createId();
      this.callbacks.onPlayerActionResult?.({
        success: false,
        message: error.message,
        playerId,
        actionId
      });
      throw error;
    }
  }

  /**
   * 发送玩家移动指令（使用Comlink API）
   */
  async movePlayer(playerId: string, x: number, y: number): Promise<void> {
    this.ensureRunning();
    this.ensureWorkerAPI();
    
    try {
      // 记录玩家操作
      this.recordPlayerAction(playerId);
      
      // 先获取PlayerControlAPI对象，然后调用方法
      const playerAPI = await this.workerAPI!.PlayerControlAPI;
      const result = await playerAPI.movePlayer(playerId, x, y);
      
      const actionId = createId();
      this.callbacks.onPlayerActionResult?.({
        success: result.success,
        message: result.message,
        playerId,
        actionId
      });

      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error: any) {
      const actionId = createId();
      this.callbacks.onPlayerActionResult?.({
        success: false,
        message: error.message,
        playerId,
        actionId
      });
      throw error;
    }
  }

  /**
   * 停止玩家当前动作（使用Comlink API）
   */
  async stopPlayerAction(playerId: string): Promise<void> {
    this.ensureRunning();
    this.ensureWorkerAPI();
    
    try {
      // 记录玩家操作
      this.recordPlayerAction(playerId);
      
      // 先获取PlayerControlAPI对象，然后调用方法
      const playerAPI = await this.workerAPI!.PlayerControlAPI;
      const result = await playerAPI.stopPlayerAction(playerId);
      
      const actionId = createId();
      this.callbacks.onPlayerActionResult?.({
        success: result.success,
        message: result.message,
        playerId,
        actionId
      });

      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error: any) {
      const actionId = createId();
      this.callbacks.onPlayerActionResult?.({
        success: false,
        message: error.message,
        playerId,
        actionId
      });
      throw error;
    }
  }

  /**
   * 获取玩家状态（使用Comlink API）
   */
  async getPlayerState(playerId: string): Promise<any> {
    this.ensureWorkerAPI();
    const playerAPI = await this.workerAPI!.PlayerControlAPI;
    return await playerAPI.getPlayerState(playerId);
  }

  /**
   * 获取当前战斗快照（使用Comlink API）
   */
  async getCurrentBattleSnapshot(): Promise<BattleSnapshot | null> {
    try {
      this.ensureWorkerAPI();
      
      // 如果没有模拟器数据，返回fallback快照
      if (!this.simulatorData) {
        console.log('⚠️ 无模拟器数据，返回fallback快照');
        return this.createFallbackSnapshot();
      }
      
      // 获取PlayerControlAPI对象，然后调用方法
      const playerAPI = await this.workerAPI!.PlayerControlAPI;
      
      try {
        const snapshot = await playerAPI.getCurrentBattleSnapshot();
        
        // 验证返回的快照数据
        if (snapshot && typeof snapshot === 'object' && 
            typeof snapshot.frame === 'number' &&
            snapshot.camps && 
            snapshot.camps.campA && 
            snapshot.camps.campB) {
          console.log('✅ 成功获取战斗快照');
          return snapshot;
        } else {
          console.warn('⚠️ 快照数据格式不正确，使用fallback');
          return this.createFallbackSnapshot();
        }
      } catch (comlinkError) {
        console.warn('⚠️ Comlink调用失败，使用fallback快照:', comlinkError);
        return this.createFallbackSnapshot();
      }
    } catch (error) {
      console.warn('⚠️ 获取战斗快照失败，使用fallback:', error);
      return this.createFallbackSnapshot();
    }
  }

  /**
   * 设置UI回调函数（由RealtimePlayerController调用）
   */
  setUICallbacks(uiCallbacks: RealtimeCallbacks): void {
    this.callbacks = { ...this.callbacks, ...uiCallbacks };
    console.log('✅ UI回调函数已设置');
  }

  /**
   * 创建fallback快照
   */
  private createFallbackSnapshot(): BattleSnapshot {
    return {
      frame: 0,
      camps: {
        campA: { teams: {} },
        campB: { teams: {} }
      },
      events: [],
      battleStatus: {
        isEnded: false,
        winner: undefined,
        reason: undefined
      }
    };
  }

  /**
   * 手动暂停模拟
   */
  async pause(reason: PauseReason = PauseReason.MANUAL, message?: string): Promise<void> {
    if (this.state === RealtimeSimulatorState.RUNNING) {
      const pauseInfo: PauseInfo = {
        reason,
        timestamp: Date.now(),
        message: message || `Manual pause: ${reason}`,
        autoResumeEnabled: false // 手动暂停不自动恢复
      };
      
      await this.sendWorkerMessage({ type: 'pause_simulation' });
      this.setState(RealtimeSimulatorState.PAUSED, pauseInfo);
      this.pauseInfo = pauseInfo;
      this.callbacks.onPauseRequest?.(reason, pauseInfo);
      
      console.log(`⏸️ 手动暂停模拟，原因: ${reason}`);
    }
  }

  /**
   * 恢复模拟
   */
  async resume(force: boolean = false): Promise<void> {
    const canResume = this.state === RealtimeSimulatorState.PAUSED || 
                     this.state === RealtimeSimulatorState.WAITING_FOR_INPUT ||
                     this.state === RealtimeSimulatorState.AUTO_PAUSED;
    
    if (canResume || force) {
      // 停止自动恢复倒计时
      this.stopAutoResumeCountdown();
      
      await this.sendWorkerMessage({ type: 'resume_simulation' });
      this.setState(RealtimeSimulatorState.RUNNING);
      this.pauseInfo = null;
      
      console.log(`▶️ 恢复模拟，强制恢复: ${force}`);
    }
  }

  /**
   * 停止模拟
   */
  async stop(): Promise<void> {
    if (this.worker && this.state !== RealtimeSimulatorState.IDLE) {
      // 停止所有定时器
      this.stopIdleDetection();
      this.stopAutoResumeCountdown();
      
      await this.sendWorkerMessage({ type: 'stop_simulation' });
      this.setState(RealtimeSimulatorState.IDLE);
      this.pauseInfo = null;
      this.playerActivities.clear();
      
      console.log('🛑 模拟器已停止');
    }
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    // 停止所有定时器
    this.stopIdleDetection();
    this.stopAutoResumeCountdown();
    
    // 清理Comlink
    if (this.workerAPI) {
      (this.workerAPI as any)[Comlink.releaseProxy]();
      this.workerAPI = null;
    }

    // 销毁Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // 清理状态
    this.pauseInfo = null;
    this.playerActivities.clear();
    this.setState(RealtimeSimulatorState.DESTROYED);
    
    console.log('💥 实时模拟器已销毁');
  }

  /**
   * 获取当前状态
   */
  getState(): RealtimeSimulatorState {
    return this.state;
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.state === RealtimeSimulatorState.RUNNING;
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this.state === RealtimeSimulatorState.PAUSED ||
           this.state === RealtimeSimulatorState.AUTO_PAUSED ||
           this.state === RealtimeSimulatorState.WAITING_FOR_INPUT;
  }

  /**
   * 检查是否可以接收玩家输入
   */
  canAcceptInput(): boolean {
    return this.state === RealtimeSimulatorState.RUNNING || 
           this.state === RealtimeSimulatorState.WAITING_FOR_INPUT;
  }

  /**
   * 获取当前暂停信息
   */
  getPauseInfo(): PauseInfo | null {
    return this.pauseInfo;
  }

  /**
   * 获取暂停/恢复配置
   */
  getPauseResumeConfig(): PauseResumeConfig {
    return { ...this.pauseResumeConfig };
  }

  /**
   * 更新暂停/恢复配置
   */
  updatePauseResumeConfig(config: Partial<PauseResumeConfig>): void {
    this.pauseResumeConfig = { ...this.pauseResumeConfig, ...config };
    
    // 如果空闲检测设置发生变化，重新启动检测
    if ('enableIdleDetection' in config || 'idleCheckInterval' in config) {
      this.stopIdleDetection();
      if (this.state === RealtimeSimulatorState.RUNNING) {
        this.startIdleDetection();
      }
    }
    
    console.log('⚙️ 暂停/恢复配置已更新:', config);
  }

  /**
   * 获取玩家活动状态
   */
  getPlayerActivities(): Map<string, PlayerActivity> {
    return new Map(this.playerActivities);
  }

  /**
   * 强制标记玩家为活跃状态
   */
  markPlayerActive(playerId: string): void {
    this.recordPlayerAction(playerId);
  }

  /**
   * 设置状态并触发回调
   */
  private setState(newState: RealtimeSimulatorState, data?: any): void {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`实时模拟器状态变更: ${oldState} -> ${newState}`);
    this.callbacks.onStateChange?.(newState, data);
  }

  /**
   * 确保模拟器处于运行状态
   */
  private ensureRunning(): void {
    if (!this.canAcceptInput()) {
      throw new Error(`模拟器未运行，当前状态: ${this.state}`);
    }
  }

  /**
   * 确保Worker API可用
   */
  private ensureWorkerAPI(): void {
    if (!this.workerAPI) {
      throw new Error('Worker API未初始化');
    }
  }

  /**
   * 发送消息到Worker（仅用于生命周期管理）
   */
  private async sendWorkerMessage(message: WorkerMessage): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker未初始化');
    }

    this.worker.postMessage(message);
  }

  /**
   * 获取模拟器数据
   */
  getSimulatorData(): SimulatorWithRelations | null {
    return this.simulatorData;
  }

  /**
   * 设置模拟器数据（延迟设置）
   */
  async setSimulatorData(simulatorData: SimulatorWithRelations): Promise<void> {
    this.simulatorData = simulatorData;
    
    // 如果已经初始化并运行，发送数据到worker
    if (this.state === RealtimeSimulatorState.RUNNING && this.worker) {
      try {
        await this.sendWorkerMessage({
          type: 'start_simulation',
          data: simulatorData
        });
        console.log('📋 SimulatorData has been set and sent to worker');
      } catch (error) {
        console.error('❌ Failed to send simulator data to worker:', error);
        throw error;
      }
    } else {
      console.log('📋 SimulatorData has been set for RealtimeSimulatorManager');
    }
  }

  /**
   * 初始化玩家活动追踪
   */
  private initializePlayerActivityTracking(): void {
    if (!this.simulatorData) return;
    
    const now = Date.now();
    this.playerActivities.clear();
    
    // 遍历所有阵营的玩家
    [...this.simulatorData.campA, ...this.simulatorData.campB].forEach(team => {
      team.members.forEach(member => {
        // 只跟踪玩家类型的成员
        if (member.playerId) {
          this.playerActivities.set(member.id, {
            playerId: member.id,
            lastActionTime: now,
            actionCount: 0,
            isIdle: false
          });
        }
      });
    });
    
    console.log(`🎯 初始化玩家活动追踪，共${this.playerActivities.size}个玩家`);
  }

  /**
   * 启动空闲检测
   */
  private startIdleDetection(): void {
    if (!this.pauseResumeConfig.enableIdleDetection || this.idleCheckTimer) {
      return;
    }
    
    this.idleCheckTimer = setInterval(() => {
      this.checkPlayerIdle();
    }, this.pauseResumeConfig.idleCheckInterval);
    
    console.log('🔍 空闲检测已启动');
  }

  /**
   * 停止空闲检测
   */
  private stopIdleDetection(): void {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
      console.log('🔍 空闲检测已停止');
    }
  }

  /**
   * 检查玩家空闲状态
   */
  private checkPlayerIdle(): void {
    if (this.state !== RealtimeSimulatorState.RUNNING) {
      return;
    }
    
    const now = Date.now();
    
    this.playerActivities.forEach((activity, playerId) => {
      const idleTime = now - activity.lastActionTime;
      const wasIdle = activity.isIdle;
      const isNowIdle = idleTime > this.pauseResumeConfig.playerIdleThreshold;
      
      if (!wasIdle && isNowIdle) {
        // 玩家刚变为空闲状态
        activity.isIdle = true;
        console.log(`😴 检测到玩家 ${playerId} 空闲，空闲时间: ${idleTime}ms`);
        
        this.callbacks.onPlayerIdleDetected?.(playerId, idleTime);
        
        // 触发自动暂停
        this.autoPause(PauseReason.PLAYER_IDLE, {
          playerId,
          message: `Player ${playerId} has been idle for ${Math.round(idleTime / 1000)} seconds`
        });
      } else if (wasIdle && !isNowIdle) {
        // 玩家从空闲状态恢复
        activity.isIdle = false;
        console.log(`🎮 玩家 ${playerId} 从空闲状态恢复`);
      }
    });
  }

  /**
   * 记录玩家操作
   */
  private recordPlayerAction(playerId: string): void {
    const activity = this.playerActivities.get(playerId);
    if (activity) {
      activity.lastActionTime = Date.now();
      activity.actionCount += 1;
      activity.isIdle = false;
      
      // 如果当前是因为该玩家空闲而暂停，自动恢复
      if (this.pauseInfo?.reason === PauseReason.PLAYER_IDLE && 
          this.pauseInfo?.playerId === playerId) {
        this.autoResume('Player action detected');
      }
    }
  }

  /**
   * 自动暂停模拟
   */
  private async autoPause(reason: PauseReason, additionalInfo: Partial<PauseInfo> = {}): Promise<void> {
    if (this.state === RealtimeSimulatorState.RUNNING) {
      const pauseInfo: PauseInfo = {
        reason,
        timestamp: Date.now(),
        autoResumeEnabled: this.pauseResumeConfig.enableAutoResume,
        autoResumeDelay: this.pauseResumeConfig.autoResumeDelay,
        ...additionalInfo
      };
      
      this.setState(RealtimeSimulatorState.AUTO_PAUSED, pauseInfo);
      this.pauseInfo = pauseInfo;
      this.callbacks.onPauseRequest?.(reason, pauseInfo);
      console.log(`🤖 模拟器自动暂停，原因: ${reason}`, pauseInfo);

      if (this.pauseResumeConfig.enableAutoResume && pauseInfo.autoResumeEnabled !== false) {
        this.startAutoResumeCountdown();
      }
    }
  }

  /**
   * 自动恢复模拟
   */
  private async autoResume(message?: string): Promise<void> {
    if (this.state === RealtimeSimulatorState.AUTO_PAUSED) {
      this.setState(RealtimeSimulatorState.RUNNING);
      this.pauseInfo = null;
      this.callbacks.onAutoResumeCountdown?.(0, this.pauseInfo!);
      console.log(`🤖 模拟器自动恢复，原因: ${message || 'Player action detected'}`);
      this.stopAutoResumeCountdown();
    }
  }

  /**
   * 启动自动恢复倒计时
   */
  private startAutoResumeCountdown(): void {
    if (this.autoResumeTimer) {
      clearTimeout(this.autoResumeTimer);
    }

    const delay = this.pauseResumeConfig.autoResumeDelay;
    this.autoResumeTimer = setTimeout(() => {
      this.autoResume();
    }, delay);

    this.callbacks.onAutoResumeCountdown?.(delay, this.pauseInfo!);
    console.log(`🕒 模拟器将在 ${Math.round(delay / 1000)} 秒后自动恢复`);
  }

  /**
   * 停止自动恢复倒计时
   */
  private stopAutoResumeCountdown(): void {
    if (this.autoResumeTimer) {
      clearTimeout(this.autoResumeTimer);
      this.autoResumeTimer = null;
      console.log('🕒 模拟器自动恢复倒计时已停止');
    }
  }
} 