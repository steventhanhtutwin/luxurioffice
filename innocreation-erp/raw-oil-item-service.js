const {grams,decimal,date,text}=require('./raw-oil-values');
const snapshot=item=>({code:item.code,name:item.name,category:item.category,item_class:item.item_class,opening_grams:item.opening_grams,opening_date:item.opening_date});
async function saveRawOilItem(pool,body,userId,id=null){
 const code=text(body.code,'Item Code',100),name=text(body.name,'Item Name',200),category=text(body.category,'Categories',150),remark=text(body.remark,'Remark',500);
 const qty=decimal(grams(body.opening_grams,{zero:true})),day=date(body.opening_date);
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 const [categories]=await conn.execute('SELECT category FROM raw_oil_items WHERE category=? LIMIT 1',[category]);if(!categories.length)throw new Error('Category ကို Dropdown စာရင်းထဲမှ ရွေးပါ။');
 let itemId=id,before=null,after;
 if(id){const [rows]=await conn.execute('SELECT * FROM raw_oil_items WHERE id=? FOR UPDATE',[id]);const item=rows[0];if(!item)throw new Error('Item not found');
 if(item.opening_grams!==null)throw Object.assign(new Error('Stock adjustment လုပ်ခွင့် မရှိတော့ပါ။ Transaction မှားပါက Void Request လုပ်ပါ။'),{status:403});
 if(name!==item.name||category!==item.category)throw new Error('Set Opening တွင် Item Name / Category ပြောင်းလဲခွင့်မရှိပါ။');
 if(code!==item.code)throw new Error('Item Code ကို ပြောင်းလဲခွင့်မရှိပါ။');
 if(body.item_class!==item.item_class)throw new Error('Class ကို ပြောင်းလဲခွင့်မရှိပါ။');
 const [tx]=await conn.execute('SELECT id FROM raw_oil_transactions WHERE item_id=? LIMIT 1',[id]);
 if(tx.length)throw new Error('Transaction ရှိပြီးသော Item ၏ Opening Qty နှင့် စတင်ရက်ကို မပြင်နိုင်ပါ။');
 before=snapshot(item);after={...before,name,category,opening_grams:qty,opening_date:day};
 await conn.execute('UPDATE raw_oil_items SET name=?,category=?,opening_grams=?,opening_date=?,opening_set_by=? WHERE id=?',[name,category,qty,day,userId,id]);
 }else{if(body.item_class&&body.item_class!=='Raw Oil')throw new Error('Class ကို ပြောင်းလဲခွင့်မရှိပါ။');
 const [result]=await conn.execute('INSERT INTO raw_oil_items (code,name,category,item_class,opening_grams,opening_date,opening_set_by) VALUES (?,?,?,?,?,?,?)',[code,name,category,'Raw Oil',qty,day,userId]);itemId=result.insertId;after={code,name,category,item_class:'Raw Oil',opening_grams:qty,opening_date:day};}
 await conn.execute('INSERT INTO raw_oil_item_adjustments (item_id,action,remark,before_values,after_values,created_by) VALUES (?,?,?,?,?,?)',[itemId,id?'ADJUSTMENT':'CREATE',remark,before?JSON.stringify(before):null,JSON.stringify(after),userId]);
 await conn.commit();return itemId;
 }catch(err){await conn.rollback();throw err;}finally{conn.release();}
}
module.exports={saveRawOilItem};
