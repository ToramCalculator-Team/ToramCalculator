import { Button } from '~/components/controls/button';
import { BehaviorTreeBuilder, TaskStatus } from '~/components/features/behaviourTree';
import { BehaviorTree } from '~/components/features/behaviourTree/BehaviorTree';
import { createSignal, onCleanup, For, onMount } from 'solid-js';
import { Random } from '~/lib/utils/random';

// 移除状态枚举 - 行为树不需要明确的状态概念

enum Difficulty {
    Easy = "easy",
    Normal = "normal", 
    Hard = "hard"
}

// 位置接口
interface Position {
    x: number;
    y: number;
}

// 怪物类
class Monster {
    public position: Position;
    public health: number = 50;
    public maxHealth: number = 50;
    public attack: number = 15;
    public isAttacking: boolean = false;
    public targetPosition: Position | null = null;
    public attackRange: number = 3; // 怪物攻击范围
    
    constructor(position: Position) {
        this.position = position;
    }
    
    // 计算到目标的距离
    calculateDistance(target: Position): number {
        const dx = this.position.x - target.x;
        const dy = this.position.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 移动到目标
    moveToTarget(target: Position): void {
        const distance = this.calculateDistance(target);
        if (distance < 0.5) return;
        
        const moveDistance = Math.min(0.8, distance); // 减慢怪物移动速度，让移动更明显
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        
        this.position.x += (dx / distance) * moveDistance;
        this.position.y += (dy / distance) * moveDistance;
    }
    
    // 攻击
    attackTarget(target: Position): number {
        this.isAttacking = true;
        return this.attack + Random.integer(-3, 3);
    }
    
    // 受到伤害
    takeDamage(damage: number): void {
        this.health = Math.max(0, this.health - damage);
    }
    
    // 检查是否死亡
    isDead(): boolean {
        return this.health <= 0;
    }
}

// 创建一个复杂的AI角色
class AdvancedAICharacter {
    // 基础属性
    public health: number = 100;
    public maxHealth: number = 100;
    public mana: number = 50;
    public maxMana: number = 100;
    
    // 战斗属性
    public attack: number = 25;
    public defense: number = 10;
    public experience: number = 0;
    public level: number = 1;
    
    // 位置和战斗属性（移除状态概念）
    public position: Position = { x: 0, y: 0 };
    public targetPosition: Position | null = null;
    public isInCombat: boolean = false;
    public restCount: number = 0;
    
    // 巡逻相关属性
    public patrolTarget: Position | null = null;
    public patrolCount: number = 0;
    public maxPatrolCount: number = 3;
    
    // 警戒和攻击范围
    public alertRange: number = 30;
    public magicRange: number = 20;
    public meleeRange: number = 5;
    
    // 环境感知
    public nearbyEnemies: number = 0;
    public distanceToEnemy: number = Infinity;
    public healingItemsNearby: number = 0;
    public monsters: Monster[] = [];
    
    // AI参数
    public aggressiveness: number = 0.5; // 0-1，越高越激进
    public cautiousness: number = 0.3;   // 0-1，越高越谨慎
    public difficulty: Difficulty = Difficulty.Normal;
    
    // 日志记录
    public actionLog: string[] = [];
    
    constructor() {
        this.updateDifficultyStats();
    }
    
