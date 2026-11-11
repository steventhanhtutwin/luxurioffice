const test=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {periodValues,periodSummary}=require('./raw-oil-period');
test('period SQL calculates opening before From and movements through inclusive To, respecting approvals/voids',()=>{
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE raw_oil_items(id INTEGER,code TEXT,name TEXT,category TEXT,item_class TEXT,opening_date TEXT,opening_grams NUMERIC);CREATE TABLE raw_oil_transactions(id INTEGER,item_id INTEGER,transaction_date TEXT,direction TEXT,qty_grams NUMERIC);CREATE TABLE raw_oil_void_requests(transaction_id INTEGER,status TEXT);CREATE TABLE raw_oil_adjustment_approvals(transaction_id INTEGER,status TEXT);
 INSERT INTO raw_oil_items VALUES(1,'001','Oil','Perfume','Raw Oil','2026-11-01',100),(2,'002','New','Perfume','Raw Oil','2026-11-20',50),(3,'003','Pending','Perfume','Raw Oil',NULL,NULL);
 INSERT INTO raw_oil_transactions VALUES(1,1,'2026-11-02','IN',20),(2,1,'2026-11-05','OUT',5),(3,1,'2026-11-10','IN',10),(4,1,'2026-11-11','OUT',3),(5,1,'2026-11-12','IN',99),(6,1,'2026-11-10','IN',1000),(7,1,'2026-11-10','IN',2000),(8,1,'2026-11-10','IN',2),(9,1,'2026-11-10','IN',3000);
 INSERT INTO raw_oil_void_requests VALUES(6,'APPROVED'),(8,'PENDING');INSERT INTO raw_oil_adjustment_approvals VALUES(7,'PENDING_ACCOUNTANT'),(9,'REJECTED');`);
 const run=query=>{const r=periodSummary(periodValues(query));assert.equal((r.sql.match(/\?/g)||[]).length,r.params.length);return db.prepare(r.sql+' ORDER BY i.id').all(...r.params);};
 const [oil,future,pending]=run({from:'2026-11-10',to:'2026-11-11'});assert.equal(oil.opening_grams,115);assert.equal(oil.stock_in,12);assert.equal(oil.stock_out,3);assert.equal(oil.closing_grams,124);assert.equal(future.closing_grams,null);assert.equal(future.original_opening_grams,50);assert.equal(pending.closing_grams,null);
 assert.equal(run({to:'2026-11-05'})[0].closing_grams,115);assert.equal(run({from:'2026-11-11'})[0].opening_grams,127);assert.equal(run({})[0].closing_grams,223);db.close();
});
test('period date validation rejects invalid/reversed dates',()=>{for(const query of [{from:'2026-02-30'},{to:'bad'},{from:'2026-11-12',to:'2026-11-11'}])assert.throws(()=>periodValues(query));assert.deepEqual(periodValues({}),{from:'',to:''});});
