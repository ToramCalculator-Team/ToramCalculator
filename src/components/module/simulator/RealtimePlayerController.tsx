import { createSignal, Show, For, onMount, onCleanup, createEffect, createMemo } from "solid-js";
import { Button } from "~/components/controls/button";
import { 
  RealtimeSimulatorManager, 
  RealtimeSimulatorState, 
  PauseReason,
  type PauseInfo,
  type RealtimeCallbacks,
  type PauseResumeConfig
} from "./RealtimeSimulatorManager";
import type { BattleSnapshot } from "./Simulation.worker";

/**
 * 玩家状态接口（用于显示）
 */
interface PlayerDisplayState {
  id: string;
  name: string;
  position: { x: number; y: number };
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  isDead: boolean;
  canAct: boolean;
  isActive: boolean;
}

/**
 * 技能信息接口
 */
interface SkillInfo {
  id: string;
  name: string;
  type: 'attack' | 'magic' | 'heal' | 'buff' | 'debuff';
  cooldown: number;
  mpCost: number;
}

/**
 * 实时玩家控制器组件Props
 */
interface RealtimePlayerControllerProps {
  manager: RealtimeSimulatorManager;
}

/**
 * 创建测试用的模拟器数据
 */
function createTestSimulatorData(): any {
  return {
    id: "test-simulator-1",
    name: "测试模拟器",
    description: "用于测试实时模式的模拟器数据",
    statisticId: "test-statistic-1",
    updatedAt: new Date(),
    createdAt: new Date(),
    // 简化的数据结构，只包含必要字段
    statistic: {
      id: "test-statistic-1",
      // 其他统计字段可以为空或默认值
    },
    campA: [
      {
        id: "team-a-1",
        name: "玩家队伍",
        members: [
          {
            id: "player-1",
            name: "测试玩家1",
            position: { x: 0, y: 0 },
            currentHp: 100,
            maxHp: 100,
            currentMp: 50,
            maxMp: 50,
            isDead: false,
            canAct: true,
            isActive: true
          }
        ]
      }
    ],
    campB: [
      {
        id: "team-b-1", 
        name: "敌方队伍",
        members: [
          {
            id: "enemy-1",
            name: "测试敌人1",
            position: { x: 10, y: 0 },
            currentHp: 80,
            maxHp: 80,
            currentMp: 30,
            maxMp: 30,
            isDead: false,
            canAct: true,
            isActive: false
          }
        ]
      }
    ]
  };
}

/**
 * 实时玩家控制器组件
 * 
 * 提供基于RealtimeSimulatorManager的实时操作界面：
 * - 玩家控制（技能、移动、停止）
 * - 暂停/恢复管理  
 * - 玩家活动状态显示
 * - 实时战斗快照展示
 */
