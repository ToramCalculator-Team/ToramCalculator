/**
 * Project Code Map 存储。
 *
 * Code Map 正文属于项目；本模块只维护严格 schema、Git 基线和不执行代码的 Anchor 健康检查。
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createAccessStore } from "./access.ts";

export const CODE_MAP_SCHEMA_VERSION = 3;
/** scope 承担核心结论与覆盖边界，合并 summary 后需要比 v2 更宽的上限。 */
export const SCOPE_MAX_LENGTH = 800;
export const DEFAULT_LIST_LIMIT = 10;
export const MAX_LIST_LIMIT = 50;
/** 会话 Catalog 与 TUI 用户预览展示的 active Map 数量上限。 */
export const CATALOG_MAX_ITEMS = 10;
/** Catalog 热度排序权重：更新新鲜度主导，访问次数与创建时间次之（rank 越小越靠前）。 */
export const HOTNESS_WEIGHTS = { update: 0.6, visit: 0.3, created: 0.1 } as const;

export type CodeMapStatus = "active" | "deprecated";
export type CodeMapSort = "recent" | "stale" | "title";
export type CodeMapAnchorKind = "code" | "directory" | "test" | "fixture" | "document" | "search" | "command";

export interface CodeMapConcept {
  term: string;
  definition: string;
}

export interface CodeMapAnchor {
  kind: CodeMapAnchorKind;
  title: string;
  target: string;
}

export interface CodeMapDeprecation {
  reason: string;
  deprecatedAt: string;
  replacementId?: string;
}

export interface CodeMapRecord {
  schemaVersion: 3;
  id: string;
  title: string;
  scope: string;
  status: CodeMapStatus;
  keywords: string[];
  concepts: CodeMapConcept[];
  relationshipDiagram: string;
  anchors: CodeMapAnchor[];
  createdAt: string;
  updatedAt: string;
  baselineCommit?: string;
  revision: number;
  deprecation?: CodeMapDeprecation;
}

export interface CodeMapPatch {
  id?: string;
  title?: string;
  scope?: string;
  status?: CodeMapStatus;
  keywords?: string[];
  concepts?: CodeMapConcept[];
  relationshipDiagram?: string;
  anchors?: CodeMapAnchor[];
  deprecationReason?: string;
  replacementId?: string;
  expectedRevision?: number;
}

export interface CodeMapListOptions {
  limit?: number;
  offset?: number;
  status?: CodeMapStatus | "all";
  query?: string;
  sort?: CodeMapSort;
}

export interface CodeMapListItem {
  id: string;
  title: string;
  scope: string;
  status: CodeMapStatus;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  baselineCommit?: string;
  revision: number;
  conceptCount: number;
  anchorCount: number;
  visitCount: number;
  commit: CodeMapCommitComparison;
}

export interface CodeMapIndexResult {
  activeTotal: number;
  deprecatedTotal: number;
  items: CodeMapListItem[];
  warnings: string[];
}

export interface CodeMapListResult extends CodeMapIndexResult {
  total: number;
  offset: number;
  limit: number;
  sort: CodeMapSort;
  nextOffset?: number;
}

export interface CodeMapWriteResult {
  operation: "created" | "updated" | "deprecated" | "restored";
  record: CodeMapRecord;
  previousRecord?: CodeMapRecord;
  changedFields: string[];
  path: string;
}

export type CodeMapCommitRelation =
  | "unrecorded"
  | "unavailable"
  | "missing"
  | "same"
  | "ancestor"
  | "descendant"
  | "diverged";

export interface CodeMapCommitComparison {
  relation: CodeMapCommitRelation;
  baselineCommit?: string;
  currentCommit?: string;
  currentOnlyCommits?: number;
  baselineOnlyCommits?: number;
}

export type CodeMapAnchorHealthStatus = "valid" | "broken" | "unchecked";

