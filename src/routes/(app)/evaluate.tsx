import { onMount, onCleanup, createSignal, Show, For, createEffect } from "solid-js";
import { RealtimePlayerController } from "~/components/module/simulator/RealtimePlayerController";
import { RealtimeSimulatorManager } from "~/components/module/simulator/RealtimeSimulatorManager";
import { GameEngine } from "~/components/module/simulator/GameEngine";
import { Player } from "~/components/module/simulator/Player";
import { Motion } from "solid-motionone";
import { store } from "~/store";
import { Button } from "~/components/controls/button";
import { SimulatorWithRelations } from "~/repositories/simulator";
import { TeamWithRelations } from "~/repositories/team";
import { MemberWithRelations } from "~/repositories/member";
import { MemberType, MobDifficultyFlag } from "../../../db/enums";

// ============================== 适配层：连接GameEngine和RealtimeSimulatorManager ==============================

/**
 * GameEngine适配器
 * 将GameEngine的状态同步到RealtimeSimulatorManager
 */
class GameEngineAdapter {
  private gameEngine: GameEngine;
  private realtimeManager: RealtimeSimulatorManager;
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(gameEngine: GameEngine, realtimeManager: RealtimeSimulatorManager) {
    this.gameEngine = gameEngine;
    this.realtimeManager = realtimeManager;
  }

  /**
   * 启动适配器
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // 启动GameEngine
    this.gameEngine.start();
    
    // 启动实时更新循环
    this.updateInterval = setInterval(() => {
      this.syncState();
    }, 100); // 每100ms同步一次状态

    console.log("🔄 GameEngine适配器已启动");
  }

  /**
   * 停止适配器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    // 停止GameEngine
    this.gameEngine.stop();
    
    // 停止更新循环
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log("🛑 GameEngine适配器已停止");
  }

  /**
   * 同步GameEngine状态到RealtimeSimulatorManager
   */
  private syncState(): void {
    try {
      // 执行一步GameEngine模拟
      const shouldContinue = this.gameEngine.step();
      
      if (!shouldContinue) {
        this.stop();
        return;
      }

      // 获取当前快照
      const snapshot = this.gameEngine.getCurrentSnapshot();
      
      // 更新RealtimeSimulatorManager的状态
      // 这里需要通过某种方式将GameEngine的状态同步到Worker中
      // 暂时通过控制台输出状态
      console.log("📊 GameEngine状态同步:", {
        timestamp: snapshot.timestamp,
        aliveMembers: Array.from(this.gameEngine.getAllMembers().values()).filter(m => m.member.isAlive()).length,
        totalMembers: this.gameEngine.getAllMembers().size
      });

    } catch (error) {
      console.error("❌ GameEngine状态同步失败:", error);
    }
  }

  /**
   * 获取GameEngine状态
   */
  getGameEngineState() {
    return {
      isRunning: this.isRunning,
      timestamp: this.gameEngine.getCurrentSnapshot().timestamp,
      members: Array.from(this.gameEngine.getAllMembers().values()).map(memberState => ({
        id: memberState.id,
        name: memberState.member.getName(),
        type: memberState.type,
        isAlive: memberState.member.isAlive(),
        isActive: memberState.member.isActive(),
        stats: memberState.member.getStats()
      })),
      stats: this.gameEngine.getStats()
    };
  }

  /**
   * 向GameEngine发送玩家命令
   */
  sendPlayerCommand(playerId: string, command: any): void {
    try {
      const memberInfo = this.gameEngine.findMember(playerId);
      if (!memberInfo) {
        console.warn(`玩家 ${playerId} 不存在`);
        return;
      }

      const member = memberInfo.member.member;
      
      switch (command.type) {
        case 'attack':
          if (member instanceof Player) {
            member.useSkill('basic_attack');
          }
          break;
        case 'move':
          member.moveTo(command.position);
          break;
        case 'stop':
          // 停止当前动作
          break;
        default:
          console.warn(`未知命令类型: ${command.type}`);
      }

      console.log(`🎮 发送命令到GameEngine: ${playerId} -> ${command.type}`);
    } catch (error) {
      console.error("❌ 发送命令失败:", error);
    }
  }
}

