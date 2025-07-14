import { createSignal, Show, For, onMount, onCleanup, createEffect } from "solid-js";
import { Button } from "~/components/controls/button";
import { EnhancedSimulatorPool } from "~/components/module/simulator/SimulatorPool";

// 玩家状态接口
interface PlayerState {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  position: { x: number; y: number };
  state: string; // idle, moving, casting_skill, dead等
  canAct: boolean;
}

// 战斗快照接口
interface BattleSnapshot {
  frame: number;
  camps: {
    campA: CampSnapshot;
    campB: CampSnapshot;
  };
  events: BattleEvent[];
  battleStatus?: {
    isEnded: boolean;
    winner?: 'campA' | 'campB';
    reason?: string;
  };
}

interface CampSnapshot {
  teams: Record<string, {
    id: string;
    name: string | null;
    members: Record<string, PlayerState>;
  }>;
}

interface BattleEvent {
  id: string;
  type: string;
  frame: number;
  priority: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, any>;
}

// 技能信息
interface SkillInfo {
  id: string;
  name: string;
  type: 'attack' | 'magic' | 'heal' | 'buff' | 'debuff';
  cooldown: number;
  mpCost: number;
}

// 预定义技能列表
const AVAILABLE_SKILLS: SkillInfo[] = [
  { id: 'normal_attack', name: '普通攻击', type: 'attack', cooldown: 0, mpCost: 0 },
  { id: 'heavy_attack', name: '重击', type: 'attack', cooldown: 3000, mpCost: 10 },
  { id: 'fireball', name: '火球术', type: 'magic', cooldown: 5000, mpCost: 20 },
  { id: 'heal', name: '治疗术', type: 'heal', cooldown: 8000, mpCost: 15 },
  { id: 'shield', name: '护盾', type: 'buff', cooldown: 10000, mpCost: 25 },
  { id: 'poison', name: '毒液攻击', type: 'debuff', cooldown: 6000, mpCost: 12 }
];

interface PlayerControllerProps {
  pool: EnhancedSimulatorPool;
  isSimulationActive: boolean;
}

