import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { recordCodeMapAccess } from "./access.ts";
import {
	compactFreshness,
	formatCodeMapCatalog,
	formatCodeMapListForAgent,
	formatCodeMapMarkdown,
	formatCodeMapWriteForAgent,
	truncateByDisplayWidth,
} from "./format.ts";
import {
	compareCodeMapCommit,
	inspectCodeMapHealth,
	listCodeMaps,
	loadCodeMapIndex,
	parseCodeMapMarkdown,
	readCodeMap,
	serializeCodeMapMarkdown,
	writeCodeMap,
} from "./store.ts";

const assert = {
	equal(actual: unknown, expected: unknown): void {
		expect(actual).toBe(expected);
	},
	deepEqual(actual: unknown, expected: unknown): void {
		expect(actual).toEqual(expected);
	},
	match(actual: string, expected: RegExp): void {
		expect(actual).toMatch(expected);
	},
	doesNotMatch(actual: string, expected: RegExp): void {
		expect(actual).not.toMatch(expected);
	},
	throws(callback: () => unknown, expected: RegExp): void {
		expect(callback).toThrow(expected);
	},
	async rejects(promise: Promise<unknown>, expected: RegExp): Promise<void> {
		await expect(promise).rejects.toThrow(expected);
	},
};

const map = {
	scope: "覆盖 Scene Document 到运行时解析；不包含 Viewer 呈现。",
	keywords: ["scene", "resolver"],
	concepts: [
		{ term: "SceneDocument", definition: "可持久化的场景定义。" },
		{ term: "SceneResolver", definition: "将场景定义展开为运行时场景。" },
	],
	relationshipDiagram: "flowchart LR\n    Document --> Resolver",
	anchors: [
		{ kind: "code" as const, title: "场景定义", target: "src/scene.rs" },
		{ kind: "search" as const, title: "Resolver 入口", target: "rg -n 'SceneResolver' src" },
	],
};

