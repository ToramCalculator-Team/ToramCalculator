/**
 * 实时模拟控制器
 * 
 * 职责：
 * - 收集用户输入，转发为意图事件
 * - 逻辑判断、权限控制、技能条件判定
 * - 通过SimulatorPool与Worker通信
 * - UI状态管理和用户交互
 */

import { createSignal, createEffect, onCleanup, createResource, Show } from 'solid-js';
import { realtimeSimulatorPool } from './SimulatorPool';
import type { IntentMessage } from './core/MessageRouter';
// import { Logger } from '~/utils/logger';
import type { SimulatorWithRelations } from '~/repositories/simulator';
import { CharacterWithRelations, findCharacterById } from '~/repositories/character';
import { findMobById } from '~/repositories/mob';
import { Button } from '~/components/controls/button';
import { Select } from '~/components/controls/select';

// ============================== 类型定义 ==============================

interface ControllerState {
  isRunning: boolean;
  isPaused: boolean;
  currentFrame: number;
  memberCount: number;
  selectedMemberId: string | null;
  isWorkerReady: boolean; // 新增：worker准备状态
}

// ============================== 组件实现 ==============================

export default function RealtimeController() {
  // ==================== 状态管理 ====================
  
  const [state, setState] = createSignal<ControllerState>({
    isRunning: false,
    isPaused: false,
    currentFrame: 0,
    memberCount: 0,
    selectedMemberId: null,
    isWorkerReady: false // 初始状态为未准备好
  });



  const [members, setMembers] = createSignal<any[]>([]);
    const [logs, setLogs] = createSignal<string[]>([]);
    const [character, { refetch: refetchCharacter }] = createResource(async () => {
      return findCharacterById("defaultCharacterId")
    });
    const [mob, { refetch: refetchMob }] = createResource(async () => {
      return findMobById("defaultMobId")
    });

  // ==================== 生命周期 ====================

  // 定期获取成员数据
  const updateMembers = async () => {
    try {
      const memberData = await realtimeSimulatorPool.getMembers();
      
      // 添加调试日志
      // console.log('RealtimeController: 获取到成员数据:', memberData.length, '个成员');
      
      // 简化更新逻辑，直接更新数据
      setMembers(memberData);
    } catch (error) {
      console.error('RealtimeController: 获取成员数据失败:', error);
    }
  };

  createEffect(() => {
    // 监听SimulatorPool状态变化
    const handleMetrics = (metrics: any) => {
      setState(prev => ({
        ...prev,
        currentFrame: metrics.currentFrame || 0,
        memberCount: metrics.memberCount || 0
      }));
    };

    realtimeSimulatorPool.on('metrics', handleMetrics);

    // 检查worker准备状态
    const checkWorkerReady = () => {
      const isReady = realtimeSimulatorPool.isReady();
      setState(prev => ({ ...prev, isWorkerReady: isReady }));
    };

    // 初始检查
    checkWorkerReady();

    // 每500毫秒更新一次成员数据和worker状态
    const updateInterval = setInterval(() => {
      updateMembers();
      checkWorkerReady();
    }, 500);

    onCleanup(() => {
      realtimeSimulatorPool.off('metrics', handleMetrics);
      clearInterval(updateInterval);
    });
  });

  // ==================== 操作方法 ====================

  /**
   * 启动模拟
   */
  const startSimulation = async () => {
    try {
      addLog('🚀 启动模拟...');
      
      // 这里需要一个示例数据，实际使用时应该从props传入
      const mockSimulatorData = {
        id: 'mock-simulator',
        name: '测试模拟器',
        details: '测试用模拟器',
        statisticId: 'mock-statistic',
        updatedByAccountId: null,
        createdByAccountId: null,
        statistic: {
          id: 'mock-statistic',
          updatedAt: new Date(),
          createdAt: new Date(),
          usageTimestamps: [],
          viewTimestamps: []
        },
        campA: [
          {
            id: 'team-a-1',
            name: '队伍A-1',
            simulatorId: 'mock-simulator',
            members: [
              {
                id: 'player-1',
                name: '玩家1',
                type: 'Player',
                teamId: 'team-a-1',
                player: {
                  id: 'player-1',
                  memberId: 'player-1',
                  characterId: 'defaultCharacterId',
                  character: character()
                },
                mercenary: null,
                mob: null,
                partner: null
              } as any
            ]
          }
        ],
        campB: [
          {
            id: 'team-b-1',
            name: '队伍B-1',
            simulatorId: 'mock-simulator',
            members: [
              {
                id: 'mob-1',
                name: '怪物1',
                type: 'Mob',
                teamId: 'team-b-1',
                player: null,
                mercenary: null,
                mob: mob(),
                partner: null
              } as any
            ]
          }
        ]
      };
      
      const result = await realtimeSimulatorPool.startSimulation(mockSimulatorData as any);
      
      if (result.success) {
        setState(prev => ({ ...prev, isRunning: true, isPaused: false }));
        addLog('✅ 模拟启动成功');
        // 立即执行一次成员数据更新
        updateMembers();
      } else {
        addLog(`❌ 模拟启动失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 启动错误: ${error}`);
    }
  };

  /**
   * 停止模拟
   */
  const stopSimulation = async () => {
    try {
      addLog('🛑 停止模拟...');
      
      const result = await realtimeSimulatorPool.stopSimulation();
      
      if (result.success) {
        setState(prev => ({ ...prev, isRunning: false, isPaused: false }));
        addLog('✅ 模拟已停止');
      } else {
        addLog(`❌ 停止失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 停止错误: ${error}`);
    }
  };

  /**
   * 暂停模拟
   */
  const pauseSimulation = async () => {
    try {
      addLog('⏸️ 暂停模拟...');
      
      const result = await realtimeSimulatorPool.pauseSimulation();
      
      if (result.success) {
        setState(prev => ({ ...prev, isPaused: true }));
        addLog('✅ 模拟已暂停');
      } else {
        addLog(`❌ 暂停失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 暂停错误: ${error}`);
    }
  };

  /**
   * 恢复模拟
   */
  const resumeSimulation = async () => {
    try {
      addLog('▶️ 恢复模拟...');
      
      const result = await realtimeSimulatorPool.resumeSimulation();
      
      if (result.success) {
        setState(prev => ({ ...prev, isPaused: false }));
        addLog('✅ 模拟已恢复');
      } else {
        addLog(`❌ 恢复失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 恢复错误: ${error}`);
    }
  };

  /**
   * 发送意图消息
   * 控制器逻辑：逻辑判断、权限控制、技能条件判定
   */
  const sendIntent = async (intent: Omit<IntentMessage, 'id' | 'timestamp'>) => {
    // ==================== 控制器逻辑判断 ====================
    
    // 0. Worker准备状态检查
    if (!state().isWorkerReady) {
      addLog('⚠️ Worker未准备好，无法发送意图');
      return;
    }
    
    // 1. 模拟状态检查
    if (!state().isRunning || state().isPaused) {
      addLog('⚠️ 模拟未运行或已暂停');
      return;
    }

    // 2. 目标成员检查
    if (!intent.targetMemberId) {
      addLog('⚠️ 请先选择目标成员');
      return;
    }

    // 3. 成员存在性检查
    const targetMember = members().find(m => m.id === intent.targetMemberId);
    if (!targetMember) {
      addLog(`⚠️ 目标成员不存在: ${intent.targetMemberId}`);
      return;
    }

    // 4. 成员状态检查
    if (!targetMember.isAlive) {
      addLog(`⚠️ 目标成员已死亡: ${targetMember.name}`);
      return;
    }

    if (!targetMember.isActive) {
      addLog(`⚠️ 目标成员不可操作: ${targetMember.name}`);
      return;
    }

    // ==================== 技能条件判定 ====================
    
    if (intent.type === 'cast_skill') {
      const skillId = intent.data?.skillId;
      if (!skillId) {
        addLog('⚠️ 技能ID不能为空');
        return;
      }

      // 技能可用性检查（这里可以添加更复杂的逻辑）
      const memberStats = targetMember.stats;
      if (memberStats && memberStats.mp < 50) { // 示例：魔法值检查
        addLog(`⚠️ 魔法值不足，无法释放技能: ${skillId}`);
        return;
      }

      // 技能冷却检查（这里可以添加更复杂的逻辑）
      // const skillCooldown = getSkillCooldown(targetMember.id, skillId);
      // if (skillCooldown > 0) {
      //   addLog(`⚠️ 技能冷却中: ${skillId} (${skillCooldown}s)`);
      //   return;
      // }
    }

    // ==================== 移动条件判定 ====================
    
    if (intent.type === 'move') {
      const { x, y } = intent.data || {};
      if (typeof x !== 'number' || typeof y !== 'number') {
        addLog('⚠️ 移动坐标无效');
        return;
      }

      // 移动范围检查（这里可以添加更复杂的逻辑）
      const currentPosition = targetMember.stats?.position || { x: 0, y: 0 };
      const distance = Math.sqrt(Math.pow(x - currentPosition.x, 2) + Math.pow(y - currentPosition.y, 2));
      const maxMoveDistance = 100; // 示例：最大移动距离
      
      if (distance > maxMoveDistance) {
        addLog(`⚠️ 移动距离超出限制: ${distance.toFixed(1)} > ${maxMoveDistance}`);
        return;
      }
    }

    // ==================== 发送意图消息 ====================
    
    try {
      const message: IntentMessage = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...intent
      };

      console.log('RealtimeController: 准备发送意图消息:', message);
      addLog(`📤 发送意图: ${intent.type} -> ${targetMember.name}`);
      
      // 通过SimulatorPool发送意图消息
      const result = await realtimeSimulatorPool.sendIntent(message);
      
      if (result.success) {
        addLog(`✅ 意图发送成功: ${intent.type}`);
      } else {
        addLog(`❌ 意图发送失败: ${result.error}`);
      }
      
    } catch (error) {
      console.error('RealtimeController: 发送意图异常:', error);
      addLog(`❌ 发送意图失败: ${error}`);
    }
  };

  /**
   * 释放技能
   */
  const castSkill = (skillId: string, targetId?: string) => {
    const memberId = state().selectedMemberId;
    if (!memberId) {
      addLog('⚠️ 请先选择成员');
      return;
    }

    sendIntent({
      type: 'cast_skill',
      targetMemberId: memberId,
      data: { skillId, targetId }
    });
  };

  /**
   * 移动
   */
  const move = (x: number, y: number) => {
    const memberId = state().selectedMemberId;
    if (!memberId) {
      addLog('⚠️ 请先选择成员');
      return;
    }

    sendIntent({
      type: 'move',
      targetMemberId: memberId,
      data: { x, y }
    });
  };

  /**
   * 停止动作
   */
  const stopAction = () => {
    const memberId = state().selectedMemberId;
    if (!memberId) {
      addLog('⚠️ 请先选择成员');
      return;
    }

    sendIntent({
      type: 'stop_action',
      targetMemberId: memberId,
      data: {}
    });
  };

  /**
   * 切换目标
   */
  const changeTarget = (targetId: string) => {
    const memberId = state().selectedMemberId;
    if (!memberId) {
      addLog('⚠️ 请先选择成员');
      return;
    }

    sendIntent({
      type: 'target_change',
      targetMemberId: memberId,
      data: { targetId }
    });
  };

  /**
   * 添加日志
   */
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  /**
   * 选择成员
   */
  const selectMember = (memberId: string) => {
    setState(prev => ({ ...prev, selectedMemberId: memberId }));
    addLog(`👤 选择成员: ${memberId}`);
  };





  // ==================== 渲染 ====================

  return (
    <div class="flex flex-col gap-4 h-full">
      {/* 上半部分：日志显示区域 */}
      <div class="flex-1 flex flex-col p-4 overflow-y-auto">
        <div class="flex items-center justify-between ">
          <h2 class="text-lg font-semibold text-main-text-color">实时模拟控制器</h2>
          <div class="flex items-center gap-3 text-sm text-main-text-color">
            <div class="flex items-center gap-1">
              <div class={`w-2 h-2 rounded-full ${state().isWorkerReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span>{state().isWorkerReady ? 'Worker就绪' : 'Worker初始化中'}</span>
            </div>
            <span class="text-dividing-color">|</span>
            <div class="flex items-center gap-1">
              <div class={`w-2 h-2 rounded-full ${state().isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{state().isRunning ? '运行中' : '已停止'}</span>
            </div>
            <span class="text-dividing-color">|</span>
            <span>帧: {state().currentFrame}</span>
            <span class="text-dividing-color">|</span>
            <span>成员: {state().memberCount}</span>
          </div>
        </div>
        
        {/* 日志显示 */}
        <div class="flex-1 h-full overflow-y-auto bg-area-color rounded-lg p-3">
          <div class="text-xs font-mono text-main-text-color space-y-1">
            {logs().map(log => (
              <div class="py-1 border-b border-dividing-color last:border-b-0">{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* 下半部分：控制器区域 */}
      <div class="p-4">
        {/* 模拟控制按钮 */}
        <div class="flex gap-2 mb-4">
          <Button 
            onClick={startSimulation}
            disabled={!state().isWorkerReady || state().isRunning}
            level="primary"
            size="sm"
          >
            启动
          </Button>
          <Button 
            onClick={stopSimulation}
            disabled={!state().isWorkerReady || !state().isRunning}
            level="secondary"
            size="sm"
          >
            停止
          </Button>
          <Button 
            onClick={pauseSimulation}
            disabled={!state().isWorkerReady || !state().isRunning || state().isPaused}
            level="default"
            size="sm"
          >
            暂停
          </Button>
          <Button 
            onClick={resumeSimulation}
            disabled={!state().isWorkerReady || !state().isRunning || !state().isPaused}
            level="default"
            size="sm"
          >
            恢复
          </Button>
        </div>

        {/* 成员选择 */}
        <div class="mb-4">
          <div class="text-xs text-main-text-color mb-2">
            可用成员: {members().length} 个
          </div>
          <Show when={members().length > 0} fallback={
            <div class="text-xs text-dividing-color p-2 bg-primary-color rounded">
              正在加载成员数据...
            </div>
          }>
            <div class="text-xs text-main-text-color mb-2">
              调试: 成员数据长度 = {members().length}
            </div>
            <Select
              value={state().selectedMemberId || ''}
              setValue={selectMember}
              options={[
                { label: '请选择成员', value: '' },
                ...members().map(member => ({
                  label: `${member.name} (${member.type})`,
                  value: member.id
                }))
              ]}
              placeholder="请选择成员"
            />
          </Show>
        </div>

        {/* 技能和操作按钮 - 类似手机游戏控制器 */}
        <div class="grid grid-cols-8 gap-2">
          <Button 
            onClick={() => castSkill('skill_1')}
            disabled={!state().isWorkerReady || !state().selectedMemberId}
            level="primary"
            size="lg"
            class="aspect-square"
          >
            技能1
          </Button>
          <Button 
            onClick={() => castSkill('skill_2')}
            disabled={!state().isWorkerReady || !state().selectedMemberId}
            level="primary"
            size="lg"
            class="aspect-square"
          >
            技能2
          </Button>
          <Button 
            onClick={() => move(100, 100)}
            disabled={!state().isWorkerReady || !state().selectedMemberId}
            level="secondary"
            size="lg"
            class="aspect-square"
          >
            移动
          </Button>
          <Button 
            onClick={stopAction}
            disabled={!state().isWorkerReady || !state().selectedMemberId}
            level="default"
            size="lg"
            class="aspect-square"
          >
            停止
          </Button>
        </div>
      </div>
    </div>
  );
} 