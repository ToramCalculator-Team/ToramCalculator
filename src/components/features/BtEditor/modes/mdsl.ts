import type { languages } from 'monaco-editor';

/**
 * MDSL 语言的 Monarch 定义
 * 用于 Monaco Editor 的语法高亮
 */
export const mdslLanguageDefinition: languages.IMonarchLanguage = {
  // 关键字
  keywords: [
    'action',
    'condition',
    'wait',
    'branch',
  ],

  // 支持函数
  supportFunctions: [
    'entry',
    'exit',
    'step',
    'while',
    'until',
    'null',
  ],

  // 变量语言
  variableLanguage: [
    'root',
    'selector',
    'sequence',
    'parallel',
    'race',
    'all',
    'lotto',
    'repeat',
    'retry',
    'flip',
    'succeed',
    'fail',
  ],

  // 常量
  constants: [
    'true',
    'false',
  ],

  // 操作符
  operators: [
    '+', '-', '/', '//', '%',
    '<@>', '@>', '<@',
    '&', '^', '~',
    '<', '>', '<=', '=>', '==', '!=', '<>', '=',
  ],

  // 词法分析规则
  tokenizer: {
    root: [
      // 单行注释
      [/--.*$/, 'comment'],

      // 多行注释
      [/\/\*/, 'comment', '@comment'],

      // 字符串：双引号
      [/"[^"]*"/, 'string'],

      // 字符串：单引号
      [/'[^']*'/, 'string'],

      // 字符串：反引号
      [/`[^`]*`/, 'string'],

      // 数字（包括浮点数）
      [/[+-]?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?\b/, 'number'],

      // 关键字
      [
        /\b(action|condition|wait|branch)\b/,
        'keyword',
      ],

      // 支持函数
      [
        /\b(entry|exit|step|while|until|null)\b/,
        'support.function',
      ],

      // 变量语言
      [
        /\b(root|selector|sequence|parallel|race|all|lotto|repeat|retry|flip|succeed|fail)\b/,
        'variable.language',
      ],

      // 常量
      [
        /\b(true|false)\b/,
        'constant.language',
      ],

      // 操作符
      [
        /<@>|@>|<@|\/\/|<=|=>|==|!=|<>|[+\-/%&^~<>=\/]/,
        'operator',
      ],

      // 标识符
      // 允许 unicode（中文变量名），同时兼容 $变量引用（如 $等待时间）
      [/[\\p{L}_$][\\p{L}\\p{N}_$]*/u, 'identifier'],

      // 空白字符
      [/\s+/, 'white'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
  },
};
