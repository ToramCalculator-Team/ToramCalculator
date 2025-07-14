/**
 * 基于XState的事件驱动模拟引擎
 * 
 * 核心设计:
 * 1. 使用XState管理模拟器状态和成员状态
 * 2. 事件驱动架构，支持帧跳跃优化
 * 3. 多阵营多团队战斗系统
 * 4. 使用enums.ts定义确保类型安全
 */

import { setup, createActor, assign } from "xstate";
import { SimulatorWithRelations } from "../../../repositories/simulator";
import { TeamWithRelations } from "../../../repositories/team";
import { MemberState as BaseMemberState } from "./memberState";

// ============================== 基础类型定义 ==============================

/**
 * 扩展的成员状态接口
 */
interface MemberState extends BaseMemberState {
  // 基础属性
  maxHp: number;
  currentHp: number;
  maxMp: number;
  currentMp: number;
  
  // 位置信息
  position: { x: number; y: number };
  
  // 状态标志
  canAct: boolean;
  
  // 关联对象 (修复类型错误)
  player: any | null;
  mercenary: any | null; 
  partner: any | null;
  mob: any | null;
}

/**
 * 战斗事件类型
 */
type BattleEventType = 
  // 系统事件
  | 'initialization_complete'
  | 'event_queue_finished_or_end_condition_met'
  | 'frame_update'
  
  // 成员生命周期事件
  | 'member_spawn'
  | 'member_death'
  | 'member_revive'
  
  // 技能事件 (对应PlayerMachine)
  | 'skill_button_pressed'
  | 'skill_start'
  | 'startup_begin'
  | 'startup_end'
  | 'charging_begin'
  | 'charging_end'
  | 'skill_effects'
  | 'animation_end'
  
  // 移动事件
  | 'movement_command'
  | 'stop_movement_command'
  
  // 伤害/治疗事件
  | 'damage_dealt'
  | 'healing_applied'
  | 'status_effect_applied'
  | 'status_effect_removed'
  
  // 控制事件
  | 'receive_control'
  | 'control_time_end';

/**
 * 战斗事件接口
 */
interface BattleEvent {
  id: string;
  type: BattleEventType;
  frame: number;
  priority: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, any>;
}

/**
 * 战斗快照
 */
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
    members: Record<string, any>;
  }>;
}

// ============================== 成员状态机 ==============================

/**
 * 成员状态机 (基于PlayerMachine.ts)
 */
