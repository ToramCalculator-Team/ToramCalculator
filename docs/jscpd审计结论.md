# jscpd 重复代码审计结论

## 结论摘要

本轮对 `src/` 目录进行 jscpd 扫描，并对报告中的每一条重复区间逐项核对。报告共有 87 条 clone 记录；按文件对或同一文件内的相关区间归并后，共 59 组。87 条记录不能直接等同于 87 个独立重构任务，因为同一段代码可能与多个区间重叠，或者只是同一个模板在多个位置出现。

总体重复率较低，且没有检测到新增 clone：

| 指标 | 结果 |
| --- | ---: |
| 扫描文件 | 473 |
| 总行数 | 90,353 |
| 总 token 数 | 490,314 |
| clone 记录 | 87 |
| 归并后的分组 | 59 |
| 重复行 | 1,681 |
| 重复 token | 10,045 |
| 重复行比例 | 1.86% |
| 重复 token 比例 | 2.05% |
| `isNew: true` | 0 |

按格式看，重复主要来自 TypeScript/TSX：

| 格式 | clone | 重复行 | 重复行比例 |
| --- | ---: | ---: | ---: |
| TSX | 55 | 969 | 3.36% |
| TypeScript | 31 | 701 | 1.23% |
| CSS | 1 | 11 | 0.95% |
| 其他格式 | 0 | 0 | 0% |

审计判断分为四类：

- **优先处理**：重复表达同一机制或同一不变量，后续修改容易产生行为漂移。
- **可以重构但不急**：重复真实存在，但抽象边界、类型依赖或业务差异使其不适合立即改动。
- **合理重复**：重复来自声明式配置、成对算法、静态 schema 与运行时 schema 等有意保持的结构，不建议为了降低 jscpd 数值而合并。
- **扫描噪音**：固定 DOM、SVG 外框或加载动画等机械片段，不属于有价值的业务抽象。

本次只记录审计结论，没有修改业务代码、依赖或配置，也没有把 jscpd 加入项目 `package.json`。工作区中原有的 `package.json` 和 `knip.json` 改动未被触碰。

## 扫描口径

- 扫描命令口径：使用 jscpd 的 JSON reporter 扫描 `src/`，将报告输出到 `/tmp/jscpd-src/`。JSON 报告本身没有记录完整 CLI 参数，因此本文不臆测未被记录的阈值、忽略规则或格式化选项。
- 复查命令模板：`jscpd src --reporters json --output /tmp/jscpd-src`；如需与本轮结果完全可比，还需补齐当时使用的阈值和忽略规则。
- 报告文件：`/tmp/jscpd-src/jscpd-report.json`
- 扫描范围：`src/`
- 报告生成时间：2026-09-14 03:11:10 UTC
- 报告中的 clone 均为 `exact`，且 `isNew` 均为 `false`。
- 行号为报告生成时的相对源码路径和行号；若后续文件发生变化，应重新扫描后再定位。

### 重叠区间说明

- `CodeEditor.tsx` 的 4 条 clone 实际是两类重复：一类是 action/condition 与 entry/exit/step/while/until 的验证流程，另一类是两套补全和签名帮助流程。它们不能按 4 个互不相关的问题计算。
- `CommonActions.ts` 中 `479-493 ↔ 540-554` 与 `483-493 ↔ 645-655` 有包含关系，核心问题是技能等级与表达式上下文重复，而不是三个独立问题。
- `resourcesLoder.tsx` 的两条记录指向同一个 Circle DOM 加载动画的重叠区间。
- `avatarMachine.tsx` 的两条记录也是同一个加载动画在相邻区间中的重叠匹配。
- `gameIcons.tsx` 的 6 条记录都是同一类 SVG 外框结构与公共装饰路径，不代表 6 套业务逻辑。
- `loginDialog.tsx` 的两条记录是登录和注册表单中相同字段渲染片段的重叠匹配。
- `dataConfig/configs/` 中的重复主要是表格、表单和卡片配置的声明式模板；应先确认配置生成或共享 schema 的边界，再决定是否抽象。

## 按机制归并的逐项审计

下面的正文按相同机制归并审计项，因此正文编号不等同于报告的 59 个文件对分组编号。例如 CodeEditor 的 4 条 clone 归为两个机制问题，agent 注入的两个文件对归为同一个重构方向。文末附有按报告分组逐一展开的 59 组索引，确保每一组都有明确结论。

### 一、优先处理

#### 1. `components/tools/BtEditor/modes/mdslIntellisense.ts:56-90` ↔ `src/engine/core/World/Member/runtime/Agent/uitls.ts:5-32`：Zod schema 解包

两处都实现 `unwrapSchema`，对 `optional`、`nullable`、`default` 和 `pipe` 逐层解包。两份实现目前行为基本一致，但分别维护会使 Zod v4 API 变化或新增 wrapper 时产生漂移。

结论：真实的通用 schema 机制重复。

建议：抽取一个与应用语义无关的 schema 工具，或将解包逻辑放到已有的公共 schema 工具模块；`mdslIntellisense` 和 agent 参数解析保留各自的类型映射和业务入口。优先级：高。

#### 2. `src/engine/core/World/Member/runtime/Behavior/AiBehaviorRuntime.ts:50-75` ↔ `BtManager.ts:84-112`；`AiBehaviorRuntime.ts:93-105` ↔ `BtContextFactory.ts:144-157`；`AiBehaviorRuntime.ts:93-105` ↔ `BtManager.ts:132-145`：agent 编译与成员注入