export interface CodeMapAnchorHealth {
  anchor: CodeMapAnchor;
  status: CodeMapAnchorHealthStatus;
  detail?: string;
}

export interface CodeMapHealth {
  valid: number;
  broken: number;
  unchecked: number;
  anchors: CodeMapAnchorHealth[];
}

interface LoadedRecords {
  records: CodeMapRecord[];
  warnings: string[];
}

interface CodeMapBase extends LoadedRecords {
  accessCounts: Record<string, number>;
  activeTotal: number;
  deprecatedTotal: number;
  currentCommit?: string;
}

export function codeMapDirectory(projectRoot: string, configDirName = ".pi"): string {
  return join(resolve(projectRoot), configDirName, "code-maps");
}

export function codeMapPath(projectRoot: string, id: string, configDirName = ".pi"): string {
  return join(codeMapDirectory(projectRoot, configDirName), `${validateCodeMapId(id)}.md`);
}

export async function readCodeMap(
  projectRoot: string,
  id: string,
  configDirName = ".pi",
): Promise<CodeMapRecord> {
  const path = codeMapPath(projectRoot, id, configDirName);
  const record = parseCodeMapMarkdown(await readFile(path, "utf8"), path);
  if (record.id !== id) throw new Error(`Code Map 文件名与记录 ID 不一致：${id} != ${record.id}`);
  return record;
}

/** 读取 active Map 的热度预览子集（热度排序，最多 CATALOG_MAX_ITEMS 条），供稳定 Catalog 和 TUI 使用；不受 list 分页影响。 */
export async function loadCodeMapIndex(projectRoot: string, configDirName = ".pi"): Promise<CodeMapIndexResult> {
  const base = await loadCodeMapBase(projectRoot, configDirName);
  const activeRecords = base.records.filter((record) => record.status === "active");
  const items = activeRecords.map((record) =>
    codeMapListItem(projectRoot, record, base.currentCommit, base.accessCounts),
  );
  items.sort(compareByHotness(rankByHotness(items)));
  return {
    activeTotal: base.activeTotal,
    deprecatedTotal: base.deprecatedTotal,
    items: items.slice(0, CATALOG_MAX_ITEMS),
    warnings: base.warnings,
  };
}

