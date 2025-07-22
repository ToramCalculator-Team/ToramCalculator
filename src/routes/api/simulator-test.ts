import { APIEvent } from "@solidjs/start/server";
import { SimulatorExample } from "~/components/features/simulator/core/SimulatorExample";

// 全局模拟器实例（在生产环境中应该使用更好的状态管理）
let globalSimulator: SimulatorExample | null = null;

/**
 * 获取或创建模拟器实例
 */
function getSimulator(): SimulatorExample {
  if (!globalSimulator) {
    globalSimulator = new SimulatorExample();
  }
  return globalSimulator;
}

/**
 * 模拟器测试API
 */
export async function GET(event: APIEvent) {
  try {
    const url = new URL(event.request.url);
    const action = url.searchParams.get('action');
    
    const simulator = getSimulator();
    
    switch (action) {
      case 'status':
        return new Response(JSON.stringify({
          success: true,
          data: simulator.getSystemStatus()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case 'start':
        simulator.start();
        return new Response(JSON.stringify({
          success: true,
          message: '模拟器已启动'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case 'stop':
        simulator.stop();
        return new Response(JSON.stringify({
          success: true,
          message: '模拟器已停止'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case 'pause':
        simulator.pause();
        return new Response(JSON.stringify({
          success: true,
          message: '模拟器已暂停'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case 'resume':
        simulator.resume();
        return new Response(JSON.stringify({
          success: true,
          message: '模拟器已恢复'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      default:
        return new Response(JSON.stringify({
          success: false,
          error: '无效的操作'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { action, ...params } = body;
    
    const simulator = getSimulator();
    
    switch (action) {
      case 'skillCast':
        const { memberId, skillId, targetId } = params;
        simulator.simulateSkillCast(memberId, skillId, targetId);
        return new Response(JSON.stringify({
          success: true,
          message: `技能释放: ${skillId}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case 'buffApplication':
        const { memberId: buffMemberId, buffType, duration } = params;
        simulator.simulateBuffApplication(buffMemberId, buffType, duration);
        return new Response(JSON.stringify({
          success: true,
          message: `Buff应用: ${buffType}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case 'timeScale':
        const { scale } = params;
        simulator.setTimeScale(scale);
        return new Response(JSON.stringify({
          success: true,
          message: `时间倍率设置为: ${scale}x`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      default:
        return new Response(JSON.stringify({
          success: false,
          error: '无效的操作'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}