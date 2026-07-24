import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryPath = (...segments: string[]) =>
	path.join(process.cwd(), "db", "generated", "repositories", ...segments);

describe("generated repository contract", () => {
	it("separates builder-only readers from executable writers", () => {
		const index = fs.readFileSync(repositoryPath("index.ts"), "utf8");

		expect(index).toContain("export const repositoryReaders");
		expect(index).toContain("export const repositoryWriters");
		// RepositoryReaders 是对齐 keyof DB 的映射契约，并由 satisfies 约束生成物不漂移
		expect(index).toContain("export type RepositoryReaders = {");
		expect(index).toContain("[K in keyof DB]");
		expect(index).toContain("} as const satisfies RepositoryReaders;");
		expect(index).toContain("} as const satisfies RepositoryWriters;");
		expect(index).toContain("export type RepositoryReader<");
		expect(index).toContain("export type RepositoryWriters = {");
		expect(index).toContain("writer 的入参包含审计字段剔除等生成期策略");
		expect(index).toContain("export type RepositoryWriter<");
		expect(index).not.toContain("repositoryQueries");
		expect(index).not.toContain("repositoryMethods");

		const readers = index.slice(
			index.indexOf("export const repositoryReaders"),
			index.indexOf("export const repositoryWriters"),
		);
		expect(readers).not.toMatch(/\b(insert|update|delete):/);
		expect(readers).not.toContain("getWithRelations");
	});

	it("generates no executable read compatibility functions", () => {
		const skill = fs.readFileSync(repositoryPath("skill.ts"), "utf8");

		expect(skill).toContain("export function selectSkillByIdQuery");
		expect(skill).toContain("export function selectAllSkillsQuery");
		expect(skill).not.toContain("export async function selectSkillById(");
		expect(skill).not.toContain("export async function selectAllSkills(");
	});

	it("uses explicit writer identity for audit fields and authorization", () => {
		const skill = fs.readFileSync(repositoryPath("skill.ts"), "utf8");

		expect(skill).not.toContain('from "~/store"');
		expect(skill).toContain("createSkill(context: RepositoryWriterContext");
		expect(skill).toContain("createdByAccountId: context.accountId");
		expect(skill).toContain("updatedByAccountId: context.accountId");
		expect(skill).toContain("delete writableData.id");
		expect(skill).toContain("delete writableData.createdByAccountId");
		expect(skill).toContain("canEditSkill(context, id, db)");
		expect(skill).toContain('throw new RepositoryAuthorizationError("skill", id)');
	});
});
