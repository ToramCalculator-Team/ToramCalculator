/**
 * 场景意图投影适配器。把注意力机快照投影为场景相机动作（ADR 0012 的 π_scene）。
 *
 * 见 docs/decisions/0012-intent-first-visual-control.md
 *
 * 不变量落点：
 *  - #2 投影无状态：唯一持有值是当前补间取消句柄（瞬态），永不回写意图层。
 *  - #3 输入与投影不直连：本适配器只读快照、只调 deps，不向意图机发输入事件。
 *  - #5 回执建议性：进入 acquiring/releasing 时由 deps 在补间完成回执 onSettled（SETTLED）。
 */

import type { Operation, Target } from "../intent/types";
import type { VisualIntentActorRef } from "../intent/visualIntentMachine";

export type SceneIntentProjectionDeps = {
	/** 对焦到目标，补间完成调用 onSettled；返回取消函数。 */
	focusTarget: (target: Target, op: Operation, onSettled: () => void) => () => void;
	/** 释放焦点（回观察位），完成调用 onSettled；返回取消函数。 */
	releaseFocus: (onSettled: () => void) => () => void;
};

export function createSceneIntentProjection(
	intentActor: VisualIntentActorRef,
	deps: SceneIntentProjectionDeps,
): () => void {
	// 唯一瞬态：当前在途补间的取消句柄。
	let cancelInflight: (() => void) | null = null;
	// 记录上一次已处理的状态值，避免同状态重复触发补间。
	let lastHandled: string | null = null;

	const cancelCurrent = () => {
		cancelInflight?.();
		cancelInflight = null;
	};

	const subscription = intentActor.subscribe((snapshot) => {
		const value = String(snapshot.value);
		if (value === lastHandled) return;
		lastHandled = value;

		if (value === "acquiring") {
			const target = snapshot.context.target;
			if (!target) return;
			cancelCurrent();
			cancelInflight = deps.focusTarget(target, snapshot.context.operation, () => {
				intentActor.send({ type: "SETTLED", target });
			});
			return;
		}

		if (value === "releasing") {
			// releasing 的 SETTLED 无 guard（任意 target 均接受）；沿用当前 context.target，无则用占位。
			const pending = snapshot.context.target;
			cancelCurrent();
			cancelInflight = deps.releaseFocus(() => {
				intentActor.send({
					type: "SETTLED",
					target: pending ?? { kind: "skillTree", characterId: "__release__" },
				});
			});
		}
	});

	return () => {
		subscription.unsubscribe();
		cancelCurrent();
	};
}
