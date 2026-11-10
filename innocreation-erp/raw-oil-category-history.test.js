const test=require('node:test');
const assert=require('node:assert/strict');
const {loadHistoricalCategories}=require('./raw-oil-transaction-category');
test('history categories work across collations and preserve old and voided names',async()=>{
  const pool={query:async sql=>{
    if(/UNION/i.test(sql))throw Object.assign(new Error('Illegal mix of collations'),{code:'ER_CANT_AGGREGATE_NCOLLATIONS'});
    if(sql.includes('FROM raw_oil_transaction_categories'))return [[{name:'Adjustment'},{name:'Purchase'},{name:'Voided category'}]];
    assert.match(sql,/FROM raw_oil_transactions/);
    return [[{name:'Purchase'},{name:'Old renamed category'},{name:'ပြန်အပ်'}]];
  }};
  const result=await loadHistoricalCategories(pool);
  assert.equal(result.length,5);
  for(const name of ['Adjustment','Purchase','Voided category','Old renamed category','ပြန်အပ်'])assert.ok(result.includes(name));
});
test('history category database failures remain visible',async()=>{
  await assert.rejects(loadHistoricalCategories({query:async()=>{throw new Error('missing table');}}),/missing table/);
});
