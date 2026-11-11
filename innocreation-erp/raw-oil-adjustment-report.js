const {date}=require('./raw-oil-values');
const labels={PENDING_SUPERVISOR:'Pending Supervisor',PENDING_ACCOUNTANT:'Pending Accountant',APPROVED:'Approved',REJECTED:'Rejected'};
function adjustmentFilters(query){
 const string=k=>typeof query[k]==='string'?query[k].trim():'';
 const q=string('q').slice(0,100),direction=string('direction'),status=string('status'),from=string('from'),to=string('to'),conditions=[],params=[];
 if(direction&&!['IN','OUT'].includes(direction))throw Error('Invalid direction');
 if(status&&!Object.hasOwn(labels,status))throw Error('Invalid approval status');
 if(from)date(from);if(to)date(to);if(from&&to&&from>to)throw Error('From date သည် To date ထက် မကျော်ရပါ။');
 if(q){conditions.push('(i.code LIKE ? OR i.name LIKE ? OR t.voucher LIKE ?)');params.push('%'+q+'%','%'+q+'%','%'+q+'%');}
 if(direction){conditions.push('t.direction=?');params.push(direction);}if(status){conditions.push('a.status=?');params.push(status);}
 if(from){conditions.push('t.transaction_date>=?');params.push(from);}if(to){conditions.push('t.transaction_date<=?');params.push(to);}
 return {q,direction,status,from,to,where:conditions.length?' WHERE '+conditions.join(' AND '):'',params};
}
async function adjustmentWorkbook(entries,filters){
 const fields=[['Date & Time (Bangkok)','day',27],['Vr No','voucher',20],['Item Code','code',18],['Item Name','name',38],['Type','direction',10],['Status','status',24],['Qty · g','qty',20],['From','from',24],['To','to',24],['Remark','remark',40],['Entered By','entered_by',24],['Supervisor','supervisor_name',24],['Supervisor Date','supervisor_at',26],['Accountant','accountant_name',24],['Accountant Date','accountant_at',26]];
 const columns=fields.map(([header,key,width])=>({header,key,width,...(key==='qty'?{format:'#,##0.000'}:{})}));
 const rows=entries.map(tx=>({...tx,day:require('./raw-oil-datetime').displayDateTime(tx),code:String(tx.code),status:labels[tx.approval_status],qty:Number(tx.qty_grams),from:tx.direction==='IN'?tx.place:'Main Warehouse',to:tx.direction==='IN'?'Main Warehouse':tx.place,supervisor_at:tx.supervisor_at?String(tx.supervisor_at):'',accountant_at:tx.accountant_at?String(tx.accountant_at):''}));
 const description=`Filters · Search: ${filters.q||'All'} · Type: ${filters.direction||'All'} · Status: ${labels[filters.status]||'All'} · From: ${filters.from||'All'} · To: ${filters.to||'All'}`;
 const {workbook,merged}=require('./raw-oil-excel').createReport('Raw Oil Adjustments',columns,description,rows);if(!rows.length)merged(5,'No adjustments match the selected filters.');return workbook.xlsx.writeBuffer();
}
module.exports={adjustmentFilters,adjustmentWorkbook};
