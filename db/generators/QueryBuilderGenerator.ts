/**
 * QueryBuilder 生成器优化
 * 负责生成 QueryBuilder 的规则文件
 */

import { PATHS } from "./utils/config";
import { StringUtils, FileUtils, LogUtils } from "./utils/common";
import { TypeConverter, COMMON_OPERATORS } from "./utils/typeConverter";
import { SchemaParser } from "./utils/schemaParser";
import { EnumProcessor } from "./utils/enumProcessor";

interface EnumTypeToNameMap extends Map<string, string> {}

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
  isOptional: boolean;
  enumType?: string;
}

interface Model {
  name: string;
  fields: ModelField[];
}

export class QueryBuilderGenerator {
  static generate(updatedSchema: string, enumTypeToNameMap: EnumTypeToNameMap): void {
    // 解析 schema
    const models = SchemaParser.parseDetailedModels(updatedSchema);
    const schemaEnums = SchemaParser.parseEnums(updatedSchema);

    // 使用 schemaEnums 中的枚举信息
    const allEnums: Record<string, string[]> = {};
    for (const [enumName, enumValues] of Object.entries(schemaEnums)) {
      allEnums[enumName] = enumValues;
    }

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
    for (const [enumName, values] of Object.entries(allEnums)) {
      const pascalEnumName = StringUtils.toPascalCase(enumName);
      rulesContent += `export const ${pascalEnumName}Enum = [
  ${values.map((v) => `{ value: "${v}", label: "${v}" }`).join(",\n  ")}
];

`;
    }

    // 生成字段配置
    for (const model of models) {
      const modelName = StringUtils.toPascalCase(model.name);
      rulesContent += `export const ${modelName}Fields: Fields[] = [
  ${model.fields
    .map((field: any) => {
      const fieldName = StringUtils.toPascalCase(field.name);
      const label = StringUtils.generateLabel(field.name);
      const typeConfig = TypeConverter.prismaToQueryBuilder(field.type, field.isOptional) as any;

      // 检查是否是枚举字段
      let enumConfig = "";
      let valueEditorType = typeConfig.valueEditorType;
      let inputType = typeConfig.inputType;

      if (field.enumType) {
        // 使用已建立的枚举映射
        const enumName = enumTypeToNameMap.get(field.enumType);

        if (enumName && allEnums[enumName]) {
          enumConfig = `,\n    values: ${StringUtils.toPascalCase(enumName)}Enum`;
          // 枚举字段使用 radio 组件
          valueEditorType = "radio";
          inputType = "radio";
        }
      }

      // 根据字段类型优化配置
      let additionalConfig = "";
      if (typeConfig.comparator === "boolean") {
        // 布尔字段使用 checkbox
        valueEditorType = "checkbox";
        inputType = "checkbox";
      } else if (typeConfig.comparator === "date") {
        // 日期字段使用文本输入（库不支持 date 类型）
        valueEditorType = "text";
        inputType = "text";
      } else if (typeConfig.comparator === "number") {
        // 数字字段使用文本输入（库不支持 number 类型）
        valueEditorType = "text";
        inputType = "number";
      }

      return `{
    name: "${fieldName}",
    label: "${label}",
    placeholder: "请选择或输入${label.toLowerCase()}",
    id: "${field.name}",
    valueEditorType: "${valueEditorType}",
    inputType: "${inputType}",
    comparator: "${typeConfig.comparator}",
    operators: OPERATORS.${typeConfig.comparator},
    defaultOperator: "${typeConfig.operators[0].value}",
    defaultValue: ${field.isOptional ? "null" : '""'}${enumConfig}${additionalConfig}
  }`;
    })
    .join(",\n  ")}
];

`;
    }

    FileUtils.safeWriteFile(PATHS.queryBuilder.rules, rulesContent);
    LogUtils.logSuccess("QueryBuilder 生成完成");
  }
}

