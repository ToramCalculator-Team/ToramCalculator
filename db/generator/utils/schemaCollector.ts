/**
 * @file schemaCollector.ts
 * @description Schema 收集器
 * 负责递归扫描和合并 Prisma schema 文件
 */

import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../config";

/**
 * Schema 收集器类
 * 负责收集和合并分散的 Prisma schema 文件
 */
export class SchemaCollector {
  private readonly schemaDir: string;
  private readonly modelsDir: string;
  private readonly outputDir: string;

  constructor() {
    this.schemaDir = PATHS.mainSchema;
    this.modelsDir = PATHS.schemaFolder;
    this.outputDir = PATHS.generatedFolder;
  }

  /**
   * 收集并合并所有 schema 文件
   * @returns 合并后的完整 schema 内容
   */
  collectAndMerge(): string {
    console.log("🔍 开始收集 schema 文件...");

    // 1. 收集所有模型文件
    const modelFiles = this.collectModelFiles();
    console.log(`✅ 收集到 ${modelFiles.length} 个模型文件`);

    // 2. 读取并合并模型内容
    const fullSchema = this.readModelFiles(modelFiles);
    console.log("✅ 合并模型文件完成");

    return fullSchema;
  }

  /**
   * 递归收集所有模型文件
   */
  private collectModelFiles(): string[] {
    const modelFiles: string[] = [];

    if (!fs.existsSync(this.modelsDir)) {
      console.log("⚠️  模型目录不存在，跳过模型文件收集");
      return modelFiles;
    }

    this.scanDirectory(this.modelsDir, modelFiles);
    return modelFiles;
  }

  /**
   * 递归扫描目录，收集 .prisma 文件
   */
  private scanDirectory(dir: string, files: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        this.scanDirectory(fullPath, files);
      } else if (entry.isFile() && entry.name.endsWith(".prisma")) {
        // 收集 .prisma 文件
        files.push(fullPath);
        console.log(`📄 发现模型文件: ${path.relative(this.schemaDir, fullPath)}`);
      }
    }
  }

  /**
   * 读取所有模型文件内容
   */
  private readModelFiles(files: string[]): string {
    let content = "";

    for (const file of files) {
      const fileContent = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(this.schemaDir, file);
      
      // 添加文件注释
      content += `\n// ===== ${relativePath} =====\n`;
      content += fileContent;
      content += "\n";
    }

    return content;
  }

  /**
   * 将合并后的 schema 写入临时文件
   * @param schemaContent 完整的 schema 内容
   */
  writeTempSchema(schemaContent: string, outputPath?: string): string {
    const tempSchemaPath = outputPath || path.join(this.outputDir, "schema.prisma");
    
    // 确保输出目录存在
    const outputDir = path.dirname(tempSchemaPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(tempSchemaPath, schemaContent, "utf-8");
    
    console.log(`📝 临时 schema 文件已写入: ${path.relative(process.cwd(), tempSchemaPath)}`);
    return tempSchemaPath;
  }

  /**
   * 读取临时 schema 文件
   */
  readTempSchema(tempSchemaPath: string): string {
    if (!fs.existsSync(tempSchemaPath)) {
      throw new Error(`临时 schema 文件不存在: ${tempSchemaPath}`);
    }
    
    return fs.readFileSync(tempSchemaPath, "utf-8");
  }

  /**
   * 清理临时 schema 文件
   */
  cleanupTempSchema(): void {
    const tempSchemaPath = path.join(this.outputDir, "schema.prisma");
    
    if (fs.existsSync(tempSchemaPath)) {
      fs.unlinkSync(tempSchemaPath);
      console.log("🗑️  临时 schema 文件已清理");
    }
  }
}
