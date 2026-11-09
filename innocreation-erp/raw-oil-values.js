function grams(value,{zero=false}={}){if(typeof value!=='string'||!/^\d{1,12}(\.\d{1,3})?$/.test(value.trim()))throw new Error('Qty ကို gram ဖြင့် ဒဿမ ၃ နေရာအထိ ဖြည့်ပါ။');const [a,b='']=value.trim().split('.');const n=BigInt(a)*1000n+BigInt(b.padEnd(3,'0'));if(n<0n||(!zero&&n===0n)||n>999999999999999n)throw new Error('Qty ကို မှန်ကန်စွာ ဖြည့်ပါ။');return n;}
function decimal(n){return (n/1000n).toString()+'.'+(n%1000n).toString().padStart(3,'0');}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<1000||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error('Date ကို မှန်ကန်စွာ ဖြည့်ပါ။');return value;}
function text(value,label,max,required=true){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new Error(label+' ကို မှန်ကန်စွာ ဖြည့်ပါ။');return value.trim();}
function balance(opening,stockIn,stockOut){return grams(opening,{zero:true})+grams(stockIn,{zero:true})-grams(stockOut,{zero:true});}
function checkTimeline(opening,entries,day,direction,qty){
 const totals=new Map();
 for(const entry of entries){const v=String(entry.delta);const n=(v.startsWith('-')?-1n:1n)*grams(v.replace(/^-/,''),{zero:true});totals.set(entry.day,(totals.get(entry.day)||0n)+n);}
 totals.set(day,(totals.get(day)||0n)+(direction==='IN'?qty:-qty));
 let current=grams(opening,{zero:true});
 for(const date of [...totals.keys()].sort()){current+=totals.get(date);if(current<0n)throw new Error('ဤရက်စွဲဖြင့် ထည့်လျှင် ရက်အလိုက်လက်ကျန် အနုတ်ဖြစ်နိုင်ပါသည်။');}
 return current;
}
module.exports={grams,decimal,date,text,balance,checkTimeline};
