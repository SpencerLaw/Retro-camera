import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('高二课程表3.5.xlsx');
console.log('Sheet names:', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]]; // first sheet
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log('Data length:', data.length);
for (let i = 0; i < Math.min(data.length, 15); i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
