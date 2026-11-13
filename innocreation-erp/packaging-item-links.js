// Shared identity resolution: normalized exact names only, one-to-one in both catalogs.
const normalize=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
function planLinks(stock,master){
 const group=rows=>{const map=new Map();for(const r of rows){const key=normalize(r.item_name??r.name);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}return map;};
 const packaging=group(stock),fg=group(master),used=new Set(stock.filter(r=>r.fg_item_id).map(r=>String(r.fg_item_id))),links=[],unmatched=[];
 for(const row of stock){if(row.fg_item_id)continue;const key=normalize(row.item_name),found=fg.get(key)||[];if(packaging.get(key).length===1&&found.length===1&&!used.has(String(found[0].id))){links.push({packagingId:row.id,fgId:found[0].id,code:found[0].code});used.add(String(found[0].id));}else unmatched.push({id:row.id,name:row.item_name,reason:found.length===0?'No exact Inventory match':'Ambiguous or already linked'});}
 return {links,unmatched};
}
module.exports={planLinks};
