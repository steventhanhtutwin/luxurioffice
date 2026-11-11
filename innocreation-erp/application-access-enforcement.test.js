const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),path=require('node:path');
const {applicationAccessGuard,accessFor,applications}=require('./application-access');
test('No permission means no access even for Admin or missing legacy permission fields',()=>{for(const role of ['admin','warehouse_accountant','inventory'])for(const value of [undefined,null,'[]','', 'invalid'])assert.deepEqual(accessFor({role,application_access:value}),[]);});
test('Fresh permission guard overrides old or stale all-app sessions and blocks URLs until explicitly granted',async()=>{
 let stored='[]',queries=0;const app=express();app.set('view engine','ejs');app.set('views',path.join(__dirname,'views'));
 app.use((req,res,next)=>{req.session={user:{id:3,name:'Zin Thet',username:'zinthet',role:'warehouse_accountant',app_access:applications.map(a=>a.id)}};req.account={id:3,role:'warehouse_accountant',is_active:1};res.locals.csrf='token';next();});
 app.use(applicationAccessGuard({execute:async()=>{queries++;return [[{id:3,is_active:1,application_access:stored}]];}}));
 app.get('/dashboard',(req,res)=>res.render('dashboard',{user:req.session.user,modules:require('./modules')}));app.use((req,res)=>res.send('allowed'));
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{const html=await(await fetch(base+'/dashboard')).text();for(const id of applications.map(a=>a.id))assert(!html.includes('href="'+(id==='settings'?'/settings':'/modules/'+id)+'"'));assert(html.includes('Application မရှိသေးပါ'));
 for(const endpoint of ['/modules/inventory','/modules/packaging','/modules/production','/modules/purchasing','/settings','/inventory/raw-oil/transactions/export.xlsx','/inventory/raw-oil/api/items/001','/inventory/raw-oil/in'])for(const method of ['GET','POST'])assert.equal((await fetch(base+endpoint,{method})).status,403);
 stored='["inventory"]';assert.equal((await fetch(base+'/modules/inventory')).status,200);assert.equal((await fetch(base+'/modules/packaging')).status,403);
 stored='[]';assert.equal((await fetch(base+'/modules/inventory')).status,403);assert(queries>=20);
 }finally{server.close();}
});
test('Enforcement installer preserves listen/proxy settings and can run twice',()=>{const {patch}=require('./apply-access-enforcement-fix');const source="app.set('trust proxy',1); app.use(accountGuard(pool)); app.listen(port,'0.0.0.0');";const next=patch(source);assert(next.includes("app.set('trust proxy',1)"));assert(next.includes("app.listen(port,'0.0.0.0')"));assert(next.includes('applicationAccessGuard(pool)'));assert.equal(patch(next),next);assert.throws(()=>patch('unknown server'));});
