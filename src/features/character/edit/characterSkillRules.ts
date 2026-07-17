import type { CharacterSkill } from "@db/generated/repositories/character_skill";
import type { Skill } from "@db/generated/repositories/skill";
import type { CharacterSkillEdit } from "./characterEditProtocol";

export type CharacterSkillMutationPlan = {
	updates: Array<{ characterSkillId: string; lv: number }>;
	inserts: Array<{ templateId: string; lv: number }>;
	deletes: string[];
};

type PlannedSkillState = {
	original: CharacterSkill | null;
	lv: number;
};

const SKILL_MAX_LEVEL = 10;
const SKILL_PREREQUISITE_LEVEL = 5;

/**
 * 根据同一事务读取的角色技能与模板图解释技能编辑。
 * 函数只计算 character_skill 的最终变化，不分配 ID，也不读取 UI 或 live 快照。
 */
export function planCharacterSkillMutations(
	edits: readonly CharacterSkillEdit[],
	characterSkills: readonly CharacterSkill[],
	templates: readonly Skill[],
): CharacterSkillMutationPlan {
	const templateById = new Map(templates.map((template) => [template.id, template]));
	if (templateById.size !== templates.length) throw new Error("技能模板图包含重复 ID");
	const childrenByTemplateId = new Map<string, Skill[]>();
	for (const template of templates) {
		if (!template.preSkillId) continue;
		const children = childrenByTemplateId.get(template.preSkillId) ?? [];
		children.push(template);
		childrenByTemplateId.set(template.preSkillId, children);
	}

	const stateByTemplateId = new Map<string, PlannedSkillState>();
	for (const skill of characterSkills) {
		if (skill.isStarGem) continue;
		if (stateByTemplateId.has(skill.templateId)) {
			throw new Error(`Character 普通技能模板重复: ${skill.templateId}`);
		}
		stateByTemplateId.set(skill.templateId, { original: skill, lv: skill.lv });
	}
	const deletedIds = new Set<string>();

	const requireTemplate = (templateId: string): Skill => {
		const template = templateById.get(templateId);
		if (!template) throw new Error(`技能模板不存在: ${templateId}`);
		return template;
	};
	const stateFor = (templateId: string): PlannedSkillState => {
		const current = stateByTemplateId.get(templateId);
		if (current) return current;
		const created = { original: null, lv: 0 };
		stateByTemplateId.set(templateId, created);
		return created;
	};
	const setLevel = (templateId: string, lv: number) => {
		stateFor(templateId).lv = Math.max(0, Math.min(SKILL_MAX_LEVEL, lv));
	};
	const raisePrerequisites = (template: Skill) => {
		const visited = new Set<string>([template.id]);
		let preSkillId = template.preSkillId;
		while (preSkillId) {
			if (visited.has(preSkillId)) throw new Error(`技能前置关系存在循环: ${preSkillId}`);
			visited.add(preSkillId);
			const prerequisite = requireTemplate(preSkillId);
			const state = stateFor(prerequisite.id);
			if (state.lv < SKILL_PREREQUISITE_LEVEL) state.lv = SKILL_PREREQUISITE_LEVEL;
			preSkillId = prerequisite.preSkillId;
		}
	};
	const clearDependents = (templateId: string) => {
		const visited = new Set<string>();
		const visit = (parentId: string) => {
			if (visited.has(parentId)) throw new Error(`技能后继关系存在循环: ${parentId}`);
			visited.add(parentId);
			for (const child of childrenByTemplateId.get(parentId) ?? []) {
				if (stateByTemplateId.get(child.id)?.lv) setLevel(child.id, 0);
				visit(child.id);
			}
			visited.delete(parentId);
		};
		visit(templateId);
	};

	for (const edit of edits) {
		if (edit.type === "skills.removeTree") {
			for (const [templateId, state] of stateByTemplateId) {
				const template = requireTemplate(templateId);
				if (template.treeType !== edit.treeType) continue;
				if (state.original) deletedIds.add(state.original.id);
				stateByTemplateId.delete(templateId);
			}
			continue;
		}

		const template = requireTemplate(edit.templateId);
		const currentLevel = stateByTemplateId.get(template.id)?.lv ?? 0;
		const nextLevel = Math.max(0, Math.min(SKILL_MAX_LEVEL, currentLevel + edit.delta));
		if (nextLevel === currentLevel) continue;
		if (edit.delta > 0) raisePrerequisites(template);
		setLevel(template.id, nextLevel);
		if (edit.delta < 0 && nextLevel < SKILL_PREREQUISITE_LEVEL) clearDependents(template.id);
	}

	const updates: CharacterSkillMutationPlan["updates"] = [];
	const inserts: CharacterSkillMutationPlan["inserts"] = [];
	for (const [templateId, state] of stateByTemplateId) {
		if (state.original && !deletedIds.has(state.original.id)) {
			if (state.lv !== state.original.lv) updates.push({ characterSkillId: state.original.id, lv: state.lv });
			continue;
		}
		if (state.lv > 0) inserts.push({ templateId, lv: state.lv });
	}
	return { updates, inserts, deletes: [...deletedIds] };
}
