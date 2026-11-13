// Reusable brand loader: await InnocreationLoading.run(task, {message, minMs}).
(()=>{
 let dialog,text,count=0,previousFocus;
 function create(){if(dialog)return;dialog=document.createElement('dialog');dialog.className='ic-loading';dialog.setAttribute('aria-label','INNOCREATION loading');dialog.setAttribute('aria-busy','true');dialog.innerHTML='<div class="ic-loading-art" aria-hidden="true"><img src="/terracotta-burner-loading.svg?v=1" alt="" width="160" height="190"></div><strong>INNOCREATION</strong><p role="status" aria-live="polite"></p><span class="ic-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>';text=dialog.querySelector('p');dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);}
 function show(message='လုပ်ဆောင်နေပါသည်…'){create();if(count++===0){previousFocus=document.activeElement;dialog.showModal();}text.textContent=message;}
 function hide(){if(count>0&&--count===0){dialog.close();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}}
 async function run(task,{message='လုပ်ဆောင်နေပါသည်…',minMs=0}={}){show(message);const start=performance.now();try{return await task();}finally{const left=Math.max(0,minMs-(performance.now()-start));if(left)await new Promise(r=>setTimeout(r,left));hide();}}
 window.InnocreationLoading={show,hide,run};
 // Native opening-stock saves navigate after submit; prevent duplicate submission.
 document.addEventListener('submit',e=>{const form=e.target;if(form.matches('form[action^="/packaging/warehouse/"]')){if(form.dataset.saving){e.preventDefault();return;}form.dataset.saving='1';show('Opening Stock ကို သိမ်းဆည်းနေပါသည်…');}});
 window.addEventListener('pageshow',()=>{count=0;dialog?.close();document.querySelectorAll('form[data-saving]').forEach(f=>delete f.dataset.saving);});
})();
