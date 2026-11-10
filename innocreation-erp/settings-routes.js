const {installInventorySettings}=require('./inventory-settings');
const express=require('express');
const {createSettingsService}=require('./settings-service');
const {roles,roleLabel}=require('./user-roles');
function createSettingsRouter({pool}){
 const router=express.Router(),service=createSettingsService(pool);
 router.use((req,res,next)=>!req.session.user?res.redirect('/login'):req.session.user.role!=='admin'?res.status(403).send('Admin access required'):next());
 const csrf=(req,res,next)=>typeof req.body._csrf==='string'&&req.body._csrf===req.session.csrf?next():res.status(403).send('Form expired. Reload and try again.');
 const render=(req,res,view,data={},status=200)=>res.status(status).render('settings',{user:req.session.user,view,roles,roleLabel,error:'',reset:false,...data});
 const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const safeValues=body=>({display_name:typeof body.display_name==='string'?body.display_name:'',username:typeof body.username==='string'?body.username:'',position:typeof body.position==='string'?body.position:'',role:typeof body.role==='string'?body.role:''});
 function formError(req,res,view,body,err){if(err.status===403)return res.status(403).send('Admin access required');if(err.code&&err.code!=='ER_DUP_ENTRY')throw err;return render(req,res,view,{values:body,error:err.code==='ER_DUP_ENTRY'?'ဒီ User Name ရှိပြီးသားဖြစ်ပါသည်။ အခြားအမည် ရွေးပါ။':err.message},err.code==='ER_DUP_ENTRY'?409:400);}
 installInventorySettings({router,pool,render,asyncRoute,csrf});
 router.get('/',(req,res)=>res.redirect('/settings/users'));
 router.get('/users/new',(req,res)=>render(req,res,'new',{values:{}}));
 router.post('/users/new',csrf,asyncRoute(async(req,res)=>{try{const id=await service.createUser(req.session.user.id,req.body);res.redirect('/settings/users?created='+encodeURIComponent(id));}catch(err){return formError(req,res,'new',safeValues(req.body),err);}}));
 router.get('/users',asyncRoute(async(req,res)=>{const q=String(req.query.q||'').slice(0,100),pageNo=Math.max(1,Math.min(1000000,parseInt(req.query.p,10)||1));const where=q?' WHERE username LIKE ? OR display_name LIKE ?':'';const params=q?['%'+q+'%','%'+q+'%']:[];const [users]=await pool.query('SELECT id,username,display_name,position,role,is_active FROM users'+where+' ORDER BY id DESC LIMIT 50 OFFSET '+((pageNo-1)*50),params);const [counts]=await pool.query('SELECT COUNT(*) total FROM users'+where,params);render(req,res,'list',{users,q,pageNo,total:Number(counts[0].total),created:/^\d+$/.test(String(req.query.created||'')),updated:req.query.updated==='1'});}));
 router.get('/users/:id/reset-password',asyncRoute(async(req,res)=>{if(!/^\d+$/.test(req.params.id))return res.status(404).send('User not found');const [rows]=await pool.execute('SELECT id,username,display_name FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');render(req,res,'reset',{values:rows[0]});}));
 router.post('/users/:id/reset-password',csrf,asyncRoute(async(req,res)=>{if(req.body.confirm_reset!=='yes')return res.status(400).send('Reset confirmation required');try{await service.resetPassword(req.session.user.id,req.params.id);}catch(err){if(err.status===403||err.status===404)return res.status(err.status).send(err.message);throw err;}if(Number(req.params.id)===Number(req.session.user.id))return req.session.destroy(err=>err?res.status(500).send('Login ပြန်ဝင်ပါ။'):res.redirect('/login'));res.redirect('/settings/users/'+req.params.id+'/edit?reset=1');}));
 router.get('/users/:id/edit' ,asyncRoute(async(req,res)=>{const [rows]=await pool.execute('SELECT id,username,display_name,position,role FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');render(req,res,'edit',{values:rows[0],reset:req.query.reset==='1'});}));
 router.post('/users/:id/edit',csrf,asyncRoute(async(req,res)=>{try{await service.updateUser(req.session.user.id,req.params.id,req.body);res.redirect('/settings/users?updated=1');}catch(err){if(err.code&&err.code!=='ER_DUP_ENTRY')throw err;const [rows]=await pool.execute('SELECT id,username FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');return formError(req,res,'edit',{...safeValues(req.body),...rows[0]},err);}}));
 return router;
}
module.exports={createSettingsRouter};
