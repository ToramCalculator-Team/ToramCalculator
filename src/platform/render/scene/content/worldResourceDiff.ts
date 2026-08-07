import type { CharacterAnimationClips, WorldResource } from "../contracts/worldResource";

const haveSameAnimationClips = (left: CharacterAnimationClips, right: CharacterAnimationClips): boolean =>
	left.idle === right.idle &&
	left.walk === right.walk &&
	left.run === right.run &&
	left.jump === right.jump &&
	left.fall === right.fall &&
	left.land === right.land;

/**
 * 判断已有 Babylon 实体是否还能投影新的静态资源。
 * 任一静态字段变化都要求替换实体，避免 WorldResource 与运行时 mesh/动画映射形成双事实源。
 */
export function canReuseWorldResource(previous: WorldResource, next: WorldResource): boolean {
	if (
		previous.memberId !== next.memberId ||
		previous.resourceId !== next.resourceId ||
		previous.displayName !== next.displayName ||
		previous.kind !== next.kind
	) {
		return false;
	}

	if (previous.kind === "character" && next.kind === "character") {
		return (
			previous.model.uri === next.model.uri &&
			previous.appearance.scale === next.appearance.scale &&
			haveSameAnimationClips(previous.animation.clips, next.animation.clips)
		);
	}

	if (previous.kind === "mob" && next.kind === "mob") {
		return previous.appearance.radius === next.appearance.radius && previous.appearance.color === next.appearance.color;
	}

	return false;
}
