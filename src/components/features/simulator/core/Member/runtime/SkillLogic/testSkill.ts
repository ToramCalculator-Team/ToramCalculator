// ========== 示例 skillEffect.logic 片段（JS 直写） ==========

export const sampleSkillLogics: Record<string, string> = {
  缺省技能: `
function main() {
  ctx.runPipeline("前摇", { mpCost: ctx.runStage("技能MP消耗", {}).skillMpCostResult, hpCost: ctx.runStage("技能HP消耗", {}).skillHpCostResult });
  ctx.runPipeline("蓄力", {});
  ctx.runPipeline("咏唱", {});
  ctx.runPipeline("发动", {});
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
`,
  魔法炮充能: `
function main() {
  if (ctx.fillPercent == null) ctx.fillPercent = 0;
  const inc = ctx.fillPercent >= 100 ? 0.5 : 1;
  ctx.fillPercent = Math.min(200, ctx.fillPercent + inc);
  console.log("🔋 fillPercent =", ctx.fillPercent);
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
  `,

  魔法炮发动: `
function main() {
  const fill = ctx.fillPercent ?? 0;
  ctx.fillPercent = 0;
  ctx.buffManager.addBuff({
    id: "magic-cannon-charge",
    name: "魔法炮充能",
    duration: 5000,
    startTime: Date.now(),
    source: "test",
    effects: [],
    variables: { fill }
  });
  console.log("💥 魔法炮发动，fill =", fill);
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
  `,

  灵光剑舞叠层: `
function main() {
  if (ctx.glowStacks == null) ctx.glowStacks = 0;
  const last = ctx.glowLastFrame ?? 0;
  if (ctx.currentFrame - last >= 120) { // 约2秒
    ctx.glowStacks = Math.min(999, ctx.glowStacks + 1);
    ctx.glowLastFrame = ctx.currentFrame;
    ctx.hitRate = (ctx.hitRate ?? 0) + 50;
    ctx.aspdPct = (ctx.aspdPct ?? 0) + 100;
    ctx.ampr = (ctx.ampr ?? 0) + 5;
    console.log("✨ 灵光层数 +1 =>", ctx.glowStacks);
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
  `,

  灵光结束回复: `
function main() {
  const stacks = ctx.glowStacks ?? 0;
  const heal = (ctx.maxHp ?? 1000) * stacks * 0.05;
  ctx.statContainer.addModifier("hp.current", "STATIC_FIXED", heal, { id: "glow_heal" });
  ctx.glowStacks = 0;
  console.log("💚 灵光回复", heal, "stacks", stacks);
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
`,

  弧光剑舞: `
function main() {
  const stacks = ctx.glowStacks ?? 0;
  ctx.glowStacks = 0;
  ctx.statContainer.addModifier("hp.current", "STATIC_FIXED", (ctx.maxHp ?? 1000) * 0.35, { id: "arc_heal" });
  ctx.buffManager.addBuff({
    id: "arc-dance",
    name: "弧光剑舞",
    duration: stacks * 3000,
    startTime: Date.now(),
    source: "test",
    effects: [],
    variables: { stacks }
  });
  console.log("⚡ 弧光剑舞触发，持续(ms) =", stacks * 3000);
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
`,

  神速掌握叠层: `
function main() {
  if (ctx.speedStacks == null) ctx.speedStacks = 0;
  ctx.speedStacks = Math.min(3, ctx.speedStacks + 1);
  const s = ctx.speedStacks;
  ctx.aspdFlat = 400 * s;
  ctx.dodgeRegenPct = 0.1 * s;
  ctx.moveSpeedPct = 0.1 * s;
  ctx.physResPct = -25 * s;
  ctx.magResPct = -25 * s;
  ctx.mpMaxDelta = -100 * s;
  console.log("🏃 神速层数", s);
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
`,
};
