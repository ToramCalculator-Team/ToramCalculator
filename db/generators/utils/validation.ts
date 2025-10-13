/**
 * @file utils/validation.ts
 * @description 验证工具函数 - 基础验证功能
 * @version 2.0.0
 */

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: string;
  message: string;
  context: any;
  severity: 'error' | 'warning';
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  code: string;
  message: string;
  context: any;
}

/**
 * 验证工具类
 */
export class ValidationUtils {
  /**
   * 验证 Schema
   */
  static validateSchema(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!schema) {
      errors.push({
        code: 'MISSING_SCHEMA',
        message: 'Schema is required',
        context: null,
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // 验证模型
    if (schema.models) {
      this.validateModels(schema.models, errors, warnings);
    }

    // 验证枚举
    if (schema.enums) {
      this.validateEnums(schema.enums, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证模型
   */
  static validateModel(model: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!model) {
      errors.push({
        code: 'MISSING_MODEL',
        message: 'Model is required',
        context: null,
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    if (!model.name) {
      errors.push({
        code: 'MISSING_MODEL_NAME',
        message: 'Model name is required',
        context: { model },
        severity: 'error'
      });
    }

    if (!model.fields || !Array.isArray(model.fields)) {
      errors.push({
        code: 'MISSING_MODEL_FIELDS',
        message: 'Model fields are required',
        context: { model: model.name },
        severity: 'error'
      });
    } else {
      this.validateModelFields(model, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证模型列表
   */
  private static validateModels(models: any[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const modelNames = new Set<string>();

    for (const model of models) {
      // 检查重复模型名
      if (modelNames.has(model.name)) {
        errors.push({
          code: 'DUPLICATE_MODEL',
          message: `Duplicate model name: ${model.name}`,
          context: { model: model.name },
          severity: 'error'
        });
      }
      modelNames.add(model.name);

      // 验证单个模型
      const modelValidation = this.validateModel(model);
      errors.push(...modelValidation.errors);
      warnings.push(...modelValidation.warnings);
    }
  }

  /**
   * 验证模型字段
   */
  private static validateModelFields(model: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const fieldNames = new Set<string>();
    let hasPrimaryKey = false;

    for (const field of model.fields) {
      // 检查重复字段名
      if (fieldNames.has(field.name)) {
        errors.push({
          code: 'DUPLICATE_FIELD',
          message: `Duplicate field name: ${field.name} in model ${model.name}`,
          context: { model: model.name, field: field.name },
          severity: 'error'
        });
      }
      fieldNames.add(field.name);

      // 检查主键
      if (field.isId) {
        if (hasPrimaryKey) {
          errors.push({
            code: 'MULTIPLE_PRIMARY_KEYS',
            message: `Multiple primary keys in model ${model.name}`,
            context: { model: model.name },
            severity: 'error'
          });
        }
        hasPrimaryKey = true;
      }

      // 检查关系字段
      if (field.kind === 'object') {
        this.validateRelationField(field, model, errors, warnings);
      }
    }

    // 检查是否有主键
    if (!hasPrimaryKey) {
      warnings.push({
        code: 'NO_PRIMARY_KEY',
        message: `Model ${model.name} has no primary key`,
        context: { model: model.name }
      });
    }
  }

  /**
   * 验证关系字段
   */
  private static validateRelationField(field: any, model: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // 检查关系字段的完整性
    if (field.isList && !field.relationName && !field.relationFromFields) {
      warnings.push({
        code: 'IMPLICIT_RELATION',
        message: `Implicit relation detected: ${field.name} in model ${model.name}`,
        context: { model: model.name, field: field.name }
      });
    }

    // 检查外键字段
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      const foreignKeyField = model.fields.find((f: any) => f.name === field.relationFromFields[0]);
      if (!foreignKeyField) {
        errors.push({
          code: 'MISSING_FOREIGN_KEY',
          message: `Foreign key field ${field.relationFromFields[0]} not found in model ${model.name}`,
          context: { model: model.name, field: field.name, foreignKey: field.relationFromFields[0] },
          severity: 'error'
        });
      }
    }
  }

  /**
   * 验证枚举
   */
  private static validateEnums(enums: any[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const enumNames = new Set<string>();

    for (const enumItem of enums) {
      if (enumNames.has(enumItem.name)) {
        errors.push({
          code: 'DUPLICATE_ENUM',
          message: `Duplicate enum name: ${enumItem.name}`,
          context: { enum: enumItem.name },
          severity: 'error'
        });
      }
      enumNames.add(enumItem.name);

      // 检查枚举值
      const values = new Set<string>();
      for (const value of enumItem.values) {
        if (values.has(value)) {
          errors.push({
            code: 'DUPLICATE_ENUM_VALUE',
            message: `Duplicate enum value: ${value} in enum ${enumItem.name}`,
            context: { enum: enumItem.name, value },
            severity: 'error'
          });
        }
        values.add(value);
      }
    }
  }

  /**
   * 验证生成上下文
   */
  static validateGenerationContext(context: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!context) {
      errors.push({
        code: 'MISSING_CONTEXT',
        message: 'Generation context is required',
        context: null,
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    if (!context.model) {
      errors.push({
        code: 'MISSING_MODEL_IN_CONTEXT',
        message: 'Model is required in generation context',
        context,
        severity: 'error'
      });
    }

    if (!context.analysis) {
      errors.push({
        code: 'MISSING_ANALYSIS_IN_CONTEXT',
        message: 'Model analysis is required in generation context',
        context,
        severity: 'error'
      });
    }

    if (!context.config) {
      errors.push({
        code: 'MISSING_CONFIG_IN_CONTEXT',
        message: 'Config is required in generation context',
        context,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证文件路径
   */
  static validateFilePath(filePath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!filePath) {
      errors.push({
        code: 'MISSING_FILE_PATH',
        message: 'File path is required',
        context: null,
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    if (!filePath.endsWith('.ts')) {
      warnings.push({
        code: 'NON_TYPESCRIPT_FILE',
        message: 'File path does not end with .ts',
        context: { filePath }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 格式化验证结果
   */
  static formatValidationResult(result: ValidationResult): string {
    const lines: string[] = [];

    if (result.errors.length > 0) {
      lines.push('Errors:');
      for (const error of result.errors) {
        lines.push(`  [${error.severity.toUpperCase()}] ${error.code}: ${error.message}`);
        if (error.context) {
          lines.push(`    Context: ${JSON.stringify(error.context)}`);
        }
      }
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of result.warnings) {
        lines.push(`  [WARNING] ${warning.code}: ${warning.message}`);
        if (warning.context) {
          lines.push(`    Context: ${JSON.stringify(warning.context)}`);
        }
      }
    }

    return lines.join('\n');
  }
}