export async function listCodeMaps(
  projectRoot: string,
  options: CodeMapListOptions = {},
  configDirName = ".pi",
): Promise<CodeMapListResult> {
  const base = await loadCodeMapBase(projectRoot, configDirName);
  const status = options.status ?? "active";
  const sort = options.sort ?? "title";
  const query = options.query?.trim().toLocaleLowerCase();
  const filtered = base.records
    .filter((record) => status === "all" || record.status === status)
    .filter((record) => !query || codeMapSearchText(record).includes(query))
    .map((record) => codeMapListItem(projectRoot, record, base.currentCommit, base.accessCounts))
    .sort((left, right) => compareListItems(left, right, sort));
  const limit = clampInteger(options.limit ?? DEFAULT_LIST_LIMIT, 1, MAX_LIST_LIMIT);
  const offset = clampInteger(options.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
  const items = filtered.slice(offset, offset + limit);
  const nextOffset = offset + items.length < filtered.length ? offset + items.length : undefined;
  return {
    total: filtered.length,
    activeTotal: base.activeTotal,
    deprecatedTotal: base.deprecatedTotal,
    offset,
    limit,
    sort,
    items,
    ...(nextOffset === undefined ? {} : { nextOffset }),
    warnings: base.warnings,
  };
}

export async function writeCodeMap(
  projectRoot: string,
  patch: CodeMapPatch,
  configDirName = ".pi",
  now = new Date(),
): Promise<CodeMapWriteResult> {
  const directory = codeMapDirectory(projectRoot, configDirName);
  await mkdir(directory, { recursive: true });
  const id = patch.id ? validateCodeMapId(patch.id) : await generateCodeMapId(directory, patch.title);
  const path = codeMapPath(projectRoot, id, configDirName);
  const existing = await readCodeMapIfExists(path);
  if (existing && patch.expectedRevision !== undefined && existing.revision !== patch.expectedRevision) {
    throw new Error(`Code Map ${id} 已更新：期望 revision ${patch.expectedRevision}，当前为 ${existing.revision}`);
  }

  const timestamp = now.toISOString();
  const previousStatus = existing?.status;
  const status = patch.status ?? existing?.status ?? "active";
  const title = normalizedText(patch.title ?? existing?.title, "title", 200);
  const scope = normalizedText(patch.scope ?? existing?.scope, "scope", SCOPE_MAX_LENGTH);
  const keywords = normalizeStrings(patch.keywords ?? existing?.keywords ?? [], 12, 100);
  const concepts = normalizeConcepts(patch.concepts ?? existing?.concepts ?? []);
  const relationshipDiagram = normalizeRelationshipDiagram(
    patch.relationshipDiagram ?? existing?.relationshipDiagram ?? "",
  );
  const anchors = normalizeAnchors(patch.anchors ?? existing?.anchors ?? []);
  const baselineCommit = currentGitCommit(projectRoot) ?? existing?.baselineCommit;

  let deprecation = existing?.deprecation;
  if (status === "deprecated") {
    const reason = patch.deprecationReason?.trim() || deprecation?.reason;
    if (!reason) throw new Error("废弃 Code Map 时必须提供 deprecationReason");
    deprecation = {
      reason: normalizedText(reason, "deprecationReason", 2000),
      deprecatedAt: previousStatus === "deprecated" && deprecation ? deprecation.deprecatedAt : timestamp,
      ...(patch.replacementId
        ? { replacementId: validateCodeMapId(patch.replacementId) }
        : deprecation?.replacementId
          ? { replacementId: deprecation.replacementId }
          : {}),
    };
  } else {
    deprecation = undefined;
  }

  const record: CodeMapRecord = {
    schemaVersion: CODE_MAP_SCHEMA_VERSION,
    id,
    title,
    scope,
    status,
    keywords,
    concepts,
    relationshipDiagram,
    anchors,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    ...(baselineCommit ? { baselineCommit } : {}),
    revision: (existing?.revision ?? 0) + 1,
    ...(deprecation ? { deprecation } : {}),
  };
  await atomicWrite(path, serializeCodeMapMarkdown(record));
  const operation: CodeMapWriteResult["operation"] = !existing
    ? "created"
    : previousStatus !== "deprecated" && status === "deprecated"
      ? "deprecated"
      : previousStatus === "deprecated" && status === "active"
        ? "restored"
        : "updated";
  return {
    operation,
    record,
    ...(existing ? { previousRecord: existing } : {}),
    changedFields: codeMapChangedFields(existing, record),
    path,
  };
}

export function serializeCodeMapMarkdown(record: CodeMapRecord): string {
  const metadata: Record<string, unknown> = {
    schemaVersion: CODE_MAP_SCHEMA_VERSION,
    id: record.id,
    title: record.title,
    scope: record.scope,
    status: record.status,
    keywords: record.keywords,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.baselineCommit ? { baselineCommit: record.baselineCommit } : {}),
    ...(record.deprecation
      ? {
          deprecationReason: record.deprecation.reason,
          deprecatedAt: record.deprecation.deprecatedAt,
          ...(record.deprecation.replacementId ? { replacementId: record.deprecation.replacementId } : {}),
        }
      : {}),
  };
  const frontmatter = Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  return `---\n${frontmatter}\n---\n\n${codeMapBodyMarkdown(record)}\n`;
}

export function codeMapBodyMarkdown(
  record: Pick<CodeMapRecord, "concepts" | "relationshipDiagram" | "anchors">,
): string {
  const concepts = record.concepts.map((concept) => `- ${concept.term}：${concept.definition}`).join("\n");
  const anchors = record.anchors
    .map((anchor) => `- ${anchor.kind} | ${anchor.title} | \`${anchor.target}\``)
    .join("\n");
  return `# 相关概念\n\n${concepts}\n\n# 关系图\n\n\`\`\`mermaid\n${record.relationshipDiagram}\n\`\`\`\n\n# 导航锚点\n\n${anchors}`;
}

