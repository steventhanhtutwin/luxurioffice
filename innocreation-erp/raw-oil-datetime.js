// Business wall-clock time, independent of database/server timezone.
const zone='Asia/Bangkok';
function businessNow(instant=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(p=>[p.type,p.value]));
 return {day:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}:${parts.second}`};
}
function displayDateTime(tx){return (tx.day||'')+(tx.transaction_time?' '+String(tx.transaction_time).slice(0,8):'');}
module.exports={businessNow,displayDateTime};
