const express=require('express'),service=require('./scrap-service'),{actor}=require('./purchasing-service'),{fail}=require('./purchasing-values'),{randomBytes}=require('node:crypto');
function createScrapRouter({pool,groups}){const router=express.Router(),run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);router.use(run(async(req,res,next)=>{if(!req.session?.user)return res.redirect('/login');req.scrapActor=await actor(pool,req.session.user.id,'inventory');res.set('Cache-Control','no-store');next();}));
 const render=(req,res,data)=>res.render('inventory',{user:{...req.session.user,role:req.scrapActor.role},groups,group:null,page:{id:'scrap',name:'Scrap Management'},scrap:{...data,actor:req.scrapActor,...service}});
 async function screen(req,res,error='',draft={}){return render(req,res,{...await service.list(pool,req.query),error,draft,key:draft.request_key||randomBytes(32).toString('hex'),newForm:req.query.new==='1'||!!error,record:null,events:[]});}
 router.get('/',run((req,res)=>screen(req,res)));
 router.get('/:id',run(async(req,res)=>render(req,res,{...await service.detail(pool,req.params.id),error:'',newForm:false})));
 router.use((req,res,next)=>req.session.csrf&&req.body?._csrf===req.session.csrf?next():next(fail('Form expired. Reload.',403)));
 router.post('/new',run(async(req,res)=>{try{const id=await service.createDraft(pool,req.scrapActor.id,req.body);return res.redirect(303,'/inventory/scrap-management/'+id);}catch(e){if(e.status===400)return screen(req,res.status(400),e.message,req.body);throw e;}}));
 router.post('/:id/:action',run(async(req,res)=>{await service.act(pool,req.scrapActor.id,req.params.id,req.params.action,req.body.reason);res.redirect(303,'/inventory/scrap-management/'+req.params.id);}));
 router.use((err,req,res,next)=>{console.error('Scrap Management:',err.code||err.message);res.status(err.status||(err.code?503:400)).render('raw-materials/error',{message:err.code?'Scrap Management SQL setup ကို စစ်ပါ။':err.message});});return router;}
module.exports={createScrapRouter};
