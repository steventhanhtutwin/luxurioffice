const {lockSettingsActor}=require('./application-access');
const {transactionCategory}=require('./raw-oil-transaction-category');
function createInventorySettingsService(pool){return {async createCategory(actorId,body){const name=transactionCategory(body.name),conn=await pool.getConnection();try{await conn.beginTransaction();await lockSettingsActor(conn,actorId);await conn.execute('INSERT INTO raw_oil_transaction_categories (name,created_by) VALUES (?,?)',[name,actorId]);await conn.commit();}catch(err){await conn.rollback();throw err;}finally{conn.release();}},async updateCategory(actorId,id,body){
 if(!/^\d{1,10}$/.test(String(id)))throw Object.assign(Error('Category not found'),{status:404});
 const name=transactionCategory(body.name),conn=await pool.getConnection();try{await conn.beginTransaction();await lockSettingsActor(conn,actorId);
 const [rows]=await conn.execute('SELECT id,name,is_active FROM raw_oil_transaction_categories WHERE id=? FOR UPDATE',[id]);const category=rows[0];if(!category)throw Object.assign(Error('Category not found'),{status:404});
 if(category.name.trim().toLowerCase()==='adjustment')throw Object.assign(Error('Adjustment Category ကို ပြောင်းခွင့်မရှိပါ။'),{status:403});
 if(Number(category.is_active??1)===0)throw Object.assign(Error('Voided Category ကို Edit လုပ်၍ မရပါ။'),{status:403});
 if(body.original_name!==category.name)throw Object.assign(Error('Category ပြောင်းလဲသွားပါသည်။ Reload လုပ်ပြီး ပြန်စမ်းပါ။'),{status:409});
 await conn.execute('UPDATE raw_oil_transaction_categories SET name=? WHERE id=?',[name,id]);await conn.commit();
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
 },async voidCategory(actorId,id,body){
 if(!/^\d{1,10}$/.test(String(id)))throw Object.assign(Error('Category not found'),{status:404});
 if(body.confirm_void!=='yes')throw Object.assign(Error('Void ကို အတည်ပြုပါ။'),{status:400});
 const conn=await pool.getConnection();try{await conn.beginTransaction();await lockSettingsActor(conn,actorId);
 const [rows]=await conn.execute('SELECT id,name,is_active FROM raw_oil_transaction_categories WHERE id=? FOR UPDATE',[id]);const category=rows[0];if(!category)throw Object.assign(Error('Category not found'),{status:404});
 if(category.name.trim().toLowerCase()==='adjustment')throw Object.assign(Error('Adjustment Category ကို Void လုပ်ခွင့်မရှိပါ။'),{status:403});
 if(Number(category.is_active??1)===0){await conn.commit();return;}
 if(body.original_name!==category.name)throw Object.assign(Error('Category ပြောင်းလဲသွားပါသည်။ Reload လုပ်ပါ။'),{status:409});
 await conn.execute('UPDATE raw_oil_transaction_categories SET is_active=0,voided_by=?,voided_at=CURRENT_TIMESTAMP WHERE id=?',[actorId,id]);await conn.commit();
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}

 }};}
function installInventorySettings({router,pool,render,asyncRoute,csrf}){const service=createInventorySettingsService(pool);const page=async(req,res,error='',status=200)=>{const q=String(req.query.q||'').slice(0,100),p=Math.max(1,Math.min(1000000,parseInt(req.query.p,10)||1)),where=q?' WHERE c.name LIKE ?':'',params=q?['%'+q+'%']:[];const [categories]=await pool.query('SELECT c.id,c.name,c.is_active,c.voided_at,c.created_at,u.display_name created_name,vu.display_name voided_name FROM raw_oil_transaction_categories c LEFT JOIN users u ON u.id=c.created_by LEFT JOIN users vu ON vu.id=c.voided_by'+where+' ORDER BY c.name LIMIT 50 OFFSET '+((p-1)*50),params);const [counts]=await pool.query('SELECT COUNT(*) total FROM raw_oil_transaction_categories c'+where,params);render(req,res,'categories',{categories,q,pageNo:p,total:Number(counts[0].total),categoryName:error&&typeof req.body.name==='string'?req.body.name:'',created:req.query.created==='1',updated:req.query.updated==='1',voided:req.query.voided==='1',error},status);};
 const edit=async(req,res,error='',status=200)=>{if(!/^\d{1,10}$/.test(req.params.id))return res.status(404).send('Category not found');const [rows]=await pool.execute('SELECT id,name,is_active FROM raw_oil_transaction_categories WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('Category not found');if(Number(rows[0].is_active??1)===0)return res.status(403).send('Category is voided');if(rows[0].name.trim().toLowerCase()==='adjustment')return res.status(403).send('Adjustment Category is locked');return render(req,res,'category-edit',{category:rows[0],categoryName:error&&typeof req.body.name==='string'?req.body.name:rows[0].name,error},status);};
 router.get('/inventory/raw-oil/categories/:id/void',asyncRoute(async(req,res)=>{if(!/^\d{1,10}$/.test(req.params.id))return res.status(404).send('Category not found');const [rows]=await pool.execute('SELECT id,name,is_active FROM raw_oil_transaction_categories WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).send('Category not found');if(rows[0].name.trim().toLowerCase()==='adjustment')return res.status(403).send('Adjustment Category is locked');render(req,res,'category-void',{category:rows[0]});}));
 router.post('/inventory/raw-oil/categories/:id/void',csrf,asyncRoute(async(req,res)=>{try{await service.voidCategory(req.session.user.id,req.params.id,req.body);res.redirect('/settings/inventory/raw-oil/categories?voided=1');}catch(err){if(err.code)throw err;res.status(err.status||400).send(err.message);}}));
 router.get('/inventory/raw-oil/categories/:id/edit',asyncRoute((req,res)=>edit(req,res)));
 router.post('/inventory/raw-oil/categories/:id/edit',csrf,asyncRoute(async(req,res)=>{try{await service.updateCategory(req.session.user.id,req.params.id,req.body);res.redirect('/settings/inventory/raw-oil/categories?updated=1');}catch(err){if(err.status===403||err.status===404)return res.status(err.status).send(err.message);if(err.code&&err.code!=='ER_DUP_ENTRY')throw err;return edit(req,res,err.code==='ER_DUP_ENTRY'?'ဒီ Category အမည် ရှိပြီးသားဖြစ်ပါသည်။':err.message,err.code==='ER_DUP_ENTRY'||err.status===409?409:400);}}));
 router.get('/user-management',(req,res)=>render(req,res,'user-management'));
 router.get('/inventory',(req,res)=>render(req,res,'inventory-home'));
 router.get('/inventory/raw-oil/categories',asyncRoute((req,res)=>page(req,res)));
 router.post('/inventory/raw-oil/categories',csrf,asyncRoute(async(req,res)=>{try{await service.createCategory(req.session.user.id,req.body);res.redirect('/settings/inventory/raw-oil/categories?created=1');}catch(err){if(err.status===403)return res.status(403).send('Admin access required');if(err.code&&err.code!=='ER_DUP_ENTRY')throw err;return page(req,res,err.code==='ER_DUP_ENTRY'?'ဒီ Transaction Category ရှိပြီးသား ဖြစ်ပါသည်။':err.message,err.code==='ER_DUP_ENTRY'?409:400);}}));
}
module.exports={createInventorySettingsService,installInventorySettings};
