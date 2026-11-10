const {activeTransactions}=require('./raw-oil-void-service');
const {grams,checkTimeline}=require('./raw-oil-values');
async function approveAdjustment(pool,actorId,id,action){
 if(!/^\d{1,20}$/.test(String(id))||!['approve','reject'].includes(action))throw Error('Invalid adjustment');
 const [lookup]=await pool.execute('SELECT item_id FROM raw_oil_transactions WHERE id=?',[id]);if(!lookup.length)throw Error('Adjustment not found');
 const c=await pool.getConnection();try{await c.beginTransaction();
 const [users]=await c.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[actorId]);const actor=users[0];
 if(!actor||Number(actor.is_active)!==1||!['warehouse_supervisor','warehouse_accountant'].includes(actor.role))throw Object.assign(Error('Warehouse approval role required'),{status:403});
 const [items]=await c.execute('SELECT * FROM raw_oil_items WHERE id=? FOR UPDATE',[lookup[0].item_id]);
 const [rows]=await c.execute("SELECT t.*,DATE_FORMAT(t.transaction_date,'%Y-%m-%d') day,a.status approval_status,a.supervisor_by,a.accountant_by FROM raw_oil_transactions t JOIN raw_oil_adjustment_approvals a ON a.transaction_id=t.id WHERE t.id=? FOR UPDATE",[id]);const tx=rows[0];if(!tx)throw Error('Adjustment not found');
 const supervisor=actor.role==='warehouse_supervisor';
 const expected=supervisor?'PENDING_SUPERVISOR':'PENDING_ACCOUNTANT';
 if(tx.approval_status!==expected)throw Error('Approval အဆင့် ပြောင်းလဲသွားပါသည်။ Reload လုပ်ပါ။');
 if(Number(tx.created_by)===Number(actorId)||(!supervisor&&Number(tx.supervisor_by)===Number(actorId)))throw Object.assign(Error('မိမိဖန်တီးထားသော သို့မဟုတ် အတည်ပြုထားသော Adjustment ကို ထပ်မံအတည်ပြု၍မရပါ။'),{status:403});
 const next=action==='reject'?'REJECTED':supervisor?'PENDING_ACCOUNTANT':'APPROVED';
 if(next==='APPROVED'){
 const item=items[0];if(!item||item.opening_grams===null)throw Error('Opening balance required');
 const [days]=await c.execute("SELECT DATE_FORMAT(transaction_date,'%Y-%m-%d') day,SUM(CASE WHEN direction='IN' THEN qty_grams ELSE -qty_grams END) delta FROM raw_oil_transactions WHERE item_id=? AND "+activeTransactions+' GROUP BY transaction_date ORDER BY transaction_date',[item.id]);
 const closing=checkTimeline(String(item.opening_grams),days,tx.day,tx.direction,grams(String(tx.qty_grams)));if(closing>999999999999999n)throw Error('Balance limit exceeded');
 }
 const column=supervisor?'supervisor':'accountant';
 await c.execute(`UPDATE raw_oil_adjustment_approvals SET status=?,${column}_by=?,${column}_at=CURRENT_TIMESTAMP WHERE transaction_id=? AND status=?`,[next,actorId,id,expected]);
 await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
function installApprovalRoutes({router,pool,render,asyncRoute,csrf}){
 router.get('/adjustments',asyncRoute(async(req,res)=>{
 const pageNo=Math.min(1000000,Math.max(1,parseInt(req.query.p,10)||1));
 const [rows]=await pool.query("SELECT t.*,DATE_FORMAT(t.transaction_date,'%Y-%m-%d') day,i.code,i.name,p.name place,u.display_name entered_by,a.status approval_status,a.supervisor_by,a.supervisor_at,a.accountant_by,a.accountant_at,s.display_name supervisor_name,k.display_name accountant_name FROM raw_oil_adjustment_approvals a JOIN raw_oil_transactions t ON t.id=a.transaction_id JOIN raw_oil_items i ON i.id=t.item_id JOIN raw_oil_places p ON p.id=t.place_id JOIN users u ON u.id=t.created_by LEFT JOIN users s ON s.id=a.supervisor_by LEFT JOIN users k ON k.id=a.accountant_by ORDER BY t.id DESC LIMIT 50 OFFSET "+((pageNo-1)*50));
 const [counts]=await pool.query('SELECT COUNT(*) total FROM raw_oil_adjustment_approvals');
 render(req,res,'adjustments',{type:'approval-list',rows,total:Number(counts[0].total),pageNo,saved:req.query.saved==='1'||/^\d+$/.test(req.query.saved||''),error:''});
 }));
 router.post('/adjustments/:id/:action',csrf,asyncRoute(async(req,res)=>{
 try{await approveAdjustment(pool,req.session.user.id,req.params.id,req.params.action);res.redirect('/inventory/raw-oil/adjustments?saved=1');}catch(e){if(e.code)throw e;res.status(e.status||400).type('text').send(e.message);}
 }));
}
module.exports={approveAdjustment,installApprovalRoutes};
