import { createEffect, createSignal, onCleanup } from "solid-js";
import { createActor } from "xstate";
import { machine } from "~/worker/evaluate.worker";

export default function EvaluatePage() {
  const [simulator, setSimulator] = createSignal<ReturnType<typeof createActor<typeof machine>> | null>(null);
  const [currentState, setCurrentState] = createSignal<string>("");
  const [characterState, setCharacterState] = createSignal<string>("");

  createEffect(() => {
    // 初始化模拟器
    const newSimulator = createActor(machine);
    setSimulator(newSimulator);

    // 订阅状态变化
    const subscription = newSimulator.subscribe((snapshot) => {
      // 将状态对象转换为可读的字符串
      const stateValue = snapshot.value;
      let stateString = "";
      
      if (typeof stateValue === "string") {
        stateString = stateValue;
      } else if (typeof stateValue === "object") {
        // 处理嵌套状态
        const states = Object.entries(stateValue).map(([key, value]) => {
          if (typeof value === "string") {
            return `${key}: ${value}`;
          } else if (typeof value === "object") {
            return `${key}: ${Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
          }
          return `${key}: ${value}`;
        });
        stateString = states.join(" | ");
      }
      
      setCurrentState(stateString);

      // 获取角色状态
      const characterActor = snapshot.context.characterActor;
      if (characterActor) {
        const charSnapshot = characterActor.getSnapshot();
        const charStateValue = charSnapshot.value;
        let charStateString = "";
        
        if (typeof charStateValue === "string") {
          charStateString = charStateValue;
        } else if (typeof charStateValue === "object") {
          const charStates = Object.entries(charStateValue).map(([key, value]) => {
            if (typeof value === "string") {
              return `${key}: ${value}`;
            } else if (typeof value === "object") {
              return `${key}: ${Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
            }
            return `${key}: ${value}`;
          });
          charStateString = charStates.join(" | ");
        }
        
        setCharacterState(charStateString);
      }
    });

    // 启动模拟器
    newSimulator.start();

    onCleanup(() => {
      subscription.unsubscribe();
      newSimulator.stop();
    });
  });

  const handleStart = () => {
    simulator()?.send({ type: "START" });
  };

  const handlePause = () => {
    simulator()?.send({ type: "PAUSE" });
  };

  const handleCancel = () => {
    simulator()?.send({ type: "CANCEL" });
  };

  const handleReset = () => {
    simulator()?.send({ type: "RESET" });
  };

  return (
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">状态机测试页面</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="border rounded-lg p-4">
          <h2 class="text-xl font-semibold mb-4">模拟器状态</h2>
          <div class="mb-4">
            <p class="text-sm text-gray-500">当前状态：</p>
            <p class="font-mono">{currentState()}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button 
              onClick={handleStart}
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              开始
            </button>
            <button 
              onClick={handlePause}
              class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              暂停
            </button>
            <button 
              onClick={handleCancel}
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              取消
            </button>
            <button 
              onClick={handleReset}
              class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              重置
            </button>
          </div>
        </div>

        <div class="border rounded-lg p-4">
          <h2 class="text-xl font-semibold mb-4">角色状态</h2>
          <div class="mb-4">
            <p class="text-sm text-gray-500">当前状态：</p>
            <p class="font-mono">{characterState()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}