/**
 * @file injectEnums.ts
 * @description 枚举注入脚本
 * 将 enums.ts 中的枚举定义合并到 Prisma schema 中
 */

import fs from 'fs';
import path from 'path';
import { EnumInjector } from './enumInjector';
import { SchemaCollector } from './utils/schemaCollector';
import { PATHS } from './config';

/**
 * 第一阶段：合并枚举生成临时 Prisma schema
 */
export async function injectEnumsToSchema(): Promise<string> {
  console.log('开始枚举注入流程...');
  
  try {
    // 1. 收集和合并 schema 文件
    const schemaCollector = new SchemaCollector();
    console.log('收集 schema 文件...');
    const mergedSchema = schemaCollector.collectAndMerge();
    
    // 2. 处理枚举
    const enumInjector = new EnumInjector();
    console.log('解析枚举定义...');
    enumInjector.processEnums();
    
    console.log('注入枚举定义...');
    const processedSchema = enumInjector.processSchema(mergedSchema);
    const finalSchema = enumInjector.injectEnumDefinitions(processedSchema);
    
    // 3. 写入临时 schema 文件
    console.log('写入临时 schema 文件...');
    const tempSchemaPath = schemaCollector.writeTempSchema(finalSchema, PATHS.tempSchema);
    
    console.log('枚举注入完成');
    return tempSchemaPath;
  } catch (error) {
    console.error('枚举注入失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
injectEnumsToSchema()
  .then((path) => {
    console.log(`临时 schema 文件: ${path}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });

