// The existing sequence table provides a shared transaction lock for item creation.
async function nextItemCode(conn){
 await conn.execute("INSERT IGNORE INTO raw_oil_sequences (name,next_value) VALUES ('RAW_OIL_ITEM_CODE',1)");
 const [sequence]=await conn.execute("SELECT next_value FROM raw_oil_sequences WHERE name='RAW_OIL_ITEM_CODE' FOR UPDATE");
 const [items]=await conn.execute("SELECT code FROM raw_oil_items WHERE code REGEXP '^[0-9]+$' ORDER BY LENGTH(TRIM(LEADING '0' FROM code)) DESC, TRIM(LEADING '0' FROM code) DESC LIMIT 1");
 const latest=items.length?BigInt(items[0].code):0n;
 const next=BigInt(sequence[0].next_value)>latest?BigInt(sequence[0].next_value):latest+1n;
 if(next<1n||next>=999999999999999999n)throw Error('Item Code number limit reached');
 await conn.execute("UPDATE raw_oil_sequences SET next_value=? WHERE name='RAW_OIL_ITEM_CODE'",[(next+1n).toString()]);
 return next.toString();
}
module.exports={nextItemCode};
