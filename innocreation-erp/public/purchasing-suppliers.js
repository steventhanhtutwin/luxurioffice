(()=>{
 document.querySelectorAll('[data-sd-open]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.sdOpen)?.showModal()));
 document.querySelectorAll('[data-sd-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 document.querySelector('[data-sd-error]')?.showModal();
 document.querySelectorAll('[data-sd-copy]').forEach(b=>b.addEventListener('click',async()=>{const status=document.querySelector('.sd-copy-status');try{await navigator.clipboard.writeText(b.dataset.sdCopy);status.textContent='Copied';setTimeout(()=>{status.textContent='';},2000);}catch{status.textContent='Copy unavailable. Please select and copy the contact text.';}}));
})();
