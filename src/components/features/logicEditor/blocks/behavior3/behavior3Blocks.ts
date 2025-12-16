import { Blocks, FieldTextInput, FieldDropdown } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";

/**
 * 注册行为树相关积木（用于生成 behavior3 TreeData 的结构化节点）
 * 当前覆盖魔法炮等技能所需的最小集合。
 */
export const registerBehavior3Blocks = (getPipelineNames?: () => string[]) => {
  const ids: string[] = [];

  ids.push(
    createBlock("bt_root", {
      init() {
        this.appendDummyInput().appendField("BT根节点");
        this.appendDummyInput().appendField("名称").appendField(new FieldTextInput("skill_bt"), "name");
        this.appendDummyInput().appendField("描述").appendField(new FieldTextInput(""), "desc");
        // 仅允许 BT 节点挂载为 root
        this.appendStatementInput("ROOT").setCheck("BT_NODE").appendField("root");
        this.setColour(300);
        this.setTooltip("行为树根节点，配置 name/desc 并连接 root 子节点");
      },
    }),
  );

  ids.push(
    createBlock("bt_sequence", {
      init() {
        this.appendDummyInput().appendField("Sequence");
        this.appendStatementInput("CHILDREN").setCheck("BT_NODE").appendField("children");
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(160);
        this.setTooltip("按顺序执行子节点");
      },
    }),
  );

  ids.push(
    createBlock("bt_switch", {
      init() {
        this.appendDummyInput().appendField("Switch");
        this.appendStatementInput("CASES").setCheck("BT_NODE").appendField("cases");
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(200);
        this.setTooltip("按 Case 顺序匹配");
      },
    }),
  );

  ids.push(
    createBlock("bt_case", {
      init() {
        this.appendDummyInput().appendField("Case 条件");
        // Case 条件只接受“表达式字符串”
        this.appendValueInput("COND").setCheck("String").appendField("Check表达式");
        this.appendStatementInput("CHILDREN").setCheck("BT_NODE").appendField("children");
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(210);
        this.setTooltip("Case 分支：条件为真时执行 children");
      },
    }),
  );

  ids.push(
    createBlock("bt_check", {
      init() {
        this.appendDummyInput().appendField("Check");
        // Check 只接受“表达式字符串”
        this.appendValueInput("VALUE").setCheck("String").appendField("表达式");
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(230);
        this.setTooltip("行为树条件节点，返回 success/ failure");
      },
    }),
  );

  ids.push(
    createBlock("bt_runPipelineSync", {
      init() {
        this.appendDummyInput().appendField("RunPipelineSync");
        this.appendDummyInput()
          .appendField("管线名")
          .appendField(
            new FieldDropdown(() => {
              const names = getPipelineNames ? getPipelineNames() : [];
              if (names.length === 0) {
                return [["(无可用管线)", ""]];
              }
              return names.map((name) => [name, name]);
            }),
            "pipeline",
          );
        // 当选中的值不在 options 内时，FieldDropdown 会显示空；这里给一个友好提示
        // 移除 JSON 参数输入框，MVP 阶段先不支持参数
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(20);
        this.setTooltip("同步执行管线（即刻写回上下文）");
      },
    }),
  );

  ids.push(
    createBlock("bt_waitFrames", {
      init() {
        this.appendDummyInput().appendField("WaitFrames");
        this.appendDummyInput().appendField("取帧字段").appendField(new FieldTextInput("currentSkillActionFrames"), "field");
        this.appendValueInput("MIN").setCheck("Number").appendField("最小帧数(可选)");
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(60);
        this.setTooltip("按 owner 指定字段的帧数等待");
      },
    }),
  );

  ids.push(
    createBlock("bt_hasBuff", {
      init() {
        this.appendDummyInput().appendField("HasBuff");
        this.appendDummyInput().appendField("buffId").appendField(new FieldTextInput("buff_id"), "buffId");
        this.appendDummyInput().appendField("输出变量").appendField(new FieldTextInput("buffExists"), "outputVar");
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(100);
        this.setTooltip("查询 buff 是否存在，结果写入 blackboard/outputVar");
      },
    }),
  );

  ids.push(
    createBlock("bt_scheduleFsmEvent", {
      init() {
        this.appendDummyInput().appendField("ScheduleFSMEvent");
        this.appendDummyInput().appendField("事件类型").appendField(new FieldTextInput("进行命中判定"), "eventType");
        this.appendValueInput("DELAY").setCheck("Number").appendField("延迟帧数(可选)");
        // 移除 JSON payload 输入框，MVP 阶段先不支持 payload
        this.setPreviousStatement(true, "BT_NODE");
        this.setNextStatement(true, "BT_NODE");
        this.setColour(280);
        this.setTooltip("调度 FSM 事件（通过 Intent 执行）");
      },
    }),
  );

  return ids;
};

type BlockSpec = {
  init: (this: any) => void;
};

const createBlock = (type: string, spec: BlockSpec): string => {
  Blocks[type] = {
    init: spec.init,
  };
  // 运行时编译器不会用到 JS 生成器，这里仅保留空实现以防 Blockly 报错。
  javascriptGenerator.forBlock[type] = function () {
    return "";
  };
  return type;
};

