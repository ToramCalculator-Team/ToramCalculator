import { Context, Node, NodeDef, Status, Tree } from "../../index";
import { Role } from "../role";

export class GetHp extends Node {
    override onTick(tree: Tree<Context, Role>): Status {
        const owner = tree.owner;
        this.output.push(owner.hp);
        return "success";
    }

    static override get descriptor(): Readonly<NodeDef> {
        return {
            name: "GetHp",
            type: "Action",
            desc: "获取生命值",
            output: ["hp"],
        };
    }
}
