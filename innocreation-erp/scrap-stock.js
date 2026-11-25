const {fail,scaled,dec}=require('./purchasing-values');
const {activeTransactions}=require('./raw-oil-void-service');
// Caller owns one transaction and locks the scrap record before calling this adapter.
async function postScrap(c,r,u,now){const amount=scaled(String(r.qty)),remark=(r.scrap_no+' · '+r.reason+' · '+r.remark).slice(0,500);
 if(['raw-materials','operational-supplies'].includes(r.source_type)){
 const table=r.source_type==='raw-materials'?'purchase_materials':'inventory_operational_supplies';const [items]=await c.execute('SELECT * FROM '+table+' WHERE id=? FOR UPDATE',[r.item_id]);const item=items[0];if(!item||item.stock_qty==null)throw fail('Opening Stock အရင်သတ်မှတ်ပါ။',409);const balance=scaled(String(item.stock_qty))-amount;if(balance<0n)throw fail('လက်ကျန်ထက် ပိုမို Scrap လုပ်၍မရပါ။',409);
 const [movement]=await c.execute('INSERT INTO inventory_stock_movements(request_key,source_type,item_id,direction,qty,balance_before,balance_after,remark,actor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[r.request_key,r.source_type,r.item_id,'OUT',r.qty,item.stock_qty,dec(balance),remark,u.id,now.stamp]);await c.execute('UPDATE '+table+' SET stock_qty=? WHERE id=?',[dec(balance),r.item_id]);if(r.source_type==='raw-materials')await c.execute('INSERT INTO purchase_material_ledger(material_id,grn_id,type,qty,balance_after,reference,note,actor_id,created_at) VALUES(?,NULL,?,?,?,?,?,?,?)',[r.item_id,'OUT',r.qty,dec(balance),r.scrap_no,remark,u.id,now.stamp]);return 'INV-'+movement.insertId;
 }
 if(r.source_type==='finished-goods'){
 const [items]=await c.execute('SELECT id FROM fg_items WHERE id=? FOR UPDATE',[r.item_id]);if(!items.length)throw fail('Item not found',404);
 const [places]=await c.execute("SELECT id,name,type FROM fg_locations WHERE name='Scrap Disposal' AND type='EXTERNAL'");let to=places[0];if(!to){const [out]=await c.execute("INSERT INTO fg_locations(name,type) VALUES('Scrap Disposal','EXTERNAL')");to={id:out.insertId,type:'EXTERNAL'};}
 const [out]=await c.execute("INSERT INTO fg_documents(kind,status,doc_date,reference,from_id,to_id,remark,request_key,created_by,supervisor_by,final_by,supervisor_at,final_at) VALUES('OUT','POSTED',?,?,?,?,?,?,?,?,?,?,?)",[now.day,r.scrap_no,r.warehouse_id,to.id,remark,r.request_key,r.created_by,r.supervisor_by,u.id,r.supervisor_at,now.stamp]);await c.execute('INSERT INTO fg_lines(document_id,item_id,qty) VALUES(?,?,?)',[out.insertId,r.item_id,dec(amount).split('.')[0]]);
 await require('./fg-service').balances(c,[{item_id:r.item_id,qty:dec(amount).split('.')[0]}],{id:r.warehouse_id},to,now.day,false,out.insertId);return 'FG-'+out.insertId;
 }
 if(r.source_type==='raw-oil'){
 const [items]=await c.execute('SELECT * FROM raw_oil_items WHERE id=? FOR UPDATE',[r.item_id]);const item=items[0];if(!item||item.opening_grams==null)throw fail('Opening Stock အရင်သတ်မှတ်ပါ။',409);if(now.day<String(item.opening_date).slice(0,10))throw fail('Opening date မရောက်သေးပါ။',409);
 const [days]=await c.execute("SELECT DATE_FORMAT(transaction_date,'%Y-%m-%d') day,SUM(CASE WHEN direction='IN' THEN qty_grams ELSE -qty_grams END) delta FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions+' GROUP BY transaction_date ORDER BY transaction_date',[r.item_id]);require('./raw-oil-values').checkTimeline(String(item.opening_grams),days,now.day,'OUT',amount);
 const [places]=await c.execute("SELECT id FROM raw_oil_places WHERE name='Scrap Disposal'");let place=places[0];if(!place){const [out]=await c.execute("INSERT INTO raw_oil_places(name) VALUES('Scrap Disposal')");place={id:out.insertId};}const voucher=await require('./raw-oil-numbering').nextVoucher(c,'OUT');const [out]=await c.execute('INSERT INTO raw_oil_transactions(item_id,transaction_date,voucher,direction,place_id,qty_grams,remark,created_by,request_key,transaction_category,transaction_time) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[r.item_id,now.day,voucher,'OUT',place.id,r.qty,remark,u.id,r.request_key,'Scrap',now.time]);await c.execute('INSERT INTO raw_oil_voucher_lines(transaction_id,voucher_id) VALUES(?,?)',[out.insertId,out.insertId]);return voucher;
 }
 throw fail('Unsupported item type');
}
module.exports={postScrap};
