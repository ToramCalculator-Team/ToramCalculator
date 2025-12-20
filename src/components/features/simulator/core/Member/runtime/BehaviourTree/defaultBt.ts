export const defaultBt = {
  tree: `
  root {
    sequence {
        action [SomeAction]
        wait [2000]
        action [SomeAction]
        wait [2000]
        action [SomeAction]
        wait [2000]
    }
  }
  `, // MDSL 字符串或 JSON
  functions: {
    // 可选的函数定义
    SomeAction: "function() { console.log('SomeAction'); return State.SUCCEEDED; }", // 函数代码字符串
  },
};
