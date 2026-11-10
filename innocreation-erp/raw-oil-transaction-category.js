// Seed values remain available for setup/tests; live forms load the database master.
const transactionCategories=Object.freeze(['Purchase','Return','Adjustment']);
function transactionCategory(value){if(typeof value!=='string'||!value.trim()||value.trim().length>100||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Transaction Category ကို အများဆုံး ၁၀၀ လုံး ဖြည့်ပါ။');return value.trim();}
async function loadTransactionCategories(pool){const [rows]=await pool.query('SELECT name FROM raw_oil_transaction_categories WHERE is_active=1 ORDER BY name');return rows.map(row=>row.name);}
async function selectedTransactionCategory(conn,value){const name=transactionCategory(value);const [rows]=await conn.execute('SELECT name FROM raw_oil_transaction_categories WHERE name=? AND is_active=1 FOR UPDATE',[name]);if(!rows.length)throw new Error('Transaction Category ကို Settings တွင် ဖန်တီးထားသော စာရင်းထဲမှ ရွေးပါ။');return rows[0].name;}
// Read each text column separately: UNION fails when older installations use
// different collations for the category master and transaction snapshots.
async function loadHistoricalCategories(pool){
  const results=await Promise.all([
    pool.query('SELECT name FROM raw_oil_transaction_categories'),
    pool.query("SELECT DISTINCT transaction_category AS name FROM raw_oil_transactions WHERE transaction_category IS NOT NULL AND transaction_category<>''")
  ]);
  return [...new Set(results.flatMap(([rows])=>rows.map(row=>row.name)).filter(name=>typeof name==='string'&&name.length))]
    .sort((a,b)=>a.localeCompare(b,'en'));
}
module.exports={loadHistoricalCategories,transactionCategories,transactionCategory,loadTransactionCategories,selectedTransactionCategory};
