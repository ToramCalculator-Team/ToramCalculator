/**
 * 极简的模拟器Worker
 * 只负责连接SimulatorPool和GameEngine
 */

import { GameEngine } from './core/GameEngine';
import type { SimulatorWithRelations } from '~/repositories/simulator';
import type { IntentMessage, MessageProcessResult } from './core/MessageRouter';
import { Logger } from '~/utils/logger';

// 创建GameEngine实例
const gameEngine = new GameEngine();

// 处理主线程消息
self.onmessage = async (event: MessageEvent) => {
  const { taskId, type, data, port } = event.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'init':
        // 初始化Worker，设置MessageChannel
        if (port) {
          // 设置MessageChannel端口用于任务通信
          port.onmessage = async (portEvent: MessageEvent) => {
            const { taskId: portTaskId, type: portType, data: portData } = portEvent.data;
            
            try {
              let portResult: any;
              
              switch (portType) {
                case 'start_simulation':
                  // 初始化战斗数据
                  const simulatorData: SimulatorWithRelations = portData;
                  console.log('Worker: 启动模拟，数据:', simulatorData);
                  // 添加阵营A
                  gameEngine.addCamp('campA', '阵营A');
                  simulatorData.campA.forEach((team, index) => {
                    gameEngine.addTeam('campA', team, `队伍${index + 1}`);
                    team.members.forEach(member => {
                      console.log(`Worker: 添加成员 campA team${index + 1}:`, member);
                      gameEngine.addMember('campA', team.id, member as any, {
                        currentHp: 1000,
                        currentMp: 100,
                        position: { x: 100 + index * 50, y: 100 }
                      });
                    });
                  });

                  // 添加阵营B
                  gameEngine.addCamp('campB', '阵营B');
                  simulatorData.campB.forEach((team, index) => {
                    gameEngine.addTeam('campB', team, `队伍${index + 1}`);
                    team.members.forEach(member => {
                      console.log(`Worker: 添加成员 campB team${index + 1}:`, member);
                      gameEngine.addMember('campB', team.id, member as any, {
                        currentHp: 1000,
                        currentMp: 100,
                        position: { x: 500 + index * 50, y: 100 }
                      });
                    });
                  });

                  // 启动引擎
                  gameEngine.start();
                  // 打印成员总数
                  const allMembers = gameEngine.getAllMemberData();
                  console.log(`Worker: 模拟启动完成，总成员数: ${allMembers.length}`);
                  portResult = { success: true };
                  break;
                  
                case 'stop_simulation':
                  gameEngine.stop();
                  gameEngine.cleanup();
                  portResult = { success: true };
                  break;
                  
                case 'pause_simulation':
                  gameEngine.pause();
                  portResult = { success: true };
                  break;
                  
                case 'resume_simulation':
                  gameEngine.resume();
                  portResult = { success: true };
                  break;
                  
                case 'process_intent':
                  portResult = await gameEngine.processIntent(portData);
                  break;
                  
                case 'get_snapshot':
                  portResult = gameEngine.getCurrentSnapshot();
                  break;
                  
                case 'get_stats':
                  portResult = gameEngine.getStats();
                  break;
                  
                case 'get_members':
                  // 获取所有成员数据（使用序列化接口）
                  try {
                    const members = gameEngine.getAllMemberData();
                    portResult = { success: true, data: members };
                    // console.log(`👹 [Worker] 返回成员数据: ${members.length} 个成员`);
                  } catch (error) {
                    portResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
                    console.error(`Worker: 获取成员数据失败:`, error);
                  }
                  break;
                  
                case 'send_intent':
                  // 处理意图消息
                  const intent = portData;
                  console.log(`Worker: 收到意图消息:`, intent);
                  if (intent && intent.type) {
                    try {
                      const result = await gameEngine.processIntent(intent);
                      portResult = { success: result.success, error: result.error };
                      console.log(`Worker: 处理意图消息成功: ${intent.type}`);
                    } catch (error) {
                      portResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
                      console.error(`Worker: 处理意图消息失败:`, error);
                    }
                  } else {
                    portResult = { success: false, error: 'Invalid intent data' };
                    console.error(`Worker: 意图数据无效:`, intent);
                  }
                  break;
                  
                default:
                  throw new Error(`未知消息类型: ${portType}`);
              }
              
              // 返回结果给SimulatorPool
              port.postMessage({
                taskId: portTaskId,
                result: portResult,
                error: null
              });
              
            } catch (error) {
              // 返回错误给SimulatorPool
              port.postMessage({
                taskId: portTaskId,
                result: null,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          };
        }
        
        // 通知主线程Worker已准备就绪
        self.postMessage({ type: 'worker_ready' });
        return;
        
      default:
        throw new Error(`未知消息类型: ${type}`);
    }
    
  } catch (error) {
    // 返回错误给主线程
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// 通知主线程Worker已准备就绪
self.postMessage({ type: 'worker_ready' });
