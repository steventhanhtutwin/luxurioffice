const {hashPassword,verifyPassword}=require('./password');
function createProfileService(pool){return {
 async changePassword(userId,body){
 const {current_password:current,new_password:password,confirm_password:confirm}=body;
 if(typeof current!=='string'||!current||current.length>256)throw new Error('လက်ရှိ Password ကို ဖြည့်ပါ။');
 if(typeof password!=='string'||password.length<5||password.length>256)throw new Error('Password အသစ်ကို အနည်းဆုံး ၅ လုံး၊ အများဆုံး ၂၅၆ လုံး ဖြည့်ပါ။');
 if(typeof confirm!=='string'||password!==confirm)throw new Error('Password အသစ်နှင့် Confirm Password မတူပါ။');
 const [rows]=await pool.execute('SELECT id,password_hash,password_version FROM users WHERE id=? AND is_active=1 LIMIT 1',[userId]);const user=rows[0];
 if(!user)throw new Error('Account မရရှိပါ။ Login ပြန်ဝင်ပါ။');
 if(!await verifyPassword(current,user.password_hash))throw new Error('လက်ရှိ Password မမှန်ပါ။');
 if(current===password)throw new Error('လက်ရှိ Password နှင့် မတူသော Password အသစ်ကို ရွေးပါ။');
 const hash=await hashPassword(password);
 const [result]=await pool.execute('UPDATE users SET password_hash=?,password_version=password_version+1 WHERE id=? AND password_hash=? AND password_version=? AND is_active=1',[hash,userId,user.password_hash,user.password_version]);
 if(result.affectedRows!==1)throw new Error('Account ပြောင်းလဲသွားပါသည်။ Login ပြန်ဝင်ပြီး စမ်းပါ။');
 }
};}
function accountGuard(pool){return async(req,res,next)=>{try{
 if(!req.session.user)return next();
 const [rows]=await pool.execute('SELECT id,username,display_name,position,role,password_version,is_active FROM users WHERE id=? LIMIT 1',[req.session.user.id]);const user=rows[0];
 if(!user||Number(user.is_active)!==1||req.session.user.password_version===undefined||Number(req.session.user.password_version)!==Number(user.password_version))return req.session.destroy(err=>{if(err)return next(err);res.clearCookie('innocreation.sid');res.redirect('/login'+(user&&Number(user.is_active)!==1?'?account_void=1':''));});
 req.account=user;req.session.user={id:user.id,username:user.username,name:user.display_name,role:user.role,password_version:Number(user.password_version)};next();
 }catch(err){next(err);}};}
module.exports={createProfileService,accountGuard};
