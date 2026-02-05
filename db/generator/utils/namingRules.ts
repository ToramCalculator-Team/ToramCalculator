/**
 * @file namingRules.ts
 * @description 统一的命名规范定义
 * 所有生成器必须使用这些规范来保证命名一致性
 */

/**
 * 命名规则类
 * 提供统一的命名转换方法
 * 基础转换方法是私有的，只通过具体的命名方法（TypeName、SchemaName 等）对外暴露
 */

// biome-ignore lint/complexity/noStaticOnlyClass: <NamingRules>
export class NamingRules {
	/**
	 * 将下划线命名转换为 PascalCase（私有方法）
	 * 例如: "user_post" -> "UserPost", "_user_post" -> "UserPost", "skill_variant" -> "SkillEffect"
	 */
	private static toPascalCase(name: string): string {
		return name
			.split("_")
			.filter((part) => part.length > 0)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
			.join("");
	}

	/**
	 * 转换为 camelCase（私有方法）
	 * 例如: "UserPost" -> "userPost", "skill_variant" -> "skillVariant"
	 */
	private static toCamelCase(name: string): string {
		const pascal = NamingRules.toPascalCase(name);
		return pascal.charAt(0).toLowerCase() + pascal.slice(1);
	}

	/**
	 * 转换为小写（私有方法）
	 * 例如: "UserPost" -> "userpost", "Skill_Effect" -> "skill_variant"
	 */
	private static toLowerCase(name: string): string {
		return name.toLowerCase();
	}

	/**
	 * 将 PascalCase 转换为 snake_case（私有方法）
	 * 例如: "CharacterSkill" -> "character_skill", "_AvatarToCharacter" -> "_avatar_to_character"
	 */
	private static toSnakeCase(name: string): string {
		if (!name) return name;

		// 检查是否有前缀下划线
		const hasPrefix = name.startsWith("_");
		const cleanName = hasPrefix ? name.slice(1) : name;

		// 转换：在词边界插入下划线，然后全部转小写
		const snakeCase = cleanName
			.replace(/([a-z])([A-Z])/g, "$1_$2") // userName -> user_Name
			.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2") // HTTPRequest -> HTTP_Request
			.toLowerCase();

		// 如果有前缀，添加回去
		return hasPrefix ? `_${snakeCase}` : snakeCase;
	}

	/**
	 * 类型名称（用于 TypeScript 类型）
	 * - 所有表名都转换为 PascalCase，去除下划线
	 * - 例如: "user" -> "User", "skill_variant" -> "SkillEffect", "_user_post" -> "UserPost"
	 */
	static TypeName(tableName: string, modelName?: string): string {
		const name = modelName || tableName;
		// 统一使用 toPascalCase，确保所有下划线都被转换为 PascalCase
		return NamingRules.toPascalCase(name);
	}

	/**
	 * Zod Schema 名称（PascalCase + Schema）
	 * - 使用大驼峰 + "Schema"
	 * - 例如: "user" -> "UserSchema", "skill_variant" -> "SkillEffectSchema", "_user_post" -> "UserPostSchema"
	 */
	static SchemaName(name: string): string {
		return `${NamingRules.toPascalCase(name)}Schema`;
	}

	/**
	 * 数据库表名（用于 SQL/Kysely）
	 * - 直接使用原始表名
	 * - 例如: "user" -> "user", "_user_post" -> "_user_post"
	 */
	static TableName(name: string): string {
		return name;
	}

	/**
	 * 数据库表名（snake_case，保留前缀下划线）
	 * - 将表名转换为 snake_case 格式，用于数据库表名引用
	 * - 例如: "User" -> "user", "_ArmorToCrystal" -> "_armor_to_crystal"
	 */
	static TableNameLowerCase(name: string): string {
		return NamingRules.toSnakeCase(name);
	}

	/**
	 * Prisma 模型名
	 * - 使用 modelName（如果提供），否则使用 tableName
	 * - 例如: "User" -> "User"
	 */
	static ModelName(tableName: string, modelName?: string): string {
		return modelName || tableName;
	}

	/**
	 * Zod 导出的中间类型名称（snake_case）
	 * - 用于从 Schema 导出的类型，之后会被转换成 Selectable/Insertable/Updateable
	 * - 例如: "user" -> "user", "_user_post" -> "user_post"
	 */
	static ZodTypeName(name: string): string {
		return NamingRules.toLowerCase(name);
	}

	/**
	 * 变量名（camelCase）
	 * - 例如: "UserPost" -> "userPost", "SkillEffect" -> "skillVariant"
	 */
	static VariableName(name: string): string {
		return NamingRules.toCamelCase(name);
	}

	/**
	 * 函数名（PascalCase，用于导出函数）
	 * - 例如: "user" -> "User", "skill_variant" -> "SkillEffect", "_user_post" -> "UserPost"
	 */
	static FunctionName(name: string): string {
		return NamingRules.TypeName(name);
	}

	/**
	 * 文件名（snake_case，带扩展名）
	 * - 例如: "User" -> "user.ts", "CharacterSkill" -> "character_skill.ts", "_ArmorToCrystal" -> "_armor_to_crystal.ts"
	 */
	static FileName(name: string): string {
		return `${NamingRules.toSnakeCase(name)}.ts`;
	}

	/**
	 * 判断是否为中间表
	 */
	static IsIntermediateTable(tableName: string): boolean {
		return tableName.startsWith("_");
	}
}