const createMemberMachine = (memberData: MemberState) => setup({
  types: {
    context: {} as {
      memberState: MemberState;
      currentSkill?: string;
      skillSequence: string[];
      events: BattleEvent[];
    },
    events: {} as 
      | { type: 'startup_end' }
      | { type: 'receive_control' }
      | { type: 'movement_command', data: { x: number; y: number } }
      | { type: 'charging_end' }
      | { type: 'hp_less_than_or_equal_zero' }
      | { type: 'stop_movement_command' }
      | { type: 'control_time_end' }
      | { type: 'revival_countdown_zero' }
      | { type: 'skill_button_pressed', data: { skillId: string } }
      | { type: 'check_availability' }
      | { type: 'skill_action_end' }
      | { type: 'update_state', data: Partial<MemberState> }
      | { type: 'external_event', data: BattleEvent }
  },
  
  actions: {
    'generate_skill_start_event': assign(({ context, event }) => {
      const newEvent: BattleEvent = {
        id: `skill_start_${Date.now()}`,
        type: 'skill_start',
        frame: 0,
        priority: 1,
        sourceId: context.memberState.id,
        data: { skillId: (event as any).data?.skillId }
      };
      
      return {
        events: [...context.events, newEvent]
      };
    }),
    
    'generate_startup_begin_event': assign(({ context }) => {
      const newEvent: BattleEvent = {
        id: `startup_begin_${Date.now()}`,
        type: 'startup_begin',
        frame: 0,
        priority: 2,
        sourceId: context.memberState.id
      };
      
      return {
        events: [...context.events, newEvent]
      };
    }),
    
    'generate_skill_effects_event': assign(({ context }) => {
      const newEvent: BattleEvent = {
        id: `skill_effect_${Date.now()}`,
        type: 'skill_effects',
        frame: 0,
        priority: 3,
        sourceId: context.memberState.id
      };
      
      return {
        events: [...context.events, newEvent]
      };
    }),
    
    'update_member_state': assign(({ context, event }) => {
      if (event.type === 'update_state') {
        return {
          memberState: { ...context.memberState, ...event.data }
        };
      }
      return {};
    }),
    
    'clear_event_queue': assign(() => ({ events: [] }))
  },
  
  guards: {
    'has_consecutive_combo': () => false,
    'has_charging_action': () => Math.random() > 0.5,
    'no_charging_action': () => Math.random() <= 0.5,
    'is_available': () => true,
    'is_not_available': () => false
  }
}).createMachine({
  context: {
    memberState: memberData,
    skillSequence: [],
    events: []
  },
  
  id: `Member_${memberData.id}`,
  initial: memberData.isDead ? 'dead' : 'alive',
  
  states: {
    alive: {
      initial: 'operable_state',
      
      on: {
        'hp_less_than_or_equal_zero': {
          target: 'dead',
          actions: 'update_member_state'
        },
        'update_state': {
          actions: 'update_member_state'
        }
      },
      
      states: {
        operable_state: {
          initial: 'idle_state',
          
          on: {
            'receive_control': 'control_status'
          },
          
          states: {
            idle_state: {
              on: {
                'movement_command': 'moving',
                'skill_button_pressed': 'casting_skill'
              }
            },
            
            moving: {
              on: {
                'stop_movement_command': 'idle_state'
              }
            },
            
            casting_skill: {
              initial: 'skill_init',
              
              states: {
                skill_init: {
                  entry: 'generate_skill_start_event',
                  on: {
                    'check_availability': [
                      { target: 'startup', guard: 'is_available' },
                      { target: '#Member_' + memberData.id + '.alive.operable_state.idle_state', guard: 'is_not_available' }
                    ]
                  }
                },
                
                startup: {
                  entry: 'generate_startup_begin_event',
                  on: {
                    'startup_end': [
                      { target: 'charging', guard: 'has_charging_action' },
                      { target: 'skill_effect', guard: 'no_charging_action' }
                    ]
                  }
                },
                
                charging: {
                  on: {
                    'charging_end': 'skill_effect'
                  }
                },
                
                skill_effect: {
                  entry: 'generate_skill_effects_event',
                  on: {
                    'skill_action_end': [
                      { target: 'skill_init', guard: 'has_consecutive_combo' },
                      { target: '#Member_' + memberData.id + '.alive.operable_state.idle_state' }
                    ]
                  }
                }
              }
            }
          }
        },
        
        control_status: {
          on: {
            'control_time_end': 'operable_state.idle_state'
          }
        }
      }
    },
    
    dead: {
      on: {
        'revival_countdown_zero': {
          target: 'alive.operable_state.idle_state',
          actions: 'update_member_state'
        }
      }
    }
  }
});

// ============================== 主模拟器状态机 ==============================

/**
 * 主模拟器状态机 (基于SimulatorMachine.ts)
 */