三处都执行 `new Function` 编译 agent class，注入 `BehaviourTree`、`State`、`ModifierType`，创建实例，遍历实例和 prototype 成员，并用 `Object.defineProperty` 注入执行上下文。差异在于错误处理、warning/logger、上下文隔离和生命周期归属。

结论：这是本轮最重要的架构重复。重复的不只是代码，还包括受信任 agent 编译、成员冲突优先级和注入协议。

建议：抽取底层的 agent compiler/member injector，通过回调参数化编译失败、初始化失败和成员冲突的观测方式；保留 `AiBehaviorRuntime`、`BtManager`、`BtContextFactory` 各自的生命周期和上下文隔离，不能把三个运行时类直接合并。必须继续保留 BtManager 的 checkpoint/runtime 隔离语义。优先级：最高。

#### 补充审计项：`src/components/tools/BtEditor/BtEditor.tsx:680-699` ↔ `873-892`：NodeInspector props

桌面端和移动端 inspector 都传入相同的 node、registry、attribute slots、subtree options、diagnostics、变更回调、删除/复制/移动回调和只读状态。

结论：这是同一组件在两个布局入口中的 props 重复，不是两套 inspector 逻辑。

建议：可为 NodeInspector 提取共享 props 类型，或由同一个 `renderNodeInspector` 函数生成；移动端和桌面端仍应保留不同容器和生命周期。优先级：中低。

#### 3. `src/engine/core/World/Member/types/Mob/MobStateMachine.ts:50-72` ↔ `71-93`：同名 interface 重复声明

重复声明了“收到快照请求”“收到目标快照”“进行伤害计算”“进行命中判定”“进行控制判定”“收到 buff 增删事件”等 interface。TypeScript declaration merging 使其暂时不一定报错，但同名声明分成两段会掩盖事件 union 的真实来源。

结论：明确的遗留重复，低风险修复价值高。

建议：删除其中一组声明，保留一组作为 `MobSpecificEvent` 的来源；删除后检查事件 union 是否仍覆盖全部事件。优先级：高。

#### 4. `src/engine/core/thread/worldStateBuffer.ts:751-773` ↔ `1215-1237`：Reader/Writer 布局校验

`WorldStateWriter` 和 `WorldStateReader` 构造函数都校验 buffer 字节长度、`memberCapacity`、`areaCapacity`、`attributeCount`、`modifierSourceCapacity`、`modifierChainCapacity`，并抛出 `WorldStateProtocolError`。已有 `readHeader()`，但描述符匹配和协议不变量仍被复制。

结论：真实的跨线程协议边界重复，错误时可能出现一端接受、另一端拒绝的行为漂移。

建议：抽取纯函数 `validateBufferLayout(header, buffer, descriptor)`，由 Reader 和 Writer 共用；保留两者后续初始化的差异，统一错误码和异常类型。优先级：高。

#### 5. `src/engine/core/JSProcessor/ExpressionTransformer.ts:80-98` ↔ `182-199`；`113-131` ↔ `215-233`：双 AST 转换 pipeline

`transform()` 与 `transformToGetValue()` 都执行 AST 解析、member access 收集、路径标准化、schema 检查、依赖收集、无效路径记录、replacement 和异常结果处理。差异主要是 replacement 规则：前者使用 `valueProvider`，后者生成 `getValue`/`getBaseValue`。

结论：核心转换流程是真实重复。

建议：抽取统一的 member-access transform pipeline，以 replacement callback 参数化；继续由 `transformToGetValue()` 负责 `_` 基础值语义，不要把两个入口粗暴合成一个面向所有调用者的宽泛 API。优先级：高。

#### 6. `src/engine/core/World/Member/runtime/AttributeContainer/AttributeContainer.ts:841-853` ↔ `931-943`；`916-930` ↔ `943-957`：modifier source 收集和 detail 类型

两处 `collect(type, attrIndex)` 都从 `modifierSources` 按类型和属性索引取值，遍历来源、复制 source 并返回 `{ source, value }[]`。另一组区间显示 `exportNestedValues()` 和 `exportModifierDetails()` 使用了相近的 modifier detail 结构。

结论：真实重复，且位于 modifier 来源数据访问边界。

建议：提取类私有方法 `collectModifierSources(type, attrIndex)`，并视实际类型结构提取共享的 `ModifierDetail` 类型别名；`exportNestedValues()` 与 `exportModifierDetails()` 保留各自输出结构。优先级：高。

#### 7. `src/components/tools/BtEditor/components/CodeEditor/CodeEditor.tsx:329-343` ↔ `385-399`；`343-355` ↔ `399-411`：MDSL 调用校验

action/condition 和 entry/exit/step/while/until 两套校验都执行未知名称检查、参数数量检查和参数类型检查。两段的 registry 选择、错误文案和调用语法不同，但校验算法相同。

结论：重复的是可参数化的校验流程，不是两种语法本身。

建议：抽取 `validateCallableArgs` 一类的纯校验函数，由调用方提供 kind、registry 和 marker 文案；不要合并两套正则解析入口。优先级：高。

#### 8. `CodeEditor.tsx:520-561` ↔ `583-619`；`650-677` ↔ `698-725`：补全与 signature help

