import { worldStateStringId } from "~/engine/core/thread/worldStateBuffer";
import type { WorldResource } from "../contracts/worldResource";

export type VisualProfile = {
	id: number;
	resource: WorldResource;
};

/**
 * 渲染器静态视觉资源注册表。
 *
 * 资源只在 Session 初始化时注册一次；实时 SAB 仅提供 visualProfileId，
 * 因而运行中实体出现时仍使用同一解析规则，不通过跨线程命令重新请求模型。
 */
export class VisualProfileRegistry {
	private readonly profiles = new Map<number, VisualProfile>();

	register(resources: readonly WorldResource[]): void {
		for (const resource of resources) {
			const ids = new Set(
				[worldStateStringId(resource.memberId), resource.visualProfileId].filter((id) => id !== undefined),
			);
			for (const id of ids) {
				const previous = this.profiles.get(id);
				if (previous && previous.resource.resourceId !== resource.resourceId) {
					throw new Error(`visualProfileId 冲突: ${id}`);
				}
				this.profiles.set(id, { id, resource });
			}
		}
	}

	get(id: number): VisualProfile | undefined {
		return this.profiles.get(id);
	}

	/** 初始成员和动态实体都必须使用 SAB 提供的精确 profile，不隐式选择同类型模板。 */
	resolve(id: number): VisualProfile | undefined {
		return this.get(id);
	}

	clear(): void {
		this.profiles.clear();
	}
}
