const applications=Object.freeze([{id:'inventory',name:'Inventory'},{id:'packaging',name:'Packaging'},{id:'production',name:'Production'},{id:'purchasing',name:'Purchasing'},{id:'settings',name:'Settings'}]);
const ids=applications.map(a=>a.id);
function accessFor(user){
 // Missing or invalid permission data grants no applications.
 if(user.application_access==null)return [];
 try{const values=typeof user.application_access==='string'?JSON.parse(user.application_access):user.application_access;return Array.isArray(values)?ids.filter(id=>values.includes(id)):[];}catch{return [];}
}
function submittedAccess(body,{create=false}={}){
 if(body.application_access_present!=='1')return create?[]:null;
 const values=body.application_access===undefined?[]:Array.isArray(body.application_access)?body.application_access:[body.application_access];
 if(values.some(id=>typeof id!=='string'||!ids.includes(id)))throw Error('Application Access ကို စာရင်းထဲမှ ရွေးပါ။');
 return ids.filter(id=>values.includes(id));
}
function enforceApplicationAccess(req,res,next){
 if(!req.session?.user)return next();const user=req.session.user;
 const access=Array.isArray(user.app_access)?user.app_access:accessFor(user);user.app_access=access;
 res.locals ||= {};res.locals.applicationAccess=access;
 let app,url;try{url=decodeURIComponent(req.path||'/').toLowerCase();}catch{return res.status(400).send('Invalid URL');}
 if(/^\/settings(?:\/|$)/.test(url))app='settings';else if(/^\/inventory(?:\/|$)/.test(url))app='inventory';else if(/^\/modules(?:\/|$)/.test(url)){const id=url.split('/')[2];if(ids.includes(id))app=id;}
 if(app&&!access.includes(app))return res.status(403).type('text').send('ဤ Application ကို အသုံးပြုခွင့် မရှိပါ။ Settings တာဝန်ခံကို ဆက်သွယ်ပါ။');next();
}
function applicationAccessGuard(pool){return async(req,res,next)=>{try{
 if(!req.session?.user)return next();
 let user=req.account;
 if(!user||Number(user.id)!==Number(req.session.user.id)||!Object.hasOwn(user,'application_access')){
 const [rows]=await pool.execute('SELECT id,is_active,application_access FROM users WHERE id=? LIMIT 1',[req.session.user.id]);user=rows[0];
 }
 req.session.user.app_access=user&&Number(user.is_active)===1?accessFor(user):[];
 return enforceApplicationAccess(req,res,next);
 }catch(err){req.session.user.app_access=[];next(err);}};}
async function lockSettingsActor(conn,actorId){
 const [users]=await conn.execute('SELECT id,role,is_active,application_access FROM users WHERE is_active=1 ORDER BY id FOR UPDATE');
 const actor=users.find(u=>Number(u.id)===Number(actorId)&&Number(u.is_active)===1);if(!actor||!accessFor(actor).includes('settings'))throw Object.assign(Error('Settings access required'),{status:403});
 return users;
}
function ensureSettingsManager(users,id,newAccess){
 if(!newAccess.includes('settings')&&!users.some(u=>Number(u.id)!==Number(id)&&accessFor(u).includes('settings')))throw Object.assign(Error('အနည်းဆုံး Settings Access ရှိသော Active User တစ်ဦး ကျန်ရှိရပါမည်။'),{status:403});
}
module.exports={applications,accessFor,submittedAccess,applicationAccessGuard,enforceApplicationAccess,lockSettingsActor,ensureSettingsManager};
