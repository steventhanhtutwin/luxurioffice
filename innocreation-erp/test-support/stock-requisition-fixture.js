const {fixture:base}=require('./packaging-requirements-fixture');
function fixture(){const f=base();f.db.exec(`
INSERT INTO users(id,display_name,is_active,application_access,role) VALUES(3,'Warehouse Supervisor',1,'["inventory"]','warehouse_supervisor'),(4,'Packaging Receiver',1,'["packaging"]','staff'),(5,'Accountant',1,'["inventory"]','warehouse_accountant');
UPDATE users SET role='staff' WHERE id=2;
CREATE TABLE fg_locations(id INTEGER PRIMARY KEY,name TEXT,type TEXT);
INSERT INTO fg_locations VALUES(7,'Main Warehouse','INTERNAL'),(8,'Other Warehouse','INTERNAL'),(9,'Packaging Warehouse','EXTERNAL');
ALTER TABLE fg_balances ADD COLUMN opening_date TEXT DEFAULT '2026-01-01';ALTER TABLE fg_balances ADD COLUMN opening_time TEXT;
CREATE UNIQUE INDEX fg_balance_unique ON fg_balances(item_id,location_id);
CREATE TABLE fg_documents(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT,status TEXT,doc_date TEXT,reference TEXT,from_id INTEGER,to_id INTEGER,remark TEXT,request_key TEXT UNIQUE,created_by INTEGER,supervisor_by INTEGER,supervisor_at TEXT);
CREATE TABLE fg_lines(id INTEGER PRIMARY KEY AUTOINCREMENT,document_id INTEGER,item_id INTEGER,qty NUMERIC,UNIQUE(document_id,item_id));
ALTER TABLE fg_ledger ADD COLUMN document_id INTEGER;
ALTER TABLE fg_ledger ADD COLUMN doc_date TEXT DEFAULT '2026-01-01';
ALTER TABLE fg_ledger ADD COLUMN id INTEGER;
CREATE TABLE fg_opening_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,item_id INTEGER,location_id INTEGER,old_qty NUMERIC,new_qty NUMERIC,old_date TEXT,new_date TEXT,remark TEXT,created_by INTEGER,old_time TEXT,new_time TEXT);
CREATE UNIQUE INDEX fg_ledger_once ON fg_ledger(document_id,item_id,location_id,direction);
`);let failPosting=false;const execute=async(sql,args=[])=>{if(sql.startsWith('SET TRANSACTION'))return [{}];if(failPosting&&sql.startsWith("UPDATE stock_requisition_dispatches SET status='IN_TRANSIT'"))throw Error('Simulated posting failure');sql=sql.replace(/ FOR UPDATE/g,'').replace(/INSERT IGNORE/g,'INSERT OR IGNORE').replace(/DATE_FORMAT\(doc_date,'%Y-%m-%d'\)/g,"strftime('%Y-%m-%d',doc_date)");const stmt=f.db.prepare(sql);if(/^SELECT/.test(sql))return [stmt.all(...args)];const out=stmt.run(...args);return [{insertId:Number(out.lastInsertRowid),affectedRows:Number(out.changes)}];};const pool={query:execute,execute,getConnection:async()=>({query:execute,execute,beginTransaction:async()=>f.db.exec('BEGIN'),commit:async()=>f.db.exec('COMMIT'),rollback:async()=>f.db.exec('ROLLBACK'),release:()=>{}})};return {...f,pool,set failPosting(v){failPosting=v;}};}
module.exports={fixture};
