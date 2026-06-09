const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data.xlsx');
console.log('Reading file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Headers:', jsonData[0]);
  
  let addressCount = 0;
  let zoneCount = 0;
  let sampleAddresses = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row[5] !== undefined && String(row[5]).trim() !== '') {
      zoneCount++;
    }
    if (row[6] !== undefined && String(row[6]).trim() !== '') {
      addressCount++;
      if (sampleAddresses.length < 5) {
        sampleAddresses.push({ row: i, val: row[6], name: row[1] });
      }
    }
  }
  
  console.log('Total Rows:', jsonData.length - 1);
  console.log('Rows with Zone data:', zoneCount);
  console.log('Rows with Address data:', addressCount);
  console.log('Sample Addresses:', sampleAddresses);
} catch (error) {
  console.error('Error reading excel file:', error);
}
