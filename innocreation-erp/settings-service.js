const {hashPassword}=require('./password');
const {roles}=require('./user-roles');
function fields(body){
 if(typeof body.display_name!=='string'||!body.display_name.trim()||body.display_name.trim().length>150)throw new Error('Staff Name ကို ဖြည့်ပါ။ အများဆုံး ၁၅၀ လုံး ဖြစ်ရပါမည်။');
 if(typeof body.position!=='string'||body.position.trim().length>150)throw new Error('Position ကို အများဆုံး ၁၅၀ လုံး ဖြည့်ပါ။');
 if(!roles.some(role=>role.value===body.role))throw new Error('User Role ကို စာရင်းထဲမှ ရွေးပါ။');
 return {display_name:body.display_name.trim(),position:body.position.trim(),role:body.role};
}
async function lockAdmin(conn,actorId){const [admins]=await conn.execute("SELECT id FROM users WHERE role='admin' AND is_active=1 ORDER BY id FOR UPDATE");if(!admins.some(row=>Number(row.id)===Number(actorId))){const err=new Error('Admin access required');err.status=403;throw err;}return admins;}
function createSettingsService(pool){return {
 async createUser(actorId,body){const values=fields(body);
 if(typeof body.username!=='string'||!body.username.trim()||body.username.trim().length>100||/\s/.test(body.username.trim()))throw new Error('User Name ကို Space မပါဘဲ အများဆုံး ၁၀၀ လုံး ဖြည့်ပါ။');
 if(typeof body.password!=='string'||body.password.length<5||body.password.length>256)throw new Error('Password ကို အနည်းဆုံး ၅ လုံး၊ အများဆုံး ၂၅၆ လုံး ဖြည့်ပါ။');
 if(body.password!==body.confirm_password)throw new Error('Password နှင့် Confirm Password မတူပါ။');
 const hash=await hashPassword(body.password);const conn=await pool.getConnection();try{await conn.beginTransaction();await lockAdmin(conn,actorId);const [result]=await conn.execute('INSERT INTO users (username,display_name,position,role,password_hash) VALUES (?,?,?,?,?)',[body.username.trim(),values.display_name,values.position,values.role,hash]);await conn.commit();return result.insertId;}catch(err){await conn.rollback();throw err;}finally{conn.release();}
 },
 async updateUser(actorId,id,body){const values=fields(body);if(!/^\d+$/.test(String(id)))throw new Error('User မတွေ့ပါ။');const conn=await pool.getConnection();try{await conn.beginTransaction();const admins=await lockAdmin(conn,actorId);const [rows]=await conn.execute('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE',[id]);const user=rows[0];if(!user)throw new Error('User မတွေ့ပါ။');
 if(Number(id)===Number(actorId)&&values.role!=='admin')throw new Error('မိမိကိုယ်ပိုင် Admin Role ကို ဒီနေရာမှ ပြောင်း၍ မရပါ။');
 if(user.role==='admin'&&Number(user.is_active)===1&&values.role!=='admin'&&admins.length<=1)throw new Error('အနည်းဆုံး Admin တစ်ဦး ရှိရပါမည်။');
 const changed=user.role!==values.role?1:0;await conn.execute('UPDATE users SET display_name=?,position=?,role=?,password_version=password_version+? WHERE id=?',[values.display_name,values.position,values.role,changed,id]);await conn.commit();
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
 }
};}
module.exports={createSettingsService};
