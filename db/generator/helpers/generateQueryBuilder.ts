/**
 * @file generateQueryBuilder.ts
 * @description QueryBuilder 规则生成器
 * 从 Prisma DMMF 生成 QueryBuilder 的规则文件
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";
import { NamingRules } from "../utils/namingRules";

interface FieldConfig {
  name: string;
  label: string;
  placeholder: string;
  id: string;
  valueEditorType: string;
  inputType: string;
  comparator: string;
  operators: any[];
  defaultOperator: string;
  defaultValue: string | null;
  values?: any[];
}

interface ModelField {
  name: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isEnum: boolean;
}

interface Model {
  name: string;
  fields: ModelField[];
}

/**
 * QueryBuilder 规则生成器
 */
export class QueryBuilderGenerator {
  private dmmf: DMMF.Document;
  private allModels: readonly DMMF.Model[] = []; // 包含中间表的完整模型列表

  constructor(dmmf: DMMF.Document, allModels: DMMF.Model[]) {
    this.dmmf = dmmf;
    this.allModels = allModels;
  }

  /**
   * 生成 QueryBuilder 规则
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("生成 QueryBuilder 规则...");
      
      const models = this.parseModelsFromDMMF();
      const enums = this.parseEnumsFromDMMF();
      const rulesContent = this.generateRulesContent(models, enums);
      
      writeFileSafely(outputPath, rulesContent);
      
      console.log("QueryBuilder 规则生成完成");
    } catch (error) {
      console.error("QueryBuilder 规则生成失败:", error);
      throw error;
    }
  }

  /**
   * 从 DMMF 解析模型
   */
  private parseModelsFromDMMF(): Model[] {
    return this.allModels.map((model: DMMF.Model) => ({
      name: model.name,
      fields: model.fields
        .filter((field: DMMF.Field) => field.kind === "scalar" || field.kind === "enum")
        .map((field: DMMF.Field) => ({
          name: field.name,
          type: field.type,
          isRequired: field.isRequired,
          isList: field.isList,
          isEnum: field.kind === "enum"
        }))
    }));
  }

  /**
   * 从 DMMF 解析枚举
   */
  private parseEnumsFromDMMF(): Record<string, string[]> {
    const enums: Record<string, string[]> = {};
    
    for (const enumModel of this.dmmf.datamodel.enums) {
      enums[enumModel.name] = enumModel.values.map((v: DMMF.EnumValue) => v.name);
    }
    
    return enums;
  }

  /**
   * 生成规则内容
   */
  private generateRulesContent(models: Model[], enums: Record<string, string[]>): string {
    let rulesContent = `// 由脚本自动生成，请勿手动修改
import { Fields } from "@query-builder/solid-query-builder";

// 通用操作符配置
export const OPERATORS = {
  string: [
    { name: "equals", label: "等于" },
    { name: "not_equals", label: "不等于" },
    { name: "contains", label: "包含" },
    { name: "not_contains", label: "不包含" },
    { name: "starts_with", label: "开始于" },
    { name: "ends_with", label: "结束于" },
    { name: "is_empty", label: "为空" },
    { name: "is_not_empty", label: "不为空" }
  ],
  number: [
    { name: "equals", label: "等于" },
    { name: "not_equals", label: "不等于" },
    { name: "greater_than", label: "大于" },
    { name: "greater_than_or_equal", label: "大于等于" },
    { name: "less_than", label: "小于" },
    { name: "less_than_or_equal", label: "小于等于" },
    { name: "is_empty", label: "为空" },
    { name: "is_not_empty", label: "不为空" }
  ],
  date: [
    { name: "equals", label: "等于" },
    { name: "not_equals", label: "不等于" },
    { name: "greater_than", label: "晚于" },
    { name: "greater_than_or_equal", label: "晚于等于" },
    { name: "less_than", label: "早于" },
    { name: "less_than_or_equal", label: "早于等于" },
    { name: "is_empty", label: "为空" },
    { name: "is_not_empty", label: "不为空" }
  ],
  boolean: [
    { name: "equals", label: "等于" },
    { name: "not_equals", label: "不等于" }
  ],
  enum: [
    { name: "equals", label: "等于" },
    { name: "not_equals", label: "不等于" },
    { name: "in", label: "在列表中" },
    { name: "not_in", label: "不在列表中" }
  ],
};

// 枚举值配置
`;

    // 生成枚举配置
    for (const [enumName, values] of Object.entries(enums)) {
      const pascalEnumName = NamingRules.TypeName(enumName);
      rulesContent += `export const ${pascalEnumName}Enum = [
  ${values.map(v => `{ label: "${v}", value: "${v}" }`).join(",\n  ")}
];

`;
    }

    // 生成字段配置
    rulesContent += "// 字段配置\nexport const FIELDS: Record<string, any> = {\n";

    for (const model of models) {
      const modelNameLower = NamingRules.ZodTypeName(model.name);
      rulesContent += `  ${modelNameLower}: {\n`;
      
      for (const field of model.fields) {
        const fieldConfig = this.generateFieldConfig(field, enums);
        rulesContent += `    ${field.name}: ${JSON.stringify(fieldConfig, null, 6)},\n`;
      }
      
      rulesContent += `  },\n`;
    }

    rulesContent += "};\n";

    return rulesContent;
  }

  /**
   * 生成字段配置
   */
  private generateFieldConfig(field: ModelField, enums: Record<string, string[]>): FieldConfig {
    const fieldConfig: FieldConfig = {
      name: field.name,
      label: this.generateLabel(field.name),
      placeholder: `请输入${this.generateLabel(field.name)}`,
      id: field.name,
      valueEditorType: this.getValueEditorType(field),
      inputType: this.getInputType(field),
      comparator: this.getComparator(field),
      operators: this.getOperators(field),
      defaultOperator: "equals",
      defaultValue: null,
    };

    // 如果是枚举字段，添加值选项
    if (field.isEnum && enums[field.type]) {
      fieldConfig.values = enums[field.type].map(value => ({
        label: value,
        value: value
      }));
    }

    return fieldConfig;
  }

  /**
   * 生成标签
   */
  private generateLabel(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * 获取值编辑器类型
   */
  private getValueEditorType(field: ModelField): string {
    if (field.isEnum) return "select";
    if (field.type === "Boolean") return "checkbox";
    if (field.type === "DateTime") return "date";
    if (field.type === "Int" || field.type === "Float") return "number";
    return "text";
  }

  /**
   * 获取输入类型
   */
  private getInputType(field: ModelField): string {
    if (field.type === "Int" || field.type === "Float") return "number";
    if (field.type === "DateTime") return "date";
    if (field.type === "Boolean") return "checkbox";
    return "text";
  }

  /**
   * 获取比较器
   */
  private getComparator(field: ModelField): string {
    if (field.isEnum) return "enum";
    if (field.type === "Boolean") return "boolean";
    if (field.type === "DateTime") return "date";
    if (field.type === "Int" || field.type === "Float") return "number";
    return "string";
  }

  /**
   * 获取操作符
   */
  private getOperators(field: ModelField): any[] {
    const comparator = this.getComparator(field);
    return [
      { name: "equals", label: "等于" },
      { name: "not_equals", label: "不等于" }
    ];
  }

}
