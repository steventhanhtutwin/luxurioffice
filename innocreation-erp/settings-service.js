const {accessFor,submittedAccess,lockSettingsActor,ensureSettingsManager}=require('./application-access');
const {selectedDepartment}=require('./departments');
const {hashPassword}=require('./password');
const {roles}=require('./user-roles');
function fields(body){
 if(typeof body.display_name!=='string'||!body.display_name.trim()||body.display_name.trim().length>150)throw new Error('Staff Name ကို ဖြည့်ပါ။ အများဆုံး ၁၅၀ လုံး ဖြစ်ရပါမည်။');
 if(typeof body.position!=='string'||body.position.trim().length>150)throw new Error('Position ကို အများဆုံး ၁၅၀ လုံး ဖြည့်ပါ။');
 if(!roles.some(role=>role.value===body.role))throw new Error('User Role ကို စာရင်းထဲမှ ရွေးပါ။');
 return {display_name:body.display_name.trim(),position:body.position.trim(),role:body.role};
}
async function lockAdmin(conn,actorId){const users=await lockSettingsActor(conn,actorId);return users.filter(u=>u.role==='admin');}
function createSettingsService(pool){return {
 async resetPassword(actorId,id){
 if(!/^\d+$/.test(String(id)))throw Object.assign(new Error('User မတွေ့ပါ။'),{status:404});
 const hash=await hashPassword('123456');const conn=await pool.getConnection();try{await conn.beginTransaction();await lockAdmin(conn,actorId);
 const [rows]=await conn.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[id]);if(!rows.length)throw Object.assign(new Error('User မတွေ့ပါ။'),{status:404});
 await conn.execute('UPDATE users SET password_hash=?,password_version=password_version+1 WHERE id=?',[hash,id]);await conn.commit();
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
 },
 async createUser(actorId,body){const values=fields(body),access=submittedAccess(body,{create:true});
 if(typeof body.username!=='string'||!body.username.trim()||body.username.trim().length>100||/\s/.test(body.username.trim()))throw new Error('User Name ကို Space မပါဘဲ အများဆုံး ၁၀၀ လုံး ဖြည့်ပါ။');
 if(typeof body.password!=='string'||body.password.length<5||body.password.length>256)throw new Error('Password ကို အနည်းဆုံး ၅ လုံး၊ အများဆုံး ၂၅၆ လုံး ဖြည့်ပါ။');
 if(body.password!==body.confirm_password)throw new Error('Password နှင့် Confirm Password မတူပါ။');
 const hash=await hashPassword(body.password);const conn=await pool.getConnection();try{await conn.beginTransaction();await lockAdmin(conn,actorId);const departmentId=await selectedDepartment(conn,body.department_id);const [result]=await conn.execute('INSERT INTO users (username,display_name,position,role,password_hash,department_id,application_access) VALUES (?,?,?,?,?,?,?)',[body.username.trim(),values.display_name,values.position,values.role,hash,departmentId,JSON.stringify(access)]);await conn.commit();return result.insertId;}catch(err){await conn.rollback();throw err;}finally{conn.release();}
 },
 async updateUser(actorId,id,body){const values=fields(body);if(!/^\d+$/.test(String(id)))throw new Error('User မတွေ့ပါ။');const conn=await pool.getConnection();try{await conn.beginTransaction();const activeUsers=await lockSettingsActor(conn,actorId),admins=activeUsers.filter(u=>u.role==='admin');const [rows]=await conn.execute('SELECT id,role,is_active,department_id,application_access FROM users WHERE id=? FOR UPDATE',[id]);const user=rows[0];if(!user)throw new Error('User မတွေ့ပါ။');
 if(user.role==='admin'&&Number(id)===Number(actorId)&&values.role!=='admin')throw new Error('မိမိကိုယ်ပိုင် Admin Role ကို ဒီနေရာမှ ပြောင်း၍ မရပါ။');
 if(user.role==='admin'&&Number(user.is_active)===1&&values.role!=='admin'&&admins.length<=1)throw new Error('အနည်းဆုံး Admin တစ်ဦး ရှိရပါမည်။');
 const departmentId=await selectedDepartment(conn,body.department_id,user.department_id);
 const selected=submittedAccess(body);if(selected!==null){if(Number(user.is_active)===1)ensureSettingsManager(activeUsers,id,selected);await conn.execute('UPDATE users SET application_access=? WHERE id=?',[JSON.stringify(selected),id]);}
 const changed=user.role!==values.role?1:0;await conn.execute('UPDATE users SET display_name=?,position=?,role=?,password_version=password_version+?,department_id=? WHERE id=?',[values.display_name,values.position,values.role,changed,departmentId,id]);await conn.commit();
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
 }
};}
module.exports={createSettingsService};