    // 创建简化的行为树 - 专注于巡逻
    createBehaviorTree() {
        console.log(`🌳 开始构建行为树，当前AI位置: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);
        const builder = BehaviorTreeBuilder.begin(this);
        
        const tree = builder.sequence()
            .logAction("👮 巡逻中")
            .action(ai => ai.patrol())
                .endComposite()
            .build();
        
        console.log(`🌳 行为树构建完成`);
        return tree;
    }
    
    // 行为方法实现
    seekHealingItems(): TaskStatus {
        // 寻找最近的治疗道具
        const targetPosition = {
            x: Random.range(-8, 8),
            y: Random.range(-8, 8)
        };
        
        const result = this.moveToTarget(targetPosition);
        if (result === TaskStatus.Success) {
            this.health = Math.min(this.maxHealth, this.health + 20);
            this.healingItemsNearby = Math.max(0, this.healingItemsNearby - 1);
            this.log(`💊 找到治疗道具！恢复20生命值，当前：${this.health}/${this.maxHealth}`);
        }
        return result;
    }
    
    retreat(): TaskStatus {
        // 快速撤退移动
        this.position.x += Random.range(-1.5, 1.5);
        this.position.y += Random.range(-1.5, 1.5);
        this.isInCombat = false;
        this.log(`🏃 撤退到位置 (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);
        return TaskStatus.Success;
    }
    
    magicAttack(): TaskStatus {
        if (this.mana < 30) return TaskStatus.Failure;
        
        this.mana -= 30;
        this.experience += 15;
        
        // 攻击最近的怪物
        if (this.monsters.length > 0) {
            const nearestMonster = this.monsters.reduce((nearest, monster) => {
                const nearestDist = this.calculateDistance(this.position, nearest.position);
                const monsterDist = this.calculateDistance(this.position, monster.position);
                return monsterDist < nearestDist ? monster : nearest;
            });
            
            const damage = this.attack + Random.integer(5, 15);
            nearestMonster.takeDamage(damage);
            this.log(`⚡ 魔法攻击成功！对怪物造成${damage}点伤害`);
            
            if (nearestMonster.isDead()) {
                this.log(`👹 怪物被击败！`);
            }
        }
        
        return TaskStatus.Success;
    }
    
    meleeAttack(): TaskStatus {
        this.experience += 10;
        this.health -= 5; // 受到反击伤害
        
        // 攻击最近的怪物
        if (this.monsters.length > 0) {
            const nearestMonster = this.monsters.reduce((nearest, monster) => {
                const nearestDist = this.calculateDistance(this.position, nearest.position);
                const monsterDist = this.calculateDistance(this.position, monster.position);
                return monsterDist < nearestDist ? monster : nearest;
            });
            
            const damage = this.attack + Random.integer(3, 8);
            nearestMonster.takeDamage(damage);
            this.log(`⚔️ 近战攻击成功！对怪物造成${damage}点伤害`);
            
            if (nearestMonster.isDead()) {
                this.log(`👹 怪物被击败！`);
            }
        }
        
        return TaskStatus.Success;
    }
    
    moveToEnemy(): TaskStatus {
        // 模拟向敌人移动（简化版本）
        const moveDistance = 1;
        const angle = Random.range(0, Math.PI * 2);
        
        this.position.x += Math.cos(angle) * moveDistance;
        this.position.y += Math.sin(angle) * moveDistance;
        
        this.log(`🏃 向敌人移动，距离：${this.distanceToEnemy}`);
        return TaskStatus.Success;
    }
    
    findHealingItems(): TaskStatus {
        this.health = Math.min(this.maxHealth, this.health + 25);
        this.healingItemsNearby = Math.max(0, this.healingItemsNearby - 1);
        this.log(`💊 使用治疗物品，恢复25生命值，当前：${this.health}/${this.maxHealth}`);
        return TaskStatus.Success;
    }
    
    rest(): TaskStatus {
        this.health = Math.min(this.maxHealth, this.health + 5);
        this.mana = Math.min(this.maxMana, this.mana + 8);
        this.restCount++;
        this.log(`🧘 休息中... 生命+5, 法力+8 (第${this.restCount}次休息)`);
        return TaskStatus.Success;
    }
    
    seekEnemies(): TaskStatus {
        this.nearbyEnemies = Random.integer(1, 3);
        this.distanceToEnemy = Random.integer(3, 12);
        this.log(`🔍 主动搜索敌人，发现${this.nearbyEnemies}个敌人，距离：${this.distanceToEnemy}`);
        return TaskStatus.Success;
    }
    
    explore(): TaskStatus {
        // 中等幅度的移动
        this.position.x += Random.range(-1, 1);
        this.position.y += Random.range(-1, 1);
        
        // 随机发现物品或敌人
        if (Random.chance(0.3)) {
            this.healingItemsNearby += Random.integer(1, 2);
            this.log(`🗺️ 探索发现治疗物品！`);
        }
        if (Random.chance(0.2)) {
            this.nearbyEnemies += 1;
            this.distanceToEnemy = Random.integer(2, 9);
            this.log(`🗺️ 探索遭遇敌人！`);
        }
        
        this.log(`🗺️ 探索到位置 (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);
        return TaskStatus.Success;
    }
    
    // 计算两点之间的距离
    calculateDistance(pos1: Position, pos2: Position): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 检查是否在警戒范围内
    isInAlertRange(): boolean {
        return this.distanceToEnemy <= this.alertRange;
    }
    
    // 检查是否在魔法攻击范围内
    isInMagicRange(): boolean {
        return this.distanceToEnemy <= this.magicRange;
    }
    
    // 检查是否在近战攻击范围内
    isInMeleeRange(): boolean {
        return this.distanceToEnemy <= this.meleeRange;
    }
    
    // 检查血量是否低于50%
    isHealthLow(): boolean {
        return this.health < this.maxHealth * 0.5;
    }
    
    
    // 移动到目标位置
    moveToTarget(target: Position): TaskStatus {
        const distance = this.calculateDistance(this.position, target);
        
        if (distance < 1.0) { // 增加到达目标的距离阈值
            console.log(`🎯 到达目标！当前位置:(${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}) 目标:(${target.x.toFixed(1)}, ${target.y.toFixed(1)}) 距离:${distance.toFixed(1)}`);
            return TaskStatus.Success; // 已到达目标
        }
        
        // 计算移动方向
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const moveDistance = Math.min(0.3, distance); // 降低5倍：从1.5减少到0.3
        
        // 更新位置
        this.position.x += (dx / distance) * moveDistance;
        this.position.y += (dy / distance) * moveDistance;
        
        return TaskStatus.Running;
    }
    
    // 智能巡逻
    patrol(mapRange?: number): TaskStatus {
        const range = mapRange || 20; // 使用传入的范围或默认值
        
        // 如果没有巡逻目标，随机生成一个
        if (!this.patrolTarget) {
            const oldTarget = this.patrolTarget;
            this.patrolTarget = {
                x: Random.range(-range, range),
                y: Random.range(-range, range)
            };
            this.patrolCount = 0;
            console.log(`🆕 情况1-初始目标生成: 无目标 -> (${this.patrolTarget.x.toFixed(1)}, ${this.patrolTarget.y.toFixed(1)}) 范围:${range}`);
            this.log(`🎯 设定新巡逻目标：(${this.patrolTarget.x.toFixed(1)}, ${this.patrolTarget.y.toFixed(1)}) 范围:${range}`);
        }
        
        // 移动到巡逻目标
        const result = this.moveToTarget(this.patrolTarget);
        
        // 只有在真正到达目标时才生成新目标
        if (result === TaskStatus.Success) {
            this.patrolCount++;
            this.log(`📍 到达巡逻点，往返次数：${this.patrolCount}/${this.maxPatrolCount}`);
            
            if (this.patrolCount >= this.maxPatrolCount) {
                // 完成巡逻，生成新目标
                const oldTarget = this.patrolTarget;
                this.patrolTarget = {
                    x: Random.range(-range, range),
                    y: Random.range(-range, range)
                };
                this.patrolCount = 0;
                console.log(`🆕 情况2-完成巡逻: (${oldTarget.x.toFixed(1)}, ${oldTarget.y.toFixed(1)}) -> (${this.patrolTarget.x.toFixed(1)}, ${this.patrolTarget.y.toFixed(1)}) 范围:${range}`);
                this.log(`🎯 开始新的巡逻目标：(${this.patrolTarget.x.toFixed(1)}, ${this.patrolTarget.y.toFixed(1)}) 范围:${range}`);
            } else {
                // 往返巡逻 - 生成相反方向的目标
                const oldTarget = this.patrolTarget;
                this.patrolTarget = {
                    x: Random.range(-range, range),
                    y: Random.range(-range, range)
                };
                console.log(`🆕 情况3-往返巡逻: (${oldTarget.x.toFixed(1)}, ${oldTarget.y.toFixed(1)}) -> (${this.patrolTarget.x.toFixed(1)}, ${this.patrolTarget.y.toFixed(1)}) 范围:${range}`);
                this.log(`🔄 往返巡逻，新目标：(${this.patrolTarget.x.toFixed(1)}, ${this.patrolTarget.y.toFixed(1)}) 范围:${range}`);
            }
        }
        
        // 移动过程中始终返回Running，只有到达目标才返回Success
        return result;
    }
    
    // 辅助方法
    updateDifficultyStats() {
        switch (this.difficulty) {
            case Difficulty.Easy:
                this.maxHealth = 120;
                this.attack = 30;
                this.defense = 15;
                break;
            case Difficulty.Hard:
                this.maxHealth = 80;
                this.attack = 20;
                this.defense = 5;
                break;
            default: // Normal
                this.maxHealth = 100;
                this.attack = 25;
                this.defense = 10;
        }
        this.health = this.maxHealth;
    }
    
    levelUp() {
        if (this.experience >= this.level * 100) {
            this.level++;
            this.experience = 0;
            this.maxHealth += 10;
            this.maxMana += 8;
            this.attack += 3;
            this.defense += 2;
            this.health = this.maxHealth; // 升级回满血
            this.log(`🎉 升级到 ${this.level} 级！所有属性提升！`);
        }
    }
    
    simulateEnvironment() {
        // 更新怪物状态
        this.updateMonsters();
        
        // 计算最近的敌人距离
        this.calculateNearestEnemy();
        
        // 模拟治疗道具
        if (Random.chance(0.15)) {
            this.healingItemsNearby += 1;
        }
        
        // 自然恢复
        this.mana = Math.min(this.maxMana, this.mana + 1);
    }
    
    // 更新怪物状态
    updateMonsters(): void {
        // 移除死亡的怪物
        this.monsters = this.monsters.filter(monster => !monster.isDead());
        
        // 更新敌人数量
        this.nearbyEnemies = this.monsters.length;
        
        // 让怪物向AI移动
        this.monsters.forEach(monster => {
            const distance = monster.calculateDistance(this.position);
            
            if (distance <= monster.attackRange) {
                // 怪物在攻击范围内，进行攻击
                const damage = monster.attackTarget(this.position);
                this.takeDamage(damage);
                this.log(`👹 怪物攻击！受到${damage}点伤害`);
            } else {
                // 怪物向AI移动
                monster.moveToTarget(this.position);
            }
        });
        
        // 随机生成新怪物
        if (Random.chance(0.05) && this.monsters.length < 5) {
            const mapRange = 15; // 对应地图尺寸的一半
            const newMonster = new Monster({
                x: Random.range(-mapRange, mapRange),
                y: Random.range(-mapRange, mapRange)
            });
            this.monsters.push(newMonster);
            this.log(`👹 新怪物出现！位置：(${newMonster.position.x.toFixed(1)}, ${newMonster.position.y.toFixed(1)})`);
        }
    }
    
    // 计算最近的敌人距离
    calculateNearestEnemy(): void {
        if (this.monsters.length === 0) {
            this.distanceToEnemy = Infinity;
            this.isInCombat = false;
            return;
        }
        
        let nearestDistance = Infinity;
        this.monsters.forEach(monster => {
            const distance = this.calculateDistance(this.position, monster.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
            }
        });
        
        this.distanceToEnemy = nearestDistance;
        this.isInCombat = true;
    }
    
    takeDamage(amount: number) {
        this.health = Math.max(0, this.health - amount);
        this.isInCombat = true;
        // 如果受到伤害但没有敌人距离信息，设置一个随机距离
        if (this.distanceToEnemy === Infinity) {
            this.distanceToEnemy = Math.floor(Math.random() * 5) + 1;
        }
        this.log(`💔 受到${amount}点伤害，当前生命值：${this.health}/${this.maxHealth}`);
    }
    
    log(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        this.actionLog.unshift(`[${timestamp}] ${message}`);
        if (this.actionLog.length > 50) {
            this.actionLog = this.actionLog.slice(0, 50);
        }
        // 移除console.log，统一使用LogAction
    }
    
    reset() {
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.experience = 0;
        this.level = 1;
        // 移除状态设置
        this.position = { x: 0, y: 0 };
        this.isInCombat = false;
        this.nearbyEnemies = 0;
        this.distanceToEnemy = Infinity;
        this.healingItemsNearby = 0;
        this.restCount = 0;
        this.actionLog = [];
        this.updateDifficultyStats();
        this.log("🔄 角色已重置");
    }
    
    // 复制另一个AI角色的状态
    copyFrom(other: AdvancedAICharacter): AdvancedAICharacter {
        this.health = other.health;
        this.maxHealth = other.maxHealth;
        this.mana = other.mana;
        this.maxMana = other.maxMana;
        this.attack = other.attack;
        this.defense = other.defense;
        this.experience = other.experience;
        this.level = other.level;
        this.position = { ...other.position };
        this.isInCombat = other.isInCombat;
        this.restCount = other.restCount;
        this.nearbyEnemies = other.nearbyEnemies;
        this.distanceToEnemy = other.distanceToEnemy;
        this.healingItemsNearby = other.healingItemsNearby;
        this.aggressiveness = other.aggressiveness;
        this.cautiousness = other.cautiousness;
        this.difficulty = other.difficulty;
        this.actionLog = [...other.actionLog];
        this.monsters = [...other.monsters];
        // 复制巡逻相关状态
        this.patrolTarget = other.patrolTarget ? { ...other.patrolTarget } : null;
        this.patrolCount = other.patrolCount;
        return this;
    }
}

export default function BehaviourTreeTest() {
    const [ai, setAI] = createSignal(new AdvancedAICharacter());
    const [behaviorTree, setBehaviorTree] = createSignal<BehaviorTree<AdvancedAICharacter> | null>(null);
    const [isRunning, setIsRunning] = createSignal(false);
    const [updateCounter, setUpdateCounter] = createSignal(0);
    
    // 单独存储位置信号，确保移动时UI能响应
    const [aiPosition, setAIPosition] = createSignal(ai().position);
    const [monsters, setMonsters] = createSignal(ai().monsters);
    
    // 地图尺寸信号
    const [mapSize, setMapSize] = createSignal({ width: 320, height: 320 });
    
    // 计算地图范围（基于实际尺寸）
    const getMapRange = () => {
        const size = mapSize();
        // 假设地图显示范围是-20到20，对应实际像素尺寸
        return Math.min(size.width, size.height) / 2 / 10; // 每10像素对应1个游戏单位
    };
    
    let intervalId: number | null = null;
    
    // 监听窗口大小变化
    const handleResize = () => {
        const mapElement = document.querySelector('.map-container') as HTMLElement;
        if (mapElement) {
            const rect = mapElement.getBoundingClientRect();
            setMapSize({ width: rect.width, height: rect.height });
        }
    };
    
    // 组件挂载后添加监听器
    onMount(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    });
    
    // 启动AI行为树
    const startAI = () => {
        if (isRunning()) return;
        
        // 初始化行为树
        if (!behaviorTree()) {
            setBehaviorTree(ai().createBehaviorTree());
        }
        
        setIsRunning(true);
        intervalId = setInterval(() => {
            const currentAI = ai();
            const mapRange = getMapRange(); // 获取动态地图范围
            
            // 直接执行AI行为，传入动态地图范围
            currentAI.patrol(mapRange);
            currentAI.simulateEnvironment();
            
            // 更新AI信号
            const newAI = new AdvancedAICharacter().copyFrom(currentAI);
            setAI(newAI);
            
            // 同步位置和怪物数据到独立信号
            setAIPosition({ ...newAI.position });
            setMonsters([...newAI.monsters]);
            
            // 调试：检查怪物信号更新
            if (newAI.monsters.length > 0) {
                console.log(`🔍 更新怪物信号: ${newAI.monsters.length}个怪物`);
                newAI.monsters.forEach((monster, index) => {
                    console.log(`👹 怪物${index}: (${monster.position.x.toFixed(1)}, ${monster.position.y.toFixed(1)})`);
                });
                console.log(`🔍 怪物信号更新前: ${monsters().length}个怪物`);
                console.log(`🔍 怪物信号更新后: ${newAI.monsters.length}个怪物`);
            }
            
            setUpdateCounter(prev => prev + 1); // 触发UI更新
        }, 100) as unknown as number; // 10fps，更合理的更新频率
    };
    
    // 停止AI行为树
    const stopAI = () => {
        if (!isRunning()) return;
        
        setIsRunning(false);
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };
    
    // 清理资源
    onCleanup(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    });
    
    return (
        <div class="p-6 max-w-6xl mx-auto flex flex-col gap-6">
            <h1 class="text-3xl font-bold">🤖 高级AI行为树测试</h1>
                
                {/* 场景视图 */}
                <div class="bg-area-color rounded p-4 flex flex-col gap-4">
                    <h2 class="text-xl font-semibold">🗺️ 场景视图</h2>
                    <div 
                        ref={(el) => {
                            if (el) {
                                // 渲染成功后获取实际尺寸
                                const rect = el.getBoundingClientRect();
                                setMapSize({ width: rect.width, height: rect.height });
                            }
                        }}
                        class="map-container relative bg-primary-color rounded border h-80 w-full overflow-hidden" 
                        style={{
                            'background-image': `
                               linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                               linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
                            'background-size': '20px 20px'
                        }}>
                        {/* AI警戒范围 - 30单位 */}
                        <div 
                            class="absolute bg-brand-color-1st opacity-20 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${50 + aiPosition().x * 2}%`,
                                top: `${50 + aiPosition().y * 2}%`,
                                width: '60px',
                                height: '60px'
                            }}
                            title="AI警戒范围 (30单位)"
                        />
                        
