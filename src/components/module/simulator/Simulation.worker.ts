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
    members: Record<string, MemberState>;
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
        // 🎯 修复：设置初始战斗状态为未结束
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
      // 每60帧或重要事件发生时生成快照
      const shouldSnapshot = context.currentFrame % 60 === 0 || 
                             context.eventQueue.some(e => e.frame === context.currentFrame);
      
      if (!shouldSnapshot) return {};
      
      const snapshot: BattleSnapshot = {
        frame: context.currentFrame,
        camps: {
          campA: createCampSnapshot(context.campA, context.members),
          campB: createCampSnapshot(context.campB, context.members)
        },
        events: context.eventQueue.filter(e => e.frame === context.currentFrame),
        battleStatus: context.battleResult
      };
      
      return {
        snapshots: [...context.snapshots, snapshot]
      };
    }),
    
    'check_battle_end_condition': assign(({ context }) => {
      // 🎯 调试：检查战斗结束条件
      console.log('🔍 Checking battle end condition at frame:', context.currentFrame);
      console.log('📊 Camp A teams:', context.campA.length, 'Camp B teams:', context.campB.length);
      
      const campAAlive = context.campA.flatMap(team => team.members)
        .some(member => {
          const memberActor = context.members.get(member.id);
          const memberState = memberActor?.getSnapshot().context.memberState;
          console.log(`👤 Member ${member.id}:`, {
            actorExists: !!memberActor,
            memberState: !!memberState,
            isDead: memberState?.isDead
          });
          return memberState && !memberState.isDead;
        });
      
      const campBAlive = context.campB.flatMap(team => team.members)
        .some(member => {
          const memberActor = context.members.get(member.id);
          const memberState = memberActor?.getSnapshot().context.memberState;
          console.log(`👹 Member ${member.id}:`, {
            actorExists: !!memberActor,
            memberState: !!memberState,
            isDead: memberState?.isDead
          });
          return memberState && !memberState.isDead;
        });
      
      console.log('💚 Camp A alive:', campAAlive, 'Camp B alive:', campBAlive);
      
      let battleResult;
      if (!campAAlive) {
        console.log('❌ A阵营全灭 - 战斗结束');
        battleResult = {
          isEnded: true,
          winner: 'campB' as const,
          reason: 'A阵营全灭'
        };
      } else if (!campBAlive) {
        console.log('❌ B阵营全灭 - 战斗结束');
        battleResult = {
          isEnded: true,
          winner: 'campA' as const,
          reason: 'B阵营全灭'
        };
      } else if (context.currentFrame >= context.maxFrames) {
        console.log('⏰ 达到最大帧数 - 战斗结束');
        battleResult = {
          isEnded: true,
          reason: '达到最大帧数限制'
        };
      } else {
        console.log('✅ 战斗继续');
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
              guard: ({ context }) => context.battleResult?.isEnded === true // 🎯 修复：只有战斗结束才跳转到idle
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
  const campSnapshot: CampSnapshot = { teams: {} };
  
  teams.forEach(team => {
    const teamSnapshot = {
      id: team.id,
      name: team.name,
      members: {} as Record<string, MemberState>
    };
    
    team.members.forEach(member => {
      const memberActor = members.get(member.id);
      if (memberActor) {
        const memberState = memberActor.getSnapshot().context.memberState;
        teamSnapshot.members[member.id] = { ...memberState };
      }
    });
    
    campSnapshot.teams[team.id] = teamSnapshot;
  });
  
  return campSnapshot;
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
} | {
  type: 'player_control';
  data: {
    playerId: string;
    action: 'cast_skill' | 'move' | 'stop_action';
    payload?: {
      skillId?: string;
      targetPosition?: { x: number; y: number };
      targetId?: string;
    };
  };
};

type WorkerResponse = {
  type: 'simulation_complete';
  data: BattleSnapshot[];
} | {
  type: 'simulation_progress';
  data: { frame: number; progress: number; battleSnapshot?: BattleSnapshot; battleStatus?: any };
} | {
  type: 'player_action_result';
  data: { success: boolean; message: string; playerId: string };
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
        
        // 监听状态变化
        simulatorActor.subscribe((state: any) => {
          if (state.matches('idle') && state.context.snapshots.length > 0) {
            // 模拟完成
            sendResponse({
              result: {
                type: 'simulation_complete',
                data: state.context.snapshots
              },
              metrics: {
                duration: Date.now() - (state.context.startTime || Date.now()),
                memoryUsage: 0 // 可以添加内存使用统计
              }
            });
          } else if (state.matches('running')) {
            // 🎯 修复：在进度更新中包含战斗快照
            // 生成当前帧的战斗快照
            const currentSnapshot: BattleSnapshot = {
              frame: state.context.currentFrame,
              camps: {
                campA: createCampSnapshot(state.context.campA, state.context.members),
                campB: createCampSnapshot(state.context.campB, state.context.members)
              },
              events: state.context.eventQueue.filter((e: BattleEvent) => e.frame === state.context.currentFrame),
              battleStatus: state.context.battleResult
            };

            // 🎯 调试：确认快照生成
            console.log('🎬 Worker generating battle snapshot for frame:', state.context.currentFrame);
            console.log('📊 Snapshot camps:', {
              campATeams: Object.keys(currentSnapshot.camps.campA.teams).length,
              campBTeams: Object.keys(currentSnapshot.camps.campB.teams).length
            });

            // 进度更新 - 包含战斗快照数据
            sendResponse({
              result: {
                type: 'simulation_progress',
                data: {
                  frame: state.context.currentFrame,
                  progress: Math.min((state.context.currentFrame / state.context.maxFrames) * 100, 100),
                  battleSnapshot: currentSnapshot, // 🎯 关键：添加战斗快照
                  battleStatus: state.context.battleResult
                }
              }
            });
            
            console.log('📤 Worker sent progress with battleSnapshot, frame:', state.context.currentFrame);
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

// 导出类型
export type { 
  BattleEvent,
  BattleEventType,
  BattleSnapshot,
  MemberState,
  WorkerMessage,
  WorkerResponse 
}; 