export function RealtimePlayerController(props: RealtimePlayerControllerProps) {
  // 状态信号
  const [currentSnapshot, setCurrentSnapshot] = createSignal<BattleSnapshot | null>(null);
  const [selectedPlayer, setSelectedPlayer] = createSignal<string | null>(null);
  const [selectedSkill, setSelectedSkill] = createSignal<string>('normal_attack');
  const [moveTarget, setMoveTarget] = createSignal({ x: 0, y: 0 });
  const [isControlling, setIsControlling] = createSignal(false);
  const [controlHistory, setControlHistory] = createSignal<string[]>([]);
  
  // 暂停/恢复相关状态
  const [currentPauseInfo, setCurrentPauseInfo] = createSignal<PauseInfo | null>(null);
  const [autoResumeCountdown, setAutoResumeCountdown] = createSignal<number>(0);
  const [playerActivities, setPlayerActivities] = createSignal(new Map());
  
  // 配置状态
  const [config, setConfig] = createSignal<PauseResumeConfig>(props.manager.getPauseResumeConfig());

  // 模拟技能数据
  const availableSkills: SkillInfo[] = [
    { id: 'normal_attack', name: '普通攻击', type: 'attack', cooldown: 1000, mpCost: 0 },
    { id: 'fireball', name: '火球术', type: 'magic', cooldown: 2000, mpCost: 20 },
    { id: 'heal', name: '治疗', type: 'heal', cooldown: 3000, mpCost: 15 },
    { id: 'lightning', name: '闪电', type: 'magic', cooldown: 1500, mpCost: 25 },
    { id: 'shield', name: '护盾', type: 'buff', cooldown: 5000, mpCost: 10 },
  ];

  // 组件挂载时的初始化
  onMount(async () => {
    console.log('🎮 RealtimePlayerController mounted');

    // 设置测试模拟器数据（如果manager还没有数据）
    try {
      if (!props.manager.getSimulatorData()) {
        const testData = createTestSimulatorData();
        await props.manager.setSimulatorData(testData);
        console.log('📋 已设置测试模拟器数据');
      } else {
        console.log('📋 模拟器数据已存在');
      }
    } catch (error) {
      console.warn('⚠️ 设置测试模拟器数据失败:', error);
    }

    // 只有当 manager 已初始化时才尝试获取快照
    if (props.manager.getState() !== RealtimeSimulatorState.IDLE) {
      try {
        const initialSnapshot = await props.manager.getCurrentBattleSnapshot();
        if (initialSnapshot) {
          setCurrentSnapshot(initialSnapshot);
          console.log('✅ 成功获取初始战斗快照');
        } else {
          console.log('ℹ️ 初始战斗快照为空，使用fallback数据');
          // 使用fallback快照
          setCurrentSnapshot({
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
          });
        }
      } catch (error) {
        console.warn('⚠️ 获取初始战斗快照失败，使用fallback数据:', error);
        // 设置fallback快照，确保UI有基础数据显示
        setCurrentSnapshot({
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
        });
      }
    }

    // 注意：manager的回调函数已经在simulator.tsx中设置，
    // 这里我们只需要处理UI状态更新
    console.log('回调函数已准备就绪');

    // 设置UI特定的回调函数
    const uiCallbacks: RealtimeCallbacks = {
      onFrameUpdate: (data) => {
        console.log(`🎬 Frame update: ${data.frame}`);
        
        // 安全地更新快照
        try {
          if (data.battleSnapshot) {
            // 验证快照数据的完整性
            const snapshot = data.battleSnapshot;
            if (snapshot && typeof snapshot === 'object' && 
                snapshot.frame !== undefined && 
                snapshot.camps && 
                snapshot.camps.campA && 
                snapshot.camps.campB) {
              setCurrentSnapshot(snapshot);
            } else {
              console.warn('⚠️ 快照数据格式不正确，跳过更新');
            }
          } else {
            console.log('ℹ️ 无快照数据，保持当前状态');
          }
        } catch (error) {
          console.error('❌ 更新快照失败:', error);
          // 不更新快照，保持当前状态
        }
        
        // 安全地更新玩家活动状态
        try {
          const activities = props.manager.getPlayerActivities();
          if (activities) {
            setPlayerActivities(activities);
          }
        } catch (activityError) {
          console.warn('⚠️ 获取玩家活动失败:', activityError);
        }
      },
      
      onPauseRequest: (reason, pauseInfo) => {
        console.log(`⏸️ Pause requested: ${reason}`, pauseInfo);
        setCurrentPauseInfo(pauseInfo);
        addToHistory(`系统暂停: ${pauseInfo.message || reason}`);
      },
      
      onAutoResumeCountdown: (remainingTime, pauseInfo) => {
        setAutoResumeCountdown(remainingTime);
        if (remainingTime === 0) {
          setCurrentPauseInfo(null);
          addToHistory('模拟器自动恢复');
        }
      },
      
      onPlayerIdleDetected: (playerId, idleTime) => {
        addToHistory(`检测到玩家 ${playerId} 空闲 (${Math.round(idleTime / 1000)}秒)`);
      },
      
      onPlayerActionResult: (result) => {
        const status = result.success ? '✅' : '❌';
        addToHistory(`${status} 玩家 ${result.playerId}: ${result.message}`);
      },
      
      onError: (error) => {
        addToHistory(`❌ 错误: ${error}`);
      }
    };

    // 设置UI回调函数
    props.manager.setUICallbacks(uiCallbacks);
  });

  // 添加操作历史
  const addToHistory = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setControlHistory(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  // 获取可控制的玩家列表
  const getControllablePlayers = (): PlayerDisplayState[] => {
    const snapshot = currentSnapshot();
    if (!snapshot) return [];

    const players: PlayerDisplayState[] = [];
    
    // 遍历A阵营的玩家（假设A阵营是玩家控制的）
    Object.values(snapshot.camps.campA.teams).forEach(team => {
      Object.values(team.members).forEach(member => {
        players.push({
          id: member.id,
          name: member.name,
          position: member.position,
          currentHp: member.currentHp,
          maxHp: member.maxHp,
          currentMp: member.currentMp,
          maxMp: member.maxMp,
          isDead: member.isDead,
          canAct: member.canAct,
          isActive: member.isActive
        });
      });
    });

    return players;
  };

  // 释放技能
  const castSkill = async (playerId: string, skillId: string) => {
    if (!props.manager.canAcceptInput()) {
      addToHistory(`❌ 无法释放技能：模拟器状态不允许输入`);
      return;
    }

    setIsControlling(true);
    try {
      await props.manager.castSkill(playerId, skillId);
      addToHistory(`🎯 玩家 ${playerId} 尝试释放技能: ${skillId}`);
      
      // 记录玩家活动
      props.manager.markPlayerActive(playerId);
    } catch (error: any) {
      addToHistory(`❌ 技能释放失败: ${error.message}`);
    } finally {
      setIsControlling(false);
    }
  };

  // 移动玩家
  const movePlayer = async (playerId: string, x: number, y: number) => {
    if (!props.manager.canAcceptInput()) {
      addToHistory(`❌ 无法移动：模拟器状态不允许输入`);
      return;
    }

    setIsControlling(true);
    try {
      await props.manager.movePlayer(playerId, x, y);
      addToHistory(`🚶 玩家 ${playerId} 移动到 (${x}, ${y})`);
      
      // 记录玩家活动
      props.manager.markPlayerActive(playerId);
    } catch (error: any) {
      addToHistory(`❌ 移动失败: ${error.message}`);
    } finally {
      setIsControlling(false);
    }
  };

  // 停止玩家动作
  const stopPlayerAction = async (playerId: string) => {
    if (!props.manager.canAcceptInput()) {
      addToHistory(`❌ 无法停止动作：模拟器状态不允许输入`);
      return;
    }

    setIsControlling(true);
    try {
      await props.manager.stopPlayerAction(playerId);
      addToHistory(`🛑 玩家 ${playerId} 停止当前动作`);
      
      // 记录玩家活动
      props.manager.markPlayerActive(playerId);
    } catch (error: any) {
      addToHistory(`❌ 停止动作失败: ${error.message}`);
    } finally {
      setIsControlling(false);
    }
  };

  // 手动暂停
  const pauseSimulation = async () => {
    try {
      await props.manager.pause(PauseReason.MANUAL, '用户手动暂停');
      addToHistory('⏸️ 手动暂停模拟器');
    } catch (error: any) {
      addToHistory(`❌ 暂停失败: ${error.message}`);
    }
  };

  // 恢复模拟
  const resumeSimulation = async (force: boolean = false) => {
    try {
      await props.manager.resume(force);
      setCurrentPauseInfo(null);
      setAutoResumeCountdown(0);
      addToHistory(`▶️ 恢复模拟器 ${force ? '(强制)' : ''}`);
    } catch (error: any) {
      addToHistory(`❌ 恢复失败: ${error.message}`);
    }
  };

  // 获取选中玩家信息（响应式计算属性）
  const selectedPlayerInfo = createMemo(() => {
    const playerId = selectedPlayer();
    if (!playerId) return null;
    
    return getControllablePlayers().find(p => p.id === playerId) || null;
  });

  // 获取当前状态显示
  const getStateDisplay = () => {
    const state = props.manager.getState();
    const pauseInfo = currentPauseInfo();
    
    switch (state) {
      case RealtimeSimulatorState.RUNNING:
        return { icon: '🟢', text: '运行中', color: 'text-green-600' };
      case RealtimeSimulatorState.PAUSED:
        return { icon: '⏸️', text: '已暂停', color: 'text-yellow-600' };
      case RealtimeSimulatorState.AUTO_PAUSED:
        return { icon: '😴', text: '自动暂停', color: 'text-blue-600' };
      case RealtimeSimulatorState.WAITING_FOR_INPUT:
        return { icon: '⏳', text: '等待输入', color: 'text-orange-600' };
      case RealtimeSimulatorState.ERROR:
        return { icon: '❌', text: '错误', color: 'text-red-600' };
      case RealtimeSimulatorState.IDLE:
        return { icon: '💤', text: '空闲', color: 'text-gray-600' };
      default:
        return { icon: '❓', text: state, color: 'text-gray-600' };
    }
  };

  const stateDisplay = getStateDisplay();
  const players = getControllablePlayers();

  return (
    <div class="space-y-6">
      {/* 状态栏 */}
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">{stateDisplay.icon}</span>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">模拟器状态</h3>
              <p class={`text-sm font-medium ${stateDisplay.color}`}>{stateDisplay.text}</p>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <Show when={props.manager.isRunning()}>
              <Button onClick={pauseSimulation} class="text-sm" disabled={isControlling()}>
                ⏸️ 暂停
              </Button>
            </Show>
            
            <Show when={props.manager.isPaused()}>
              <Button onClick={() => resumeSimulation(false)} class="text-sm" disabled={isControlling()}>
                ▶️ 恢复
              </Button>
              <Button onClick={() => resumeSimulation(true)} class="text-sm bg-orange-500 hover:bg-orange-600" disabled={isControlling()}>
                ⏩ 强制恢复
              </Button>
            </Show>
          </div>
        </div>

        {/* 暂停信息 */}
        <Show when={currentPauseInfo()}>
          {(pauseInfo) => (
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    暂停原因: {pauseInfo().message || pauseInfo().reason}
                  </p>
                  <Show when={pauseInfo().playerId}>
                    <p class="text-xs text-yellow-600 dark:text-yellow-300">
                      相关玩家: {pauseInfo().playerId}
                    </p>
                  </Show>
                </div>
                
                <Show when={autoResumeCountdown() > 0}>
                  <div class="text-sm text-yellow-600 dark:text-yellow-300">
                    {Math.ceil(autoResumeCountdown() / 1000)}秒后自动恢复
                  </div>
                </Show>
              </div>
            </div>
          )}
        </Show>

        {/* 快照信息 */}
        <Show when={currentSnapshot()}>
          {(snapshot) => (
            <div class="text-sm text-gray-600 dark:text-gray-400">
              当前帧: {snapshot().frame} | 
              A阵营: {Object.keys(snapshot().camps.campA.teams).length}队 |
              B阵营: {Object.keys(snapshot().camps.campB.teams).length}队
            </div>
          )}
        </Show>
      </div>

      {/* 玩家控制面板 */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 玩家选择和信息 */}
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">玩家控制</h4>
          
          {/* 玩家列表 */}
          <div class="space-y-2 mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">选择玩家:</label>
            <select
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              value={selectedPlayer() || ''}
              onChange={(e) => setSelectedPlayer(e.target.value || null)}
            >
              <option value="">-- 选择玩家 --</option>
              <For each={players}>
                {(player) => (
                  <option value={player.id}>
                    {player.name} (HP: {player.currentHp}/{player.maxHp})
                    {player.isDead ? ' [死亡]' : ''}
                    {!player.canAct ? ' [无法行动]' : ''}
                  </option>
                )}
              </For>
            </select>
          </div>

          {/* 选中玩家详细信息 */}
          <Show when={selectedPlayerInfo()}>
            {(player) => (
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <h5 class="font-medium text-gray-900 dark:text-white mb-2">{player().name}</h5>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>HP: {player().currentHp}/{player().maxHp}</div>
                  <div>MP: {player().currentMp}/{player().maxMp}</div>
                  <div>位置: ({player().position.x}, {player().position.y})</div>
                  <div>状态: {player().isDead ? '死亡' : player().canAct ? '可行动' : '无法行动'}</div>
                </div>
              </div>
            )}
          </Show>

          {/* 技能控制 */}
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">选择技能:</label>
              <select
                class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                value={selectedSkill()}
                onChange={(e) => setSelectedSkill(e.target.value)}
              >
                <For each={availableSkills}>
                  {(skill) => (
                    <option value={skill.id}>
                      {skill.name} (MP: {skill.mpCost}, CD: {skill.cooldown}ms)
                    </option>
                  )}
                </For>
              </select>
            </div>

            <Button
              onClick={() => selectedPlayer() && castSkill(selectedPlayer()!, selectedSkill())}
              disabled={!selectedPlayer() || isControlling() || !props.manager.canAcceptInput()}
              class="w-full"
            >
              🎯 释放技能
            </Button>
          </div>

          {/* 移动控制 */}
          <div class="mt-4 space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">X坐标:</label>
                <input
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  value={moveTarget().x}
                  onChange={(e) => setMoveTarget(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Y坐标:</label>
                <input
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  value={moveTarget().y}
                  onChange={(e) => setMoveTarget(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div class="flex space-x-2">
              <Button
                onClick={() => selectedPlayer() && movePlayer(selectedPlayer()!, moveTarget().x, moveTarget().y)}
                disabled={!selectedPlayer() || isControlling() || !props.manager.canAcceptInput()}
                class="flex-1"
              >
                🚶 移动
              </Button>
              
              <Button
                onClick={() => selectedPlayer() && stopPlayerAction(selectedPlayer()!)}
                disabled={!selectedPlayer() || isControlling() || !props.manager.canAcceptInput()}
                class="flex-1 bg-red-500 hover:bg-red-600"
              >
                🛑 停止
              </Button>
            </div>
          </div>
        </div>

        {/* 操作历史和玩家活动 */}
        <div class="space-y-4">
          
          {/* 操作历史 */}
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">操作历史</h4>
            <div class="space-y-1 text-sm max-h-48 overflow-y-auto">
              <Show when={controlHistory().length === 0}>
                <p class="text-gray-500 dark:text-gray-400 italic">暂无操作记录</p>
              </Show>
              <For each={controlHistory()}>
                {(entry) => (
                  <div class="text-gray-700 dark:text-gray-300 font-mono text-xs border-b border-gray-100 dark:border-gray-700 pb-1">
                    {entry}
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* 玩家活动状态 */}
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">玩家活动状态</h4>
            <div class="space-y-2 text-sm">
              <Show when={playerActivities().size === 0}>
                <p class="text-gray-500 dark:text-gray-400 italic">无活动数据</p>
              </Show>
              <For each={Array.from(playerActivities().entries())}>
                {([playerId, activity]) => (
                  <div class="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span class="font-medium">{playerId}</span>
                    <div class="flex items-center space-x-2">
                      <span class={`px-2 py-1 rounded text-xs ${
                        activity.isIdle 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {activity.isIdle ? '😴 空闲' : '🎮 活跃'}
                      </span>
                      <span class="text-gray-500">
                        动作数: {activity.actionCount}
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 