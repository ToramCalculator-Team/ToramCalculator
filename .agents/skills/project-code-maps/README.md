# Project Code Maps

项目级实现导航地图扩展。

## 领域对象

Code Map 绑定一个 Git baseline，将稳定实现范围映射为：

- `scope`：覆盖边界。以包含/不包含的边界描述为主体，开头可用一句话点明该链路的关键结论或整体职责；
- `concepts`：当前代码中的概念及定义；
- `relationshipDiagram`：Mermaid 关系图；
- `anchors`：类型化代码、测试、fixture、文档、搜索和命令入口。

Code Map 不是任务记录、故障笔记、正式领域定义或权威架构文档。

v1 与 v2 曾把结论摘要与覆盖边界拆分为 `summary`/`scope` 两个字段，职责重合导致内容重复；v3 合并为单一 `scope`。读取旧格式文件时自动把 `summary` 并入 `scope`，写入总是输出 v3。

## 工具

- `project_code_map_list`：按标题、最近更新或 baseline 距离浏览索引。
- `project_code_map_read`：读取完整 Map，并计算 Git 新鲜度和只读 Anchor 健康状态。
- `project_code_map_write`：创建、更新、废弃或恢复 Map，记录当前 HEAD 为 baseline。

## Agent 使用分层

会话启动时，扩展向 System Prompt 注入 data-only Catalog，按热度排序（更新新鲜度 0.6 + 访问次数 0.3 + 创建时间 0.1，竞争排名）取前 10 个 active Map（TUI 用户预览同样展示这 10 个）：

```xml
Project Code Maps 是项目内稳定实现主题的导航索引：每个 Map 描述一个实现范围的职责、概念、关系与代码锚点，均以当前 Git HEAD 为基线；按 <id> 用 project_code_map_read 读取完整内容。

<project_code_map_catalog reader="project_code_map_read" count="2" total="3">
  <map>
    <id>fsd-runtime-loading</id>
    <title>FSD Runtime 加载与场景解析</title>
    <description>（scope 截断至 120 列）</description>
    <freshness>old 3</freshness>
  </map>
</project_code_map_catalog>
```

`count` 是当前展示条数，`total` 是 active 总数：agent 据此判断是否还有未展示的 Map 需要搜索。Catalog 注入 ID、标题、截断 scope 与新鲜度标签（`old N`=落后 HEAD N 个 commit、`fresh`、`ahead N`、`diverged`、`no-baseline` 等）；keywords 只用于 `project_code_map_list` 搜索，不注入。完整概念、关系、Anchors 只在显式读取后进入 Agent 上下文。deprecated Map 不自动注入。

TUI Catalog 使用不进入 LLM 上下文的 custom entry，单行展示：`序号 标题… | 相对时间 · old N`。历史版本注入的 user-role Bookmark 消息会在 context hook 中过滤。

访问计数保存在 `.pi/code-maps/.access.json`（sidecar，不修改 Map 文件），每次 `project_code_map_read` 自增，用于热度排序。

## Anchor 健康

- `code|directory|test|fixture|document`：只检查项目内相对路径是否存在；`directory` 额外检查目录类型。
- `search|command`：始终标记为 unchecked，扩展绝不自动执行。
- 绝对路径和越出项目根的路径标记为 broken。

## 存储

- 项目正文：`<project>/.pi/code-maps/<id>.md`
- schemaVersion：3
- 不保存浏览数、热度、置顶或本机 usage state。

每个 Markdown 文件由严格 Frontmatter 和固定正文组成：

```text
# 相关概念
# 关系图
# 导航锚点
```

全局 Prompt `/code-map-session [关注主题]` 用于分析当前会话并维护 Code Maps。
