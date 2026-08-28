import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const file = process.argv[2];
if (!file) {
  console.error("path required");
  process.exit(1);
}

const wb = XLSX.read(readFileSync(file), { type: "buffer" });
const sh = wb.Sheets[wb.SheetNames[0]];
const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sh, {
  header: 1,
  defval: "",
  raw: false,
}) as (string | number)[][];

console.log("sheet", wb.SheetNames[0], "rows", matrix.length);
for (let i = 0; i < Math.min(15, matrix.length); i++) {
  const row = matrix[i].map((c) => String(c).trim()).filter(Boolean);
  if (row.length) console.log(i, JSON.stringify(row));
}