// ============================== 测试数据生成 ==============================

/**
 * 创建测试用的模拟器数据
 */
function createTestSimulatorData(): SimulatorWithRelations {
  return {
    id: "test-simulator-1",
    name: "GameEngine测试模拟器",
    details: "测试GameEngine、Member、Player模块配合",
    statisticId: "test-statistic-1",
    updatedByAccountId: null,
    createdByAccountId: "admin",
    campA: [
      {
        id: "team-a-1",
        name: "玩家队伍",
        members: [
          {
            id: "player-1",
            type: "Player" as MemberType,
            playerId: "player1",
            mercenaryId: null,
            partnerId: null,
            mobId: null,
            teamId: "team-a-1",
            name: "测试玩家1",
            sequence: 0,
            mobDifficultyFlag: "Easy",
            actions: undefined,
          },
        ],
        gems: [],
      },
    ],
    campB: [
      {
        id: "team-b-1",
        name: "敌方队伍",
        members: [
          {
            id: "mob-1",
            name: "测试怪物1",
            sequence: 1,
            type: "Mob" as MemberType,
            playerId: null,
            mercenaryId: null,
            partnerId: null,
            mobId: "mob1",
            mobDifficultyFlag: "Normal" as MobDifficultyFlag,
            actions: {},
            teamId: "team-b-1",
          },
        ],
        gems: [],
      },
    ],
    statistic: {
      id: "test-statistic-1",
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    },
  };
}

/**
 * 创建测试用的角色数据（用于Player实例）
 */
function createTestCharacterData() {
  return {
    id: "test-character-1",
    name: "测试角色",
    lv: 50,
    str: 100,
    int: 80,
    vit: 120,
    agi: 90,
    dex: 110,
    personalityType: "Str" as any,
    personalityValue: 10,
    weapon: {
      id: "test-weapon-1",
      template: {
        id: "weapon-template-1",
        type: "OneHandSword" as any,
        baseAtk: 100,
        baseDef: 0,
      }
    },
    armor: {
      id: "test-armor-1",
      template: {
        id: "armor-template-1",
        baseDef: 50,
      }
    },
    skills: [
      {
        id: "skill-1",
        templateId: "basic_attack",
        name: "基础攻击",
        cooldown: 1000,
        mpCost: 0,
      }
    ],
    combos: [],
  };
}

// ============================== 主测试组件 ==============================

/**
 * 主测试组件
 */
