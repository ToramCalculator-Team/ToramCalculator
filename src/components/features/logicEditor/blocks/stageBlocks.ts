import { Blocks, FieldDropdown } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { type PipelineStage } from "../../simulator/core/Member/runtime/Pipeline/PipelineStageType";
import { makeStageBlockId, type StageMeta, type PipelineParamMeta, type PipelineParamKind } from "./meta";

type AnyStage = PipelineStage<any, any, Record<string, unknown>>;

export class StageBlockGenerator {
  private metas: StageMeta[];
  private blockIds: string[] = [];

  constructor(metas: StageMeta[]) {
    this.metas = metas;
    this.generateBlocks();
  }

  private generateBlocks() {
    for (const meta of this.metas) {
      this.createStageBlock(meta);
    }
  }

  private createStageBlock(meta: StageMeta) {
    const blockId = makeStageBlockId(meta.name);
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

        if (meta.outputKind && meta.outputKind !== "json") {
          if (meta.outputKind === "number") this.setOutput(true, "Number");
          else if (meta.outputKind === "boolean") this.setOutput(true, "Boolean");
          else if (meta.outputKind === "string") this.setOutput(true, "String");
          else this.setOutput(true, null);
        } else {
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
        }
        this.setColour(210);
        this.setTooltip(meta.name);
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
      if (meta.outputKind && meta.outputKind !== "json") {
        const access = meta.outputField ? `.${meta.outputField}` : "";
        const code = `ctx.runStage("${meta.name}", ${argsCode})${access}`;
        return [code, Order.NONE] as [string, number];
      } else {
        const code = `ctx.runStage("${meta.name}", ${argsCode});\n`;
        return code;
      }
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


