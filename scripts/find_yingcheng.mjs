import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('高二课程表3.5.xlsx');
const ws = wb.Sheets['3.2定稿'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

for (let r = 0; r < data.length; r++) {
  const row = data[r];
  for (let c = 0; c < row.length; c++) {
    if (row[c]?.toString().includes('英程')) {
      console.log(`Found 英程 at Row ${r}, Col ${c}: ${row[c]}`);
    }
  }
}
