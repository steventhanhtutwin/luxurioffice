(()=>{
 document.querySelectorAll('[data-sd-open]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.sdOpen)?.showModal()));
 document.querySelectorAll('[data-sd-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 document.querySelector('[data-sd-error]')?.showModal();
 document.querySelectorAll('[data-sd-copy]').forEach(b=>b.addEventListener('click',async()=>{const status=document.querySelector('.sd-copy-status');try{await navigator.clipboard.writeText(b.dataset.sdCopy);status.textContent='Copied';setTimeout(()=>{status.textContent='';},2000);}catch{status.textContent='Copy unavailable. Please select and copy the contact text.';}}));
})();

(()=>{
 document.querySelectorAll('[data-registration-form]').forEach(form=>{
 const container=form.querySelector('[data-registration-banks]'),add=form.querySelector('[data-add-registration-bank]');
 function refresh(){const rows=[...container.querySelectorAll('[data-registration-bank]')];if(!rows.some(r=>r.querySelector('[name=primary_bank]').checked))rows[0].querySelector('[name=primary_bank]').checked=true;rows.forEach((row,i)=>{row.querySelector('[data-bank-number]').textContent='Bank #'+(i+1);const radio=row.querySelector('[name=primary_bank]');radio.value=String(i);row.classList.toggle('primary',radio.checked);row.querySelectorAll('[data-bank-field]').forEach(f=>f.name='bank_'+i+'_'+f.dataset.bankField);row.querySelector('[data-remove-registration-bank]').hidden=rows.length===1;});form.querySelector('[name=bank_count]').value=String(rows.length);form.querySelector('[data-bank-count]').textContent=String(rows.length);add.disabled=rows.length>=20;}
 add.addEventListener('click',()=>{if(container.children.length>=20)return;container.append(form.querySelector('[data-registration-bank-template]').content.cloneNode(true));refresh();container.lastElementChild.querySelector('input[data-bank-field=label]').focus();});
 container.addEventListener('click',e=>{if(e.target.closest('[data-remove-registration-bank]')){if(container.children.length>1)e.target.closest('[data-registration-bank]').remove();refresh();}});container.addEventListener('change',e=>{if(e.target.name==='primary_bank')refresh();});refresh();
 form.addEventListener('submit',()=>{form.querySelector('[type=submit]').disabled=true;});
 });
})();
