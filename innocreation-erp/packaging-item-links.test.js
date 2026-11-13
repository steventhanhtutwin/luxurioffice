const test=require('node:test'),assert=require('node:assert/strict');
const {planLinks}=require('./packaging-item-links');
test('catalog links use unique normalized names, never spreadsheet numbers or fuzzy size matches',()=>{
 const stock=[{id:1,item_name:' Pink Candy 30ml '},{id:2,item_name:'Same'},{id:3,item_name:'same'},{id:4,item_name:'Unknown 10ml'},{id:5,item_name:'Already linked',fg_item_id:11}];
 const master=[{id:10,name:'pink candy 30ml',code:'FG-OTHER-ID'},{id:11,name:'same',code:'FG-11'},{id:12,name:'Unknown 30ml',code:'FG-12'}];const p=planLinks(stock,master);assert.deepEqual(p.links,[{packagingId:1,fgId:10,code:'FG-OTHER-ID'}]);assert.equal(p.unmatched.length,3);assert.equal(stock[0].fg_item_id,undefined);
 const duplicate=planLinks([{id:8,item_name:'A'}],[{id:1,name:'A'},{id:2,name:' A '}]);assert.equal(duplicate.links.length,0);
});
test('request stores Inventory code snapshot while preserving original stock',async()=>{
 const f=require('./test-support/packaging-requirements-fixture').fixture();try{const id=await require('./packaging-requisition-service').submitManualRequisition(f.pool,1,{requestKey:'e'.repeat(64),remark:'',items:[{itemId:'1',qty:'2'}]});assert(id);assert.equal(f.db.prepare('SELECT item_code FROM packaging_requisition_lines').get().item_code,'FG-000101');f.db.exec("UPDATE fg_items SET code='FG-RENAMED' WHERE id=101");assert.equal(f.db.prepare('SELECT item_code FROM packaging_requisition_lines').get().item_code,'FG-000101');}finally{f.db.close();}
});