action/condition 与属性回调的 completion provider 都重复名称补全、枚举值补全、参数索引计算；signature help 的两套分支也重复 spec 查找、activeParameter 计算、签名对象构造。

结论：这是与上一项相关但可独立演进的第二类重复。CodeEditor 的 4 条 clone 不能算成 4 个独立缺陷。

建议：抽取 callable spec 到 Monaco completion/signature 的适配器，并用 `kind` 和 `specMap` 参数化；保留 action/condition 与 attribute call 的外层解析差异。优先级：高。

#### 9. `src/components/tools/BtEditor/components/workflow/DefaultNodeCallbackTag.tsx:10-28` ↔ `DefaultNodeGuardTag.tsx:11-29`：默认节点参数 renderer

两组件对 `DefaultNodeArgument` 的 string、number、boolean、null/undefined、数组和对象分支进行相同 JSX 渲染，差异主要是标签名称和属性类型。

结论：真实的 UI 渲染重复，抽象边界清晰。

建议：提取共享的 `DefaultNodeArgumentRenderer`，由外层组件负责 callback/guard 标签和文案。优先级：高。

#### 10. `src/lib/utils/performance.ts:421-452` ↔ `471-499`：性能测量流程

`performanceMonitor()` 和 `monitorPerformance()` 都生成 event ID，调用 `performance.now()`，执行目标函数，计算 duration，按最小记录时间过滤，分别上报成功和失败事件，并重新抛出异常。

结论：真实的核心工具重复。

建议：抽取统一的 `measurePerformance()`，类方法装饰器与普通函数 wrapper 仅负责适配调用形式；保留方法的 `this` 绑定，并统一成功/失败 metadata。优先级：高。

#### 11. `src/routes/api/auth/login.ts:46-70` ↔ `register.ts:63-86`：JWT 和 session cookie

登录和注册都构造 `{ sub, iat }`，读取 `AUTH_SECRET`，以 HS256 签发 30 天 JWT，并设置 `httpOnly`、`secure`、`sameSite`、`path`、`maxAge` 等 cookie 属性。

结论：真实重复，且位于认证安全边界。

建议：抽取 `createSessionToken(userId)` 与 `setSessionCookie(token)`；helper 应验证 `AUTH_SECRET` 存在且非空。登录和注册继续保留各自的输入校验、查询/创建用户、HTTP status 和返回消息。优先级：高。

#### 12. `src/engine/core/World/Member/runtime/Agent/CommonActions.ts:479-493` ↔ `540-554`；`483-493` ↔ `645-655`；`640-654` ↔ `698-711`：技能等级和表达式上下文

`healHp`、`healMp`、`modifyAttribute`、`setAttributeModifier` 都从 `context.skill` 读取技能，fallback 到 `currentSkill`，解析 `skillLv`，构造时间/tick/caster/target/skillLv 上下文并调用 expression evaluator。`heal`、`modify`、`set` 的业务语义仍不同。

结论：公共表达式求值上下文是真实重复；modifier 累加、按 sourceId 覆盖、回复封顶等业务行为不能合并。

建议：抽取 `resolveSkillLevel(context, explicitSkillLv?)` 与 `evaluateActionNumber(context, capabilities, expression)`；由调用方继续决定错误文案、有限值检查、回复封顶和 modifier 操作。优先级：高。

### 二、可以重构但不急

#### 13. `src/components/app/loginDialog.tsx:270-280` ↔ `332-342`；`300-310` ↔ `333-343`：表单字段渲染

两处渲染相同的文本输入字段属性。它们属于登录/注册表单中同一套字段控件，且区间相互重叠。

结论：重复合理，若登录和注册字段继续增长，可提取字段 renderer；当前不需要为了 11 行重复立即改动。优先级：低。

#### 14. `src/components/tools/BtEditor/components/MainPanel/MainPanel.tsx:40-52` ↔ `workflow/WorkflowCanvas.tsx:50-62`：画布交互 props

重复的是节点拖拽、点击、长按、inspect、删除、插入预览/取消/提交和 tree node drag 等 props 类型。`MainPanel` 是透传层，`WorkflowCanvas` 是消费层。

结论：API 形状重复，不是运行逻辑重复。

建议：如果后续出现第三个画布包装器，再提取 `WorkflowInteractionProps`；当前要先确认类型依赖方向，避免为十几行 props 引入复杂泛型。优先级：低。

#### 15. `src/components/ui/dataDisplay/ObjRenderer.tsx:142-154` ↔ `221-233`：object/union frame

两处都渲染 Field 容器、标题、List 容器和 children。object、array、union 的 children 来源和空列表/判别字段逻辑不同。

结论：布局片段重复，数据逻辑不应合并。

建议：可提取只负责布局的 `renderFieldListFrame(title, children)`；不要把 object/union 的 schema 处理合并。优先级：低。

#### 16. `src/components/ui/dataDisplay/virtualTable.tsx:371-381` ↔ `418-429`：列名解析

两处都过滤隐藏列，从 dictionary 读取字段名，缺失时 fallback 到列 ID，并捕获异常。一个用于列可见性按钮，另一个用于表头。

结论：完整渲染流程不同，但列名解析和异常策略确实重复。

建议：抽取 `getColumnLabel(columnId, dictionary)`，统一字段存在性、fallback 和日志策略；保留两处各自的渲染。优先级：中高。

