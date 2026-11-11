const {transactionCategory,selectedTransactionCategory}=require('./raw-oil-transaction-category');
const {activeTransactions}=require('./raw-oil-void-service');
const {grams,decimal,date,text,balance,checkTimeline}=require('./raw-oil-values');
const {today,nextVoucher}=require('./raw-oil-numbering');
const {randomBytes}=require('node:crypto');
const {saveRawOilItem}=require('./raw-oil-item-service');
const aggregate=`SELECT item_id, SUM(CASE WHEN direction='IN' THEN qty_grams ELSE 0 END) stock_in, SUM(CASE WHEN direction='OUT' THEN qty_grams ELSE 0 END) stock_out FROM raw_oil_transactions WHERE ${activeTransactions} GROUP BY item_id`;
const summarySQL=`SELECT i.*,COALESCE(t.stock_in,0) stock_in,COALESCE(t.stock_out,0) stock_out,CASE WHEN i.opening_grams IS NULL THEN NULL ELSE i.opening_grams+COALESCE(t.stock_in,0)-COALESCE(t.stock_out,0) END closing_grams FROM raw_oil_items i LEFT JOIN (${aggregate}) t ON t.item_id=i.id`;
function createService(pool,{businessDate=today}={}){return {
 async getItem(code){const [rows]=await pool.execute(summarySQL+' WHERE i.code=?',[code]);return rows[0];},
 async postMovements(body,userId){
 if(!Array.isArray(body.items)||!body.items.length||body.items.length>50)throw new Error('Item 1 မှ 50 အထိ ထည့်ပါ။');
 if(!/^[a-f0-9]{64}$/.test(body.request_key||''))throw new Error('Form expired. Reload and try again.');
 const codes=body.items.map(row=>text(row.code,'Item Code',100));
 const conn=await pool.getConnection();
 try{await conn.beginTransaction();
 // All rows use one transaction; deterministic item locks avoid opposing batch deadlocks.
 await conn.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[userId]);
 for(const code of [...new Set(codes)].sort())await conn.execute('SELECT id FROM raw_oil_items WHERE code=? FOR UPDATE',[code]);
 const scoped={execute:(...args)=>conn.execute(...args),getConnection:async()=>({execute:(...args)=>conn.execute(...args),beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}})};
 const batchDate=businessDate();const service=createService(scoped,{businessDate:()=>batchDate}),ids=[],pendingTotals=new Map();
 // Retry the original submission without allocating another number.
 const firstKey=require('node:crypto').createHash('sha256').update(body.request_key+':0').digest('hex');
 const [saved]=await conn.execute('SELECT id FROM raw_oil_transactions WHERE request_key=?',[firstKey]);
 if(saved.length){await conn.commit();return saved[0].id;}
 if(!['IN','OUT'].includes(body.direction))throw Error('Invalid direction');
 const sharedVoucher=await nextVoucher(conn,body.direction);
 for(let index=0;index<body.items.length;index++){
 const request_key=require('node:crypto').createHash('sha256').update(body.request_key+':'+index).digest('hex');
 ids.push(await service.postMovement({...body,code:body.items[index].code,qty:body.items[index].qty,remark:body.items[index].remark,request_key},userId,sharedVoucher,pendingTotals));
 }
 for(const id of ids)await conn.execute('INSERT INTO raw_oil_voucher_lines (transaction_id,voucher_id) VALUES (?,?)',[id,ids[0]]);
 await conn.commit();return ids[0];
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
 },
 async postMovement(body,userId,sharedVoucher=null,pendingTotals=null){
 const code=text(body.code,'Item Code',100), direction=body.direction;if(!['IN','OUT'].includes(direction))throw new Error('Invalid direction');
 let category=transactionCategory(body.transaction_category);const qty=grams(body.qty);let day,voucher;const remark=text(body.remark||'','Remark',500,false);
 if(category.toLowerCase()!=='adjustment'&&!/^\d+$/.test(String(body.place_id)))throw new Error('From / To နေရာကို ရွေးပါ။');
 if(!/^[a-f0-9]{64}$/.test(body.request_key||''))throw new Error('Form expired. Reload and try again.');
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 const [actors]=await conn.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[userId]);const actor=actors[0];
 if(!actor||Number(actor.is_active)!==1||actor.role==='warehouse_accountant')throw Object.assign(new Error('Warehouse Accountant သည် Raw Oil Stock In / Out ထည့်ခွင့်မရှိပါ။ Approval သာ လုပ်ဆောင်နိုင်ပါသည်။'),{status:403});
 category=await selectedTransactionCategory(conn,category);
 if(category.toLowerCase()==='adjustment'){
 await conn.execute("INSERT IGNORE INTO raw_oil_places (name) VALUES ('Main Warehouse')");
 const [main]=await conn.execute("SELECT id FROM raw_oil_places WHERE name='Main Warehouse' LIMIT 1");
 body={...body,place_id:main[0].id};
 }
 // Item row is the lock shared by all movements and opening-balance edits.
 const [items]=await conn.execute('SELECT * FROM raw_oil_items WHERE code=? FOR UPDATE',[code]);const item=items[0];if(!item)throw new Error('Item Code မတွေ့ပါ။');
 const [existing]=await conn.execute('SELECT id FROM raw_oil_transactions WHERE request_key=?',[body.request_key]);if(existing.length){await conn.commit();return existing[0].id;}
 day=date(businessDate());
 if(item.opening_grams===null)throw new Error('အဖွင့်လက်ကျန်နှင့် စာရင်းစတင်ရက်ကို အရင်သတ်မှတ်ပါ။');
 const openingDate=String(item.opening_date).slice(0,10);if(day<openingDate)throw new Error('စာရင်းစတင်ရက်ထက် စောသော Transaction မထည့်နိုင်ပါ။');
 const [places]=await conn.execute('SELECT id FROM raw_oil_places WHERE id=?',[body.place_id]);if(!places.length)throw new Error('From / To နေရာကို ရွေးပါ။');
 const [totals]=await conn.execute("SELECT COALESCE(SUM(CASE WHEN direction='IN' THEN qty_grams ELSE 0 END),0) stock_in,COALESCE(SUM(CASE WHEN direction='OUT' THEN qty_grams ELSE 0 END),0) stock_out FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions,[item.id]);
 const current=balance(String(item.opening_grams),String(totals[0].stock_in),String(totals[0].stock_out));
 const effectiveQty=qty+(category.toLowerCase()==='adjustment'&&pendingTotals?(pendingTotals.get(String(item.id))||0n):0n);
 if(direction==='OUT'&&effectiveQty>current)throw new Error('Main Warehouse လက်ကျန်မလုံလောက်ပါ။');
 if(direction==='IN'&&current+effectiveQty>999999999999999n)throw new Error('လက်ကျန်ပမာဏ ကန့်သတ်ချက်ကျော်နေပါသည်။');
 // Enforce nonnegative stock at every effective date, including backdated entries.
 const [days]=await conn.execute("SELECT DATE_FORMAT(transaction_date,'%Y-%m-%d') day,SUM(CASE WHEN direction='IN' THEN qty_grams ELSE -qty_grams END) delta FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions+" GROUP BY transaction_date ORDER BY transaction_date",[item.id]);
 checkTimeline(String(item.opening_grams),days,day,direction,effectiveQty);
 voucher=sharedVoucher||await nextVoucher(conn,direction);
 const [result]=await conn.execute('INSERT INTO raw_oil_transactions (item_id,transaction_date,voucher,direction,place_id,qty_grams,remark,created_by,request_key,transaction_category) VALUES (?,?,?,?,?,?,?,?,?,?)',[item.id,day,voucher,direction,body.place_id,decimal(qty),remark,userId,body.request_key,category]);
 if(category.toLowerCase()==='adjustment'){
 if(pendingTotals)pendingTotals.set(String(item.id),effectiveQty);
 if(actor.role==='warehouse_supervisor')await conn.execute("INSERT INTO raw_oil_adjustment_approvals (transaction_id,status,supervisor_by,supervisor_at) VALUES (?,'PENDING_ACCOUNTANT',?,CURRENT_TIMESTAMP)",[result.insertId,userId]);
 else await conn.execute("INSERT INTO raw_oil_adjustment_approvals (transaction_id,status) VALUES (?,'PENDING_SUPERVISOR')",[result.insertId]);
 }
 await conn.commit();return result.insertId;
 }catch(err){await conn.rollback();if(err.code==='ER_DUP_ENTRY'){const [rows]=await pool.execute('SELECT id FROM raw_oil_transactions WHERE request_key=?',[body.request_key]);if(rows.length)return rows[0].id;}throw err;}finally{conn.release();}
 },
 async saveItem(body,userId,id=null){return saveRawOilItem(pool,body,userId,id);}
};}
module.exports={createService,summarySQL,newKey:()=>randomBytes(32).toString('hex')};
