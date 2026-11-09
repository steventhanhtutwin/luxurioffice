function normalized(name){return String(name).toLowerCase().replace(/[\s_-]+/g,'');}
function chooseMainLocation(locations,configuredId=null){
 if(configuredId){const stored=locations.find(l=>Number(l.id)===Number(configuredId));if(!stored||stored.type!=='INTERNAL')throw new Error('Configured Main Warehouse ကို မတွေ့ပါ။');return stored;}
 const named=locations.filter(l=>normalized(l.name)==='mainwarehouse');
 const exact=locations.filter(l=>['thanlwinwarehouse','thanlwinmainwarehouse'].includes(normalized(l.name)));
 const screenshotAlias=locations.filter(l=>normalized(l.name)==='thanlwinpos');
 const candidates=exact.length?exact:screenshotAlias;
 if(named.length&&candidates.some(l=>Number(l.id)!==Number(named[0].id)))throw new Error('Main Warehouse နှင့် Thanlwin နေရာ နှစ်ခုလုံးရှိနေပါသည်။ Data ကို အလိုအလျောက် မပေါင်းပါ။ မူရင်းနေရာကို စစ်ဆေးပါ။');
 const options=named.length?named:candidates;
 if(options.length!==1)throw new Error('Thanlwin Warehouse / Thanlwin POS နေရာတစ်ခုတည်းကို မသတ်မှတ်နိုင်ပါ။ FG Locations တွင် နာမည်နှင့် Type ကို စစ်ပါ။');
 if(options[0].type!=='INTERNAL')throw new Error('Thanlwin နေရာကို FG Locations တွင် INTERNAL အဖြစ် အရင်သတ်မှတ်ပါ။');return options[0];
}
async function configureMainWarehouse(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS fg_settings (id TINYINT UNSIGNED PRIMARY KEY,main_location_id INT UNSIGNED NOT NULL,original_name VARCHAR(120) NOT NULL,configured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(main_location_id) REFERENCES fg_locations(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 const conn=await pool.getConnection();try{await conn.beginTransaction();const [settings]=await conn.query('SELECT * FROM fg_settings WHERE id=1 FOR UPDATE');const [locations]=await conn.query('SELECT * FROM fg_locations ORDER BY id FOR UPDATE');const target=chooseMainLocation(locations,settings[0]?.main_location_id);const conflict=locations.some(l=>Number(l.id)!==Number(target.id)&&normalized(l.name)==='mainwarehouse');if(conflict)throw new Error('Main Warehouse နာမည်ရှိပြီးသားဖြစ်ပါသည်။ Data ကို မပေါင်းပါ။');
 await conn.execute("UPDATE fg_locations SET name='Main Warehouse' WHERE id=?",[target.id]);if(!settings.length)await conn.execute('INSERT INTO fg_settings (id,main_location_id,original_name) VALUES (1,?,?)',[target.id,target.name]);await conn.commit();return {id:target.id,oldName:settings[0]?.original_name||target.name,name:'Main Warehouse'};
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
}
async function getMainWarehouse(pool){const [rows]=await pool.query('SELECT w.id,w.name,w.type FROM fg_settings s JOIN fg_locations w ON w.id=s.main_location_id WHERE s.id=1');if(!rows.length||rows[0].type!=='INTERNAL')throw new Error('Main Warehouse မသတ်မှတ်ရသေးပါ။ node scripts/setup-main-warehouse.js ကို Run ပါ။');return rows[0];}
module.exports={chooseMainLocation,configureMainWarehouse,getMainWarehouse};