#### 17. `src/components/ui/effects/babylonBg.tsx` ↔ `src/routes/(app)/(toolPages)/babylonScene.tsx`：Babylon 场景初始化

报告包含三段匹配：`babylonBg.tsx:239-252 ↔ babylonScene.tsx:30-46` 的主题色和场景引用，`277-289 ↔ 218-232` 的引擎/场景初始化，`354-411 ↔ 318-376` 的粒子系统初始化。

结论：两处确实复制了 Babylon 初始化和粒子系统机制，但组件的相机、材质、模型和生命周期不同。

建议：先抽取独立的粒子系统/场景基础工厂，输入位置、材质和生命周期回调；不要把两个页面组件合并。该抽象需要结合渲染资源释放验证，优先级：中。

#### 18. `src/engine/core/World/Member/MemberBaseSchema.ts:259-295、347-379、433-519` ↔ `types/Player/PlayerAttrSchema.ts:547-583、796-828、1171-1257`：基础属性结构

重复包括 `atk`、`def`、`c`、`stab`、`red` 以及 displayName 和默认 expression。`PlayerAttrStructure` 已经部分继承 `MemberBaseStructure`，但其他基础部分仍显式复制。

结论：存在可维护性问题，但不是简单的机械重复；Player 需要增加或覆盖专属字段。

建议：后续以 `...MemberBaseNestedSchema` 或明确的基础 metadata 组合为基础，对 hp/mp 等 Player 专属部分显式覆盖；不要在本轮为降低重复率深度合并整棵 schema。优先级：中。

#### 19. `src/engine/core/World/Member/types/Player/PlayerAttrSchema.ts:1407-1431、1495-1530` ↔ `2108-2136、2212-2247`：静态与运行时 Player schema

一处是静态默认 `PlayerAttrNestedSchema`，另一处是 `PlayerAttrSchemaGenerator()` 返回值。它们共享 displayName、默认 expression 和属性树结构，但运行时版本还根据角色、武器、装备生成动态表达式。

结论：静态展示定义和动态计算 schema 职责不同，不能直接合并；重复会带来字段漂移风险。

建议：将字段 metadata 与运行时 expression 分层，静态 schema 作为展示定义，运行时只覆盖 expression。当前不建议重写整份 Player schema。优先级：中。

#### 20. `src/engine/core/World/Member/MemberStatusPanel.tsx:254-264` ↔ `285-295`：modifier 展示

两段按 modifier 来源渲染数值和来源文本，分别位于静态和动态修正展示区域。结构相近，但 CSS class、标题和数据分组不同。

结论：可抽取 modifier item，但当前重复量小且布局语义不同。

建议：若后续继续增加修正展示类型，再提取统一 `ModifierSourceItem`；当前低风险、低收益。优先级：中低。

#### 21. `src/engine/core/World/Member/runtime/Agent/CommonActions.ts:279-293` ↔ `307-321`：移动圆形攻击范围

`moveAttack` 和 `groundLineAttack` 都构造 caster-to-target 的圆形范围和 segment trajectory；action schema、`rangeKind` 和其他业务语义不同。

结论：几何定义重复，动作定义不应合并。

建议：提取 `resolveMovingCircleRange(input)`，由两个 action 继续提供各自的定义和生命周期。优先级：中低。

#### 22. `src/engine/core/World/Member/runtime/Behavior/AiBehaviorRuntime.ts:93-105` ↔ `BtManager.ts:132-145` / `BtContextFactory.ts:144-157`：成员登记细节

这组与第 2 项属于同一 agent 注入问题，具体重复的是实例自有属性与 prototype 属性遍历、跳过 constructor、定义 descriptor。第 2 项应作为统一重构任务，不要拆成多个独立 helper 造成第二套注入协议。

结论：纳入第 2 项统一处理。优先级：最高。

#### 23. `src/lib/mistreevous/AgentPropertyReference.ts:30-46` ↔ `56-72`：非负整数/数值解析

`resolveAgentNonNegativeInteger()` 和 `resolveAgentNonNegativeNumber()` 都支持字面量或 agent property reference、可选 fallback resolver、类型检查和非负检查；差异是整数判断、有限数判断和错误消息。

建议：抽取 `resolveAgentValue()`，保留两个函数各自的验证规则和错误信息。优先级：中低。

#### 24. `src/features/simulator/session/simulatorSessionMachine.ts:728-738` ↔ `826-836`：验证结果 assign

启动验证成功和重启验证成功都把 members、controller、skills、activeRun、designCopies 和 error 写入相同 context。

结论：状态机两个生命周期分支需要写入同一组状态，重复合理但可维护性一般。

建议：若后续字段继续增加，可抽取 `applyValidationStarted` assign 工厂；需保持首次启动和重试的事件发送差异。优先级：中低。

#### 25. `src/features/wiki/fkRenderers.tsx:121-133` ↔ `228-240`：FK relation selection

卡片 renderer 与表单 renderer 都筛选 `FOREIGN_KEY_RELATIONS`、隐藏字段和目标主键。一个生成按钮 renderer，另一个生成 Autocomplete renderer。

结论：FK 关系筛选和字段元数据解析可共享，但两种 UI 输出不应合并。

建议：提取 `getVisibleForeignKeyRelations(tableName, hiddenFields)`，保留卡片/表单各自的渲染器。优先级：中低。

