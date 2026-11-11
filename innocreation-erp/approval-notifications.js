const express=require('express');
const {accessFor}=require('./application-access');
const root="COALESCE((SELECT vl.voucher_id FROM raw_oil_voucher_lines vl WHERE vl.transaction_id=t.id),t.id)";
// Aggregate all voucher lines before applying recipient rules: one notification per voucher.
const oilSQL=`SELECT r.id,r.voucher,r.created_by,u.display_name entered_by,a.status adjustment_status,a.supervisor_by,
 v.status void_status,v.id void_id,v.requested_by,vu.display_name requester,
 (SELECT COUNT(*) FROM raw_oil_transactions t WHERE ${root}=r.id) item_count,
 (SELECT CAST(SUM(t.qty_grams) AS CHAR) FROM raw_oil_transactions t WHERE ${root}=r.id) total_qty
 FROM raw_oil_transactions r JOIN users u ON u.id=r.created_by
 LEFT JOIN raw_oil_adjustment_approvals a ON a.transaction_id=r.id
 LEFT JOIN raw_oil_void_requests v ON v.id=(SELECT MAX(v2.id) FROM raw_oil_void_requests v2 WHERE v2.transaction_id=r.id)
 LEFT JOIN users vu ON vu.id=v.requested_by
 WHERE NOT EXISTS(SELECT 1 FROM raw_oil_voucher_lines own WHERE own.transaction_id=r.id AND own.voucher_id<>r.id)
 AND (a.transaction_id IS NOT NULL OR v.id IS NOT NULL) ORDER BY r.id DESC`;
const fgSQL=`SELECT d.id,d.reference voucher,d.created_by,u.display_name entered_by,d.status,d.supervisor_by,
 (SELECT COUNT(*) FROM fg_lines l WHERE l.document_id=d.id) item_count,
 (SELECT CAST(SUM(l.qty) AS CHAR) FROM fg_lines l WHERE l.document_id=d.id) total_qty
 FROM fg_documents d JOIN users u ON u.id=d.created_by WHERE d.kind='TRANSFER' ORDER BY d.id DESC`;
const same=(a,b)=>String(a)===String(b);
function buildNotifications(oils,fgs,user){
 const out=[],supervisor=user.role==='warehouse_supervisor',accountant=user.role==='warehouse_accountant';
 function add(kind,row,status,pending,title,page,author,unit,version=''){
  out.push({key:`${kind}:${row.id}:${version?version+':':''}${status}`,id:String(row.id),voucher:row.voucher,author:author||'—',items:Number(row.item_count),total:String(row.total_qty||'0'),unit,title,page,pending,url:kind==='fg'?`/inventory/finished-goods/documents/${row.id}`:`/inventory/raw-oil/transactions/${row.id}`});
 }
 for(const r of oils){
  const s=r.adjustment_status;
  const actionable=!same(r.created_by,user.id)&&((supervisor&&s==='PENDING_SUPERVISOR')||(accountant&&s==='PENDING_ACCOUNTANT'&&!same(r.supervisor_by,user.id)));
  if(actionable)add('adjustment',r,s,true,'Adjustment အတည်ပြုရန်ရှိပါသည်','Raw Oil › Adjustment',r.entered_by,'g');
  else if(same(r.created_by,user.id)&&['APPROVED','REJECTED'].includes(s))add('adjustment',r,s,false,s==='APPROVED'?'Adjustment အတည်ပြုပြီးပါပြီ':'Adjustment ပယ်ချထားပါသည်','Raw Oil › Adjustment',r.entered_by,'g');
  if(accountant&&r.void_status==='PENDING'&&!same(r.requested_by,user.id))add('void',r,'PENDING',true,'Void Request အတည်ပြုရန်ရှိပါသည်','Raw Oil › Transaction',r.requester,'g',r.void_id);
  else if(['APPROVED','REJECTED'].includes(r.void_status)&&(same(r.requested_by,user.id)||same(r.created_by,user.id)))add('void',r,r.void_status,false,r.void_status==='APPROVED'?'Void Request အတည်ပြုပြီးပါပြီ':'Void Request ပယ်ချထားပါသည်','Raw Oil › Transaction',r.requester,'g',r.void_id);
 }
 for(const r of fgs){
  const pending=(supervisor&&r.status==='REQUESTED')||(accountant&&r.status==='SUPERVISOR_APPROVED'&&!same(r.supervisor_by,user.id));
  if(pending)add('fg',r,r.status,true,'FG Transfer အတည်ပြုရန်ရှိပါသည်','Finished Goods › Transfer Approval',r.entered_by,'pcs');
  else if(same(r.created_by,user.id)&&['POSTED','REJECTED'].includes(r.status))add('fg',r,r.status,false,r.status==='POSTED'?'FG Transfer အတည်ပြုပြီးပါပြီ':'FG Transfer ပယ်ချထားပါသည်','Finished Goods › Transfer Approval',r.entered_by,'pcs');
 }
 return out.sort((a,b)=>Number(b.pending)-Number(a.pending));
}
function createNotificationRouter({pool}){
 const router=express.Router();router.use(express.json({limit:'4kb'}));
 const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 async function current(req){
  const [rows]=await pool.execute('SELECT id,role,is_active,application_access FROM users WHERE id=? LIMIT 1',[req.session?.user?.id||0]);
  const user=rows[0];if(!user||Number(user.is_active)!==1||!accessFor(user).includes('inventory'))throw Object.assign(Error('Inventory access required'),{status:403});return user;
 }
 async function list(user){const [[oil],[fg]]=await Promise.all([pool.query(oilSQL),pool.query(fgSQL)]);return buildNotifications(oil,fg,user);}
 router.get('/',run(async(req,res)=>{
  const user=await current(req),items=await list(user);const [read]=await pool.execute('SELECT notification_key FROM erp_notification_reads WHERE user_id=?',[user.id]);const seen=new Set(read.map(r=>r.notification_key));
  items.forEach(n=>n.unread=!seen.has(n.key));res.set('Cache-Control','no-store').json({unread:items.filter(n=>n.unread).length,pending:items.filter(n=>n.pending).length,items});
 }));
 router.post('/read',run(async(req,res)=>{
  const user=await current(req);if(typeof req.body?._csrf!=='string'||req.body._csrf!==req.session.csrf)return res.status(403).json({error:'Form expired. Reload.'});
  const key=req.body.key;if(typeof key!=='string'||key.length>160)return res.status(400).json({error:'Invalid notification'});
  if(!(await list(user)).some(n=>n.key===key))return res.status(404).json({error:'Notification no longer available'});
  await pool.execute('INSERT IGNORE INTO erp_notification_reads (user_id,notification_key) VALUES (?,?)',[user.id,key]);res.json({ok:true});
 }));
 router.use((err,req,res,next)=>{console.error('Approval notifications:',err.code||err.message);res.status(err.status||503).json({error:err.status===403?'Inventory access required':'Notifications ကို ယခု မရယူနိုင်ပါ။ ပြန်စမ်းပါ။'});});return router;
}
module.exports={createNotificationRouter,buildNotifications,oilSQL,fgSQL};