export function parseCodeMapMarkdown(source: string, path = "code-map.md"): CodeMapRecord {
  const { metadata, body } = splitMarkdown(source, path);
  // schemaVersion 2 是旧格式：summary 与 scope 分离；读取时自动把 summary 并入 scope 迁移为 v3。
  const isLegacy = metadata.schemaVersion === 2;
  const allowed = isLegacy
    ? new Set([
        "schemaVersion", "id", "title", "summary", "scope", "status", "keywords", "revision",
        "createdAt", "updatedAt", "baselineCommit", "deprecationReason", "deprecatedAt", "replacementId",
      ])
    : new Set([
        "schemaVersion", "id", "title", "scope", "status", "keywords", "revision",
        "createdAt", "updatedAt", "baselineCommit", "deprecationReason", "deprecatedAt", "replacementId",
      ]);
  for (const key of Object.keys(metadata)) {
    if (!allowed.has(key)) throw new Error(`未知 Frontmatter 字段：${key}`);
  }
  if (!isLegacy && metadata.schemaVersion !== CODE_MAP_SCHEMA_VERSION) {
    throw new Error(`不支持的 schemaVersion：${String(metadata.schemaVersion)}`);
  }
  if (metadata.status !== "active" && metadata.status !== "deprecated") {
    throw new Error(`无效 status：${String(metadata.status)}`);
  }
  if (!Number.isInteger(metadata.revision) || Number(metadata.revision) < 1) {
    throw new Error("revision 必须是正整数");
  }
  const parsedBody = parseBody(body);
  let deprecation: CodeMapDeprecation | undefined;
  if (metadata.status === "deprecated") {
    deprecation = {
      reason: normalizedText(metadata.deprecationReason, "deprecationReason", 2000),
      deprecatedAt: normalizedDate(metadata.deprecatedAt, "deprecatedAt"),
      ...(metadata.replacementId ? { replacementId: validateCodeMapId(String(metadata.replacementId)) } : {}),
    };
  }
  const baselineCommit = normalizedOptionalGitCommit(metadata.baselineCommit);
  let scope = normalizedText(metadata.scope, "scope", SCOPE_MAX_LENGTH);
  if (isLegacy) {
    const summary = normalizedText(metadata.summary, "summary", 400);
    scope = mergeSummaryIntoScope(summary, scope);
  }
  return {
    schemaVersion: CODE_MAP_SCHEMA_VERSION,
    id: validateCodeMapId(String(metadata.id ?? "")),
    title: normalizedText(metadata.title, "title", 200),
    scope,
    status: metadata.status,
    keywords: normalizeStrings(Array.isArray(metadata.keywords) ? metadata.keywords.map(String) : [], 12, 100),
    concepts: parsedBody.concepts,
    relationshipDiagram: parsedBody.relationshipDiagram,
    anchors: parsedBody.anchors,
    createdAt: normalizedDate(metadata.createdAt, "createdAt"),
    updatedAt: normalizedDate(metadata.updatedAt, "updatedAt"),
    ...(baselineCommit ? { baselineCommit } : {}),
    revision: Number(metadata.revision),
    ...(deprecation ? { deprecation } : {}),
  };
}

export function compareCodeMapCommit(
  projectRoot: string,
  baselineCommit: string | undefined,
): CodeMapCommitComparison {
  return compareCodeMapCommitAtHead(projectRoot, baselineCommit, currentGitCommit(projectRoot));
}