#### 26. `src/features/wiki/wikiFormSheet.tsx:83-93` ↔ `145-152`：表单 loader/props

`RecordForm` 与 `RecordFormLoader` 透传 dictionary、submit、FK 打开和关联记录回调，且都声明关联区块相关 props。

结论：重复主要来自 loader 和实际表单之间的类型边界，属于合理的透传；可以通过共享 props 类型减少漂移。

建议：提取 `RecordFormCallbacks` 类型，不要把 loader 与表单组件合并。优先级：低。

#### 27. `src/routes/(app)/(features)/wiki/[subName].tsx:430-442` ↔ `529-541`：wiki 动画块

两处使用相同的 opacity/scale 入场、退场和按 index 延迟。它们服务于不同的 wiki 列表区块。

结论：动画参数是统一视觉规范，属于合理重复。

建议：若全局动画 token 已有统一入口，可集中定义 transition preset；当前不必为 13 行 JSX 引入组件。优先级：低。

#### 28. `src/routes/(app)/(search)/searchMachine.ts:68-90` ↔ `185-202`：搜索输入更新

两段 XState 配置都用 `assign` 更新 `searchInputValue`，并检查事件类型。它们位于不同状态分支，但写入同一个 context 字段。

结论：状态机配置的局部重复，尚不足以证明需要抽象状态转换。

建议：先确认两个分支的事件语义是否应统一；若确认一致，再提取命名 action。优先级：低。

#### 29. `src/routes/(app)/(toolPages)/babylonScene.tsx:82-94` ↔ `186-196`：Babylon 键盘输入

两段都把按键加入 `activeKeys`，重建移动输入向量，并处理 WASD、Q/E 旋转和空格跳跃。

结论：输入处理重复，且可能表示 keydown/持续更新两个事件入口；需先确认事件时序，不能仅按文本相似合并。

建议：集中到一个 `updateCameraInputFromKeys()`，由事件处理器调用；同时检查 keyup、焦点丢失和重复 keydown 的语义。优先级：中低。

#### 30. `src/styles/queryBuilder.css:87-98` ↔ `109-120`：规则和规则组连线 CSS

`.rule::before/after` 与 `.rule-group::before/after` 使用相同的定位、边框和尺寸，仅选择器不同。

结论：纯 CSS 结构重复，风险低。

建议：使用选择器合并或 CSS 自定义属性减少复制；先确认最后一项规则的圆角覆盖不受影响。优先级：低。

### 三、合理重复

#### 31. `src/components/tools/BtEditor/components/ExamplesMenu/ExamplesMenu.tsx:97-111` ↔ `SkillLogicExamplesMenu.tsx:59-73`

两个示例菜单共享锚点、打开/关闭和按钮布局，但示例内容、标题和插入行为属于不同菜单。结论：合理重复。只有在菜单种类继续增加时，才考虑抽取通用 `ExamplesMenuShell`。

#### 32. `src/contexts/overlay/OverlayRoot.tsx:46-63` ↔ `200-217`

Dialog 和 Sheet 都需要处理关闭状态、无动画时立即完成退出，并创建 entry API；层容器和视觉布局不同。结论：overlay 的生命周期语义应保持一致，组件结构重复合理，不建议强行合并 Dialog/Sheet。

#### 33. `src/dataConfig/configs/activity.tsx:8-26` ↔ `task.tsx:8-26`

共享基本信息、审计字段和通用表格列配置。结论：声明式表配置的合理模板重复。

#### 34. `activity.tsx:8-26` ↔ `zone.tsx:10-28`

共享基本信息、审计字段和 id/name 表格列。结论：合理重复；差异字段由各表配置表达。

#### 35. `activity.tsx:9-24` ↔ `skill.tsx:13-28`

共享审计字段、id/name 列和默认表格设置。结论：合理重复。

#### 36. `activity.tsx:24-37` ↔ `address.tsx:19-32`

共享表格隐藏列、默认排序、空 `tdGenerator` 和 form 基本结构。结论：合理重复。

#### 37. `activity.tsx:26-38` ↔ `npc.tsx:18-30`

共享隐藏审计字段、默认排序和 form/card 关系声明模板。结论：合理重复。

#### 38. `activity.tsx:26-41` ↔ `task.tsx:44-58`

共享隐藏列、排序、form/card 关联配置。结论：合理重复。

#### 39. `activity.tsx:26-41` ↔ `world.tsx:13-27`

共享隐藏列、排序和关联区块配置。结论：合理重复。

#### 40. `activity.tsx:26-41` ↔ `zone.tsx:54-68`

共享隐藏列、排序和 form/card 结构。结论：合理重复。

#### 41. `armor.tsx:5-17` ↔ `option.tsx:5-21`

共享基础字段分组、颜色/属性列和表格配置骨架。结论：合理重复；装备类型差异由字段定义表达。

#### 42. `armor.tsx:17-45` ↔ `special.tsx:21-49`

共享 modifiers 列、默认排序、渲染器和关联配置。结论：合理重复。

#### 43. `armor.tsx:20-45` ↔ `option.tsx:31-56`

共享 modifiers renderer、表格收尾和 form/card 关系配置。结论：合理重复。

#### 44. `armor.tsx:23-45` ↔ `consumable.tsx:25-47`

共享 item 外键关系和 form/card 配置。结论：合理重复。