                        {/* 近战攻击范围 - 5单位 */}
                        <div 
                            class="absolute bg-brand-color-2nd opacity-30 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${50 + aiPosition().x * 2}%`,
                                top: `${50 + aiPosition().y * 2}%`,
                                width: '10px',
                                height: '10px'
                            }}
                            title="近战攻击范围 (5单位)"
                        />
                        
                        {/* 魔法攻击范围 - 20单位 */}
                        <div 
                            class="absolute bg-brand-color-3rd opacity-25 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${50 + aiPosition().x * 2}%`,
                                top: `${50 + aiPosition().y * 2}%`,
                                width: '40px',
                                height: '40px'
                            }}
                            title="魔法攻击范围 (20单位)"
                        />
                        
                        {/* AI角色 */}
                        <div 
                            class="absolute transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${50 + aiPosition().x * 2}%`,
                                top: `${50 + aiPosition().y * 2}%`
                            }}
                            title={`AI角色 (${aiPosition().x.toFixed(1)}, ${aiPosition().y.toFixed(1)})`}
                        >
                            <div class="text-lg">🤖</div>
                        </div>
                        
                        {/* 怪物 */}
                        <For each={monsters()}>
                            {(monster, index) => {
                                const leftPercent = 50 + monster.position.x * 2;
                                const topPercent = 50 + monster.position.y * 2;
                                // 移除调试日志，减少控制台输出
                                return (
                                    <div 
                                        class="absolute text-2xl transform -translate-x-1/2 -translate-y-1/2"
                                        style={{
                                            left: `${leftPercent}%`,
                                            top: `${topPercent}%`
                                        }}
                                        title={`怪物 ${index() + 1} - 血量: ${monster.health}/${monster.maxHealth} - 位置: (${monster.position.x.toFixed(1)}, ${monster.position.y.toFixed(1)})`}
                                    >
                                        👹
                                    </div>
                                );
                            }}
                        </For>
                        
                        {/* 治疗物品 */}
                        <For each={Array.from({length: Math.min(ai().healingItemsNearby, 10)}, (_, i) => i)}>
                            {(index) => {
                                // 为每个治疗物品生成独立的位置
                                const angle = Random.range(0, Math.PI * 2);
                                const distance = Random.range(5, 15); // 药品生成范围
                                const itemX = ai().position.x + Math.cos(angle) * distance;
                                const itemY = ai().position.y + Math.sin(angle) * distance;
                                
                                return (
                                    <div 
                                        class="absolute transform -translate-x-1/2 -translate-y-1/2"
                                        style={{
                                            left: `${50 + itemX * 2}%`,
                                            top: `${50 + itemY * 2}%`
                                        }}
                                        title={`治疗物品 ${index + 1} (距离: ${distance.toFixed(1)})`}
                                    >
                                        <div class="text-xs">💊</div>
                                    </div>
                                );
                            }}
                        </For>
                        
                        {/* 中心点 */}
                        <div class="absolute w-1 h-1 bg-main-text-color rounded-full transform -translate-x-0.5 -translate-y-0.5" 
                             style={{left: '50%', top: '50%'}} />
                    </div>
                </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 角色状态面板 */}
                <div class="bg-area-color rounded p-4 flex flex-col gap-4">
                    <h2 class="text-xl font-semibold">📊 角色状态</h2>
                    
                    <div class="space-y-2 text-sm">
                        <div>生命值: {ai().health}/{ai().maxHealth}</div>
                        <div>法力值: {ai().mana}/{ai().maxMana}</div>
                        <div>等级: {ai().level} (经验: {ai().experience}/{ai().level * 100})</div>
                        <div>战斗状态: {ai().isInCombat ? "战斗中" : "非战斗"}</div>
                        <div>位置: ({aiPosition().x.toFixed(1)}, {aiPosition().y.toFixed(1)})</div>
                        <div>附近敌人: {ai().nearbyEnemies}</div>
                        <div>治疗物品: {ai().healingItemsNearby}</div>
                    </div>
                </div>
                
                {/* 控制面板 */}
                <div class="bg-area-color rounded p-4 flex flex-col gap-4">
                    <h2 class="text-xl font-semibold">🎮 控制面板</h2>
                    
                    <div class="flex flex-col gap-2">
                        <Button 
                            onClick={startAI} 
                            disabled={isRunning()}
                            class="w-full"
                        >
                            {isRunning() ? "🔴 运行中..." : "▶️ 启动AI"}
                        </Button>
                        <Button 
                            onClick={stopAI} 
                            disabled={!isRunning()}
                            class="w-full"
                        >
                            ⏹️ 停止AI
                        </Button>
                        <Button 
                            onClick={() => behaviorTree()?.tick()} 
                            disabled={isRunning()}
                            class="w-full"
                        >
                            👆 单步执行
                        </Button>
                        
                        <div class="grid grid-cols-2 gap-2">
                            <Button onClick={() => {
                                ai().takeDamage(20);
                                const currentAI = ai();
                                setAI(new AdvancedAICharacter().copyFrom(currentAI));
                            }}>💔 受伤(-20)</Button>
                            <Button onClick={() => { 
                                ai().health = Math.min(ai().maxHealth, ai().health + 30);
                                const currentAI = ai();
                                setAI(new AdvancedAICharacter().copyFrom(currentAI));
                            }}>💚 治疗(+30)</Button>
                            <Button onClick={() => { 
                                // 实际创建怪物对象
                                const mapRange = Math.max(15, getMapRange()); // 确保最小范围是15
                                console.log(`生成敌人，地图范围：${mapRange}`);
                                const newMonster = new Monster({
                                    x: Random.range(-mapRange, mapRange),
                                    y: Random.range(-mapRange, mapRange)
                                });
                                
                                // 获取当前AI状态
                                const currentAI = ai();
                                const newAI = new AdvancedAICharacter().copyFrom(currentAI);
                                
                                // 添加新怪物
                                newAI.monsters.push(newMonster);
                                newAI.nearbyEnemies = newAI.monsters.length;
                                newAI.calculateNearestEnemy();
                                
                                // 更新AI信号
                                setAI(newAI);
                                setMonsters([...newAI.monsters]);
                                
                                console.log(`👹 生成怪物成功，位置：(${newMonster.position.x.toFixed(1)}, ${newMonster.position.y.toFixed(1)})`);
                            }}>👹 生成敌人</Button>
                            <Button onClick={() => {
                                ai().healingItemsNearby += 1;
                                const currentAI = ai();
                                setAI(new AdvancedAICharacter().copyFrom(currentAI));
                            }}>💊 生成药品</Button>
                        </div>
                        
                        <Button 
                            onClick={() => {
                                ai().reset();
                                const currentAI = ai();
                                setAI(new AdvancedAICharacter().copyFrom(currentAI));
                            }} 
                            class="w-full"
                        >
                            🔄 重置角色
                        </Button>
                    </div>
                </div>
            </div>
            
        </div>
    );
}