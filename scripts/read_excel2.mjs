import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Sheet: ${name} (${data.length} rows)`);
  
  const maxRows = Math.min(data.length, 100);
  for (let i = 0; i < maxRows; i++) {
    // Filter out empty trailing cells
    const row = data[i];
    const trimmed = [];
    let lastNonEmpty = -1;
    for (let j = 0; j < row.length; j++) {
      if (row[j] !== '') lastNonEmpty = j;
    }
    for (let j = 0; j <= lastNonEmpty; j++) {
      trimmed.push(row[j]);
    }
    if (trimmed.length > 0) {
      console.log(`Row ${i}: ${JSON.stringify(trimmed)}`);
    }
  }
}
