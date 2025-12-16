import { Blocks, Input } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import { makeActionBlockId, type StageMeta, type PipelineParamMeta, type PipelineParamKind } from "./meta";

/**
 * 生成 action 积木（仅用于 pipeline_definition 收集，不输出 JS）
 */
export class ActionBlockGenerator {
  private metas: StageMeta[];
  private blockIds: string[] = [];

  constructor(metas: StageMeta[]) {
    this.metas = metas;
    this.generateBlocks();
  }

  private generateBlocks() {
    for (const meta of this.metas) {
      this.createActionBlock(meta);
    }
  }

  private createActionBlock(meta: StageMeta) {
    const blockId = makeActionBlockId(meta.name);
    const params = meta.params;

    Blocks[blockId] = {
      init: function () {
        this.appendDummyInput().appendField(meta.name);

        for (const p of params) {
          if (p.kind === "enum" && p.enumOptions && p.enumOptions.length > 0) {
            this.appendDummyInput()
              .appendField(p.displayName ?? p.name)
              .appendField(new FieldDropdown(() => p.enumOptions!.map((opt) => [opt, opt])), p.name);
          } else {
            const input = this.appendValueInput(p.name).appendField(p.displayName ?? p.name);
            setCheckByKind(input, p.kind);
          }
        }

        // Action 块只用于 pipeline_definition 的 ACTIONS 链，不允许进入 BT
        this.setPreviousStatement(true, "PIPELINE_ACTION");
        this.setNextStatement(true, "PIPELINE_ACTION");
        this.setColour(210);
        this.setTooltip(meta.name);
        this.setHelpUrl("");
      },
    };

    // 不生成 JS，仅作为元数据节点
    javascriptGenerator.forBlock[blockId] = function () {
      return "";
    };

    this.blockIds.push(blockId);
  }

  getBlockIds(): string[] {
    return this.blockIds.slice();
  }
}

const setCheckByKind = (input: Input, kind: PipelineParamKind) => {
  if (kind === "number") input.setCheck("Number");
  else if (kind === "boolean") input.setCheck("Boolean");
  else if (kind === "string") input.setCheck("String");
};

