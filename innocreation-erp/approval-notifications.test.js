const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {DatabaseSync}=require('node:sqlite');const {buildNotifications,createNotificationRouter,oilSQL,fgSQL}=require('./approval-notifications');
const base={id:200,voucher:'ROI-000080',created_by:1,entered_by:'Staff <script>',item_count:5,total_qty:'10000.000',adjustment_status:'PENDING_SUPERVISOR'};
test('approval notifications follow each role, exclude self and previous approver, send outcomes only to owner',()=>{
 assert.equal(buildNotifications([base],[],{id:2,role:'warehouse_supervisor'}).length,1);
 assert.equal(buildNotifications([base],[],{id:3,role:'warehouse_accountant'}).length,0);
 const advanced={...base,adjustment_status:'PENDING_ACCOUNTANT',supervisor_by:2};
 assert.equal(buildNotifications([advanced],[],{id:2,role:'warehouse_supervisor'}).length,0);
 assert.equal(buildNotifications([advanced],[],{id:3,role:'warehouse_accountant'})[0].pending,true);
 assert.equal(buildNotifications([advanced],[],{id:2,role:'warehouse_accountant'}).length,0);
 assert.equal(buildNotifications([base],[],{id:1,role:'warehouse_supervisor'}).length,0);
 for(const status of ['APPROVED','REJECTED']){const r={...base,adjustment_status:status};assert.equal(buildNotifications([r],[],{id:1,role:'staff'})[0].pending,false);assert.equal(buildNotifications([r],[],{id:4,role:'staff'}).length,0);}
});
test('void and FG notifications respect stages and distinguish repeated void requests',()=>{
 const row={...base,adjustment_status:'APPROVED',void_status:'PENDING',requested_by:2,void_id:8,requester:'Supervisor'};
 const a=buildNotifications([row],[],{id:3,role:'warehouse_accountant'});assert.equal(a[0].page,'Raw Oil › Transaction');assert(a[0].key.includes(':8:'));
 assert.notEqual(a[0].key,buildNotifications([{...row,void_id:9}],[],{id:3,role:'warehouse_accountant'})[0].key);
 const fg={...base,status:'REQUESTED'};assert.equal(buildNotifications([],[fg],{id:2,role:'warehouse_supervisor'})[0].unit,'pcs');
 assert.equal(buildNotifications([],[{...fg,status:'SUPERVISOR_APPROVED',supervisor_by:2}],{id:2,role:'warehouse_accountant'}).length,0);
});
test('SQL aggregates complete duplicate-item voucher lines without multiplying approval or void joins',()=>{
 const db=new DatabaseSync(':memory:');try{db.exec(`
 CREATE TABLE users(id INTEGER,display_name TEXT);INSERT INTO users VALUES(1,'Staff'),(2,'Supervisor');
 CREATE TABLE raw_oil_transactions(id INTEGER,voucher TEXT,created_by INTEGER,qty_grams NUMERIC);
 INSERT INTO raw_oil_transactions VALUES(200,'ROI-80',1,200),(201,'ROI-80',1,100),(202,'ROI-81',1,50);
 CREATE TABLE raw_oil_voucher_lines(transaction_id INTEGER,voucher_id INTEGER);INSERT INTO raw_oil_voucher_lines VALUES(200,200),(201,200);
 CREATE TABLE raw_oil_adjustment_approvals(transaction_id INTEGER,status TEXT,supervisor_by INTEGER);INSERT INTO raw_oil_adjustment_approvals VALUES(200,'PENDING_ACCOUNTANT',2),(201,'PENDING_ACCOUNTANT',2),(202,'APPROVED',2);
 CREATE TABLE raw_oil_void_requests(id INTEGER,transaction_id INTEGER,status TEXT,requested_by INTEGER);INSERT INTO raw_oil_void_requests VALUES(1,202,'REJECTED',2),(2,202,'PENDING',2);
 CREATE TABLE fg_documents(id INTEGER,reference TEXT,created_by INTEGER,status TEXT,supervisor_by INTEGER,kind TEXT);INSERT INTO fg_documents VALUES(1,'FG-1',1,'REQUESTED',NULL,'TRANSFER');
 CREATE TABLE fg_lines(document_id INTEGER,qty INTEGER);INSERT INTO fg_lines VALUES(1,10),(1,20);
 `);const rows=db.prepare(oilSQL).all();assert.equal(rows.length,2);const grouped=rows.find(r=>r.id===200);assert.equal(grouped.item_count,2);assert.equal(Number(grouped.total_qty),300);assert.equal(rows.find(r=>r.id===202).void_id,2);const fg=db.prepare(fgSQL).get();assert.equal(fg.item_count,2);assert.equal(Number(fg.total_qty),30);
 }finally{db.close();}
});
test('notification API persists read per user, keeps pending count, rechecks access and CSRF',async()=>{
 let actor={id:2,role:'warehouse_supervisor',is_active:1,application_access:'["inventory"]'};const seen=new Map();
 const pool={query:async sql=>[sql===oilSQL?[base]:[]],execute:async(sql,p)=>{
  if(sql.startsWith('SELECT id,role'))return [[actor]];
  if(sql.startsWith('SELECT notification_key'))return [[...(seen.get(p[0])||[])].map(notification_key=>({notification_key}))];
  if(sql.startsWith('INSERT IGNORE')){const keys=seen.get(p[0])||new Set();keys.add(p[1]);seen.set(p[0],keys);return [{}];}throw Error(sql);
 }};
 const app=express();app.use((req,res,next)=>{req.session={user:{id:2},csrf:'token'};next();});app.use('/notifications',createNotificationRouter({pool}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port+'/notifications';
 try{let data=await(await fetch(url)).json();assert.equal(data.unread,1);assert.equal(data.pending,1);const key=data.items[0].key;
 const post=body=>fetch(url+'/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post({_csrf:'wrong',key})).status,403);assert.equal((await post({_csrf:'token',key:'void:999:PENDING'})).status,404);assert.equal((await post({_csrf:'token',key})).status,200);
 data=await(await fetch(url)).json();assert.equal(data.unread,0);assert.equal(data.pending,1);assert.equal(data.items.length,1);
 actor={...actor,id:3};assert.equal((await(await fetch(url)).json()).unread,1);
 actor={...actor,application_access:'[]'};assert.equal((await fetch(url)).status,403);
 actor={...actor,application_access:'["inventory"]',is_active:0};assert.equal((await fetch(url)).status,403);
 }finally{await new Promise(r=>server.close(r));}
});
