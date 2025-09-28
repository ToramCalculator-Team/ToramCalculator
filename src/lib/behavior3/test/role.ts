import { Context, Node, NodeDef, TreeData } from "../index";
import { DeepReadonly } from "../context";
import { Attack } from "./nodes/attack";
import { FindEnemy } from "./nodes/find-enemy";
import { GetHp } from "./nodes/get-hp";
import { Idle } from "./nodes/idle";
import { IsStatus } from "./nodes/is-status";
import { MoveToPos } from "./nodes/move-to-pos";
import { MoveToTarget } from "./nodes/move-to-target";
import { RandomWander } from "./nodes/random-wander";

// 导入JSON文件
import heroTreeData from "./example/hero.json";
import heroWanderTreeData from "./example/hero-wander.json";
import monsterTreeData from "./example/monster.json";
import monsterWanderTreeData from "./example/monster-wander.json";
import testSequenceData from "./example/test-sequence.json";
import testParallelData from "./example/test-parallel.json";
import testRepeatUntilSuccessData from "./example/test-repeat-until-success.json";
import testRepeatUntilFailureData from "./example/test-repeat-until-failure.json";
import testTimeoutData from "./example/test-timeout.json";
import testOnceData from "./example/test-once.json";
import testListenData from "./example/test-listen.json";
import testSwitchCaseData from "./example/test-switch-case.json";
import testRaceData from "./example/test-race.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// deno-lint-ignore no-explicit-any
export type Callback = (...args: any[]) => void;

export interface Role {
    hp: number;
    x: number;
    y: number;
}

export interface Position {
    x: number;
    y: number;
}

export class RoleContext extends Context {
    avators: Role[] = [];

    constructor() {
        super();
        this.registerNode(Attack);
        this.registerNode(FindEnemy);
        this.registerNode(GetHp);
        this.registerNode(Idle);
        this.registerNode(IsStatus);
        this.registerNode(MoveToPos);
        this.registerNode(MoveToTarget);
        this.registerNode(RandomWander);

        // 用于加速执行表达式，此代码可以通过脚本扫描所有行为树，预先生成代码，然后注册到 Context 中
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // deno-lint-ignore no-explicit-any
        this.registerCode("hp > 50", (envars: any) => {
            return envars.hp > 50;
        });
    }

    override loadTree(path: string): Promise<Node> {
        // 根据路径选择对应的JSON数据
        let treeData: TreeData;
        switch (path) {
            case "./example/hero.json":
                treeData = heroTreeData as unknown as TreeData;
                break;
            case "./example/hero-wander.json":
                treeData = heroWanderTreeData as unknown as TreeData;
                break;
            case "./example/monster.json":
                treeData = monsterTreeData as unknown as TreeData;
                break;
            case "./example/monster-wander.json":
                treeData = monsterWanderTreeData as unknown as TreeData;
                break;
            case "./example/test-sequence.json":
                treeData = testSequenceData as unknown as TreeData;
                break;
            case "./example/test-parallel.json":
                treeData = testParallelData as unknown as TreeData;
                break;
            case "./example/test-repeat-until-success.json":
                treeData = testRepeatUntilSuccessData as unknown as TreeData;
                break;
            case "./example/test-repeat-until-failure.json":
                treeData = testRepeatUntilFailureData as unknown as TreeData;
                break;
            case "./example/test-timeout.json":
                treeData = testTimeoutData as unknown as TreeData;
                break;
            case "./example/test-once.json":
                treeData = testOnceData as unknown as TreeData;
                break;
            case "./example/test-listen.json":
                treeData = testListenData as unknown as TreeData;
                break;
            case "./example/test-switch-case.json":
                treeData = testSwitchCaseData as unknown as TreeData;
                break;
            case "./example/test-race.json":
                treeData = testRaceData as unknown as TreeData;
                break;
            default:
                throw new Error(`Unknown tree path: ${path}`);
        }
        
        const rootNode = this._createTree(treeData);
        this.trees[path] = rootNode;
        return Promise.resolve(rootNode);
    }

    override get time() {
        return this._time;
    }

    override set time(value: number) {
        this._time = value;
    }

    find(func: Callback, _count: number) {
        return this.avators.filter((value) => func(value));
    }

    exportNodeDefs() {
        const defs: DeepReadonly<NodeDef>[] = [];
        Object.values(this.nodeDefs).forEach((descriptor) => {
            defs.push(descriptor);
            if (descriptor.name === "Listen") {
                (descriptor as NodeDef).args?.[0].options?.push(
                    ...[
                        {
                            name: "testOff",
                            value: "testOff",
                        },
                        {
                            name: "hello",
                            value: "hello",
                        },
                    ]
                );
            }
        });
        defs.sort((a, b) => a.name.localeCompare(b.name));
        return JSON.stringify(defs, null, 2);
    }
}
