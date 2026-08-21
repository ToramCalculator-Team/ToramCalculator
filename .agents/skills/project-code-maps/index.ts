/**
 * Project Code Maps
 *
 * 项目保存稳定实现主题的 Code Map；System Prompt 只获得 data-only Catalog，
 * 完整内容通过显式读取进入上下文。
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, parse, relative, resolve } from "node:path";
import { StringEnum } from "@earendil-works/pi-ai";
import {
  CONFIG_DIR_NAME,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  type ExtensionAPI,
  type Theme,
  keyHint,
  truncateHead,
  withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import {
  compactFreshness,
  describeCommitComparison,
  formatCodeMapCatalog,
  formatCodeMapListForAgent,
  formatCodeMapMarkdown,
  formatCodeMapWriteForAgent,
  formatRelativeTime,
  truncateByDisplayWidth,
} from "./format.ts";
import { recordCodeMapAccess } from "./access.ts";
import {
  MAX_LIST_LIMIT,
  SCOPE_MAX_LENGTH,
  codeMapDirectory,
  compareCodeMapCommit,
  inspectCodeMapHealth,
  listCodeMaps,
  loadCodeMapIndex,
  readCodeMap,
  writeCodeMap,
  type CodeMapAnchor,
  type CodeMapHealth,
  type CodeMapIndexResult,
  type CodeMapListItem,
  type CodeMapListResult,
  type CodeMapPatch,
  type CodeMapWriteResult,
} from "./store.ts";

const CATALOG_ENTRY_CUSTOM_TYPE = "project-code-map-catalog";
const CATALOG_ENTRY_VERSION = 1;
const LEGACY_CONTEXT_CUSTOM_TYPE = "project-bookmarks-summary";
/** 用户 UI 单行中标题的最大显示宽度（东亚字符计 2 列）。 */
const TITLE_MAX_WIDTH = 40;

interface CatalogEntryData {
  projectRoot: string;
  total: number;
  deprecatedTotal: number;
  items: CodeMapListItem[];
  warnings: string[];
  version: number;
  agentContext: string;
}

const ConceptSchema = Type.Object({
  term: Type.String({ minLength: 1, maxLength: 120, description: "当前代码中的概念名称" }),
  definition: Type.String({ minLength: 1, maxLength: 500, description: "该概念在当前实现中的简短定义" }),
});

const AnchorSchema = Type.Object({
  kind: StringEnum(["code", "directory", "test", "fixture", "document", "search", "command"] as const),
  title: Type.String({ minLength: 1, maxLength: 200, description: "Anchor 代表的实现或验证入口" }),
  target: Type.String({ minLength: 1, maxLength: 4000, description: "项目相对路径、聚焦搜索或验证命令" }),
});

