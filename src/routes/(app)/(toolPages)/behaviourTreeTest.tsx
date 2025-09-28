import { Button } from "~/components/controls/button";
import { createSignal, onCleanup, For, onMount } from "solid-js";
import { Random } from "~/lib/utils/random";
import { Tree, Blackboard, Node, Context, NodeDef, Status } from "~/lib/behavior3";
import { Role, RoleContext } from "~/lib/behavior3/test/role";

// 位置接口
interface Position {
  x: number;
  y: number;
}

export class FindEnemy extends Node {
    declare input: [number];
    declare args: {
        readonly w: number;
        readonly h: number;
    };

    override onTick(tree: Tree<RoleContext, Role>): Status {
        const [count] = this.input;
        const { w, h } = this.args;
        const { x, y } = tree.owner;
        const list = tree.context.find((role: Role) => {
            if (role === tree.owner) {
                return false;
            }
            const tx = role.x;
            const ty = role.y;
            return Math.abs(x - tx) <= w && Math.abs(y - ty) <= h;
        }, count);
        if (list.length >= count) {
            this.output.push(...list);
            return "success";
        } else {
            return "failure";
        }
    }

    static override get descriptor(): NodeDef {
        return {
            name: "FindEnemy",
            type: "Action",
            desc: "寻找敌人",
            args: [
                { name: "w", type: "int", desc: "宽度" },
                { name: "h", type: "int", desc: "高度" },
            ],
            input: ["count"],
            output: ["target"],
        };
    }
}

// 位置接口
interface Position {
  x: number;
  y: number;
}

