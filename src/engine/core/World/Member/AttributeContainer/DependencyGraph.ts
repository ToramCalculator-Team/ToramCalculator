/**
 * 依赖图管理
 */
export class DependencyGraph {
	private readonly dependencies: Set<number>[] = [];
	private readonly dependents: Set<number>[] = [];
	private sortedKeys: number[] = [];
	private isTopologySorted = false;

	constructor(private readonly maxSize: number) {
		// 预分配数组
		for (let i = 0; i < maxSize; i++) {
			this.dependencies[i] = new Set();
			this.dependents[i] = new Set();
		}
	}

	addDependency(dependent: number, dependency: number): void {
		if (dependent === dependency) return;

		this.dependencies[dependent].add(dependency);
		this.dependents[dependency].add(dependent);
		this.isTopologySorted = false;
	}

	removeDependency(dependent: number, dependency: number): void {
		this.dependencies[dependent].delete(dependency);
		this.dependents[dependency].delete(dependent);
		this.isTopologySorted = false;
	}

	getDependencies(attr: number): Set<number> {
		return this.dependencies[attr];
	}

	getDependents(attr: number): Set<number> {
		return this.dependents[attr];
	}

	getTopologicalOrder(): number[] {
		if (this.isTopologySorted) {
			return this.sortedKeys;
		}

		const visited = new Uint8Array(this.maxSize);
		const temp = new Uint8Array(this.maxSize);
		const order: number[] = [];

		const visit = (node: number) => {
			if (temp[node]) {
				throw new Error(`检测到循环依赖: ${node}`);
			}
			if (visited[node]) return;

			temp[node] = 1;
			for (const dep of this.dependencies[node]) {
				visit(dep);
			}
			temp[node] = 0;
			visited[node] = 1;
			order.push(node);
		};

		for (let i = 0; i < this.maxSize; i++) {
			if (!visited[i] && (this.dependencies[i].size > 0 || this.dependents[i].size > 0)) {
				visit(i);
			}
		}

		this.sortedKeys = order;
		this.isTopologySorted = true;
		return order;
	}

	getAffectedAttributes(changedAttr: number): Set<number> {
		const affected = new Set<number>();
		const queue: number[] = [changedAttr];
		let head = 0;

		while (head < queue.length) {
			const current = queue[head++];
			if (affected.has(current)) continue;

			affected.add(current);
			for (const dependent of this.dependents[current]) {
				queue.push(dependent);
			}
		}

		return affected;
	}

	/**
	 * 导出依赖图的反向映射（以索引表示）
	 * key 为属性索引，value 为依赖该属性的索引数组
	 */
	toDependentsObject(): Record<number, number[]> {
		const result: Record<number, number[]> = {};
		for (let i = 0; i < this.dependents.length; i++) {
			if (this.dependents[i].size > 0) {
				result[i] = Array.from(this.dependents[i]);
			}
		}
		return result;
	}

	/**
	 * 检测循环依赖，返回由索引组成的环列表
	 */
	detectCycles(): number[][] {
		const cycles: number[][] = [];
		const visited = new Set<number>();
		const recursionStack = new Set<number>();
		const path: number[] = [];

		const dfs = (nodeIndex: number): boolean => {
			if (recursionStack.has(nodeIndex)) {
				const cycleStart = path.indexOf(nodeIndex);
				if (cycleStart !== -1) cycles.push(path.slice(cycleStart));
				return true;
			}
			if (visited.has(nodeIndex)) return false;

			visited.add(nodeIndex);
			recursionStack.add(nodeIndex);
			path.push(nodeIndex);

			for (const dep of this.dependencies[nodeIndex]) {
				if (dfs(dep)) {
					return true;
				}
			}

			recursionStack.delete(nodeIndex);
			path.pop();
			return false;
		};

		for (let i = 0; i < this.dependencies.length; i++) {
			if (!visited.has(i)) dfs(i);
		}

		return cycles;
	}
}
