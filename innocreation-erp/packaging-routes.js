const express=require('express');
const {accessFor}=require('./application-access');
function quantity(value){if(typeof value!=='string'||!/^\d{1,12}(?:\.\d{1,3})?$/.test(value))throw Object.assign(Error('Qty ကို အနုတ်မဟုတ်သော ကိန်းဂဏန်း၊ ဒဿမ ၃ နေရာအထိ ဖြည့်ပါ။'),{status:400});const [w,f='']=value.split('.');return BigInt(w)*1000n+BigInt(f.padEnd(3,'0'));}
function formatQuantity(value){const n=quantity(String(value));const whole=(n/1000n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');const f=(n%1000n).toString().padStart(3,'0').replace(/0+$/,'');return whole+(f?'.'+f:'');}
function createPackagingRouter({pool}){
 const router=express.Router();const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 async function actor(db,id,lock=false){const [rows]=await db.execute('SELECT id,is_active,application_access FROM users WHERE id=?'+(lock?' FOR UPDATE':''),[id]);const u=rows[0];if(!u||Number(u.is_active)!==1||!accessFor(u).includes('packaging'))throw Object.assign(Error('Packaging အသုံးပြုခွင့် မရှိပါ။'),{status:403});return u;}
 router.use(run(async(req,res,next)=>{if(!req.session?.user)return res.redirect('/login');await actor(pool,req.session.user.id);next();}));
 router.get('/',(req,res)=>res.redirect('/packaging/operation/material-requirement'));
 router.use(require('./stock-requisition-routes').createRequisitionRouter({pool,packaging:true}));
 router.use(require('./packaging-requirement-routes').createRequirementRouter({pool}));
 const planned={record:'record',qc:'qc','warehouse/out':'stock-out'};
 for(const [url,page] of Object.entries(planned))router.get('/'+url,(req,res)=>res.render('packaging/workspace',{user:req.session.user,packagingPage:page}));
 router.get('/warehouse/:id/ledger',run(async(req,res)=>{
 if(!/^\d{1,10}$/.test(req.params.id))return res.status(404).json({error:'Item not found'});
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 const [items]=await conn.query(require('./packaging-requirements').stockSQL);const item=items.find(i=>String(i.id)===req.params.id);if(!item){await conn.rollback();return res.status(404).json({error:'Item not found'});}
 const [opening]=await conn.execute('SELECT h.*,u.display_name actor_name FROM packaging_opening_history h LEFT JOIN users u ON u.id=h.actor_id WHERE h.item_id=? ORDER BY h.changed_at,h.id',[item.id]);
 const [receipts]=await conn.execute("SELECT d.id,d.received_at,l.qty,r.request_no,u.display_name received_name FROM stock_requisition_dispatch_lines l JOIN stock_requisition_dispatches d ON d.id=l.dispatch_id JOIN packaging_requisitions r ON r.id=d.requisition_id LEFT JOIN users u ON u.id=d.received_by WHERE l.item_id=? AND d.status='RECEIVED' ORDER BY d.received_at,d.id",[item.id]);
 await conn.commit();res.set('Cache-Control','private, no-store').json(require('./packaging-ledger').buildLedger(item,opening,receipts));
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 }));
 router.get('/warehouse/export.xlsx',run(async(req,res)=>{
 const {filters,warehouseWorkbook}=require('./packaging-excel');const f=filters(req.query);
 const [items]=await pool.query(require('./packaging-requirements').stockSQL);
 const data=await warehouseWorkbook(items,f);const day=require('./raw-oil-datetime').businessNow().day;
 res.attachment('Packaging_Warehouse_'+day+'.xlsx').type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(Buffer.from(data));
 }));
 router.get('/warehouse',run(async(req,res)=>{
 const [items]=await pool.query(require('./packaging-requirements').stockSQL);
 const [openingHistory]=await pool.query('SELECT DISTINCT item_id FROM packaging_opening_history');const savedIds=new Set(openingHistory.map(h=>String(h.item_id)));for(const i of items)i.opening_saved=quantity(String(i.opening_qty))!==0n||savedIds.has(String(i.id));
 const totals={opening:0n,stockIn:0n,stockOut:0n,closing:0n};for(const i of items){totals.opening+=quantity(String(i.opening_qty));totals.stockIn+=quantity(String(i.imported_stock_in));totals.stockOut+=quantity(String(i.imported_stock_out));totals.closing+=quantity(String(i.closing_qty));}
 const show=n=>formatQuantity((n/1000n).toString()+'.'+(n%1000n).toString().padStart(3,'0'));
 res.render('packaging/warehouse',{user:req.session.user,items,saved:req.query.saved==='1',totals:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,show(v)])),fmt:formatQuantity});
 }));
 router.post('/warehouse/:id/opening',run(async(req,res)=>{
 if(typeof req.body?._csrf!=='string'||req.body._csrf!==req.session.csrf)return res.status(403).send('Form expired. Reload and try again.');
 const qty=quantity(req.body.opening_qty);if(!/^\d{1,10}$/.test(req.params.id)||!/^\d{1,10}$/.test(String(req.body.version)))return res.status(400).send('Invalid item/version');
 const conn=await pool.getConnection();try{await conn.beginTransaction();await actor(conn,req.session.user.id,true);
 const [rows]=await conn.execute('SELECT * FROM packaging_stock WHERE id=? FOR UPDATE',[req.params.id]);const i=rows[0];if(!i)throw Object.assign(Error('Item not found'),{status:404});
 const [previous]=await conn.execute('SELECT item_id FROM packaging_opening_history WHERE item_id=? LIMIT 1',[i.id]);if(quantity(String(i.opening_qty))!==0n||previous.length)throw Object.assign(Error('Opening ကို သိမ်းဆည်းပြီးဖြစ်ပါသည်။ ထပ်မံပြင်ဆင်ခွင့်မရှိပါ။'),{status:409});
 if(String(i.version)!==String(req.body.version))throw Object.assign(Error('Stock ပြောင်းလဲသွားပါသည်။ Reload လုပ်ပြီး ပြန်သိမ်းပါ။'),{status:409});
 const closing=qty+quantity(String(i.imported_stock_in))+quantity(String(i.received_qty||'0'))-quantity(String(i.imported_stock_out));if(closing<0n||closing>999999999999999n)throw Object.assign(Error('Closing Qty သည် 0 မှ 999999999999.999 အတွင်း ဖြစ်ရပါမည်။'),{status:400});
 await conn.execute('INSERT INTO packaging_opening_history (item_id,old_qty,new_qty,actor_id,changed_at) VALUES (?,?,?,?,?)',[i.id,i.opening_qty,req.body.opening_qty,req.session.user.id,(()=>{const n=require('./raw-oil-datetime').businessNow();return n.day+' '+n.time;})()]);
 await conn.execute('UPDATE packaging_stock SET opening_qty=?,version=version+1,updated_by=? WHERE id=?',[req.body.opening_qty,req.session.user.id,i.id]);
 await conn.commit();res.redirect('/packaging/warehouse?saved=1');
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 }));
 router.use((err,req,res,next)=>{if(err.status)return res.status(err.status).type('text').send(err.message);next(err);});return router;
}
module.exports={createPackagingRouter,quantity,formatQuantity};
