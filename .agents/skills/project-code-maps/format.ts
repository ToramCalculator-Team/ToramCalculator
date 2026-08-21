import {
  type CodeMapCommitComparison,
  type CodeMapHealth,
  type CodeMapIndexResult,
  type CodeMapListItem,
  type CodeMapListResult,
  type CodeMapRecord,
  type CodeMapWriteResult,
} from "./store.ts";

/** Catalog 中 description 的最大显示宽度（东亚字符计 2 列）。 */
export const CATALOG_DESCRIPTION_MAX_WIDTH = 120;

/** 注入 catalog 前的一句简短说明，让 agent 理解 Code Map 是什么。 */
export const CATALOG_INTRODUCTION =
  "Project Code Maps 是项目内稳定实现主题的导航索引：每个 Map 描述一个实现范围的职责、概念、关系与代码锚点，均以当前 Git HEAD 为基线；按 <id> 用 project_code_map_read 读取完整内容。";

/** 自动注入的 data-only Catalog，只承担 Map 发现和读取工具路由；keywords 不注入（保留给搜索），新鲜度注入。 */
export function formatCodeMapCatalog(index: CodeMapIndexResult): string {
  if (index.items.length === 0) {
    return `${CATALOG_INTRODUCTION}\n\n<project_code_map_catalog reader="project_code_map_read" count="0" total="${index.activeTotal}" />`;
  }
  const maps = index.items.map((item) => [
    "  <map>",
    `    <id>${escapeXml(item.id)}</id>`,
    `    <title>${escapeXml(item.title)}</title>`,
    `    <description>${escapeXml(truncateByDisplayWidth(item.scope, CATALOG_DESCRIPTION_MAX_WIDTH))}</description>`,
    `    <freshness>${escapeXml(compactFreshness(item.commit))}</freshness>`,
    "  </map>",
  ].join("\n"));
  return [
    CATALOG_INTRODUCTION,
    "",
    // count 为当前展示条数，total 为 active 总数：agent 可据此判断是否还有未展示的 Map 需要搜索。
    `<project_code_map_catalog reader="project_code_map_read" count="${index.items.length}" total="${index.activeTotal}">`,
    ...maps,
    "</project_code_map_catalog>",
  ].join("\n");
}

/** 完整读取视图：Map 内容、Git 新鲜度与 Anchor 健康状态。 */
export function formatCodeMapMarkdown(
  record: CodeMapRecord,
  comparison: CodeMapCommitComparison,
  health: CodeMapHealth,
): string {
  const metadata = [
    `\`${record.id}\``,
    record.status,
    `revision ${record.revision}`,
    describeCommitComparison(comparison, true),
    `anchors ${health.valid} valid / ${health.broken} broken / ${health.unchecked} unchecked`,
  ].join(" · ");
  const deprecation = record.deprecation
    ? `\n\n> 已废弃：${record.deprecation.reason}${record.deprecation.replacementId ? `；替代 Map \`${record.deprecation.replacementId}\`` : ""}`
    : "";
  const anchorHealth = health.anchors.map((item) => {
    const detail = item.detail ? ` — ${item.detail}` : "";
    return `- ${item.status} | ${item.anchor.kind} | ${item.anchor.title} | \`${item.anchor.target}\`${detail}`;
  }).join("\n");
  const concepts = record.concepts.map((concept) => `- ${concept.term}：${concept.definition}`).join("\n");
  return [
    `# ${record.title}`,
    "",
    metadata + deprecation,
    "",
    "# 范围",
    "",
    record.scope,
    "",
    "# 相关概念",
    "",
    concepts,
    "",
    "# 关系图",
    "",
    "```mermaid",
    record.relationshipDiagram,
    "```",
    "",
    "# 导航锚点",
    "",
    anchorHealth,
  ].join("\n");
}

