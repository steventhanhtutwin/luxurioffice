const {transactionCategories,loadTransactionCategories,loadHistoricalCategories}=require('./raw-oil-transaction-category');
const {installVoidRoutes}=require('./raw-oil-void-routes');
const {statusLabel}=require('./raw-oil-void-service');
const {today:businessToday}=require('./raw-oil-numbering');
const express=require('express');
const {createService,summarySQL,newKey}=require('./raw-oil-service');
const {text}=require('./raw-oil-values');
const {summaryFilters,transactionFilters,transactionValues,transactionJoins,transactionSelect}=require('./raw-oil-filters');
const {summaryWorkbook,transactionWorkbook}=require('./raw-oil-excel');
function createRawOilRouter({pool,groups,pdfRenderer}){
 const router=express.Router(),service=createService(pool),group=groups.find(g=>g.id==='raw-oil');
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const render=(req,res,id,rawOil,status=200)=>res.status(status).render('inventory',{user:req.session.user,groups,group,page:group.menus.find(m=>m.id===id)||{id,name:'Raw Oil Item'},rawOil:{error:'',status:'',statusLabel,transactionCategories,...rawOil}});
 const admin=(req,res,next)=>req.session.user.role==='admin'?next():res.status(403).send('Admin access required');
 const csrf=(req,res,next)=>typeof req.body?._csrf==='string'&&req.body._csrf===req.session.csrf?next():res.status(403).send('Form expired. Reload and try again.');
 const errorText=err=>{if(err.code==='ER_DUP_ENTRY')return 'Item Code သို့မဟုတ် နေရာအမည် ထပ်နေပါသည်။';if(err.code){console.error('Raw Oil:',err.code);return 'Database error. Terminal နှင့် setup-raw-oil ပြီးစီးမှုကို စစ်ပါ။';}return err.message;};
 const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const sendExcel=(res,buffer,name)=>{res.attachment(name+'_'+today()+'.xlsx');res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.send(Buffer.from(buffer));};
 router.all('/adjustments/export.xlsx',(req,res)=>res.status(404).send('Export unavailable'));
 require('./raw-oil-approval').installApprovalRoutes({router,pool,render,asyncRoute,csrf});
 router.get('/summary/export.xlsx',asyncRoute(async(req,res)=>{const filters=summaryFilters(req.query);const [rows]=await pool.query(summarySQL+filters.where+' ORDER BY i.name,i.id',filters.params);sendExcel(res,await summaryWorkbook(rows,filters),'Raw_Oil_Balance');}));
 router.get('/transactions/export.xlsx',asyncRoute(async(req,res)=>{let filters;try{filters=transactionFilters(req.query);}catch(err){return res.status(400).send(err.message);}const [rows]=await pool.query(transactionSelect+filters.where+' ORDER BY t.transaction_date DESC,t.id DESC',filters.params);sendExcel(res,await transactionWorkbook(rows,filters),'Raw_Oil_Transaction');}));
 require('./raw-oil-print-routes').installRawOilPrintRoutes({router,pool,asyncRoute,pdfRenderer});
 installVoidRoutes({router,pool,render,asyncRoute,csrf});
 router.get('/api/items/:code',asyncRoute(async(req,res)=>{const item=await service.getItem(req.params.code);if(!item)return res.status(404).json({error:'Item Code မတွေ့ပါ။'});res.json(item);}));
 router.get('/list',(req,res)=>{const q=new URLSearchParams();for(const key of ['q','category','p','saved'])if(typeof req.query[key]==='string')q.set(key,req.query[key]);res.redirect('/inventory/raw-oil/summary'+(q.size?'?'+q.toString():''));});
 router.get('/summary',asyncRoute(async(req,res)=>{
 const {q,category,where,params}=summaryFilters(req.query);const pageNo=Math.min(1000000,Math.max(1,parseInt(req.query.p,10)||1));
 const [rows]=await pool.query(summarySQL+where+' ORDER BY i.name,i.id LIMIT 50 OFFSET '+((pageNo-1)*50),params);
 const [counts]=await pool.query('SELECT COUNT(*) total FROM raw_oil_items i'+where,params);
 const [categories]=await pool.query('SELECT DISTINCT category FROM raw_oil_items ORDER BY category');
 const [totals]=await pool.query('SELECT COUNT(*) item_count,SUM(opening_grams IS NULL) pending,COALESCE(SUM(opening_grams),0) opening,COALESCE(SUM(stock_in),0) stock_in,COALESCE(SUM(stock_out),0) stock_out,COALESCE(SUM(closing_grams),0) closing FROM ('+summarySQL+where+') s',params);
 render(req,res,'summary',{type:'list',rows,q,category,categories,totals:totals[0],total:Number(counts[0].total),pageNo,saved:req.query.saved==='1'});
 }));
 const formData=async(req,res,direction,body={},error='',status=200)=>{const [places]=await pool.query('SELECT * FROM raw_oil_places ORDER BY name');const categories=await loadTransactionCategories(pool);return render(req,res,direction==='IN'?'in':'out',{type:'movement',direction,places,transactionCategories:categories,values:{date:today(),...body,date:businessToday(),voucher:'',request_key:body.request_key||newKey()},error},status);};
 for(const [path,direction]of [['in','IN'],['out','OUT']]){
 router.get('/'+path,asyncRoute((req,res)=>formData(req,res,direction)));
 router.post('/'+path,csrf,asyncRoute(async(req,res)=>{try{const id=await service.postMovement({...req.body,direction},req.session.user.id);res.redirect('/inventory/raw-oil/'+(String(req.body.transaction_category).toLowerCase()==='adjustment'?'adjustments':'transactions')+'?saved='+encodeURIComponent(id));}catch(err){return formData(req,res,direction,req.body,errorText(err),err.code?500:400);}}));
 }
 router.get('/transactions',asyncRoute(async(req,res)=>{
 const categories=await loadHistoricalCategories(pool);
 const {q,direction,from,to,status,transaction_category}=transactionValues(req.query);let filter;
 try{filter=transactionFilters(req.query);}catch(err){return render(req,res,'transactions',{type:'history',transactionCategories:categories,rows:[],q,direction,from,to,status,transaction_category,error:err.message,total:0,pageNo:1,saved:false},400);}
 const {where,params}=filter,pageNo=Math.min(1000000,Math.max(1,parseInt(req.query.p,10)||1));
 const [rows]=await pool.query(transactionSelect+where+' ORDER BY t.transaction_date DESC,t.id DESC LIMIT 50 OFFSET '+((pageNo-1)*50),params);
 const [count]=await pool.query('SELECT COUNT(*) total'+transactionJoins+where,params);
 render(req,res,'transactions',{type:'history',transactionCategories:categories,rows,q,direction,from,to,status,transaction_category,total:Number(count[0].total),pageNo,saved:/^\d+$/.test(String(req.query.saved||''))?String(req.query.saved):false});
 }));
 const postedItem=(body,id)=>({id,code:body.code,name:body.name,category:body.category,item_class:body.item_class,opening_grams:body.opening_grams,opening_date:body.opening_date,remark:body.remark});
 async function itemForm(req,res,item={},error='',status=200){
 const [categories]=await pool.query("SELECT DISTINCT category FROM raw_oil_items WHERE category<>'' ORDER BY category");
 if(item.id){const [rows]=await pool.execute("SELECT *,DATE_FORMAT(opening_date,'%Y-%m-%d') opening_date FROM raw_oil_items WHERE id=?",[item.id]);if(!rows.length)return res.status(404).send('Item not found');const stored=rows[0];if(stored.opening_grams!==null)return res.status(403).send('Stock adjustment လုပ်ခွင့် မရှိတော့ပါ။ Transaction မှားပါက Void Request လုပ်ပါ။');const [transactions]=await pool.execute('SELECT id FROM raw_oil_transactions WHERE item_id=? LIMIT 1',[item.id]);item={...stored,...item,id:stored.id,code:stored.code,item_class:stored.item_class};if(transactions.length)item={...item,opening_grams:stored.opening_grams,opening_date:stored.opening_date,opening_locked:true};}
 else item={...item,item_class:'Raw Oil'};
 return render(req,res,'summary',{type:'item',item,error,categories,today:today()},status);
 }
 router.get('/items/new',admin,asyncRoute((req,res)=>itemForm(req,res)));
 router.post('/items/new',admin,csrf,asyncRoute(async(req,res)=>{try{await service.saveItem(req.body,req.session.user.id);res.redirect('/inventory/raw-oil/summary?saved=1');}catch(err){return itemForm(req,res,postedItem(req.body),errorText(err),err.code?500:400);}}));
 router.get('/items/:id',admin,asyncRoute((req,res)=>itemForm(req,res,{id:req.params.id})));
 router.post('/items/:id',admin,csrf,asyncRoute(async(req,res)=>{try{await service.saveItem(req.body,req.session.user.id,req.params.id);res.redirect('/inventory/raw-oil/summary?saved=1');}catch(err){return itemForm(req,res,postedItem(req.body,req.params.id),errorText(err),err.code?500:400);}}));
 router.post('/places',admin,csrf,asyncRoute(async(req,res)=>{const direction=req.body.return_to==='out'?'OUT':'IN';try{const name=text(req.body.name,'Location',120);if(name.toLowerCase()==='warehouse')throw new Error('Warehouse ကို From / To အဖြစ် ထပ်မထည့်ရပါ။');await pool.execute('INSERT INTO raw_oil_places (name) VALUES (?)',[name]);res.redirect('/inventory/raw-oil/'+(direction==='IN'?'in':'out'));}catch(err){return formData(req,res,direction,{},errorText(err),err.code?500:400);}}));
 router.use((err,req,res,next)=>{console.error('Raw Oil page:',err.code||err.message);res.status(500).send('Raw Oil database is not ready or could not be read. Run npm.cmd run setup-raw-oil and check the terminal.');});
 return router;
}
module.exports={createRawOilRouter};