export function PlayerController(props: PlayerControllerProps) {
  const [currentSnapshot, setCurrentSnapshot] = createSignal<BattleSnapshot | null>(null);
  const [selectedPlayer, setSelectedPlayer] = createSignal<string | null>(null);
  const [selectedSkill, setSelectedSkill] = createSignal<string>('normal_attack');
  const [moveTarget, setMoveTarget] = createSignal({ x: 0, y: 0 });
  const [isControlling, setIsControlling] = createSignal(false);
  const [controlHistory, setControlHistory] = createSignal<string[]>([]);

  // 监听模拟器事件以获取实时快照
  onMount(() => {
    console.log('🎮 PlayerController mounted, setting up event listeners');
    
    // 监听模拟进度更新
    props.pool.on('task-completed', (data: any) => {
      console.log('📨 PlayerController received event:', data);
      
      if (data.result?.type === 'simulation_progress') {
        console.log('📊 Processing simulation progress:', data.result.data);
        
        // 🎯 调试：检查是否收到了战斗快照
        if (data.result.data.battleSnapshot) {
          console.log('✅ Received battleSnapshot from Worker:', data.result.data.battleSnapshot);
          console.log('🏕️ CampA teams:', Object.keys(data.result.data.battleSnapshot.camps.campA.teams));
          console.log('🏕️ CampB teams:', Object.keys(data.result.data.battleSnapshot.camps.campB.teams));
          
          // 使用Worker提供的真实战斗快照
          setCurrentSnapshot(data.result.data.battleSnapshot);
        } else {
          console.log('⚠️ No battleSnapshot received, generating mock data');
          
          // 生成模拟快照作为后备
          const mockSnapshot: BattleSnapshot = {
            frame: data.result.data.frame || 0,
            camps: {
              campA: createMockCampSnapshot('A'),
              campB: createMockCampSnapshot('B')
            },
            events: [],
            battleStatus: data.result.data.battleStatus
          };
          
          setCurrentSnapshot(mockSnapshot);
        }
        
        console.log('🎯 Current snapshot updated, frame:', currentSnapshot()?.frame);
      } else {
        console.log('ℹ️ Received non-progress event:', data.result?.type);
      }
    });

    // 如果模拟正在运行，立即生成一个初始快照用于测试
    if (props.isSimulationActive) {
      console.log('🔄 Simulation active, generating initial snapshot');
      const initialSnapshot: BattleSnapshot = {
        frame: 1,
        camps: {
          campA: createMockCampSnapshot('A'),
          campB: createMockCampSnapshot('B')
        },
        events: [],
        battleStatus: undefined
      };
      setCurrentSnapshot(initialSnapshot);
    }
  });

  // 创建模拟阵营快照
  const createMockCampSnapshot = (camp: 'A' | 'B'): CampSnapshot => ({
    teams: {
      [`team${camp}1`]: {
        id: `team${camp}1`,
        name: `${camp}队`,
        members: {
          [`player${camp}1`]: {
            id: `player${camp}1`,
            name: `玩家${camp}1`,
            type: camp === 'A' ? 'Player' : 'Mob',
            isActive: true,
            currentHp: 800 + Math.floor(Math.random() * 200),
            maxHp: 1000,
            currentMp: 80 + Math.floor(Math.random() * 20),
            maxMp: 100,
            position: { 
              x: camp === 'A' ? 100 : 500, 
              y: 250 + Math.floor(Math.random() * 100) 
            },
            state: ['idle', 'moving', 'casting_skill'][Math.floor(Math.random() * 3)],
            canAct: true
          }
        }
      }
    }
  });

  // 获取可控制的玩家列表
  const getControllablePlayers = (): PlayerState[] => {
    const snapshot = currentSnapshot();
    if (!snapshot) return [];

    const players: PlayerState[] = [];
    
    // 只允许控制A阵营的玩家
    Object.values(snapshot.camps.campA.teams).forEach(team => {
      Object.values(team.members).forEach(member => {
        if (member.type === 'Player' && member.canAct) {
          players.push(member);
        }
      });
    });

    return players;
  };

  // 发送玩家技能指令
  const castSkill = async (playerId: string, skillId: string) => {
    if (!props.isSimulationActive) return;

    setIsControlling(true);
    try {
      // 这里需要扩展模拟器线程池以支持玩家控制
      // 目前使用模拟的方式
      console.log(`玩家 ${playerId} 使用技能 ${skillId}`);
      
      const skill = AVAILABLE_SKILLS.find(s => s.id === skillId);
      const action = `使用技能: ${skill?.name || skillId}`;
      
      setControlHistory(prev => [
        `[${new Date().toLocaleTimeString()}] ${action}`,
        ...prev.slice(0, 9)
      ]);

      // 模拟发送控制指令到Worker
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('技能释放失败:', error);
    } finally {
      setIsControlling(false);
    }
  };

  // 发送移动指令
  const movePlayer = async (playerId: string, x: number, y: number) => {
    if (!props.isSimulationActive) return;

    setIsControlling(true);
    try {
      console.log(`玩家 ${playerId} 移动到 (${x}, ${y})`);
      
      const action = `移动到: (${x}, ${y})`;
      setControlHistory(prev => [
        `[${new Date().toLocaleTimeString()}] ${action}`,
        ...prev.slice(0, 9)
      ]);

      // 模拟发送控制指令到Worker
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('移动指令失败:', error);
    } finally {
      setIsControlling(false);
    }
  };

  // 停止当前动作
  const stopAction = async (playerId: string) => {
    if (!props.isSimulationActive) return;

    setIsControlling(true);
    try {
      console.log(`玩家 ${playerId} 停止当前动作`);
      
      setControlHistory(prev => [
        `[${new Date().toLocaleTimeString()}] 停止动作`,
        ...prev.slice(0, 9)
      ]);

      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('停止指令失败:', error);
    } finally {
      setIsControlling(false);
    }
  };

  // 获取选中玩家的详细信息
  const getSelectedPlayerInfo = (): PlayerState | null => {
    const playerId = selectedPlayer();
    if (!playerId) return null;

    return getControllablePlayers().find(p => p.id === playerId) || null;
  };

  return (
    <div class="space-y-6">
      {/* 玩家控制面板标题 */}
      <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          🎮 玩家控制器
        </h2>
        
        <Show 
          when={props.isSimulationActive}
          fallback={
            <div class="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700">
              <p class="text-gray-600 dark:text-gray-400">
                请先启动战斗模拟以使用玩家控制功能
              </p>
            </div>
          }
        >
          {/* 战斗信息 */}
          <Show when={currentSnapshot()}>
            <div class="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                  当前帧: {currentSnapshot()?.frame || 0}
                </span>
                <Show when={currentSnapshot()?.battleStatus?.isEnded}>
                  <span class="text-sm font-medium text-red-600">
                    {currentSnapshot()?.battleStatus?.reason}
                  </span>
                </Show>
              </div>
            </div>
          </Show>

          {/* 玩家选择 */}
          <div class="mb-6">
            <h3 class="mb-3 font-semibold text-gray-900 dark:text-white">选择玩家</h3>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <For each={getControllablePlayers()}>
                {(player) => (
                  <div 
                    onClick={() => setSelectedPlayer(player.id)}
                    class={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                      selectedPlayer() === player.id
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {player.name}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          状态: {player.state}
                        </p>
                      </div>
                      <div class="text-right">
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                          HP: {player.currentHp}/{player.maxHp}
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                          MP: {player.currentMp}/{player.maxMp}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* 控制面板 */}
          <Show when={selectedPlayer()}>
            <div class="space-y-4">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                控制 {getSelectedPlayerInfo()?.name}
              </h3>

              {/* 技能控制 */}
              <div class="rounded-lg border p-4 dark:border-gray-600">
                <h4 class="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                  技能释放
                </h4>
                
                <div class="mb-3">
                  <select 
                    value={selectedSkill()}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    class="w-full rounded border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <For each={AVAILABLE_SKILLS}>
                      {(skill) => (
                        <option value={skill.id}>
                          {skill.name} (MP:{skill.mpCost}, CD:{skill.cooldown}ms)
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <Button
                  onClick={() => castSkill(selectedPlayer()!, selectedSkill())}
                  disabled={isControlling() || !getSelectedPlayerInfo()?.canAct}
                  class="w-full rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {isControlling() ? '执行中...' : '释放技能'}
                </Button>
              </div>

              {/* 移动控制 */}
              <div class="rounded-lg border p-4 dark:border-gray-600">
                <h4 class="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                  移动控制
                </h4>
                
                <div class="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-gray-600 dark:text-gray-400">X 坐标</label>
                    <input
                      type="number"
                      value={moveTarget().x}
                      onInput={(e) => setMoveTarget(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                      class="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      min="0"
                      max="800"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 dark:text-gray-400">Y 坐标</label>
                    <input
                      type="number"
                      value={moveTarget().y}
                      onInput={(e) => setMoveTarget(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                      class="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      min="0"
                      max="600"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => movePlayer(selectedPlayer()!, moveTarget().x, moveTarget().y)}
                    disabled={isControlling() || !getSelectedPlayerInfo()?.canAct}
                    class="rounded bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    移动
                  </Button>
                  <Button
                    onClick={() => stopAction(selectedPlayer()!)}
                    disabled={isControlling()}
                    class="rounded bg-gray-500 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
                  >
                    停止
                  </Button>
                </div>
              </div>

              {/* 玩家状态显示 */}
              <Show when={getSelectedPlayerInfo()}>
                {(playerInfo) => (
                  <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                    <h4 class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      当前状态
                    </h4>
                    <div class="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span class="text-gray-600 dark:text-gray-400">位置:</span>
                        <span class="ml-1 font-mono">
                          ({playerInfo().position.x}, {playerInfo().position.y})
                        </span>
                      </div>
                      <div>
                        <span class="text-gray-600 dark:text-gray-400">状态:</span>
                        <span class="ml-1">{playerInfo().state}</span>
                      </div>
                      <div>
                        <span class="text-gray-600 dark:text-gray-400">可行动:</span>
                        <span class={`ml-1 ${playerInfo().canAct ? 'text-green-600' : 'text-red-600'}`}>
                          {playerInfo().canAct ? '是' : '否'}
                        </span>
                      </div>
                      <div>
                        <span class="text-gray-600 dark:text-gray-400">激活:</span>
                        <span class={`ml-1 ${playerInfo().isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {playerInfo().isActive ? '是' : '否'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </Show>
        </Show>
      </div>

      {/* 控制历史 */}
      <Show when={controlHistory().length > 0}>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
            控制历史
          </h3>
          <div class="max-h-32 overflow-y-auto rounded border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
            <For each={controlHistory()}>
              {(entry) => (
                <div class="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {entry}
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
} 