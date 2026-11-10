const {date,grams,decimal}=require('./raw-oil-values');
const {createReport}=require('./raw-oil-excel');
const joins=' FROM raw_oil_item_adjustments a JOIN raw_oil_items i ON i.id=a.item_id JOIN users u ON u.id=a.created_by';
const extract=(column,field)=>`JSON_UNQUOTE(JSON_EXTRACT(a.${column},'$.${field}'))`;
const code=`COALESCE(${extract('after_values','code')},i.code)`;
function values(query){return {q:String(query.q||'').slice(0,100),category:String(query.category||'').slice(0,150),actor:String(query.actor||''),from:String(query.from||''),to:String(query.to||'')};}
function filters(query){const v=values(query),conditions=["a.action='ADJUSTMENT'"],params=[];if(v.from)date(v.from);if(v.to)date(v.to);if(v.from&&v.to&&v.from>v.to)throw new Error('From date သည် To date ထက် မကျော်ရပါ။');if(v.actor&&!/^\d{1,10}$/.test(v.actor))throw new Error('ပြင်ဆင်သူကို စာရင်းထဲမှ ရွေးပါ။');
 if(v.q){conditions.push(`(${code} LIKE ? OR ${extract('before_values','name')} LIKE ? OR ${extract('after_values','name')} LIKE ? OR a.remark LIKE ?)`);params.push(...Array(4).fill('%'+v.q+'%'));}
 if(v.category){conditions.push(`(${extract('before_values','category')}=? OR ${extract('after_values','category')}=?)`);params.push(v.category,v.category);}
 if(v.actor){conditions.push('a.created_by=?');params.push(v.actor);}if(v.from){conditions.push('a.created_at>=?');params.push(v.from);}if(v.to){conditions.push('a.created_at<DATE_ADD(?,INTERVAL 1 DAY)');params.push(v.to);}return {...v,where:' WHERE '+conditions.join(' AND '),params};
}
function snapshot(value){if(value===null||value===undefined)return {};if(typeof value==='string')return JSON.parse(value);return value;}
function mapRow(row){const before=snapshot(row.before_values),after=snapshot(row.after_values);let delta=null;if(before.opening_grams!==null&&before.opening_grams!==undefined&&after.opening_grams!==null&&after.opening_grams!==undefined){const n=grams(String(after.opening_grams),{zero:true})-grams(String(before.opening_grams),{zero:true});delta=(n<0n?'-':'')+decimal(n<0n?-n:n);}return {...row,before,after,delta,code:String(after.code??row.item_code)};}
async function adjustmentWorkbook(entries,f){const rows=entries.map(mapRow).map(row=>({id:String(row.id),time:row.adjusted_at,code:row.code,name_before:row.before.name||'',name_after:row.after.name||'',category_before:row.before.category||'',category_after:row.after.category||'',item_class:row.after.item_class||row.before.item_class||'',opening_before:row.before.opening_grams==null?null:Number(row.before.opening_grams),opening_after:row.after.opening_grams==null?null:Number(row.after.opening_grams),delta:row.delta===null?null:Number(row.delta),date_before:row.before.opening_date||'',date_after:row.after.opening_date||'',remark:row.remark,actor:row.adjusted_by}));
 const columns=[['ID','id',12],['Adjusted At','time',24],['Item Code','code',18],['Item Name Before','name_before',35],['Item Name After','name_after',35],['Category Before','category_before',27],['Category After','category_after',27],['Class','item_class',17],['Opening Before (g)','opening_before',22],['Opening After (g)','opening_after',22],['Change (g)','delta',20],['Start Date Before','date_before',20],['Start Date After','date_after',20],['Remark','remark',45],['Adjusted By','actor',25]].map(([header,key,width])=>({header,key,width,...(['opening_before','opening_after','delta'].includes(key)?{format:'#,##0.000'}:['code','id'].includes(key)?{format:'@'}:{})}));
 const {workbook,merged,sheet}=createReport('Raw Oil Stock Adjustments',columns,'Filters · Search: '+(f.q||'All')+' · Category (before or after): '+(f.category||'All')+' · User ID: '+(f.actor||'All')+' · From: '+(f.from||'Any')+' · To: '+(f.to||'Any'),rows);
 merged(5,rows.length?'Read-only adjustment history. Blank opening values are unverified. Adjusted At uses the recorded database time.':'No adjustments match these filters.');sheet.getRow(5).height=32;sheet.getCell(5,1).alignment={wrapText:true};return workbook.xlsx.writeBuffer();
}
function installAdjustmentList({router,pool,render,asyncRoute,sendExcel}){
 const select="SELECT a.*,DATE_FORMAT(a.created_at,'%Y-%m-%d %H:%i:%s') adjusted_at,"+code+' item_code,u.display_name adjusted_by'+joins;
 router.get('/adjustments/export.xlsx',asyncRoute(async(req,res)=>{let f;try{f=filters(req.query);}catch(err){return res.status(400).send(err.message);}const [rows]=await pool.query(select+f.where+' ORDER BY a.created_at DESC,a.id DESC',f.params);sendExcel(res,await adjustmentWorkbook(rows,f),'Raw_Oil_Adjustment_List');}));
 router.get('/adjustments',asyncRoute(async(req,res)=>{
 const [categories]=await pool.query(`SELECT category FROM (SELECT ${extract('before_values','category')} category FROM raw_oil_item_adjustments a WHERE a.action='ADJUSTMENT' UNION SELECT ${extract('after_values','category')} category FROM raw_oil_item_adjustments a WHERE a.action='ADJUSTMENT') c WHERE category IS NOT NULL AND category<>'' ORDER BY category`);
 const [actors]=await pool.query("SELECT DISTINCT u.id,u.display_name,u.username FROM users u JOIN raw_oil_item_adjustments a ON a.created_by=u.id WHERE a.action='ADJUSTMENT' ORDER BY u.display_name,u.id");
 let f;try{f=filters(req.query);}catch(err){return render(req,res,'adjustments',{type:'adjustments',...values(req.query),rows:[],categories,actors,total:0,pageNo:1,error:err.message},400);}
 const pageNo=Math.max(1,Math.min(1000000,parseInt(req.query.p,10)||1));
 const [rows]=await pool.query(select+f.where+' ORDER BY a.created_at DESC,a.id DESC LIMIT 50 OFFSET '+((pageNo-1)*50),f.params);
 const [counts]=await pool.query('SELECT COUNT(*) total'+joins+f.where,f.params);
 render(req,res,'adjustments',{type:'adjustments',...f,rows:rows.map(mapRow),categories,actors,total:Number(counts[0].total),pageNo});
 }));
 router.all(['/adjustments','/adjustments/export.xlsx'],(req,res)=>res.set('Allow','GET, HEAD').status(405).send('Read-only adjustment history'));
}
module.exports={installAdjustmentList,filters,values,mapRow,adjustmentWorkbook};
