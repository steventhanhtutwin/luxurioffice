const message='အကောင့်တွင် Issues ရှိနေပါသည်။ Accountant Head ကို ဆက်သွယ်ပါ။';
async function voidUser(pool,actorId,id){
 if(!/^\d{1,20}$/.test(String(id)))throw Object.assign(Error('User မတွေ့ပါ။'),{status:404});
 const c=await pool.getConnection();try{await c.beginTransaction();
 const [admins]=await c.execute("SELECT id FROM users WHERE role='admin' AND is_active=1 ORDER BY id FOR UPDATE");
 if(!admins.some(u=>Number(u.id)===Number(actorId)))throw Object.assign(Error('Admin access required'),{status:403});
 if(Number(actorId)===Number(id))throw Object.assign(Error('မိမိအကောင့်ကို Void လုပ်၍မရပါ။'),{status:403});
 const [rows]=await c.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[id]);const user=rows[0];if(!user)throw Object.assign(Error('User မတွေ့ပါ။'),{status:404});
 if(Number(user.is_active)===1){if(user.role==='admin'&&admins.length<=1)throw Object.assign(Error('အနည်းဆုံး Active Admin တစ်ဦး ရှိရပါမည်။'),{status:403});
 await c.execute('UPDATE users SET is_active=0,password_version=password_version+1 WHERE id=?',[id]);}
 await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
function installUserVoidRoutes({router,pool,render,asyncRoute,csrf}){
 router.get('/users/:id/void',asyncRoute(async(req,res)=>{if(!/^\d{1,20}$/.test(req.params.id))return res.status(404).send('User not found');const [rows]=await pool.execute('SELECT id,username,display_name,is_active FROM users WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('User not found');if(Number(req.params.id)===Number(req.session.user.id))return res.status(403).send('မိမိအကောင့်ကို Void လုပ်၍မရပါ။');render(req,res,'user-void',{values:rows[0]});}));
 router.post('/users/:id/void',csrf,asyncRoute(async(req,res)=>{if(req.body.confirm_void!=='yes')return res.status(400).send('Void confirmation required');try{await voidUser(pool,req.session.user.id,req.params.id);res.redirect('/settings/users?voided=1');}catch(e){if(e.status)return res.status(e.status).send(e.message);throw e;}}));
}
module.exports={message,voidUser,installUserVoidRoutes};
