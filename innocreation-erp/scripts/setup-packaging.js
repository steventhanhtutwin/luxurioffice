const fs=require('node:fs');
const path=require('node:path');
const pool=require('../db');
async function setup(){
 for(const sql of fs.readFileSync(path.join(__dirname,'../packaging-migration.sql'),'utf8').split(';').filter(s=>s.trim()))await pool.query(sql);
 const conn=await pool.getConnection();
 try{await conn.beginTransaction();
 for(const i of require('../data/packaging-items.json'))await conn.execute('INSERT IGNORE INTO packaging_stock (id,item_name,category,size_ml,opening_qty,imported_stock_in,imported_stock_out) VALUES (?,?,?,?,?,?,?)',[i.id,i.name,i.category,i.size,i.opening,i.stock_in,i.stock_out]);
 await conn.commit();console.log('Packaging Warehouse ready. Existing balances preserved.');
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
setup().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
