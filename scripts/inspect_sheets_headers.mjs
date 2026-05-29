import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n==================== Sheet: ${name} ====================`);
  
  // Print first 8 rows, but trim empty trailing cells in each row
  for (let i = 0; i < Math.min(data.length, 8); i++) {
    const row = data[i];
    let lastNonEmpty = -1;
    for (let j = 0; j < row.length; j++) {
      if (row[j] !== '') lastNonEmpty = j;
    }
    const trimmed = row.slice(0, lastNonEmpty + 1);
    if (trimmed.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(trimmed));
    }
  }
}
