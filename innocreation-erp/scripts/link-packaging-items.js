// Run once after deploying this patch; safe to rerun. Does not change quantities.
const pool=require('../db');
const {planLinks}=require('../packaging-item-links');
async function main(){
 for(const [table,column,definition] of [['packaging_stock','fg_item_id','INT UNSIGNED NULL'],['packaging_requisition_lines','item_code','VARCHAR(100) NULL']]){
 const [columns]=await pool.execute('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
 if(!columns.length)await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
 }
 const conn=await pool.getConnection();try{await conn.beginTransaction();const [stock]=await conn.query('SELECT * FROM packaging_stock ORDER BY id FOR UPDATE');const [master]=await conn.query('SELECT id,code,name FROM fg_items ORDER BY id FOR UPDATE');const plan=planLinks(stock,master);
 for(const link of plan.links)await conn.execute('UPDATE packaging_stock SET fg_item_id=? WHERE id=? AND fg_item_id IS NULL',[link.fgId,link.packagingId]);
 // Historical request quantities and item names are preserved. Fill only missing codes.
 await conn.query('UPDATE packaging_requisition_lines l JOIN packaging_stock p ON p.id=l.item_id JOIN fg_items f ON f.id=p.fg_item_id SET l.item_code=f.code WHERE l.item_code IS NULL');
 await conn.commit();console.log('Linked '+plan.links.length+' items; '+plan.unmatched.length+' need review. All stock quantities preserved.');for(const row of plan.unmatched)console.log('Review No. '+row.id+' | '+row.name+' | '+row.reason);
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
