const {text,grams,checkTimeline}=require('./raw-oil-values');
const activeTransactions="NOT EXISTS (SELECT 1 FROM raw_oil_void_requests oil_void WHERE oil_void.transaction_id=raw_oil_transactions.id AND oil_void.status='APPROVED') AND NOT EXISTS (SELECT 1 FROM raw_oil_adjustment_approvals oil_adjustment WHERE oil_adjustment.transaction_id=raw_oil_transactions.id AND oil_adjustment.status<>'APPROVED')";
const statusLabel=s=>({POSTED:'Posted',VOID_PENDING:'Pending Void Approval',VOIDED:'Voided'}[s]||'Posted');
function createVoidService(pool){return {async act(actorId,transactionId,action,body={}){
 if(!['request','approve','reject'].includes(action)||!/^\d{1,20}$/.test(String(transactionId)))throw Object.assign(Error('Transaction မတွေ့ပါ။'),{status:404});
 const role=action==='request'?'warehouse_supervisor':'warehouse_accountant';
 const reason=action==='approve'?'':text(body.reason,'Void / Reject အကြောင်းရင်း',500);
 if(action!=='request'&&!/^\d{1,20}$/.test(String(body.request_id)))throw Object.assign(Error('Void request မတွေ့ပါ။'),{status:400});
 const [lookup]=await pool.execute('SELECT item_id FROM raw_oil_transactions WHERE id=?',[transactionId]);if(!lookup.length)throw Object.assign(Error('Transaction မတွေ့ပါ။'),{status:404});
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 const [actors]=await conn.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[actorId]);if(!actors[0]||actors[0].role!==role||Number(actors[0].is_active)!==1)throw Object.assign(Error('ဤလုပ်ဆောင်ချက်အတွက် သက်ဆိုင်ရာ Warehouse Role လိုအပ်ပါသည်။'),{status:403});
 const [items]=await conn.execute('SELECT * FROM raw_oil_items WHERE id=? FOR UPDATE',[lookup[0].item_id]);const item=items[0];if(!item)throw Error('Item မတွေ့ပါ။');
 const [transactions]=await conn.execute('SELECT *,DATE_FORMAT(transaction_date,\'%Y-%m-%d\') day FROM raw_oil_transactions WHERE id=? FOR UPDATE',[transactionId]);const tx=transactions[0];if(!tx)throw Error('Transaction မတွေ့ပါ။');
 const [approvals]=await conn.execute('SELECT status FROM raw_oil_adjustment_approvals WHERE transaction_id=?',[transactionId]);if(approvals.length&&approvals[0].status!=='APPROVED')throw Error('အတည်မပြုရသေးသော Adjustment ကို Void လုပ်၍မရပါ။');
 const [requests]=await conn.execute('SELECT * FROM raw_oil_void_requests WHERE transaction_id=? ORDER BY id DESC LIMIT 1 FOR UPDATE',[transactionId]);const request=requests[0];
 if(action==='request'){if(request?.status==='APPROVED')throw Error('ဤ Transaction သည် Void ဖြစ်ပြီးပါပြီ။');if(request?.status==='PENDING'){await conn.commit();return;}
 await conn.execute("INSERT INTO raw_oil_void_requests (transaction_id,status,reason,requested_by) VALUES (?,'PENDING',?,?)",[transactionId,reason,actorId]);
 }else{
 if(!request||String(request.id)!==String(body.request_id))throw Error('Request ပြောင်းလဲသွားပါသည်။ Reload လုပ်ပါ။');
 if(Number(request.requested_by)===Number(actorId))throw Object.assign(Error('မိမိတောင်းခံထားသော Void ကို မိမိအတည်ပြု / ပယ်ချ၍ မရပါ။'),{status:403});
 const decision=action==='approve'?'APPROVED':'REJECTED';if(request.status===decision){await conn.commit();return;}if(request.status!=='PENDING')throw Error('ဤ Request ကို ဆုံးဖြတ်ပြီးပါပြီ။');
 if(action==='approve'){
 if(item.opening_grams===null)throw Error('Opening Qty ကို အရင်သတ်မှတ်ပါ။');
 const [days]=await conn.execute("SELECT DATE_FORMAT(transaction_date,'%Y-%m-%d') day,SUM(CASE WHEN direction='IN' THEN qty_grams ELSE -qty_grams END) delta FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions+' GROUP BY transaction_date ORDER BY transaction_date',[item.id]);
 const closing=checkTimeline(String(item.opening_grams),days,tx.day,tx.direction==='IN'?'OUT':'IN',grams(String(tx.qty_grams)));
 if(closing>999999999999999n)throw Error('လက်ကျန်ပမာဏ ကန့်သတ်ချက်ကျော်နေပါသည်။');
 }
 await conn.execute('UPDATE raw_oil_void_requests SET status=?,decision_reason=?,decided_by=?,decided_at=CURRENT_TIMESTAMP WHERE id=? AND status=\'PENDING\'',[decision,reason,actorId,request.id]);
 }
 await conn.commit();
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
 }};}
module.exports={createVoidService,activeTransactions,statusLabel};
