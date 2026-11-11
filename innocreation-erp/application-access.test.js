const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),path=require('path');
const {applications,accessFor,submittedAccess,ensureSettingsManager}=require('./application-access');
const {createSettingsService}=require('./settings-service');
function fixture(){let users=[{id:1,username:'owner',display_name:'Owner',role:'admin',is_active:1,password_version:0,application_access:JSON.stringify(applications.map(a=>a.id))},{id:2,username:'manager',display_name:'Manager',role:'staff',is_active:1,password_version:0,application_access:'["settings"]'},{id:3,username:'staff',display_name:'Staff',role:'warehouse_accountant',is_active:1,password_version:0,application_access:'["inventory"]'}];
 const execute=async(sql,p=[])=>{
 if(sql.includes('FROM users WHERE is_active=1 ORDER BY id'))return [users.filter(u=>u.is_active)];
 if(sql.startsWith('SELECT')&&sql.includes('FROM users'))return [users.filter(u=>u.id===Number(p[0])).map(u=>({...u}))];
 if(sql.startsWith('INSERT INTO users')){const id=users.length+1;users.push({id,username:p[0],display_name:p[1],position:p[2],role:p[3],password_hash:p[4],department_id:p[5],application_access:p[6],is_active:1,password_version:0});return [{insertId:id}];}
 if(sql.startsWith('UPDATE users SET application_access')){users.find(u=>u.id===Number(p[1])).application_access=p[0];return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE users SET display_name')){Object.assign(users.find(u=>u.id===Number(p[5])),{display_name:p[0],position:p[1],role:p[2]});return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE users SET password_hash')){users.find(u=>u.id===Number(p[1])).password_hash=p[0];return [{affectedRows:1}];}
 if(sql.startsWith('INSERT INTO raw_oil_transaction_categories'))return [{insertId:1}];
 if(sql.startsWith('INSERT INTO departments'))return [{insertId:1}];
 throw Error(sql);
 };
 const pool={execute,query:async(sql,p)=>sql.includes('COUNT(*)')?[[{total:users.length}]]:sql.includes('departments')?[[]]:[users],getConnection:async()=>{let snapshot;return {execute,beginTransaction:async()=>{snapshot=structuredClone(users);},commit:async()=>{},rollback:async()=>{users=snapshot;},release:()=>{}};}};
 return {pool,get users(){return users;}};
}
test('Application access validates one/multiple/all/none, and explicit admin denial is respected',()=>{
 assert.deepEqual(submittedAccess({application_access_present:'1',application_access:'settings'}),['settings']);assert.deepEqual(submittedAccess({application_access_present:'1'}),[]);
 assert.deepEqual(submittedAccess({application_access_present:'1',application_access:['inventory','settings','inventory']}),['inventory','settings']);
 assert.throws(()=>submittedAccess({application_access_present:'1',application_access:['bogus']}));assert.deepEqual(accessFor({role:'admin',application_access:'[]'}),[]);assert.equal(accessFor({role:'admin',application_access:null}).length,0);assert.deepEqual(accessFor({application_access:'broken'}),[]);
 assert.throws(()=>ensureSettingsManager([{id:1,role:'admin',is_active:1,application_access:'["settings"]'}],1,[]));
});
test('Non-admin with Settings access can manage user permissions, categories, departments and reset passwords',async()=>{
 const f=fixture(),s=createSettingsService(f.pool);const body={username:'new',display_name:'New Staff',position:'Officer',role:'staff',password:'abcde',confirm_password:'abcde',application_access_present:'1',application_access:['packaging','purchasing']};
 const id=await s.createUser(2,body);assert.deepEqual(accessFor(f.users.find(u=>u.id===id)),['packaging','purchasing']);
 await s.updateUser(2,id,{...body,application_access:applications.map(a=>a.id)});assert.equal(accessFor(f.users.find(u=>u.id===id)).length,5);
 await s.updateUser(2,id,{...body,application_access:undefined});assert.deepEqual(accessFor(f.users.find(u=>u.id===id)),[]);
 await s.resetPassword(2,id);assert(f.users.find(u=>u.id===id).password_hash);
 await require('./inventory-settings').createInventorySettingsService(f.pool).createCategory(2,{name:'Usage'});
 await require('./departments').createDepartmentService(f.pool).save(2,'create',null,{name:'Warehouse'});
 await assert.rejects(s.createUser(3,body),e=>e.status===403);
 f.users[0].application_access='[]';await assert.rejects(s.updateUser(2,2,{display_name:'Manager',position:'',role:'staff',application_access_present:'1'}),e=>e.status===403);
});
test('Live access checks protect every application URL including APIs, exports, POST and Settings; revoke without logout',async()=>{
 const {accountGuard}=require('./profile-service'),f=fixture(),app=express();app.use(express.urlencoded({extended:false}));app.set('view engine','ejs');app.set('views',path.join(__dirname,'views'));
 app.use((req,res,next)=>{req.session={user:{id:Number(req.get('x-user')||3),password_version:0},csrf:'token'};res.locals.csrf='token';next();});app.use(accountGuard(f.pool));
 app.get('/dashboard',(req,res)=>res.render('dashboard',{user:req.session.user,modules:require('./modules')}));
 app.use('/settings',require('./settings-routes').createSettingsRouter({pool:f.pool}));app.use((req,res)=>res.send('authorized'));
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{for(const endpoint of ['/modules/packaging','/modules/%70ackaging','/modules/production','/modules/purchasing','/settings/users'])assert.equal((await fetch(base+endpoint)).status,403);
 for(const endpoint of ['/inventory/raw-oil/api/items/001','/inventory/raw-oil/transactions/export.xlsx','/inventory/finished-goods/documents/1/pdf'])assert.equal((await fetch(base+endpoint)).status,200);
 let html=await(await fetch(base+'/dashboard')).text();assert(html.includes('href="/modules/inventory"'));assert(!html.includes('href="/modules/packaging"'));assert(!html.includes('href="/settings"'));
 f.users[2].application_access='["packaging","settings"]';assert.equal((await fetch(base+'/inventory/raw-oil/in',{method:'POST'})).status,403);assert.equal((await fetch(base+'/modules/packaging')).status,200);assert.equal((await fetch(base+'/settings/users')).status,200);
 html=await(await fetch(base+'/dashboard')).text();assert(html.includes('href="/settings"'));assert(!html.includes('href="/modules/inventory"'));
 assert.equal((await fetch(base+'/settings/users/4/reset-password',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'_csrf=bad&confirm_reset=yes'})).status,403);
 const form=await(await fetch(base+'/settings/users/3/edit')).text();for(const name of ['Inventory','Packaging','Production','Purchasing','Settings','Select All'])assert(form.includes(name));
 f.users[2].application_access='[]';assert.equal((await fetch(base+'/settings/users')).status,403);assert.equal((await fetch(base+'/modules/packaging')).status,403);
 }finally{server.close();}
});