const simulatorMachine = setup({
  types: {
    context: {} as {
      simulator?: SimulatorWithRelations;
      currentFrame: number;
      maxFrames: number;
      members: Map<string, any>; // 成员状态机
      eventQueue: BattleEvent[];
      snapshots: BattleSnapshot[];
      campA: TeamWithRelations[];
      campB: TeamWithRelations[];
      battleResult?: {
        isEnded: boolean;
        winner?: 'campA' | 'campB';
        reason?: string;
      };
    },
    events: {} as 
      | { type: 'start', data: SimulatorWithRelations }
      | { type: 'pause' }
      | { type: 'terminate' }
      | { type: 'initialization_complete' }
      | { type: 'event_queue_finished_or_end_condition_met' }
      | { type: 'frame_update' }
      | { type: 'member_event', data: { memberId: string; event: BattleEvent } }
  },
  
  actions: {
    'initialize_camps_and_members': assign(({ context, event }) => {
      if (event.type !== 'start') return {};
      
      const simulator = event.data;
      
      // 添加防护检查
      if (!simulator || !simulator.campA || !simulator.campB) {
        console.error('模拟器数据无效:', simulator);
        return {};
      }
      
      const members = new Map();
      
      // 初始化A阵营成员
      simulator.campA.forEach(team => {
        team.members.forEach(memberConfig => {
          const memberState: MemberState = {
            ...memberConfig,
            maxHp: 1000,
            currentHp: 1000,
            maxMp: 100,
            currentMp: 100,
            position: { x: 0, y: 0 },
            isDead: false,
            isActive: true,
            canAct: true,
            statusEffects: [],
            extraData: {},
            // 修复缺失的关联对象
            player: null,
            mercenary: null,
            partner: null,
            mob: null
          };
          
          const memberMachine = createMemberMachine(memberState);
          const memberActor = createActor(memberMachine);
          memberActor.start();
          
          members.set(memberConfig.id, memberActor);
        });
      });
      
      // 初始化B阵营成员
      simulator.campB.forEach(team => {
        team.members.forEach(memberConfig => {
          const memberState: MemberState = {
            ...memberConfig,
            maxHp: 1000,
            currentHp: 1000,
            maxMp: 100,
            currentMp: 100,
            position: { x: 0, y: 0 },
            isDead: false,
            isActive: true,
            canAct: true,
            statusEffects: [],
            extraData: {},
            // 修复缺失的关联对象
            player: null,
            mercenary: null,
            partner: null,
            mob: null
          };
          
          const memberMachine = createMemberMachine(memberState);
          const memberActor = createActor(memberMachine);
          memberActor.start();
          
          members.set(memberConfig.id, memberActor);
        });
      });
      
      return {
        simulator,
        campA: simulator.campA,
        campB: simulator.campB,
        members,
        currentFrame: 0,
        maxFrames: 7200,
        eventQueue: [],
        snapshots: [],
        battleResult: {
          isEnded: false
        }
      };
    }),
    
    'execute_current_frame_events': assign(({ context }) => {
      const frameEvents = context.eventQueue.filter(e => e.frame === context.currentFrame);
      
      // 处理事件
      frameEvents.forEach(event => {
        if (event.targetId && context.members.has(event.targetId)) {
          const memberActor = context.members.get(event.targetId);
          memberActor.send({ type: 'external_event', data: event });
        }
      });
      
      // 收集新事件
      const newEvents: BattleEvent[] = [];
      context.members.forEach((memberActor, memberId) => {
        const memberContext = memberActor.getSnapshot().context;
        if (memberContext.events.length > 0) {
          newEvents.push(...memberContext.events.map((e: BattleEvent) => ({
            ...e,
            frame: context.currentFrame + 1
          })));
          
          // 清空成员事件队列
          memberActor.send({ type: 'clear_event_queue' });
        }
      });
      
      // 移除已处理事件，添加新事件
      const remainingEvents = context.eventQueue.filter(e => e.frame > context.currentFrame);
      const sortedEvents = [...remainingEvents, ...newEvents].sort((a, b) => {
        if (a.frame !== b.frame) return a.frame - b.frame;
        return a.priority - b.priority;
      });
      
      return {
        eventQueue: sortedEvents
      };
    }),
    
    'generate_battle_snapshot': assign(({ context }) => {
      // 优化快照生成策略，减少生成频率
      const shouldSnapshot = 
        // 每300帧生成一次快照（5秒间隔，假设60FPS）
        context.currentFrame % 300 === 0 || 
        // 或者有重要事件（伤害、死亡、技能释放等）
        context.eventQueue.some(e => 
          e.frame === context.currentFrame && 
          ['member_death', 'skill_effects', 'damage_dealt'].includes(e.type)
        ) ||
        // 或者战斗结束
        context.battleResult?.isEnded;
      
      if (!shouldSnapshot) return {};
      
      try {
        const snapshot: BattleSnapshot = {
          frame: context.currentFrame,
          camps: {
            campA: createCampSnapshot(context.campA, context.members),
            campB: createCampSnapshot(context.campB, context.members)
          },
          events: context.eventQueue
            .filter(e => e.frame === context.currentFrame)
            .slice(0, 5), // 限制事件数量
          battleStatus: context.battleResult
        };
        
        // 限制快照历史数量，避免内存泄漏
        const maxSnapshots = 100;
        const updatedSnapshots = [...context.snapshots, snapshot];
        if (updatedSnapshots.length > maxSnapshots) {
          updatedSnapshots.splice(0, updatedSnapshots.length - maxSnapshots);
        }
        
        return {
          snapshots: updatedSnapshots
        };
      } catch (error) {
        console.error('生成战斗快照失败:', error);
        return {};
      }
    }),
    
    'check_battle_end_condition': assign(({ context }) => {
      const campAAlive = context.campA.flatMap(team => team.members)
        .some(member => {
          const memberActor = context.members.get(member.id);
          const memberState = memberActor?.getSnapshot().context.memberState;
          return memberState && !memberState.isDead;
        });
      
      const campBAlive = context.campB.flatMap(team => team.members)
        .some(member => {
          const memberActor = context.members.get(member.id);
          const memberState = memberActor?.getSnapshot().context.memberState;
          return memberState && !memberState.isDead;
        });
      
      let battleResult;
      if (!campAAlive) {
        battleResult = {
          isEnded: true,
          winner: 'campB' as const,
          reason: 'Camp A eliminated'
        };
      } else if (!campBAlive) {
        battleResult = {
          isEnded: true,
          winner: 'campA' as const,
          reason: 'Camp B eliminated'
        };
      } else if (context.currentFrame >= context.maxFrames) {
        battleResult = {
          isEnded: true,
          reason: 'Maximum frames reached'
        };
      } else {
        battleResult = {
          isEnded: false
        };
      }
      
      return { battleResult };
    }),
    
    'advance_frame': assign(({ context }) => {
      // 帧跳跃优化
      const nextEventFrame = context.eventQueue.find(e => e.frame > context.currentFrame)?.frame;
      const nextFrame = nextEventFrame && nextEventFrame < context.currentFrame + 60 
        ? nextEventFrame 
        : context.currentFrame + 1;
      
      return {
        currentFrame: nextFrame
      };
    })
  },
  
  guards: {
    'battle_not_ended': ({ context }) => !(context.battleResult?.isEnded === true),
    'has_pending_events': ({ context }) => context.eventQueue.length > 0 || context.currentFrame < context.maxFrames
  }
  
}).createMachine({
  context: {
    currentFrame: 0,
    maxFrames: 7200,
    members: new Map(),
    eventQueue: [],
    snapshots: [],
    campA: [],
    campB: []
  },
  
  id: 'simulator',
  initial: 'idle',
  
  states: {
    idle: {
      on: {
        'start': {
          target: 'running',
          actions: 'initialize_camps_and_members'
        }
      }
    },
    
    running: {
      initial: 'member_action_loop',
      
      on: {
        'pause': 'paused'
      },
      
      states: {
        member_action_loop: {
          always: [
            {
              target: '#simulator.idle',
              guard: ({ context }) => context.battleResult?.isEnded === true
            },
            {
              target: '#simulator.idle', 
              guard: ({ context }) => context.eventQueue.length === 0 && context.currentFrame >= context.maxFrames
            }
          ],
          
          entry: [
            'execute_current_frame_events',
            'generate_battle_snapshot', 
            'check_battle_end_condition',
            'advance_frame'
          ],
          
          after: {
            10: 'check_next_frame' // 10ms后检查下一帧
          }
        },
        
        check_next_frame: {
          always: 'member_action_loop'
        }
      }
    },
    
    paused: {
      on: {
        'terminate': 'idle',
        'start': 'running'
      }
    }
  }
});

