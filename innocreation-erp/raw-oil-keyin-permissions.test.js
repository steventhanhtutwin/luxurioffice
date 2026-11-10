const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),path=require('path');
const {createRawOilRouter}=require('./raw-oil-routes');
test('Accountant cannot open or submit Raw Oil In or Out; menus hidden but review links stay visible',async()=>{
 const app=express();app.use(express.urlencoded({extended:false}));app.use((req,res,next)=>{req.session={user:{id:2,role:'warehouse_accountant'},csrf:'valid'};next();});
 const group={id:'raw-oil',name:'Raw Oil',icon:'drop',menus:[{id:'in',name:'Raw Oil In'},{id:'out',name:'Raw Oil Out'},{id:'adjustments',name:'Raw Oil Adjustment'},{id:'summary',name:'Raw Oil Balance'}]};
 app.use('/inventory/raw-oil',createRawOilRouter({pool:{},groups:[group]}));const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base='http://127.0.0.1:'+server.address().port;for(const route of ['in','out'])for(const method of ['GET','POST'])assert.equal((await fetch(base+'/inventory/raw-oil/'+route,{method})).status,403);}finally{server.close();}
 const ejs=require('ejs');const html=await ejs.renderFile(path.join(__dirname,'views/inventory.ejs'),{csrf:'test',user:{id:2,role:'warehouse_accountant'},groups:[group],group,page:null});assert(!html.includes('href="/inventory/raw-oil/in"'));assert(!html.includes('href="/inventory/raw-oil/out"'));assert(html.includes('href="/inventory/raw-oil/adjustments"'));assert(html.includes('href="/inventory/raw-oil/summary"'));
});
