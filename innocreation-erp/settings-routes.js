const {applications,accessFor}=require('./application-access');
const {departmentOptions,installDepartmentRoutes}=require('./departments');
const {installInventorySettings}=require('./inventory-settings');
const express=require('express');
const {createSettingsService}=require('./settings-service');
const {roles,roleLabel,normalizedRole}=require('./user-roles');
function createSettingsRouter({pool}){
 const router=express.Router(),service=createSettingsService(pool);
 router.use((req,res,next)=>!req.session.user?res.redirect('/login'):!(req.session.user.app_access||accessFor(req.session.user)).includes('settings')?res.status(403).send('Settings access required'):next());
 const csrf=(req,res,next)=>typeof req.body?._csrf==='string'&&req.body._csrf===req.session.csrf?next():res.status(403).send('Form expired. Reload and try again.');
 const render=(req,res,view,data={},status=200)=>res.status(status).render('settings',{user:req.session.user,view,applications,accessFor,roles,roleLabel,error:'',reset:false,voided:false,departments:[],...data});
 const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const safeValues=body=>({display_name:typeof body.display_name==='string'?body.display_name:'',username:typeof body.username==='string'?body.username:'',position:typeof body.position==='string'?body.position:'',role:typeof body.role==='string'?body.role:'',department_id:typeof body.department_id==='string'?body.department_id:'',application_access:JSON.stringify(Array.isArray(body.application_access)?body.application_access:body.application_access?[body.application_access]:[])});
 async function formError(req,res,view,body,err){if(err.status===403)return res.status(403).send(err.message);if(err.code&&err.code!=='ER_DUP_ENTRY')throw err;return render(req,res,view,{values:body,departments:await departmentOptions(pool,body.department_id),error:err.code==='ER_DUP_ENTRY'?'ဒီ User Name ရှိပြီးသားဖြစ်ပါသည်။ အခြားအမည် ရွေးပါ။':err.message},err.code==='ER_DUP_ENTRY'?409:400);}
 require('./user-void').installUserVoidRoutes({router,pool,render,asyncRoute,csrf});
 installDepartmentRoutes({router,pool,render,asyncRoute,csrf});
 installInventorySettings({router,pool,render,asyncRoute,csrf});
 router.get('/',(req,res)=>res.redirect('/settings/users'));
 router.get('/users/new',asyncRoute(async(req,res)=>render(req,res,'new',{values:{},departments:await departmentOptions(pool)})));
 router.post('/users/new',csrf,asyncRoute(async(req,res)=>{try{const id=await service.createUser(req.session.user.id,req.body);res.redirect('/settings/users?created='+encodeURIComponent(id));}catch(err){return formError(req,res,'new',safeValues(req.body),err);}}));
 router.get('/users',asyncRoute(async(req,res)=>{const q=String(req.query.q||'').slice(0,100),pageNo=Math.max(1,Math.min(1000000,parseInt(req.query.p,10)||1));const where=q?' WHERE u.username LIKE ? OR u.display_name LIKE ?':'';const params=q?['%'+q+'%','%'+q+'%']:[];const [users]=await pool.query('SELECT u.id,u.username,u.display_name,u.position,u.role,u.is_active,u.department_id,d.name department_name,d.is_active department_active FROM users u LEFT JOIN departments d ON d.id=u.department_id'+where+' ORDER BY u.id DESC LIMIT 50 OFFSET '+((pageNo-1)*50),params);const [counts]=await pool.query('SELECT COUNT(*) total FROM users u'+where,params);render(req,res,'list',{users,q,pageNo,total:Number(counts[0].total),created:/^\d+$/.test(String(req.query.created||'')),updated:req.query.updated==='1',voided:req.query.voided==='1'});}));
 router.get('/users/:id/reset-password',asyncRoute(async(req,res)=>{if(!/^\d+$/.test(req.params.id))return res.status(404).send('User not found');const [rows]=await pool.execute('SELECT id,username,display_name FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');render(req,res,'reset',{values:rows[0]});}));
 router.post('/users/:id/reset-password',csrf,asyncRoute(async(req,res)=>{if(req.body.confirm_reset!=='yes')return res.status(400).send('Reset confirmation required');try{await service.resetPassword(req.session.user.id,req.params.id);}catch(err){if(err.status===403||err.status===404)return res.status(err.status).send(err.message);throw err;}if(Number(req.params.id)===Number(req.session.user.id))return req.session.destroy(err=>err?res.status(500).send('Login ပြန်ဝင်ပါ။'):res.redirect('/login'));res.redirect('/settings/users/'+req.params.id+'/edit?reset=1');}));
 router.get('/users/:id/edit' ,asyncRoute(async(req,res)=>{const [rows]=await pool.execute('SELECT id,username,display_name,position,role,department_id,application_access FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');render(req,res,'edit',{values:{...rows[0],role:normalizedRole(rows[0].role)},departments:await departmentOptions(pool,rows[0].department_id),reset:req.query.reset==='1'});}));
 router.post('/users/:id/edit',csrf,asyncRoute(async(req,res)=>{try{await service.updateUser(req.session.user.id,req.params.id,req.body);res.redirect('/settings/users?updated=1');}catch(err){if(err.code&&err.code!=='ER_DUP_ENTRY')throw err;const [rows]=await pool.execute('SELECT id,username FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');return formError(req,res,'edit',{...safeValues(req.body),...rows[0]},err);}}));
 return router;
}
module.exports={createSettingsRouter};
