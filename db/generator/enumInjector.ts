/**
 * @file enumInjector.ts
 * @description 枚举注入器
 * 负责处理 Prisma schema 中的枚举定义和映射
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import { PATHS } from "./config";

const require = createRequire(import.meta.url);

/**
 * 枚举注入器类
 * 负责解析 enums.ts 文件，处理 schema 中的枚举字段，建立类型映射
 */
export class EnumInjector {
	private extractedEnums: Map<string, string[]>;
	private enumDefinitions: Map<string, string>;
	private enumTypeToNameMap: Map<string, string>;

	constructor() {
		this.extractedEnums = new Map();
		this.enumDefinitions = new Map();
		this.enumTypeToNameMap = new Map();
	}

	/**
	 * 处理枚举定义
	 * 从 enums.ts 文件中提取所有枚举值
	 */
	processEnums(): this {
		try {
			console.log("开始解析枚举文件...");

			// 获取 enums.ts 文件路径
			const enumsPath = PATHS.enums;

			if (!fs.existsSync(enumsPath)) {
				console.warn("⚠️  枚举文件不存在，跳过枚举处理");
				return this;
			}

			// 直接导入 enums.ts 模块，让 JS 引擎处理所有展开操作符
			const enumsModule = require(enumsPath);

			// 处理所有导出的枚举
			for (const [key, value] of Object.entries(enumsModule)) {
				// 跳过类型定义（以 Type 结尾的）
				if (key.endsWith("Type")) {
					continue;
				}

				const enumName = this.toPascalCase(key);

				if (Array.isArray(value)) {
					this.extractedEnums.set(enumName, value);
					this.enumTypeToNameMap.set(`${enumName}Type`, enumName);
				}
			}

			console.log(`成功解析 ${this.extractedEnums.size} 个枚举`);

			return this;
		} catch (error) {
			console.error("枚举处理失败:", error);
			throw error;
		}
	}

	/**
	 * 处理 Schema
	 * 将枚举定义注入到 Prisma schema 中，并替换字段类型
	 */
	processSchema(schemaContent: string): string {
		console.log("开始注入枚举定义并替换字段类型...");

		// 生成枚举定义并存储到实例变量中
		this.enumDefinitions = this.generateEnumDefinitions();

		// 处理 Schema 内容，替换枚举字段类型
		const updatedSchema = this.replaceEnumFieldTypes(schemaContent);

		console.log("Schema 处理完成");

		return updatedSchema;
	}

	/**
	 * 替换 Schema 中的枚举字段类型
	 */
	private replaceEnumFieldTypes(schemaContent: string): string {
		const lines = schemaContent.split("\n");
		let updatedSchema = "";
		let currentModel = "";

		for (const line of lines) {
			const trimmed = line.trim();

			// 处理模型定义
			const modelMatch = trimmed.match(/^model (\w+) \{$/);
			if (modelMatch) {
				currentModel = modelMatch[1];
				updatedSchema += `${line}\n`;
				continue;
			}

			// 处理模型结束
			if (trimmed === "}") {
				currentModel = "";
				updatedSchema += `${line}\n`;
				continue;
			}

			// 处理枚举字段
			let newLine = line;
			const enumMatch = line.match(/(\w+)\s+\w+\s+\/\/ Enum (\w+)/);
			if (enumMatch && currentModel) {
				// 从第2组开始提取枚举名
				const [,, originalEnumName] = enumMatch;
				const pascalCaseEnum = this.toPascalCase(originalEnumName);

				if (this.extractedEnums.has(pascalCaseEnum)) {
					newLine = line.replace("String", pascalCaseEnum);

					// 建立枚举类型名到枚举名的映射
					this.enumTypeToNameMap.set(originalEnumName, pascalCaseEnum);
				}
			}

			updatedSchema += `${newLine}\n`;
		}

		return updatedSchema;
	}

	/**
	 * 生成枚举定义
	 */
	private generateEnumDefinitions(): Map<string, string> {
		const enumDefinitions = new Map();

		for (const [enumName, values] of this.extractedEnums) {
			const enumDefinition = `enum ${enumName} {
  ${values.map((value) => `  ${value}`).join("\n")}
}`;
			enumDefinitions.set(enumName, enumDefinition);
		}

		return enumDefinitions;
	}

	/**
	 * 将字符串转换为 PascalCase
	 */
	private toPascalCase(str: string): string {
		return str
			.split(/[-_\s]+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("");
	}

	/**
	 * 获取提取的枚举
	 */
	getExtractedEnums(): Map<string, string[]> {
		return this.extractedEnums;
	}

	/**
	 * 获取枚举定义
	 */
	getEnumDefinitions(): Map<string, string> {
		return this.enumDefinitions;
	}

	/**
	 * 获取枚举类型到名称的映射
	 */
	getEnumTypeToNameMap(): Map<string, string> {
		return this.enumTypeToNameMap;
	}

	/**
	 * 将枚举定义添加到 schema 内容中
	 */
	injectEnumDefinitions(schemaContent: string): string {
		const enumDefinitions = Array.from(this.enumDefinitions.values()).join("\n\n");
		return `${schemaContent}\n\n${enumDefinitions}`;
	}
}
