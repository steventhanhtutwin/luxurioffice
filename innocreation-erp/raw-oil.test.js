const {test}=require('node:test');const assert=require('node:assert/strict');
const {grams,decimal,date,balance,checkTimeline}=require('./raw-oil-values');
const {createService}=require('./raw-oil-service');
test('gram quantities retain exact decimal values and reject invalid inputs',()=>{assert.equal(decimal(grams('0.001')),'0.001');assert.equal(decimal(grams('81.55')),'81.550');assert.equal(balance('100.000','0.200','0.100'),100100n);for(const value of ['0','-1','1.2345','1e3','NaN','Infinity','','1000000000000'])assert.throws(()=>grams(value));assert.equal(grams('0',{zero:true}),0n);assert.throws(()=>date('2026-02-30'));assert.equal(date('2026-11-08'),'2026-11-08');});
test('backdated stock out cannot borrow stock received later',()=>{assert.throws(()=>checkTimeline('100.000',[{day:'2026-11-10',delta:'100.000'}],'2026-11-05','OUT',150000n));assert.equal(checkTimeline('100.000',[{day:'2026-11-10',delta:'100.000'}],'2026-11-05','OUT',50000n),150000n);});
function fixture(opening='100.000'){
 let rows=[],nextId=1,unlock=Promise.resolve();const item={id:1,code:'001',opening_grams:opening,opening_date:'2026-11-01'};
 const sum=direction=>decimal(rows.filter(r=>r.direction===direction).reduce((n,r)=>n+grams(r.qty),0n));
 const query=async(sql,p=[])=>{
 if(sql.startsWith('SELECT * FROM raw_oil_items'))return [[item]];
 if(sql.startsWith('SELECT id FROM raw_oil_transactions WHERE request_key'))return [rows.filter(r=>r.key===p[0]).map(r=>({id:r.id}))];
 if(sql.startsWith('SELECT id FROM raw_oil_places'))return [[{id:1}]];
 if(sql.startsWith('SELECT COALESCE'))return [[{stock_in:sum('IN'),stock_out:sum('OUT')}]];
 if(sql.startsWith('SELECT DATE_FORMAT')){const totals=new Map();for(const row of rows)totals.set(row.day,(totals.get(row.day)||0n)+(row.direction==='IN'?grams(row.qty):-grams(row.qty)));return [[...totals].sort().map(([day,n])=>({day,delta:n<0n?'-'+decimal(-n):decimal(n)}))];}
 if(sql.startsWith('INSERT INTO raw_oil_transactions')){const row={id:nextId++,day:p[1],direction:p[3],qty:p[5],key:p[8]};rows.push(row);return [{insertId:row.id}];}
 throw Error('Unexpected test query '+sql);
 };
 return {rows,pool:{execute:query,getConnection:async()=>{let release;const previous=unlock;unlock=new Promise(r=>release=r);let snapshot;return {beginTransaction:async()=>{await previous;snapshot=rows.slice();},execute:query,commit:async()=>{},rollback:async()=>{rows.splice(0,rows.length,...snapshot);},release:()=>release()};}}};
}
const body=(key='a',qty='20',direction='OUT')=>({code:'001',direction,qty,date:'2026-11-08',voucher:'TEST',remark:'',place_id:'1',request_key:key.repeat(64)});
test('saved entries are idempotent and concurrent outs cannot overspend',async()=>{const f=fixture(),service=createService(f.pool);const id=await service.postMovement(body(),1);assert.equal(await service.postMovement(body(),1),id);assert.equal(f.rows.length,1);const attempts=await Promise.allSettled([service.postMovement(body('b','60'),1),service.postMovement(body('c','60'),1)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.rows.length,2);});
test('opening balance is required and later receipts cannot cover backdated outs',async()=>{await assert.rejects(createService(fixture(null).pool).postMovement(body(),1));const f=fixture(),s=createService(f.pool);await s.postMovement({...body('d','100','IN'),date:'2026-11-10'},1);await assert.rejects(s.postMovement({...body('e','150'),date:'2026-11-05'},1));assert.equal(f.rows.length,1);});
