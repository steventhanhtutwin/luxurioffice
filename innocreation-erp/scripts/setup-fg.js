const pool=require('../db'),items=require('../data/finished-goods-items.json');
(async()=>{try{await pool.query('SELECT id FROM fg_documents LIMIT 1');let added=0;for(const item of items){const size=item.size_ml==null?'':typeof item.size_ml==='number'?item.size_ml+' ml':String(item.size_ml);const [r]=await pool.execute('INSERT IGNORE INTO fg_items (code,name,category,size_label) VALUES (?,?,?,?)',[item.code,item.name,item.category,size]);added+=r.affectedRows;}
await pool.execute("INSERT IGNORE INTO fg_locations (name,type) VALUES ('Warehouse','INTERNAL')");
for(const name of ['BKK','Manufacturing','Deli Return','Thanlwin POS','M Tower Memori','Junction City','Hledan','Operation','Corporate'])await pool.execute("INSERT IGNORE INTO fg_locations (name,type) VALUES (?,'UNASSIGNED')",[name]);
console.log('Finished Goods ready: '+added+' new items. Existing data preserved.');console.log('Admin: classify Locations and set verified opening pcs per warehouse. No historical quantities or transactions imported.');
}catch(err){console.error('FG setup failed:',err.message);process.exitCode=1;}finally{await pool.end();}})();