function GameEngineTestComponent() {
  // 状态信号
  const [gameEngine, setGameEngine] = createSignal<GameEngine | null>(null);
  const [realtimeManager, setRealtimeManager] = createSignal<RealtimeSimulatorManager | null>(null);
  const [adapter, setAdapter] = createSignal<GameEngineAdapter | null>(null);
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [isRunning, setIsRunning] = createSignal(false);
  const [gameEngineState, setGameEngineState] = createSignal<any>(null);
  const [error, setError] = createSignal<string | null>(null);

  // 初始化测试环境
  const initializeTest = async () => {
    try {
      setError(null);
      console.log("🚀 开始初始化GameEngine测试环境...");

      // 1. 创建GameEngine实例
      const engine = new GameEngine();
      
      // 2. 添加阵营和队伍
      engine.addCamp("campA", "玩家阵营");
      engine.addCamp("campB", "敌方阵营");
      
      // 3. 创建测试队伍数据
      const testTeamA = {
        id: "team-a-1",
        name: "玩家队伍",
        gems: [],
        members: [],
      } as TeamWithRelations;
      
      const testTeamB = {
        id: "team-b-1", 
        name: "敌方队伍",
        gems: [],
        members: [],
      } as TeamWithRelations;
      
      engine.addTeam("campA", testTeamA);
      engine.addTeam("campB", testTeamB);

      // 4. 创建测试成员数据
      const testPlayerData = {
        id: "player-1",
        name: "测试玩家1",
        sequence: 0,
        type: "Player" as MemberType,
        playerId: "player1",
        partnerId: null,
        mercenaryId: null,
        mobId: null,
        mobDifficultyFlag: "Easy" as MobDifficultyFlag,
        actions: {},
        teamId: "team-a-1",
        player: {
          id: "player1",
          name: "测试玩家",
          useIn: "character1",
          accountId: "test-account",
          character: createTestCharacterData() as any,
        },
        mercenary: null,
        partner: null,
        mob: null,
      } as MemberWithRelations;

      const testMobData = {
        id: "mob-1",
        name: "测试怪物1", 
        sequence: 1,
        type: "Mob" as MemberType,
        playerId: null,
        partnerId: null,
        mercenaryId: null,
        mobId: "mob1",
        mobDifficultyFlag: "Normal" as MobDifficultyFlag,
        actions: {},
        teamId: "team-b-1",
        player: null,
        mercenary: null,
        partner: null,
        mob: {
          id: "mob1",
          name: "测试怪物1",
          details: null,
          statisticId: "test-statistic-1",
          updatedByAccountId: null,
          createdByAccountId: null,
          type: "Normal" as any,
          actions: {},
          dataSources: "",
          level: 30,
          maxHp: 500,
          maxMp: 100,
          hp: 500,
          mp: 100,
          atk: 50,
          def: 20,
          matk: 30,
          mdef: 15,
          hit: 80,
          flee: 60,
          crit: 10,
          critResistance: 5,
          physicalAttackResistanceModifier: 0,
          magicalAttackResistanceModifier: 0,
        } as any,
      } as MemberWithRelations;

      // 5. 添加成员到GameEngine
      engine.addMember("campA", "team-a-1", testPlayerData, {
        currentHp: 1000,
        currentMp: 200,
        position: { x: 0, y: 0 }
      });

      engine.addMember("campB", "team-b-1", testMobData, {
        currentHp: 500,
        currentMp: 100,
        position: { x: 10, y: 0 }
      });

      // 6. 创建RealtimeSimulatorManager
      const manager = new RealtimeSimulatorManager({
        onStateChange: (state, data) => {
          console.log("🔄 RealtimeSimulatorManager状态变化:", state, data);
        },
        onFrameUpdate: (data) => {
          console.log("📊 帧更新:", data.frame);
        },
        onError: (error) => {
          console.error("❌ RealtimeSimulatorManager错误:", error);
          setError(error);
        }
      });

      // 7. 初始化RealtimeSimulatorManager
      await manager.initialize(createTestSimulatorData());

      // 8. 创建适配器
      const gameEngineAdapter = new GameEngineAdapter(engine, manager);

      // 9. 设置状态
      setGameEngine(engine);
      setRealtimeManager(manager);
      setAdapter(gameEngineAdapter);
      setIsInitialized(true);

      console.log("✅ GameEngine测试环境初始化完成");

    } catch (err: any) {
      console.error("❌ 初始化失败:", err);
      setError(err.message || "初始化失败");
    }
  };

  // 启动测试
  const startTest = async () => {
    try {
      const currentAdapter = adapter();
      if (!currentAdapter) {
        throw new Error("适配器未初始化");
      }

      await currentAdapter.start();
      setIsRunning(true);
      console.log("🎮 GameEngine测试已启动");

    } catch (err: any) {
      console.error("❌ 启动测试失败:", err);
      setError(err.message || "启动测试失败");
    }
  };

  // 停止测试
  const stopTest = async () => {
    try {
      const currentAdapter = adapter();
      if (currentAdapter) {
        await currentAdapter.stop();
      }
      setIsRunning(false);
      console.log("🛑 GameEngine测试已停止");

    } catch (err: any) {
      console.error("❌ 停止测试失败:", err);
      setError(err.message || "停止测试失败");
    }
  };

  // 发送测试命令
  const sendTestCommand = (playerId: string, command: any) => {
    const currentAdapter = adapter();
    if (currentAdapter) {
      currentAdapter.sendPlayerCommand(playerId, command);
    }
  };

  // 监听GameEngine状态更新
  createEffect(() => {
    const currentAdapter = adapter();
    if (currentAdapter && isRunning()) {
      const interval = setInterval(() => {
        const state = currentAdapter.getGameEngineState();
        setGameEngineState(state);
      }, 500); // 每500ms更新一次状态

      return () => clearInterval(interval);
    }
  });

  // 清理资源
  onCleanup(async () => {
    await stopTest();
  });

  return (
    <div class="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      <div class="mx-auto max-w-6xl">
        <div class="mb-8">
          <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">GameEngine模块测试</h1>
          <p class="text-gray-600 dark:text-gray-400">测试GameEngine、Member、Player三个模块的配合</p>
        </div>

        {/* 错误显示 */}
        <Show when={error()}>
          <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-300">
            <h3 class="mb-2 font-medium">错误</h3>
            <p class="text-sm">{error()}</p>
          </div>
        </Show>

        {/* 初始化控制 */}
        <Show when={!isInitialized()}>
          <div class="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">初始化测试环境</h3>
            <Button
              onClick={initializeTest}
              class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              🚀 初始化GameEngine测试环境
            </Button>
          </div>
        </Show>

        {/* 测试控制 */}
        <Show when={isInitialized()}>
          <div class="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">测试控制</h3>
            <div class="flex gap-4">
              <Button
                onClick={startTest}
                disabled={isRunning()}
                class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isRunning() ? "运行中..." : "🎮 启动测试"}
              </Button>

              <Button
                onClick={stopTest}
                disabled={!isRunning()}
                class="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                🛑 停止测试
              </Button>
            </div>
          </div>
        </Show>

        {/* GameEngine状态显示 */}
        <Show when={gameEngineState()}>
          <div class="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">GameEngine状态</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium">运行状态:</span>
                <span class={`ml-2 ${gameEngineState()?.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                  {gameEngineState()?.isRunning ? '运行中' : '已停止'}
                </span>
              </div>
              <div>
                <span class="font-medium">时间戳:</span>
                <span class="ml-2">{gameEngineState()?.timestamp || 0}</span>
              </div>
              <div>
                <span class="font-medium">成员数量:</span>
                <span class="ml-2">{gameEngineState()?.members?.length || 0}</span>
              </div>
              <div>
                <span class="font-medium">存活成员:</span>
                <span class="ml-2">{gameEngineState()?.members?.filter((m: any) => m.isAlive).length || 0}</span>
              </div>
            </div>

            {/* 成员列表 */}
            <Show when={gameEngineState()?.members?.length > 0}>
              <div class="mt-4">
                <h4 class="mb-2 font-medium text-gray-900 dark:text-white">成员状态</h4>
                <div class="space-y-2">
                  <For each={gameEngineState()?.members || []}>
                    {(member) => (
                      <div class="flex items-center justify-between rounded border p-2">
                        <div>
                          <span class="text-sm font-medium">{member.name}</span>
                          <span class="ml-2 text-xs text-gray-500">({member.type})</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class={`text-xs ${member.isAlive ? 'text-green-600' : 'text-red-600'}`}>
                            {member.isAlive ? '存活' : '死亡'}
                          </span>
                          <span class={`text-xs ${member.isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                            {member.isActive ? '活跃' : '非活跃'}
                          </span>
                          <Button
                            onClick={() => sendTestCommand(member.id, { type: 'attack' })}
                            class="text-xs bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                          >
                            攻击
                          </Button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        {/* RealtimePlayerController */}
        <Show when={realtimeManager()}>
          <div class="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">实时玩家控制</h3>
            <RealtimePlayerController manager={realtimeManager()!} />
          </div>
        </Show>
      </div>
    </div>
  );
}

// ============================== 主页面组件 ==============================

export default function EvaluatePage() {
  return (
    <Motion.div
      animate={{ opacity: [0, 1] }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
      class={`Client relative flex h-full w-full flex-col justify-between opacity-0`}
    >
      <GameEngineTestComponent />
    </Motion.div>
  );
}
