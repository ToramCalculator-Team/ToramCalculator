export enum TriggerEvent {
  技能效果选择,
  技能射程计算,
}

export interface TriggerEventNodeMap extends Record<TriggerEvent, unknown> {
  
 }