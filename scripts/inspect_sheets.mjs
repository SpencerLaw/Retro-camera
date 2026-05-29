import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('高二课程表3.5.xlsx');
console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n================================================================================`);
  console.log(`Sheet: ${name} (${data.length} rows)`);
  
  // Print first 30 rows
  const maxRows = Math.min(data.length, 30);
  for (let i = 0; i < maxRows; i++) {
    const row = data[i];
    console.log(`Row ${i}: ${JSON.stringify(row)}`);
  }
}
