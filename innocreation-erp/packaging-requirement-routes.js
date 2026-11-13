const express=require('express'),{randomBytes}=require('node:crypto');
const {parseSales,compareSales,stockSQL,fail}=require('./packaging-requirements');
const {submitRequisition,submitManualRequisition}=require('./packaging-requisition-service');
const {createReport}=require('./raw-oil-excel');
function createRequirementRouter({pool}){
 const router=express.Router();router.use(express.json({limit:'512kb'}));const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const csrf=(req,res,next)=>{if(typeof req.session.csrf!=='string'||!req.session.csrf||((req.get('x-csrf-token')||req.body?._csrf)!==req.session.csrf))return res.status(403).json({error:'Form expired. Reload.'});next();};
 const save=req=>typeof req.session.save==='function'?new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve())):Promise.resolve();
 function batchFor(req){const id=req.body?.batchId,batch=req.session.packagingRequirements?.find(b=>b.id===id);if(!batch||Date.now()-batch.at>2*60*60*1000)throw fail('Import session သက်တမ်းကုန်ပါပြီ။ Excel ကို ပြန် Import လုပ်ပါ။',410);return batch;}
 function publicBatch(b){return {batchId:b.id,sourceName:b.sourceName,ignoredDeli:b.ignoredDeli,sourceRows:b.sourceRows,zeroRows:b.zeroRows,sales:b.sales,...(b.comparison||{distinct:b.sales.length,totalSales:require('./packaging-requirements').decimal(b.sales.reduce((n,s)=>n+require('./packaging-requirements').units(s.qty),0n))})};}
 router.get('/plan',(req,res)=>res.redirect('/operation/material-requirement'));
 router.get('/operation',(req,res)=>res.redirect('/operation/material-requirement'));
 router.get('/operation/material-requirement',(req,res)=>res.render('packaging/workspace',{user:req.session.user,packagingPage:'requirement'}));
 router.post('/operation/import',express.raw({type:'application/octet-stream',limit:'5mb'}),csrf,run(async(req,res)=>{
 const parsed=await parseSales(req.body);const source=typeof req.query.name==='string'?req.query.name.split(/[\\/]/).pop().slice(0,200):'Sales.xlsx';
 const batch={...parsed,id:randomBytes(32).toString('hex'),sourceName:source||'Sales.xlsx',at:Date.now()};
 req.session.packagingRequirements=[batch,...(req.session.packagingRequirements||[]).filter(b=>Date.now()-b.at<2*60*60*1000)].slice(0,3);await save(req);res.json(publicBatch(batch));
 }));
 router.post('/operation/compare',csrf,run(async(req,res)=>{const batch=batchFor(req);const [stock]=await pool.query(stockSQL);batch.comparison=compareSales(batch,stock);await save(req);res.json(publicBatch(batch));}));
 router.post('/operation/requests',csrf,run(async(req,res)=>{const batch=batchFor(req);if(!batch.comparison)throw fail('Compare Packaging Stock ကို အရင်နှိပ်ပါ။');const id=await submitRequisition(pool,req.session.user.id,batch,req.body.items);res.json({redirect:'/packaging/requests/'+id});}));
 router.post('/operation/pending.xlsx',csrf,run(async(req,res)=>{
 const batch=batchFor(req);const rows=batch.sales.map((r,i)=>({no:i+1,name:r.name,qty:Number(r.qty)}));
 const report=createReport('Online Pending Quantity',[{header:'No.',key:'no',width:10},{header:'Product / No.',key:'name',width:65},{header:'Online Pending Qty',key:'qty',width:24,format:'#,##0.###'}],'Source: '+batch.sourceName,rows);
 report.sheet.getCell('A2').value='Aggregated online sales quantities; Deli excluded; no stock movements';
 res.attachment('Online_Pending_Quantity.xlsx').type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(Buffer.from(await report.workbook.xlsx.writeBuffer()));
 }));
 router.post('/operation/export.xlsx',csrf,run(async(req,res)=>{
 const batch=batchFor(req);if(!batch.comparison)throw fail('Compare Packaging Stock ကို အရင်နှိပ်ပါ။');const q=typeof req.body.q==='string'?req.body.q.trim().toLowerCase().slice(0,100):'',status=['SHORTAGE','SUFFICIENT','ERROR'].includes(req.body.status)?req.body.status:'';
 const rows=batch.comparison.rows.filter(r=>(!q||(r.name+' '+(r.itemCode||'')).toLowerCase().includes(q))&&(!status||(status==='ERROR'?!r.itemId:r.status===status))).map(r=>({id:r.itemCode||'',name:r.name,category:r.category||'',size:r.size||'',sales:Number(r.sales),stock:r.stock===null?null:Number(r.stock),shortage:r.shortage===null?null:Number(r.shortage),status:r.error||r.status}));
 const columns=[{header:'Item Code',key:'id',width:12,format:'@'},{header:'Item Name',key:'name',width:45},{header:'Category',key:'category',width:25},{header:'Size (ml)',key:'size',width:14,format:'@'},...['Sales Qty','Packaging Stock','Shortage Qty'].map((header,i)=>({header,key:['sales','stock','shortage'][i],width:20,format:'#,##0.###'})),{header:'Status',key:'status',width:36}];
 const report=createReport('Material Requirement',columns,'Source: '+batch.sourceName+' · '+(status||'All items')+' · Search: '+(q||'All'),rows);report.sheet.getCell('A2').value='Packaging Warehouse · Comparison snapshot; no stock movements';
 res.attachment('Packaging_Material_Requirement.xlsx').send(Buffer.from(await report.workbook.xlsx.writeBuffer()));
 }));
 router.get('/material-request/new',run(async(req,res)=>{const [items]=await pool.query(require('./packaging-main-stock').manualStockSQL);res.render('packaging/workspace',{user:req.session.user,packagingPage:'manual-request',items,today:require('./raw-oil-datetime').businessNow().day,requestKey:randomBytes(32).toString('hex')});}));
 router.post('/requests/manual',csrf,run(async(req,res)=>{const id=await submitManualRequisition(pool,req.session.user.id,req.body);res.json({redirect:'/packaging/requests/'+id});}));
 router.get('/material-request',run(async(req,res)=>{const p=Math.max(1,Math.min(100000,parseInt(req.query.p,10)||1));const [requests]=await pool.query('SELECT r.*,u.display_name requested_by,(SELECT COUNT(*) FROM packaging_requisition_lines l WHERE l.requisition_id=r.id) item_count,(SELECT CAST(SUM(l.requested_qty) AS CHAR) FROM packaging_requisition_lines l WHERE l.requisition_id=r.id) total_qty FROM packaging_requisitions r JOIN users u ON u.id=r.created_by ORDER BY r.id DESC LIMIT 50 OFFSET '+((p-1)*50));const [counts]=await pool.query('SELECT COUNT(*) total FROM packaging_requisitions');res.render('packaging/workspace',{user:req.session.user,packagingPage:'requests',requests,pageNo:p,total:Number(counts[0].total)});}));
 async function detail(req,res,print=false){if(!/^\d{1,20}$/.test(req.params.id))throw fail('Request not found',404);const [headers]=await pool.execute('SELECT r.*,u.display_name requested_by FROM packaging_requisitions r JOIN users u ON u.id=r.created_by WHERE r.id=?',[req.params.id]);if(!headers[0])throw fail('Request not found',404);const [lines]=await pool.execute('SELECT l.*, COALESCE(l.item_code,f.code) AS item_code FROM packaging_requisition_lines l LEFT JOIN packaging_stock p ON p.id=l.item_id LEFT JOIN fg_items f ON f.id=p.fg_item_id WHERE l.requisition_id=? ORDER BY l.id',[req.params.id]);const dispatchHistory=await require('./stock-requisition-routes').dispatchHistory(pool,req.params.id);const totalQty=require('./packaging-requirements').decimal(lines.reduce((sum,r)=>sum+require('./packaging-requirements').units(r.requested_qty),0n));res.render(print?'packaging/request-print':'packaging/workspace',{user:req.session.user,packagingPage:'request-detail',request:headers[0],lines,totalQty,dispatchHistory,dispatchLabel:require('./stock-requisition-service').label,printMode:print});}
 router.get('/requests/:id',run((req,res)=>detail(req,res)));
 router.get('/requests/:id/print',run((req,res)=>detail(req,res,true)));
 router.use((err,req,res,next)=>{if(!err.status)console.error('Packaging requirement:',err.code||err.message);const status=err.status||503;const message=err.status?err.message:'ယခု လုပ်ဆောင်၍ မရပါ။ Database setup နှင့် Server ကို စစ်ပါ။';if(req.method==='POST')return res.status(status).json({error:message});return res.status(status).type('text').send(message);});return router;
}
module.exports={createRequirementRouter};
