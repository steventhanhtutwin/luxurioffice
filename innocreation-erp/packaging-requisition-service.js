const {accessFor}=require('./application-access');
const {stockSQL,compareSales,units,requestUnits,fail}=require('./packaging-requirements');
const {businessNow}=require('./raw-oil-datetime');
const {createHash}=require('node:crypto');
function requestOptions(body){
 const priority=body.priority===undefined?'NORMAL':body.priority;
 if(!['NORMAL','URGENT'].includes(priority))throw fail('Priority ကို Normal / Urgent ရွေးပါ။');
 const neededBy=body.neededBy===undefined||body.neededBy===''?null:body.neededBy;
 if(neededBy!==null&&(typeof neededBy!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(neededBy)||Number(neededBy.slice(0,4))<1000||!Number.isFinite(Date.parse(neededBy+'T00:00:00Z'))||new Date(neededBy+'T00:00:00Z').toISOString().slice(0,10)!==neededBy))throw fail('Needed By Date ကို မှန်ကန်စွာ ရွေးပါ။');
 return {priority,neededBy};
}
async function saveRequest(pool,actorId,key,source,prepare){
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 const [actors]=await conn.execute('SELECT id,is_active,application_access FROM users WHERE id=? FOR UPDATE',[actorId]);const actor=actors[0];if(!actor||Number(actor.is_active)!==1||!accessFor(actor).includes('packaging'))throw fail('Packaging access required',403);
 const [existing]=await conn.execute('SELECT id FROM packaging_requisitions WHERE request_key=? AND created_by=?',[key,actorId]);if(existing.length){await conn.commit();return String(existing[0].id);}
 const [stock]=await conn.query(stockSQL+' FOR UPDATE');const valid=prepare(stock);
 const stamp=businessNow();const [header]=await conn.execute('INSERT INTO packaging_requisitions (request_key,source_name,source_fingerprint,created_by,created_at,request_type,remark,priority,needed_by) VALUES (?,?,?,?,?,?,?,?,?)',[key,source.name,source.fingerprint,actorId,stamp.day+' '+stamp.time,source.type,source.remark||'',source.priority||'NORMAL',source.neededBy||null]);const id=String(header.insertId),no='REQ-'+stamp.day.replace(/-/g,'')+'-'+id.padStart(6,'0');
 await conn.execute('UPDATE packaging_requisitions SET request_no=? WHERE id=?',[no,id]);
 for(const row of valid)await conn.execute('INSERT INTO packaging_requisition_lines (requisition_id,item_id,item_name,category,size_ml,sales_qty,stock_qty,shortage_qty,requested_qty,item_code) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,row.itemId,row.name,row.category,row.size,row.sales,row.stock,row.shortage,row.qty,row.itemCode||null]);
 await conn.commit();return id;
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
function selectedRows(selection,keyField){if(!Array.isArray(selection)||!selection.length||selection.length>1000)throw fail('Request တင်ရန် Item ကို ရွေးပါ။');const selected=new Map();for(const row of selection){if(!row||typeof row[keyField]!=='string'||selected.has(row[keyField]))throw fail('Item ထပ်နေပါသည်။ Qty ကို တစ်ကြောင်းတည်းတွင် ပေါင်းထည့်ပါ။');requestUnits(row.qty);selected.set(row[keyField],row.qty);}return selected;}
async function submitRequisition(pool,actorId,batch,selection){
 const selected=selectedRows(selection,'key');
 return saveRequest(pool,actorId,batch.id,{name:batch.sourceName,fingerprint:batch.fingerprint,type:'SALES'},stock=>{
 const live=compareSales(batch,stock),valid=[];
 for(const [key,qty] of selected){const row=live.rows.find(r=>r.key===key),old=batch.comparison.rows.find(r=>r.key===key);if(!row||!row.itemId||!old||row.itemId!==old.itemId||row.name!==old.name||row.itemCode!==old.itemCode)throw fail('Item ကို ပြန်စစ်ပြီး Compare ပြန်လုပ်ပါ။',409);if(row.stock!==old.stock||row.status!=='SHORTAGE')throw fail('Packaging Stock ပြောင်းလဲသွားပါသည်။ Refresh Stock နှိပ်ပြီး Request Qty ကို ပြန်စစ်ပါ။',409);valid.push({...row,qty});}return valid;
 });
}
async function submitManualRequisition(pool,actorId,body){
 if(!/^[a-f0-9]{64}$/.test(body.requestKey||''))throw fail('Form expired. Reload and try again.');const selected=selectedRows(body.items,'itemId');for(const id of selected.keys())if(!/^\d{1,10}$/.test(id))throw fail('Item ကို ရွေးပါ။');
 if(typeof body.remark!=='string'||body.remark.trim().length>500)throw fail('Remark သည် 500 characters ထက် မပိုရပါ။');
 return saveRequest(pool,actorId,body.requestKey,{name:'Manual Request',fingerprint:createHash('sha256').update(JSON.stringify([...selected])).digest('hex'),type:'MANUAL',remark:body.remark.trim(),...requestOptions(body)},stock=>{
 const indexed=new Map(stock.map(i=>[String(i.id),i]));return [...selected].map(([id,qty])=>{const i=indexed.get(id);if(!i)throw fail('ရွေးထားသော Item မရှိတော့ပါ။ Reload လုပ်ပါ။',409);return {itemId:id,itemCode:i.item_code||'',name:i.item_name,category:i.category,size:i.size_ml||'',sales:'0.000',stock:String(i.closing_qty),shortage:'0.000',qty};});
 });
}
module.exports={submitRequisition,submitManualRequisition};
