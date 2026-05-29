import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    for (let c = 0; c < row.length; c++) {
      const val = row[c]?.toString();
      if (val && val.includes('程')) {
        console.log(`Match in Sheet [${name}] Row [${r}] Col [${c}]: ${val}`);
      }
    }
  }
}
