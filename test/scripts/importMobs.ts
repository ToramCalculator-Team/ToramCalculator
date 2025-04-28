import { createMob, Mob } from "../../src/repositories/mob";import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../../src/repositories/database";
import { MobType, ElementType } from "../../db/kysely/enums";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);

async function main() {
  try {
    const csvPath = path.join(__dirname, "./mobs.csv");
    const csvData = fs.readFileSync(csvPath, "utf-8");
    const lines = csvData.split("\n");
    const headers = lines[0].split(",");

    const db = await getDB();

    // Skip header line and process each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",");
      const mobData: Mob["Insert"] = {
        id: "",
        name: values[headers.indexOf("name")],
        type: values[headers.indexOf("type")] as MobType,
        captureable: values[headers.indexOf("captureable")] === "t",
        baseLv: parseInt(values[headers.indexOf("baseLv")]) || 0,
        experience: parseInt(values[headers.indexOf("experience")]) || 0,
        partsExperience: parseInt(values[headers.indexOf("partExperience")]) || 0,
        initialElement: (values[headers.indexOf("initialElement")] as ElementType) || ElementType.Normal,
        radius: parseInt(values[headers.indexOf("radius")]) || 0,
        maxhp: parseInt(values[headers.indexOf("maxHp")]) || 0,
        physicalDefense: parseInt(values[headers.indexOf("physicalDefense")]) || 0,
        physicalResistance: parseInt(values[headers.indexOf("physicalResistance")]) || 0,
        magicalDefense: parseInt(values[headers.indexOf("magicalDefense")]) || 0,
        magicalResistance: parseInt(values[headers.indexOf("magicalResistance")]) || 0,
        criticalResistance: parseInt(values[headers.indexOf("criticalResistance")]) || 0,
        avoidance: parseInt(values[headers.indexOf("avoidance")]) || 0,
        dodge: parseInt(values[headers.indexOf("dodge")]) || 0,
        block: parseInt(values[headers.indexOf("block")]) || 0,
        normalAttackResistanceModifier: parseInt(values[headers.indexOf("normalAttackResistanceModifier")]) || 0,
        physicalAttackResistanceModifier: parseInt(values[headers.indexOf("physicalAttackResistanceModifier")]) || 0,
        magicalAttackResistanceModifier: parseInt(values[headers.indexOf("magicalAttackResistanceModifier")]) || 0,
        actions: JSON.parse(values[headers.indexOf("actions")] || "[]"),
        details: values[headers.indexOf("details")] || "",
        dataSources: values[headers.indexOf("dataSources")] || "",
        updatedByAccountId: values[headers.indexOf("updatedByAccountId")] || "",
        createdByAccountId: values[headers.indexOf("createdByAccountId")] || "",
        statisticId: "",
      };

      try {
        await db.transaction().execute(async (trx) => {
          await createMob(trx, mobData);
        });
        console.log(`Successfully created mob: ${mobData.name}`);
      } catch (error) {
        console.error(`Failed to create mob: ${mobData.name}`, error);
      }
    }

    console.log("All mobs imported successfully!");
  } catch (error) {
    console.error("Failed to import mobs:", error);
  }
}

main();