#### 45. `consumable.tsx:21-47` ↔ `material.tsx:15-41`

共享 effects/modifiers 列、item 外键和表单配置。结论：合理重复。

#### 46. `crystal.tsx:27-37` ↔ `weapon.tsx:44-54`

共享 modifiers、名称图标 renderer 和表格展示结构。结论：合理重复。

#### 47. `drop_item.tsx:13-28` ↔ `recipe_ingredient.tsx:18-33`

两种关联实体都使用空 columns、隐藏 id、默认排序和空关系数组。结论：合理重复。

#### 48. `item.tsx:31-44` ↔ `recipe.tsx:14-27`

共享审计字段隐藏、id 排序及 create/update 表单骨架。结论：合理重复。

#### 49. `mob.tsx:211-221` ↔ `weapon.tsx:55-65`

共享元素类型到图标组件的映射。结论：声明式图标映射合理重复；如果元素映射扩展，应提取单一 registry。

#### 50. `option.tsx:22-33` ↔ `weapon.tsx:35-46`

共享颜色字段列和表格展示。结论：合理重复。

#### 51. `player_armor.tsx:10-20、20-32、43-56` ↔ `player_option.tsx:9-19、18-30、33-46`

玩家装备与玩家选项共享基础属性分组、字段列、modifiers renderer 和关系配置。两者都属于同一类玩家装备数据。结论：合理重复。

#### 52. `player_armor.tsx:11-22、23-43` ↔ `player_special.tsx:10-21、20-45`

玩家装备与玩家特殊装备共享附加属性、强化、modifiers 和所属玩家配置。结论：合理重复。

#### 53. `player_armor.tsx:38-56` ↔ `player_weapon.tsx:39-57`

共享能力图标、modifiers renderer 及 form/card 关系结构。结论：合理重复。

#### 54. `src/engine/core/types.ts:199-212` ↔ `304-317`

`MemberDomainEventSchema` 与 `ControllerDomainEventSchema` 都声明 state/hit/status/death/move/cast 等事件，但后者投影到 `controllerId`，字段和消费边界不同。结论：领域事件 projection 的结构重复合理，不应共用会模糊类型边界。

#### 55. `src/lib/mistreevous/attributes/guards/Until.ts:15-56` ↔ `While.ts:15-56`

Until 和 While 共享 guard 生命周期和 condition invoker 处理，终止条件语义相反。结论：成对 guard 算法的合理重复；除非引入明确的抽象基类，否则不要为降低 clone 率改写。

#### 56. `src/lib/mistreevous/nodes/composite/Parallel.ts:19-37` ↔ `Race.ts:19-37`

Parallel 和 Race 都遍历子节点并更新未结束节点，但完成判定不同。结论：行为树组合节点的成对实现，合理重复。

#### 57. `src/lib/mistreevous/nodes/composite/Selector.ts:23-40` ↔ `Sequence.ts:23-40`

Selector 与 Sequence 共享子节点更新流程，成功/失败短路方向不同。结论：合理重复。

#### 58. `src/lib/mistreevous/nodes/decorator/Fail.ts:19-38、19-40` ↔ `Flip.ts:19-38`、`Succeed.ts:19-40`

Fail、Flip、Succeed 都包装单个 child 并根据 child 状态映射结果，映射规则各自不同。两条 clone 记录有包含关系。结论：合理重复，不应为减少文本重复而破坏 decorator 的显式语义。

#### 59. `src/lib/mistreevous/nodes/leaf/Action.ts:192-207` ↔ `Condition.ts:93-103`

Action 和 Condition 都在状态变化时记录节点详情、参数和生命周期属性，但动作可以处于 RUNNING，条件是立即完成。结论：叶节点通用快照字段合理重复；可在 Node 基类层统一时再处理。

### 四、扫描噪音

以下区间已核对，但不建议进入重构 backlog：

- `src/components/ui/effects/resourcesLoder.tsx:15-30、15-32`：固定数量的 Circle DOM 加载动画，同一动画的重叠匹配。
- `src/components/ui/icons/gameIcons.tsx:40-70` 与 `127-157、214-244、294-321、385-415、474-504、557-584`：同一类 SVG 外框、阴影和装饰路径，图标主体不同。
- `src/routes/(app)/(toolPages)/avatarMachine.tsx:448-463、448-465` 与 `449-464、468-485`：同一加载动画的重叠匹配。

这些片段如果未来要改进，应从资产/组件生成方式或共享 loading component 入手，而不是针对 jscpd 区间逐段抽 helper。

## 报告 59 组覆盖索引

以下索引按 jscpd 报告中的文件对/同文件归并顺序列出。每一行都对应报告中的一个分组；“结论”引用上文的机制审计编号，或直接标记为合理重复/扫描噪音。