export default function (pi: ExtensionAPI) {
  let catalogContext = "";

  const refreshCatalog = async (projectRoot: string): Promise<CodeMapIndexResult> => {
    const index = await loadCodeMapIndex(projectRoot, CONFIG_DIR_NAME);
    catalogContext = formatCodeMapCatalog(index);
    return index;
  };

  pi.registerTool({
    name: "project_code_map_list",
    label: "Project Code Maps",
    description:
      "分页列出当前项目的 Code Map。结果包含 ID、标题、范围、关键词、状态、Git baseline 新鲜度和 Anchor 数量。",
    promptSnippet: "Browse project-scoped code maps",
    parameters: Type.Object({
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_LIST_LIMIT, description: "返回数量，默认 10" })),
      offset: Type.Optional(Type.Integer({ minimum: 0, description: "跳过数量，默认 0" })),
      status: Type.Optional(StringEnum(["active", "deprecated", "all"] as const)),
      query: Type.Optional(Type.String({ maxLength: 200, description: "按 Map 内容和 Anchor 过滤" })),
      sort: Type.Optional(StringEnum(["recent", "stale", "title"] as const, {
        description: "排序方式：最近更新、提交距离或标题",
      })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const projectRoot = requireTrustedProject(ctx);
      const result = await listCodeMaps(projectRoot, params, CONFIG_DIR_NAME);
      return {
        content: [{ type: "text", text: formatCodeMapListForAgent(result) }],
        details: result,
      };
    },
    renderCall(args, theme) {
      const qualifiers = [
        args.status ?? "active",
        `按 ${sortLabel(args.sort ?? "title")}`,
        args.query ? JSON.stringify(args.query) : undefined,
      ].filter(Boolean).join(" · ");
      return new Text(`${theme.fg("toolTitle", theme.bold("Code Map 列表"))} ${theme.fg("dim", qualifiers)}`, 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const details = result.details as CodeMapListResult | undefined;
      if (!details) return new Text(toolText(result), 0, 0);
      if (expanded) return new Text(agentContextText(result, theme), 0, 0);
      return new Text(renderCodeMapIndex(details, theme), 0, 0);
    },
  });

  pi.registerTool({
    name: "project_code_map_read",
    label: "Read Project Code Map",
    description:
      "按 ID 读取完整 Code Map，返回范围、概念、关系图、类型化 Anchors、Git baseline 新鲜度和只读 Anchor 健康检查。",
    promptSnippet: "Read a project code map by ID",
    promptGuidelines: [
      "project_code_map_read returns a non-authoritative navigation map tied to its baseline commit; verify conclusions against current code.",
    ],
    parameters: Type.Object({
      id: Type.String({ minLength: 1, maxLength: 80, description: "Code Map ID" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const projectRoot = requireTrustedProject(ctx);
      const record = await readCodeMap(projectRoot, params.id, CONFIG_DIR_NAME);
      await recordCodeMapAccess(projectRoot, params.id, CONFIG_DIR_NAME);
      // 访问会影响 Catalog 热度排序，静默刷新保证下次注入反映最新热度。
      try {
        await refreshCatalog(projectRoot);
      } catch {
        // 排序刷新失败不影响读取结果。
      }
      const commitComparison = compareCodeMapCommit(projectRoot, record.baselineCommit);
      const health = await inspectCodeMapHealth(projectRoot, record.anchors);
      const fullText = formatCodeMapMarkdown(record, commitComparison, health);
      const truncated = truncateHead(fullText, { maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES });
      const text = truncated.truncated
        ? `${truncated.content}\n\n[Code Map 内容已截断；完整记录位于 ${join(codeMapDirectory(projectRoot, CONFIG_DIR_NAME), `${record.id}.md`)}]`
        : truncated.content;
      return {
        content: [{ type: "text", text }],
        details: { record, commitComparison, health },
      };
    },
    renderCall(args, theme) {
      return new Text(`${theme.fg("toolTitle", theme.bold("打开 Code Map"))} ${theme.fg("accent", args.id)}`, 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const details = result.details as {
        record?: { title?: string; status?: string; revision?: number; concepts?: unknown[]; anchors?: CodeMapAnchor[] };
        commitComparison?: CodeMapListItem["commit"];
        health?: CodeMapHealth;
      } | undefined;
      if (!details?.record) return new Text(theme.fg("error", "Code Map unavailable"), 0, 0);
      if (expanded) return new Text(agentContextText(result, theme), 0, 0);
      const color = details.record.status === "deprecated" ? "warning" : "success";
      const health = details.health;
      const stats = [
        `r${details.record.revision ?? "?"}`,
        details.commitComparison ? describeCommitComparison(details.commitComparison) : undefined,
        `${details.record.concepts?.length ?? 0} 概念`,
        `${details.record.anchors?.length ?? 0} Anchors`,
        health ? `${health.valid} valid / ${health.broken} broken / ${health.unchecked} unchecked` : undefined,
      ].filter(Boolean).join(" · ");
      return new Text(
        `${theme.fg(color, details.record.title ?? "Read")}\n${theme.fg(health?.broken ? "warning" : "dim", stats)}`,
        0,
        0,
      );
    },
  });

  pi.registerTool({
    name: "project_code_map_write",
    label: "Write Project Code Map",
    description:
      "创建、更新、废弃或恢复一份 Project Code Map；成功写入时记录当前 Git HEAD 为 baselineCommit 并递增 revision。",
    promptSnippet: "Maintain a project code map",
    promptGuidelines: [
      "Project Code Maps describe stable implementation scopes, concepts, relationships, and precise navigation anchors—not tasks, bugs, issues, or session outcomes.",
    ],
    parameters: Type.Object({
      id: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
      title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
      scope: Type.Optional(Type.String({
        minLength: 1,
        maxLength: SCOPE_MAX_LENGTH,
        description: "覆盖与不包含的边界描述：开头可用一句话点明链路职责或关键结论，随后列出覆盖和不包含的相邻职责，避免长篇描述",
      })),
      status: Type.Optional(StringEnum(["active", "deprecated"] as const)),
      keywords: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 100 }), { maxItems: 12 })),
      concepts: Type.Optional(Type.Array(ConceptSchema, { minItems: 1, maxItems: 30 })),
      relationshipDiagram: Type.Optional(Type.String({
        minLength: 1,
        maxLength: 10_000,
        description: "Mermaid 正文，不包含代码围栏",
      })),
      anchors: Type.Optional(Type.Array(AnchorSchema, { minItems: 1, maxItems: 100 })),
      deprecationReason: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
      replacementId: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
      expectedRevision: Type.Optional(Type.Integer({ minimum: 1, description: "可选的乐观并发检查" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const projectRoot = requireTrustedProject(ctx);
      const lockPath = join(codeMapDirectory(projectRoot, CONFIG_DIR_NAME), ".mutation-lock");
      const result = await withFileMutationQueue(lockPath, () =>
        writeCodeMap(projectRoot, params as CodeMapPatch, CONFIG_DIR_NAME),
      );
      await refreshCatalog(projectRoot);
      return {
        content: [{ type: "text", text: formatCodeMapWriteForAgent(result, relative(projectRoot, result.path)) }],
        details: result,
      };
    },
    renderCall(args, theme) {
      const action = args.status === "deprecated" ? "废弃 Code Map" : args.id ? "更新 Code Map" : "创建 Code Map";
      const target = args.id ?? args.title ?? "code-map";
      return new Text(`${theme.fg("toolTitle", theme.bold(action))} ${theme.fg("accent", target)}`, 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const details = result.details as CodeMapWriteResult | undefined;
      if (!details) return new Text(toolText(result), 0, 0);
      if (expanded) return new Text(agentContextText(result, theme), 0, 0);
      const stats = `r${details.record.revision} · ${details.record.concepts.length} 概念 · ${details.record.anchors.length} Anchors`;
      const changed = details.changedFields.length
        ? `\n${theme.fg("dim", `变更 ${details.changedFields.join(" · ")}`)}`
        : "";
      return new Text(
        `${theme.fg("success", `✓ ${operationLabel(details.operation)}`)} ${theme.fg("accent", details.record.title)}`
          + `\n${theme.fg("dim", stats)}${changed}`,
        0,
        0,
      );
    },
  });

  pi.registerEntryRenderer<CatalogEntryData>(CATALOG_ENTRY_CUSTOM_TYPE, (entry, { expanded }, theme) => {
    const details = entry.data;
    const items = details?.items ?? [];
    const heading = theme.fg("accent", theme.bold(`Project Code Maps · ${details?.total ?? 0}`));
    const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
    if (expanded) {
      box.addChild(new Text(
        `${theme.fg("customMessageLabel", theme.bold("Agent Catalog"))}\n${details?.agentContext ?? ""}`,
        0,
        0,
      ));
      return box;
    }
    if (items.length === 0) {
      box.addChild(new Text(
        `${heading}\n${theme.fg("dim", "暂无 active Code Map")}\n${theme.fg("dim", keyHint("app.tools.expand", "查看 Agent Catalog"))}`,
        0,
        0,
      ));
      return box;
    }
    const deprecated = details?.deprecatedTotal ? `\n${theme.fg("dim", `已废弃 ${details.deprecatedTotal}`)}` : "";
    const warnings = details?.warnings.length ? `\n${theme.fg("warning", `${details.warnings.length} 条加载警告`)}` : "";
    const previewHint = details && details.items.length < details.total
      ? `\n${theme.fg("dim", `仅显示热度前 ${details.items.length} 个 · 共 ${details.total} 个 active`)}`
      : "";
    box.addChild(new Text(
      `${heading}${previewHint}\n${renderCodeMapRows(items, theme)}${deprecated}${warnings}\n${theme.fg("dim", keyHint("app.tools.expand", "查看 Agent Catalog"))}`,
      0,
      0,
    ));
    return box;
  });

  pi.on("session_start", async (_event, ctx) => {
    catalogContext = "";
    if (!ctx.isProjectTrusted()) return;
    const projectRoot = findProjectRoot(ctx.cwd);
    try {
      const index = await refreshCatalog(projectRoot);
      if (!hasRenderedCatalog(ctx.sessionManager.getBranch(), projectRoot)) {
        pi.appendEntry(CATALOG_ENTRY_CUSTOM_TYPE, {
          projectRoot,
          total: index.activeTotal,
          deprecatedTotal: index.deprecatedTotal,
          items: index.items,
          warnings: index.warnings,
          version: CATALOG_ENTRY_VERSION,
          agentContext: catalogContext,
        } satisfies CatalogEntryData);
      }
    } catch (error) {
      ctx.ui.notify(`Project Code Maps 加载失败：${errorMessage(error)}`, "warning");
    }
  });

  pi.on("before_agent_start", async (event) => {
    if (!catalogContext || event.systemPrompt.includes("<project_code_map_catalog")) return;
    return { systemPrompt: `${event.systemPrompt}\n\n${catalogContext}` };
  });

  pi.on("context", async (event) => {
    const messages = event.messages.filter(
      (message) => message.role !== "custom" || message.customType !== LEGACY_CONTEXT_CUSTOM_TYPE,
    );
    return messages.length === event.messages.length ? undefined : { messages };
  });
}

function requireTrustedProject(ctx: { cwd: string; isProjectTrusted(): boolean }): string {
  if (!ctx.isProjectTrusted()) throw new Error("项目尚未受信任，不能读取或写入 Project Code Maps");
  return findProjectRoot(ctx.cwd);
}

function findProjectRoot(cwd: string): string {
  const existingCodeMapRoot = findAncestorWithCodeMaps(cwd);
  if (existingCodeMapRoot) return existingCodeMapRoot;
  try {
    return execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();
  } catch {
    return resolve(cwd);
  }
}

function findAncestorWithCodeMaps(cwd: string): string | undefined {
  let current = resolve(cwd);
  const root = parse(current).root;
  while (true) {
    if (existsSync(codeMapDirectory(current, CONFIG_DIR_NAME))) return current;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function hasRenderedCatalog(entries: readonly unknown[], projectRoot: string): boolean {
  return entries.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as {
      type?: string;
      customType?: string;
      data?: { projectRoot?: string; version?: number };
    };
    return candidate.type === "custom"
      && candidate.customType === CATALOG_ENTRY_CUSTOM_TYPE
      && candidate.data?.projectRoot === projectRoot
      && candidate.data?.version === CATALOG_ENTRY_VERSION;
  });
}

function renderCodeMapIndex(result: CodeMapListResult, theme: Theme): string {
  const start = result.items.length ? result.offset + 1 : 0;
  const end = result.offset + result.items.length;
  const heading = theme.fg("accent", theme.bold(
    `Code Maps · ${start}–${end} / ${result.total} · 按${sortLabel(result.sort)}`,
  ));
  if (result.items.length === 0) return `${heading}\n${theme.fg("dim", "没有匹配的 Code Map")}`;
  const next = result.nextOffset === undefined ? "" : `\n${theme.fg("dim", `下一页 offset ${result.nextOffset}`)}`;
  return `${heading}\n${renderCodeMapRows(result.items, theme)}${next}\n${theme.fg("dim", keyHint("app.tools.expand", "查看 Agent 上下文"))}`;
}

function renderCodeMapRows(items: CodeMapListItem[], theme: Theme): string {
  return items.map((item, index) => {
    const freshness = compactFreshness(item.commit);
    const freshnessColor: "success" | "warning" | "muted" = item.commit.relation === "same"
      ? "success"
      : item.commit.relation === "diverged" || item.commit.relation === "missing"
        ? "warning"
        : "muted";
    const meta = `${theme.fg("dim", `| ${formatRelativeTime(item.updatedAt)} · `)}${theme.fg(freshnessColor, freshness)}`;
    return `${theme.fg("dim", String(index + 1).padStart(2, " "))}  ${theme.fg("muted", truncateByDisplayWidth(item.title, TITLE_MAX_WIDTH))} ${meta}`;
  }).join("\n");
}

function toolText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((item): item is { type: "text"; text: string } => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

function agentContextText(result: { content: Array<{ type: string; text?: string }> }, theme: Theme): string {
  return `${theme.fg("customMessageLabel", theme.bold("Agent 上下文"))}\n${toolText(result)}`;
}

function sortLabel(sort: string): string {
  return ({ recent: "最近更新", stale: "提交距离", title: "标题" } as Record<string, string>)[sort] ?? sort;
}

function operationLabel(operation: CodeMapWriteResult["operation"]): string {
  return ({ created: "创建", updated: "更新", deprecated: "废弃", restored: "恢复" })[operation];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
