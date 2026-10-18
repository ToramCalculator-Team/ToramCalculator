/**
 * 事件目录（扁平注册表）。
 */

export interface EventDefinition {
	/** 事件名（唯一 key，建议 dot-namespace：`status.entered` / `damage.received`）。 */
	name: string;
	/** 负载类型 */
	payload: unknown;
	/** 调试描述。 */
	description: string;
}

/**
 * 扁平事件目录。构造后只读。
 */
export type WorldEvent =
	| {
			name: "death";
			payload: {
				targetMemberId: string;
			};
			description: "角色死亡事件";
	  }
	| {
			name: "move_start";
			payload: {
				targetMemberId: string;
				direction: { x: number; y: number; z: number };
			};
			description: "角色开始移动事件";
	  }
	| {
			name: "move_stop";
			payload: {
				targetMemberId: string;
			};
			description: "角色停止移动事件";
	  };
