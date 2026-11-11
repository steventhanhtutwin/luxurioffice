const {test}=require('node:test');const assert=require('node:assert/strict');
const {grams,decimal,date,balance,checkTimeline}=require('./raw-oil-values');
const {createService}=require('./raw-oil-service');
test('gram quantities retain exact decimal values and reject invalid inputs',()=>{assert.equal(decimal(grams('0.001')),'0.001');assert.equal(decimal(grams('81.55')),'81.550');assert.equal(balance('100.000','0.200','0.100'),100100n);for(const value of ['0','-1','1.2345','1e3','NaN','Infinity','','1000000000000'])assert.throws(()=>grams(value));assert.equal(grams('0',{zero:true}),0n);assert.throws(()=>date('2026-02-30'));assert.equal(date('2026-11-08'),'2026-11-08');});
test('backdated stock out cannot borrow stock received later',()=>{assert.throws(()=>checkTimeline('100.000',[{day:'2026-11-10',delta:'100.000'}],'2026-11-05','OUT',150000n));assert.equal(checkTimeline('100.000',[{day:'2026-11-10',delta:'100.000'}],'2026-11-05','OUT',50000n),150000n);});
function fixture(opening='100.000',failOnce=false,categoryNames=['Purchase','Return','Adjustment'],actorRole='inventory'){
 let sequence={RAW_OIL_IN:1n,RAW_OIL_OUT:1n};let rows=[],nextId=1,unlock=Promise.resolve();const item={id:1,code:'001',opening_grams:opening,opening_date:'2026-11-01'};
 const sum=direction=>decimal(rows.filter(r=>!r.pending&&r.direction===direction).reduce((n,r)=>n+grams(r.qty),0n));
 const query=async(sql,p=[])=>{
 if(sql.startsWith('SELECT id,role,is_active FROM users'))return [[{id:p[0],role:actorRole,is_active:1}]];
 if(sql.startsWith('INSERT INTO raw_oil_adjustment_approvals')){const row=rows.find(r=>r.id===p[0]);row.pending=true;row.approval_status=sql.includes('PENDING_ACCOUNTANT')?'PENDING_ACCOUNTANT':'PENDING_SUPERVISOR';row.supervisor_by=p[1]||null;return [{affectedRows:1}];}
 if(sql.startsWith('SELECT name FROM raw_oil_transaction_categories'))return [categoryNames.filter(n=>n.toLowerCase()===p[0].toLowerCase()).map(name=>({name}))];
 if(sql.startsWith('SELECT next_value'))return [[{next_value:sequence[p[0]].toString()}]];
 if(sql.startsWith('UPDATE raw_oil_sequences')){sequence[p[1]]=BigInt(p[0]);return [{affectedRows:1}];}
 if(sql.startsWith('SELECT * FROM raw_oil_items'))return [[item]];
 if(sql.startsWith('SELECT id FROM raw_oil_transactions WHERE request_key'))return [rows.filter(r=>r.key===p[0]).map(r=>({id:r.id}))];
 if(sql.startsWith('INSERT IGNORE INTO raw_oil_places'))return [{affectedRows:1}];
 if(sql.startsWith('SELECT id FROM raw_oil_items'))return [[{id:1}]];
 if(sql.startsWith('SELECT id FROM raw_oil_places'))return [[{id:1}]];
 if(sql.startsWith('SELECT COALESCE'))return [[{stock_in:sum('IN'),stock_out:sum('OUT')}]];
 if(sql.startsWith('SELECT DATE_FORMAT')){const totals=new Map();for(const row of rows.filter(r=>!r.pending))totals.set(row.day,(totals.get(row.day)||0n)+(row.direction==='IN'?grams(row.qty):-grams(row.qty)));return [[...totals].sort().map(([day,n])=>({day,delta:n<0n?'-'+decimal(-n):decimal(n)}))];}
 if(sql.startsWith('INSERT INTO raw_oil_transactions')){if(failOnce){failOnce=false;throw Error('Simulated write failure');}const row={transaction_category:p[9],voucher:p[2],id:nextId++,day:p[1],direction:p[3],qty:p[5],key:p[8]};rows.push(row);return [{insertId:row.id}];}
 throw Error('Unexpected test query '+sql);
 };
 return {rows,pool:{execute:query,getConnection:async()=>{let release;const previous=unlock;unlock=new Promise(r=>release=r);let snapshot,sequenceSnapshot;return {beginTransaction:async()=>{await previous;snapshot=rows.slice();sequenceSnapshot={...sequence};},execute:query,commit:async()=>{},rollback:async()=>{rows.splice(0,rows.length,...snapshot);sequence=sequenceSnapshot;},release:()=>release()};}}};
}
const body=(key='a',qty='20',direction='OUT')=>({transaction_category:'Purchase',code:'001',direction,qty,date:'2026-11-08',voucher:'TEST',remark:'',place_id:'1',request_key:key.repeat(64)});
test('saved entries are idempotent and concurrent outs cannot overspend',async()=>{const f=fixture(),service=createService(f.pool);const id=await service.postMovement(body(),1);assert.equal(await service.postMovement(body(),1),id);assert.equal(f.rows.length,1);const attempts=await Promise.allSettled([service.postMovement(body('b','60'),1),service.postMovement(body('c','60'),1)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.rows.length,2);});
test('opening balance is required and Stock Out cannot exceed available balance',async()=>{await assert.rejects(createService(fixture(null).pool).postMovement(body(),1));const f=fixture(),s=createService(f.pool,{businessDate:()=> '2026-11-10'});await s.postMovement({...body('d','100','IN'),date:'2026-11-10'},1);await assert.rejects(s.postMovement({...body('e','150'),date:'2026-11-05',qty:'250'},1));assert.equal(f.rows.length,1);});

test('Raw Oil In ignores forged date/voucher, allocates sequential numbers concurrently and reuses saved request',async()=>{const f=fixture(),s=createService(f.pool,{businessDate:()=> '2026-11-10'});const payload={...body('f','1','IN'),date:'1900-01-01',voucher:'FORGED'};const id=await s.postMovement(payload,1);assert.equal(f.rows[0].day,'2026-11-10');assert.equal(f.rows[0].voucher,'ROI-000001');assert.equal(await s.postMovement(payload,1),id);await Promise.all([s.postMovement(body('a','1','IN'),1),s.postMovement(body('b','1','IN'),1)]);assert.deepEqual(f.rows.map(r=>r.voucher),['ROI-000001','ROI-000002','ROI-000003']);});
test('failed Raw Oil In save rolls back numbering; next success uses the same next number',async()=>{const f=fixture('100.000',true),s=createService(f.pool,{businessDate:()=> '2026-11-10'});await assert.rejects(s.postMovement(body('a','1','IN'),1),/Simulated write failure/);assert.equal(f.rows.length,0);await s.postMovement(body('b','1','IN'),1);assert.equal(f.rows[0].voucher,'ROI-000001');});

test('Raw Oil Out locks today, ignores reference tampering and uses independent sequential ROO numbers',async()=>{const f=fixture(),s=createService(f.pool,{businessDate:()=> '2026-11-10'});const out={...body('a','1','OUT'),date:'1900-01-01',voucher:'forged'};const id=await s.postMovement(out,1);assert.equal(await s.postMovement(out,1),id);await s.postMovement(body('b','1','IN'),1);await Promise.all([s.postMovement(body('c','1','OUT'),1),s.postMovement(body('d','1','OUT'),1)]);assert.deepEqual(f.rows.map(r=>r.voucher),['ROO-000001','ROI-000001','ROO-000002','ROO-000003']);assert(f.rows.every(r=>r.day==='2026-11-10'));});
test('insufficient Stock Out and insertion failures do not consume voucher numbers',async()=>{const f=fixture('100.000',true),s=createService(f.pool,{businessDate:()=> '2026-11-10'});await assert.rejects(s.postMovement(body('a','200','OUT'),1));await assert.rejects(s.postMovement(body('b','1','OUT'),1),/Simulated write failure/);await s.postMovement(body('c','1','OUT'),1);assert.equal(f.rows[0].voucher,'ROO-000001');});

test('Raw Oil In and Out persist Purchase, Return and Adjustment as fixed transaction labels',async()=>{const f=fixture(),s=createService(f.pool,{businessDate:()=> '2026-11-10'});for(const [i,category]of ['Purchase','Return','Adjustment'].entries()){await s.postMovement({...body(String(i),'1',i===1?'OUT':'IN'),transaction_category:category},1);}assert.deepEqual(f.rows.map(r=>r.transaction_category),['Purchase','Return','Adjustment']);for(const value of ['',undefined,'Other',['Purchase']])await assert.rejects(s.postMovement({...body('e','1','OUT'),transaction_category:value},1),/Transaction Category/);assert.equal(f.rows.length,3);});
test('Both movement forms show required fixed category options; history category filters are parameterized',()=>{const ejs=require('ejs'),fs=require('fs'),{transactionCategories}=require('./raw-oil-transaction-category'),{transactionFilters}=require('./raw-oil-filters');const t=fs.readFileSync(require('path').join(__dirname,'views/raw-oil/content.ejs'),'utf8');for(const direction of ['IN','OUT']){const html=ejs.render(t,{rawOil:{type:'movement',direction,transactionCategories,places:[],values:{date:'2026-11-10',request_key:'a'.repeat(64),transaction_category:'Return'}},user:{role:'inventory'},page:{id:direction.toLowerCase(),name:'Raw Oil'},csrf:'token'});assert(html.includes('id="oil-transaction-category" name="transaction_category" required'));assert(html.includes('value="Return" selected'));assert(!html.includes('value="Other"'));}assert.deepEqual(transactionFilters({transaction_category:'Adjustment'}).params,['Adjustment']);assert.deepEqual(transactionFilters({transaction_category:'Custom Usage'}).params,['Custom Usage']);});

test('New Admin-created category is accepted in In and Out, with canonical master spelling',async()=>{const f=fixture('100.000',false,['Purchase','Return','Adjustment','Production Usage']),s=createService(f.pool,{businessDate:()=> '2026-11-10'});await s.postMovement({...body('a','1','IN'),transaction_category:'Production Usage'},1);await s.postMovement({...body('b','1','OUT'),transaction_category:'production usage'},1);assert.deepEqual(f.rows.map(r=>r.transaction_category),['Production Usage','Production Usage']);await assert.rejects(s.postMovement({...body('c','1','IN'),transaction_category:'Not created'},1),/Transaction Category/);assert.equal(f.rows.length,2);});

test('Adjustment submissions remain pending and cannot fund another stock out',async()=>{
 const f=fixture('0.000'),service=createService(f.pool,{businessDate:()=> '2026-11-10'});
 await service.postMovement({...body('f','50','IN'),transaction_category:'Adjustment'},1);
 assert.equal(f.rows[0].pending,true);
 await assert.rejects(service.postMovement(body('e','1','OUT'),1),/လက်ကျန်မလုံလောက်/);
 assert.equal(f.rows.length,1);
});

test('Warehouse Accountant cannot key in any category or direction, even by calling service directly',async()=>{
 for(const direction of ['IN','OUT'])for(const category of ['Purchase','Return','Adjustment','Production Usage']){
 const f=fixture('100.000',false,['Purchase','Return','Adjustment','Production Usage'],'warehouse_accountant');
 await assert.rejects(createService(f.pool).postMovement({...body('a','10',direction),transaction_category:category},1),e=>e.status===403);assert.equal(f.rows.length,0);
 }
});
test('Supervisor Adjustment goes directly to Accountant; staff goes to Supervisor; normal categories stay posted',async()=>{
 for(const role of ['warehouse_supervisor','inventory'])for(const direction of ['IN','OUT']){
 const f=fixture('100.000',false,['Purchase','Return','Adjustment'],role),s=createService(f.pool,{businessDate:()=> '2026-11-10'});
 await s.postMovement({...body('a','10',direction),transaction_category:'Adjustment'},5);
 assert.equal(f.rows[0].pending,true);assert.equal(f.rows[0].approval_status,role==='warehouse_supervisor'?'PENDING_ACCOUNTANT':'PENDING_SUPERVISOR');
 assert.equal(f.rows[0].supervisor_by,role==='warehouse_supervisor'?5:null);
 await s.postMovement(body('b','10',direction),5);assert(!f.rows[1].pending);
 }
});

test('batch saves atomically and rejects duplicate items',async()=>{const f=fixture(),s=createService(f.pool);await assert.rejects(s.postMovements({...body(),items:[{code:'001',qty:'1'},{code:'001',qty:'2'}]},1),/Item Code/);await assert.rejects(s.postMovements({...body(),items:[{code:'001',qty:'1'},{code:'002',qty:'9999'}]},1));assert.equal(f.rows.length,0);await s.postMovements({...body(),items:[{code:'001',qty:'1'},{code:'002',qty:'2'}]},1);assert.equal(f.rows.length,2);await s.postMovements({...body(),items:[{code:'001',qty:'1'},{code:'002',qty:'2'}]},1);assert.equal(f.rows.length,2);});