export async function inspectCodeMapHealth(projectRoot: string, anchors: readonly CodeMapAnchor[]): Promise<CodeMapHealth> {
  const checked = await Promise.all(anchors.map((anchor) => inspectAnchor(projectRoot, anchor)));
  return {
    valid: checked.filter((item) => item.status === "valid").length,
    broken: checked.filter((item) => item.status === "broken").length,
    unchecked: checked.filter((item) => item.status === "unchecked").length,
    anchors: checked,
  };
}

export function validateCodeMapId(id: string): string {
  const normalized = id.trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(normalized)) {
    throw new Error("Code Map ID 只能包含小写字母、数字、点、下划线和连字符，且最长 80 字符");
  }
  return normalized;
}

async function loadCodeMapBase(projectRoot: string, configDirName: string): Promise<CodeMapBase> {
  const { records, warnings } = await loadRecords(projectRoot, configDirName);
  const accessCounts = await createAccessStore(projectRoot, configDirName).load();
  const activeTotal = records.filter((record) => record.status === "active").length;
  return {
    records,
    warnings,
    accessCounts,
    activeTotal,
    deprecatedTotal: records.length - activeTotal,
    currentCommit: currentGitCommit(projectRoot),
  };
}

async function loadRecords(projectRoot: string, configDirName: string): Promise<LoadedRecords> {
  const directory = codeMapDirectory(projectRoot, configDirName);
  const warnings: string[] = [];
  const records: CodeMapRecord[] = [];
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const path = join(directory, entry.name);
      try {
        const record = parseCodeMapMarkdown(await readFile(path, "utf8"), path);
        if (`${record.id}.md` !== entry.name) {
          warnings.push(`${entry.name}: 文件名与记录 ID 不一致`);
          continue;
        }
        records.push(record);
      } catch (error) {
        warnings.push(`${entry.name}: ${errorMessage(error)}`);
      }
    }
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
  return { records, warnings };
}

function codeMapListItem(
  projectRoot: string,
  record: CodeMapRecord,
  currentCommit: string | undefined,
  accessCounts: Record<string, number>,
): CodeMapListItem {
  return {
    id: record.id,
    title: record.title,
    scope: record.scope,
    status: record.status,
    keywords: record.keywords,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.baselineCommit ? { baselineCommit: record.baselineCommit } : {}),
    revision: record.revision,
    conceptCount: record.concepts.length,
    anchorCount: record.anchors.length,
    visitCount: accessCounts[record.id] ?? 0,
    commit: compareCodeMapCommitAtHead(projectRoot, record.baselineCommit, currentCommit),
  };
}

/** 三个热度维度的全局排名（id → rank，rank 越小越靠前）。 */
export interface HotnessRanks {
  update: Map<string, number>;
  visit: Map<string, number>;
  created: Map<string, number>;
}

/** 按更新新鲜度、访问次数、创建时间分别计算竞争排名（并列值共享 rank，越小越靠前）。 */
export function rankByHotness(items: readonly CodeMapListItem[]): HotnessRanks {
  const byKey = (key: (item: CodeMapListItem) => number, order: (a: number, b: number) => number) =>
    denseRank(items, key, order);
  return {
    update: byKey((item) => Date.parse(item.updatedAt), (a, b) => b - a),
    visit: byKey((item) => item.visitCount, (a, b) => b - a),
    created: byKey((item) => Date.parse(item.createdAt), (a, b) => b - a),
  };
}

function denseRank(
  items: readonly CodeMapListItem[],
  key: (item: CodeMapListItem) => number,
  order: (a: number, b: number) => number,
): Map<string, number> {
  const sorted = [...items].sort((left, right) => order(key(left), key(right)) || left.id.localeCompare(right.id));
  const ranks = new Map<string, number>();
  let rank = 0;
  let previousKey: number | undefined;
  for (const item of sorted) {
    const value = key(item);
    if (previousKey !== undefined && value !== previousKey) rank += 1;
    ranks.set(item.id, rank);
    previousKey = value;
  }
  return ranks;
}

