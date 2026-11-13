const express=require('express'),{randomBytes}=require('node:crypto');
const {createDispatchService,actor,canWrite,request,requestLines,label}=require('./stock-requisition-service');
const {businessNow}=require('./raw-oil-datetime');
const queueSQL=`SELECT r.*,u.display_name requested_by,(SELECT COUNT(*) FROM packaging_requisition_lines l WHERE l.requisition_id=r.id) item_count FROM packaging_requisitions r JOIN users u ON u.id=r.created_by`;
const deliverySQL=`SELECT d.*,r.request_no,r.priority,r.status AS request_status,u.display_name created_name,a.display_name approved_name,v.display_name received_name,
 (SELECT COUNT(*) FROM stock_requisition_dispatch_lines l WHERE l.dispatch_id=d.id) item_count,
 (SELECT CAST(SUM(l.qty) AS CHAR) FROM stock_requisition_dispatch_lines l WHERE l.dispatch_id=d.id) total_qty
 FROM stock_requisition_dispatches d JOIN packaging_requisitions r ON r.id=d.requisition_id
 JOIN users u ON u.id=d.created_by LEFT JOIN users a ON a.id=d.approved_by LEFT JOIN users v ON v.id=d.received_by`;
const pageNo=req=>Math.max(1,Math.min(100000,parseInt(req.query.p,10)||1));
const search=req=>typeof req.query.q==='string'?req.query.q.trim().slice(0,100):'';
const escapeLike=q=>'%'+q.replace(/[!%_]/g,c=>'!'+c)+'%';
function historyFilters(query={},fixedStatus=''){
 const keys=['q','dispatchNo','request','item','prepared','dispatched','received','from','to','dateField','status'],f={};
 for(const k of keys){if(query[k]!==undefined&&(typeof query[k]!=='string'||query[k].length>100))throw Object.assign(Error('Invalid filter'),{status:400});f[k]=(query[k]||'').trim();}
 for(const k of ['from','to'])if(f[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(f[k])||Number.isNaN(Date.parse(f[k]))))throw Object.assign(Error('Invalid date'),{status:400});
 if(f.from&&f.to&&f.from>f.to)throw Object.assign(Error('From date must be before To date'),{status:400});
 f.dateField=['prepared','dispatched','received'].includes(f.dateField)?f.dateField:'dispatched';
 f.status=fixedStatus||(['PENDING','IN_TRANSIT','RECEIVED','REJECTED'].includes(f.status)?f.status:'');
 const w=[],params=[],like=(column,value)=>{w.push(column+" LIKE ? ESCAPE '!'");params.push(escapeLike(value));};
 if(f.status){w.push('d.status=?');params.push(f.status);}
 if(f.q){const dsp=/^(?:DSP-)?(\d+)$/i.exec(f.q);w.push(`(r.request_no LIKE ? ESCAPE '!' OR d.id=? OR u.display_name LIKE ? ESCAPE '!' OR a.display_name LIKE ? ESCAPE '!' OR v.display_name LIKE ? ESCAPE '!' OR EXISTS(SELECT 1 FROM stock_requisition_dispatch_lines x WHERE x.dispatch_id=d.id AND (x.item_code LIKE ? ESCAPE '!' OR x.item_name LIKE ? ESCAPE '!')))`);params.push(escapeLike(f.q),dsp?dsp[1]:'0',...Array(5).fill(escapeLike(f.q)));}
 if(f.dispatchNo){const match=/^(?:DSP-)?(\d{1,20})$/i.exec(f.dispatchNo);w.push('d.id=?');params.push(match?match[1]:'0');}
 if(f.request)like('r.request_no',f.request);
 if(f.item){w.push("EXISTS(SELECT 1 FROM stock_requisition_dispatch_lines x WHERE x.dispatch_id=d.id AND (x.item_code LIKE ? ESCAPE '!' OR x.item_name LIKE ? ESCAPE '!'))");params.push(escapeLike(f.item),escapeLike(f.item));}
 for(const [key,col] of [['prepared','u.display_name'],['dispatched','a.display_name'],['received','v.display_name']])if(f[key])like(col,f[key]);
 const date={prepared:'d.created_at',dispatched:'d.approved_at',received:'d.received_at'}[f.dateField];
 if(f.from){w.push(date+'>=?');params.push(f.from+' 00:00:00');}if(f.to){w.push(date+'<=?');params.push(f.to+' 23:59:59.999999');}
 return {values:f,where:w.length?' WHERE '+w.join(' AND '):'',params};
}
async function historyExport(pool,res,f){const [rows]=await pool.query(deliverySQL+f.where+' ORDER BY d.id DESC',f.params);const book=new (require('exceljs').Workbook)(),sheet=book.addWorksheet('Stock History');
 sheet.columns=[['Dispatch No.','dispatch'],['Request No.','request_no'],['Prepared By','created_name'],['Prepared At','created_at'],['Dispatched By','approved_name'],['Dispatched At','approved_at'],['Received By','received_name'],['Received At','received_at'],['Items','item_count'],['Total Qty (pcs)','total_qty'],['Status','status']].map(([header,key])=>({header,key,width:24}));
 for(const d of rows)sheet.addRow({...d,dispatch:'DSP-'+String(d.id).padStart(6,'0'),status:label(d.status),total_qty:Number(d.total_qty)});sheet.getRow(1).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'E5EFEB'}};c.font={bold:true,color:{argb:'155D52'}};});sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter='A1:K1';res.attachment('Stock_History_'+businessNow().day+'.xlsx').send(Buffer.from(await book.xlsx.writeBuffer()));}
