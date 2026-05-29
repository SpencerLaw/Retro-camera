import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
console.log('--- Sheets in Assignments Book ---');
console.log(wb.SheetNames);

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n================================================================`);
  console.log(`Sheet Name: "${name}" | Rows: ${data.length} | Columns: ${data[0]?.length || 0}`);
  
  // Find non-empty rows up to index 15
  let printedCount = 0;
  for (let r = 0; r < Math.min(data.length, 12); r++) {
    const row = data[r];
    // Filter out trailing empty strings for readability
    let lastNonEmptyIdx = -1;
    for (let c = row.length - 1; c >= 0; c--) {
      if (row[c] !== undefined && row[c] !== null && row[c].toString().trim() !== '') {
        lastNonEmptyIdx = c;
        break;
      }
    }
    if (lastNonEmptyIdx !== -1) {
      const cleanRow = row.slice(0, lastNonEmptyIdx + 1);
      console.log(`Row ${r}:`, JSON.stringify(cleanRow));
    }
  }
});

const wbT = XLSX.readFile('高二课程表3.5.xlsx');
console.log('\n--- Sheets in Grade 11 Timetable ---');
console.log(wbT.SheetNames);
wbT.SheetNames.forEach(name => {
  const ws = wbT.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`Sheet Name: "${name}" | Rows: ${data.length}`);
  // Inspect first 5 rows
  for (let r = 0; r < Math.min(data.length, 6); r++) {
    const row = data[r];
    let lastNonEmpty = -1;
    for (let c = row.length - 1; c >= 0; c--) {
      if (row[c] !== undefined && row[c] !== null && row[c].toString().trim() !== '') {
        lastNonEmpty = c;
        break;
      }
    }
    if (lastNonEmpty !== -1) {
      console.log(`Row ${r}:`, JSON.stringify(row.slice(0, lastNonEmpty + 1)));
    }
  }
});
