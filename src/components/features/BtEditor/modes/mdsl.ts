// MDSL mode for ace-editor
// 迁移自原项目的 mode-mdsl.js，适配 ace-builds 原生版本

// 注意：ace-builds 使用 AMD 模块系统
// 这个函数将在 CodeEditor 组件中调用，传入 ace 对象

// @ts-ignore - ace 对象的类型定义不完整
export function defineMDSLMode(ace: any): void {
  if (!ace || !ace.define) {
    return;
  }

  // 如果已经定义过，直接返回
  if (ace.require && ace.require('ace/mode/mdsl')) {
    return;
  }

  ace.define('ace/mode/mdsl', function (require: any, exports: any, module: any) {
    const oop = require("ace/lib/oop");
    const TextMode = require("ace/mode/text").Mode;
    const ExampleHighlightRules = require("ace/mode/mdsl_highlight_rules").ExampleHighlightRules;

    const Mode = function (this: any) {
      this.HighlightRules = ExampleHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    (function () {
      // Extra logic goes here. (see below)
    }).call(Mode.prototype);

    exports.Mode = Mode;
  });

  ace.define('ace/mode/mdsl_highlight_rules', function (require: any, exports: any, module: any) {
    const oop = require("ace/lib/oop");
    const TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

    const exampleHighlightRules = function (this: any) {    
      const keywordMapper = this.createKeywordMapper({
        "support.function": "entry|exit|step|while|until|null",
        "keyword": "action|condition|wait|branch",
        "variable.language": "root|selector|sequence|parallel|race|all|lotto|repeat|retry|flip|succeed|fail",
        "constant.language": "true|false"
      }, "identifier", true);
    
      this.$rules = {
        "start" : [ {
          token : "comment",
          regex : "--.*$"
        },  {
          token : "comment",
          start : "/\\*",
          end : "\\*/"
        }, {
          token : "string",           // " string
          regex : '".*?"'
        }, {
          token : "string",           // ' string
          regex : "'.*?'"
        }, {
          token : "string",           // ` string (apache drill)
          regex : "`.*?`"
        }, {
          token : "constant.numeric", // float
          regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
        }, {
          token : keywordMapper,
          regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
        }, {
          token : "keyword.operator",
          regex : "\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|="
        }, {
          token : "text",
          regex : "\\s+"
        } ]
      };
        
      this.normalizeRules();
    };

    oop.inherits(exampleHighlightRules, TextHighlightRules);

    exports.ExampleHighlightRules = exampleHighlightRules;
  });
}

