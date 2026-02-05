/**
 * @file jsons.ts
 * @description Json 定义文件
 * 
 * 此文件主要用于定义数据库中出现的 Json 类型，生成器会将这里的内容补充到生成的zod/index.ts文件中。
 */
import { z } from "zod/v4";
import { MEMBER_TYPE } from "./enums";

export const EffectTreeSchema = z.object({
	// 行为树名称
	name: z.string(),
	// 行为树定义
	definition: z.string(),
	// 可调用函数集
	agent: z.string(),
	// 执行者类型
	memberType: z.enum(MEMBER_TYPE).default("Player"),
});
export type EffectTree = z.output<typeof EffectTreeSchema>;
