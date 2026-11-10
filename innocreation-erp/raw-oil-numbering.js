// Business date follows the existing ERP timezone, independent of the host OS.
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
async function nextInVoucher(conn){const [rows]=await conn.execute("SELECT next_value FROM raw_oil_sequences WHERE name='RAW_OIL_IN' FOR UPDATE");if(!rows.length)throw new Error('Raw Oil In numbering migration ကို အရင် Run ပါ။');const n=BigInt(rows[0].next_value);if(n<1n||n>=999999999999999999n)throw new Error('Voucher number limit reached');await conn.execute("UPDATE raw_oil_sequences SET next_value=? WHERE name='RAW_OIL_IN'",[(n+1n).toString()]);return 'ROI-'+n.toString().padStart(6,'0');}
module.exports={today,nextInVoucher};
