const fail=(s,status=400)=>Object.assign(Error(s),{status});
function text(v,label,max=500,optional=false){if(typeof v!=='string'||v.trim().length>max||(!optional&&!v.trim()))throw fail(label+' ကို ဖြည့်ပါ။');return v.trim();}
function scaled(v,d=3,zero=true){if(typeof v!=='string'||!new RegExp('^\\d{1,9}(?:\\.\\d{1,'+d+'})?$').test(v))throw fail('ပမာဏကို မှန်ကန်စွာ ဖြည့်ပါ။');const [a,b='']=v.split('.'),n=BigInt(a)*10n**BigInt(d)+BigInt(b.padEnd(d,'0'));if(!zero&&!n)throw fail('ပမာဏသည် 0 ထက်များရပါမည်။');return n;}
const dec=(n,d=3)=>{const p=10n**BigInt(d);return (n/p)+'.'+(n%p).toString().padStart(d,'0');};
const money=(qty,price)=>dec((qty*price+500n)/1000n,4);
function date(v){if(!v)return null;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw fail('ရက်စွဲ မမှန်ပါ။');return v;}
function businessDelivery(day,lead){const d=new Date(day+'T12:00:00Z');for(let n=0;n<lead;){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)n++;}return d.toISOString().slice(0,10);}
function compare(pr,quotes,day){const wanted=scaled(String(pr.qty));const options=quotes.filter(q=>q.unit_price!==null).map(q=>{const n=scaled(String(q.moq)),orderQty=n>wanted?n:wanted,total=money(orderQty,scaled(String(q.unit_price),4)),delivery=businessDelivery(day,Number(q.lead_days));return {...q,order_qty:dec(orderQty),total,exceeds:n>wanted,delivery,late:!!pr.needed_by&&delivery>pr.needed_by};});
 options.sort((a,b)=>Number(a.late)-Number(b.late)||(pr.priority==='URGENT'?Number(a.lead_days)-Number(b.lead_days):0)||(BigInt(a.total.replace('.',''))<BigInt(b.total.replace('.',''))?-1:BigInt(a.total.replace('.',''))>BigInt(b.total.replace('.',''))?1:0)||Number(a.lead_days)-Number(b.lead_days)||Number(a.id)-Number(b.id));
 return options.map((q,i)=>({...q,recommended:i===0,reason:q.late?'Needed-by date ကိုမမီနိုင်ပါ။':pr.priority==='URGENT'?'Urgent: delivery အချိန်၊ MOQ နှင့် စုစုပေါင်းကုန်ကျစရိတ်အရ။':'Needed-by date၊ MOQ အရ မှာယူရမည့် Qty နှင့် စုစုပေါင်းကုန်ကျစရိတ်အရ။'}));}
module.exports={fail,text,scaled,dec,money,date,compare};