export function formatCodeMapListForAgent(result: CodeMapListResult): string {
  const end = result.offset + result.items.length;
  const header = [
    "# Project Code Maps",
    `# 显示 ${result.items.length === 0 ? 0 : result.offset + 1}–${end} / ${result.total} · 排序 ${result.sort} · 有效 ${result.activeTotal} · 废弃 ${result.deprecatedTotal}`,
  ];
  const items = result.items.flatMap((item) => [
    "",
    `- id: ${item.id}`,
    `  title: ${item.title}`,
    `  scope: ${item.scope}`,
    `  freshness: ${describeCommitComparison(item.commit)} · revision ${item.revision}` +
      (item.baselineCommit ? ` · baseline ${item.baselineCommit.slice(0, 12)}` : "") +
      ` · ${item.conceptCount} concepts · ${item.anchorCount} anchors · ${item.visitCount} visits`,
    ...(item.keywords.length ? [`  keywords: [${item.keywords.join(", ")}]`] : []),
  ]);
  const footer = [
    ...(result.nextOffset === undefined ? [] : ["", `nextOffset: ${result.nextOffset}`]),
    ...(result.warnings.length ? ["", ...result.warnings.map((warning) => `warning: ${warning}`)] : []),
  ];
  return [...header, ...items, ...footer].join("\n");
}

export function formatCodeMapWriteForAgent(result: CodeMapWriteResult, displayPath: string): string {
  return [
    `${result.operation} \`${result.record.id}\``,
    "",
    `revision: ${result.record.revision}`,
    `status: ${result.record.status}`,
    `baselineCommit: ${result.record.baselineCommit ?? "unrecorded"}`,
    `concepts: ${result.record.concepts.length}`,
    `anchors: ${result.record.anchors.length}`,
    `changed: ${result.changedFields.length ? result.changedFields.join(", ") : "metadata only"}`,
    `path: ${displayPath}`,
  ].join("\n");
}

export function describeCommitComparison(comparison: CodeMapCommitComparison, includeCommit = false): string {
  const baseline = comparison.baselineCommit?.slice(0, 12);
  const prefix = includeCommit && baseline ? `baseline \`${baseline}\` · ` : "";
  switch (comparison.relation) {
    case "same":
      return `${prefix}HEAD 相同`;
    case "ancestor":
      return `${prefix}HEAD 新 ${comparison.currentOnlyCommits ?? 0}`;
    case "descendant":
      return `${prefix}HEAD 旧 ${comparison.baselineOnlyCommits ?? 0}`;
    case "diverged":
      return `${prefix}分叉 当前 ${comparison.currentOnlyCommits ?? 0} / baseline ${comparison.baselineOnlyCommits ?? 0}`;
    case "missing":
      return `${prefix}baseline 不可见`;
    case "unavailable":
      return `${prefix}无当前 Git HEAD`;
    case "unrecorded":
      return "无 Git baseline";
  }
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const milliseconds = Math.max(0, now.getTime() - Date.parse(value));
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

/** 紧凑新鲜度标签：old N=落后当前 HEAD N 个 commit（对应 describeCommitComparison 的 ancestor）。 */
export function compactFreshness(comparison: CodeMapCommitComparison): string {
  switch (comparison.relation) {
    case "same":
      return "fresh";
    case "ancestor":
      return `old ${comparison.currentOnlyCommits ?? 0}`;
    case "descendant":
      return `ahead ${comparison.baselineOnlyCommits ?? 0}`;
    case "diverged":
      return "diverged";
    case "missing":
      return "missing";
    case "unavailable":
      return "no-git";
    case "unrecorded":
      return "no-baseline";
  }
}

/** 按终端显示宽度截断（东亚字符计 2 列），超长补省略号。 */
export function truncateByDisplayWidth(text: string, maxWidth: number): string {
  let width = 0;
  for (let index = 0; index < text.length; index += 1) {
    width += text.charCodeAt(index) > 0xff ? 2 : 1;
    if (width > maxWidth) return `${text.slice(0, index)}…`;
  }
  return text;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
