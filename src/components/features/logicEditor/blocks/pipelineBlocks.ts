import { Blocks, FieldDropdown } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { makePipelineBlockId, type PipelineMeta, type PipelineParamMeta, type PipelineParamKind } from "./meta";
import { createStartSkillBlock } from "./startSkillBlock";

export class PipelineBlockGenerator {
  private metas: PipelineMeta[];
  private blockIds: string[] = [];

  constructor(metas: PipelineMeta[]) {
    this.metas = metas;
    this.generateBlocks();
  }

  private generateBlocks() {
    for (const meta of this.metas) {
      this.createPipelineBlock(meta);
    }
  }

  private createPipelineBlock(meta: PipelineMeta) {
    const blockId = makePipelineBlockId(meta.name);
    const params = meta.params;

    Blocks[blockId] = {
      init: function () {
        this.appendDummyInput().appendField(meta.displayName ?? meta.name);

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

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230); // 与管线分类(math_category)保持一致色系
        this.setTooltip(meta.desc ?? meta.name);
        this.setHelpUrl("");
      },
    };

    javascriptGenerator.forBlock[blockId] = function (block, generator) {
      const args: Record<string, unknown> = {};

      for (const p of params) {
        if (p.kind === "enum" && p.enumOptions && p.enumOptions.length > 0) {
          const value = block.getFieldValue(p.name);
          args[p.name] = value;
        } else {
          const code = generator.valueToCode(block, p.name, Order.NONE) || (p.kind === "string" ? '""' : "0");
          args[p.name] = code;
        }
      }

      const argsPairs: string[] = [];
      for (const p of params) {
        const v = args[p.name];
        if (typeof v === "string" && !p.kind.startsWith("enum")) {
          argsPairs.push(`${p.name}: ${v}`);
        } else {
          argsPairs.push(`${p.name}: ${JSON.stringify(v)}`);
        }
      }

      const argsCode = params.length > 0 ? `{ ${argsPairs.join(", ")} }` : "{}";
      const code = `ctx.runPipeline("${meta.name}", ${argsCode});\n`;
      return code;
    };

    this.blockIds.push(blockId);
  }

  getBlockIds(): string[] {
    return this.blockIds.slice();
  }
}

const setCheckByKind = (input: Blockly.Input, kind: PipelineParamKind) => {
  if (kind === "number") input.setCheck("Number");
  else if (kind === "boolean") input.setCheck("Boolean");
  else if (kind === "string") input.setCheck("String");
};


