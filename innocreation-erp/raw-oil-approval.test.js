const test=require('node:test'),assert=require('node:assert/strict');
const {approveAdjustment,installApprovalRoutes}=require('./raw-oil-approval');
const {activeTransactions}=require('./raw-oil-void-service');
const {transactionFilters}=require('./raw-oil-filters');
function fixture(direction='IN',supervisorSubmitted=false){
 let state={status:supervisorSubmitted?'PENDING_ACCOUNTANT':'PENDING_SUPERVISOR',supervisor_by:supervisorSubmitted?2:null},days=[],fail=false,tail=Promise.resolve();
 const users=[{id:1,role:'inventory',is_active:1},{id:2,role:'warehouse_supervisor',is_active:1},{id:3,role:'warehouse_accountant',is_active:1}];
 const execute=async(sql,p)=>{
 if(sql.startsWith('SELECT transaction_id FROM raw_oil_voucher_lines'))return [[]];

 if(sql.startsWith('SELECT item_id'))return [[{item_id:1}]];
 if(sql.startsWith('SELECT id,role'))return [users.filter(u=>u.id===p[0])];
 if(sql.startsWith('SELECT * FROM raw_oil_items'))return [[{id:1,opening_grams:'100.000'}]];
 if(sql.startsWith('SELECT t.*'))return [[{id:9,created_by:supervisorSubmitted?2:1,day:'2026-11-10',qty_grams:'70.000',direction,approval_status:state.status,supervisor_by:state.supervisor_by}]];
 if(sql.startsWith('SELECT DATE_FORMAT')){assert(sql.includes(activeTransactions));return [days];}
 if(sql.startsWith('UPDATE raw_oil_adjustment_approvals')){if(fail)throw Error('write failed');state.status=p[0];if(sql.includes('supervisor_by'))state.supervisor_by=p[1];return [{affectedRows:1}];}
 throw Error(sql);
 };
 const pool={execute,getConnection:async()=>{let unlock;const before=tail;tail=new Promise(r=>unlock=r);let snapshot;return {execute,beginTransaction:async()=>{await before;snapshot={...state};},commit:async()=>{},rollback:async()=>{state=snapshot;},release:()=>unlock()};}};
 return {pool,users,get state(){return state;},set days(v){days=v;},set fail(v){fail=v;}};
}
test('IN and OUT adjustments need ordered separate approvals; duplicate final approvals cannot repost',async()=>{
 for(const direction of ['IN','OUT']){const f=fixture(direction);
 await assert.rejects(approveAdjustment(f.pool,3,9,'approve'),/Reload/);
 await assert.rejects(approveAdjustment(f.pool,1,9,'approve'),e=>e.status===403);
 await approveAdjustment(f.pool,2,9,'approve');assert.equal(f.state.status,'PENDING_ACCOUNTANT');
 const results=await Promise.allSettled([approveAdjustment(f.pool,3,9,'approve'),approveAdjustment(f.pool,3,9,'approve')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.state.status,'APPROVED');
 }
});
test('pending OUT is revalidated against newly spent stock; failed approval rolls back',async()=>{
 const f=fixture('OUT');await approveAdjustment(f.pool,2,9,'approve');f.days=[{day:'2026-11-10',delta:'-50.000'}];
 await assert.rejects(approveAdjustment(f.pool,3,9,'approve'));assert.equal(f.state.status,'PENDING_ACCOUNTANT');
 f.days=[];f.fail=true;await assert.rejects(approveAdjustment(f.pool,3,9,'approve'),/write failed/);assert.equal(f.state.status,'PENDING_ACCOUNTANT');
});
test('rejected adjustments stay excluded; inactive and self approvers are denied',async()=>{
 const f=fixture();await approveAdjustment(f.pool,2,9,'reject');assert.equal(f.state.status,'REJECTED');await assert.rejects(approveAdjustment(f.pool,3,9,'approve'));
 const self=fixture();self.users[0].role='warehouse_supervisor';await assert.rejects(approveAdjustment(self.pool,1,9,'approve'),e=>e.status===403);
 self.users[1].is_active=0;await assert.rejects(approveAdjustment(self.pool,2,9,'approve'),e=>e.status===403);
 assert.match(activeTransactions,/raw_oil_adjustment_approvals/);assert.match(transactionFilters({}).where,/status<>'APPROVED'/);
});
test('approval page renders review controls and form CSRF is enforced',async()=>{
 const express=require('express'),path=require('node:path'),{createRawOilRouter}=require('./raw-oil-routes');const app=express();
 app.set('view engine','ejs');app.set('views',path.join(__dirname,'views'));app.use(express.urlencoded({extended:false}));
 app.use((req,res,next)=>{req.session={user:{id:2,role:'warehouse_supervisor'},csrf:'valid'};res.locals.csrf='valid';next();});
 const pool={query:async sql=>sql.startsWith('SELECT COUNT')?[[{total:1}]]:[[{id:9,created_by:1,approval_status:'PENDING_SUPERVISOR',direction:'OUT',qty_grams:'1.000',name:'Oil',code:'001',day:'2026-11-10',voucher:'ROO-000001',remark:'Count',entered_by:'Operator'}]]};
 app.use('/inventory/raw-oil',createRawOilRouter({pool,groups:[{id:'raw-oil',menus:[{id:'adjustments',name:'Raw Oil Adjustment'}]}]}));
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const url='http://127.0.0.1:'+server.address().port;
 const res=await fetch(url+'/inventory/raw-oil/adjustments');assert.equal(res.status,200);const html=await res.text();assert(html.includes('Pending Supervisor'));assert(html.includes('/adjustments/9/approve'));assert(html.includes('Approve'));
 assert.equal((await fetch(url+'/inventory/raw-oil/adjustments/9/approve',{method:'POST'})).status,403);
 }finally{server.close();}
});

test('Supervisor-created IN and OUT adjustments need only separate Accountant approval',async()=>{
 for(const direction of ['IN','OUT']){const f=fixture(direction,true);await assert.rejects(approveAdjustment(f.pool,2,9,'approve'));await approveAdjustment(f.pool,3,9,'approve');assert.equal(f.state.status,'APPROVED');}
});