| 报告组 | 文件对或同文件区间 | 结论 |
| ---: | --- | --- |
| 1 | `components/app/loginDialog.tsx:270-280 ↔ 332-342；300-310 ↔ 333-343` | 合理重复：登录/注册字段模板 |
| 2 | `components/tools/BtEditor/BtEditor.tsx:680-699 ↔ 873-892` | 可以重构但不急：NodeInspector props |
| 3 | `components/tools/BtEditor/components/CodeEditor/CodeEditor.tsx:329-343 ↔ 385-399；343-355 ↔ 399-411；520-561 ↔ 583-619；650-677 ↔ 698-725` | 优先处理：MDSL 校验、补全和签名帮助 |
| 4 | `components/tools/BtEditor/components/ExamplesMenu/ExamplesMenu.tsx:97-111 ↔ SkillLogicExamplesMenu.tsx:59-73` | 合理重复：示例菜单外壳 |
| 5 | `components/tools/BtEditor/components/MainPanel/MainPanel.tsx:40-52 ↔ WorkflowCanvas.tsx:50-62` | 可以重构但不急：画布交互 props |
| 6 | `components/tools/BtEditor/components/workflow/DefaultNodeCallbackTag.tsx:10-28 ↔ DefaultNodeGuardTag.tsx:11-29` | 优先处理：默认参数 renderer |
| 7 | `components/tools/BtEditor/modes/mdslIntellisense.ts:56-90 ↔ engine/core/World/Member/runtime/Agent/uitls.ts:5-32` | 优先处理：Zod schema 解包 |
| 8 | `components/ui/dataDisplay/ObjRenderer.tsx:142-154 ↔ 221-233` | 可以重构但不急：布局 frame |
| 9 | `components/ui/dataDisplay/virtualTable.tsx:371-381 ↔ 418-429` | 可以重构但不急：列名解析 |
| 10 | `components/ui/effects/babylonBg.tsx:239-252 ↔ routes/(app)/(toolPages)/babylonScene.tsx:30-46；277-289 ↔ 218-232；354-411 ↔ 318-376` | 可以重构但不急：Babylon 场景/粒子初始化 |
| 11 | `components/ui/effects/resourcesLoder.tsx:15-30 ↔ 16-31；15-32 ↔ 35-52` | 扫描噪音：Circle DOM 加载动画 |
| 12 | `components/ui/icons/gameIcons.tsx:40-70 ↔ 127-157、214-244、385-415、474-504；40-67 ↔ 294-321、557-584` | 扫描噪音：SVG 外框结构 |
| 13 | `contexts/overlay/OverlayRoot.tsx:46-63 ↔ 200-217` | 合理重复：Dialog/Sheet 生命周期 |
| 14 | `dataConfig/configs/activity.tsx:8-26 ↔ task.tsx:8-26；26-41 ↔ 44-58` | 合理重复：声明式表配置模板 |
| 15 | `dataConfig/configs/activity.tsx:8-26 ↔ zone.tsx:10-28；26-41 ↔ 54-68` | 合理重复：声明式表配置模板 |
| 16 | `dataConfig/configs/activity.tsx:9-24 ↔ skill.tsx:13-28` | 合理重复：声明式表配置模板 |
| 17 | `dataConfig/configs/activity.tsx:24-37 ↔ address.tsx:19-32` | 合理重复：声明式表配置模板 |
| 18 | `dataConfig/configs/activity.tsx:26-38 ↔ npc.tsx:18-30` | 合理重复：声明式表配置模板 |
| 19 | `dataConfig/configs/activity.tsx:26-41 ↔ world.tsx:13-27` | 合理重复：声明式表配置模板 |
| 20 | `dataConfig/configs/armor.tsx:5-17 ↔ option.tsx:5-21；20-45 ↔ 31-56` | 合理重复：装备配置模板 |
| 21 | `dataConfig/configs/armor.tsx:17-45 ↔ special.tsx:21-49` | 合理重复：装备配置模板 |
| 22 | `dataConfig/configs/armor.tsx:20-45 ↔ consumable.tsx:25-47` | 合理重复：装备/物品关联配置 |
| 23 | `dataConfig/configs/consumable.tsx:21-47 ↔ material.tsx:15-41` | 合理重复：物品配置模板 |
| 24 | `dataConfig/configs/crystal.tsx:27-37 ↔ weapon.tsx:44-54` | 合理重复：物品展示配置 |
| 25 | `dataConfig/configs/drop_item.tsx:13-28 ↔ recipe_ingredient.tsx:18-33` | 合理重复：关联实体配置 |
| 26 | `dataConfig/configs/item.tsx:31-44 ↔ recipe.tsx:14-27` | 合理重复：审计字段和表单骨架 |
| 27 | `dataConfig/configs/mob.tsx:211-221 ↔ weapon.tsx:55-65` | 合理重复：元素图标映射 |
| 28 | `dataConfig/configs/option.tsx:22-33 ↔ weapon.tsx:35-46` | 合理重复：颜色字段列 |
| 29 | `dataConfig/configs/player_armor.tsx:10-20 ↔ player_option.tsx:9-19；20-32 ↔ 18-30；43-56 ↔ 33-46` | 合理重复：玩家装备配置 |
| 30 | `dataConfig/configs/player_armor.tsx:11-22 ↔ player_special.tsx:10-21；23-43 ↔ 20-45` | 合理重复：玩家装备配置 |
| 31 | `dataConfig/configs/player_armor.tsx:38-56 ↔ player_weapon.tsx:39-57` | 合理重复：玩家装备配置 |
| 32 | `engine/core/JSProcessor/ExpressionTransformer.ts:80-98 ↔ 182-199；113-131 ↔ 215-233` | 优先处理：AST 转换 pipeline |
| 33 | `engine/core/World/Member/MemberBaseSchema.ts:259-295、347-379、433-519 ↔ types/Player/PlayerAttrSchema.ts:547-583、796-828、1171-1257` | 可以重构但不急：基础 schema 结构 |
| 34 | `engine/core/World/Member/MemberStatusPanel.tsx:254-264 ↔ 285-295` | 可以重构但不急：modifier 展示 |
| 35 | `engine/core/World/Member/runtime/Agent/CommonActions.ts:279-293 ↔ 307-321；479-493 ↔ 540-554；483-493 ↔ 645-655；640-654 ↔ 698-711` | 优先处理表达式上下文；移动范围可延后 |
| 36 | `engine/core/World/Member/runtime/AttributeContainer/AttributeContainer.ts:841-853 ↔ 931-943；916-930 ↔ 943-957` | 优先处理：modifier source/detail |
| 37 | `engine/core/World/Member/runtime/Behavior/AiBehaviorRuntime.ts:50-75 ↔ BehaviourTree/BtManager.ts:84-112；93-105 ↔ 132-145` | 优先处理：agent 编译与成员注入 |
| 38 | `engine/core/World/Member/runtime/Behavior/AiBehaviorRuntime.ts:93-105 ↔ BehaviourTree/BtContextFactory.ts:144-157` | 优先处理：agent 编译与成员注入 |
| 39 | `engine/core/World/Member/types/Mob/MobStateMachine.ts:50-72 ↔ 71-93` | 优先处理：重复 interface |
| 40 | `engine/core/World/Member/types/Player/PlayerAttrSchema.ts:1407-1431 ↔ 2108-2136；1495-1530 ↔ 2212-2247` | 可以重构但不急：静态/运行时 schema |
| 41 | `engine/core/thread/worldStateBuffer.ts:751-773 ↔ 1215-1237` | 优先处理：Reader/Writer 布局校验 |
| 42 | `engine/core/types.ts:199-212 ↔ 304-317` | 合理重复：领域事件 projection |
| 43 | `features/simulator/session/simulatorSessionMachine.ts:728-738 ↔ 826-836` | 可以重构但不急：验证结果 assign |
| 44 | `features/wiki/fkRenderers.tsx:121-133 ↔ 228-240` | 可以重构但不急：FK relation selection |
| 45 | `features/wiki/wikiFormSheet.tsx:83-93 ↔ 145-152` | 可以重构但不急：loader/props 透传 |
| 46 | `lib/mistreevous/AgentPropertyReference.ts:30-46 ↔ 56-72` | 可以重构但不急：数值解析 |
| 47 | `lib/mistreevous/attributes/guards/Until.ts:15-56 ↔ While.ts:15-56` | 合理重复：成对 guard |
| 48 | `lib/mistreevous/nodes/composite/Parallel.ts:19-37 ↔ Race.ts:19-37` | 合理重复：成对 composite |
| 49 | `lib/mistreevous/nodes/composite/Selector.ts:23-40 ↔ Sequence.ts:23-40` | 合理重复：成对 composite |
| 50 | `lib/mistreevous/nodes/decorator/Fail.ts:19-38 ↔ Flip.ts:19-38` | 合理重复：decorator 状态映射 |
| 51 | `lib/mistreevous/nodes/decorator/Fail.ts:19-40 ↔ Succeed.ts:19-40` | 合理重复：decorator 状态映射 |
| 52 | `lib/mistreevous/nodes/leaf/Action.ts:192-207 ↔ Condition.ts:93-103` | 合理重复：叶节点状态快照 |
| 53 | `lib/utils/performance.ts:421-452 ↔ 471-499` | 优先处理：性能测量流程 |
| 54 | `routes/(app)/(features)/wiki/[subName].tsx:430-442 ↔ 529-541` | 合理重复：动画块 |
| 55 | `routes/(app)/(search)/searchMachine.ts:68-90 ↔ 185-202` | 可以重构但不急：输入 assign |
| 56 | `routes/(app)/(toolPages)/avatarMachine.tsx:448-463 ↔ 449-464；448-465 ↔ 468-485` | 扫描噪音：同一加载动画 |
| 57 | `routes/(app)/(toolPages)/babylonScene.tsx:82-94 ↔ 186-196` | 可以重构但不急：键盘输入 |
| 58 | `routes/api/auth/login.ts:46-70 ↔ register.ts:63-86` | 优先处理：JWT/cookie helper |
| 59 | `styles/queryBuilder.css:87-98 ↔ 109-120` | 可以重构但不急：规则连线 CSS |

## 后续建议

建议按以下顺序建立后续任务：

1. 先处理 agent 注入、WorldState 布局校验、ExpressionTransformer、AttributeContainer、MDSL 校验/补全和认证 session helper；这些问题会产生行为漂移或安全边界不一致。
2. 再处理 MobStateMachine 重复 interface、DefaultNodeArgument renderer、性能测量公共流程和 CommonActions 表达式上下文；其中 interface 重复可单独快速修复。
3. 对 virtualTable、Babylon 粒子系统、FK relation selection、schema metadata 分层和输入处理做小范围设计后再重构。
4. dataConfig、行为树成对节点、领域事件 projection、overlay、SVG 和加载动画暂不以降低重复率为目标。

后续如需复查，继续使用临时命令扫描即可，不要把 jscpd 或 knip 写入项目 `package.json`。建议扫描时排除 SQL、CSV、locale、颜色 token、SVG、migration 和其他生成内容，以降低结构化数据和资产模板造成的噪音。