/** 热度排序比较器：权重加权排名，同分按标题稳定排序。 */
export function compareByHotness(ranks: HotnessRanks): (left: CodeMapListItem, right: CodeMapListItem) => number {
  const score = (item: CodeMapListItem) =>
    HOTNESS_WEIGHTS.update * (ranks.update.get(item.id) ?? 0)
    + HOTNESS_WEIGHTS.visit * (ranks.visit.get(item.id) ?? 0)
    + HOTNESS_WEIGHTS.created * (ranks.created.get(item.id) ?? 0);
  return (left, right) => score(left) - score(right) || compareTitles(left, right);
}

function codeMapSearchText(record: CodeMapRecord): string {
  return [
    record.id,
    record.title,
    record.scope,
    ...record.keywords,
    ...record.concepts.flatMap((concept) => [concept.term, concept.definition]),
    ...record.anchors.flatMap((anchor) => [anchor.kind, anchor.title, anchor.target]),
  ].join("\n").toLocaleLowerCase();
}

function compareListItems(left: CodeMapListItem, right: CodeMapListItem, sort: CodeMapSort): number {
  let comparison = 0;
  switch (sort) {
    case "recent":
      comparison = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      break;
    case "stale":
      comparison = commitDistanceScore(right.commit) - commitDistanceScore(left.commit);
      break;
    case "title":
      comparison = compareTitles(left, right);
      break;
  }
  return comparison || compareTitles(left, right);
}

function compareTitles(left: Pick<CodeMapListItem, "title" | "id">, right: Pick<CodeMapListItem, "title" | "id">): number {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

function compareCodeMapCommitAtHead(
  projectRoot: string,
  baselineCommit: string | undefined,
  currentCommit: string | undefined,
): CodeMapCommitComparison {
  if (!baselineCommit) return { relation: "unrecorded", ...(currentCommit ? { currentCommit } : {}) };
  if (!currentCommit) return { relation: "unavailable", baselineCommit };
  try {
    const counts = execGit(projectRoot, ["rev-list", "--left-right", "--count", `${baselineCommit}...${currentCommit}`]);
    const [baselineOnlyCommits, currentOnlyCommits] = counts.split(/\s+/).map(Number);
    if (!Number.isInteger(baselineOnlyCommits) || !Number.isInteger(currentOnlyCommits)) throw new Error("invalid count");
    const relation: CodeMapCommitRelation = baselineOnlyCommits === 0 && currentOnlyCommits === 0
      ? "same"
      : baselineOnlyCommits === 0
        ? "ancestor"
        : currentOnlyCommits === 0
          ? "descendant"
          : "diverged";
    return { relation, baselineCommit, currentCommit, currentOnlyCommits, baselineOnlyCommits };
  } catch {
    return { relation: "missing", baselineCommit, currentCommit };
  }
}

async function inspectAnchor(projectRoot: string, anchor: CodeMapAnchor): Promise<CodeMapAnchorHealth> {
  if (anchor.kind === "search" || anchor.kind === "command") {
    return { anchor, status: "unchecked", detail: "不会自动执行" };
  }
  if (isAbsolute(anchor.target)) {
    return { anchor, status: "broken", detail: "路径必须相对于项目根" };
  }
  const root = resolve(projectRoot);
  const target = resolve(root, anchor.target);
  const fromRoot = relative(root, target);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    return { anchor, status: "broken", detail: "路径越出项目根" };
  }
  try {
    const metadata = await stat(target);
    if (anchor.kind === "directory" && !metadata.isDirectory()) {
      return { anchor, status: "broken", detail: "目标不是目录" };
    }
    return { anchor, status: "valid" };
  } catch (error) {
    return {
      anchor,
      status: "broken",
      detail: isMissingFileError(error) ? "目标不存在" : errorMessage(error),
    };
  }
}

