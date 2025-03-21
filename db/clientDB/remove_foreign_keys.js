import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ddlFilePath = path.join(__dirname, "ddl.sql");

// 读取文件内容
let ddlContent = fs.readFileSync(ddlFilePath, "utf-8");

// 删除所有 `ALTER TABLE` 语句中涉及 `FOREIGN KEY` 的行
ddlContent = ddlContent.replace(/ALTER TABLE .* FOREIGN KEY.*;\n?/g, "");

// **删除孤立的 `-- AddForeignKey` 行**
ddlContent = ddlContent.replace(/-- AddForeignKey\s*\n?/g, "");

// **去除可能多余的空行**
ddlContent = ddlContent.replace(/\n{2,}/g, "\n");

fs.writeFileSync(ddlFilePath, ddlContent, "utf-8");

console.log("✅ 外键约束及无用 `-- AddForeignKey` 标记已删除！");
