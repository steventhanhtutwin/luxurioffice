const {activeTransactions}=require('./raw-oil-void-service');
const {grams,decimal,date,text,balance,checkTimeline}=require('./raw-oil-values');
const {today,nextVoucher}=require('./raw-oil-numbering');
const {randomBytes}=require('node:crypto');
const {saveRawOilItem}=require('./raw-oil-item-service');
const aggregate=`SELECT item_id, SUM(CASE WHEN direction='IN' THEN qty_grams ELSE 0 END) stock_in, SUM(CASE WHEN direction='OUT' THEN qty_grams ELSE 0 END) stock_out FROM raw_oil_transactions WHERE ${activeTransactions} GROUP BY item_id`;
const summarySQL=`SELECT i.*,COALESCE(t.stock_in,0) stock_in,COALESCE(t.stock_out,0) stock_out,CASE WHEN i.opening_grams IS NULL THEN NULL ELSE i.opening_grams+COALESCE(t.stock_in,0)-COALESCE(t.stock_out,0) END closing_grams FROM raw_oil_items i LEFT JOIN (${aggregate}) t ON t.item_id=i.id`;
function createService(pool,{businessDate=today}={}){return {
 async getItem(code){const [rows]=await pool.execute(summarySQL+' WHERE i.code=?',[code]);return rows[0];},
 async postMovement(body,userId){
 const code=text(body.code,'Item Code',100), direction=body.direction;if(!['IN','OUT'].includes(direction))throw new Error('Invalid direction');
 const qty=grams(body.qty);let day,voucher;const remark=text(body.remark||'','Remark',500,false);
 if(!/^\d+$/.test(String(body.place_id)))throw new Error('From / To နေရာကို ရွေးပါ။');
 if(!/^[a-f0-9]{64}$/.test(body.request_key||''))throw new Error('Form expired. Reload and try again.');
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 // Item row is the lock shared by all movements and opening-balance edits.
 const [items]=await conn.execute('SELECT * FROM raw_oil_items WHERE code=? FOR UPDATE',[code]);const item=items[0];if(!item)throw new Error('Item Code မတွေ့ပါ။');
 const [existing]=await conn.execute('SELECT id FROM raw_oil_transactions WHERE request_key=?',[body.request_key]);if(existing.length){await conn.commit();return existing[0].id;}
 day=date(businessDate());
 if(item.opening_grams===null)throw new Error('အဖွင့်လက်ကျန်နှင့် စာရင်းစတင်ရက်ကို အရင်သတ်မှတ်ပါ။');
 const openingDate=String(item.opening_date).slice(0,10);if(day<openingDate)throw new Error('စာရင်းစတင်ရက်ထက် စောသော Transaction မထည့်နိုင်ပါ။');
 const [places]=await conn.execute('SELECT id FROM raw_oil_places WHERE id=?',[body.place_id]);if(!places.length)throw new Error('From / To နေရာကို ရွေးပါ။');
 const [totals]=await conn.execute("SELECT COALESCE(SUM(CASE WHEN direction='IN' THEN qty_grams ELSE 0 END),0) stock_in,COALESCE(SUM(CASE WHEN direction='OUT' THEN qty_grams ELSE 0 END),0) stock_out FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions,[item.id]);
 const current=balance(String(item.opening_grams),String(totals[0].stock_in),String(totals[0].stock_out));
 if(direction==='OUT'&&qty>current)throw new Error('Warehouse လက်ကျန်မလုံလောက်ပါ။');
 if(direction==='IN'&&current+qty>999999999999999n)throw new Error('လက်ကျန်ပမာဏ ကန့်သတ်ချက်ကျော်နေပါသည်။');
 // Enforce nonnegative stock at every effective date, including backdated entries.
 const [days]=await conn.execute("SELECT DATE_FORMAT(transaction_date,'%Y-%m-%d') day,SUM(CASE WHEN direction='IN' THEN qty_grams ELSE -qty_grams END) delta FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions+" GROUP BY transaction_date ORDER BY transaction_date",[item.id]);
 checkTimeline(String(item.opening_grams),days,day,direction,qty);
 voucher=await nextVoucher(conn,direction);
 const [result]=await conn.execute('INSERT INTO raw_oil_transactions (item_id,transaction_date,voucher,direction,place_id,qty_grams,remark,created_by,request_key) VALUES (?,?,?,?,?,?,?,?,?)',[item.id,day,voucher,direction,body.place_id,decimal(qty),remark,userId,body.request_key]);
 await conn.commit();return result.insertId;
 }catch(err){await conn.rollback();if(err.code==='ER_DUP_ENTRY'){const [rows]=await pool.execute('SELECT id FROM raw_oil_transactions WHERE request_key=?',[body.request_key]);if(rows.length)return rows[0].id;}throw err;}finally{conn.release();}
 },
 async saveItem(body,userId,id=null){return saveRawOilItem(pool,body,userId,id);}
};}
module.exports={createService,summarySQL,newKey:()=>randomBytes(32).toString('hex')};
