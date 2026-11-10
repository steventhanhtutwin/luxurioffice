(()=>{
 const form=document.getElementById('oil-movement');if(!form)return;
 const code=document.getElementById('oil-code'),name=document.getElementById('oil-name'),category=document.getElementById('oil-category'),balance=document.getElementById('oil-balance'),status=document.getElementById('oil-lookup-status'),save=document.getElementById('oil-save'),note=document.getElementById('oil-opening-note');
 let timer,controller,validCode='';
 const transactionCategory=document.getElementById('oil-transaction-category');const originalSaveLabel=save.textContent;
 function updateLabel(){save.textContent=transactionCategory.value.toLowerCase()==='adjustment'?'Submit Adjustment':originalSaveLabel;}
 transactionCategory.addEventListener('change',updateLabel);updateLabel();
 function clear(){validCode='';save.disabled=true;name.value='';category.value='';balance.textContent='—';note.textContent='';}
 async function lookup(focus=false){clearTimeout(timer);controller?.abort();const current=code.value.trim();clear();if(!current)return;controller=new AbortController();status.textContent='Item ရှာနေပါသည်…';try{const response=await fetch('/inventory/raw-oil/api/items/'+encodeURIComponent(current),{signal:controller.signal,headers:{Accept:'application/json'}});if(response.redirected)throw Error('Login Session ကုန်ဆုံးသွားပါသည်။ Login ပြန်ဝင်ပါ။');const item=await response.json();if(code.value.trim()!==current)return;if(!response.ok)throw Error(item.error||'Item မတွေ့ပါ။');name.value=item.name;category.value=item.category;balance.textContent=item.closing_grams===null?'အတည်မပြုရသေး':Number(item.closing_grams).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3});status.textContent='Item တွေ့ပါပြီ · '+item.code;if(item.opening_grams===null){note.textContent='Opening Qty ကို Admin က အရင်ဖြည့်ပေးရပါမည်။';return;}validCode=current;save.disabled=false;if(focus)document.getElementById('oil-place').focus();}catch(err){if(err.name!=='AbortError')status.textContent=err.message||'ချိတ်ဆက်မရပါ။ ပြန်စမ်းပါ။';}}
 code.addEventListener('input',()=>{clear();controller?.abort();clearTimeout(timer);timer=setTimeout(()=>lookup(),250);});
 code.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookup(true);}});code.addEventListener('change',()=>lookup());
 form.addEventListener('submit',e=>{if(validCode!==code.value.trim()||save.disabled){e.preventDefault();lookup();return;}save.disabled=true;save.textContent='Saving…';});
 if(code.value.trim())lookup();
})();