test("Code Map 创建、读取、更新、废弃和恢复", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-"));
	try {
		const created = await writeCodeMap(root, {
			title: "Scene Map",
			...map,
		});
		assert.equal(created.operation, "created");
		assert.equal(created.record.id, "scene-map");
		const source = await readFile(created.path, "utf8");
		assert.match(source, /^---\nschemaVersion: 3/m);
		assert.match(source, /scope: /);
		assert.match(source, /keywords: /);
		assert.match(source, /# 导航锚点/);
		assert.match(source, /- code \| 场景定义 \| `src\/scene\.rs`/);

		const updated = await writeCodeMap(root, {
			id: created.record.id,
			expectedRevision: 1,
			scope: "更新后的场景范围。",
		});
		assert.equal(updated.record.revision, 2);
		assert.deepEqual(updated.changedFields, ["scope"]);

		const deprecated = await writeCodeMap(root, {
			id: created.record.id,
			status: "deprecated",
			deprecationReason: "实现已经迁移",
		});
		assert.equal(deprecated.operation, "deprecated");
		assert.equal(deprecated.record.deprecation?.reason, "实现已经迁移");

		const restored = await writeCodeMap(root, { id: created.record.id, status: "active" });
		assert.equal(restored.operation, "restored");
		assert.equal(restored.record.deprecation, undefined);
		assert.equal((await readCodeMap(root, created.record.id)).scope, "更新后的场景范围。");
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("schema v2 旧文件读取时自动把 summary 并入 scope，写入输出 v3", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-legacy-"));
	try {
		const now = new Date().toISOString();
		const source = `---
schemaVersion: 2
id: "legacy"
title: "Legacy"
summary: "结论摘要。"
scope: "覆盖 A；不包含 B。"
status: "active"
keywords: []
revision: 1
createdAt: "${now}"
updatedAt: "${now}"
---

# 相关概念

- A：B

# 关系图

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`

# 导航锚点

- code | A | \`src/a.rs\`
`;
		const record = parseCodeMapMarkdown(source);
		assert.equal(record.schemaVersion, 3);
		assert.equal(record.scope, "结论摘要 覆盖 A；不包含 B。");
		const reserialized = serializeCodeMapMarkdown(record);
		assert.match(reserialized, /schemaVersion: 3/);
		assert.doesNotMatch(reserialized, /summary/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("严格拒绝未知 Frontmatter 字段和旧 Bookmark 字段", () => {
	const now = new Date().toISOString();
	const source = `---
schemaVersion: 2
id: "invalid"
title: "Invalid"
scope: "Invalid"
status: "active"
pinned: false
keywords: []
revision: 1
createdAt: "${now}"
updatedAt: "${now}"
---

# 相关概念

- A：B

# 关系图

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`

# 相关资源

- A | \`src/a.rs\`
`;
	assert.throws(() => parseCodeMapMarkdown(source), /未知 Frontmatter 字段：pinned/);
});

test("列表默认稳定按标题排序、过滤且隐藏 deprecated", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-list-"));
	try {
		const zulu = await writeCodeMap(root, { title: "Zulu", ...map });
		const alpha = await writeCodeMap(root, {
			title: "Alpha",
			...map,
			scope: "覆盖 Runtime Alpha 边界。",
			keywords: ["alpha-keyword"],
		});
		const active = await listCodeMaps(root, { limit: 1 });
		assert.equal(active.sort, "title");
		assert.equal(active.items[0]?.id, alpha.record.id);
		assert.equal(active.nextOffset, 1);
		assert.equal((await listCodeMaps(root, { query: "alpha-keyword" })).items[0]?.id, alpha.record.id);
		assert.equal((await listCodeMaps(root, { query: "runtime alpha" })).items[0]?.id, alpha.record.id);

		await writeCodeMap(root, { id: alpha.record.id, status: "deprecated", deprecationReason: "not useful" });
		const after = await listCodeMaps(root);
		assert.equal(after.total, 1);
		assert.equal(after.items[0]?.id, zulu.record.id);
		assert.equal(after.deprecatedTotal, 1);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("Catalog 预览按热度取前 10 个且只输出路由数据", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-catalog-"));
	try {
		for (let index = 0; index < 12; index += 1) {
			const special = index === 11;
			await writeCodeMap(
				root,
				{
					title: special ? "A & B" : `Map ${String(index).padStart(2, "0")}`,
					...map,
					keywords: special ? ['quoted"keyword'] : [`keyword-${index}`],
				},
				".pi",
				new Date(Date.UTC(2024, 0, 1, 0, 0, index)),
			);
		}
		const page = await listCodeMaps(root, { limit: 1 });
		assert.equal(page.items.length, 1);
		const index = await loadCodeMapIndex(root);
		assert.equal(index.activeTotal, 12);
		assert.equal(index.items.length, 10);
		// 无访问记录时热度排序由更新时间主导（index 2..11，其中 11 为特殊字符标题）
		assert.deepEqual(
			index.items.map((item) => item.id),
			["a-b", "map-10", "map-09", "map-08", "map-07", "map-06", "map-05", "map-04", "map-03", "map-02"],
		);
		const catalog = formatCodeMapCatalog(index);
		assert.match(catalog, /^Project Code Maps 是项目内稳定实现主题的导航索引/);
		assert.match(catalog, /<project_code_map_catalog reader="project_code_map_read" count="10" total="12">/);
		assert.match(catalog, /<id>a-b<\/id>/);
		assert.match(catalog, /<title>A &amp; B<\/title>/);
		assert.match(catalog, /<description>/);
		assert.match(catalog, /<freshness>no-baseline<\/freshness>/);
		assert.doesNotMatch(catalog, /keywords=/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("访问计数写入 sidecar 并提升 Catalog 热度排序", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-access-"));
	try {
		// alpha/beta 同一点创建；gamma 更新，热度上应领先。
		const sameMoment = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
		await writeCodeMap(root, { title: "Alpha", ...map }, ".pi", sameMoment);
		await writeCodeMap(root, { title: "Beta", ...map }, ".pi", sameMoment);
		await writeCodeMap(root, { title: "Gamma", ...map }, ".pi", new Date(Date.UTC(2024, 0, 1, 0, 0, 1)));

		// 无访问时：gamma（更新）优先，alpha/beta 并列按标题
		let index = await loadCodeMapIndex(root);
		assert.deepEqual(
			index.items.map((item) => item.id),
			["gamma", "alpha", "beta"],
		);

		// 多次访问 alpha 后，alpha 应超过并列的 beta
		await recordCodeMapAccess(root, "alpha");
		await recordCodeMapAccess(root, "alpha");
		await recordCodeMapAccess(root, "alpha");
		index = await loadCodeMapIndex(root);
		assert.deepEqual(
			index.items.map((item) => item.id),
			["gamma", "alpha", "beta"],
		);
		assert.equal(index.items[1]?.visitCount, 3);

		// sidecar 持久化且不被 .md 记录污染
		const counts = JSON.parse(await readFile(join(root, ".pi", "code-maps", ".access.json"), "utf8"));
		assert.deepEqual(counts, { alpha: 3 });
		const source = await readFile(join(root, ".pi", "code-maps", "alpha.md"), "utf8");
		assert.doesNotMatch(source, /visitCount/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("compactFreshness 输出紧凑新鲜度标签", () => {
	assert.equal(compactFreshness({ relation: "same" }), "fresh");
	assert.equal(compactFreshness({ relation: "ancestor", currentOnlyCommits: 13 }), "old 13");
	assert.equal(compactFreshness({ relation: "descendant", baselineOnlyCommits: 2 }), "ahead 2");
	assert.equal(compactFreshness({ relation: "diverged" }), "diverged");
	assert.equal(compactFreshness({ relation: "missing" }), "missing");
	assert.equal(compactFreshness({ relation: "unavailable" }), "no-git");
	assert.equal(compactFreshness({ relation: "unrecorded" }), "no-baseline");
});

test("truncateByDisplayWidth 按东亚宽度截断", () => {
	assert.equal(truncateByDisplayWidth("abc", 5), "abc");
	assert.equal(truncateByDisplayWidth("中文标题测试", 6), "中文标…");
	assert.equal(truncateByDisplayWidth("a中b文", 5), "a中b…");
});

test("revision 可阻止陈旧更新覆盖新内容", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-revision-"));
	try {
		const created = await writeCodeMap(root, { title: "Revision", ...map });
		await writeCodeMap(root, { id: created.record.id, expectedRevision: 1, scope: "v2 范围" });
		await assert.rejects(
			writeCodeMap(root, { id: created.record.id, expectedRevision: 1, scope: "stale 范围" }),
			/期望 revision 1，当前为 2/,
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("中文标题生成稳定且合法的 ID", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-chinese-id-"));
	try {
		const first = await writeCodeMap(root, { title: "渲染资产预览", ...map });
		const second = await writeCodeMap(root, { title: "渲染资产预览", ...map });
		assert.match(first.record.id, /^code-map-[a-f0-9]{8}$/);
		assert.equal(second.record.id, `${first.record.id}-2`);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("Anchor 健康检查只检查安全路径，不执行 search 和 command", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-health-"));
	try {
		await mkdir(join(root, "src"));
		await writeFile(join(root, "src", "scene.rs"), "scene\n");
		const marker = join(root, "must-not-run");
		const health = await inspectCodeMapHealth(root, [
			{ kind: "code", title: "Scene", target: "src/scene.rs" },
			{ kind: "directory", title: "Source directory", target: "src" },
			{ kind: "test", title: "Missing test", target: "tests/missing.rs" },
			{ kind: "document", title: "Escaped", target: "../outside.md" },
			{ kind: "search", title: "Search", target: "rg -n Scene src" },
			{ kind: "command", title: "Do not run", target: `touch ${marker}` },
		]);
		assert.equal(health.valid, 2);
		assert.equal(health.broken, 2);
		assert.equal(health.unchecked, 2);
		await assert.rejects(readFile(marker), /ENOENT/);
		assert.match(health.anchors.find((item) => item.anchor.title === "Escaped")?.detail ?? "", /越出项目根/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("记录 Git baseline、计算差距并生成完整读取视图", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-project-code-maps-git-"));
	try {
		git(root, ["init", "-q"]);
		await mkdir(join(root, "src"));
		await writeFile(join(root, "src", "scene.rs"), "first\n");
		git(root, ["add", "src/scene.rs"]);
		gitCommit(root, "initial");
		const initialCommit = git(root, ["rev-parse", "HEAD"]);
		const created = await writeCodeMap(root, { title: "Git Map", ...map });
		assert.equal(created.record.baselineCommit, initialCommit);

		await writeFile(join(root, "second.txt"), "second\n");
		git(root, ["add", "second.txt"]);
		gitCommit(root, "second");
		const comparison = compareCodeMapCommit(root, created.record.baselineCommit);
		assert.equal(comparison.relation, "ancestor");
		assert.equal(comparison.currentOnlyCommits, 1);
		const health = await inspectCodeMapHealth(root, created.record.anchors);
		const markdown = formatCodeMapMarkdown(created.record, comparison, health);
		assert.match(markdown, /^# Git Map/m);
		assert.match(markdown, /# 范围/);
		assert.match(markdown, /HEAD 新 1/);
		assert.match(markdown, /anchors 1 valid \/ 0 broken \/ 1 unchecked/);
		assert.match(markdown, /# 导航锚点/);

		const listed = await listCodeMaps(root, { sort: "stale" });
		const listMarkdown = formatCodeMapListForAgent(listed);
		assert.match(listMarkdown, /显示 1–1 \/ 1 · 排序 stale/);
		assert.match(listMarkdown, /scope:/);

		const updated = await writeCodeMap(root, { id: created.record.id, scope: "Updated baseline 范围" });
		const writeMarkdown = formatCodeMapWriteForAgent(updated, ".pi/code-maps/git-map.md");
		assert.match(writeMarkdown, /changed: scope/);
		assert.match(writeMarkdown, /path: \.pi\/code-maps\/git-map\.md/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

function git(root: string, args: string[]): string {
	return execFileSync("git", ["-C", root, ...args], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function gitCommit(root: string, message: string): void {
	git(root, [
		"-c",
		"user.name=Pi Test",
		"-c",
		"user.email=pi-test@example.invalid",
		"-c",
		"commit.gpgsign=false",
		"commit",
		"-q",
		"-m",
		message,
	]);
}