// ============================== 辅助函数 ==============================

function createCampSnapshot(
  teams: TeamWithRelations[], 
  members: Map<string, any>
): CampSnapshot {
  // 移除过度的日志输出，只在DEBUG模式下输出
  const DEBUG_MODE = false; // 可以通过环境变量控制
  if (DEBUG_MODE) {
    console.log('🏕️ createCampSnapshot开始，teams数量:', teams?.length, 'members数量:', members?.size);
  }
  
  const campSnapshot: CampSnapshot = { teams: {} };
  
  try {
    if (!Array.isArray(teams)) {
      if (DEBUG_MODE) console.warn('❌ teams不是数组:', teams);
      return campSnapshot;
    }
    
    teams.forEach(team => {
      try {
        if (!team || !team.id) {
          if (DEBUG_MODE) console.warn('team数据无效:', team);
          return;
        }
        
        const teamSnapshot = {
          id: String(team.id),
          name: team.name ? String(team.name) : null,
          members: {} as Record<string, any>
        };
        
        if (Array.isArray(team.members)) {
          team.members.forEach(member => {
            try {
              if (!member || !member.id) {
                return;
              }
              
              const memberActor = members.get(member.id);
              let memberData;
              
              if (memberActor && typeof memberActor.getSnapshot === 'function') {
                try {
                  const snapshot = memberActor.getSnapshot();
                  const memberState = snapshot?.context?.memberState;
                  
                  if (memberState) {
                    memberData = {
                      id: String(memberState.id || member.id),
                      name: String(memberState.name || member.name || '未知成员'),
                      maxHp: Number(memberState.maxHp) || 100,
                      currentHp: Number(memberState.currentHp) || 100,
                      maxMp: Number(memberState.maxMp) || 50,
                      currentMp: Number(memberState.currentMp) || 50,
                      position: {
                        x: Number(memberState.position?.x) || 0,
                        y: Number(memberState.position?.y) || 0
                      },
                      canAct: Boolean(memberState.canAct),
                      isDead: Boolean(memberState.isDead),
                      isActive: Boolean(memberState.isActive)
                    };
                  }
                } catch (actorError) {
                  if (DEBUG_MODE) console.warn('获取memberActor状态失败:', member.id, actorError);
                }
              }
              
              // 如果无法从Actor获取状态，使用基础数据
              if (!memberData) {
                memberData = {
                  id: String(member.id),
                  name: String(member.name || '未知成员'),
                  maxHp: 100,
                  currentHp: 100,
                  maxMp: 50,
                  currentMp: 50,
                  position: { x: 0, y: 0 },
                  canAct: true,
                  isDead: false,
                  isActive: false
                };
              }
              
              // 确保数据完全可序列化，不包含任何复杂对象引用
              teamSnapshot.members[member.id] = JSON.parse(JSON.stringify(memberData));
              
            } catch (memberError) {
              if (DEBUG_MODE) console.warn('处理成员数据失败:', member?.id, memberError);
            }
          });
        }
        
        campSnapshot.teams[team.id] = teamSnapshot;
      } catch (teamError) {
        if (DEBUG_MODE) console.warn('处理队伍数据失败:', team?.id, teamError);
      }
    });
  } catch (error) {
    console.error('创建阵营快照失败:', error);
  }
  
  // 最终确保整个快照可序列化
  try {
    return JSON.parse(JSON.stringify(campSnapshot));
  } catch (serializeError) {
    console.error('阵营快照序列化失败:', serializeError);
    return { teams: {} };
  }
}

