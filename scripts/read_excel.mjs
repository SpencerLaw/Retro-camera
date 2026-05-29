import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try to load xlsx
let XLSX;
try {
  XLSX = require('xlsx');
} catch(e) {
  // If xlsx not available, use a simple approach
  console.log("xlsx module not found, trying alternative...");
  process.exit(1);
}

const files = [
  '2026春各年级分工表（3.1）.xlsx',
  '高二课程表3.5.xlsx'
];

for (const file of files) {
  try {
    const wb = XLSX.readFile(file);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FILE: ${file}`);
    console.log(`Sheet names: ${wb.SheetNames.join(', ')}`);
    
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      console.log(`\n--- Sheet: ${name} (${data.length} rows) ---`);
      
      // Print all rows (up to 80)
      const maxRows = Math.min(data.length, 80);
      for (let i = 0; i < maxRows; i++) {
        console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
      }
      if (data.length > 80) {
        console.log(`... (${data.length - 80} more rows)`);
      }
    }
  } catch(err) {
    console.log(`Error reading ${file}: ${err.message}`);
  }
}