export default function BehaviourTreeTest() {
  const [context] = createSignal(new RoleContext());
  const [hero, setHero] = createSignal<Role>({ x: 0, y: 0, hp: 100 });
  const [monster, setMonster] = createSignal<Role>({ x: 150, y: 0, hp: 100 });
  const [heroTree, setHeroTree] = createSignal<Tree<RoleContext, Role> | null>(null);
  const [monsterTree, setMonsterTree] = createSignal<Tree<RoleContext, Role> | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);
  const [logs, setLogs] = createSignal<string[]>([]);

  // 添加日志
  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 创建行为树
  const createTree = (owner: Role, treePath: string) => {
    context().loadTree(treePath);
    return new Tree<RoleContext, Role>(context(), owner, treePath);
  };

  // 启动测试
  const startTest = () => {
    if (isRunning()) return;
    setIsRunning(true);
    setLogs([]);
    
    // 初始化角色
    const currentContext = context();
    currentContext.avators = [monster(), hero()];
    
    // 创建行为树
    const heroAi = createTree(hero(), "./example/hero-wander.json");
    const monsterAi = createTree(monster(), "./example/monster-wander.json");
    
    setHeroTree(heroAi);
    setMonsterTree(monsterAi);
    
    addLog("开始行为树测试");
    addLog(`英雄位置: (${hero().x}, ${hero().y}), 血量: ${hero().hp}`);
    addLog(`怪物位置: (${monster().x}, ${monster().y}), 血量: ${monster().hp}`);
  };

  // 停止测试
  const stopTest = () => {
    setIsRunning(false);
    addLog("测试停止");
  };

  // 单步执行
  const stepTest = () => {
    if (!isRunning()) return;
    
    const heroAi = heroTree();
    const monsterAi = monsterTree();
    
    if (heroAi && monsterAi) {
      // 更新上下文时间
      context().time = (context().time || 0) + 1;
      
      // 执行行为树
      heroAi.tick();
      monsterAi.tick();
      
      // 更新角色状态
      setHero({ ...heroAi.owner });
      setMonster({ ...monsterAi.owner });
      
      addLog(`时间: ${context().time}, 英雄: (${heroAi.owner.x}, ${heroAi.owner.y}) HP:${heroAi.owner.hp}, 怪物: (${monsterAi.owner.x}, ${monsterAi.owner.y}) HP:${monsterAi.owner.hp}`);
    }
  };

  // 运行完整测试
  const runFullTest = () => {
    if (isRunning()) return;
    setIsRunning(true);
    setLogs([]);
    
    addLog("开始完整测试序列 - 战斗直到一方死亡 (60fps)");
    
    // 初始化角色到共享上下文
    const currentContext = context();
    currentContext.avators = [monster(), hero()];
    
    // 创建行为树
    const heroAi = createTree(hero(), "./example/hero-wander.json");
    const monsterAi = createTree(monster(), "./example/monster-wander.json");
    
    setHeroTree(heroAi);
    setMonsterTree(monsterAi);
    
    // 重置角色状态
    heroAi.owner.hp = 100;
    heroAi.owner.x = 0;
    heroAi.owner.y = 0;
    monsterAi.owner.hp = 100;
    monsterAi.owner.x = 150;
    monsterAi.owner.y = 0;
    currentContext.time = 0;
    
    addLog(`初始状态 - 英雄: (${heroAi.owner.x}, ${heroAi.owner.y}) HP:${heroAi.owner.hp}, 怪物: (${monsterAi.owner.x}, ${monsterAi.owner.y}) HP:${monsterAi.owner.hp}`);
    
    // 使用setInterval实现60fps循环
    let tickCount = 0;
    const maxTicks = 1000; // 防止无限循环
    const fps = 10;
    const intervalMs = 1000 / fps; // 约16.67ms
    
    const battleInterval = setInterval(() => {
      if (heroAi.owner.hp <= 0 || monsterAi.owner.hp <= 0 || tickCount >= maxTicks) {
        // 战斗结束
        clearInterval(battleInterval);
        
        // 记录最终结果
        if (heroAi.owner.hp <= 0) {
          addLog(`战斗结束 - 怪物胜利！英雄死亡，怪物剩余HP: ${monsterAi.owner.hp}`);
        } else if (monsterAi.owner.hp <= 0) {
          addLog(`战斗结束 - 英雄胜利！怪物死亡，英雄剩余HP: ${heroAi.owner.hp}`);
        } else {
          addLog(`战斗超时 - 经过${maxTicks}个tick，双方都存活`);
        }
        
        addLog(`最终状态 - 英雄: (${heroAi.owner.x}, ${heroAi.owner.y}) HP:${heroAi.owner.hp}, 怪物: (${monsterAi.owner.x}, ${monsterAi.owner.y}) HP:${monsterAi.owner.hp}`);
        addLog("完整测试完成");
        setIsRunning(false);
        return;
      }
      
      currentContext.time = tickCount;
      
      heroAi.tick();
      monsterAi.tick();
      
      setHero({ ...heroAi.owner });
      setMonster({ ...monsterAi.owner });
      
      // 每60个tick记录一次状态 (每秒记录一次)
      if (tickCount % 60 === 0) {
        addLog(`时间 ${Math.floor(tickCount / 60)}s: 英雄(${heroAi.owner.x}, ${heroAi.owner.y}) HP:${heroAi.owner.hp}, 怪物(${monsterAi.owner.x}, ${monsterAi.owner.y}) HP:${monsterAi.owner.hp}`);
      }
      
      tickCount++;
    }, intervalMs);
  };

  return (
    <div class="mx-auto flex max-w-6xl flex-col gap-6 p-6 h-full overflow-y-auto">
      <h1 class="text-3xl font-bold">🤖 行为树测试</h1>

      {/* 场景视图 */}
      <div class="bg-area-color flex flex-col gap-4 rounded p-4">
        <h2 class="text-xl font-semibold">🗺️ 场景视图</h2>
        <div
          class="map-container bg-primary-color relative h-80 w-full overflow-hidden rounded border"
          style={{
            "background-image": `
                               linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                               linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
            "background-size": "20px 20px",
          }}
        >
          {/* 英雄 */}
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 transform"
            style={{
              left: `${50 + (hero().x / 8)}%`,
              top: `${50 + (hero().y / 8)}%`,
            }}
            title={`英雄 (${hero().x}, ${hero().y}) HP:${hero().hp}`}
          >
            <div class="text-lg">🦸</div>
          </div>

          {/* 怪物 */}
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 transform"
            style={{
              left: `${50 + (monster().x / 8)}%`,
              top: `${50 + (monster().y / 8)}%`,
            }}
            title={`怪物 (${monster().x}, ${monster().y}) HP:${monster().hp}`}
          >
            <div class="text-lg">👹</div>
          </div>

          {/* 中心点 */}
          <div
            class="bg-main-text-color absolute h-1 w-1 -translate-x-0.5 -translate-y-0.5 transform rounded-full"
            style={{ left: "50%", top: "50%" }}
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 角色状态面板 */}
        <div class="bg-area-color flex flex-col gap-4 rounded p-4">
          <h2 class="text-xl font-semibold">📊 角色状态</h2>

          <div class="space-y-2 text-sm">
            <div>
              英雄: 位置({hero().x}, {hero().y}) HP: {hero().hp}
            </div>
            <div>
              怪物: 位置({monster().x}, {monster().y}) HP: {monster().hp}
            </div>
            <div>
              时间: {context().time || 0}
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div class="bg-area-color flex flex-col gap-4 rounded p-4">
          <h2 class="text-xl font-semibold">🎮 控制面板</h2>

          <div class="flex flex-col gap-2">
            <Button onClick={startTest} disabled={isRunning()} class="w-full">
              {isRunning() ? "🔴 运行中..." : "▶️ 开始测试"}
            </Button>
            <Button onClick={stopTest} disabled={!isRunning()} class="w-full">
              ⏹️ 停止测试
            </Button>
            <Button onClick={stepTest} disabled={!isRunning()} class="w-full">
              👆 单步执行
            </Button>
            <Button onClick={runFullTest} disabled={isRunning()} class="w-full">
              🚀 运行完整测试
            </Button>
          </div>
        </div>
      </div>

      {/* 日志面板 */}
      <div class="bg-area-color flex flex-col gap-4 rounded p-4">
        <h2 class="text-xl font-semibold">📝 测试日志</h2>
        <div class="h-60 overflow-y-auto bg-black p-4 font-mono text-sm text-green-400">
          <For each={logs()}>
            {(log) => <div>{log}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}