function splitMarkdown(source: string, path: string): { metadata: Record<string, unknown>; body: string } {
  if (!source.startsWith("---\n")) throw new Error(`${path}: 缺少 Frontmatter`);
  const end = source.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${path}: Frontmatter 未闭合`);
  const metadata: Record<string, unknown> = {};
  for (const line of source.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) throw new Error(`${path}: 无效 Frontmatter 行：${line}`);
    const key = line.slice(0, separator).trim();
    if (key in metadata) throw new Error(`${path}: 重复 Frontmatter 字段：${key}`);
    try {
      metadata[key] = JSON.parse(line.slice(separator + 1).trim());
    } catch {
      throw new Error(`${path}: Frontmatter 字段 ${key} 必须使用 JSON 标量或数组语法`);
    }
  }
  return { metadata, body: source.slice(end + 5).trim() };
}

function parseBody(body: string): Pick<CodeMapRecord, "concepts" | "relationshipDiagram" | "anchors"> {
  const match = body.match(
    /^# 相关概念\n\n([\s\S]+?)\n\n# 关系图\n\n```mermaid\n([\s\S]+?)\n```\n\n# 导航锚点\n\n([\s\S]+)$/,
  );
  if (!match) throw new Error("正文必须依次包含相关概念、关系图和导航锚点三个章节");
  const concepts = normalizeConcepts(match[1].split("\n").map((line) => {
    const item = line.match(/^- ([^：\n]+)：(.+)$/);
    if (!item) throw new Error(`无效概念条目：${line}`);
    return { term: item[1], definition: item[2] };
  }));
  const anchors = normalizeAnchors(match[3].split("\n").map((line) => {
    const item = line.match(/^- ([a-z]+) \| ([^|\n]+) \| `([^`\n]+)`$/);
    if (!item) throw new Error(`无效 Anchor 条目：${line}`);
    return { kind: item[1] as CodeMapAnchorKind, title: item[2], target: item[3] };
  }));
  return {
    concepts,
    relationshipDiagram: normalizeRelationshipDiagram(match[2]),
    anchors,
  };
}

function normalizeConcepts(value: readonly CodeMapConcept[]): CodeMapConcept[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("concepts 至少包含一项");
  if (value.length > 30) throw new Error("concepts 最多包含 30 项");
  return value.map((concept) => {
    const term = normalizedSingleLine(concept?.term, "concepts.term", 120);
    if (term.includes("：")) throw new Error("concepts.term 不能包含中文冒号");
    return { term, definition: normalizedSingleLine(concept?.definition, "concepts.definition", 500) };
  });
}

function normalizeRelationshipDiagram(value: unknown): string {
  const diagram = normalizedText(value, "relationshipDiagram", 10_000);
  if (diagram.includes("```")) throw new Error("relationshipDiagram 只包含 Mermaid 正文，不包含代码围栏");
  return diagram;
}

function normalizeAnchors(value: readonly CodeMapAnchor[]): CodeMapAnchor[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("anchors 至少包含一项");
  if (value.length > 100) throw new Error("anchors 最多包含 100 项");
  return value.map((anchor) => {
    if (!isCodeMapAnchorKind(anchor?.kind)) throw new Error(`无效 anchor kind：${String(anchor?.kind)}`);
    const title = normalizedSingleLine(anchor?.title, "anchors.title", 200);
    if (title.includes("|")) throw new Error("anchors.title 不能包含竖线");
    const target = normalizedSingleLine(anchor?.target, "anchors.target", 4000);
    if (target.includes("`")) throw new Error("anchors.target 不能包含反引号");
    return { kind: anchor.kind, title, target };
  });
}

function isCodeMapAnchorKind(value: unknown): value is CodeMapAnchorKind {
  return ["code", "directory", "test", "fixture", "document", "search", "command"].includes(String(value));
}

function normalizedSingleLine(value: unknown, field: string, maximum: number): string {
  const text = normalizedText(value, field, maximum);
  if (text.includes("\n") || text.includes("\r")) throw new Error(`${field} 必须是单行文本`);
  return text;
}

