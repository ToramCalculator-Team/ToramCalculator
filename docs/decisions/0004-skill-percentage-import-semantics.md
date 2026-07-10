# 0004 - 技能 Behavior Tree 导入中的百分比修正语义

- **状态**: Proposed
- **日期**: 2026-05-28
- **决策层**: 跨层
- **相关代码**: `db/scripts/importToramSkillVariants.mjs`、`src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`、`src/lib/engine/core/World/Member/attachments/RuntimeAttachment.ts`
- **相关 ADR**: 0001、0002

## 背景

外部技能资料中的部分属性修正带有 `extra === "%"`。该标记可能表示“对基础值施加百分比修正”，也可能只是该属性本身以百分数计量。批量导入行为树前，需要确定默认映射规则。

## 候选方案

### A. `%` 统一映射为 STATIC_PERCENTAGE

- 优点：规则简单，与现有 modifier DSL 直觉一致，便于先打通导入链路。
- 缺点：对 `noBaseValue` 属性可能产生语义偏差。

### B. 根据目标属性的 noBaseValue 选择通道

- 优点：更贴近 `StatContainer` 的计算语义。
- 缺点：导入器需要依赖属性元数据，尚未验证资料源是否稳定表达这种差异。

### C. 为每个外部属性维护显式通道映射

- 优点：最精确，可覆盖特殊项。
- 缺点：维护成本高，统一规则会散落到映射表中。

## 决议

暂定选 A：**`extra === "%"` 的导入项统一写入 `STATIC_PERCENTAGE`，数值不缩放；其他项写入 `STATIC_FIXED`。**

该规则只约束外部技能资料到行为树/RuntimeAttachment 的机械导入，不改变手写 DSL 和运行时 API。导入报告必须能单独识别所有百分比项，以便后续抽样验证。

## 代价

- `noBaseValue` 属性可能被放入不合适的修正通道。
- 资料源若混用“数值单位”和“修正类型”，单一规则无法区分。
- 规则调整后需要重新生成相关行为树数据。

出现可复现计算偏差，或百分比项大量命中 `noBaseValue` 属性时，应重新比较 B/C 并用新 ADR 取代本条。

## 影响范围

- 技能资料导入器必须遵守统一的百分比映射语义。
- `StatContainer` 运行时语义不因本决议改变。
- 技能导入的阶段、任务和验收不属于本 ADR。

## 参考

- ADR 0001：StatContainer 作为持久化槽的统一载体
- ADR 0002：RuntimeAttachment 战前装配契约
