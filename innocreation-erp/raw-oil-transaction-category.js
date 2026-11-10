// Seed values remain available for setup/tests; live forms load the database master.
const transactionCategories=Object.freeze(['Purchase','Return','Adjustment']);
function transactionCategory(value){if(typeof value!=='string'||!value.trim()||value.trim().length>100||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Transaction Category ကို အများဆုံး ၁၀၀ လုံး ဖြည့်ပါ။');return value.trim();}
async function loadTransactionCategories(pool){const [rows]=await pool.query('SELECT name FROM raw_oil_transaction_categories ORDER BY name');return rows.map(row=>row.name);}
async function selectedTransactionCategory(conn,value){const name=transactionCategory(value);const [rows]=await conn.execute('SELECT name FROM raw_oil_transaction_categories WHERE name=?',[name]);if(!rows.length)throw new Error('Transaction Category ကို Settings တွင် ဖန်တီးထားသော စာရင်းထဲမှ ရွေးပါ။');return rows[0].name;}
module.exports={transactionCategories,transactionCategory,loadTransactionCategories,selectedTransactionCategory};
