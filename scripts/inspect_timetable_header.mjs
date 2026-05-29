import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('高二课程表3.5.xlsx');
const ws = wb.Sheets['高二课程表'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

for (let i = 0; i < 15; i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
