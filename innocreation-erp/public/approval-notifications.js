(()=>{
 const box=document.querySelector('.erp-notifications');if(!box)return;
 const list=box.querySelector('.erp-notification-list'),summary=box.querySelector('.erp-notification-summary'),badge=box.querySelector('.erp-notification-count');let busy=false;
 const quantity=value=>{const [w,f='']=String(value).split('.');return w.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(f?'.'+f.padEnd(3,'0'):'');};
 function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
 async function load(){if(busy)return;busy=true;try{
  const res=await fetch('/inventory/notifications',{headers:{Accept:'application/json'},cache:'no-store'});if(!res.ok||!res.headers.get('content-type')?.includes('application/json'))throw Error();const data=await res.json();
  badge.hidden=!data.unread;badge.textContent=data.unread>99?'99+':String(data.unread);box.querySelector('summary').setAttribute('aria-label',`Notifications: ${data.unread} unread, ${data.pending} pending approvals`);
  summary.textContent=`မဖတ်ရသေး ${data.unread} · Approval ကျန် ${data.pending}`;list.replaceChildren();
  if(!data.items.length)list.append(text('p','Notification မရှိသေးပါ။','erp-notification-empty'));
  for(const n of data.items){const a=document.createElement('a');a.href=n.url;a.className='erp-notification-item'+(n.unread?' is-unread':'');
   a.append(text('strong',n.title),text('small',n.page),text('span',`ID #${n.id} · ${n.voucher}`,'erp-notification-id'),text('span',n.author),text('span',`${n.items} items · ${quantity(n.total)} ${n.unit}`));
   if(n.pending)a.append(text('small','Approval pending','erp-notification-pending'));
   a.addEventListener('click',()=>{fetch('/inventory/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_csrf:box.dataset.notificationCsrf,key:n.key}),keepalive:true}).catch(()=>{});});list.append(a);
  }
 }catch{summary.textContent='Notifications မရယူနိုင်ပါ။ ↻ နှိပ်ပြီး ပြန်စမ်းပါ။';}finally{busy=false;}}
 box.addEventListener('toggle',()=>{if(box.open)load();});box.querySelector('.erp-notification-refresh').addEventListener('click',load);
 document.addEventListener('click',e=>{if(!box.contains(e.target))box.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape')box.open=false;});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});setInterval(()=>{if(!document.hidden)load();},30000);load();
})();
