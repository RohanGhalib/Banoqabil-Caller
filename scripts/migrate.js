const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// 1. Read environmental variables manually from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index > 0) {
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      envConfig[key] = val;
    }
  });
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS during data migration
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Supabase URL or Service Role Key is missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Helper functions for parsing values
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  
  if (typeof val === 'number') {
    // Excel serial date number
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  
  // Try parsing date string like '29-Aug-2024'
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return null;
}

function formatDateForDb(dateObj) {
  if (!dateObj) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForExcel(dateObj) {
  if (!dateObj) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

async function run() {
  const excelFilePath = path.join(__dirname, '..', 'data.xlsx');
  if (!fs.existsSync(excelFilePath)) {
    console.error(`ERROR: Excel file not found at: ${excelFilePath}`);
    process.exit(1);
  }

  console.log('Reading Excel file...');
  const workbook = xlsx.readFile(excelFilePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  const headers = rows[0];
  console.log('Detected Headers:', headers);

  // Group rows by mobile number
  // Format of row: [S/No, Name, Mobile, Y/B, Joining Date, Zone, Address]
  const mobileGroups = {};
  let totalRecords = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    
    const sNo = r[0];
    const name = r[1] ? String(r[1]).trim() : '';
    const rawMobile = r[2];
    const yb = r[3];
    const rawDate = r[4];
    
    if (!rawMobile) continue; // Skip if no mobile number
    
    // Normalize mobile: remove dashes, spaces, non-digits
    const mobile = String(rawMobile).replace(/\D/g, '').trim();
    if (!mobile) continue;
    
    const parsedDate = parseDate(rawDate);
    const birthYear = yb ? parseInt(yb) : null;
    const age = birthYear ? (2026 - birthYear) : null;

    const record = {
      sNo,
      name,
      mobile,
      year_of_birth: birthYear,
      joining_date: parsedDate,
      age,
      original_row: r
    };

    if (!mobileGroups[mobile]) {
      mobileGroups[mobile] = [];
    }
    mobileGroups[mobile].push(record);
    totalRecords++;
  }

  console.log(`Successfully parsed ${totalRecords} records.`);

  const duplicatesList = [];
  const cleanedList = [];
  let duplicateMobileCount = 0;

  // Process groups to deduplicate and identify discrepancies
  for (const mobile in mobileGroups) {
    const group = mobileGroups[mobile];
    
    // Sort by joining date descending (most recent first)
    group.sort((a, b) => {
      if (!a.joining_date) return 1;
      if (!b.joining_date) return -1;
      return b.joining_date.getTime() - a.joining_date.getTime();
    });

    // Keep the first one as clean record
    cleanedList.push(group[0]);

    if (group.length > 1) {
      duplicateMobileCount++;
      // All items in the group are duplicates, add them to duplicates list
      group.forEach(item => {
        duplicatesList.push({
          ...item,
          duplicate_count: group.length
        });
      });
    }
  }

  console.log('--- Deduplication Summary ---');
  console.log(`Total parsed records: ${totalRecords}`);
  console.log(`Unique mobile numbers (Cleaned count): ${cleanedList.length}`);
  console.log(`Unique mobile numbers with duplicates: ${duplicateMobileCount}`);
  console.log(`Total duplicate rows (Discrepancies): ${duplicatesList.length}`);
  console.log('------------------------------');

  // 3. Write Excel File 1: Duplicates Only
  console.log('Generating duplicates.xlsx...');
  const dupSheetData = [
    ['S/No', 'Name', 'Mobile', 'Y/B', 'Age', 'Joining Date', 'Duplicate Occurrence Count']
  ];
  duplicatesList.forEach(d => {
    dupSheetData.push([
      d.sNo,
      d.name,
      d.mobile,
      d.year_of_birth,
      d.age,
      formatDateForExcel(d.joining_date),
      d.duplicate_count
    ]);
  });
  const dupWorkbook = xlsx.utils.book_new();
  const dupWorksheet = xlsx.utils.aoa_to_sheet(dupSheetData);
  xlsx.utils.book_append_sheet(dupWorkbook, dupWorksheet, 'Duplicates');
  xlsx.writeFile(dupWorkbook, path.join(__dirname, '..', 'duplicates.xlsx'));
  console.log('duplicates.xlsx saved successfully.');

  // 4. Write Excel File 2: Cleaned Data
  console.log('Generating cleaned.xlsx...');
  const cleanSheetData = [
    ['S/No', 'Name', 'Mobile', 'Y/B', 'Age', 'Joining Date', 'Address', 'Occupation']
  ];
  cleanedList.forEach((c, idx) => {
    cleanSheetData.push([
      idx + 1, // new serial no
      c.name,
      c.mobile,
      c.year_of_birth,
      c.age,
      formatDateForExcel(c.joining_date),
      '', // Address empty
      ''  // Occupation empty
    ]);
  });
  const cleanWorkbook = xlsx.utils.book_new();
  const cleanWorksheet = xlsx.utils.aoa_to_sheet(cleanSheetData);
  xlsx.utils.book_append_sheet(cleanWorkbook, cleanWorksheet, 'Cleaned Data');
  xlsx.writeFile(cleanWorkbook, path.join(__dirname, '..', 'cleaned.xlsx'));
  console.log('cleaned.xlsx saved successfully.');

  // 5. Migrate clean data to Supabase
  console.log('Uploading cleaned records to Supabase...');
  
  // Format for db insert
  const dbInsertRows = cleanedList.map(c => ({
    name: c.name,
    mobile: c.mobile,
    year_of_birth: c.year_of_birth,
    joining_date: formatDateForDb(c.joining_date),
    age: c.age,
    call_status: 'not_called',
    address: null,
    occupation: null
  }));

  // Batch insert
  const batchSize = 1000;
  let successCount = 0;

  for (let i = 0; i < dbInsertRows.length; i += batchSize) {
    const batch = dbInsertRows.slice(i, i + batchSize);
    console.log(`Uploading batch ${i / batchSize + 1} (${batch.length} records)...`);
    
    const { error } = await supabase
      .from('members')
      .upsert(batch, { onConflict: 'mobile' }); // Upsert in case script is re-run

    if (error) {
      console.error(`ERROR uploading batch starting at index ${i}:`, error.message);
      console.error('Full error details:', error);
      process.exit(1);
    }
    
    successCount += batch.length;
  }

  console.log(`Successfully migrated ${successCount} unique records to Supabase!`);
}

run().catch(err => {
  console.error('Fatal error during migration:', err);
});
