/**
 * QueryBuilder 生成器优化
 * 负责生成 QueryBuilder 的规则文件
 */

import { PATHS } from "../config/generator.config";
import { StringUtils, FileUtils, LogUtils } from "../utils/common";
import { TypeConverter, COMMON_OPERATORS } from "../utils/typeConverter";
import { EnumProcessor } from "../processors/EnumProcessor";

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

export class QueryBuilderGenerator {
  private dmmf: any;
  private enumProcessor: EnumProcessor;
  private allModels: any[]; // 包含所有表的完整模型列表

  constructor(dmmf: any, enumProcessor: EnumProcessor, allModels: any[] = []) {
    this.dmmf = dmmf;
    this.enumProcessor = enumProcessor;
    this.allModels = allModels.length > 0 ? allModels : dmmf.datamodel.models;
  }

  /**
   * 生成 QueryBuilder 规则
   */
  generate(): void {
    LogUtils.logInfo("解析 schema...");
    const models = this.parseModelsFromDMMF();
    const enums = this.parseEnumsFromDMMF();

    LogUtils.logInfo("生成规则内容...");
    const rulesContent = this.generateRulesContent(models, enums);

    LogUtils.logInfo("写入文件...");
    FileUtils.safeWriteFile(PATHS.queryBuilder.rules, rulesContent);
    
  }

  /**
   * 从 DMMF 解析模型
   */
  private parseModelsFromDMMF(): Model[] {
    return this.dmmf.datamodel.models.map((model: any) => ({
      name: model.name,
      fields: model.fields
        .filter((field: any) => field.kind === "scalar" || field.kind === "enum")
        .map((field: any) => ({
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
      enums[enumModel.name] = enumModel.values.map((v: any) => v.name);
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
  string: ${JSON.stringify(COMMON_OPERATORS.string, null, 2)},
  number: ${JSON.stringify(COMMON_OPERATORS.number, null, 2)},
  date: ${JSON.stringify(COMMON_OPERATORS.date, null, 2)},
  boolean: ${JSON.stringify(COMMON_OPERATORS.boolean, null, 2)},
  enum: ${JSON.stringify(COMMON_OPERATORS.enum, null, 2)},
};

// 枚举值配置
`;

    // 生成枚举配置
    for (const [enumName, values] of Object.entries(enums)) {
      const pascalEnumName = StringUtils.toPascalCase(enumName);
      rulesContent += `export const ${pascalEnumName}Enum = [
  ${values.map(v => `{ label: "${v}", value: "${v}" }`).join(",\n  ")}
];

`;
    }

    // 生成字段配置
    rulesContent += "// 字段配置\nexport const FIELDS: Record<string, any> = {\n";

    for (const model of models) {
      const modelNameLower = model.name.toLowerCase();
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
      label: StringUtils.generateLabel(field.name),
      placeholder: `请输入${StringUtils.generateLabel(field.name)}`,
      id: field.name,
      valueEditorType: "text",
      inputType: "text",
      comparator: "=",
      operators: [],
      defaultOperator: "=",
      defaultValue: null
    };

    // 根据字段类型设置配置
    if (field.isEnum) {
      fieldConfig.valueEditorType = "select";
      fieldConfig.inputType = "select";
      fieldConfig.operators = [...COMMON_OPERATORS.enum] as any[];
      fieldConfig.defaultOperator = "=";
      fieldConfig.values = enums[field.type]?.map(v => ({ label: v, value: v })) || [];
    } else {
      const typeConfig = TypeConverter.prismaToQueryBuilder(field.type);
      fieldConfig.valueEditorType = typeConfig.valueEditorType;
      fieldConfig.inputType = typeConfig.inputType;
      fieldConfig.operators = [...typeConfig.operators] as any[];
      fieldConfig.defaultOperator = "=";
    }

    return fieldConfig;
  }
}