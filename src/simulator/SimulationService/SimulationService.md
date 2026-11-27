# SimulationService

## 模块职责

`SimulationService` 管理模拟实例的创建、登记和销毁，为业务流程提供单次模拟的创建入口。

1. 调用实例装配器创建四个组成模块均已就绪的 `SimulationInstance`，其中宿主已装载游戏系统。
2. 为每个实例分配标识并维护实例登记。
3. 调用实例释放自身资源；实例销毁四个组成模块，宿主释放其持有的游戏系统、时钟和观察者；释放完成后服务移除登记。
4. 在服务关闭时释放当前登记的全部实例。

实例创建成功时，游戏系统已装载并处于停止状态。服务不负责游戏系统的运行控制、输入操作、观察数据读取或业务分析流程。

## 理想结构

```typescript
class SimulationService {
  /**
   * 创建一个已装配的模拟实例。
   *
   * @returns 可直接启动的模拟实例
   */
  createInstance(): Promise<SimulationInstance>;

  /**
   * 按标识取得当前实例。
   *
   * @param instanceId 模拟实例标识
   * @returns 当前实例；实例不存在时返回 null
   */
  getInstance(instanceId: string): SimulationInstance | null;

  /**
   * 销毁并移除指定实例。
   *
   * @param instanceId 模拟实例标识
   * @returns 资源释放完成的 Promise
   */
  closeInstance(instanceId: string): Promise<void>;

  /**
   * 销毁服务持有的全部实例。
   *
   * @returns 所有实例资源释放完成的 Promise
   */
  dispose(): Promise<void>;
}
```

## 关键设计决策

### 1. 服务负责实例级生命周期

服务创建和销毁模拟实例；实例负责四个组成模块及通道的释放，游戏系统宿主负责其管理的游戏系统、逻辑时钟和观察者。

### 2. 业务流程由调用方组织

差异分析、批量运行、结果比较和页面工作流调用服务创建实例，随后直接操作实例并解释结果。

### 3. 执行策略由装配器决定

实例可以使用当前线程或 Worker 执行。服务装配实例依赖，业务接口不暴露线程部署细节。
