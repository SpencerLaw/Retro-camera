import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
console.log('Sheet names:', wb.SheetNames);
const ws = wb.Sheets['高二'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('高二 sheet rows:', data.length);
for (let i = 0; i < data.length; i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
