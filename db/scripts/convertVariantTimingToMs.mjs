#!/usr/bin/env node
/**
 * Convert skill_variant.csv timing fields from seconds to milliseconds.
 * - Pure numbers: multiply by 1000
 * - Expressions: wrap as (expr)*1000
 * - If actionFixedMs AND actionModifiedMs are both 0 or empty: set actionFixedMs=1000
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, "../backups/skill_variant.csv");

const raw = readFileSync(csvPath, "utf-8");
const lines = raw.split("\n");
const header = lines[0];

// Timing column indices (0-based): 11-16
// 11: chantingFixedMs, 12: chantingModifiedMs
// 13: chargingFixedMs, 14: chargingModifiedMs
// 15: actionFixedMs,   16: actionModifiedMs
const TIMING_COLS = [11, 12, 13, 14, 15, 16];
const ACTION_FIXED_COL = 15;
const ACTION_MODIFIED_COL = 16;

function convertField(value) {
  if (!value || value.trim() === "") return "";
  const trimmed = value.trim();
  const num = Number(trimmed);
  if (Number.isFinite(num)) {
    return String(Math.round(num * 1000));
  }
  return `(${trimmed})*1000`;
}

// Parse CSV respecting quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

let converted = 0;
let defaulted = 0;
const output = [header];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) {
    output.push(line);
    continue;
  }
  const fields = parseCSVLine(line);

  // Convert timing fields from seconds to ms
  for (const col of TIMING_COLS) {
    if (fields[col] !== undefined && fields[col] !== "") {
      const before = fields[col];
      fields[col] = convertField(fields[col]);
      if (fields[col] !== before) converted++;
    }
  }

  // Enforce: actionFixedMs and actionModifiedMs cannot both be 0/empty
  const actionFixed = fields[ACTION_FIXED_COL] || "";
  const actionModified = fields[ACTION_MODIFIED_COL] || "";
  const actionFixedNum = Number(actionFixed);
  const actionModifiedNum = Number(actionModified);
  const bothZero =
    (actionFixed === "" || (Number.isFinite(actionFixedNum) && actionFixedNum === 0)) &&
    (actionModified === "" || (Number.isFinite(actionModifiedNum) && actionModifiedNum === 0));

  if (bothZero) {
    fields[ACTION_FIXED_COL] = "1000";
    defaulted++;
  }

  output.push(fields.join(","));
}

writeFileSync(csvPath, output.join("\n"), "utf-8");
console.log(`Done. Converted ${converted} fields. Defaulted ${defaulted} rows to actionFixedMs=1000.`);

