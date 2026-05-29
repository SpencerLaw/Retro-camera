import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Read the timetable file
const wb = XLSX.readFile('高二课程表3.5.xlsx');
console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Sheet: ${name} (${data.length} rows)`);
  
  for (let i = 0; i < data.length; i++) {
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
