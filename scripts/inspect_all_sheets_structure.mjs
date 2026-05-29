import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\nSheet: ${name} (${data.length} rows)`);
  if (data.length > 2) {
    console.log(`Row 2 (Header):`, JSON.stringify(data[2]));
    // Print first class row
    console.log(`Row 3 (First Class):`, JSON.stringify(data[3]));
  }
}