// ============================== Worker接口 ==============================

type WorkerMessage = {
  type: 'start_simulation';
  data: SimulatorWithRelations;
} | {
  type: 'stop_simulation';
} | {
  type: 'pause_simulation';
} | {
  type: 'resume_simulation';
};

type WorkerResponse = {
  type: 'simulation_complete';
  data: BattleSnapshot[];
} | {
  type: 'simulation_progress';
  data: { frame: number; progress: number; battleSnapshot?: BattleSnapshot; battleStatus?: any; events?: BattleEvent[] };
} | {
  type: 'simulation_paused';
  data: { reason: 'player_idle' | 'waiting_input' | 'manual' };
} | {
  type: 'error';
  data: string;
};

// ============================== Worker主逻辑 ==============================

let simulatorActor: any = null;
let workerPort: MessagePort;

// 处理初始化消息（建立MessageChannel）
self.onmessage = (event) => {
  if (event.data.type === 'init' && event.data.port) {
    workerPort = event.data.port;
    workerPort.onmessage = handleWorkerMessage;
    workerPort.start();
    console.log('✅ Worker MessageChannel initialized successfully');
  }
};

async function handleWorkerMessage(e: MessageEvent) {
  const { taskId, ...messageData } = e.data;
  
  // 发送响应的辅助函数
  const sendResponse = (response: any) => {
    workerPort.postMessage({
      taskId,
      ...response
    });
  };
  
  try {
    switch (messageData.type) {
      case 'start_simulation': {
        // 创建并启动模拟器
        simulatorActor = createActor(simulatorMachine);
        
        let lastProgressUpdate = 0;
        const PROGRESS_UPDATE_INTERVAL = 1000; // 1秒更新一次进度
        
        // 监听状态变化
        simulatorActor.subscribe((state: any) => {
          const currentTime = Date.now();
          
          if (state.matches('idle') && state.context.snapshots.length > 0) {
            // 模拟完成
            sendResponse({
              result: {
                type: 'simulation_complete',
                data: state.context.snapshots
              },
              metrics: {
                duration: currentTime - (state.context.startTime || currentTime),
                memoryUsage: 0
              }
            });
          } else if (state.matches('running')) {
            // 控制进度更新频率，避免过度调用
            if (currentTime - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
              lastProgressUpdate = currentTime;
              
              try {
                // 创建轻量级进度快照，不包含完整阵营数据
                const progressSnapshot: BattleSnapshot = {
                  frame: state.context.currentFrame,
                  camps: {
                    campA: { teams: {} },
                    campB: { teams: {} }
                  },
                  events: [],
                  battleStatus: state.context.battleResult
                };

                // 只在特定条件下生成完整快照
                const shouldGenerateFullSnapshot = 
                  state.context.currentFrame % 600 === 0 || // 每10秒
                  state.context.battleResult?.isEnded;
                
                if (shouldGenerateFullSnapshot) {
                  try {
                    progressSnapshot.camps.campA = createCampSnapshot(state.context.campA, state.context.members);
                    progressSnapshot.camps.campB = createCampSnapshot(state.context.campB, state.context.members);
                  } catch (snapErr) {
                    // 忽略快照生成错误，使用空数据
                  }
                }

                // 进度更新 - 包含优化的战斗快照数据
                sendResponse({
                  result: {
                    type: 'simulation_progress',
                    data: {
                      frame: state.context.currentFrame,
                      progress: Math.min((state.context.currentFrame / state.context.maxFrames) * 100, 100),
                      battleSnapshot: progressSnapshot,
                      battleStatus: state.context.battleResult
                    }
                  }
                });
              } catch (progressError) {
                // 忽略进度更新错误，不影响模拟继续
                console.warn('进度更新失败:', progressError);
              }
            }
          }
        });
        
        simulatorActor.start();
        simulatorActor.send({ type: 'start', data: messageData.data });
        break;
      }
      
      case 'stop_simulation': {
        if (simulatorActor) {
          simulatorActor.send({ type: 'terminate' });
          simulatorActor.stop();
          simulatorActor = null;
        }
        
        sendResponse({
          result: { type: 'simulation_stopped' }
        });
        break;
      }
      
      case 'pause_simulation': {
        if (simulatorActor) {
          simulatorActor.send({ type: 'pause' });
        }
        sendResponse({
          result: { type: 'simulation_paused' }
        });
        break;
      }
      
      case 'resume_simulation': {
        if (simulatorActor) {
          simulatorActor.send({ type: 'start' });
        }
        sendResponse({
          result: { type: 'simulation_resumed' }
        });
        break;
      }
      

      default: {
        console.warn('未知消息类型:', messageData);
        sendResponse({
          error: `未知消息类型: ${messageData.type}`
        });
      }
    }
  } catch (error) {
    console.error('Worker执行错误:', error);
    sendResponse({
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
}

// ============================== Comlink Player Control API ==============================

/**
 * 暴露给Comlink的Player控制接口
 * 这些方法可以直接从主线程调用，而不需要通过消息传递
 */
export const PlayerControlAPI = {
  /**
   * 发送玩家技能指令
   */
  async castSkill(playerId: string, skillId: string, targetId?: string): Promise<{ success: boolean; message: string }> {
    if (!simulatorActor) {
      return { success: false, message: 'Simulator not running' };
    }

    try {
      // 查找目标成员
      const memberActor = simulatorActor.getSnapshot().context.members.get(playerId);
      if (!memberActor) {
        return { success: false, message: 'Player not found' };
      }
      
      // 发送技能事件到成员状态机
      memberActor.send({ 
        type: 'skill_button_pressed', 
        data: { skillId } 
      });
      
      return { 
        success: true, 
        message: 'Skill command sent' 
      };
      
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Skill casting failed' 
      };
    }
  },

  /**
   * 发送玩家移动指令
   */
  async movePlayer(playerId: string, x: number, y: number): Promise<{ success: boolean; message: string }> {
    if (!simulatorActor) {
      return { success: false, message: 'Simulator not running' };
    }

    try {
      // 查找目标成员
      const memberActor = simulatorActor.getSnapshot().context.members.get(playerId);
      if (!memberActor) {
        return { success: false, message: 'Player not found' };
      }
      
      // 发送移动事件到成员状态机
      memberActor.send({ 
        type: 'movement_command', 
        data: { x, y } 
      });
      
      return {
        success: true,
        message: 'Movement command sent'
      };
      
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Movement failed' 
      };
    }
  },

  /**
   * 停止玩家当前动作
   */
  async stopPlayerAction(playerId: string): Promise<{ success: boolean; message: string }> {
    if (!simulatorActor) {
      return { success: false, message: 'Simulator not running' };
    }

    try {
      // 查找目标成员
      const memberActor = simulatorActor.getSnapshot().context.members.get(playerId);
      if (!memberActor) {
        return { success: false, message: 'Player not found' };
      }
      
      // 发送停止事件到成员状态机
      memberActor.send({ type: 'stop_movement_command' });

      return {
        success: true,
        message: 'Stop action command sent'
      };
      
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Stop action failed' 
      };
    }
  },

  /**
   * 获取玩家状态 - 完全序列化安全版本
   */
  getPlayerState(playerId: string): any {
    if (!simulatorActor) {
      return null;
    }
    
    try {
      const memberActor = simulatorActor.getSnapshot().context.members.get(playerId);
      if (!memberActor) {
        return null;
      }
      
      const memberState = memberActor.getSnapshot().context.memberState;
      
      // 创建完全可序列化的玩家状态对象
      const playerState = {
        id: String(memberState.id || playerId),
        name: String(memberState.name || '未知玩家'),
        position: {
          x: Number(memberState.position?.x) || 0,
          y: Number(memberState.position?.y) || 0
        },
        currentHp: Number(memberState.currentHp) || 100,
        maxHp: Number(memberState.maxHp) || 100,
        currentMp: Number(memberState.currentMp) || 50,
        maxMp: Number(memberState.maxMp) || 50,
        isDead: Boolean(memberState.isDead),
        canAct: Boolean(memberState.canAct),
        isActive: Boolean(memberState.isActive)
      };

      // 验证序列化安全性
      try {
        const testSerialization = JSON.parse(JSON.stringify(playerState));
        return testSerialization;
      } catch (serializeError) {
        console.warn('玩家状态序列化失败，返回基础数据:', serializeError);
        return {
          id: String(playerId),
          name: '未知玩家',
          position: { x: 0, y: 0 },
          currentHp: 100,
          maxHp: 100,
          currentMp: 50,
          maxMp: 50,
          isDead: false,
          canAct: true,
          isActive: false
        };
      }
    } catch (error) {
      console.error('获取玩家状态失败:', error);
      return null;
    }
  },

  /**
   * 获取当前战斗快照 - 完全序列化安全版本
   */
  getCurrentBattleSnapshot(): BattleSnapshot | null {
    try {
      // 严格检查simulatorActor是否存在且可用
      if (!simulatorActor || typeof simulatorActor.getSnapshot !== 'function') {
        return this.createFallbackSnapshot();
      }

      const state = simulatorActor.getSnapshot();
      if (!state || !state.context) {
        return this.createFallbackSnapshot();
      }

      const context = state.context;
      
      // 创建最简化的、完全可序列化的快照
      const snapshot: BattleSnapshot = {
        frame: Number(context.currentFrame) || 0,
        camps: {
          campA: { teams: {} },
          campB: { teams: {} }
        },
        events: [],
        battleStatus: {
          isEnded: Boolean(context.battleResult?.isEnded),
          winner: context.battleResult?.winner || undefined,
          reason: context.battleResult?.reason || undefined
        }
      };

      // 安全地创建阵营数据 - 使用最简化的结构
      try {
        if (context.campA && Array.isArray(context.campA)) {
          const campAData: Record<string, any> = {};
          
          context.campA.forEach((team: any) => {
            if (team && team.id) {
              const teamData: Record<string, any> = {};
              
              if (Array.isArray(team.members)) {
                team.members.forEach((member: any) => {
                  if (member && member.id) {
                    // 只包含基本数据类型
                    teamData[member.id] = {
                      id: String(member.id),
                      name: String(member.name || '未知成员'),
                      maxHp: Number(member.maxHp) || 100,
                      currentHp: Number(member.currentHp) || 100,
                      maxMp: Number(member.maxMp) || 50,
                      currentMp: Number(member.currentMp) || 50,
                      position: {
                        x: Number(member.position?.x) || 0,
                        y: Number(member.position?.y) || 0
                      },
                      canAct: Boolean(member.canAct),
                      isDead: Boolean(member.isDead),
                      isActive: Boolean(member.isActive)
                    };
                  }
                });
              }
              
              campAData[team.id] = {
                id: String(team.id),
                name: String(team.name || '未知队伍'),
                members: teamData
              };
            }
          });
          
          snapshot.camps.campA = { teams: campAData };
        }
        
        if (context.campB && Array.isArray(context.campB)) {
          const campBData: Record<string, any> = {};
          
          context.campB.forEach((team: any) => {
            if (team && team.id) {
              const teamData: Record<string, any> = {};
              
              if (Array.isArray(team.members)) {
                team.members.forEach((member: any) => {
                  if (member && member.id) {
                    // 只包含基本数据类型
                    teamData[member.id] = {
                      id: String(member.id),
                      name: String(member.name || '未知成员'),
                      maxHp: Number(member.maxHp) || 100,
                      currentHp: Number(member.currentHp) || 100,
                      maxMp: Number(member.maxMp) || 50,
                      currentMp: Number(member.currentMp) || 50,
                      position: {
                        x: Number(member.position?.x) || 0,
                        y: Number(member.position?.y) || 0
                      },
                      canAct: Boolean(member.canAct),
                      isDead: Boolean(member.isDead),
                      isActive: Boolean(member.isActive)
                    };
                  }
                });
              }
              
              campBData[team.id] = {
                id: String(team.id),
                name: String(team.name || '未知队伍'),
                members: teamData
              };
            }
          });
          
          snapshot.camps.campB = { teams: campBData };
        }
      } catch (campError) {
        console.warn('创建阵营数据失败，使用空数据:', campError);
      }

      // 安全地创建事件数据 - 只包含基本类型
      try {
        if (context.eventQueue && Array.isArray(context.eventQueue)) {
          const currentFrameEvents = context.eventQueue
            .filter((e: any) => e && e.frame === context.currentFrame)
            .slice(0, 5) // 限制事件数量
            .map((event: any) => ({
              id: String(event.id || ''),
              type: String(event.type || ''),
              frame: Number(event.frame) || 0,
              priority: Number(event.priority) || 0,
              sourceId: event.sourceId ? String(event.sourceId) : undefined,
              targetId: event.targetId ? String(event.targetId) : undefined
            }));
          snapshot.events = currentFrameEvents;
        }
      } catch (eventError) {
        console.warn('创建事件数据失败，使用空事件:', eventError);
        snapshot.events = [];
      }

      // 最终验证 - 确保数据完全可序列化
      try {
        // 使用结构化克隆算法测试
        const testSerialization = JSON.parse(JSON.stringify(snapshot));
        
        // 验证所有必需字段都存在且类型正确
        if (typeof testSerialization.frame === 'number' &&
            testSerialization.camps &&
            testSerialization.camps.campA &&
            testSerialization.camps.campB &&
            Array.isArray(testSerialization.events)) {
          return testSerialization;
        } else {
          console.warn('快照数据结构验证失败，使用fallback');
          return this.createFallbackSnapshot();
        }
      } catch (serializeError) {
        console.error('快照序列化验证失败，使用fallback:', serializeError);
        return this.createFallbackSnapshot();
      }
      
    } catch (error) {
      console.error('获取战斗快照失败:', error);
      return this.createFallbackSnapshot();
    }
  },

  /**
   * 创建fallback快照
   */
  createFallbackSnapshot(): BattleSnapshot {
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
};

// 使用Comlink暴露API
import * as Comlink from 'comlink';

// 暴露Worker API
const WorkerAPI = {
  PlayerControlAPI,
  // 可以在这里添加其他API模块
};

// 通过Comlink暴露API
Comlink.expose(WorkerAPI);

// 发送准备就绪信号
postMessage({ type: 'worker_ready' });

// 导出类型
export type { 
  BattleEvent,
  BattleEventType,
  BattleSnapshot,
  MemberState,
  WorkerMessage,
  WorkerResponse 
};

// 导出Worker API类型
export type WorkerAPIType = typeof WorkerAPI; 