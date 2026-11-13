const {units,decimal}=require('./packaging-requirements');
function buildLedger(item,openings,receipts){
 const rows=[],show=n=>decimal(n),signed=v=>v<0?'-'+show(-v):show(v);
 const initial=units(openings[0]?.old_qty??item.opening_qty),importIn=units(item.imported_stock_in)-units(item.received_qty||0),importOut=units(item.imported_stock_out);
 rows.push({id:'opening',type:'OPENING',reference:'Opening balance',at:null,n:initial,note:'Initial opening balance · date not recorded'});
 if(importIn)rows.push({id:'import-in',type:'IN',reference:'Imported snapshot',at:null,n:importIn,note:'ရက်စွဲမပါသော အဟောင်း Stock In စာရင်း'});
 if(importOut)rows.push({id:'import-out',type:'OUT',reference:'Imported snapshot',at:null,n:-importOut,note:'ရက်စွဲမပါသော အဟောင်း Stock Out စာရင်း'});
 for(const h of openings)rows.push({id:'opening-'+h.id,type:'OPENING',reference:'Opening adjustment #'+h.id,at:h.changed_at,n:units(h.new_qty)-units(h.old_qty),note:'Opening balance changed · '+(h.actor_name||'')});
 for(const d of receipts)rows.push({id:'receipt-'+d.id,type:'IN',reference:'DSP-'+String(d.id).padStart(6,'0'),at:d.received_at,n:units(d.qty),note:'Received from Main Warehouse · '+d.request_no+' · '+(d.received_name||'')});
 rows.sort((a,b)=>String(a.at||'').localeCompare(String(b.at||''))||(a.at&&b.at?a.id.localeCompare(b.id,undefined,{numeric:true}):0));
 let balance=0n;for(const row of rows){balance+=row.n;row.movement=signed(row.n);row.balance=signed(balance);delete row.n;}
 return {item:{code:item.item_code||'',name:item.item_name,category:item.category,size:item.size_ml,opening:item.opening_qty,stockIn:item.imported_stock_in,stockOut:item.imported_stock_out,closing:item.closing_qty},rows:rows.reverse()};
}
module.exports={buildLedger};
