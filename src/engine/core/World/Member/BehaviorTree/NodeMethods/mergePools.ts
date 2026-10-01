type NamedPool = Readonly<Record<string, unknown>>;
type DisjointRight<TLeft extends NamedPool, TRight extends NamedPool> = Extract<keyof TLeft, keyof TRight> extends never
	? unknown
	: never;

export function assertDisjointPools(left: NamedPool, right: NamedPool): void {
	for (const key of Object.keys(right)) {
		if (Object.hasOwn(left, key)) {
			throw new Error(`行为树能力池存在重复键：${key}`);
		}
	}
}

function mergePoolRuntime(left: NamedPool, right: NamedPool): NamedPool {
	assertDisjointPools(left, right);
	return { ...left, ...right };
}

/**
 * 合并两个静态能力池。
 * 当两个池存在同名能力时，调用点会产生类型错误；运行时也会拒绝动态重复键。
 */
export function mergePools<TLeft extends NamedPool, TRight extends NamedPool>(
	left: TLeft,
	right: TRight & DisjointRight<TLeft, TRight>,
): TLeft & TRight {
	return mergePoolRuntime(left, right) as TLeft & TRight;
}