async function dispatchHistory(pool,requestId){const [rows]=await pool.execute(deliverySQL+' WHERE d.requisition_id=? ORDER BY d.id DESC',[requestId]);for(const d of rows){const [lines]=await pool.execute('SELECT * FROM stock_requisition_dispatch_lines WHERE dispatch_id=? ORDER BY id',[d.id]);d.lines=lines;}return rows;}
function createRequisitionRouter({pool,groups,packaging=false}){
 const router=express.Router(),service=createDispatchService(pool),run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 router.use(express.json({limit:'512kb'}));router.use(run(async(req,res,next)=>{if(!req.session?.user)return res.redirect('/login');req.requisitionActor=await actor(pool,req.session.user.id,packaging?'packaging':'inventory');next();}));
 const csrf=(req,res,next)=>typeof req.session.csrf==='string'&&req.session.csrf&&(req.get('x-csrf-token')||req.body?._csrf)===req.session.csrf?next():res.status(403).json({error:'Form expired. Reload.'});
 if(packaging){
 router.get('/warehouse/in/export.xlsx',run(async(req,res)=>historyExport(pool,res,historyFilters(req.query,req.query.tab==='history'?'RECEIVED':'IN_TRANSIT'))));
 async function slip(req,res,pdf=false){if(!/^\d{1,20}$/.test(req.params.id))return res.status(404).send('Slip not found');const [rows]=await pool.execute(deliverySQL+" WHERE d.id=? AND d.status='RECEIVED'",[req.params.id]);const d=rows[0];if(!d)return res.status(404).send('Slip not found');const [lines]=await pool.execute('SELECT * FROM stock_requisition_dispatch_lines WHERE dispatch_id=? ORDER BY id',[d.id]);const data={d,lines,pdfMode:pdf};res.set('Cache-Control','private, no-store');if(!pdf)return res.render('packaging/receipt-slip',data);try{const {renderPDF,printCSS}=require('./fg-pdf');const html=await require('ejs').renderFile(require('node:path').join(__dirname,'views/packaging/receipt-slip.ejs'),{...data,css:printCSS()});res.attachment('Stock_Receipt_DSP-'+String(d.id).padStart(6,'0')+'.pdf').type('application/pdf').send(await renderPDF(html));}catch(e){console.error('Receipt PDF:',e.code||e.message);res.render('packaging/receipt-slip',{...data,pdfMode:false,downloadMode:true});}}
 router.get('/warehouse/in/slips/:id',run((req,res)=>slip(req,res)));
 router.get('/warehouse/in/slips/:id/pdf',run((req,res)=>slip(req,res,true)));
 router.get('/warehouse/in',run(async(req,res)=>{
 if(req.query.tab==='history'&&req.query.dispatch!==undefined)return res.redirect('/packaging/warehouse/in/slips/'+encodeURIComponent(req.query.dispatch));
 const p=pageNo(req),q=search(req),tab=req.query.tab==='history'?'history':'pending',f=historyFilters(req.query,tab==='history'?'RECEIVED':'IN_TRANSIT');
 const [dispatches]=await pool.query(deliverySQL+f.where+' ORDER BY d.id DESC LIMIT 50 OFFSET '+((p-1)*50),f.params);
 const [counts]=await pool.query('SELECT COUNT(*) total FROM ('+deliverySQL+f.where+') matches',f.params);
 const [badges]=await pool.query("SELECT SUM(CASE WHEN status='IN_TRANSIT' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN status='RECEIVED' THEN 1 ELSE 0 END) received,SUM(CASE WHEN status='RECEIVED' AND received_at>=? AND received_at<? THEN 1 ELSE 0 END) received_today FROM stock_requisition_dispatches",[businessNow().day+' 00:00:00',businessNow().day+' 23:59:59.999999']);
 const [totals]=await pool.query("SELECT CAST(COALESCE(SUM(l.qty),0) AS CHAR) qty FROM stock_requisition_dispatch_lines l JOIN stock_requisition_dispatches d ON d.id=l.dispatch_id WHERE d.status='RECEIVED'");
 let selected=tab==='pending'?dispatches[0]||null:null;if(req.query.dispatch!==undefined){if(!/^\d{1,20}$/.test(String(req.query.dispatch)))return res.status(404).send('Dispatch not found');const [rows]=await pool.execute(deliverySQL+' WHERE d.id=? AND d.status=?',[req.query.dispatch,tab==='history'?'RECEIVED':'IN_TRANSIT']);if(!rows[0])return res.status(404).send('Dispatch not found');selected=rows[0];}
 if(selected){const [lines]=await pool.execute('SELECT * FROM stock_requisition_dispatch_lines WHERE dispatch_id=? ORDER BY id',[selected.id]);selected.lines=lines;}
 res.render('packaging/workspace',{user:req.session.user,packagingPage:'stock-in',dispatches,pageNo:p,total:Number(counts[0].total),receiptTab:tab,receiptSearch:q,historyFilters:f.values,receiptSelected:selected,receiptStats:{pending:Number(badges[0].pending||0),received:Number(badges[0].received||0),receivedToday:Number(badges[0].received_today||0),totalQty:totals[0].qty},dispatchLabel:label});
 }));
 router.post('/dispatches/:id/receive',csrf,run(async(req,res)=>{await service.receive(req.session.user.id,req.params.id,req.body);res.json({redirect:'/packaging/warehouse/in/slips/'+req.params.id});}));
 }else{
 const locals=(req,sr)=>({user:{...req.session.user,role:req.requisitionActor.role},groups,group:{id:'stock-requisitions',name:sr.historyPage||sr.archived?'Stock Requisitions History':'Stock Requisitions',menus:[]},page:null,sr});
 router.get('/stock-requisitions/history/export.xlsx',run(async(req,res)=>historyExport(pool,res,historyFilters(req.query))));
 router.get('/stock-requisitions/history',run(async(req,res)=>{
 const p=pageNo(req),f=historyFilters(req.query),sql=deliverySQL+f.where;
 const [rows]=await pool.query(sql+' ORDER BY d.id DESC LIMIT 50 OFFSET '+((p-1)*50),f.params);const [count]=await pool.query('SELECT COUNT(*) total FROM ('+sql+') history_rows',f.params);
 res.render('inventory',locals(req,{historyPage:true,rows,label,q:f.values.q,status:f.values.status,filters:f.values,pageNo:p,total:Number(count[0].total)}));
 }));
 async function page(req,res,print=false,archived=false){const p=pageNo(req),q=search(req),status=['PENDING_WAREHOUSE_ISSUE','PENDING_SUPERVISOR_APPROVAL','PARTIALLY_DISPATCHED'].includes(req.query.status)?req.query.status:'',conditions=["r.status<>'DISPATCHED'"],params=[];if(status){conditions.push('r.status=?');params.push(status);}if(q){conditions.push("(r.request_no LIKE ? ESCAPE '!' OR u.display_name LIKE ? ESCAPE '!')");params.push(escapeLike(q),escapeLike(q));}
 const [queue]=await pool.query(queueSQL+' WHERE '+conditions.join(' AND ')+" ORDER BY CASE WHEN r.priority='URGENT' THEN 0 ELSE 1 END,r.id DESC LIMIT 50 OFFSET "+((p-1)*50),params);
 let selected=null,lines=[],history=[];const chosen=req.params.id||queue[0]?.id;if(chosen){selected=await request(pool,chosen);if(selected.status==='DISPATCHED'&&!print&&!archived)return res.redirect('/inventory/stock-requisitions/history/'+selected.id);lines=await requestLines(pool,selected.id);history=await dispatchHistory(pool,selected.id);const [stock]=await pool.query(require('./packaging-main-stock').manualStockSQL);for(const l of lines){const item=stock.find(i=>String(i.id)===String(l.item_id));l.main_stock=item?.main_stock??null;}}
 const sr={queue:archived?[]:queue,selected,lines,history,label,q,status,pageNo:p,canWrite:!archived&&canWrite(req.requisitionActor),supervisor:!archived&&req.requisitionActor.role==='warehouse_supervisor',actorId:String(req.requisitionActor.id),requestKey:randomBytes(32).toString('hex'),print,archived,historyPage:false};
 res.render(print?'stock-requisitions/print':'inventory',locals(req,sr));
 }
 router.get('/stock-requisitions/history/:id',run((req,res)=>page(req,res,false,true)));
 router.get('/stock-requisitions',run((req,res)=>page(req,res)));
 router.get('/stock-requisitions/:id',run((req,res)=>page(req,res)));
 router.get('/stock-requisitions/:id/print',run((req,res)=>page(req,res,true)));
 const redirectFor=async requestId=>(await request(pool,requestId)).status==='DISPATCHED'?'/inventory/stock-requisitions/history/'+requestId:'/inventory/stock-requisitions/'+requestId;
 router.post('/stock-requisitions/:id/dispatch',csrf,run(async(req,res)=>{await service.prepare(req.session.user.id,req.params.id,req.body);res.json({redirect:await redirectFor(req.params.id)});}));
 router.post('/stock-requisition-dispatches/:id/decision',csrf,run(async(req,res)=>{const requestId=await service.decide(req.session.user.id,req.params.id,req.body);res.json({redirect:await redirectFor(requestId)});}));
 }
 router.use((e,req,res,next)=>{console.error('Stock requisition:',e.code||e.message);const status=e.status||(e.code?503:400),message=e.code?'Database setup ကို စစ်ပါ။':e.message;if(req.method==='POST')return res.status(status).json({error:message,...(e.lineErrors?{lineErrors:e.lineErrors}:{})});res.status(status).type('text').send(message);});return router;
}
module.exports={createRequisitionRouter,dispatchHistory,historyFilters};