/** v2 → v3 迁移：summary 作为结论前缀并入 scope；scope 已包含该结论时不重复。 */
function mergeSummaryIntoScope(summary: string, scope: string): string {
  const conclusion = summary.replace(/[。\s]+$/, "");
  if (scope.includes(conclusion) || scope.includes(summary)) return scope;
  const merged = `${conclusion} ${scope}`;
  if (merged.length <= SCOPE_MAX_LENGTH) return merged;
  // 超限时优先保留完整 scope，只压缩结论前缀
  const budget = SCOPE_MAX_LENGTH - scope.length - 1;
  return budget >= 20 ? `${conclusion.slice(0, budget)} ${scope}` : scope;
}

function normalizedText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} 不能为空`);
  const text = value.trim();
  if (text.length > maximum) throw new Error(`${field} 最长 ${maximum} 字符`);
  return text;
}

function normalizeStrings(value: readonly string[], maximumItems: number, maximumLength: number): string[] {
  if (!Array.isArray(value)) throw new Error("字段必须是字符串数组");
  const normalized = [...new Set(value.map((item) => normalizedSingleLine(String(item), "array item", maximumLength)))];
  if (normalized.length > maximumItems) throw new Error(`数组最多包含 ${maximumItems} 项`);
  return normalized;
}

function normalizedDate(value: unknown, field: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error(`${field} 不是有效时间`);
  return new Date(value).toISOString();
}

function normalizeGitCommit(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLocaleLowerCase();
  return /^[0-9a-f]{7,64}$/.test(normalized) ? normalized : undefined;
}

function normalizedOptionalGitCommit(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const normalized = normalizeGitCommit(value);
  if (!normalized) throw new Error("baselineCommit 不是有效 Git commit ID");
  return normalized;
}

async function readCodeMapIfExists(path: string): Promise<CodeMapRecord | undefined> {
  try {
    return parseCodeMapMarkdown(await readFile(path, "utf8"), path);
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

async function generateCodeMapId(directory: string, title: string | undefined): Promise<string> {
  const normalizedTitle = normalizedText(title, "title", 200);
  const slug = normalizedTitle.normalize("NFKD").toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  const base = slug || `code-map-${createHash("sha256").update(normalizedTitle).digest("hex").slice(0, 8)}`;
  let candidate = base;
  let suffix = 2;
  while (await fileExists(join(directory, `${candidate}.md`))) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return validateCodeMapId(candidate.slice(0, 80).replace(/-+$/g, ""));
}

function currentGitCommit(projectRoot: string): string | undefined {
  try {
    return normalizeGitCommit(execGit(projectRoot, ["rev-parse", "HEAD"]));
  } catch {
    return undefined;
  }
}

function execGit(projectRoot: string, args: string[]): string {
  return execFileSync("git", ["-C", projectRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 3000,
  }).trim();
}

function commitDistanceScore(comparison: CodeMapCommitComparison): number {
  if (comparison.relation === "missing" || comparison.relation === "diverged") {
    return 1_000_000 + (comparison.currentOnlyCommits ?? 0) + (comparison.baselineOnlyCommits ?? 0);
  }
  if (comparison.relation === "unavailable" || comparison.relation === "unrecorded") return 500_000;
  return (comparison.currentOnlyCommits ?? 0) + (comparison.baselineOnlyCommits ?? 0);
}

function codeMapChangedFields(previous: CodeMapRecord | undefined, current: CodeMapRecord): string[] {
  const fields: Array<keyof CodeMapRecord> = [
    "title", "scope", "status", "keywords", "concepts", "relationshipDiagram", "anchors", "deprecation",
  ];
  if (!previous) return fields.filter((field) => current[field] !== undefined);
  return fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(current[field]));
}

async function atomicWrite(path: string, content: string): Promise<void> {
  const directory = resolve(path, "..");
  await mkdir(directory, { recursive: true });
  const tempPath = join(directory, `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, path);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
