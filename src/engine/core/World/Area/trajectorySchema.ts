/**
 * 轨迹模板的 zod schema，供 BT/DSL 动作节点与区域动画编辑器复用。
 *
 * 注意：本文件只描述作者侧 `TrajectoryTemplate` 的输入形状；
 * 运行时序列化进 SAB 的是 `trajectory.ts` 中解析后的具体 `Trajectory`。
 */

import { z } from "zod/v4";

export const trajectoryVec3Schema = z
	.object({
		x: z.number().meta({ description: "X 坐标" }),
		y: z.number().meta({ description: "Y 坐标" }),
		z: z.number().meta({ description: "Z 坐标" }),
	})
	.meta({ description: "三维向量" });

export const trajectoryPositionSourceSchema = z
	.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("caster"),
			offset: trajectoryVec3Schema.optional().meta({ description: "相对施法者位置的偏移" }),
		}),
		z.object({
			kind: z.literal("target"),
			offset: trajectoryVec3Schema.optional().meta({ description: "相对目标位置的偏移" }),
		}),
		z.object({
			kind: z.literal("explicit"),
			point: trajectoryVec3Schema.meta({ description: "显式坐标" }),
		}),
	])
	.meta({ description: "位置来源：施法者 / 目标 / 显式坐标" });

export const trajectoryTemplateSchema = z
	.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("static"),
			center: trajectoryPositionSourceSchema,
			lifetimeMs: z.number().meta({ description: "持续时间（毫秒）" }),
		}),
		z.object({
			kind: z.literal("attach"),
			anchor: trajectoryPositionSourceSchema,
			lifetimeMs: z.number().meta({ description: "持续时间（毫秒）" }),
		}),
		z.object({
			kind: z.literal("segment"),
			from: trajectoryPositionSourceSchema,
			to: trajectoryPositionSourceSchema,
			speed: z.number().meta({ description: "路径速度（单位/秒）" }),
		}),
		z.object({
			kind: z.literal("ray"),
			from: trajectoryPositionSourceSchema,
			dir: z.union([trajectoryVec3Schema, z.literal("toTarget")]).meta({ description: "方向向量或 toTarget" }),
			speed: z.number().meta({ description: "路径速度（单位/秒）" }),
			maxDistance: z.number().meta({ description: "最大飞行距离" }),
		}),
		z.object({
			kind: z.literal("arc"),
			center: trajectoryPositionSourceSchema,
			normal: trajectoryVec3Schema,
			radius: z.number().meta({ description: "半径" }),
			startAngle: z.number().meta({ description: "起始角（弧度）" }),
			endAngle: z.number().meta({ description: "结束角（弧度）" }),
			speed: z.number().meta({ description: "路径速度（单位/秒）" }),
		}),
		z.object({
			kind: z.literal("spiral"),
			center: trajectoryPositionSourceSchema,
			normal: trajectoryVec3Schema,
			startAngle: z.number().meta({ description: "起始角（弧度）" }),
			startRadius: z.number().meta({ description: "起始半径" }),
			endRadius: z.number().meta({ description: "结束半径" }),
			radiusGrowthPerRadian: z.number().meta({ description: "每弧度半径增量" }),
			speed: z.number().meta({ description: "路径速度（单位/秒）" }),
		}),
	])
	.meta({ description: "区域轨迹模板" });

export const areaSpawnEntrySchema = z
	.object({
		delayMs: z.union([z.string(), z.number()]).default(0).meta({ description: "相对节点执行时间的延迟（毫秒）" }),
		targetMode: z
			.enum(["single", "area"])
			.default("area")
			.meta({ description: "目标检索模式：single 锁定节点目标，area 按形状范围检索" }),
		visualProfileId: z.string().optional().meta({ description: "视觉资源引用；缺省由区域类型决定" }),
		shape: z
			.object({
				kind: z.enum(["point", "circle", "rect"]).meta({ description: "形状：点 / 圆 / 矩形" }),
				radius: z.number().optional().meta({ description: "圆半径" }),
				width: z.number().optional().meta({ description: "矩形宽" }),
				height: z.number().optional().meta({ description: "矩形高" }),
			})
			.default({ kind: "circle", radius: 1 })
			.meta({ description: "区域形状" }),
		trajectory: trajectoryTemplateSchema,
	})
	.meta({ description: "单个伤害区域的生成计划项" });
