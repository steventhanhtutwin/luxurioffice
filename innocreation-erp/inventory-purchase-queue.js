const express=require('express');
const {actor,createPurchaseService}=require('./purchasing-service');
const {randomBytes}=require('node:crypto');
const {activeMaterialPR}=require('./purchasing-low-stock');
const {fail}=require('./purchasing-values');
const LOW_STOCK='stock_qty<=reorder_qty';
function createInventoryPurchaseQueue({pool,groups}){
 const service=createPurchaseService(pool),router=express.Router(),run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const access=run(async(req,res,next)=>{if(!req.session?.user)return res.redirect('/login');req.queueActor=await actor(pool,req.session.user.id,'inventory');next();});
 router.get('/count',access,run(async(req,res)=>{const [rows]=await pool.query('SELECT COUNT(*) total FROM purchase_materials WHERE '+LOW_STOCK);res.set('Cache-Control','no-store').json({count:Number(rows[0].total)});}));
 async function screen(req,res,error='',values={}){const [materials]=await pool.query('SELECT id,code,name,category,unit,stock_qty,reorder_qty FROM purchase_materials WHERE '+LOW_STOCK+' ORDER BY name,code');const [pendingRows]=await pool.query('SELECT r.id,r.material_id,r.request_no,r.qty FROM purchase_requisitions r JOIN purchase_materials m ON m.id=r.material_id WHERE m.stock_qty<=m.reorder_qty AND '+activeMaterialPR+' ORDER BY r.id DESC');const pendingMap=new Map();for(const r of pendingRows)if(!pendingMap.has(String(r.material_id)))pendingMap.set(String(r.material_id),r);for(const m of materials){m.pending=pendingMap.get(String(m.id))||null;m.request_key=randomBytes(32).toString('hex');}let sent=null;if(typeof req.query.sent==='string'&&/^\d{1,20}$/.test(req.query.sent)){const [rows]=await pool.execute("SELECT id,request_no FROM purchase_requisitions WHERE id=? AND warehouse='Main Warehouse'",[req.query.sent]);sent=rows[0]||null;}res.set('Cache-Control','no-store');return res.render('inventory',{user:{...req.session.user,role:req.queueActor.role},groups,group:null,page:{id:'purchase-requests',name:'Purchase Requests'},purchaseQueue:{materials,error,values,sent}});}
 router.get('/',access,run((req,res)=>screen(req,res)));
 router.post('/request',access,run(async(req,res)=>{if(!req.session.csrf||req.body?._csrf!==req.session.csrf)throw fail('Form expired. Reload.',403);try{const id=await service.request(req.queueActor.id,'inventory',{material_id:req.body.material_id,request_key:req.body.request_key,qty:req.body.qty,priority:'NORMAL',needed_by:'',remark:'Low Stock replenishment request from Inventory'},{lowStock:true});res.redirect(303,'/inventory/purchase-requests?sent='+id);}catch(err){if([400,409].includes(err.status))return screen(req,res.status(err.status),err.message,req.body);throw err;}}));
 router.use((err,req,res,next)=>{console.error('Inventory Purchase Queue:',err.code||err.message);res.status(err.status||(err.code?503:400)).render('raw-materials/error',{message:err.code?'Purchase Requests database setup ကို စစ်ပါ။':err.message});});
 return router;
}
module.exports={createInventoryPurchaseQueue};
