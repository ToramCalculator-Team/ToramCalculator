import { Node, NodeDef, Status, Tree } from "../../index";
import { Role, RoleContext } from "../role";

export class RandomWander extends Node {
    static SPEED = 30;
    static WANDER_RANGE = 100; // 闲逛范围
    static MAP_BOUNDS = { minX: -200, maxX: 200, minY: -200, maxY: 200 }; // 地图边界

    declare args: {
        time?: number; // 闲逛时间限制
    };

    private wanderStartTime: number = 0;
    private wanderTarget: { x: number; y: number } | null = null;

    override onTick(tree: Tree<RoleContext, Role>): Status {
        const owner = tree.owner;
        const currentTime = tree.context.time || 0;
        const wanderTime = this.args.time || 3; // 默认3秒

        // 初始化闲逛目标
        if (!this.wanderTarget) {
            this.wanderTarget = this.generateWanderTarget(owner);
            this.wanderStartTime = currentTime;
            const direction = this.getDirectionString(owner.x, owner.y, this.wanderTarget.x, this.wanderTarget.y);
            console.log(`开始闲逛: (${owner.x}, ${owner.y}) -> (${this.wanderTarget.x}, ${this.wanderTarget.y}) ${direction}`);
        }

        // 检查是否超时 (假设每秒60tick，所以3秒=180tick)
        const tickPerSecond = 60;
        if (currentTime - this.wanderStartTime >= wanderTime * tickPerSecond) {
            this.wanderTarget = this.generateWanderTarget(owner);
            this.wanderStartTime = currentTime;
            const direction = this.getDirectionString(owner.x, owner.y, this.wanderTarget.x, this.wanderTarget.y);
            console.log(`闲逛超时，更换方向: (${owner.x}, ${owner.y}) -> (${this.wanderTarget.x}, ${this.wanderTarget.y}) ${direction}`);
        }

        // 移动到闲逛目标
        const { x, y } = owner;
        const { x: tx, y: ty } = this.wanderTarget;

        if (Math.abs(x - tx) < RandomWander.SPEED && Math.abs(y - ty) < RandomWander.SPEED) {
            this.wanderTarget = this.generateWanderTarget(owner);
            this.wanderStartTime = currentTime;
            const direction = this.getDirectionString(owner.x, owner.y, this.wanderTarget.x, this.wanderTarget.y);
            console.log(`到达目标，新方向: ${direction}`);
            return "success";
        }

        // 移动逻辑
        if (Math.abs(x - tx) >= RandomWander.SPEED) {
            const newX = owner.x + RandomWander.SPEED * (tx > x ? 1 : -1);
            // 边界检查
            if (newX >= RandomWander.MAP_BOUNDS.minX && newX <= RandomWander.MAP_BOUNDS.maxX) {
                owner.x = newX;
            }
        }

        if (Math.abs(y - ty) >= RandomWander.SPEED) {
            const newY = owner.y + RandomWander.SPEED * (ty > y ? 1 : -1);
            // 边界检查
            if (newY >= RandomWander.MAP_BOUNDS.minY && newY <= RandomWander.MAP_BOUNDS.maxY) {
                owner.y = newY;
            }
        }

        return tree.yield(this);
    }

    private generateWanderTarget(owner: Role): { x: number; y: number } {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * RandomWander.WANDER_RANGE;
        let targetX = owner.x + Math.cos(angle) * distance;
        let targetY = owner.y + Math.sin(angle) * distance;
        
        // 确保目标在地图边界内
        targetX = Math.max(RandomWander.MAP_BOUNDS.minX, Math.min(RandomWander.MAP_BOUNDS.maxX, targetX));
        targetY = Math.max(RandomWander.MAP_BOUNDS.minY, Math.min(RandomWander.MAP_BOUNDS.maxY, targetY));
        
        return { x: targetX, y: targetY };
    }

    private getDirectionString(fromX: number, fromY: number, toX: number, toY: number): string {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) return "原地";
        
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const normalizedAngle = (angle + 360) % 360;
        
        if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return "→ 东";
        if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return "↗ 东北";
        if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return "↑ 北";
        if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return "↖ 西北";
        if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return "← 西";
        if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return "↙ 西南";
        if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return "↓ 南";
        if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return "↘ 东南";
        
        return "未知方向";
    }

    static override get descriptor(): Readonly<NodeDef> {
        return {
            name: "RandomWander",
            type: "Action",
            desc: "随机闲逛",
            args: [
                { name: "time", type: "int?", desc: "闲逛时间限制(秒)" }
            ],
        };
    }
}
