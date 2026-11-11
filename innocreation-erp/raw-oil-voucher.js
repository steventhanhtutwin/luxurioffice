// Explicit membership keeps old, unrelated vouchers separate even if old references repeat.
async function voucherIds(pool,id){const [rows]=await pool.execute('SELECT transaction_id FROM raw_oil_voucher_lines WHERE voucher_id=COALESCE((SELECT voucher_id FROM raw_oil_voucher_lines WHERE transaction_id=?),?) ORDER BY transaction_id',[id,id]);return rows.length?rows.map(r=>r.transaction_id):[id];}
async function voucherRows(pool,id){const ids=await voucherIds(pool,id);const {transactionSelect}=require('./raw-oil-filters');const [rows]=await pool.execute(transactionSelect+' WHERE t.id IN ('+ids.map(()=>'?').join(',')+') ORDER BY t.id',ids);return rows;}
async function actOnVoucher(pool,actorId,id,fn){
 const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[actorId]);
 const ids=await voucherIds(c,id);
 const [items]=await c.execute('SELECT DISTINCT item_id FROM raw_oil_transactions WHERE id IN ('+ids.map(()=>'?').join(',')+') ORDER BY item_id',ids);
 for(const item of items)await c.execute('SELECT id FROM raw_oil_items WHERE id=? FOR UPDATE',[item.item_id]);
 await c.execute('SELECT id FROM raw_oil_transactions WHERE id IN ('+ids.map(()=>'?').join(',')+') ORDER BY id FOR UPDATE',ids);
 const scoped={execute:(...args)=>c.execute(...args),getConnection:async()=>({execute:(...args)=>c.execute(...args),beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}})};
 await fn(scoped,ids);await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
module.exports={voucherIds,voucherRows,actOnVoucher};
